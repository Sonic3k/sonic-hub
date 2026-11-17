import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';
import pg from 'pg';
import { defaultLimits, type AppConfig, type Limits } from '../src/config.js';
import { createApp } from '../src/main.js';

/*
 * End to end: the HTTP API on a fresh database.
 * Needs TEST_DATABASE_URL pointing at a Postgres server (any database; a scratch one is created).
 */

const adminUrl = process.env.TEST_DATABASE_URL;
const dbName = `game_e2e_${process.pid}`;
const GAME = 'keep-it-down-extended';
let dbUrl = '';
let sqlPool: pg.Pool;
const running: Array<() => Promise<void>> = [];

/** An app of its own on the scratch database, with whatever limits the test needs. */
async function start(limits: Partial<Limits> = {}): Promise<string> {
  const config: AppConfig = { database: { url: dbUrl, adminUrl: null, name: dbName, user: '', password: null, ssl: false }, port: 0, corsOrigins: true, limits: { ...defaultLimits, ...limits } };
  const app = await createApp(config);
  await app.listen(0, '127.0.0.1');
  running.push(() => app.close());
  return `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
}

interface Answer<T> { status: number; data: T; headers: Headers }
async function call<T = any>(base: string, method: string, path: string, opts: { code?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<Answer<T>> {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: { ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}), ...(opts.code ? { authorization: `Bearer ${opts.code}` } : {}), ...opts.headers },
    body: opts.body === undefined ? undefined : typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body),
  });
  const text = await res.text();
  let data: unknown = text;
  try { data = text ? JSON.parse(text) : null; } catch { /* not JSON: the text itself */ }
  return { status: res.status, data: data as T, headers: res.headers };
}
const uuid = () => crypto.randomUUID();
const newCode = async (base: string) => (await call<{ code: string }>(base, 'POST', '/codes')).data.code;
const q = async <T = Record<string, unknown>>(text: string, params: unknown[] = []) => (await sqlPool.query(text, params)).rows as T[];

describe('game saves API end to end', { skip: !adminUrl && 'TEST_DATABASE_URL not set' }, () => {
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
    base = await start({ newCodesPerHour: 1000 });   // every test here asks for a code of its own, all from one address
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

  test('it is up, and hands out the browser client', async () => {
    assert.deepEqual((await call(base, 'GET', '/health')).data, { ok: true });
    const client = await call<string>(base, 'GET', '/client.js');
    assert.equal(client.status, 200);
    assert.match(client.headers.get('content-type') ?? '', /^text\/javascript/);
    assert.match(client.data, /^function SonicSave\(opt\)/m);
    assert.match(client.headers.get('cache-control') ?? '', /max-age/);
  });

  test('a new code is twelve signs in three groups, given once, and only its hash is kept', async () => {
    const a = await call<{ code: string }>(base, 'POST', '/codes');
    const b = await call<{ code: string }>(base, 'POST', '/codes');
    assert.equal(a.status, 201);
    assert.match(a.data.code, /^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
    assert.notEqual(a.data.code, b.data.code);
    const rows = await q<{ code_hash: string }>('select code_hash from holder');
    assert.ok(rows.length >= 2);
    for (const r of rows) assert.match(r.code_hash, /^[0-9a-f]{64}$/);
    const everything = JSON.stringify(await q('select * from holder'));
    assert.ok(!everything.includes(a.data.code) && !everything.includes(a.data.code.replace(/-/g, '')), 'the code itself is nowhere in the table');
  });

  test('players are opened by the code, however it is typed, and by nothing else', async () => {
    const code = await newCode(base);
    for (const typed of [code, code.toLowerCase(), code.replace(/-/g, ''), ` ${code.replace(/-/g, ' ')} `]) {
      const r = await call(base, 'GET', `/games/${GAME}/players`, { code: typed });
      assert.equal(r.status, 200, typed);
      assert.deepEqual(r.data, { max: 3, players: [] });
    }
    const none = await call(base, 'GET', `/games/${GAME}/players`);
    assert.equal(none.status, 401);
    assert.equal(none.data.error, 'unknown_code');
    for (const typed of ['2222-2222-2222', 'not a code', code.slice(0, -1) + (code.endsWith('2') ? '3' : '2'), 'O0O0-1I1I-LLLL']) {
      const r = await call(base, 'GET', `/games/${GAME}/players`, { code: typed });
      assert.equal(r.status, 401, typed);
      assert.equal(r.data.error, 'unknown_code');
    }
  });

  test('a player is written with the version it was made from; an older one is refused and told how things stand', async () => {
    const code = await newCode(base);
    const id = uuid();
    const made = await call(base, 'PUT', `/games/${GAME}/players/${id}`, { code, body: { base: 0, name: 'Sonic', data: { points: 600, vs: {} } } });
    assert.equal(made.status, 200);
    assert.equal(made.data.version, 1);
    assert.deepEqual({ id: made.data.id, name: made.data.name, data: made.data.data }, { id, name: 'Sonic', data: { points: 600, vs: {} } });
    assert.ok(!Number.isNaN(Date.parse(made.data.createdAt)) && !Number.isNaN(Date.parse(made.data.updatedAt)));

    const next = await call(base, 'PUT', `/games/${GAME}/players/${id}`, { code, body: { base: 1, data: { points: 616, vs: { mina: { w: 1, l: 0, d: 0 } } } } });
    assert.equal(next.status, 200);
    assert.equal(next.data.version, 2);
    assert.equal(next.data.name, 'Sonic', 'what is not sent stays');
    assert.ok(Date.parse(next.data.updatedAt) >= Date.parse(made.data.updatedAt));

    const late = await call(base, 'PUT', `/games/${GAME}/players/${id}`, { code, body: { base: 1, data: { points: 584 } } });
    assert.equal(late.status, 409);
    assert.equal(late.data.error, 'stale');
    assert.equal(late.data.player.version, 2);
    assert.deepEqual(late.data.player.data, { points: 616, vs: { mina: { w: 1, l: 0, d: 0 } } });

    const renamed = await call(base, 'PUT', `/games/${GAME}/players/${id}`, { code, body: { base: 2, name: 'Sonic3k' } });
    assert.equal(renamed.data.version, 3);
    assert.deepEqual([renamed.data.name, renamed.data.data.points], ['Sonic3k', 616]);

    const list = await call(base, 'GET', `/games/${GAME}/players`, { code });
    assert.equal(list.data.players.length, 1);
    assert.deepEqual(list.data.players[0], renamed.data);
  });

  test('a save says when it was played: never later than now, and always after the version it was made from', async () => {
    const code = await newCode(base);
    const id = uuid();
    const path = `/games/${GAME}/players/${id}`;
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const start = Date.now();
    const made = await call(base, 'PUT', path, { code, body: { base: 0, name: 'Offline', data: { n: 1 }, at: hourAgo } });
    assert.equal(made.data.playedAt, hourAgo, 'played an hour ago and only sent now: both are kept');
    assert.ok(Date.parse(made.data.updatedAt) >= start && Date.parse(made.data.updatedAt) <= Date.now());

    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
    const before = Date.now();
    const ahead = await call(base, 'PUT', path, { code, body: { base: 1, data: { n: 2 }, at: tomorrow } });
    assert.ok(Date.parse(ahead.data.playedAt) >= before && Date.parse(ahead.data.playedAt) <= Date.now(), 'a clock that runs ahead is not believed');

    const behind = await call(base, 'PUT', path, { code, body: { base: 2, data: { n: 3 }, at: hourAgo } });
    assert.equal(behind.status, 200);
    assert.equal(Date.parse(behind.data.playedAt), Date.parse(ahead.data.playedAt) + 1, 'made from the version before it, so played after it');
    assert.ok(Date.parse(behind.data.updatedAt) >= Date.parse(ahead.data.updatedAt));

    const plain = await call(base, 'PUT', path, { code, body: { base: 3, data: { n: 4 } } });
    assert.ok(Date.parse(plain.data.playedAt) > Date.parse(behind.data.playedAt) && Date.parse(plain.data.playedAt) <= Date.now(), 'nothing said: the moment it arrives');

    for (const at of ['yesterday', '2026-11-17', 1731830400000, '2026-11-17T08:50:00+07:00']) {
      const bad = await call(base, 'PUT', path, { code, body: { base: 4, data: { n: 5 }, at } });
      assert.deepEqual([bad.status, bad.data.error], [400, 'invalid'], String(at));
    }
    assert.equal((await call(base, 'GET', `/games/${GAME}/players`, { code })).data.players[0].version, 4);
  });

  test('a new player sent twice is one player', async () => {
    const code = await newCode(base);
    const id = uuid();
    const body = { base: 0, name: 'Twice', data: { points: 600 } };
    assert.equal((await call(base, 'PUT', `/games/${GAME}/players/${id}`, { code, body })).status, 200);
    const again = await call(base, 'PUT', `/games/${GAME}/players/${id}`, { code, body });
    assert.equal(again.status, 409);
    assert.equal(again.data.error, 'stale');
    assert.equal(again.data.player.version, 1);
    assert.equal((await call(base, 'GET', `/games/${GAME}/players`, { code })).data.players.length, 1);
  });

  test('a game keeps three players under one code, oldest first; other games and other codes are apart', async () => {
    const code = await newCode(base);
    const ids = [uuid(), uuid(), uuid(), uuid()];
    for (let i = 0; i < 3; i++) assert.equal((await call(base, 'PUT', `/games/${GAME}/players/${ids[i]}`, { code, body: { base: 0, name: `P${i + 1}`, data: { n: i } } })).status, 200);
    const fourth = await call(base, 'PUT', `/games/${GAME}/players/${ids[3]}`, { code, body: { base: 0, name: 'P4', data: {} } });
    assert.equal(fourth.status, 409);
    assert.deepEqual([fourth.data.error, fourth.data.max], ['full', 3]);
    assert.deepEqual((await call(base, 'GET', `/games/${GAME}/players`, { code })).data.players.map((p: any) => p.name), ['P1', 'P2', 'P3']);

    assert.equal((await call(base, 'PUT', `/games/commander-chess/players/${ids[3]}`, { code, body: { base: 0, name: 'Elsewhere', data: {} } })).status, 200, 'another game has its own three');
    assert.equal((await call(base, 'GET', '/games/commander-chess/players', { code })).data.players.length, 1);

    const other = await newCode(base);
    assert.deepEqual((await call(base, 'GET', `/games/${GAME}/players`, { code: other })).data.players, []);
    const poke = await call(base, 'PUT', `/games/${GAME}/players/${ids[0]}`, { code: other, body: { base: 1, data: { stolen: true } } });
    assert.equal(poke.status, 404, 'someone else’s player is not there to be written');
    const claim = await call(base, 'PUT', `/games/${GAME}/players/${ids[0]}`, { code: other, body: { base: 0, name: 'Mine now', data: {} } });
    assert.equal(claim.status, 409);
    assert.equal(claim.data.error, 'taken');
    assert.equal(claim.data.player, undefined, 'and nothing of it is shown');
    assert.equal((await call(base, 'DELETE', `/games/${GAME}/players/${ids[0]}`, { code: other })).status, 204);
    assert.equal((await call(base, 'GET', `/games/${GAME}/players`, { code })).data.players.length, 3, 'nor removed');
  });

  test('five written at once: three get in, two are told the game is full', async () => {
    const code = await newCode(base);
    const answers = await Promise.all([1, 2, 3, 4, 5].map((n) => call(base, 'PUT', `/games/${GAME}/players/${uuid()}`, { code, body: { base: 0, name: `Racer ${n}`, data: {} } })));
    assert.deepEqual(answers.map((a) => a.status).sort(), [200, 200, 200, 409, 409]);
    assert.equal((await call(base, 'GET', `/games/${GAME}/players`, { code })).data.players.length, 3);
  });

  test('removing a player: gone for good, and removing twice is no error', async () => {
    const code = await newCode(base);
    const id = uuid();
    await call(base, 'PUT', `/games/${GAME}/players/${id}`, { code, body: { base: 0, name: 'Leaving', data: {} } });
    const gone = await call(base, 'DELETE', `/games/${GAME}/players/${id}`, { code });
    assert.equal(gone.status, 204);
    assert.equal(gone.data, null);
    assert.equal((await call(base, 'DELETE', `/games/${GAME}/players/${id}`, { code })).status, 204);
    assert.deepEqual((await call(base, 'GET', `/games/${GAME}/players`, { code })).data.players, []);
    const write = await call(base, 'PUT', `/games/${GAME}/players/${id}`, { code, body: { base: 1, data: { late: true } } });
    assert.equal(write.status, 404);
    assert.equal(write.data.error, 'gone');
  });

  test('what is sent is checked: the game key, the id, the name, the save and its size', async () => {
    const code = await newCode(base);
    const id = uuid();
    const put = (path: string, body: unknown) => call(base, 'PUT', path, { code, body });
    assert.equal((await put(`/games/Not_A_Key/players/${id}`, { base: 0, name: 'A', data: {} })).status, 400);
    assert.equal((await put(`/games/${GAME}/players/not-a-uuid`, { base: 0, name: 'A', data: {} })).status, 400);
    for (const body of [{ base: 0, name: '   ', data: {} }, { base: 0, name: 'x'.repeat(25), data: {} }, { base: 0, data: {} }, { base: 0, name: 'A' }, { base: 0, name: 'A', data: [] }, { base: 0, name: 'A', data: 'text' }, { base: -1, name: 'A', data: {} }, { base: 1.5, name: 'A', data: {} }, { base: 1 }, { name: 'A', data: {} }]) {
      const r = await put(`/games/${GAME}/players/${id}`, body);
      assert.equal(r.status, 400, JSON.stringify(body));
      assert.equal(r.data.error, 'invalid');
    }
    assert.equal((await put(`/games/${GAME}/players/${id}`, '{"base": 0, "name": ')).status, 400, 'broken JSON');
    const tidy = await put(`/games/${GAME}/players/${id}`, { base: 0, name: '  Ngọc\t\n  Anh ​', data: {} });
    assert.equal(tidy.status, 200);
    assert.equal(tidy.data.name, 'Ngọc Anh');
    const fits = await put(`/games/${GAME}/players/${id}`, { base: 1, data: { moves: 'x'.repeat(60 * 1024) } });
    assert.equal(fits.status, 200);
    const big = await put(`/games/${GAME}/players/${id}`, { base: 2, data: { moves: 'x'.repeat(64 * 1024) } });
    assert.equal(big.status, 413);
    assert.equal(big.data.error, 'too_big');
    assert.equal((await put(`/games/${GAME}/players/${id}`, { base: 2, data: { moves: 'x'.repeat(400 * 1024) } })).status, 413, 'far too big is stopped before it is read');
    assert.equal((await call(base, 'GET', `/games/${GAME}/players`, { code })).data.players[0].version, 2);
  });

  test('any page may call it, nothing it answers is kept in a cache, and its clock can be read', async () => {
    const pre = await fetch(`${base}/api/games/${GAME}/players/${uuid()}`, { method: 'OPTIONS', headers: { origin: 'https://keepitdown-game-production.up.railway.app', 'access-control-request-method': 'PUT', 'access-control-request-headers': 'authorization,content-type' } });
    assert.equal(pre.status, 204);
    assert.equal(pre.headers.get('access-control-allow-origin'), 'https://keepitdown-game-production.up.railway.app');
    assert.match(pre.headers.get('access-control-allow-methods') ?? '', /PUT/);
    assert.match((pre.headers.get('access-control-allow-headers') ?? '').toLowerCase(), /authorization/);
    assert.equal(pre.headers.get('access-control-max-age'), '86400');
    const code = await newCode(base);
    const got = await call(base, 'GET', `/games/${GAME}/players`, { code, headers: { origin: 'https://sonic-commander-chess.example' } });
    assert.equal(got.headers.get('access-control-allow-origin'), 'https://sonic-commander-chess.example');
    assert.match(got.headers.get('access-control-expose-headers') ?? '', /X-Now/);
    assert.ok(Math.abs(Number(got.headers.get('x-now')) - Date.now()) < 5000);
    assert.equal(got.headers.get('cache-control'), 'no-store');
    assert.equal((await call(base, 'POST', '/codes')).headers.get('cache-control'), 'no-store');
    assert.equal(got.headers.get('x-powered-by'), null, 'what it is built with is nobody’s business');
  });

  test('a code in use is noted as seen, at most once a day', async () => {
    const code = await newCode(base);
    await call(base, 'GET', `/games/${GAME}/players`, { code });
    const [{ id, seen_at: first }] = await q<{ id: string; seen_at: Date }>('select id, seen_at from holder order by created_at desc limit 1');
    await call(base, 'GET', `/games/${GAME}/players`, { code });
    assert.equal((await q<{ seen_at: Date }>('select seen_at from holder where id = $1', [id]))[0]!.seen_at.getTime(), first.getTime(), 'not written again the same day');
    await q("update holder set seen_at = now() - interval '3 days' where id = $1", [id]);
    await call(base, 'GET', `/games/${GAME}/players`, { code });
    await new Promise((r) => setTimeout(r, 150));
    assert.ok(Date.now() - (await q<{ seen_at: Date }>('select seen_at from holder where id = $1', [id]))[0]!.seen_at.getTime() < 60_000);
  });

  test('removing a holder takes their players with it', async () => {
    const code = await newCode(base);
    const id = uuid();
    await call(base, 'PUT', `/games/${GAME}/players/${id}`, { code, body: { base: 0, name: 'Tied', data: {} } });
    const [{ holder_id: holderId }] = await q<{ holder_id: string }>('select holder_id from player where id = $1', [id]);
    await q('delete from holder where id = $1', [holderId]);
    assert.deepEqual(await q('select 1 from player where id = $1', [id]), []);
    assert.equal((await call(base, 'GET', `/games/${GAME}/players`, { code })).status, 401);
  });

  test('an address that keeps sending wrong codes is told to wait, even with a right one', async () => {
    const strict = await start({ wrongCodesPerHour: 3 });
    const code = await newCode(strict);
    for (let i = 0; i < 3; i++) assert.equal((await call(strict, 'GET', `/games/${GAME}/players`, { code: '2222-2222-2222' })).status, 401);
    const stopped = await call(strict, 'GET', `/games/${GAME}/players`, { code: '2222-2222-2223' });
    assert.equal(stopped.status, 429);
    assert.equal(stopped.data.error, 'slow_down');
    assert.ok(Number(stopped.headers.get('retry-after')) > 0 && stopped.data.retryAfter > 0);
    assert.equal((await call(strict, 'GET', `/games/${GAME}/players`, { code })).status, 429);
  });

  test('new codes and requests are counted by address too', async () => {
    const few = await start({ newCodesPerHour: 2 });
    assert.equal((await call(few, 'POST', '/codes')).status, 201);
    assert.equal((await call(few, 'POST', '/codes')).status, 201);
    const third = await call(few, 'POST', '/codes');
    assert.equal(third.status, 429);
    assert.ok(Number(third.headers.get('retry-after')) > 0);
    const busy = await start({ requestsPerMinute: 5 });
    const statuses = [];
    for (let i = 0; i < 7; i++) statuses.push((await call(busy, 'GET', '/health')).status);
    assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429, 429]);
  });

  test('a code keeps players in so many games and no more', async () => {
    const tight = await start({ gamesPerCode: 2 });
    const code = await newCode(tight);
    for (const game of ['one', 'two']) assert.equal((await call(tight, 'PUT', `/games/${game}/players/${uuid()}`, { code, body: { base: 0, name: 'A', data: {} } })).status, 200);
    const third = await call(tight, 'PUT', `/games/three/players/${uuid()}`, { code, body: { base: 0, name: 'A', data: {} } });
    assert.equal(third.status, 409);
    assert.equal(third.data.error, 'full');
    assert.deepEqual([third.data.max, third.data.games], [undefined, 2], 'not to be read as the number of players a game keeps');
    assert.equal((await call(tight, 'PUT', `/games/one/players/${uuid()}`, { code, body: { base: 0, name: 'B', data: {} } })).status, 200, 'a game already begun still takes players');
  });
});
