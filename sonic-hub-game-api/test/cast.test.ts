import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';
import pg from 'pg';
import { defaultLimits, defaultMedia, loadAppConfig, type AppConfig, type Limits, type MediaConfig } from '../src/config.js';
import { createApp } from '../src/main.js';
import { picture, startFakeStorage, type FakeStorage } from './fake-storage.js';

/*
 * A game's cast, end to end: the names and pictures its characters are given here in place of the game's own.
 * Nobody signs in. A name is kept by the service; a picture goes into the hub's bucket as it came, and the cast gives
 * the address it is read at through the CDN, which is what hands it out at a width.
 * Needs TEST_DATABASE_URL pointing at a Postgres server (any database; a scratch one is created). The bucket and the
 * CDN are a stand-in on this machine (fake-storage.ts).
 */

const adminUrl = process.env.TEST_DATABASE_URL;
const dbName = `game_cast_${process.pid}`;
let dbUrl = '';
let sqlPool: pg.Pool;
let store: FakeStorage;
const running: Array<() => Promise<void>> = [];

/** An app of its own on the scratch database, keeping its pictures in the stand-in bucket unless told otherwise. */
async function start(o: { limits?: Partial<Limits>; media?: MediaConfig } = {}): Promise<string> {
  const config: AppConfig = { database: { url: dbUrl, adminUrl: null, name: dbName, user: '', password: null, ssl: false }, port: 0, corsOrigins: true, addressHeader: 'x-test-ip', media: o.media ?? store.media, limits: { ...defaultLimits, games: 1000, ...o.limits } };
  const app = await createApp(config);
  await app.listen(0, '127.0.0.1');
  running.push(() => app.close());
  return `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
}

interface Answer<T> { status: number; data: T; headers: Headers }
async function call<T = any>(base: string, method: string, path: string, o: { body?: unknown; headers?: Record<string, string> } = {}): Promise<Answer<T>> {
  const raw = Buffer.isBuffer(o.body);
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: { ...(o.body !== undefined && !raw ? { 'content-type': 'application/json' } : {}), ...o.headers },
    body: o.body === undefined ? undefined : raw ? new Uint8Array(o.body as Buffer) : JSON.stringify(o.body),
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data: data as T, headers: res.headers };
}
let games = 0;
const aGame = (what: string) => `k${++games}-${what}`;
const q = async <T = Record<string, unknown>>(text: string, params: unknown[] = []) => (await sqlPool.query(text, params)).rows as T[];

/** The key a member's picture is to be found under in the bucket. */
const keyOf = (game: string, member: string, file: Buffer, ext = 'jpg') => `games/${game}/cast/${member}/${createHash('sha256').update(file).digest('hex').slice(0, 24)}.${ext}`;
const put = (base: string, game: string, member: string, file: Buffer, type = 'image/jpeg') => call(base, 'PUT', `/games/${game}/cast/${member}/photo`, { body: file, headers: { 'content-type': type } });
/** The keys the bucket holds for a game. */
const kept = (game: string) => [...store.objects.keys()].filter((k) => k.startsWith(`games/${game}/`)).sort();

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
    store = await startFakeStorage();
    base = await start();
    sqlPool = new pg.Pool({ connectionString: dbUrl, max: 2 });
  });

  after(async () => {
    if (!adminUrl) return;
    for (const stop of running) await stop();
    await store?.stop();
    await sqlPool?.end();
    const admin = new pg.Client({ connectionString: adminUrl });
    await admin.connect();
    await admin.query(`drop database if exists ${dbName} with (force)`);
    await admin.end();
  });

  test('where pictures are kept is said by the environment: the hub’s bucket and CDN unless told otherwise', () => {
    const env = { DATABASE_URL: 'postgresql://x/y' };
    assert.deepEqual(loadAppConfig(env).media, { b2: null, prefix: 'games', publicBaseUrl: 'https://sonic-hub.b-cdn.net' });
    assert.deepEqual(loadAppConfig(env).media, defaultMedia);
    // the same two that open the bucket for the hub's other services, and the bucket is the hub's
    assert.deepEqual(loadAppConfig({ ...env, B2_KEY_ID: 'an-id', B2_APP_KEY: 'a-key' }).media.b2, { endpoint: 'https://s3.us-east-005.backblazeb2.com', region: 'us-east-005', keyId: 'an-id', appKey: 'a-key', bucket: 'sonic-hub', pathStyle: false });
    assert.deepEqual(loadAppConfig({ ...env, B2_KEY_ID: 'an-id', B2_APP_KEY: 'a-key', B2_BUCKET: 'other', B2_ENDPOINT: 'http://127.0.0.1:9000', B2_REGION: 'here', B2_PATH_STYLE: 'true', CDN_BASE: 'https://cdn.example/', MEDIA_PREFIX: '/play/' }).media, {
      b2: { endpoint: 'http://127.0.0.1:9000', region: 'here', keyId: 'an-id', appKey: 'a-key', bucket: 'other', pathStyle: true },
      prefix: 'play',
      publicBaseUrl: 'https://cdn.example',
    });
    assert.equal(loadAppConfig({ ...env, MEDIA_BASE_URL: 'https://a.example', CDN_BASE: 'https://b.example' }).media.publicBaseUrl, 'https://a.example');
    assert.throws(() => loadAppConfig({ ...env, B2_KEY_ID: 'an-id' }), /B2_KEY_ID and B2_APP_KEY go together/);
    assert.throws(() => loadAppConfig({ ...env, B2_APP_KEY: 'a-key' }), /B2_KEY_ID and B2_APP_KEY go together/);
    assert.throws(() => loadAppConfig({ ...env, MEDIA_PREFIX: 'My Games' }), /MEDIA_PREFIX/);
    assert.deepEqual([defaultLimits.photoBytes, defaultLimits.castPerGame], [16 * 1024 * 1024, 200]);
    assert.equal(loadAppConfig({ ...env, PHOTO_BYTES: '1000', CAST_PER_GAME: '5' }).limits.photoBytes, 1000);
  });

  test('a game’s cast is as the game has it until someone is given a name or a picture here', async () => {
    const game = aGame('own');
    const res = await call(base, 'GET', `/games/${game}/cast`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.data, { cast: [], photoBytes: defaultLimits.photoBytes });
    assert.equal(res.headers.get('cache-control'), 'no-store', 'the list is never kept: it is what tells a browser that a name or a picture has changed');
    assert.equal((await call(base, 'GET', '/games/Not A Game/cast')).status, 400);
    // no picture is handed out from here, and there is no door to knock at
    assert.equal((await call(base, 'GET', `/games/${game}/cast/mina/photo`)).status, 404);
    assert.equal((await call(base, 'GET', '/admin')).status, 404);
  });

  test('a member is given a name, tidied as a player’s is, and gets the game’s own back', async () => {
    const game = aGame('name');
    const named = await call(base, 'PUT', `/games/${game}/cast/nell`, { body: { name: '  Nelly \t the   Second​ ' } });
    assert.equal(named.status, 200);
    assert.deepEqual(named.data, { id: 'nell', name: 'Nelly the Second', photo: null });
    await call(base, 'PUT', `/games/${game}/cast/celeste`, { body: { name: 'Céleste' } });
    assert.deepEqual((await call(base, 'GET', `/games/${game}/cast`)).data.cast, [{ id: 'celeste', name: 'Céleste', photo: null }, { id: 'nell', name: 'Nelly the Second', photo: null }]);
    // another game's cast is another matter
    assert.deepEqual((await call(base, 'GET', `/games/${aGame('other')}/cast`)).data.cast, []);

    for (const name of [null, '', '   ']) {
      await call(base, 'PUT', `/games/${game}/cast/nell`, { body: { name: 'Nelly' } });
      assert.deepEqual((await call(base, 'PUT', `/games/${game}/cast/nell`, { body: { name } })).data, { id: 'nell', name: null, photo: null });
      assert.deepEqual((await call(base, 'GET', `/games/${game}/cast`)).data.cast.map((m: any) => m.id), ['celeste']);
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
    assert.deepEqual((await call(base, 'GET', `/games/${game}/cast`)).data.cast.length, 1);
  });

  test('a picture goes into the hub’s bucket as it came, in the game’s folder, and the cast gives the address it is read at', async () => {
    const game = aGame('photo');
    const file = picture('vera');
    const up = await put(base, game, 'vera', file);
    assert.equal(up.status, 200, JSON.stringify(up.data));
    const key = keyOf(game, 'vera', file);
    assert.deepEqual(up.data, { id: 'vera', name: null, photo: `${store.cdn}/${key}` });
    const there = store.objects.get(key);
    assert.ok(there, `the bucket holds ${[...store.objects.keys()].join(', ') || 'nothing'}`);
    assert.ok(there.bytes.equals(file), 'as it came: nothing is resized or drawn afresh here');
    assert.deepEqual([there.type, there.cache], ['image/jpeg', 'public, max-age=31536000, immutable']);
    // the service keeps the key, not the picture
    assert.deepEqual(await q('select name, photo_key from cast_member where game = $1', [game]), [{ name: null, photo_key: key }]);
    assert.deepEqual((await call(base, 'GET', `/games/${game}/cast`)).data, { cast: [{ id: 'vera', name: null, photo: `${store.cdn}/${key}` }], photoBytes: defaultLimits.photoBytes });
    // the address leads to the file, and a width is asked of the CDN at that address
    const read = await fetch(`${up.data.photo}?width=320`);
    assert.deepEqual([read.status, read.headers.get('content-type')], [200, 'image/jpeg']);
    assert.ok(Buffer.from(await read.arrayBuffer()).equals(file));
    assert.deepEqual(store.read.filter((r) => r.startsWith(key)), [`${key}?width=320`]);
  });

  test('PNG and WebP are taken as well, and a file’s kind is what the file itself says', async () => {
    const game = aGame('kinds');
    const png = picture('a', 'png'), webp = picture('b', 'webp'), mislabelled = picture('c', 'png'), other = picture('d');
    assert.equal((await put(base, game, 'a', png, 'image/png')).data.photo, `${store.cdn}/${keyOf(game, 'a', png, 'png')}`);
    assert.equal((await put(base, game, 'b', webp, 'image/webp')).data.photo, `${store.cdn}/${keyOf(game, 'b', webp, 'webp')}`);
    assert.deepEqual([store.objects.get(keyOf(game, 'a', png, 'png'))?.type, store.objects.get(keyOf(game, 'b', webp, 'webp'))?.type], ['image/png', 'image/webp']);
    // called a JPEG by whoever sent it, and a PNG all the same; and the other way about
    assert.equal((await put(base, game, 'c', mislabelled, 'image/jpeg')).status, 200);
    assert.equal(store.objects.get(keyOf(game, 'c', mislabelled, 'png'))?.type, 'image/png');
    assert.equal((await put(base, game, 'd', other, 'image/webp')).status, 200);
    assert.equal(store.objects.get(keyOf(game, 'd', other, 'jpg'))?.type, 'image/jpeg');
    assert.equal(kept(game).length, 4);
  });

  test('a new picture takes the place of the old one under a new address, and a picture can be taken away', async () => {
    const game = aGame('again');
    const one = picture('thu, first'), two = picture('thu, second');
    await call(base, 'PUT', `/games/${game}/cast/thu`, { body: { name: 'Thu Hà' } });
    const first = await put(base, game, 'thu', one);
    assert.deepEqual([first.data.name, kept(game)], ['Thu Hà', [keyOf(game, 'thu', one)]]);
    const second = await put(base, game, 'thu', two);
    assert.notEqual(second.data.photo, first.data.photo, 'never the same address for another picture: an address may be kept for good');
    assert.deepEqual(kept(game), [keyOf(game, 'thu', two)], 'the one it took the place of is gone from the bucket');
    // the picture she has, sent again: nothing is put, nothing removed
    const [puts, removed] = [store.puts.length, store.removed.length];
    assert.deepEqual((await put(base, game, 'thu', two)).data, second.data);
    assert.deepEqual([store.puts.length, store.removed.length, kept(game)], [puts, removed, [keyOf(game, 'thu', two)]]);

    // a name is kept through all of it, and outlives the picture
    const gone = await call(base, 'DELETE', `/games/${game}/cast/thu/photo`);
    assert.deepEqual([gone.status, gone.data, kept(game)], [200, { id: 'thu', name: 'Thu Hà', photo: null }, []]);
    assert.deepEqual((await call(base, 'DELETE', `/games/${game}/cast/thu/photo`)).data, { id: 'thu', name: 'Thu Hà', photo: null }, 'taking away what is not there is no error');
    // with neither a name nor a picture she is the game's own again, and nothing is kept of her
    assert.ok((await put(base, game, 'lan', picture('lan'))).data.photo);
    assert.deepEqual((await call(base, 'DELETE', `/games/${game}/cast/lan/photo`)).data, { id: 'lan', name: null, photo: null });
    assert.deepEqual([await q('select member from cast_member where game = $1 order by member', [game]), kept(game)], [[{ member: 'thu' }], []]);
    // a picture outlives a name as well
    const kim = picture('kim');
    await put(base, game, 'kim', kim);
    await call(base, 'PUT', `/games/${game}/cast/kim`, { body: { name: 'Kimmy' } });
    assert.deepEqual((await call(base, 'PUT', `/games/${game}/cast/kim`, { body: { name: null } })).data, { id: 'kim', name: null, photo: `${store.cdn}/${keyOf(game, 'kim', kim)}` });
    assert.deepEqual(kept(game), [keyOf(game, 'kim', kim)]);
  });

  test('what is not a picture, or is too much of one, is refused and nothing is kept', async () => {
    const small = await start({ limits: { photoBytes: 50_000 } });
    const game = aGame('refuse');
    const not = await put(small, game, 'x', Buffer.from('<html><script>alert(1)</script></html>'));
    assert.deepEqual([not.status, not.data.error], [400, 'not_a_picture']);
    const svg = await put(small, game, 'x', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400"/></svg>'), 'image/png');
    assert.deepEqual([svg.status, svg.data.error], [400, 'not_a_picture'], 'a drawing that could carry a script is not a picture here');
    const gif = await put(small, game, 'x', Buffer.concat([Buffer.from('GIF89a', 'latin1'), Buffer.alloc(500, 7)]), 'image/png');
    assert.deepEqual([gif.status, gif.data.error], [400, 'not_a_picture']);
    const stub = await put(small, game, 'x', Buffer.from([0xff, 0xd8]));
    assert.deepEqual([stub.status, stub.data.error], [400, 'not_a_picture'], 'two bytes of a file');
    const typed = await put(small, game, 'x', picture('typed'), 'text/plain');
    assert.deepEqual([typed.status, typed.data.error], [415, 'not_a_picture']);
    const json = await call(small, 'PUT', `/games/${game}/cast/x/photo`, { body: { photo: 'data:image/png;base64,AAAA' } });
    assert.deepEqual([json.status, json.data.error], [415, 'not_a_picture']);
    const empty = await put(small, game, 'x', Buffer.alloc(0));
    assert.deepEqual([empty.status, empty.data.error], [415, 'not_a_picture']);
    // more bytes than a picture may have
    const big = await put(small, game, 'x', picture('heavy', 'png', 60_000), 'image/png');
    assert.deepEqual([big.status, big.data.error], [413, 'too_big']);
    assert.match(big.data.message, /50000/);
    assert.equal((await put(small, game, 'x', picture('just fits', 'png', 49_000), 'image/png')).status, 200);
    await call(small, 'DELETE', `/games/${game}/cast/x/photo`);
    assert.deepEqual([await q('select 1 from cast_member where game = $1', [game]), kept(game)], [[], []]);
    assert.deepEqual((await call(small, 'GET', `/games/${game}/cast`)).data, { cast: [], photoBytes: 50_000 });
  });

  test('when the bucket does not take a picture she keeps the one she had, and names are given as ever', async () => {
    const game = aGame('trouble');
    const had = picture('ida, had'), wanted = picture('ida, wanted');
    await put(base, game, 'ida', had);
    store.failing = true;
    try {
      const res = await put(base, game, 'ida', wanted);
      assert.deepEqual([res.status, res.data.error], [502, 'storage_failed']);
      assert.deepEqual((await call(base, 'GET', `/games/${game}/cast`)).data.cast, [{ id: 'ida', name: null, photo: `${store.cdn}/${keyOf(game, 'ida', had)}` }]);
      assert.equal((await call(base, 'PUT', `/games/${game}/cast/ida`, { body: { name: 'Ida' } })).status, 200);
      // her picture is taken away all the same: the file only stays behind in the bucket, unused
      assert.deepEqual((await call(base, 'DELETE', `/games/${game}/cast/ida/photo`)).data, { id: 'ida', name: 'Ida', photo: null });
      assert.deepEqual(kept(game), [keyOf(game, 'ida', had)]);
    } finally {
      store.failing = false;
    }
    assert.equal((await put(base, game, 'ida', wanted)).status, 200);
  });

  test('where the service has no bucket, names are given and read as ever and a picture is turned away unread', async () => {
    const bare = await start({ media: defaultMedia });
    const game = aGame('bare');
    assert.deepEqual((await call(bare, 'GET', `/games/${game}/cast`)).data, { cast: [], photoBytes: null });
    assert.deepEqual((await call(bare, 'PUT', `/games/${game}/cast/mina`, { body: { name: 'Minna' } })).data, { id: 'mina', name: 'Minna', photo: null });
    const res = await put(bare, game, 'mina', picture('mina'));
    assert.deepEqual([res.status, res.data.error], [503, 'no_storage']);
    assert.deepEqual((await put(bare, game, 'mina', Buffer.from('not even a picture'), 'text/plain')).status, 503, 'said before anything of what was sent is looked at');
    assert.deepEqual((await call(bare, 'DELETE', `/games/${game}/cast/mina/photo`)).data, { id: 'mina', name: 'Minna', photo: null });
    assert.deepEqual((await call(bare, 'GET', `/games/${game}/cast`)).data, { cast: [{ id: 'mina', name: 'Minna', photo: null }], photoBytes: null });
  });

  test('a cast has room for so many, and the room comes back when someone is the game’s own again', async () => {
    const tight = await start({ limits: { castPerGame: 2 } });
    const game = aGame('room');
    assert.equal((await call(tight, 'PUT', `/games/${game}/cast/a`, { body: { name: 'A' } })).status, 200);
    assert.equal((await put(tight, game, 'b', picture('b'))).status, 200);
    const full = await call(tight, 'PUT', `/games/${game}/cast/c`, { body: { name: 'C' } });
    assert.deepEqual([full.status, full.data.error, full.data.max], [409, 'full', 2]);
    // a picture for someone there is no room for is not put in the bucket at all
    const puts = store.puts.length;
    assert.deepEqual([(await put(tight, game, 'c', picture('c'))).status, store.puts.length, kept(game).length], [409, puts, 1]);
    // those already in it are changed as before
    assert.equal((await call(tight, 'PUT', `/games/${game}/cast/a`, { body: { name: 'Ada' } })).status, 200);
    assert.equal((await put(tight, game, 'a', picture('a'))).status, 200);
    await call(tight, 'DELETE', `/games/${game}/cast/b/photo`);
    assert.equal((await call(tight, 'PUT', `/games/${game}/cast/c`, { body: { name: 'C' } })).status, 200);
    assert.equal((await call(tight, 'PUT', `/games/${aGame('room-2')}/cast/a`, { body: { name: 'A' } })).status, 200, 'the room is each game’s own');
  });

  test('a cast is kept for so many games, as players are', async () => {
    const [{ n }] = await q<{ n: number }>('select count(distinct game)::int as n from cast_member');
    const few = await start({ limits: { games: n! + 1 } });
    const last = aGame('last-in');
    assert.equal((await call(few, 'PUT', `/games/${last}/cast/a`, { body: { name: 'A' } })).status, 200);
    const late = aGame('too-late');
    const full = await call(few, 'PUT', `/games/${late}/cast/a`, { body: { name: 'A' } });
    assert.deepEqual([full.status, full.data.error, full.data.games], [409, 'full', n! + 1]);
    const puts = store.puts.length;
    assert.deepEqual([(await put(few, late, 'a', picture('late'))).status, store.puts.length], [409, puts]);
    // a game that has a cast still takes more into it
    assert.equal((await call(few, 'PUT', `/games/${last}/cast/b`, { body: { name: 'B' } })).status, 200);
  });

  test('a page on another site may read a cast and change it, with nothing sent beside', async () => {
    for (const [path, method, asks] of [['/games/any/cast/mina', 'PUT', 'content-type'], ['/games/any/cast/mina/photo', 'PUT', 'content-type'], ['/games/any/cast/mina/photo', 'DELETE', '']] as const) {
      const pre = await fetch(`${base}/api${path}`, { method: 'OPTIONS', headers: { origin: 'https://game.example', 'access-control-request-method': method, ...(asks ? { 'access-control-request-headers': asks } : {}) } });
      assert.equal(pre.status, 204);
      assert.match(pre.headers.get('access-control-allow-methods') ?? '', new RegExp(method));
      assert.equal(pre.headers.get('access-control-allow-headers'), 'Content-Type');
    }
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
