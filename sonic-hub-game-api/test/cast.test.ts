import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';
import pg from 'pg';
import sharp from 'sharp';
import { crc32, deflateSync } from 'node:zlib';
import { defaultLimits, loadAppConfig, type AppConfig, type Limits } from '../src/config.js';
import { createApp } from '../src/main.js';

/*
 * A game's cast, end to end: the names and pictures its characters are given here in place of the game's own.
 * Anyone reads them; only whoever holds the key changes them.
 * Needs TEST_DATABASE_URL pointing at a Postgres server (any database; a scratch one is created).
 */

const adminUrl = process.env.TEST_DATABASE_URL;
const dbName = `game_cast_${process.pid}`;
const KEY = 'a-key-for-the-tests-0123456789';
let dbUrl = '';
let sqlPool: pg.Pool;
const running: Array<() => Promise<void>> = [];

/** An app of its own on the scratch database. Callers are told apart by x-test-ip, so a test can be someone else. */
async function start(o: { adminKey?: string | null; limits?: Partial<Limits> } = {}): Promise<string> {
  const config: AppConfig = { database: { url: dbUrl, adminUrl: null, name: dbName, user: '', password: null, ssl: false }, port: 0, corsOrigins: true, addressHeader: 'x-test-ip', adminKey: o.adminKey === undefined ? KEY : o.adminKey, limits: { ...defaultLimits, games: 1000, ...o.limits } };
  const app = await createApp(config);
  await app.listen(0, '127.0.0.1');
  running.push(() => app.close());
  return `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
}

interface Answer<T> { status: number; data: T; headers: Headers; bytes: Buffer }
async function call<T = any>(base: string, method: string, path: string, o: { body?: unknown; headers?: Record<string, string>; key?: string | null } = {}): Promise<Answer<T>> {
  const raw = Buffer.isBuffer(o.body);
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: { ...(o.body !== undefined && !raw ? { 'content-type': 'application/json' } : {}), ...(o.key === null ? {} : { 'x-admin-key': o.key ?? KEY }), ...o.headers },
    body: o.body === undefined ? undefined : raw ? new Uint8Array(o.body as Buffer) : JSON.stringify(o.body),
  });
  const bytes = Buffer.from(await res.arrayBuffer());
  let data: unknown = null;
  if (!/^image\//.test(res.headers.get('content-type') ?? '')) { const text = bytes.toString('utf8'); try { data = text ? JSON.parse(text) : null; } catch { data = text; } }
  return { status: res.status, data: data as T, headers: res.headers, bytes };
}
let games = 0;
const aGame = (what: string) => `k${++games}-${what}`;
const q = async <T = Record<string, unknown>>(text: string, params: unknown[] = []) => (await sqlPool.query(text, params)).rows as T[];

/** A picture made for the test: plain colour with a lighter band across the top, so that what is up can be told. */
async function picture(width: number, height: number, how: 'jpeg' | 'png' | 'webp' = 'jpeg', orientation?: number): Promise<Buffer> {
  const band = await sharp({ create: { width, height: Math.max(1, Math.round(height / 5)), channels: 3, background: '#f4e3b0' } }).png().toBuffer();
  let img = sharp({ create: { width, height, channels: 3, background: '#7a4a3a' } }).composite([{ input: band, top: 0, left: 0 }]);
  if (orientation) img = img.withMetadata({ orientation });
  return how === 'png' ? img.png().toBuffer() : how === 'webp' ? img.webp().toBuffer() : img.jpeg({ quality: 90 }).toBuffer();
}
const put = (base: string, game: string, member: string, file: Buffer, type = 'image/jpeg', key?: string | null, headers: Record<string, string> = {}) => call(base, 'PUT', `/games/${game}/cast/${member}/photo`, { body: file, headers: { 'content-type': type, ...headers }, key });
/** A PNG that says it is far larger than it is: its first lines are all a reader needs to turn it away. */
function vastPng(width: number, height: number): Buffer {
  const chunk = (type: string, data: Buffer) => { const body = Buffer.concat([Buffer.from(type, 'latin1'), data]), len = Buffer.alloc(4), sum = Buffer.alloc(4); len.writeUInt32BE(data.length); sum.writeUInt32BE(crc32(body)); return Buffer.concat([len, body, sum]); };
  const head = Buffer.alloc(13); head.writeUInt32BE(width, 0); head.writeUInt32BE(height, 4); head[8] = 8; head[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(Buffer.alloc(4096))), chunk('IEND', Buffer.alloc(0))]);
}
const widthsKept = async (game: string, member: string) => (await q<{ width: number }>('select width from cast_photo where game = $1 and member = $2 order by width', [game, member])).map((r) => r.width);
/** What a browser is handed at an address: how wide and tall it is, and what kind of file. */
async function got(base: string, path: string) {
  const res = await call(base, 'GET', path, { key: null });
  assert.equal(res.status, 200, `${path}: ${JSON.stringify(res.data)}`);
  const meta = await sharp(res.bytes).metadata();
  return { res, width: meta.width, height: meta.height, format: meta.format };
}

describe('a game’s cast: names and pictures given here', { skip: !adminUrl && 'TEST_DATABASE_URL not set' }, () => {
  let base = '';

  before(async () => {
    const admin = new pg.Client({ connectionString: adminUrl });
    await admin.connect();
    await admin.query(`drop database if exists ${dbName} with (force)`);
    await admin.query(`create database ${dbName}`);
    await admin.end();
    const url = new URL(adminUrl!);
    url.pathname = `/${dbName}`;
    dbUrl = url.toString();
    process.env.NODE_ENV = 'test';
    base = await start();
    sqlPool = new pg.Pool({ connectionString: dbUrl, max: 2 });
  });

  after(async () => {
    if (!adminUrl) return;
    for (const stop of running) await stop();
    await sqlPool?.end();
    const admin = new pg.Client({ connectionString: adminUrl });
    await admin.connect();
    await admin.query(`drop database if exists ${dbName} with (force)`);
    await admin.end();
  });

  test('the key comes from ADMIN_KEY, and a short one is refused at the start', () => {
    const env = { DATABASE_URL: 'postgresql://x/y' };
    assert.equal(loadAppConfig(env).adminKey, null);
    assert.equal(loadAppConfig({ ...env, ADMIN_KEY: '  ' }).adminKey, null);
    assert.equal(loadAppConfig({ ...env, ADMIN_KEY: KEY }).adminKey, KEY);
    assert.throws(() => loadAppConfig({ ...env, ADMIN_KEY: 'too-short' }), /ADMIN_KEY.*16/);
    assert.deepEqual([defaultLimits.photoBytes, defaultLimits.castPerGame], [16 * 1024 * 1024, 200]);
    assert.equal(loadAppConfig({ ...env, PHOTO_BYTES: '1000', CAST_PER_GAME: '5' }).limits.photoBytes, 1000);
  });

  test('a game’s cast is as the game has it until someone is given a name or a picture here', async () => {
    const game = aGame('own');
    const res = await call(base, 'GET', `/games/${game}/cast`, { key: null });
    assert.equal(res.status, 200);
    assert.deepEqual(res.data, { cast: [] });
    assert.equal((await call(base, 'GET', `/games/${game}/cast/mina/photo`, { key: null })).status, 404);
    assert.equal((await call(base, 'GET', '/games/Not A Game/cast', { key: null })).status, 400);
  });

  test('where the service has no key, nobody changes a cast, and everyone still reads it', async () => {
    const closed = await start({ adminKey: null });
    const game = aGame('nokey');
    for (const key of [null, KEY, '']) {
      const res = await call(closed, 'PUT', `/games/${game}/cast/mina`, { body: { name: 'Minna' }, key });
      assert.deepEqual([res.status, res.data.error], [503, 'no_admin']);
    }
    assert.deepEqual([(await call(closed, 'GET', '/admin')).status, (await put(closed, game, 'mina', await picture(400, 500))).status, (await call(closed, 'DELETE', `/games/${game}/cast/mina/photo`)).status], [503, 503, 503]);
    assert.deepEqual((await call(closed, 'GET', `/games/${game}/cast`, { key: null })).data, { cast: [] });
  });

  test('only the key changes a cast: none or a wrong one is refused, whatever is being asked', async () => {
    const game = aGame('key');
    assert.deepEqual((await call(base, 'GET', '/admin')).data, { ok: true, photoBytes: defaultLimits.photoBytes });
    const keys = [null, '', 'not-the-key-not-the-key', KEY + '0', KEY.slice(0, -1), KEY.toUpperCase()];
    for (const [n, key] of keys.entries()) {
      const who = { 'x-test-ip': `198.51.100.${n + 1}` };   // each of them someone else, so none is taken for one caller guessing
      const asks = [
        await call(base, 'GET', '/admin', { key, headers: who }),
        await call(base, 'PUT', `/games/${game}/cast/mina`, { body: { name: 'Minna' }, key, headers: who }),
        await put(base, game, 'mina', await picture(400, 500), 'image/jpeg', key, who),
        await call(base, 'DELETE', `/games/${game}/cast/mina/photo`, { key, headers: who }),
      ];
      for (const res of asks) assert.deepEqual([res.status, res.data.error], [401, 'not_admin']);
    }
    assert.deepEqual((await call(base, 'GET', `/games/${game}/cast`, { key: null })).data, { cast: [] });
    assert.deepEqual(await q('select 1 from cast_member where game = $1', [game]), []);
  });

  test('someone guessing at the key is told to wait after ten wrong ones, and whoever has it is not', async () => {
    const guesser = { 'x-test-ip': '203.0.113.50' }, keeper = { 'x-test-ip': '203.0.113.51' };
    for (let i = 0; i < 10; i++) assert.equal((await call(base, 'GET', '/admin', { key: `guess-number-${i}-0123456789`, headers: guesser })).status, 401);
    const told = await call(base, 'GET', '/admin', { key: 'guess-number-eleven-0123456789', headers: guesser });
    assert.deepEqual([told.status, told.data.error], [429, 'slow_down']);
    assert.ok(Number(told.headers.get('retry-after')) > 0 && told.data.retryAfter <= 600);
    // even the right key waits now, from there: otherwise the wait would say which guess was right
    assert.equal((await call(base, 'GET', '/admin', { headers: guesser })).status, 429);
    assert.equal((await call(base, 'GET', '/admin', { headers: keeper })).status, 200);
    // the keeper's own slips are not held against a right key
    for (let i = 0; i < 5; i++) await call(base, 'GET', '/admin', { key: 'a-slip-of-the-keyboard-0', headers: keeper });
    assert.equal((await call(base, 'GET', '/admin', { headers: keeper })).status, 200);
  });

  test('a member is given a name, tidied as a player’s is, and gets the game’s own back', async () => {
    const game = aGame('name');
    const named = await call(base, 'PUT', `/games/${game}/cast/nell`, { body: { name: '  Nelly \t the   Second​ ' } });
    assert.equal(named.status, 200);
    assert.deepEqual(named.data, { id: 'nell', name: 'Nelly the Second', photo: null });
    await call(base, 'PUT', `/games/${game}/cast/celeste`, { body: { name: 'Céleste' } });
    assert.deepEqual((await call(base, 'GET', `/games/${game}/cast`, { key: null })).data, { cast: [{ id: 'celeste', name: 'Céleste', photo: null }, { id: 'nell', name: 'Nelly the Second', photo: null }] });
    // another game's cast is another matter
    assert.deepEqual((await call(base, 'GET', `/games/${aGame('other')}/cast`, { key: null })).data, { cast: [] });

    for (const name of [null, '', '   ']) {
      await call(base, 'PUT', `/games/${game}/cast/nell`, { body: { name: 'Nelly' } });
      assert.deepEqual((await call(base, 'PUT', `/games/${game}/cast/nell`, { body: { name } })).data, { id: 'nell', name: null, photo: null });
      assert.deepEqual((await call(base, 'GET', `/games/${game}/cast`, { key: null })).data.cast.map((m: any) => m.id), ['celeste']);
    }
    assert.deepEqual(await q('select member from cast_member where game = $1', [game]), [{ member: 'celeste' }]);
  });

  test('what is not a name, or not a member, is refused', async () => {
    const game = aGame('bad');
    const refused = async (member: string, body: unknown) => { const res = await call(base, 'PUT', `/games/${game}/cast/${member}`, { body }); return [res.status, res.data.error]; };
    assert.deepEqual(await refused('nell', { name: 'x'.repeat(25) }), [400, 'invalid']);
    assert.deepEqual(await refused('nell', { name: 7 }), [400, 'invalid']);
    assert.deepEqual(await refused('nell', {}), [400, 'invalid']);
    assert.deepEqual(await refused('Nell', { name: 'Nell' }), [400, 'invalid']);
    assert.deepEqual(await refused('n'.repeat(41), { name: 'Nell' }), [400, 'invalid']);
    assert.deepEqual(await refused('-nell', { name: 'Nell' }), [400, 'invalid']);
    assert.equal((await call(base, 'PUT', `/games/${game}/cast/nell`, { body: { name: 'é'.repeat(24) } })).status, 200, 'twenty-four signs, however many bytes');
    assert.deepEqual((await call(base, 'GET', `/games/${game}/cast`, { key: null })).data.cast.length, 1);
  });

  test('a picture is taken in and kept at the widths pictures are handed out at, never wider than it came', async () => {
    const game = aGame('photo');
    const up = await put(base, game, 'vera', await picture(1500, 2000));
    assert.equal(up.status, 200, JSON.stringify(up.data));
    assert.deepEqual([up.data.id, up.data.name], ['vera', null]);
    assert.ok(Number.isInteger(up.data.photo) && Math.abs(up.data.photo - Date.now()) < 60_000);
    assert.deepEqual(await widthsKept(game, 'vera'), [320, 640, 960, 1280]);
    assert.deepEqual((await call(base, 'GET', `/games/${game}/cast`, { key: null })).data, { cast: [{ id: 'vera', name: null, photo: up.data.photo }] });

    const at = (width?: number) => got(base, `/games/${game}/cast/vera/photo${width === undefined ? '' : `?width=${width}`}`);
    // asked for a width in between, a browser gets the next one up; asked for more than there is, the widest
    for (const [asked, given] of [[320, 320], [1, 320], [54, 320], [321, 640], [640, 640], [700, 960], [1280, 1280], [1281, 1280], [1920, 1280], [5000, 1280]] as const) {
      const p = await at(asked);
      assert.deepEqual([p.width, p.height, p.format], [given, Math.round(given * 2000 / 1500), 'webp'], `asked for ${asked}`);
      assert.equal(p.res.headers.get('content-type'), 'image/webp');
      assert.equal(p.res.headers.get('x-content-type-options'), 'nosniff');
    }
    assert.equal((await at()).width, 640, 'with no width asked for: the one a profile is shown at');
    for (const bad of ['0', '-5', 'wide', '1.5']) assert.equal((await call(base, 'GET', `/games/${game}/cast/vera/photo?width=${bad}`, { key: null })).status, 400);
    // nothing of what the file said about itself is handed on
    const kept = await sharp((await at(640)).res.bytes).metadata();
    assert.deepEqual([kept.exif, kept.icc, kept.xmp], [undefined, undefined, undefined]);
  });

  test('PNG and WebP are taken as well, and a picture narrower than the narrowest width is kept as it came', async () => {
    const game = aGame('kinds');
    assert.equal((await put(base, game, 'a', await picture(700, 700, 'png'), 'image/png')).status, 200);
    assert.equal((await put(base, game, 'b', await picture(2400, 1600, 'webp'), 'image/webp')).status, 200);
    assert.equal((await put(base, game, 'c', await picture(200, 260))).status, 200);
    assert.deepEqual([await widthsKept(game, 'a'), await widthsKept(game, 'b'), await widthsKept(game, 'c')], [[320, 640], [320, 640, 960, 1280, 1920], [200]]);
    for (const width of [100, 320, 1920]) { const p = await got(base, `/games/${game}/cast/c/photo?width=${width}`); assert.deepEqual([p.width, p.height], [200, 260]); }
    // what the file is called by whoever sends it is not what decides: the file itself is looked at
    assert.equal((await put(base, game, 'd', await picture(400, 400, 'png'), 'image/jpeg')).status, 200);
  });

  test('a picture a phone took on its side comes out upright', async () => {
    const game = aGame('turned');
    // 800 wide and 600 tall as stored, with a note that it is to be turned a quarter: 600 wide and 800 tall as seen
    assert.equal((await put(base, game, 'june', await picture(800, 600, 'jpeg', 6))).status, 200);
    assert.deepEqual(await widthsKept(game, 'june'), [320]);
    const p = await got(base, `/games/${game}/cast/june/photo?width=320`);
    assert.deepEqual([p.width, p.height], [320, 427]);
    const bigger = aGame('turned-big');
    assert.equal((await put(base, bigger, 'june', await picture(2000, 1300, 'jpeg', 8))).status, 200);
    assert.deepEqual(await widthsKept(bigger, 'june'), [320, 640, 960, 1280]);

    // and it is turned the right way: a picture with a light band along its top, laid on its left side as a phone
    // held upright stores it (to be turned a quarter clockwise, which is what 6 says), has the band along its top again
    const upright = await picture(600, 800, 'png');
    const lying = await sharp(await sharp(upright).rotate(-90).png().toBuffer()).withMetadata({ orientation: 6 }).jpeg({ quality: 95 }).toBuffer();
    assert.deepEqual([(await sharp(lying).metadata()).width, (await sharp(lying).metadata()).height], [800, 600]);
    const way = aGame('turned-way');
    assert.equal((await put(base, way, 'june', lying)).status, 200);
    const shown = await got(base, `/games/${way}/cast/june/photo?width=320`);
    assert.deepEqual([shown.width, shown.height], [320, 427]);
    const { data: px, info } = await sharp(shown.res.bytes).raw().toBuffer({ resolveWithObject: true });
    const at = (x: number, y: number) => { const i = (y * info.width + x) * info.channels; return px[i]! + px[i + 1]! + px[i + 2]!; };
    const [top, bottom] = [at(160, 20), at(160, 400)];
    assert.ok(top > 550 && bottom < 400, `the band is ${top > bottom ? 'at the top' : 'not at the top'}: top ${top}, bottom ${bottom}`);
  });

  test('a picture’s address names its version and may be kept for good; any other way of asking is checked each time', async () => {
    const game = aGame('cache');
    const up = await put(base, game, 'kim', await picture(900, 1200));
    const v = up.data.photo as number;
    const exact = await call(base, 'GET', `/games/${game}/cast/kim/photo?v=${v}&width=320`, { key: null });
    assert.equal(exact.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    assert.equal(exact.headers.get('etag'), `"${v}-320"`);
    for (const path of [`/games/${game}/cast/kim/photo?width=320`, `/games/${game}/cast/kim/photo?v=${v - 1}&width=320`, `/games/${game}/cast/kim/photo?v=latest`]) {
      assert.equal((await call(base, 'GET', path, { key: null })).headers.get('cache-control'), 'no-cache', path);
    }
    const again = await call(base, 'GET', `/games/${game}/cast/kim/photo?width=320`, { key: null, headers: { 'if-none-match': `"${v}-320"` } });
    assert.deepEqual([again.status, again.bytes.length, again.headers.get('etag')], [304, 0, `"${v}-320"`]);
    assert.equal((await call(base, 'GET', `/games/${game}/cast/kim/photo?width=320`, { key: null, headers: { 'if-none-match': `"${v - 1}-320"` } })).status, 200);
    // the list of who has what is never kept: it is what tells a browser that a picture has changed
    assert.equal((await call(base, 'GET', `/games/${game}/cast`, { key: null })).headers.get('cache-control'), 'no-store');
  });

  test('a new picture takes the place of the old one under a new address, and a picture can be taken away', async () => {
    const game = aGame('again');
    await call(base, 'PUT', `/games/${game}/cast/thu`, { body: { name: 'Thu Hà' } });
    const first = await put(base, game, 'thu', await picture(1300, 1300));
    assert.deepEqual([first.data.name, await widthsKept(game, 'thu')], ['Thu Hà', [320, 640, 960, 1280]]);
    const second = await put(base, game, 'thu', await picture(700, 900));
    assert.ok(second.data.photo > first.data.photo, 'never the same address for another picture');
    assert.deepEqual(await widthsKept(game, 'thu'), [320, 640]);
    assert.equal((await got(base, `/games/${game}/cast/thu/photo?width=1280`)).width, 640);
    // a name is kept through all of it, and outlives the picture
    const gone = await call(base, 'DELETE', `/games/${game}/cast/thu/photo`);
    assert.deepEqual([gone.status, gone.data], [200, { id: 'thu', name: 'Thu Hà', photo: null }]);
    assert.deepEqual([await widthsKept(game, 'thu'), (await call(base, 'GET', `/games/${game}/cast/thu/photo`, { key: null })).status], [[], 404]);
    assert.deepEqual((await call(base, 'DELETE', `/games/${game}/cast/thu/photo`)).data, { id: 'thu', name: 'Thu Hà', photo: null }, 'taking away what is not there is no error');
    // with neither a name nor a picture she is the game's own again, and nothing is kept of her
    const third = await put(base, game, 'lan', await picture(400, 400));
    assert.ok(third.data.photo);
    assert.deepEqual((await call(base, 'DELETE', `/games/${game}/cast/lan/photo`)).data, { id: 'lan', name: null, photo: null });
    assert.deepEqual(await q('select member from cast_member where game = $1 order by member', [game]), [{ member: 'thu' }]);
    assert.deepEqual(await q('select 1 from cast_photo where game = $1', [game]), []);
  });

  test('what is not a picture, or is too much of one, is refused and nothing is kept', async () => {
    const small = await start({ limits: { photoBytes: 300_000 } });
    const game = aGame('refuse');
    const not = await put(small, game, 'x', Buffer.from('<html><script>alert(1)</script></html>'));
    assert.deepEqual([not.status, not.data.error], [400, 'not_a_picture']);
    const svg = await put(small, game, 'x', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400"/></svg>'), 'image/png');
    assert.deepEqual([svg.status, svg.data.error], [400, 'not_a_picture'], 'a drawing that could carry a script is not a picture here');
    const gif = await put(small, game, 'x', await sharp({ create: { width: 400, height: 400, channels: 3, background: '#888' } }).gif().toBuffer(), 'image/png');
    assert.deepEqual([gif.status, gif.data.error], [400, 'not_a_picture']);
    const cut = await put(small, game, 'x', (await picture(600, 600)).subarray(0, 900));
    assert.deepEqual([cut.status, cut.data.error], [400, 'not_a_picture'], 'half a file');
    const typed = await put(small, game, 'x', await picture(400, 400), 'text/plain');
    assert.deepEqual([typed.status, typed.data.error], [415, 'not_a_picture']);
    const json = await call(small, 'PUT', `/games/${game}/cast/x/photo`, { body: { photo: 'data:image/png;base64,AAAA' } });
    assert.deepEqual([json.status, json.data.error], [415, 'not_a_picture']);
    const empty = await put(small, game, 'x', Buffer.alloc(0));
    assert.deepEqual([empty.status, empty.data.error], [415, 'not_a_picture']);
    // more bytes than a picture may have
    const noise = Buffer.alloc(1500 * 1500 * 3); for (let i = 0; i < noise.length; i++) noise[i] = (i * 2654435761) >>> 24;
    const heavy = await sharp(noise, { raw: { width: 1500, height: 1500, channels: 3 } }).png({ compressionLevel: 0 }).toBuffer();
    assert.ok(heavy.length > 300_000);
    const big = await put(small, game, 'x', heavy, 'image/png');
    assert.deepEqual([big.status, big.data.error], [413, 'too_big']);
    // the key is looked at before any of it is read: without it, the answer is about the key, whatever was sent
    const unasked = await put(small, game, 'x', heavy, 'image/png', 'not-the-key-not-the-key', { 'x-test-ip': '198.51.100.99' });
    assert.deepEqual([unasked.status, unasked.data.error], [401, 'not_admin']);
    // a picture with see-through parts keeps them
    const clear = await sharp({ create: { width: 400, height: 400, channels: 4, background: { r: 200, g: 40, b: 40, alpha: 0.5 } } }).png().toBuffer();
    assert.equal((await put(base, game, 'glass', clear, 'image/png')).status, 200);
    assert.equal((await got(base, `/games/${game}/cast/glass/photo?width=320`)).res.status, 200);
    assert.equal((await sharp((await got(base, `/games/${game}/cast/glass/photo?width=320`)).res.bytes).metadata()).hasAlpha, true);
    await call(base, 'DELETE', `/games/${game}/cast/glass/photo`);
    // few bytes, but more to unfold than a picture has any need of
    const vast = await put(small, game, 'x', vastPng(30000, 30000), 'image/png');
    assert.deepEqual([vast.status, vast.data.error], [400, 'not_a_picture']);
    assert.deepEqual(await q('select 1 from cast_member where game = $1', [game]), []);
    assert.deepEqual((await call(small, 'GET', `/games/${game}/cast`, { key: null })).data, { cast: [] });
  });

  test('a cast has room for so many, and the room comes back when someone is the game’s own again', async () => {
    const tight = await start({ limits: { castPerGame: 2 } });
    const game = aGame('room');
    assert.equal((await call(tight, 'PUT', `/games/${game}/cast/a`, { body: { name: 'A' } })).status, 200);
    assert.equal((await put(tight, game, 'b', await picture(400, 400))).status, 200);
    const full = await call(tight, 'PUT', `/games/${game}/cast/c`, { body: { name: 'C' } });
    assert.deepEqual([full.status, full.data.error, full.data.max], [409, 'full', 2]);
    assert.deepEqual([(await put(tight, game, 'c', await picture(400, 400))).status, await widthsKept(game, 'c')], [409, []]);
    // those already in it are changed as before
    assert.equal((await call(tight, 'PUT', `/games/${game}/cast/a`, { body: { name: 'Ada' } })).status, 200);
    assert.equal((await put(tight, game, 'a', await picture(400, 400))).status, 200);
    await call(tight, 'DELETE', `/games/${game}/cast/b/photo`);
    assert.equal((await call(tight, 'PUT', `/games/${game}/cast/c`, { body: { name: 'C' } })).status, 200);
    assert.equal((await call(tight, 'PUT', `/games/${aGame('room-2')}/cast/a`, { body: { name: 'A' } })).status, 200, 'the room is each game’s own');
  });

  test('a page on another site may read a cast and send the key', async () => {
    const pre = await fetch(`${base}/api/games/any/cast/mina`, { method: 'OPTIONS', headers: { origin: 'https://game.example', 'access-control-request-method': 'PUT', 'access-control-request-headers': 'content-type,x-admin-key' } });
    assert.equal(pre.status, 204);
    assert.match(pre.headers.get('access-control-allow-headers') ?? '', /x-admin-key/i);
    assert.match(pre.headers.get('access-control-allow-methods') ?? '', /PUT/);
    const read = await fetch(`${base}/api/games/any/cast`, { headers: { origin: 'https://game.example' } });
    assert.equal(read.headers.get('access-control-allow-origin'), 'https://game.example');
  });

  test('the browser side is handed out beside the saves’ own', async () => {
    const res = await fetch(`${base}/api/cast.js`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /^text\/javascript/);
    assert.match(res.headers.get('cache-control') ?? '', /max-age/);
    assert.equal(await res.text(), readFileSync(new URL('../../client/sonic-cast.js', import.meta.url), 'utf8'));
  });
});
