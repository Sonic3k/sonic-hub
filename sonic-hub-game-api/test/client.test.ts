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
const GAME = 'keep-it-down-extended';
const CODE = /^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/;
const MIRROR = `sonic-save.${GAME}`;

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
   */
  net: { down: boolean; losePuts: number; calls: string[]; keepalive: boolean[]; arrived: string[]; slow: Array<{ match: RegExp; before?: Promise<void>; after?: Promise<void> }>; fake: null | (() => Response) };
  events: string[];
  fire(type: string, event?: unknown): void;
  /** go: a link followed while the page is open, where only the part after # changes */
  address: { readonly hash: string; replaced: string[]; go(hash: string): void };
}

function device(base: string, o: { storage?: Map<string, string>; browser?: Browser; hash?: string; down?: boolean } = {}): Device {
  const net: Device['net'] = { down: !!o.down, losePuts: 0, calls: [], keepalive: [], arrived: [], slow: [], fake: null };
  const listeners: Record<string, Array<(e: unknown) => void>> = {};
  const fire = (type: string, event: unknown = {}) => (listeners[type] ?? []).forEach((f) => f(event));
  const events: string[] = [];
  const location = { hash: o.hash ?? '', pathname: '/', search: '' };
  const replaced: string[] = [];
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
      const res = await fetch(url, init);
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
    location,
    history: { state: null, replaceState: (_s: unknown, _t: string, url: string) => { replaced.push(url); location.hash = url.includes('#') ? url.slice(url.indexOf('#')) : ''; } },
  };
  const save = SonicSave({ api: base, game: GAME, delay: 5, env, onChange: (what: string) => events.push(what) });
  return { save, storage, net, events, fire, address: { get hash() { return location.hash; }, replaced, go: (hash) => { location.hash = hash; fire('hashchange'); } } };
}

async function until(cond: () => boolean, what: string, ms = 5000): Promise<void> {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) assert.fail(`waited ${ms} ms for: ${what}`);
    await sleep(4);
  }
}
const kept = (d: Device) => until(() => d.save.status() === 'kept', 'everything to be kept');
const names = (d: Device) => d.save.players().map((p: any) => p.name);
const puts = (d: Device, list: string[] = d.net.calls) => list.filter((c) => c.startsWith('PUT')).length;
/** what the game was told, leaving out how the sending stands */
const news = (d: Device) => d.events.filter((e) => e !== 'status');
const json = (status: number, body: unknown) => () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('the browser client against the service', { skip: !adminUrl && 'TEST_DATABASE_URL not set' }, () => {
  let base = '';
  let stop: () => Promise<void> = async () => {};
  let sqlPool: pg.Pool;
  /** the players the service holds under a code, asked for directly */
  const held = async (code: string) => ((await (await fetch(`${base}/api/games/${GAME}/players`, { headers: { authorization: `Bearer ${code}` } })).json()) as any).players as Array<{ id: string; name: string; data: any; version: number; updatedAt: string; playedAt: string }>;

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
    process.env.NODE_ENV = 'test';
    const config: AppConfig = { database: { url: url.toString(), adminUrl: null, name: dbName, user: '', password: null, ssl: false }, port: 0, corsOrigins: true, limits: { ...defaultLimits, requestsPerMinute: 100_000, newCodesPerHour: 1000 } };
    const app = await createApp(config);
    await app.listen(0, '127.0.0.1');
    stop = () => app.close();
    base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
    sqlPool = new pg.Pool({ connectionString: url.toString(), max: 2 });
  });

  after(async () => {
    if (!adminUrl) return;
    await stop();
    await sqlPool?.end();
    const admin = new pg.Client({ connectionString: adminUrl });
    await admin.connect();
    await admin.query(`drop database if exists ${dbName} with (force)`);
    await admin.end();
  });

  test('with nobody to keep, nothing is asked of the service; the first player brings a code', async () => {
    a = device(base);
    assert.equal(a.save.code(), null);
    assert.deepEqual(a.save.players(), []);
    assert.equal(a.save.current(), null);
    assert.equal(a.save.status(), 'kept');
    await sleep(40);
    assert.deepEqual(a.net.calls, []);

    const made = a.save.add('  Sonic  ', { points: 600, vs: {} });
    assert.equal(made.name, 'Sonic');
    assert.equal(a.save.current().id, made.id);
    assert.notEqual(a.save.status(), 'kept');
    assert.equal(a.save.players()[0].kept, false);
    await kept(a);
    assert.match(a.save.code(), CODE);
    assert.equal(a.save.players()[0].kept, true);
    assert.deepEqual((await held(a.save.code())).map((p) => [p.id, p.name, p.data, p.version]), [[made.id, 'Sonic', { points: 600, vs: {} }, 1]]);
    assert.deepEqual(a.net.calls, ['POST /codes', `PUT /games/${GAME}/players/${made.id}`]);
    assert.ok(a.events.includes('players') && a.events.includes('status'));
  });

  test('a save is sent a moment after it is written, and a burst of writes is one request', async () => {
    a.net.calls.length = 0;
    for (let i = 1; i <= 5; i++) assert.equal(a.save.write({ points: 600 + i, vs: {} }), true);
    assert.deepEqual(a.save.current().data, { points: 605, vs: {} }, 'the game reads its own write back at once');
    await kept(a);
    assert.equal(a.net.calls.filter((c) => c.startsWith('PUT')).length, 1);
    const [p] = await held(a.save.code());
    assert.deepEqual([p!.data, p!.version], [{ points: 605, vs: {} }, 2]);
    // what a game is handed is its own copy: changing it changes nothing here
    a.save.current().data.points = 1;
    assert.equal(a.save.current().data.points, 605);
  });

  test('another device takes the players up by typing the code', async () => {
    b = device(base);
    assert.deepEqual(await b.save.useCode('nonsense'), { ok: false, why: 'malformed' });
    assert.deepEqual(await b.save.useCode('2222-2222-2222'), { ok: false, why: 'unknown' });
    assert.equal(b.save.code(), null);
    assert.deepEqual(await b.save.useCode(a.save.code().toLowerCase().replace(/-/g, ' ')), { ok: true, previous: null });
    assert.equal(b.save.code(), a.save.code());
    assert.deepEqual(names(b), ['Sonic']);
    assert.equal(b.save.current(), null, 'nobody is chosen for it');
    assert.deepEqual(b.save.choose(b.save.players()[0].id).data, { points: 605, vs: {} });
    assert.equal(b.save.choose('no-such-player'), null);
    b.net.down = true;
    assert.deepEqual(await device(base, { down: true }).save.useCode(a.save.code()), { ok: false, why: 'unreachable' });
    b.net.down = false;
  });

  test('what is played on one device is there on the other', async () => {
    b.save.write({ points: 632, vs: { mina: { w: 2, l: 0, d: 0 } } });
    await kept(b);
    a.events.length = 0;
    await a.save.refresh();
    assert.deepEqual(a.save.current().data, { points: 632, vs: { mina: { w: 2, l: 0, d: 0 } } });
    assert.deepEqual(a.events.filter((e) => e !== 'status'), ['replaced']);
    a.events.length = 0;
    await a.save.refresh();
    assert.deepEqual(a.events.filter((e) => e !== 'status'), [], 'nothing new: nothing said');
  });

  test('with no connection the game goes on, and what was played is sent when the line is back', async () => {
    a.net.down = true;
    a.save.write({ points: 650 });
    await sleep(60);
    assert.equal(a.save.status(), 'waiting');
    assert.equal(a.save.current().data.points, 650);
    assert.equal(a.save.players()[0].kept, false);
    assert.equal((await held(a.save.code()))[0]!.data.points, 632);
    // the page is closed and opened again, still with no connection: what was played is there
    const reopened = device(base, { storage: new Map(a.storage), down: true });
    assert.equal(reopened.save.current().data.points, 650);
    assert.equal(reopened.save.status(), 'keeping', 'it is about to try');
    await until(() => reopened.save.status() === 'waiting', 'the try to fail');

    a.net.down = false;
    a.fire('online');
    await kept(a);
    assert.equal((await held(a.save.code()))[0]!.data.points, 650);
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
    assert.equal((await held(a.save.code()))[0]!.data.points, 666);
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
    assert.equal((await held(a.save.code()))[0]!.data.points, 720);

    // both without a connection: the one played last stands, whichever of the two is sent first
    a.net.down = b.net.down = true;
    a.save.write({ points: 801 });
    await sleep(25);
    b.save.write({ points: 802 });
    await sleep(25);
    a.net.down = false;
    a.fire('online');
    await kept(a);
    assert.equal((await held(a.save.code()))[0]!.data.points, 801);
    b.net.down = false;
    b.events.length = 0;
    b.fire('online');
    await kept(b);
    assert.equal((await held(a.save.code()))[0]!.data.points, 802, 'played later, sent later: it stands');
    assert.deepEqual(news(b), []);
    a.events.length = 0;
    await a.save.refresh();
    assert.equal(a.save.current().data.points, 802);
    assert.deepEqual(news(a), ['replaced']);
  });

  test('a device that slept on an old copy gives way to what was played elsewhere meanwhile', async () => {
    const one = device(base);
    const made = one.save.add('Sleeper', { wins: 0 });
    await kept(one);
    const code = one.save.code();
    const asleep = new Map(one.storage);          // a second copy of the same old state: a page closed, to be opened later
    const two = device(base);
    await two.save.useCode(code);
    two.save.choose(made.id);
    for (const wins of [1, 2, 3]) { two.save.write({ wins }); await kept(two); }
    await sleep(25);

    // the page left open wakes up and a move is played on what it still shows: the move is dropped, not the three wins
    one.events.length = 0;
    one.save.write({ wins: 0, move: 1 });
    await kept(one);
    assert.deepEqual(one.save.current().data, { wins: 3 });
    assert.deepEqual(news(one), ['replaced']);
    assert.deepEqual((await held(code))[0]!.data, { wins: 3 });
    one.save.write({ wins: 4 });
    await kept(one);
    assert.deepEqual((await held(code))[0]!.data, { wins: 4 }, 'in step again, what it plays is kept');

    // the page opened anew plays before it has heard from the service: the same
    const woken = device(base, { storage: asleep });
    const back = gate();
    woken.net.slow.push({ match: /^GET /, after: back.wait });
    assert.deepEqual(woken.save.current().data, { wins: 0 });
    woken.save.write({ wins: 0, move: 1 });
    await sleep(25);
    back.open();
    await kept(woken);
    assert.deepEqual(woken.save.current().data, { wins: 4 });
    assert.deepEqual(news(woken), ['replaced']);
    assert.deepEqual((await held(code))[0]!.data, { wins: 4 });
    assert.equal(puts(woken), 0, 'what it wrote was never sent');
  });

  test('the save a player already has, written again, is no news: nothing is sent and nothing counts as played', async () => {
    const d = device(base);
    d.save.add('Idle', { n: 1, deep: { a: 1, b: [1, { c: 2 }] } });
    await kept(d);
    const [before] = await held(d.save.code());
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
    const c = device(base);
    c.net.losePuts = 1;
    const made = c.save.add('Once', { n: 1 });
    await until(() => c.net.calls.filter((x) => x.startsWith('PUT')).length === 1 && c.save.status() === 'waiting', 'the first write to fail');
    assert.equal((await held(c.save.code())).length, 1, 'the service did get it');
    c.fire('online');
    await kept(c);
    assert.deepEqual((await held(c.save.code())).map((p) => [p.id, p.version]), [[made.id, 1]]);

    c.events.length = 0;
    c.net.losePuts = 1;
    c.save.write({ n: 2, deep: { z: 1, a: [1, { y: 2, b: 3 }] } });
    await until(() => c.net.losePuts === 0 && c.save.status() === 'waiting', 'the second write to fail');
    c.fire('online');
    await kept(c);
    const [p] = await held(c.save.code());
    assert.deepEqual([p!.version, p!.data], [2, { n: 2, deep: { z: 1, a: [1, { y: 2, b: 3 }] } }], 'written once, not twice');
    assert.ok(!c.events.includes('replaced'), 'its own save coming back is not news');
  });

  test('three players and no more; where two devices each add the third, one of them is told there is no room', async () => {
    const e = device(base);
    e.save.add('E1', {});
    e.save.add('E2', {});
    await kept(e);
    const f = device(base);
    await f.save.useCode(e.save.code());
    assert.deepEqual(names(f), ['E1', 'E2']);

    const third = e.save.add('E3', {});
    assert.ok(third);
    assert.equal(e.save.add('E4', {}), null, 'the list is full here');
    assert.equal(e.save.max(), 3);
    await kept(e);
    const late = f.save.add('F3', { mine: true });
    assert.ok(late, 'this device did not know yet');
    await until(() => f.save.players().some((p: any) => p.full), 'the service to say there is no room');
    assert.equal(f.save.status(), 'waiting');
    assert.deepEqual((await held(e.save.code())).map((p) => p.name), ['E1', 'E2', 'E3']);
    await f.save.refresh();
    assert.deepEqual(names(f), ['E1', 'E2', 'E3', 'F3']);
    assert.deepEqual(f.save.players().map((p: any) => p.full), [false, false, false, true]);
    assert.equal(f.save.add('F4', {}), null);

    // making room: the one left out is kept after all
    f.save.remove(f.save.players()[0].id);
    await kept(f);
    assert.deepEqual((await held(e.save.code())).map((p) => p.name).sort(), ['E2', 'E3', 'F3']);
    assert.deepEqual(f.save.players().map((p: any) => [p.name, p.kept, p.full]), [['E2', true, false], ['E3', true, false], ['F3', true, false]]);
  });

  test('a player renamed or removed on one device is renamed or gone on the other', async () => {
    const g = device(base);
    const one = g.save.add('One', { n: 1 });
    const two = g.save.add('Two', { n: 2 });
    await kept(g);
    const h = device(base);
    await h.save.useCode(g.save.code());
    h.save.choose(two.id);

    assert.equal(g.save.rename(one.id, '  Uno '), true);
    assert.equal(g.save.rename(one.id, '   '), false);
    assert.equal(g.save.rename('nobody', 'X'), false);
    await kept(g);
    h.events.length = 0;
    await h.save.refresh();
    assert.deepEqual(names(h), ['Uno', 'Two']);
    assert.deepEqual(h.events.filter((x) => x !== 'status'), ['players']);

    g.save.remove(two.id);
    assert.equal(g.save.current(), null, 'the one being played was removed');
    await kept(g);
    assert.deepEqual((await held(g.save.code())).map((p) => p.name), ['Uno']);
    h.events.length = 0;
    await h.save.refresh();
    assert.deepEqual(names(h), ['Uno']);
    assert.equal(h.save.current(), null);
    assert.ok(h.events.includes('replaced'), 'the game is told its player is gone');
    assert.equal(h.save.write({ n: 3 }), false, 'with nobody chosen there is nothing to write');
  });

  test('a code handed over in the address is taken up, and wiped off the address', async () => {
    const code = a.save.code();
    const viaLink = device(base, { hash: `#code=${encodeURIComponent(code)}` });
    assert.equal(viaLink.save.code(), code);
    assert.deepEqual(viaLink.address.replaced, ['/']);
    assert.equal(viaLink.address.hash, '');
    await until(() => viaLink.save.players().length === 1, 'the players to arrive');
    assert.deepEqual(names(viaLink), ['Sonic']);

    const withMore = device(base, { hash: `#room=2&code=${code}` });
    assert.equal(withMore.save.code(), code);
    assert.deepEqual(withMore.address.replaced, ['/#room=2'], 'the rest of the address stays');

    const other = (await (await fetch(`${base}/api/codes`, { method: 'POST' })).json() as { code: string }).code;
    const hasOne = device(base, { storage: new Map(a.storage), hash: `#code=${other}` });
    assert.equal(hasOne.save.code(), code, 'a browser that has a code keeps its own');
    assert.deepEqual(hasOne.address.replaced, ['/']);

    // a link followed while the page is open: the page does not start again, and the code is taken up all the same
    const open = device(base);
    await sleep(20);
    open.address.go(`#code=${code}`);
    assert.deepEqual([open.save.code(), open.address.hash, open.address.replaced], [code, '', ['/']]);
    await until(() => open.save.players().length === 1, 'the players to arrive');
    assert.ok(open.events.includes('players'));
    hasOne.address.go(`#room=3&code=${other}`);
    assert.deepEqual([hasOne.save.code(), hasOne.address.hash], [code, '#room=3'], 'and a browser that has a code still keeps its own');

    const nonsense = device(base, { hash: '#code=not-a-code' });
    assert.equal(nonsense.save.code(), null);
    assert.deepEqual(nonsense.address.replaced, ['/']);
    const untouched = device(base, { hash: '#chapter-3' });
    assert.deepEqual(untouched.address.replaced, []);

    assert.equal(a.save.link('https://commander.example/'), `https://commander.example/#code=${code}`);
    assert.equal(a.save.link('https://commander.example/#map'), `https://commander.example/#map&code=${code}`);
    assert.equal(nonsense.save.link('https://commander.example/'), 'https://commander.example/');
  });

  test('if the service no longer knows a code, everything this browser holds is kept again under a new one', async () => {
    const j = device(base);
    const made = j.save.add('Kept twice', { n: 1 });
    await kept(j);
    const old = j.save.code();
    await sqlPool.query('delete from holder where id = (select holder_id from player where id = $1)', [made.id]);
    j.save.write({ n: 2 });
    await until(() => j.save.code() !== old && j.save.status() === 'kept', 'a new code and everything kept');
    assert.match(j.save.code(), CODE);
    assert.deepEqual((await held(j.save.code())).map((p) => [p.id, p.name, p.data]), [[made.id, 'Kept twice', { n: 2 }]]);
    assert.equal(j.save.current().id, made.id, 'the player is still the one being played');
  });

  test('a page about to close sends what is waiting, in a way that outlives it', async () => {
    const k = device(base);
    k.save.add('Leaving', { n: 1 });
    await kept(k);
    const sent = k.net.calls.length;
    k.save.write({ n: 2 });
    k.fire('pagehide');
    assert.equal(k.net.calls.length, sent + 1, 'sent at once, not a moment later');
    assert.equal(k.net.keepalive[sent], true);
    await kept(k);
    assert.equal((await held(k.save.code()))[0]!.data.n, 2);
  });

  test('players never kept anywhere come along when a code is taken up; those kept under another code stay under it', async () => {
    const m = device(base, { down: true });
    m.save.add('Offline one', { n: 1 });
    await sleep(40);
    assert.equal(m.save.code(), null);
    assert.equal(m.save.status(), 'waiting');
    m.net.down = false;
    const target = device(base);
    target.save.add('Already there', {});
    await kept(target);
    assert.deepEqual(await m.save.useCode(target.save.code()), { ok: true, previous: null });
    assert.deepEqual(names(m), ['Already there', 'Offline one']);
    assert.equal(m.save.current().name, 'Offline one', 'still the one being played');
    await kept(m);
    assert.deepEqual((await held(target.save.code())).map((p) => p.name), ['Already there', 'Offline one']);

    const elsewhere = device(base);
    elsewhere.save.add('Under my own code', {});
    await kept(elsewhere);
    const mine = elsewhere.save.code();
    assert.deepEqual(await elsewhere.save.useCode(target.save.code()), { ok: true, previous: mine });
    assert.deepEqual(names(elsewhere), ['Already there', 'Offline one']);
    assert.deepEqual((await held(mine)).map((p) => p.name), ['Under my own code'], 'nothing is lost: it is still there under the old code');
  });

  test('a save written while the one before it is on its way is not taken for the older of the two', async () => {
    const d = device(base);
    d.save.add('Quick', { n: 1 });
    await kept(d);
    const way = gate();
    d.net.slow.push({ match: /^PUT /, before: way.wait });
    d.net.losePuts = 1;
    d.save.write({ n: 2 });
    await until(() => puts(d) === 2, 'the write to set out');
    d.save.write({ n: 3 });
    await sleep(30);
    way.open();                                   // n: 2 reaches the service only now, after n: 3 was played…
    await until(() => d.net.losePuts === 0 && d.save.status() === 'waiting', 'its answer to be lost');
    const [there] = await held(d.save.code());
    assert.deepEqual([there!.data, there!.version], [{ n: 2 }, 2]);
    d.events.length = 0;
    d.fire('online');
    await kept(d);
    assert.equal((await held(d.save.code()))[0]!.data.n, 3, '…and is still the older of the two');
    assert.equal(d.save.current().data.n, 3);
    assert.deepEqual(news(d), []);
  });

  test('two tabs of the same game hold one copy: what one writes, the other has too', async () => {
    const browser = new Browser();
    const one = device(base, { browser });
    const made = one.save.add('Tabbed', { n: 1 });
    await kept(one);
    const two = device(base, { browser });
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
    const version = (await held(one.save.code()))[0]!.version;
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
    const [there] = await held(one.save.code());
    assert.deepEqual([there!.id, there!.data, there!.version], [made.id, { n: 3 }, version + 1]);
    assert.deepEqual([news(one), news(two)], [[], ['replaced']]);
    assert.deepEqual(JSON.parse(browser.map.get(MIRROR)!).players.map((p: any) => [p.data, p.version, p.dirty]), [[{ n: 3 }, version + 1, false]]);
  });

  test('two tabs: a list that was on its way does not undo what the other tab has kept meanwhile', async () => {
    const browser = new Browser();
    const one = device(base, { browser });
    one.save.add('Both', { n: 1 });
    await kept(one);
    const two = device(base, { browser });
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
    assert.deepEqual(JSON.parse(browser.map.get(MIRROR)!).players.map((p: any) => [p.name, p.data.n, p.version, p.dirty]), [['Both', 2, 2, false], ['Later', 9, 1, false]]);
    assert.deepEqual([one.save.current().data.n, two.save.current().data.n], [2, 2]);
    assert.deepEqual(names(two), ['Both', 'Later'], 'the player made meanwhile is not taken for one removed elsewhere');
    assert.deepEqual(news(one), [], 'the tab that played is not told its game was replaced');
    assert.deepEqual((await held(one.save.code())).map((p) => [p.id === added.id, p.data.n]), [[false, 2], [true, 9]]);
  });

  test('each tab plays its own player', async () => {
    const browser = new Browser();
    const one = device(base, { browser });
    const first = one.save.add('First', { n: 1 });
    const second = one.save.add('Second', { n: 2 });
    await kept(one);
    const two = device(base, { browser });
    assert.equal(two.save.current().id, second.id);
    two.save.choose(first.id);
    await sleep(10);
    assert.equal(one.save.current().id, second.id, 'choosing in one tab does not change who the other plays');
    one.save.write({ n: 22 });
    two.save.write({ n: 11 });
    await kept(one);
    await kept(two);
    await until(() => one.save.status() === 'kept' && two.save.status() === 'kept', 'both to be kept');
    assert.deepEqual((await held(one.save.code())).map((p) => [p.name, p.data.n]), [['First', 11], ['Second', 22]]);
    assert.deepEqual([one.save.current().data.n, two.save.current().data.n], [22, 11]);
    assert.equal(device(base, { browser }).save.current().id, first.id, 'a tab opened now starts as the one chosen last');

    // the player one tab is playing is removed in the other
    one.events.length = 0;
    two.save.remove(second.id);
    await until(() => one.save.current() === null, 'the first tab to be told');
    assert.deepEqual(news(one), ['replaced']);
    assert.equal(one.save.write({ n: 23 }), false);
    assert.equal(two.save.current().id, first.id);
  });

  test('two tabs asking for the first code at once end with one code', async () => {
    const browser = new Browser();
    const one = device(base, { browser });
    const two = device(base, { browser });
    await sleep(20);
    const made = one.save.add('Only once', { n: 1 });
    await Promise.all([one.save.flush(), two.save.flush()]);
    await kept(one);
    await kept(two);
    assert.deepEqual(one.net.calls.concat(two.net.calls).filter((c) => c === 'POST /codes').length, 2, 'both did ask');
    assert.match(one.save.code(), CODE);
    assert.equal(two.save.code(), one.save.code());
    assert.deepEqual((await held(one.save.code())).map((p) => [p.id, p.version]), [[made.id, 1]]);
    assert.equal((await sqlPool.query('select count(*)::int as n from player where id = $1', [made.id])).rows[0].n, 1);
  });

  test('an answer that is not the service’s own costs nobody their players or their code', async () => {
    const d = device(base);
    const made = d.save.add('Careful', { n: 1 });
    await kept(d);
    const code = d.save.code();
    const other = device(base);
    other.save.add('Someone else', {});
    await kept(other);
    const stands = () => assert.deepEqual([d.save.players().map((p: any) => [p.id, p.data.n]), d.save.code(), d.save.current().id], [[[made.id, 2]], code, made.id]);

    // what a platform says for an app that is no longer there, and other things that are not this service
    d.net.fake = json(404, { status: 'error', message: 'Application not found' });
    d.save.write({ n: 2 });
    await until(() => d.save.status() === 'waiting', 'the write to fail');
    stands();
    for (const fake of [json(404, { error: 'not_found' }), json(401, {}), json(401, { error: 'unauthorized' }), json(403, { error: 'unknown_code' }), json(200, { players: [] }), json(200, []), json(200, { players: [{ id: made.id }], max: 3 }), () => new Response('<html>hello</html>', { status: 200 }), json(502, {}), json(500, { error: 'gone' })]) {
      d.net.fake = fake;
      await d.save.refresh();
      d.save.remove('no-such-player');
      await d.save.flush();
      stands();
      assert.deepEqual(await d.save.useCode(other.save.code()), { ok: false, why: 'unreachable' });
      stands();
    }
    assert.equal(d.save.status(), 'waiting');
    d.net.fake = null;
    d.fire('online');
    await kept(d);
    assert.deepEqual((await held(code)).map((p) => [p.id, p.data.n]), [[made.id, 2]]);
  });

  test('the service back at an earlier save (a backup put back): what the browser holds goes out again', async () => {
    const d = device(base);
    const made = d.save.add('Restored', { n: 1 });
    await kept(d);
    for (const n of [2, 3]) { d.save.write({ n }); await kept(d); }
    const back = () => sqlPool.query(`update player set version = 1, data = '{"n":1}' where id = $1`, [made.id]);

    await back();
    d.events.length = 0;
    await d.save.refresh();
    await kept(d);
    let [there] = await held(d.save.code());
    assert.deepEqual([there!.data, there!.version], [{ n: 3 }, 2], 'found out by reading the list');
    assert.deepEqual(news(d), []);

    await back();
    d.save.write({ n: 4 });
    await kept(d);
    [there] = await held(d.save.code());
    assert.deepEqual([there!.data, there!.version], [{ n: 4 }, 2], 'found out by writing');
    assert.deepEqual(news(d), []);
    assert.ok(puts(d) < 12, 'and without going round in circles');
  });

  test('a player the service has under another code goes on under a new id', async () => {
    const x = device(base);
    x.save.add('Anchor', {});
    await kept(x);
    const mine = x.save.code();
    x.net.losePuts = 1;
    const made = x.save.add('Twice over', { n: 1 });
    await until(() => x.net.losePuts === 0 && x.save.status() === 'waiting', 'its first write to be lost on the way back');
    const y = device(base);
    y.save.add('Host', {});
    await kept(y);
    assert.deepEqual(await x.save.useCode(y.save.code()), { ok: true, previous: mine });
    await kept(x);
    const there = await held(y.save.code());
    assert.deepEqual(there.map((p) => [p.name, p.data.n]), [['Host', undefined], ['Twice over', 1]]);
    assert.notEqual(there[1]!.id, made.id);
    assert.deepEqual([x.save.current().id, x.save.current().name], [there[1]!.id, 'Twice over'], 'still the one being played');
    assert.deepEqual((await held(mine)).map((p) => [p.name, p.id === made.id]), [['Anchor', false], ['Twice over', true]], 'and still there under the old code');
  });

  test('a player removed before the service answered for it does not come back', async () => {
    const d = device(base);
    d.save.add('Stays', {});
    await kept(d);
    const back = gate();
    d.net.slow.push({ match: /^PUT /, after: back.wait });
    const arrived = d.net.arrived.length;
    const made = d.save.add('Changed my mind', {});
    await until(() => d.net.arrived.length > arrived, 'the service to take it');
    assert.equal((await held(d.save.code())).length, 2);
    d.save.remove(made.id);
    assert.equal(d.save.current(), null);
    back.open();
    await kept(d);
    assert.deepEqual((await held(d.save.code())).map((p) => p.name), ['Stays']);
    await d.save.refresh();
    assert.deepEqual(names(d), ['Stays']);

    // and one removed before there was any code leaves nothing to wait for
    const e = device(base, { down: true });
    e.save.remove(e.save.add('Never mind', {}).id);
    await sleep(30);
    e.net.down = false;
    e.fire('online');
    await kept(e);
    assert.deepEqual([e.save.code(), e.net.arrived], [null, []]);
  });

  test('a save is a plain object, and nothing else is taken for one', async () => {
    const d = device(base);
    for (const bad of [7, 'text', [1, 2]]) assert.throws(() => d.save.add('Bad', bad), TypeError, String(bad));
    assert.deepEqual(d.save.players(), []);
    d.save.add('Good', undefined);
    assert.deepEqual(d.save.current().data, {}, 'nothing given: an empty save');
    for (const bad of [null, undefined, 7, 'text', [1, 2]]) assert.throws(() => d.save.write(bad), TypeError, String(bad));
    assert.deepEqual(d.save.current().data, {});
    await kept(d);
  });

  test('a browser whose storage stops taking things goes on with what the page holds', async () => {
    const map = new Map<string, string>();
    let room = true;
    const storage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => { if (!room) throw new Error('QuotaExceededError'); map.set(k, v); },
      removeItem: (k: string) => void map.delete(k),
    };
    const d = SonicSave({ api: base, game: GAME, delay: 5, env: { ...timers, storage, fetch: (url: string, init: RequestInit) => fetch(url, init), location: { hash: '', pathname: '/', search: '' } } });
    const made = d.add('Full disk', { n: 1 });
    await until(() => d.status() === 'kept', 'kept');
    const code = d.code();
    room = false;
    assert.equal(d.write({ n: 2 }), true);
    assert.equal(d.current().data.n, 2);
    await until(() => d.status() === 'kept', 'kept all the same');
    assert.deepEqual([d.code(), d.players().map((p: any) => [p.id, p.data.n, p.kept])], [code, [[made.id, 2, true]]]);
    assert.equal((await held(code))[0]!.data.n, 2);
    assert.equal(JSON.parse(map.get(MIRROR)!).players[0].data.n, 1, 'the storage itself still has what it last took');
  });

  test('built with no service to talk to, the players are kept in the browser and nothing is ever asked', async () => {
    const storage = new Map<string, string>();
    const calls: string[] = [];
    const env = (hash = '') => ({ ...timers, storage: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v), removeItem: (k: string) => void storage.delete(k) }, fetch: async (url: string) => { calls.push(url); throw new TypeError('nothing should be asked'); }, location: { hash, pathname: '/', search: '' } });
    const alone = SonicSave({ api: '', game: GAME, delay: 5, env: env() });
    assert.equal(alone.remote(), false);
    const made = alone.add('On my own', { n: 1 });
    alone.write({ n: 2 });
    await sleep(40);
    assert.deepEqual([alone.status(), alone.code(), alone.current().data.n], ['kept', null, 2]);
    assert.deepEqual(await alone.useCode('2222-2222-2222'), { ok: false, why: 'unreachable' });
    assert.equal(alone.link('https://x.example/'), 'https://x.example/');
    await alone.refresh();
    await alone.flush();
    const again = SonicSave({ api: '', game: GAME, delay: 5, env: env('#code=2345-6789-ABCD') });
    assert.deepEqual([again.current().id, again.current().data.n, again.code()], [made.id, 2, null]);
    assert.deepEqual(calls, []);
  });

  test('a browser that keeps nothing still plays, and what it holds is sent', async () => {
    const n = SonicSave({ api: base, game: GAME, delay: 5, env: { ...timers, storage: null, fetch: (url: string, init: RequestInit) => fetch(url, init), location: { hash: '', pathname: '/', search: '' } } });
    const made = n.add('No storage', { n: 1 });
    await until(() => n.status() === 'kept', 'kept');
    assert.deepEqual((await held(n.code())).map((p) => p.id), [made.id]);
  });
});
