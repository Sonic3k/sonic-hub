import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';
import pg from 'pg';
import { countedAs } from '../src/common/guards.js';
import { defaultLimits, loadAppConfig, type AppConfig, type Limits } from '../src/config.js';
import { createApp } from '../src/main.js';

/*
 * End to end: the HTTP API on a fresh database.
 * Needs TEST_DATABASE_URL pointing at a Postgres server (any database; a scratch one is created).
 */

const adminUrl = process.env.TEST_DATABASE_URL;
const dbName = `game_e2e_${process.pid}`;
let dbUrl = '';
let sqlPool: pg.Pool;
const running: Array<() => Promise<void>> = [];

/** An app of its own on the scratch database, with whatever limits the test needs. */
async function start(limits: Partial<Limits> = {}, addressHeader: string | null = null): Promise<string> {
  const config: AppConfig = { database: { url: dbUrl, adminUrl: null, name: dbName, user: '', password: null, ssl: false }, port: 0, corsOrigins: true, addressHeader, limits: { ...defaultLimits, ...limits } };
  const app = await createApp(config);
  await app.listen(0, '127.0.0.1');
  running.push(() => app.close());
  return `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
}

interface Answer<T> { status: number; data: T; headers: Headers }
async function call<T = any>(base: string, method: string, path: string, opts: { body?: unknown; headers?: Record<string, string> } = {}): Promise<Answer<T>> {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: { ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}), ...opts.headers },
    body: opts.body === undefined ? undefined : typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body),
  });
  const text = await res.text();
  let data: unknown = text;
  try { data = text ? JSON.parse(text) : null; } catch { /* not JSON: the text itself */ }
  return { status: res.status, data: data as T, headers: res.headers };
}
const uuid = () => crypto.randomUUID();
/** A game of its own for a test: players are the game's, so tests that shared one would trip over each other. */
let games = 0;
const aGame = (what: string) => `t${++games}-${what}`;
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
    base = await start({ games: 1000 });   // every test here has a game of its own
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

  test('a game’s players are the game’s own: the same list for whoever asks, with nothing to show for it', async () => {
    const game = aGame('own');
    const empty = await call(base, 'GET', `/games/${game}/players`);
    assert.equal(empty.status, 200);
    assert.deepEqual([empty.data.max, empty.data.players], [3, []]);
    assert.match(empty.data.epoch, /^[0-9a-f-]{36}$/);
    const id = uuid();
    assert.equal((await call(base, 'PUT', `/games/${game}/players/${id}`, { body: { base: 0, name: 'Sonic', data: { points: 600 } } })).status, 200);
    // asked from somewhere else altogether, with whatever headers: the same player is there
    const askers: Array<Record<string, string>> = [{}, { authorization: 'Bearer K7QM-2XPD-9RBT' }, { origin: 'https://elsewhere.example', 'user-agent': 'another device' }];
    for (const headers of askers) {
      const seen = await call(base, 'GET', `/games/${game}/players`, { headers });
      assert.deepEqual(seen.data.players.map((p: any) => [p.id, p.name, p.data]), [[id, 'Sonic', { points: 600 }]]);
      assert.equal(seen.data.epoch, empty.data.epoch, 'and it is the same database that answers');
    }
    assert.deepEqual((await call(base, 'GET', `/games/${aGame('other')}/players`)).data.players, [], 'another game has players of its own');
    assert.equal((await call(await start({ games: 1000 }), 'GET', `/games/${game}/players`)).data.epoch, empty.data.epoch, 'the service started again is still the same database');
  });

  test('a player is written with the version it was made from; an older one is refused and told how things stand', async () => {
    const game = aGame('versions'), id = uuid(), path = `/games/${game}/players/${id}`;
    const made = await call(base, 'PUT', path, { body: { base: 0, name: 'Sonic', data: { points: 600, vs: {} } } });
    assert.equal(made.status, 200);
    assert.equal(made.data.version, 1);
    assert.deepEqual({ id: made.data.id, name: made.data.name, data: made.data.data }, { id, name: 'Sonic', data: { points: 600, vs: {} } });
    assert.ok(!Number.isNaN(Date.parse(made.data.createdAt)) && !Number.isNaN(Date.parse(made.data.updatedAt)));

    const next = await call(base, 'PUT', path, { body: { base: 1, data: { points: 616, vs: { mina: { w: 1, l: 0, d: 0 } } } } });
    assert.equal(next.status, 200);
    assert.equal(next.data.version, 2);
    assert.equal(next.data.name, 'Sonic', 'what is not sent stays');
    assert.ok(Date.parse(next.data.updatedAt) >= Date.parse(made.data.updatedAt));

    const late = await call(base, 'PUT', path, { body: { base: 1, data: { points: 584 } } });
    assert.equal(late.status, 409);
    assert.equal(late.data.error, 'stale');
    assert.equal(late.data.player.version, 2);
    assert.deepEqual(late.data.player.data, { points: 616, vs: { mina: { w: 1, l: 0, d: 0 } } });

    const renamed = await call(base, 'PUT', path, { body: { base: 2, name: 'Sonic3k' } });
    assert.equal(renamed.data.version, 3);
    assert.deepEqual([renamed.data.name, renamed.data.data.points], ['Sonic3k', 616]);

    const list = await call(base, 'GET', `/games/${game}/players`);
    assert.equal(list.data.players.length, 1);
    assert.deepEqual(list.data.players[0], renamed.data);
  });

  test('a save says when it was played: never later than now, and always after the version it was made from', async () => {
    const game = aGame('played'), path = `/games/${game}/players/${uuid()}`;
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const start = Date.now();
    const made = await call(base, 'PUT', path, { body: { base: 0, name: 'Offline', data: { n: 1 }, at: hourAgo } });
    assert.equal(made.data.playedAt, hourAgo, 'played an hour ago and only sent now: both are kept');
    assert.ok(Date.parse(made.data.updatedAt) >= start && Date.parse(made.data.updatedAt) <= Date.now());

    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
    const before = Date.now();
    const ahead = await call(base, 'PUT', path, { body: { base: 1, data: { n: 2 }, at: tomorrow } });
    assert.ok(Date.parse(ahead.data.playedAt) >= before && Date.parse(ahead.data.playedAt) <= Date.now(), 'a clock that runs ahead is not believed');

    const behind = await call(base, 'PUT', path, { body: { base: 2, data: { n: 3 }, at: hourAgo } });
    assert.equal(behind.status, 200);
    assert.equal(Date.parse(behind.data.playedAt), Date.parse(ahead.data.playedAt) + 1, 'made from the version before it, so played after it');
    assert.ok(Date.parse(behind.data.updatedAt) >= Date.parse(ahead.data.updatedAt));

    const plain = await call(base, 'PUT', path, { body: { base: 3, data: { n: 4 } } });
    assert.ok(Date.parse(plain.data.playedAt) > Date.parse(behind.data.playedAt) && Date.parse(plain.data.playedAt) <= Date.now(), 'nothing said: the moment it arrives');

    for (const at of ['yesterday', '2026-11-17', 1731830400000, '2026-11-17T08:50:00+07:00']) {
      const bad = await call(base, 'PUT', path, { body: { base: 4, data: { n: 5 }, at } });
      assert.deepEqual([bad.status, bad.data.error], [400, 'invalid'], String(at));
    }
    assert.equal((await call(base, 'GET', `/games/${game}/players`)).data.players[0].version, 4);
  });

  test('a new player sent twice is one player', async () => {
    const game = aGame('twice'), path = `/games/${game}/players/${uuid()}`;
    const body = { base: 0, name: 'Twice', data: { points: 600 } };
    assert.equal((await call(base, 'PUT', path, { body })).status, 200);
    const again = await call(base, 'PUT', path, { body });
    assert.equal(again.status, 409);
    assert.equal(again.data.error, 'stale');
    assert.equal(again.data.player.version, 1);
    assert.equal((await call(base, 'GET', `/games/${game}/players`)).data.players.length, 1);
  });

  test('a game keeps three players, oldest first, and another game its own three', async () => {
    const game = aGame('three'), other = aGame('three-more');
    const ids = [uuid(), uuid(), uuid(), uuid()];
    for (let i = 0; i < 3; i++) assert.equal((await call(base, 'PUT', `/games/${game}/players/${ids[i]}`, { body: { base: 0, name: `P${i + 1}`, data: { n: i } } })).status, 200);
    const fourth = await call(base, 'PUT', `/games/${game}/players/${ids[3]}`, { body: { base: 0, name: 'P4', data: {} } });
    assert.equal(fourth.status, 409);
    assert.deepEqual([fourth.data.error, fourth.data.max], ['full', 3]);
    assert.deepEqual((await call(base, 'GET', `/games/${game}/players`)).data.players.map((p: any) => p.name), ['P1', 'P2', 'P3']);

    assert.equal((await call(base, 'PUT', `/games/${other}/players/${ids[3]}`, { body: { base: 0, name: 'Elsewhere', data: {} } })).status, 200);
    assert.equal((await call(base, 'GET', `/games/${other}/players`)).data.players.length, 1);

    // a player is a player of one game: its id means nothing in another
    const poke = await call(base, 'PUT', `/games/${other}/players/${ids[0]}`, { body: { base: 1, data: { moved: true } } });
    assert.equal(poke.status, 404);
    const claim = await call(base, 'PUT', `/games/${other}/players/${ids[0]}`, { body: { base: 0, name: 'Here too', data: {} } });
    assert.deepEqual([claim.status, claim.data.error, claim.data.player], [409, 'taken', undefined]);
    assert.equal((await call(base, 'DELETE', `/games/${other}/players/${ids[0]}`)).status, 204);
    assert.equal((await call(base, 'GET', `/games/${game}/players`)).data.players.length, 3, 'and it is not removed by way of another');
  });

  test('five written at once: three get in, two are told the game is full', async () => {
    const game = aGame('race');
    const answers = await Promise.all([1, 2, 3, 4, 5].map((n) => call(base, 'PUT', `/games/${game}/players/${uuid()}`, { body: { base: 0, name: `Racer ${n}`, data: {} } })));
    assert.deepEqual(answers.map((a) => a.status).sort(), [200, 200, 200, 409, 409]);
    assert.equal((await call(base, 'GET', `/games/${game}/players`)).data.players.length, 3);
  });

  test('removing a player: gone for good, and removing twice is no error', async () => {
    const game = aGame('leaving'), path = `/games/${game}/players/${uuid()}`;
    await call(base, 'PUT', path, { body: { base: 0, name: 'Leaving', data: {} } });
    const gone = await call(base, 'DELETE', path);
    assert.equal(gone.status, 204);
    assert.equal(gone.data, null);
    assert.equal((await call(base, 'DELETE', path)).status, 204);
    const list = (await call(base, 'GET', `/games/${game}/players`)).data;
    assert.deepEqual(list.players, []);
    const write = await call(base, 'PUT', path, { body: { base: 1, data: { late: true } } });
    assert.equal(write.status, 404);
    assert.deepEqual([write.data.error, write.data.epoch], ['gone', list.epoch], 'and it says which database it is that has no such player');
  });

  test('what is sent is checked: the game key, the id, the name, the save and its size', async () => {
    const game = aGame('checked'), id = uuid();
    const put = (path: string, body: unknown) => call(base, 'PUT', path, { body });
    assert.equal((await put(`/games/Not_A_Key/players/${id}`, { base: 0, name: 'A', data: {} })).status, 400);
    assert.equal((await call(base, 'GET', '/games/Not_A_Key/players')).status, 400);
    assert.equal((await put(`/games/${game}/players/not-a-uuid`, { base: 0, name: 'A', data: {} })).status, 400);
    for (const body of [{ base: 0, name: '   ', data: {} }, { base: 0, name: 'x'.repeat(25), data: {} }, { base: 0, data: {} }, { base: 0, name: 'A' }, { base: 0, name: 'A', data: [] }, { base: 0, name: 'A', data: 'text' }, { base: -1, name: 'A', data: {} }, { base: 1.5, name: 'A', data: {} }, { base: 1 }, { name: 'A', data: {} }]) {
      const r = await put(`/games/${game}/players/${id}`, body);
      assert.equal(r.status, 400, JSON.stringify(body));
      assert.equal(r.data.error, 'invalid');
    }
    assert.equal((await put(`/games/${game}/players/${id}`, '{"base": 0, "name": ')).status, 400, 'broken JSON');
    const tidy = await put(`/games/${game}/players/${id}`, { base: 0, name: '  Ngọc\t\n  Anh ​', data: {} });
    assert.equal(tidy.status, 200);
    assert.equal(tidy.data.name, 'Ngọc Anh');
    const fits = await put(`/games/${game}/players/${id}`, { base: 1, data: { moves: 'x'.repeat(60 * 1024) } });
    assert.equal(fits.status, 200);
    const big = await put(`/games/${game}/players/${id}`, { base: 2, data: { moves: 'x'.repeat(64 * 1024) } });
    assert.equal(big.status, 413);
    assert.equal(big.data.error, 'too_big');
    assert.equal((await put(`/games/${game}/players/${id}`, { base: 2, data: { moves: 'x'.repeat(400 * 1024) } })).status, 413, 'far too big is stopped before it is read');
    assert.equal((await call(base, 'GET', `/games/${game}/players`)).data.players[0].version, 2);
  });

  test('any page may call it, nothing it answers is kept in a cache, and its clock can be read', async () => {
    const game = aGame('pages');
    const pre = await fetch(`${base}/api/games/${game}/players/${uuid()}`, { method: 'OPTIONS', headers: { origin: 'https://keepitdown-game-production.up.railway.app', 'access-control-request-method': 'PUT', 'access-control-request-headers': 'content-type' } });
    assert.equal(pre.status, 204);
    assert.equal(pre.headers.get('access-control-allow-origin'), 'https://keepitdown-game-production.up.railway.app');
    assert.match(pre.headers.get('access-control-allow-methods') ?? '', /PUT/);
    assert.match((pre.headers.get('access-control-allow-headers') ?? '').toLowerCase(), /content-type/);
    assert.equal(pre.headers.get('access-control-max-age'), '86400');
    const got = await call(base, 'GET', `/games/${game}/players`, { headers: { origin: 'https://sonic-commander-chess.example' } });
    assert.equal(got.headers.get('access-control-allow-origin'), 'https://sonic-commander-chess.example');
    assert.match(got.headers.get('access-control-expose-headers') ?? '', /X-Now/);
    assert.ok(Math.abs(Number(got.headers.get('x-now')) - Date.now()) < 5000);
    assert.equal(got.headers.get('cache-control'), 'no-store');
    assert.equal(got.headers.get('x-powered-by'), null, 'what it is built with is nobody’s business');
  });

  test('players are kept for so many games and no more', async () => {
    const tight = await start({ games: (await q<{ n: number }>('select count(distinct game)::int as n from player'))[0]!.n + 2 });
    const [one, two, three] = [aGame('cap'), aGame('cap'), aGame('cap')];
    for (const game of [one, two]) assert.equal((await call(tight, 'PUT', `/games/${game}/players/${uuid()}`, { body: { base: 0, name: 'A', data: {} } })).status, 200);
    const third = await call(tight, 'PUT', `/games/${three}/players/${uuid()}`, { body: { base: 0, name: 'A', data: {} } });
    assert.equal(third.status, 409);
    assert.equal(third.data.error, 'full');
    assert.equal(third.data.max, undefined, 'not to be read as the number of players a game keeps');
    assert.equal((await call(tight, 'PUT', `/games/${one}/players/${uuid()}`, { body: { base: 0, name: 'B', data: {} } })).status, 200, 'a game already begun still takes players');
    assert.deepEqual((await call(tight, 'GET', `/games/${three}/players`)).data.players, [], 'and a game with none can still be asked about');
  });

  test('requests are counted by address', async () => {
    const busy = await start({ requestsPerMinute: 5 });
    const statuses = [];
    for (let i = 0; i < 7; i++) statuses.push((await call(busy, 'GET', '/health')).status);
    assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429, 429]);
    const stopped = await call(busy, 'GET', '/health');
    assert.equal(stopped.data.error, 'slow_down');
    assert.ok(Number(stopped.headers.get('retry-after')) > 0 && stopped.data.retryAfter > 0);
  });

  test('behind a proxy that names the caller, each caller has a count of their own', async () => {
    const edge = await start({ requestsPerMinute: 3 }, 'x-real-ip');
    const as = (ip: string | undefined, more: Record<string, string> = {}) => call(edge, 'GET', '/health', { headers: { ...(ip === undefined ? {} : { 'x-real-ip': ip }), ...more } });
    for (let i = 0; i < 3; i++) assert.equal((await as('203.0.113.7')).status, 200);
    const stopped = await as('203.0.113.7');
    assert.deepEqual([stopped.status, stopped.data.error, stopped.data.address], [429, 'slow_down', '203.0.113.7']);
    assert.match(stopped.data.message, /203\.0\.113\.7/);
    assert.equal((await as('203.0.113.8')).status, 200, 'someone else is not held up by it');
    assert.equal((await as('203.0.113.7', { 'x-forwarded-for': '198.51.100.1' })).status, 429, 'and another header does not get the first one out of it');

    // an IPv6 caller is counted by network: a new address within it is still the same caller
    for (const ip of ['2001:db8:1:2::1', '2001:0DB8:0001:0002:aaaa:bbbb:cccc:dddd', '2001:db8:1:2:ffff::']) assert.equal((await as(ip)).status, 200, ip);
    const six = await as('2001:db8:1:2:1234::9');
    assert.deepEqual([six.status, six.data.address], [429, '2001:db8:1:2::/64']);
    assert.equal((await as('2001:db8:1:3::1')).status, 200, 'the network next door is someone else');

    // what holds no address is not believed: such callers are counted by where they connect from
    for (const said of ['hello', '', '999.1.1.1', '<script>']) assert.equal((await as(said)).status, said === '<script>' ? 429 : 200, said);
    assert.match((await as(undefined)).data.address, /^(127\.0\.0\.1|::1.*|0:0:0:0::\/64)$/);
  });

  test('where no proxy names the caller, a header that claims to is not believed', async () => {
    const bare = await start({ requestsPerMinute: 3 });
    const statuses = [];
    for (let i = 0; i < 5; i++) statuses.push((await call(bare, 'GET', '/health', { headers: { 'x-real-ip': `203.0.113.${i}` } })).status);
    assert.deepEqual(statuses, [200, 200, 200, 429, 429]);
  });

  test('what a caller is counted by, and where the header to read comes from', () => {
    const cases: Array<[string, string]> = [
      ['203.0.113.7', '203.0.113.7'], ['::ffff:203.0.113.7', '203.0.113.7'], ['::FFFF:10.0.0.1', '10.0.0.1'],
      ['2001:db8:1:2:3:4:5:6', '2001:db8:1:2::/64'], ['2001:db8::1', '2001:db8:0:0::/64'], ['::1', '0:0:0:0::/64'], ['fe80::1%eth0', 'fe80:0:0:0::/64'],
      ['2001:db8:1:2::', '2001:db8:1:2::/64'], ['::2001:db8:1:2:3', '0:0:0:2001::/64'], ['64:ff9b::192.0.2.33', '64:ff9b:0:0::/64'], ['1:2:3:4:5:6:192.0.2.33', '1:2:3:4::/64'],
      ['unknown', 'unknown'],
    ];
    for (const [ip, want] of cases) assert.equal(countedAs(ip), want, ip);
    const header = (env: Record<string, string>) => loadAppConfig({ DATABASE_URL: 'postgresql://x/y', ...env }).addressHeader;
    assert.equal(header({}), null);
    assert.equal(header({ RAILWAY_ENVIRONMENT_ID: 'abc' }), 'x-real-ip', 'on Railway it is the edge’s own header');
    assert.equal(header({ RAILWAY_ENVIRONMENT_ID: 'abc', ADDRESS_HEADER: 'none' }), null);
    assert.equal(header({ ADDRESS_HEADER: 'CF-Connecting-IP' }), 'cf-connecting-ip');
    assert.throws(() => header({ ADDRESS_HEADER: 'x real ip' }), /ADDRESS_HEADER/);
  });
});
