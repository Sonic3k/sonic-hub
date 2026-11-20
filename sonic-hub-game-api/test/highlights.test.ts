import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';
import pg from 'pg';
import { defaultLimits, defaultMedia, loadAppConfig, type AppConfig, type Limits } from '../src/config.js';
import { createApp } from '../src/main.js';

/*
 * The games picked out on the shelf, end to end: which they are and since when, as the shelf's page for it reads and
 * changes them. Nobody signs in. Needs TEST_DATABASE_URL pointing at a Postgres server (any database; a scratch one
 * is created).
 */

const adminUrl = process.env.TEST_DATABASE_URL;
const dbName = `game_highlights_${process.pid}`;
let dbUrl = '';
let sqlPool: pg.Pool;
const running: Array<() => Promise<void>> = [];

/** An app of its own on the scratch database, with whatever limits the test needs. */
async function start(limits: Partial<Limits> = {}): Promise<string> {
  const config: AppConfig = { database: { url: dbUrl, adminUrl: null, name: dbName, user: '', password: null, ssl: false }, port: 0, corsOrigins: true, addressHeader: null, media: defaultMedia, limits: { ...defaultLimits, ...limits } };
  const app = await createApp(config);
  await app.listen(0, '127.0.0.1');
  running.push(() => app.close());
  return `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
}

interface Answer<T> { status: number; data: T; headers: Headers }
async function call<T = any>(base: string, method: string, path: string, headers: Record<string, string> = {}): Promise<Answer<T>> {
  const res = await fetch(`${base}/api${path}`, { method, headers });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data: data as T, headers: res.headers };
}
const picked = async (base: string) => ((await call(base, 'GET', '/highlights')).data.highlights as Array<{ game: string; since: string }>).map((h) => h.game);
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('the games picked out on the shelf', { skip: !adminUrl && 'TEST_DATABASE_URL not set' }, () => {
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

  test('nothing is picked out to begin with, and the answer says how many can be', async () => {
    const r = await call(base, 'GET', '/highlights');
    assert.equal(r.status, 200);
    assert.deepEqual(r.data, { max: defaultLimits.highlights, highlights: [] });
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.ok(Number(r.headers.get('x-now')) > 0);
  });

  test('a game is picked out, and the one picked last comes first', async () => {
    const first = await call(base, 'PUT', '/games/muop/highlight');
    assert.equal(first.status, 200);
    assert.equal(first.data.game, 'muop');
    assert.ok(Math.abs(Date.parse(first.data.since) - Date.now()) < 60_000, 'picked now');
    await pause(15);
    assert.equal((await call(base, 'PUT', '/games/len-doi/highlight')).status, 200);
    await pause(15);
    assert.equal((await call(base, 'PUT', '/games/medieval-mayhem-2/highlight')).status, 200);
    assert.deepEqual(await picked(base), ['medieval-mayhem-2', 'len-doi', 'muop']);
    assert.deepEqual((await sqlPool.query('select game from highlight order by created_at')).rows.map((r) => r.game), ['muop', 'len-doi', 'medieval-mayhem-2']);
  });

  test('picking one that is picked out already changes nothing: it keeps its moment and its place', async () => {
    const was = (await call(base, 'GET', '/highlights')).data.highlights.find((h: { game: string }) => h.game === 'muop');
    await pause(15);
    const again = await call(base, 'PUT', '/games/muop/highlight');
    assert.equal(again.status, 200);
    assert.deepEqual(again.data, was);
    assert.deepEqual(await picked(base), ['medieval-mayhem-2', 'len-doi', 'muop']);
  });

  test('a game is dropped; dropping one that is not picked out is no error; picked anew it comes to the front', async () => {
    const gone = await call(base, 'DELETE', '/games/len-doi/highlight');
    assert.deepEqual([gone.status, gone.data], [204, null]);
    assert.deepEqual(await picked(base), ['medieval-mayhem-2', 'muop']);
    assert.equal((await call(base, 'DELETE', '/games/len-doi/highlight')).status, 204);
    assert.equal((await call(base, 'DELETE', '/games/never-picked/highlight')).status, 204);
    await pause(15);
    await call(base, 'DELETE', '/games/muop/highlight');
    await call(base, 'PUT', '/games/muop/highlight');
    assert.deepEqual(await picked(base), ['muop', 'medieval-mayhem-2']);
  });

  test('what is not a game key is turned away, and nothing is kept', async () => {
    for (const bad of ['Muop', 'a_b', '-x', 'x-', 'a'.repeat(65), 'tim%204']) {
      const r = await call(base, 'PUT', `/games/${bad}/highlight`);
      assert.deepEqual([r.status, r.data.error], [400, 'invalid'], bad);
      assert.equal((await call(base, 'DELETE', `/games/${bad}/highlight`)).status, 400, bad);
    }
    assert.deepEqual(await picked(base), ['muop', 'medieval-mayhem-2']);
  });

  test('no more are picked out than the shelf allows; one already picked out is still answered', async () => {
    const small = await start({ highlights: 3 });
    assert.equal((await call(small, 'GET', '/highlights')).data.max, 3);
    assert.equal((await call(small, 'PUT', '/games/tim-4/highlight')).status, 200);   // the third
    const over = await call(small, 'PUT', '/games/caro/highlight');
    assert.deepEqual([over.status, over.data.error, over.data.max], [409, 'full', 3]);
    assert.equal((await call(small, 'PUT', '/games/muop/highlight')).status, 200);
    assert.deepEqual(await picked(small), ['tim-4', 'muop', 'medieval-mayhem-2']);
    // room is made by dropping one
    await call(small, 'DELETE', '/games/tim-4/highlight');
    assert.equal((await call(small, 'PUT', '/games/caro/highlight')).status, 200);
    await call(small, 'DELETE', '/games/caro/highlight');
  });

  test('picked from many places at once, a game is picked out once and the count holds', async () => {
    const small = await start({ highlights: 4 });   // two are picked out already
    const keys = ['xiangqi', 'xiangqi', 'xiangqi', 'penned-in', 'penned-in', 'saltline', 'wax-and-wane', 'keep-it-down'];
    const answers = await Promise.all(keys.map((k) => call(small, 'PUT', `/games/${k}/highlight`)));
    const list = await picked(small);
    assert.equal(list.length, 4);
    assert.equal(new Set(list).size, 4);
    assert.equal((await sqlPool.query('select count(*)::int as n from highlight')).rows[0].n, 4);
    for (const [i, a] of answers.entries()) assert.equal(a.status, list.includes(keys[i]!) ? 200 : 409, keys[i]);
    for (const k of list) if (!['muop', 'medieval-mayhem-2'].includes(k)) await call(small, 'DELETE', `/games/${k}/highlight`);
  });

  test('a page at another address may read and change them', async () => {
    const origin = 'https://sonic-hub-game-production.up.railway.app';
    const read = await call(base, 'GET', '/highlights', { origin });
    assert.equal(read.headers.get('access-control-allow-origin'), origin);
    const ask = await call(base, 'OPTIONS', '/games/muop/highlight', { origin, 'access-control-request-method': 'PUT' });
    assert.equal(ask.status, 204);
    assert.match(ask.headers.get('access-control-allow-methods') ?? '', /PUT/);
    assert.match(ask.headers.get('access-control-allow-methods') ?? '', /DELETE/);
  });

  test('HIGHLIGHTS says how many, and has to be a whole number above zero', () => {
    const env = { DATABASE_URL: 'postgresql://x/y' };
    assert.equal(loadAppConfig(env).limits.highlights, defaultLimits.highlights);
    assert.equal(loadAppConfig({ ...env, HIGHLIGHTS: '40' }).limits.highlights, 40);
    assert.throws(() => loadAppConfig({ ...env, HIGHLIGHTS: '0' }), /HIGHLIGHTS/);
    assert.throws(() => loadAppConfig({ ...env, HIGHLIGHTS: 'many' }), /HIGHLIGHTS/);
  });
});
