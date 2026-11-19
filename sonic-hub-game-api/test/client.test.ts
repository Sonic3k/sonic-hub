import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';
import pg from 'pg';
import { defaultLimits, type AppConfig } from '../src/config.js';
import { createApp } from '../src/main.js';

/*
 * The browser client (client/sonic-save.js) against the real API: several "devices", each with its own storage and
 * its own line to the service, which a test can cut, hold up or answer in the service's place; and browsers with
 * several tabs, which share one storage.
 * Needs TEST_DATABASE_URL pointing at a Postgres server (any database; a scratch one is created).
 */

const adminUrl = process.env.TEST_DATABASE_URL;
const dbName = `game_client_${process.pid}`;
const mirrorOf = (game: string) => `sonic-save.${game}`;
/** A game of its own for a test: players are the game's, so tests that shared one would trip over each other. */
let games = 0;
const aGame = (what: string) => `c${++games}-${what}`;

/** dist-test/test/ → client/ */
const source = readFileSync(new URL('../../client/sonic-save.js', import.meta.url), 'utf8');
const SonicSave = new Function(`${source}\nreturn SonicSave;`)() as (opt: Record<string, unknown>) => any;

/** The client's timers, made so that one still waiting (a retry a minute away) does not keep the test run from ending. */
const timers = {
  setTimeout: (f: () => void, ms: number) => {
    const t = setTimeout(f, ms);
    t.unref();
    return t;
  },
  clearTimeout: (t: NodeJS.Timeout) => clearTimeout(t),
};

/** One browser's storage, which its tabs share: what one tab writes, the others are told of a moment later, as browsers do. */
class Browser {
  readonly map = new Map<string, string>();
  private readonly tabs: Array<{ tab: object; tell: (key: string) => void }> = [];
  open(tab: object, tell: (key: string) => void) {
    this.tabs.push({ tab, tell });
    const told = (key: string) => this.tabs.forEach((t) => t.tab !== tab && setImmediate(() => t.tell(key)));
    return {
      getItem: (k: string) => this.map.get(k) ?? null,
      setItem: (k: string, v: string) => { if (this.map.get(k) === v) return; this.map.set(k, v); told(k); },
      removeItem: (k: string) => { if (this.map.delete(k)) told(k); },
    };
  }
}
/** Something to hold a request up with: it waits until open() is called. */
function gate() {
  let open!: () => void;
  const wait = new Promise<void>((resolve) => (open = resolve));
  return { wait, open };
}

interface Device {
  save: any;
  storage: Map<string, string>;
  /**
   * down: nothing gets through. losePuts: so many writes reach the service but their answers never come back.
   * slow: the next request that matches is held up, before it sets out or with its answer on the way back.
   * fake: what stands at the address answers instead of the service. arrived: the requests the service has answered.
   * moved: the service was started again, and this is where the one that now answers at the page's address is.
   */
  net: { down: boolean; losePuts: number; calls: string[]; keepalive: boolean[]; arrived: string[]; slow: Array<{ match: RegExp; before?: Promise<void>; after?: Promise<void> }>; fake: null | (() => Response); moved: string | null };
  events: string[];
  fire(type: string, event?: unknown): void;
}

function device(base: string, game: string, o: { storage?: Map<string, string>; browser?: Browser; down?: boolean } = {}): Device {
  const net: Device['net'] = { down: !!o.down, losePuts: 0, calls: [], keepalive: [], arrived: [], slow: [], fake: null, moved: null };
  const listeners: Record<string, Array<(e: unknown) => void>> = {};
  const fire = (type: string, event: unknown = {}) => (listeners[type] ?? []).forEach((f) => f(event));
  const events: string[] = [];
  const storage = o.browser ? o.browser.map : (o.storage ?? new Map<string, string>());
  const env = {
    ...timers,
    storage: o.browser ? o.browser.open(net, (key) => fire('storage', { key })) : { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v), removeItem: (k: string) => void storage.delete(k) },
    fetch: async (url: string, init: RequestInit) => {
      const label = `${init.method} ${new URL(url).pathname.replace('/api', '')}`;
      net.calls.push(label);
      net.keepalive.push(!!init.keepalive);
      const at = net.slow.findIndex((x) => x.match.test(label));
      const slow = at >= 0 ? net.slow.splice(at, 1)[0] : undefined;
      if (net.down) throw new TypeError('no connection');
      if (slow?.before) await slow.before;
      if (net.fake) return net.fake();
      const res = await fetch(net.moved ? url.replace(base, net.moved) : url, init);
      net.arrived.push(label);
      if (init.method === 'PUT' && net.losePuts > 0) {
        net.losePuts--;
        await res.arrayBuffer();
        throw new TypeError('the answer was lost');
      }
      if (!slow?.after) return res;
      const body = res.status === 204 ? null : await res.arrayBuffer();
      await slow.after;
      return new Response(body, { status: res.status, headers: res.headers });
    },
    window: { addEventListener: (t: string, f: (e: unknown) => void) => void (listeners[t] ??= []).push(f) },
    document: { addEventListener: (t: string, f: (e: unknown) => void) => void (listeners[`document ${t}`] ??= []).push(f), visibilityState: 'visible' },
  };
  const save = SonicSave({ api: base, game, delay: 5, env, onChange: (what: string) => events.push(what) });
  return { save, storage, net, events, fire };
}

async function until(cond: () => boolean, what: string, ms = 5000): Promise<void> {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) assert.fail(`waited ${ms} ms for: ${what}`);
    await sleep(4);
  }
}
const kept = (d: Device) => until(() => d.save.status() === 'kept', 'everything to be kept');
const heard = (d: Device) => until(() => d.save.heard() === true, 'the list to be heard from the service');
const names = (d: Device) => d.save.players().map((p: any) => p.name);
const puts = (d: Device, list: string[] = d.net.calls) => list.filter((c) => c.startsWith('PUT')).length;
/** what the game was told, leaving out how the sending stands */
const news = (d: Device) => d.events.filter((e) => e !== 'status');
const json = (status: number, body: unknown) => () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('the browser client against the service', { skip: !adminUrl && 'TEST_DATABASE_URL not set' }, () => {
  let base = '';
  let dbUrl = '';
  const running: Array<() => Promise<void>> = [];
  let sqlPool: pg.Pool;
  /** the service, started (again) on the scratch database */
  async function startApp(): Promise<string> {
    const config: AppConfig = { database: { url: dbUrl, adminUrl: null, name: dbName, user: '', password: null, ssl: false }, port: 0, corsOrigins: true, addressHeader: null, adminKey: null, limits: { ...defaultLimits, requestsPerMinute: 100_000, games: 1000 } };
    const app = await createApp(config);
    await app.listen(0, '127.0.0.1');
    running.push(() => app.close());
    return `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  }
  /** the players the service holds for a game, asked for directly */
  const held = async (game: string, at = base) => ((await (await fetch(`${at}/api/games/${game}/players`)).json()) as any).players as Array<{ id: string; name: string; data: any; version: number; updatedAt: string; playedAt: string }>;

  const shared = aGame('shared');
  let a: Device;
  let b: Device;

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
    base = await startApp();
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

  test('a page that opens asks who the game’s players are; the first one made is kept by the service', async () => {
    a = device(base, shared);
    assert.deepEqual([a.save.players(), a.save.current(), a.save.status(), a.save.heard()], [[], null, 'kept', null]);
    await heard(a);
    assert.deepEqual(a.net.calls, [`GET /games/${shared}/players`]);
    assert.deepEqual(a.events, ['players'], 'the game is told the list has been heard, empty as it is');

    const made = a.save.add('  Sonic  ', { points: 600, vs: {} });
    assert.equal(made.name, 'Sonic');
    assert.equal(a.save.current().id, made.id);
    assert.notEqual(a.save.status(), 'kept');
    assert.equal(a.save.players()[0].kept, false);
    await kept(a);
    assert.equal(a.save.players()[0].kept, true);
    assert.deepEqual((await held(shared)).map((p) => [p.id, p.name, p.data, p.version]), [[made.id, 'Sonic', { points: 600, vs: {} }, 1]]);
    assert.deepEqual(a.net.calls, [`GET /games/${shared}/players`, `PUT /games/${shared}/players/${made.id}`]);
    assert.ok(a.events.includes('status'));
  });

  test('a save is sent a moment after it is written, and a burst of writes is one request', async () => {
    a.net.calls.length = 0;
    for (let i = 1; i <= 5; i++) assert.equal(a.save.write({ points: 600 + i, vs: {} }), true);
    assert.deepEqual(a.save.current().data, { points: 605, vs: {} }, 'the game reads its own write back at once');
    await kept(a);
    assert.equal(puts(a), 1);
    const [p] = await held(shared);
    assert.deepEqual([p!.data, p!.version], [{ points: 605, vs: {} }, 2]);
    // what a game is handed is its own copy: changing it changes nothing here
    a.save.current().data.points = 1;
    assert.equal(a.save.current().data.points, 605);
  });

  test('another device sees the same players, with nothing to type and nobody chosen for it', async () => {
    b = device(base, shared);
    assert.deepEqual([names(b), b.save.heard()], [[], null], 'not before it has heard');
    await heard(b);
    assert.deepEqual(names(b), ['Sonic']);
    assert.equal(b.save.current(), null);
    assert.deepEqual(b.save.choose(b.save.players()[0].id).data, { points: 605, vs: {} });
    assert.equal(b.save.choose('no-such-player'), null);

    const cut = device(base, shared, { down: true });
    await until(() => cut.save.heard() === false, 'the device with no connection to give up asking');
    assert.deepEqual([names(cut), cut.events.includes('players')], [[], true], 'it is told that the list could not be read');
  });

  test('what is played on one device is there on the other', async () => {
    b.save.write({ points: 632, vs: { mina: { w: 2, l: 0, d: 0 } } });
    await kept(b);
    a.events.length = 0;
    await a.save.refresh();
    assert.deepEqual(a.save.current().data, { points: 632, vs: { mina: { w: 2, l: 0, d: 0 } } });
    assert.deepEqual(news(a), ['replaced']);
    a.events.length = 0;
    await a.save.refresh();
    assert.deepEqual(news(a), [], 'nothing new: nothing said');
  });

  test('with no connection the game goes on, and what was played is sent when the line is back', async () => {
    a.net.down = true;
    a.save.write({ points: 650 });
    await sleep(60);
    assert.equal(a.save.status(), 'waiting');
    assert.equal(a.save.current().data.points, 650);
    assert.equal(a.save.players()[0].kept, false);
    assert.equal((await held(shared))[0]!.data.points, 632);
    // the page is closed and opened again, still with no connection: what was played is there
    const reopened = device(base, shared, { storage: new Map(a.storage), down: true });
    assert.equal(reopened.save.current().data.points, 650, 'and it opens on whoever was played last');
    assert.equal(reopened.save.status(), 'keeping', 'it is about to try');
    await until(() => reopened.save.status() === 'waiting', 'the try to fail');

    a.net.down = false;
    a.fire('online');
    await kept(a);
    assert.equal((await held(shared))[0]!.data.points, 650);
  });

  test('the same player played on two devices at once: the one played last stands, and the other is told', async () => {
    await b.save.refresh();
    assert.equal(b.save.current().data.points, 650);
    // A, with no connection, begins before B plays and plays on after it: when the line is back, A's game stands
    a.net.down = true;
    a.save.write({ points: 660 });
    await sleep(25);
    b.save.write({ points: 700 });
    await kept(b);
    await sleep(25);
    a.save.write({ points: 666 });
    await sleep(25);
    a.net.down = false;
    a.events.length = 0;
    a.fire('online');
    await kept(a);
    assert.equal((await held(shared))[0]!.data.points, 666);
    assert.equal(a.save.current().data.points, 666);
    assert.deepEqual(news(a), []);
    b.events.length = 0;
    await b.save.refresh();
    assert.equal(b.save.current().data.points, 666);
    assert.deepEqual(news(b), ['replaced']);

    // A played first and could not send it; B played after: B's stands, and A is told its game was replaced
    a.net.down = true;
    a.save.write({ points: 610 });
    await sleep(25);
    b.save.write({ points: 720 });
    await kept(b);
    a.net.down = false;
    a.events.length = 0;
    a.fire('online');
    await kept(a);
    assert.equal(a.save.current().data.points, 720);
    assert.deepEqual(news(a), ['replaced']);
    assert.equal((await held(shared))[0]!.data.points, 720);

    // both without a connection: the one played last stands, whichever of the two is sent first
    a.net.down = b.net.down = true;
    a.save.write({ points: 801 });
    await sleep(25);
    b.save.write({ points: 802 });
    await sleep(25);
    a.net.down = false;
    a.fire('online');
    await kept(a);
    assert.equal((await held(shared))[0]!.data.points, 801);
    b.net.down = false;
    b.events.length = 0;
    b.fire('online');
    await kept(b);
    assert.equal((await held(shared))[0]!.data.points, 802, 'played later, sent later: it stands');
    assert.deepEqual(news(b), []);
    a.events.length = 0;
    await a.save.refresh();
    assert.equal(a.save.current().data.points, 802);
    assert.deepEqual(news(a), ['replaced']);
  });

  test('a device that slept on an old copy gives way to what was played elsewhere meanwhile', async () => {
    const game = aGame('slept');
    const one = device(base, game);
    const made = one.save.add('Sleeper', { wins: 0 });
    await kept(one);
    const asleep = new Map(one.storage);          // a second copy of the same old state: a page closed, to be opened later
    const two = device(base, game);
    await heard(two);
    two.save.choose(made.id);
    for (const wins of [1, 2, 3]) { two.save.write({ wins }); await kept(two); }
    await sleep(25);

    // the page left open wakes up and a move is played on what it still shows: the move is dropped, not the three wins
    one.events.length = 0;
    one.save.write({ wins: 0, move: 1 });
    await kept(one);
    assert.deepEqual(one.save.current().data, { wins: 3 });
    assert.deepEqual(news(one), ['replaced']);
    assert.deepEqual((await held(game))[0]!.data, { wins: 3 });
    one.save.write({ wins: 4 });
    await kept(one);
    assert.deepEqual((await held(game))[0]!.data, { wins: 4 }, 'in step again, what it plays is kept');

    // the page opened anew plays before it has heard from the service: the same
    const woken = device(base, game, { storage: asleep });
    const back = gate();
    woken.net.slow.push({ match: /^GET /, after: back.wait });
    assert.deepEqual(woken.save.current().data, { wins: 0 });
    woken.save.write({ wins: 0, move: 1 });
    await sleep(25);
    back.open();
    await kept(woken);
    assert.deepEqual(woken.save.current().data, { wins: 4 });
    assert.ok(news(woken).includes('replaced'));
    assert.deepEqual((await held(game))[0]!.data, { wins: 4 });
    assert.equal(puts(woken), 0, 'what it wrote was never sent');
  });

  test('the save a player already has, written again, is no news: nothing is sent and nothing counts as played', async () => {
    const game = aGame('idle');
    const d = device(base, game);
    d.save.add('Idle', { n: 1, deep: { a: 1, b: [1, { c: 2 }] } });
    await kept(d);
    await heard(d);
    const [before] = await held(game);
    const calls = d.net.calls.length;
    d.events.length = 0;
    assert.equal(d.save.write({ deep: { b: [1, { c: 2 }], a: 1 }, n: 1 }), true);
    assert.equal(d.save.status(), 'kept');
    await sleep(30);
    assert.deepEqual([d.net.calls.length, d.events, d.save.players()[0].playedAt, d.save.players()[0].kept], [calls, [], before!.playedAt, true]);
    assert.equal(d.save.rename(d.save.current().id, ' Idle '), true);
    await sleep(30);
    assert.equal(d.net.calls.length, calls);
  });

  test('an answer lost on the way makes neither a second player nor a false alarm', async () => {
    const game = aGame('lost');
    const c = device(base, game);
    await heard(c);
    c.net.losePuts = 1;
    const made = c.save.add('Once', { n: 1 });
    await until(() => puts(c) === 1 && c.save.status() === 'waiting', 'the first write to fail');
    assert.equal((await held(game)).length, 1, 'the service did get it');
    c.fire('online');
    await kept(c);
    assert.deepEqual((await held(game)).map((p) => [p.id, p.version]), [[made.id, 1]]);

    c.events.length = 0;
    c.net.losePuts = 1;
    c.save.write({ n: 2, deep: { z: 1, a: [1, { y: 2, b: 3 }] } });
    await until(() => c.net.losePuts === 0 && c.save.status() === 'waiting', 'the second write to fail');
    c.fire('online');
    await kept(c);
    const [p] = await held(game);
    assert.deepEqual([p!.version, p!.data], [2, { n: 2, deep: { z: 1, a: [1, { y: 2, b: 3 }] } }], 'written once, not twice');
    assert.ok(!c.events.includes('replaced'), 'its own save coming back is not news');
  });

  test('three players and no more; where two devices each add the third, one of them is told there is no room', async () => {
    const game = aGame('three');
    const e = device(base, game);
    e.save.add('E1', {});
    e.save.add('E2', {});
    await kept(e);
    const f = device(base, game);
    await heard(f);
    assert.deepEqual(names(f), ['E1', 'E2']);

    const third = e.save.add('E3', {});
    assert.ok(third);
    assert.equal(e.save.add('E4', {}), null, 'the list is full here');
    assert.equal(e.save.max(), 3);
    await kept(e);
    const late = f.save.add('F3', { mine: true });
    assert.ok(late, 'this device did not know yet');
    f.events.length = 0;
    await until(() => f.save.players().some((p: any) => p.full), 'the service to say there is no room');
    await until(() => f.save.status() === 'kept', 'the sending to come to rest');
    assert.deepEqual([f.save.current().kept, f.save.current().full], [false, true], 'nothing is on its way: the player says itself that it has no room there');
    assert.ok(f.events.includes('players'), 'and the game is told so');
    assert.deepEqual((await held(game)).map((p) => p.name), ['E1', 'E2', 'E3']);
    await f.save.refresh();
    assert.deepEqual(names(f), ['E1', 'E2', 'E3', 'F3']);
    assert.deepEqual(f.save.players().map((p: any) => p.full), [false, false, false, true]);
    assert.equal(f.save.add('F4', {}), null);

    // making room: the one left out is kept after all
    f.save.remove(f.save.players()[0].id);
    await kept(f);
    assert.deepEqual((await held(game)).map((p) => p.name).sort(), ['E2', 'E3', 'F3']);
    assert.deepEqual(f.save.players().map((p: any) => [p.name, p.kept, p.full]), [['E2', true, false], ['E3', true, false], ['F3', true, false]]);
  });

  test('a player renamed or removed on one device is renamed or gone on the other', async () => {
    const game = aGame('renamed');
    const g = device(base, game);
    const one = g.save.add('One', { n: 1 });
    const two = g.save.add('Two', { n: 2 });
    await kept(g);
    const h = device(base, game);
    await heard(h);
    h.save.choose(two.id);

    assert.equal(g.save.rename(one.id, '  Uno '), true);
    assert.equal(g.save.rename(one.id, '   '), false);
    assert.equal(g.save.rename('nobody', 'X'), false);
    await kept(g);
    h.events.length = 0;
    await h.save.refresh();
    assert.deepEqual(names(h), ['Uno', 'Two']);
    assert.deepEqual(news(h), ['players']);

    g.save.remove(two.id);
    assert.equal(g.save.current(), null, 'the one being played was removed');
    await kept(g);
    assert.deepEqual((await held(game)).map((p) => p.name), ['Uno']);
    h.events.length = 0;
    await h.save.refresh();
    assert.deepEqual(names(h), ['Uno']);
    assert.equal(h.save.current(), null);
    assert.ok(h.events.includes('replaced'), 'the game is told its player is gone');
    assert.equal(h.save.write({ n: 3 }), false, 'with nobody chosen there is nothing to write');
  });

  test('a database set up anew holds nobody: what the browser has is kept again, not taken for removed', async () => {
    const game = aGame('anew');
    const j = device(base, game);
    const one = j.save.add('Kept twice', { n: 1 });
    const two = j.save.add('And me', { n: 5 });
    j.save.choose(one.id);
    j.save.write({ n: 2 });
    await kept(j);
    await heard(j);
    // the database is lost and set up again: nobody is in it, and it is another one
    await sqlPool.query('delete from player where game = $1', [game]);
    await sqlPool.query('update service set epoch = gen_random_uuid()');
    const anew = await startApp();
    const back = device(anew, game, { storage: new Map(j.storage) });
    await heard(back);
    await kept(back);
    assert.deepEqual((await held(game, anew)).map((p) => [p.id, p.name, p.data, p.version]).sort(), [[one.id, 'Kept twice', { n: 2 }, 1], [two.id, 'And me', { n: 5 }, 1]].sort());
    assert.deepEqual([back.save.current().id, names(back).sort(), news(back).includes('replaced')], [one.id, ['And me', 'Kept twice'], false], 'and the one being played is still being played');
  });

  test('a database set up anew under a page that is open: what is played next is kept again, not taken for removed', async () => {
    const game = aGame('anew-open');
    const d = device(base, game);
    const one = d.save.add('Still here', { n: 1 });
    await kept(d);
    await heard(d);
    await sqlPool.query('delete from player where game = $1', [game]);
    await sqlPool.query('update service set epoch = gen_random_uuid()');
    d.net.moved = await startApp();
    d.events.length = 0;
    d.save.write({ n: 2 });                                        // the page never asked for the list again: its write is the first the new database hears of the player
    await kept(d);
    assert.deepEqual((await held(game, d.net.moved)).map((p) => [p.id, p.name, p.data, p.version]), [[one.id, 'Still here', { n: 2 }, 1]]);
    assert.deepEqual([d.save.current()?.id, news(d)], [one.id, []], 'the game goes on with its player and is told of nothing');
  });

  test('a database set up anew, and two devices that held the same player: whichever comes back first, the one played last stands', async () => {
    for (const first of ['the one played last', 'the one that slept']) {
      const game = aGame('anew-two');
      const last = device(base, game);
      const made = last.save.add('Both of us', { n: 1 });
      await kept(last);
      await heard(last);
      const slept = device(base, game);
      await heard(slept);
      slept.save.choose(made.id);
      slept.net.down = true;                                       // it sleeps on { n: 1 } while the other plays on
      last.save.write({ n: 2 });
      await kept(last);
      await sqlPool.query('delete from player where game = $1', [game]);
      await sqlPool.query('update service set epoch = gen_random_uuid()');
      const anew = await startApp();
      const lastBack = device(anew, game, { storage: new Map(last.storage), down: true });
      const sleptBack = device(anew, game, { storage: new Map(slept.storage), down: true });
      const order = first === 'the one played last' ? [lastBack, sleptBack] : [sleptBack, lastBack];
      for (const d of order) {
        d.net.down = false;
        await d.save.refresh();
        await kept(d);
      }
      for (const d of order) await d.save.refresh();               // each hears what the other sent
      assert.deepEqual((await held(game, anew)).map((p) => [p.id, p.data]), [[made.id, { n: 2 }]], `${first} came back first`);
      assert.deepEqual([lastBack.save.players()[0].data, sleptBack.save.players()[0].data], [{ n: 2 }, { n: 2 }], `${first} came back first`);
      assert.equal(news(lastBack).includes('replaced'), false, 'the one who played last was never set back');
    }
  });

  test('a page about to close sends what is waiting, in a way that outlives it', async () => {
    const game = aGame('closing');
    const k = device(base, game);
    k.save.add('Leaving', { n: 1 });
    await kept(k);
    await heard(k);
    const sent = k.net.calls.length;
    k.save.write({ n: 2 });
    k.fire('pagehide');
    assert.equal(k.net.calls.length, sent + 1, 'sent at once, not a moment later');
    assert.equal(k.net.keepalive[sent], true);
    await kept(k);
    assert.equal((await held(game))[0]!.data.n, 2);
  });

  test('a player made with no connection is kept when the line is back, beside those made elsewhere meanwhile', async () => {
    const game = aGame('offline');
    const m = device(base, game, { down: true });
    m.save.add('Offline one', { n: 1 });
    await until(() => m.save.status() === 'waiting' && m.save.heard() === false, 'the try to fail');
    const other = device(base, game);
    other.save.add('Meanwhile', {});
    await kept(other);
    m.net.down = false;
    m.fire('online');
    await kept(m);
    assert.deepEqual([names(m), m.save.current().name, m.save.heard()], [['Meanwhile', 'Offline one'], 'Offline one', true]);
    assert.deepEqual((await held(game)).map((p) => p.name), ['Meanwhile', 'Offline one']);
  });

  test('a save written while the one before it is on its way is not taken for the older of the two', async () => {
    const game = aGame('quick');
    const d = device(base, game);
    d.save.add('Quick', { n: 1 });
    await kept(d);
    await heard(d);
    const way = gate();
    d.net.slow.push({ match: /^PUT /, before: way.wait });
    d.net.losePuts = 1;
    d.save.write({ n: 2 });
    await until(() => puts(d) === 2, 'the write to set out');
    d.save.write({ n: 3 });
    await sleep(30);
    way.open();                                   // n: 2 reaches the service only now, after n: 3 was played…
    await until(() => d.net.losePuts === 0 && d.save.status() === 'waiting', 'its answer to be lost');
    const [there] = await held(game);
    assert.deepEqual([there!.data, there!.version], [{ n: 2 }, 2]);
    d.events.length = 0;
    d.fire('online');
    await kept(d);
    assert.equal((await held(game))[0]!.data.n, 3, '…and is still the older of the two');
    assert.equal(d.save.current().data.n, 3);
    assert.deepEqual(news(d), []);
  });

  test('two tabs of the same game hold one copy: what one writes, the other has too', async () => {
    const game = aGame('tabs');
    const browser = new Browser();
    const one = device(base, game, { browser });
    const made = one.save.add('Tabbed', { n: 1 });
    await kept(one);
    const two = device(base, game, { browser });
    await two.save.refresh();
    assert.equal(two.save.current().data.n, 1, 'a new tab starts as the player chosen last');
    two.events.length = 0;
    one.save.write({ n: 2 });
    await until(() => two.save.current().data.n === 2, 'the other tab to be told');
    assert.deepEqual(news(two), ['replaced']);
    await kept(one);
    await kept(two);
    assert.equal(puts(two), 0, 'the tab that wrote it sends it');

    // both send the same save at once: it is kept once, and nobody is alarmed
    one.events.length = 0;
    two.events.length = 0;
    const version = (await held(game))[0]!.version;
    const go = gate();
    one.net.slow.push({ match: /^PUT /, before: go.wait });
    two.net.slow.push({ match: /^PUT /, before: go.wait });
    const sentBefore = puts(one) + puts(two);
    one.save.write({ n: 3 });
    await until(() => two.save.current().data.n === 3, 'the other tab to be told');
    const both = Promise.all([one.save.flush(), two.save.flush()]);
    await until(() => puts(one) + puts(two) === sentBefore + 2, 'both to set out');
    go.open();
    await both;
    await kept(one);
    await kept(two);
    const [there] = await held(game);
    assert.deepEqual([there!.id, there!.data, there!.version], [made.id, { n: 3 }, version + 1]);
    assert.deepEqual([news(one), news(two)], [[], ['replaced']]);
    assert.deepEqual(JSON.parse(browser.map.get(mirrorOf(game))!).players.map((p: any) => [p.data, p.version, p.dirty]), [[{ n: 3 }, version + 1, false]]);
  });

  test('two tabs: a list that was on its way does not undo what the other tab has kept meanwhile', async () => {
    const game = aGame('tabs-list');
    const browser = new Browser();
    const one = device(base, game, { browser });
    one.save.add('Both', { n: 1 });
    await kept(one);
    const two = device(base, game, { browser });
    await two.save.refresh();
    const back = gate();
    two.net.slow.push({ match: /^GET /, after: back.wait });
    const asked = two.net.arrived.length;
    const listing = two.save.refresh();           // the list as it is now (n: 1), held up on its way back
    await until(() => two.net.arrived.length > asked, 'the service to answer');
    const added = one.save.add('Later', { n: 9 });
    one.save.choose(one.save.players()[0].id);
    one.save.write({ n: 2 });
    await kept(one);
    one.events.length = 0;
    back.open();
    await listing;
    await sleep(20);
    assert.deepEqual(JSON.parse(browser.map.get(mirrorOf(game))!).players.map((p: any) => [p.name, p.data.n, p.version, p.dirty]), [['Both', 2, 2, false], ['Later', 9, 1, false]]);
    assert.deepEqual([one.save.current().data.n, two.save.current().data.n], [2, 2]);
    assert.deepEqual(names(two), ['Both', 'Later'], 'the player made meanwhile is not taken for one removed elsewhere');
    assert.deepEqual(news(one), [], 'the tab that played is not told its game was replaced');
    assert.deepEqual((await held(game)).map((p) => [p.id === added.id, p.data.n]), [[false, 2], [true, 9]]);
  });

  test('each tab plays its own player', async () => {
    const game = aGame('tabs-own');
    const browser = new Browser();
    const one = device(base, game, { browser });
    const first = one.save.add('First', { n: 1 });
    const second = one.save.add('Second', { n: 2 });
    await kept(one);
    const two = device(base, game, { browser });
    assert.equal(two.save.current().id, second.id);
    two.save.choose(first.id);
    await sleep(10);
    assert.equal(one.save.current().id, second.id, 'choosing in one tab does not change who the other plays');
    one.save.write({ n: 22 });
    two.save.write({ n: 11 });
    await kept(one);
    await kept(two);
    await until(() => one.save.status() === 'kept' && two.save.status() === 'kept', 'both to be kept');
    assert.deepEqual((await held(game)).map((p) => [p.name, p.data.n]), [['First', 11], ['Second', 22]]);
    assert.deepEqual([one.save.current().data.n, two.save.current().data.n], [22, 11]);
    assert.equal(device(base, game, { browser }).save.current().id, first.id, 'a tab opened now starts as the one chosen last');

    // the player one tab is playing is removed in the other
    one.events.length = 0;
    two.save.remove(second.id);
    await until(() => one.save.current() === null, 'the first tab to be told');
    assert.deepEqual(news(one), ['replaced']);
    assert.equal(one.save.write({ n: 23 }), false);
    assert.equal(two.save.current().id, first.id);
  });

  test('two tabs sending the same new player at once make one player', async () => {
    const game = aGame('tabs-once');
    const browser = new Browser();
    const one = device(base, game, { browser });
    const two = device(base, game, { browser });
    await heard(one);
    await heard(two);
    const go = gate();
    one.net.slow.push({ match: /^PUT /, before: go.wait });
    two.net.slow.push({ match: /^PUT /, before: go.wait });
    const made = one.save.add('Only once', { n: 1 });
    await until(() => names(two).length === 1, 'the other tab to be told');
    const both = Promise.all([one.save.flush(), two.save.flush()]);
    await until(() => puts(one) + puts(two) === 2, 'both to set out');
    go.open();
    await both;
    await kept(one);
    await kept(two);
    assert.deepEqual((await held(game)).map((p) => [p.id, p.version]), [[made.id, 1]]);
    assert.equal((await sqlPool.query('select count(*)::int as n from player where id = $1', [made.id])).rows[0].n, 1);
  });

  test('an answer that is not the service’s own costs nobody their players', async () => {
    const game = aGame('careful');
    const d = device(base, game);
    const made = d.save.add('Careful', { n: 1 });
    await kept(d);
    await heard(d);
    const stands = () => assert.deepEqual([d.save.players().map((p: any) => [p.id, p.data.n]), d.save.current().id], [[[made.id, 2]], made.id]);

    // what a platform says for an app that is no longer there, and other things that are not this service
    d.net.fake = json(404, { status: 'error', message: 'Application not found' });
    d.save.write({ n: 2 });
    await until(() => d.save.status() === 'waiting', 'the write to fail');
    stands();
    const epoch = JSON.parse(d.storage.get(mirrorOf(game))!).epoch;
    for (const fake of [json(404, { error: 'not_found' }), json(401, {}), json(403, { error: 'gone' }), json(200, { players: [] }), json(200, { players: [], max: 3 }), json(200, { players: [], max: 3, epoch: 7 }), json(200, []), json(200, { players: [{ id: made.id }], max: 3, epoch }), () => new Response('<html>hello</html>', { status: 200 }), json(502, {}), json(500, { error: 'gone' })]) {
      d.net.fake = fake;
      await d.save.refresh();
      d.save.remove('no-such-player');
      await d.save.flush();
      stands();
    }
    assert.equal(d.save.status(), 'waiting');
    d.net.fake = null;
    d.fire('online');
    await kept(d);
    assert.deepEqual((await held(game)).map((p) => [p.id, p.data.n]), [[made.id, 2]]);
  });

  test('the service back at an earlier save (a backup put back): what the browser holds goes out again', async () => {
    const game = aGame('backup');
    const d = device(base, game);
    const made = d.save.add('Restored', { n: 1 });
    await kept(d);
    await heard(d);
    for (const n of [2, 3]) { d.save.write({ n }); await kept(d); }
    const back = () => sqlPool.query(`update player set version = 1, data = '{"n":1}' where id = $1`, [made.id]);

    await back();
    d.events.length = 0;
    await d.save.refresh();
    await kept(d);
    let [there] = await held(game);
    assert.deepEqual([there!.data, there!.version], [{ n: 3 }, 2], 'found out by reading the list');
    assert.deepEqual(news(d), []);

    await back();
    d.save.write({ n: 4 });
    await kept(d);
    [there] = await held(game);
    assert.deepEqual([there!.data, there!.version], [{ n: 4 }, 2], 'found out by writing');
    assert.deepEqual(news(d), []);
    assert.ok(puts(d) < 12, 'and without going round in circles');
  });

  test('a player whose id the service has for a player of another game goes on under a new id', async () => {
    const game = aGame('taken'), other = aGame('taken-by');
    const x = device(base, game, { down: true });
    const made = x.save.add('Twice over', { n: 1 });
    await until(() => x.save.status() === 'waiting', 'the try to fail');
    await fetch(`${base}/api/games/${other}/players/${made.id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ base: 0, name: 'Elsewhere', data: {} }) });
    x.net.down = false;
    x.fire('online');
    await kept(x);
    const there = await held(game);
    assert.deepEqual(there.map((p) => [p.name, p.data.n]), [['Twice over', 1]]);
    assert.notEqual(there[0]!.id, made.id);
    assert.deepEqual([x.save.current().id, x.save.current().name], [there[0]!.id, 'Twice over'], 'still the one being played');
    assert.deepEqual((await held(other)).map((p) => [p.name, p.id === made.id]), [['Elsewhere', true]], 'and the other game’s player is untouched');
  });

  test('a player removed before the service answered for it does not come back', async () => {
    const game = aGame('removed');
    const d = device(base, game);
    d.save.add('Stays', {});
    await kept(d);
    await heard(d);
    const back = gate();
    d.net.slow.push({ match: /^PUT /, after: back.wait });
    const arrived = d.net.arrived.length;
    const made = d.save.add('Changed my mind', {});
    await until(() => d.net.arrived.length > arrived, 'the service to take it');
    assert.equal((await held(game)).length, 2);
    d.save.remove(made.id);
    assert.equal(d.save.current(), null);
    back.open();
    await kept(d);
    assert.deepEqual((await held(game)).map((p) => p.name), ['Stays']);
    await d.save.refresh();
    assert.deepEqual(names(d), ['Stays']);

    // and one made and removed with no connection was never anywhere
    const none = aGame('removed-unsent');
    const e = device(base, none, { down: true });
    e.save.remove(e.save.add('Never mind', {}).id);
    await sleep(30);
    e.net.down = false;
    e.fire('online');
    await kept(e);
    assert.deepEqual([names(e), puts(e, e.net.arrived), await held(none)], [[], 0, []]);
  });

  test('a save is a plain object, and nothing else is taken for one', async () => {
    const d = device(base, aGame('plain'));
    for (const bad of [7, 'text', [1, 2]]) assert.throws(() => d.save.add('Bad', bad), TypeError, String(bad));
    assert.deepEqual(d.save.players(), []);
    d.save.add('Good', undefined);
    assert.deepEqual(d.save.current().data, {}, 'nothing given: an empty save');
    for (const bad of [null, undefined, 7, 'text', [1, 2]]) assert.throws(() => d.save.write(bad), TypeError, String(bad));
    assert.deepEqual(d.save.current().data, {});
    await kept(d);
  });

  test('a browser whose storage stops taking things goes on with what the page holds', async () => {
    const game = aGame('full-disk');
    const map = new Map<string, string>();
    let room = true;
    const storage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => { if (!room) throw new Error('QuotaExceededError'); map.set(k, v); },
      removeItem: (k: string) => void map.delete(k),
    };
    const d = SonicSave({ api: base, game, delay: 5, env: { ...timers, storage, fetch: (url: string, init: RequestInit) => fetch(url, init) } });
    const made = d.add('Full disk', { n: 1 });
    await until(() => d.status() === 'kept' && d.heard() === true, 'kept');
    room = false;
    assert.equal(d.write({ n: 2 }), true);
    assert.equal(d.current().data.n, 2);
    await until(() => d.status() === 'kept', 'kept all the same');
    assert.deepEqual(d.players().map((p: any) => [p.id, p.data.n, p.kept]), [[made.id, 2, true]]);
    assert.equal((await held(game))[0]!.data.n, 2);
    assert.equal(JSON.parse(map.get(mirrorOf(game))!).players[0].data.n, 1, 'the storage itself still has what it last took');
  });

  test('built with no service to talk to, the players are kept in the browser and nothing is ever asked', async () => {
    const game = aGame('alone');
    const storage = new Map<string, string>([['sonic-hub.code', 'K7QM-2XPD-9RBT']]);
    const calls: string[] = [];
    const env = () => ({ ...timers, storage: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v), removeItem: (k: string) => void storage.delete(k) }, fetch: async (url: string) => { calls.push(url); throw new TypeError('nothing should be asked'); } });
    const alone = SonicSave({ api: '', game, delay: 5, env: env() });
    assert.deepEqual([alone.remote(), alone.heard()], [false, true]);
    assert.equal(storage.has('sonic-hub.code'), false, 'what the first version kept beside the players is cleared away');
    const made = alone.add('On my own', { n: 1 });
    alone.write({ n: 2 });
    await sleep(40);
    assert.deepEqual([alone.status(), alone.current().data.n], ['kept', 2]);
    await alone.refresh();
    await alone.flush();
    alone.remove(alone.add('Passing', {}).id);
    const again = SonicSave({ api: '', game, delay: 5, env: env() });
    assert.deepEqual([again.current(), again.players().map((p: any) => [p.id, p.data.n]), again.status()], [null, [[made.id, 2]], 'kept']);
    assert.deepEqual(calls, []);
  });

  test('a browser that keeps nothing still plays, and what it holds is sent', async () => {
    const game = aGame('no-storage');
    const n = SonicSave({ api: base, game, delay: 5, env: { ...timers, storage: null, fetch: (url: string, init: RequestInit) => fetch(url, init) } });
    const made = n.add('No storage', { n: 1 });
    await until(() => n.status() === 'kept', 'kept');
    assert.deepEqual((await held(game)).map((p) => p.id), [made.id]);
  });
});
