import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';
import pg from 'pg';
import sharp from 'sharp';
import { defaultLimits, type AppConfig } from '../src/config.js';
import { createApp } from '../src/main.js';

/*
 * The browser side of a game's cast (client/sonic-cast.js) against the real API: a browser with its own storage and
 * its own line to the service, which a test can cut.
 * Needs TEST_DATABASE_URL pointing at a Postgres server (any database; a scratch one is created).
 */

const adminUrl = process.env.TEST_DATABASE_URL;
const dbName = `game_castc_${process.pid}`;
const KEY = 'a-key-for-the-tests-0123456789';
/** dist-test/test/ → client/ */
const source = readFileSync(new URL('../../client/sonic-cast.js', import.meta.url), 'utf8');
const SonicCast = new Function(`${source}\nreturn SonicCast;`)() as (opt: Record<string, unknown>) => any;
let games = 0;
const aGame = (what: string) => `cc${++games}-${what}`;

interface Browser { cast: any; storage: Map<string, string>; net: { down: boolean; calls: string[] }; changes: number; screen: { fine: boolean; narrow: boolean } }
/** A page with the game open in it: its cast, what its browser keeps, its line to the service, and its screen. */
function open(base: string, game: string, o: { storage?: Map<string, string>; down?: boolean; fine?: boolean; narrow?: boolean; api?: string } = {}): Browser {
  const storage = o.storage ?? new Map<string, string>();
  const b: Browser = { cast: null, storage, net: { down: !!o.down, calls: [] }, changes: 0, screen: { fine: !!o.fine, narrow: !!o.narrow } };
  b.cast = SonicCast({
    api: o.api ?? base,
    game,
    onChange: () => b.changes++,
    screen: () => b.screen,
    storage: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v), removeItem: (k: string) => void storage.delete(k) },
    fetch: async (url: string, init?: RequestInit) => {
      b.net.calls.push(new URL(url).pathname);
      if (b.net.down) throw new TypeError('fetch failed');
      return fetch(url, init);
    },
  });
  return b;
}

describe('the browser side of a game’s cast', { skip: !adminUrl && 'TEST_DATABASE_URL not set' }, () => {
  let base = '';
  let stop: () => Promise<void>;
  const admin = (method: string, path: string, body?: unknown, type = 'application/json') =>
    fetch(`${base}/api${path}`, { method, headers: { 'x-admin-key': KEY, ...(body === undefined ? {} : { 'content-type': type }) }, body: body === undefined ? undefined : Buffer.isBuffer(body) ? new Uint8Array(body) : JSON.stringify(body) }).then((r) => r.json() as Promise<any>);
  const picture = (width: number, height: number) => sharp({ create: { width, height, channels: 3, background: '#557' } }).jpeg().toBuffer();

  before(async () => {
    const pgAdmin = new pg.Client({ connectionString: adminUrl });
    await pgAdmin.connect();
    await pgAdmin.query(`drop database if exists ${dbName} with (force)`);
    await pgAdmin.query(`create database ${dbName}`);
    await pgAdmin.end();
    const url = new URL(adminUrl!);
    url.pathname = `/${dbName}`;
    process.env.NODE_ENV = 'test';
    const config: AppConfig = { database: { url: url.toString(), adminUrl: null, name: dbName, user: '', password: null, ssl: false }, port: 0, corsOrigins: true, addressHeader: null, adminKey: KEY, limits: { ...defaultLimits, requestsPerMinute: 100000 } };
    const app = await createApp(config);
    await app.listen(0, '127.0.0.1');
    stop = () => app.close();
    base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });

  after(async () => {
    if (!adminUrl) return;
    await stop?.();
    const pgAdmin = new pg.Client({ connectionString: adminUrl });
    await pgAdmin.connect();
    await pgAdmin.query(`drop database if exists ${dbName} with (force)`);
    await pgAdmin.end();
  });

  test('a game whose cast nobody has touched is told so once, and has only its own names and no pictures', async () => {
    const game = aGame('own');
    const b = open(base, game);
    assert.deepEqual([b.cast.heard(), b.cast.name('mina'), b.cast.photo('mina', 54)], [null, null, '']);
    assert.equal(await b.cast.refresh(), true);
    assert.deepEqual([b.cast.heard(), b.cast.name('mina'), b.cast.photo('mina', 54), b.changes], [true, null, '', 1]);
    assert.deepEqual(b.net.calls, [`/api/games/${game}/cast`], 'one reading when the page opens: asked again meanwhile, it is the same one');
    await b.cast.refresh();
    assert.equal(b.changes, 1, 'heard again with nothing changed: nothing to draw again');
  });

  test('names and pictures given at the service are the game’s from the next reading, and go when they are taken back', async () => {
    const game = aGame('given');
    const b = open(base, game);
    await b.cast.refresh();
    await admin('PUT', `/games/${game}/cast/nell`, { name: 'Nelly' });
    const up = await admin('PUT', `/games/${game}/cast/dagny/photo`, await picture(1400, 1800), 'image/jpeg');
    assert.equal(b.cast.name('nell'), null, 'not until it is read again');
    await b.cast.refresh();
    assert.deepEqual([b.cast.name('nell'), b.cast.name('dagny'), b.cast.photo('nell', 54), b.changes], ['Nelly', null, '', 2]);
    assert.equal(b.cast.photo('dagny', 54), `${base}/api/games/${game}/cast/dagny/photo?v=${up.photo}&width=320`);
    // the address leads to the picture, at that width, and may be kept for good
    const res = await fetch(b.cast.photo('dagny', 300));
    assert.deepEqual([res.status, res.headers.get('content-type'), res.headers.get('cache-control')], [200, 'image/webp', 'public, max-age=31536000, immutable']);
    assert.equal((await sharp(Buffer.from(await res.arrayBuffer())).metadata()).width, 320);

    await admin('PUT', `/games/${game}/cast/nell`, { name: null });
    await admin('DELETE', `/games/${game}/cast/dagny/photo`);
    await b.cast.refresh();
    assert.deepEqual([b.cast.name('nell'), b.cast.photo('dagny', 54), b.changes], [null, '', 3]);
  });

  test('a picture is asked for at the width that fits the place: half as much again on a finer screen, then the next width up', async () => {
    const game = aGame('widths');
    const up = await admin('PUT', `/games/${game}/cast/vera/photo`, await picture(2000, 2600), 'image/jpeg');
    const b = open(base, game);
    await b.cast.refresh();
    const width = (px?: number | string) => Number(new URL(b.cast.photo('vera', px)).searchParams.get('width'));
    assert.equal(new URL(b.cast.photo('vera', 54)).searchParams.get('v'), String(up.photo));
    assert.deepEqual([40, 160, 320, 321, 640, 641, 961, 1281, 1920, 4000].map((px) => width(px)), [320, 320, 320, 640, 640, 960, 1280, 1920, 1920, 1920]);
    assert.deepEqual([width(), width(0), width('nonsense')], [640, 640, 640], 'with no place named: the width a profile is shown at');
    b.screen.fine = true;
    assert.deepEqual([40, 160, 213, 214, 320, 427, 640, 854, 1280, 1281].map((px) => width(px)), [320, 320, 320, 640, 640, 960, 960, 1920, 1920, 1920]);
    // looked at as large as the screen: by the kind of screen, not by a place
    assert.deepEqual([width('full'), ((b.screen.narrow = true), width('full'))], [1920, 1280]);
  });

  test('what was last heard is kept by the browser: there at once the next time, and all there is with no connection', async () => {
    const game = aGame('kept');
    await admin('PUT', `/games/${game}/cast/thu`, { name: 'Thu Hà' });
    const up = await admin('PUT', `/games/${game}/cast/thu/photo`, await picture(700, 900), 'image/jpeg');
    const first = open(base, game);
    await first.cast.refresh();
    assert.deepEqual(JSON.parse(first.storage.get(`sonic-cast.${game}`)!), [{ id: 'thu', name: 'Thu Hà', photo: up.photo }]);

    // the page opened again with the service out of reach: she is there before anything is heard, and stays
    const offline = open(base, game, { storage: first.storage, down: true });
    assert.deepEqual([offline.cast.heard(), offline.cast.name('thu')], [null, 'Thu Hà']);
    assert.match(offline.cast.photo('thu', 54), new RegExp(`/cast/thu/photo\\?v=${up.photo}&width=320$`));
    assert.equal(await offline.cast.refresh(), false);
    assert.deepEqual([offline.cast.heard(), offline.cast.name('thu'), offline.changes], [false, 'Thu Hà', 1]);
    // back in reach, with her name changed meanwhile: the browser's copy gives way to the service's
    await admin('PUT', `/games/${game}/cast/thu`, { name: 'Thu' });
    offline.net.down = false;
    assert.equal(await offline.cast.refresh(), true);
    assert.deepEqual([offline.cast.heard(), offline.cast.name('thu'), offline.changes], [true, 'Thu', 2]);
    assert.equal(JSON.parse(first.storage.get(`sonic-cast.${game}`)!)[0].name, 'Thu');
  });

  test('what a browser holds that is not a cast is not believed, and a game with no service has only its own', async () => {
    const game = aGame('odd');
    for (const held of ['not json', '{"cast":1}', '[{"id":7,"name":"x"},{"name":"y"},null,{"id":"a","name":"","photo":-1},{"id":"b","name":5,"photo":"12"}]']) {
      const b = open(base, game, { storage: new Map([[`sonic-cast.${game}`, held]]), down: true });
      assert.deepEqual([b.cast.name('a'), b.cast.name('b'), b.cast.photo('a', 54), b.cast.photo('b', 54)], [null, null, '', '']);
    }
    const alone = open(base, game, { api: '', storage: new Map([[`sonic-cast.${game}`, JSON.stringify([{ id: 'mina', name: 'Minna', photo: 5 }])]]) });
    assert.deepEqual([alone.cast.remote(), await alone.cast.refresh(), alone.net.calls.length, alone.cast.photo('mina', 54)], [false, false, 0, '']);
  });
});
