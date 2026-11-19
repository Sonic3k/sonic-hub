import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';
import pg from 'pg';
import { defaultLimits, type AppConfig } from '../src/config.js';
import { createApp } from '../src/main.js';
import { picture, startFakeStorage, type FakeStorage } from './fake-storage.js';

/*
 * The browser side of a game's cast (client/sonic-cast.js) against the real API: a browser with its own storage and
 * its own line to the service, which a test can cut.
 * Needs TEST_DATABASE_URL pointing at a Postgres server (any database; a scratch one is created). The bucket and the
 * CDN are a stand-in on this machine (fake-storage.ts).
 */

const adminUrl = process.env.TEST_DATABASE_URL;
const dbName = `game_castc_${process.pid}`;
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
  let store: FakeStorage;
  /** What the page that keeps a cast does: a name, or a picture as the body. Nothing is sent beside it. */
  const change = (method: string, path: string, body?: unknown, type = 'application/json') =>
    fetch(`${base}/api${path}`, { method, headers: body === undefined ? {} : { 'content-type': type }, body: body === undefined ? undefined : Buffer.isBuffer(body) ? new Uint8Array(body) : JSON.stringify(body) }).then((r) => r.json() as Promise<any>);

  before(async () => {
    const pgAdmin = new pg.Client({ connectionString: adminUrl });
    await pgAdmin.connect();
    await pgAdmin.query(`drop database if exists ${dbName} with (force)`);
    await pgAdmin.query(`create database ${dbName}`);
    await pgAdmin.end();
    const url = new URL(adminUrl!);
    url.pathname = `/${dbName}`;
    process.env.NODE_ENV = 'test';
    store = await startFakeStorage();
    const config: AppConfig = { database: { url: url.toString(), adminUrl: null, name: dbName, user: '', password: null, ssl: false }, port: 0, corsOrigins: true, addressHeader: null, media: store.media, limits: { ...defaultLimits, requestsPerMinute: 100000 } };
    const app = await createApp(config);
    await app.listen(0, '127.0.0.1');
    stop = () => app.close();
    base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });

  after(async () => {
    if (!adminUrl) return;
    await stop?.();
    await store?.stop();
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
    await change('PUT', `/games/${game}/cast/nell`, { name: 'Nelly' });
    const up = await change('PUT', `/games/${game}/cast/dagny/photo`, picture('dagny'), 'image/jpeg');
    assert.equal(b.cast.name('nell'), null, 'not until it is read again');
    await b.cast.refresh();
    assert.deepEqual([b.cast.name('nell'), b.cast.name('dagny'), b.cast.photo('nell', 54), b.changes], ['Nelly', null, '', 2]);
    // her picture is at the CDN, at the address the cast gave, and the width is asked of the CDN there
    assert.match(up.photo, new RegExp(`^${store.cdn}/games/${game}/profile-photos/dagny-[0-9a-f]{12}\\.jpg$`));
    assert.equal(b.cast.photo('dagny', 54), `${up.photo}?width=320`);
    const res = await fetch(b.cast.photo('dagny', 300));
    assert.deepEqual([res.status, res.headers.get('content-type'), res.headers.get('cache-control')], [200, 'image/jpeg', 'public, max-age=31536000, immutable']);
    assert.ok(Buffer.from(await res.arrayBuffer()).equals(picture('dagny')));
    assert.equal(store.read.at(-1), `${new URL(up.photo).pathname.slice('/hub-test/'.length)}?width=320`);
    assert.ok(!b.net.calls.some((c) => /photo/.test(c)), 'the service is asked for the cast and for nothing else');

    await change('PUT', `/games/${game}/cast/nell`, { name: null });
    await change('DELETE', `/games/${game}/cast/dagny/photo`);
    await b.cast.refresh();
    assert.deepEqual([b.cast.name('nell'), b.cast.photo('dagny', 54), b.changes], [null, '', 3]);
  });

  test('a picture is asked for at the width that fits the place: half as much again on a finer screen, then the next width up', async () => {
    const game = aGame('widths');
    const up = await change('PUT', `/games/${game}/cast/vera/photo`, picture('vera', 'png'), 'image/png');
    const b = open(base, game);
    await b.cast.refresh();
    const width = (px?: number | string) => Number(new URL(b.cast.photo('vera', px)).searchParams.get('width'));
    assert.equal(b.cast.photo('vera', 54).split('?')[0], up.photo);
    assert.deepEqual([...new URL(b.cast.photo('vera', 54)).searchParams.keys()], ['width'], 'a width and nothing else');
    assert.deepEqual([40, 160, 320, 321, 640, 641, 961, 1281, 1920, 4000].map((px) => width(px)), [320, 320, 320, 640, 640, 960, 1280, 1920, 1920, 1920]);
    assert.deepEqual([width(), width(0), width('nonsense')], [640, 640, 640], 'with no place named: the width a profile is shown at');
    b.screen.fine = true;
    assert.deepEqual([40, 160, 213, 214, 320, 427, 640, 854, 1280, 1281].map((px) => width(px)), [320, 320, 320, 640, 640, 960, 960, 1920, 1920, 1920]);
    // looked at as large as the screen: by the kind of screen, not by a place
    assert.deepEqual([width('full'), ((b.screen.narrow = true), width('full'))], [1920, 1280]);
  });

  test('what was last heard is kept by the browser: there at once the next time, and all there is with no connection', async () => {
    const game = aGame('kept');
    await change('PUT', `/games/${game}/cast/thu`, { name: 'Thu Hà' });
    const up = await change('PUT', `/games/${game}/cast/thu/photo`, picture('thu', 'webp'), 'image/webp');
    const first = open(base, game);
    await first.cast.refresh();
    assert.deepEqual(JSON.parse(first.storage.get(`sonic-cast.${game}`)!), [{ id: 'thu', name: 'Thu Hà', photo: up.photo }]);

    // the page opened again with the service out of reach: she is there before anything is heard, and stays
    const offline = open(base, game, { storage: first.storage, down: true });
    assert.deepEqual([offline.cast.heard(), offline.cast.name('thu')], [null, 'Thu Hà']);
    assert.equal(offline.cast.photo('thu', 54), `${up.photo}?width=320`);
    assert.equal(await offline.cast.refresh(), false);
    assert.deepEqual([offline.cast.heard(), offline.cast.name('thu'), offline.changes], [false, 'Thu Hà', 1]);
    // back in reach, with her name changed meanwhile: the browser's copy gives way to the service's
    await change('PUT', `/games/${game}/cast/thu`, { name: 'Thu' });
    offline.net.down = false;
    assert.equal(await offline.cast.refresh(), true);
    assert.deepEqual([offline.cast.heard(), offline.cast.name('thu'), offline.changes], [true, 'Thu', 2]);
    assert.equal(JSON.parse(first.storage.get(`sonic-cast.${game}`)!)[0].name, 'Thu');
  });

  test('what a browser holds that is not a cast is not believed, and a game with no service has only its own', async () => {
    const game = aGame('odd');
    for (const held of ['not json', '{"cast":1}', '[{"id":7,"name":"x"},{"name":"y"},null,{"id":"a","name":"","photo":-1},{"id":"b","name":5,"photo":"12"},{"id":"c","name":null,"photo":"javascript:alert(1)"},{"id":"d","name":null,"photo":"https://cdn.example/a b.jpg"},{"id":"e","name":null,"photo":1795070947650}]']) {
      const b = open(base, game, { storage: new Map([[`sonic-cast.${game}`, held]]), down: true });
      assert.deepEqual(['a', 'b', 'c', 'd', 'e'].map((id) => [b.cast.name(id), b.cast.photo(id, 54)]), Array(5).fill([null, '']));
    }
    // an address that already asks for something is not one a width can be added to
    const asked = open(base, game, { storage: new Map([[`sonic-cast.${game}`, JSON.stringify([{ id: 'mina', name: 'Minna', photo: 'https://cdn.example/x.jpg?width=99' }, { id: 'vera', name: null, photo: 'https://cdn.example/games/g/profile-photos/vera-abc.jpg' }])]]), down: true });
    assert.deepEqual([asked.cast.name('mina'), asked.cast.photo('mina', 54), asked.cast.photo('vera', 54)], ['Minna', '', 'https://cdn.example/games/g/profile-photos/vera-abc.jpg?width=320']);
    const alone = open(base, game, { api: '', storage: new Map([[`sonic-cast.${game}`, JSON.stringify([{ id: 'mina', name: 'Minna', photo: 'https://cdn.example/x.jpg' }])]]) });
    assert.deepEqual([alone.cast.remote(), await alone.cast.refresh(), alone.net.calls.length, alone.cast.photo('mina', 54)], [false, false, 0, '']);
  });
});
