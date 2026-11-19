/* Sonic Hub game saves, the browser side. One file with nothing beside it: a game copies it into its page, or loads
   it from the service at /api/client.js, and talks to the service only through it.

     const save = SonicSave({ api: 'https://…', game: 'keep-it-down-extended', onChange: what => … });

   A game has a short list of PLAYERS (three at most, the service says how many), each with a name and the game's own
   save, which is any plain object. They are the game's own, as on the machine an old game was installed on: whoever
   opens the game, on any device, sees the same players and picks theirs. Nobody signs in.

     save.players()            every player: { id, name, data, playedAt, kept, full }. kept: the service has this very
                               save. full: the list there has no room for this one, so it lives in this browser
                               only; it is sent by itself once there is room
     save.current()            the one this page plays, or null
     save.add(name, data)      a new player, who becomes current; null when the list is full
     save.choose(id)           makes a player current
     save.write(data)          the current player's save, every time it changes
     save.rename(id, name)     save.remove(id)
     save.refresh()            reads the list anew (it is read when the page opens, and when it is come back to)
     save.heard()              has the list been read from the service this time? null: not yet · true · false: it
                               could not be reached, and what is shown is what this browser last held

   Everything is written to this browser first and sent to the service a moment later, so the game never waits and
   goes on working with no connection at all; what could not be sent is sent when it can be. Which player was played
   last is remembered by the browser, so the game can open on them.

   A game built with no service to talk to (api left empty) keeps its players in this browser only: save.remote()
   says which it is.

   When the same player has been played in two places, the one played last stands and the other is told. A device
   that was not in step when it began (it slept while the player was played elsewhere) gives way instead: what it
   wrote on its old copy is dropped for what the service holds.

     onChange('replaced')      the current player's save is now a different one, or the player is gone: read
                               save.current() again
     onChange('players')       the list changed (someone was added, renamed or removed elsewhere), or it has now
                               been heard from the service
     onChange('status')        save.status() changed: 'kept' | 'keeping' (on its way) | 'waiting' (it could not be
                               sent, and is tried again by itself). A player the list has no room for is not
                               counted: nothing of theirs is on its way, and `full` says so

   What the browser holds is one copy for every tab the game is open in. A tab reads it afresh before it changes
   anything, and an answer from the service is laid on what is held when the answer comes, so two tabs never undo
   each other. Which player is being played is each tab's own. */
function SonicSave(opt) {
  'use strict';
  var env = opt.env || {};
  var win = env.window || (typeof window !== 'undefined' ? window : null);
  var doc = env.document || (typeof document !== 'undefined' ? document : null);
  var storage = env.storage !== undefined ? env.storage : (function () { try { return win.localStorage; } catch (e) { return null; } })();
  var doFetch = env.fetch || function (url, init) { return fetch(url, init); };
  var later = env.setTimeout || setTimeout, never = env.clearTimeout || clearTimeout;
  var clock = env.now || Date.now;

  var REMOTE = !!opt.api, API = String(opt.api || '').replace(/\/+$/, '') + '/api', GAME = opt.game;
  var MIRROR_KEY = 'sonic-save.' + GAME, WAITS = [2000, 5000, 15000, 30000, 60000, 120000];
  var DELAY = opt.delay >= 0 ? opt.delay : 700;   // a save is sent this long after the last write, so a burst of writes is one request

  var held = {}, broken = !storage;   // see read()
  var heard = null;           // has the service's list been read this time? null: not yet; false: it could not be reached
  var M = blank();            // what the browser holds for this game, as this tab last read it: see load()
  var me = null;              // the player this tab is playing
  var seen = null;            // what the game was last told of: see look()
  var refused = {};           // id → the time of a save the service would not take as it is: not sent again until written anew
  var skew = 0;               // the service's clock minus this one's, in ms: "played last" is judged on one clock
  var pumping = false, again = false, listing = false, failures = 0, timer = null, leaving = false, lastStatus = '', lastList = 0, waiters = [];

  /* ── small things ── */
  /** The browser's own storage, and beside it whatever was last read or written through here: should the storage stop
   *  taking things (it is full, or the browser keeps nothing), the page goes on with that until it closes. */
  function read(key) {
    if (!broken) {
      try { var v = storage.getItem(key); if (v === null || v === undefined) { delete held[key]; return null; } held[key] = v; return v; } catch (e) { broken = true; }
    }
    return Object.prototype.hasOwnProperty.call(held, key) ? held[key] : null;
  }
  function keep(key, value) {
    if (value === null) delete held[key]; else held[key] = value;
    if (!broken) { try { if (value === null) storage.removeItem(key); else storage.setItem(key, value); } catch (e) { broken = true; } }
  }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function plain(x) { if (!x || typeof x !== 'object' || Array.isArray(x)) throw new TypeError('SonicSave: a save is a plain object'); return clone(x); }
  /** the same thing, whatever order its keys come in (the service hands objects back with theirs sorted) */
  function same(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
    var ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (var i = 0; i < ka.length; i++) if (!Object.prototype.hasOwnProperty.call(b, ka[i]) || !same(a[ka[i]], b[ka[i]])) return false;
    return true;
  }
  function uuid() {
    if (env.uuid) return env.uuid();
    var c = (win && win.crypto) || (typeof crypto !== 'undefined' ? crypto : null);
    if (c && c.randomUUID) return c.randomUUID();
    var b = new Uint8Array(16), h = '';
    if (c && c.getRandomValues) c.getRandomValues(b); else for (var i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    for (var j = 0; j < 16; j++) h += (b[j] < 16 ? '0' : '') + b[j].toString(16) + (j === 3 || j === 5 || j === 7 || j === 9 ? '-' : '');
    return h;
  }
  function tidyName(name) { return Array.from(String(name == null ? '' : name).replace(/\s+/g, ' ').trim()).slice(0, 24).join('').trim(); }
  /** Now, on the service's clock, and always after `than`: a save made on top of another was played after it,
   *  whatever the clocks say. This is what "played last" is judged by, here and on the service. */
  function stamp(than) {
    var t = clock() + skew, floor = than ? Date.parse(than) + 1 : 0;
    return new Date(floor > t ? floor : t).toISOString();
  }
  function find2(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function find(id) { return find2(M.players, id); }
  /** a player as a game sees it. kept: the service has this very save. full: it cannot be kept, the list there has no room */
  function shown(p) { return { id: p.id, name: p.name, data: clone(p.data), playedAt: p.playedAt, kept: p.version > 0 && !p.dirty, full: !!p.full }; }
  /** is this a player as the service gives one? (an answer from anything else that may stand at the address is not taken for one) */
  function valid(s) { return !!s && typeof s.id === 'string' && typeof s.name === 'string' && s.version > 0 && !!s.data && typeof s.data === 'object' && !Array.isArray(s.data) && Date.parse(s.updatedAt) > 0 && Date.parse(s.playedAt) > 0; }
  function fromService(s) { return { id: s.id, name: s.name, data: s.data, version: s.version, dirty: false, playedAt: s.playedAt, full: false }; }
  /** A change made here to a player: when it was played, and (`since`) when this run of changes the service has not
   *  had yet began. */
  function touch(p) { p.playedAt = stamp(p.playedAt); if (!p.dirty) p.since = p.playedAt; p.dirty = true; }
  function inStep(p) { p.dirty = false; p.full = false; delete p.since; }
  function emit(what) { if (opt.onChange) try { opt.onChange(what); } catch (e) { if (typeof console !== 'undefined') console.error(e); } }

  /* ── what the browser holds ── */
  function blank() { return { v: 1, current: null, max: 3, epoch: null, players: [], gone: [] }; }
  /** Read afresh, and never trusted to be well made: { v, current, max, epoch, players: [{ id, name, data, version,
   *  dirty, playedAt, since, full }], gone: [ids removed here that the service has yet to be told of] }.
   *  version 0: never kept. current: who was played last here. epoch: which database the versions are from. */
  function load() {
    var m = null, out = blank(), i, p;
    try { m = JSON.parse(read(MIRROR_KEY) || 'null'); } catch (e) { m = null; }
    if (m && Array.isArray(m.players)) {
      for (i = 0; i < m.players.length; i++) {
        p = m.players[i];
        if (!p || typeof p.id !== 'string' || !p.data || typeof p.data !== 'object' || Array.isArray(p.data) || find2(out.players, p.id)) continue;
        out.players.push({ id: p.id, name: tidyName(p.name) || 'Player', data: p.data, version: p.version > 0 ? Math.floor(p.version) : 0, dirty: !!p.dirty || !(p.version > 0), playedAt: Date.parse(p.playedAt) > 0 ? p.playedAt : stamp(), full: !!p.full });
        if (p.dirty && Date.parse(p.since) > 0) out.players[out.players.length - 1].since = p.since;
      }
      if (Array.isArray(m.gone)) out.gone = m.gone.filter(function (id) { return typeof id === 'string'; });
      if (m.max > 0) out.max = Math.floor(m.max);
      if (typeof m.epoch === 'string') out.epoch = m.epoch;
      if (typeof m.current === 'string' && find2(out.players, m.current)) out.current = m.current;
    }
    return out;
  }
  function persist() { keep(MIRROR_KEY, JSON.stringify(M)); }
  /** what the browser holds now: another tab may have written since this one last looked */
  function fresh() { M = load(); }

  /** Is anything held here still to be sent? What the service will not take does not count: asking again changes nothing. */
  function owing() {
    if (M.gone.length) return true;
    for (var i = 0; i < M.players.length; i++) { var p = M.players[i]; if (p.dirty && !p.full && refused[p.id] !== p.playedAt) return true; }
    return false;
  }
  function status() {
    if (!REMOTE) return 'kept';                                   // this browser is all there is, and it has everything
    var dirty = M.gone.length > 0;
    for (var i = 0; i < M.players.length && !dirty; i++) dirty = M.players[i].dirty && !M.players[i].full;   // one with no room there is not on its way: it says so itself
    if (!dirty) return 'kept';
    return failures === 0 && owing() ? 'keeping' : 'waiting';
  }
  function told() { var s = status(); if (s !== lastStatus) { lastStatus = s; emit('status'); } }

  /** What a game can see of all this: its own player's save, and the rest (the list, the others' saves, whether the list has been heard). */
  function look() {
    var p = me ? find(me) : null;
    if (!p) me = null;
    return { mine: p ? p.data : null, rest: [heard, M.max, M.players.map(function (q) { return [q.id, q.name, !!q.full, q === p ? null : q.data]; })] };
  }
  /** tells the game whatever is news to it in what the browser now holds */
  function notice() {
    var was = seen;
    seen = look();
    if (!same(was.mine, seen.mine)) emit('replaced'); else if (!same(was.rest, seen.rest)) emit('players');
  }
  /** One thing the game asked for: done on what the browser holds now and kept before anything else happens. What
   *  another tab did meanwhile is told to the game afterwards. `overwrites`: the game is writing its own player's
   *  save, so what that save had become is no news to it. */
  function own(fn, overwrites) {
    fresh();
    var now = look(), mineNews = !same(seen.mine, now.mine), restNews = !same(seen.rest, now.rest), who = me;
    var out = fn();
    persist(); seen = look(); told();
    if (mineNews && me === who && !(overwrites && me)) emit('replaced');
    else if (restNews || (mineNews && !overwrites)) emit('players');
    return out;
  }

  /* ── talking to the service ── */
  /** One request. Whatever goes wrong on the way is an answer too: status 0. */
  function call(method, path, body) {
    var headers = {}, ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, asked;
    if (body) headers['Content-Type'] = 'application/json';
    var giveUp = ctl ? later(function () { ctl.abort(); }, 12000) : null;
    try { asked = doFetch(API + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined, keepalive: leaving, cache: 'no-store', credentials: 'omit', signal: ctl ? ctl.signal : undefined }); } catch (e) { asked = Promise.reject(e); }
    return Promise.resolve(asked).then(function (res) {
      if (giveUp) never(giveUp);
      var at = res.headers && res.headers.get ? Number(res.headers.get('X-Now')) : NaN;
      if (at > 0) skew = at - clock();
      if (res.status === 204) return { ok: true, status: 204, body: {} };
      return res.json().then(function (json) { return { ok: res.ok, status: res.status, body: json && typeof json === 'object' ? json : {} }; }, function () { return { ok: res.ok, status: res.status, body: {} }; });
    }, function () { if (giveUp) never(giveUp); return { ok: false, status: 0, body: {} }; });
  }
  var playersPath = '/games/' + encodeURIComponent(GAME) + '/players';
  /* The service's own words are waited for before anything held here is given up: a 404 or an empty list from
     whatever else may stand at the address one day (a proxy, another app) costs nobody their players. */
  function listed(r) { return r.ok && Array.isArray(r.body.players) && r.body.max > 0 && typeof r.body.epoch === 'string' && r.body.players.every(valid); }
  /** the list has been read from the service, or could not be: once it has been read, a later failure does not unsay it */
  function hear(did) { if (did || heard === null) heard = did; }

  function drop(p) { M.players.splice(M.players.indexOf(p), 1); if (M.current === p.id) M.current = null; }
  /** the service has this id for a player of another game: this one goes on under a new id */
  function rekey(p) { var was = p.id; p.id = uuid(); if (M.current === was) M.current = p.id; if (me === was) me = p.id; }
  /** `p` as this browser holds it against `s`, the same player as the service holds it, where the two differ.
   *  What is held here stands only if it was played later than theirs, and was played on with theirs not yet there
   *  to go on from: theirs reached the service after this run of changes began, or the service as this browser knew
   *  it never had the player (version 0: new here, or kept in a database that has since been set up anew, where
   *  another device's copy got in first). Otherwise theirs stands: either it was played later, or it was already
   *  waiting on the service when this device, on its old copy, began. */
  function settle(p, s) {
    if (s.version === p.version && p.version > 0) return;                                  // nothing new there
    if (same(p.data, s.data) && p.name === s.name) { p.version = s.version; p.playedAt = s.playedAt; inStep(p); return; }   // the same save: only its number moved on
    if (s.version < p.version) { p.version = s.version; if (!p.dirty) { p.dirty = true; p.since = p.playedAt; } return; }   // the service is back at an earlier save (a backup put back): what is held here goes out on top of it
    if (p.dirty && Date.parse(p.playedAt) > Date.parse(s.playedAt) && (p.version === 0 || Date.parse(s.updatedAt) >= Date.parse(p.since || p.playedAt))) { p.version = s.version; return; }   // ours goes out on top of theirs
    p.name = s.name; p.data = s.data; p.version = s.version; p.playedAt = s.playedAt; inStep(p);
  }
  /** The players as the service lists them, laid on what the browser holds. `before`: each player's version when the
   *  list was asked for. One that another tab has written or removed since is left for the next time: the list is
   *  older than what that tab did. */
  function takeList(body, before) {
    var theirs = body.players, i, p, s;
    // A database set up anew has none of what was kept in the one before. What this browser holds was not removed
    // there: it never arrived, and goes out again as new.
    if (M.epoch && body.epoch !== M.epoch) {
      M.gone = [];
      for (i = 0; i < M.players.length; i++) if (M.players[i].version > 0) { M.players[i].version = 0; M.players[i].dirty = true; before[M.players[i].id] = 0; }
    }
    M.epoch = body.epoch; M.max = body.max;
    var mine = M.players.slice();
    for (i = 0; i < mine.length; i++) {
      p = mine[i]; s = find2(theirs, p.id);
      if (before[p.id] !== p.version) continue;
      if (s) settle(p, s); else if (p.version > 0) drop(p);        // kept once and no longer there: removed from somewhere else
    }
    for (i = 0; i < theirs.length; i++) if (!find(theirs[i].id) && M.gone.indexOf(theirs[i].id) < 0 && !Object.prototype.hasOwnProperty.call(before, theirs[i].id)) M.players.push(fromService(theirs[i]));
    // the service's order (oldest first), then whoever it has not seen yet
    var place = function (q) { var at = theirs.indexOf(find2(theirs, q.id)); return at < 0 ? 1e9 : at; };
    M.players.sort(function (a, b) { return place(a) - place(b); });
    if (M.players.length <= M.max) for (i = 0; i < M.players.length; i++) M.players[i].full = false;
  }

  /** Brings the service and this browser in step, one request after another. Each is made from what the browser
   *  holds at that moment, and its answer is laid on what it holds when the answer comes. Throws when it has to wait. */
  async function work() {
    for (var round = 0; round < 6; round++) {
      var r, i, p, at;
      fresh();
      if (listing) {
        var before = {};
        for (i = 0; i < M.players.length; i++) before[M.players[i].id] = M.players[i].version;
        r = await call('GET', playersPath);
        fresh();
        if (!listed(r)) { hear(false); throw r.body; }
        listing = false; lastList = clock();
        takeList(r.body, before);
        persist(); hear(true); notice(); told();
      }
      var gone = M.gone.slice();
      for (i = 0; i < gone.length; i++) {
        r = await call('DELETE', playersPath + '/' + gone[i]);
        fresh();
        if (r.status !== 204 && !(r.status === 400 && r.body.error === 'invalid')) throw r.body;
        at = M.gone.indexOf(gone[i]);
        if (at >= 0) { M.gone.splice(at, 1); persist(); }
      }
      var ids = M.players.map(function (q) { return q.id; });
      for (i = 0; i < ids.length; i++) {
        fresh();
        p = find(ids[i]);
        if (!p || !p.dirty || p.full || refused[p.id] === p.playedAt) continue;
        var base = p.version, sent = p.data, sentName = p.name, sentAt = p.playedAt;   // a save held here is replaced, never changed in place: this is it as sent
        r = await call('PUT', playersPath + '/' + p.id, { base: base, name: sentName, data: sent, at: sentAt });
        fresh();
        p = find(ids[i]);
        if (!p) continue;                                         // removed while it was on its way: the removal goes out next
        if (r.ok && valid(r.body)) {
          if (r.body.version > p.version) {
            p.version = r.body.version; p.full = false;
            if (same(p.data, sent) && p.name === sentName) { p.playedAt = r.body.playedAt; inStep(p); }
            else p.since = new Date(Date.parse(sentAt) + 1).toISOString();   // written again meanwhile: once more, as a run that began after what was sent
          }
        } else if (r.status === 409 && r.body.error === 'stale' && valid(r.body.player)) { if (p.version === base) settle(p, r.body.player); }
        else if (r.status === 409 && r.body.error === 'full') { p.full = true; if (r.body.max > 0) M.max = r.body.max; }
        else if (r.status === 409 && r.body.error === 'taken') rekey(p);
        else if (r.status === 404 && r.body.error === 'gone') {
          // Removed from somewhere else. Unless it is another database that answers, which never had the player: the
          // list is read anew, which says so, and the player goes out to it as new.
          if (p.version === base) { if (M.epoch && typeof r.body.epoch === 'string' && r.body.epoch !== M.epoch) listing = true; else drop(p); }
        }
        else if ((r.status === 400 && r.body.error === 'invalid') || (r.status === 413 && r.body.error === 'too_big')) refused[p.id] = p.playedAt;
        else throw r.body;
        persist(); notice(); told();
      }
      fresh();
      if (!owing()) return;
    }
    throw {};                                                     // still not in step after several rounds: later
  }
  /** Starts the work, or has it done once more if it is under way. The promise is kept when it has come to rest:
   *  everything sent, or left for a later try. */
  function pump() {
    if (timer) { never(timer); timer = null; }
    if (!REMOTE) return Promise.resolve();
    var done = new Promise(function (resolve) { waiters.push(resolve); });
    if (pumping) { again = true; return done; }
    pumping = true;
    run();
    return done;
  }
  function run() {
    again = false;
    work().then(function () { failures = 0; }, function (wait) {
      failures++;
      if (!timer) timer = later(pump, Math.max(WAITS[Math.min(failures, WAITS.length) - 1], wait && wait.retryAfter > 0 ? wait.retryAfter * 1000 : 0));
    }).then(function () {
      if (again && !timer) return run();
      pumping = false; again = false;
      fresh(); notice(); told();
      var w = waiters;
      waiters = [];
      for (var i = 0; i < w.length; i++) w[i]();
    });
  }
  function kick(ms) { if (!REMOTE) return; if (timer) never(timer); timer = later(pump, ms === undefined ? DELAY : ms); told(); }
  /** reads the players as the service holds them and brings this browser in step */
  function refresh() { listing = true; return pump(); }

  /* ── what a game calls ── */
  var api = {
    players: function () { return M.players.map(shown); },
    current: function () { var p = me ? find(me) : null; return p ? shown(p) : null; },
    max: function () { return M.max; },
    remote: function () { return REMOTE; },
    heard: function () { return REMOTE ? heard : true; },
    status: status,
    choose: function (id) { return own(function () { var p = find(id); if (!p) return null; M.current = me = id; return shown(p); }); },
    add: function (name, data) {
      var to = tidyName(name), save = plain(data || {});
      var made = own(function () {
        if (M.players.length >= M.max || !to) return null;
        var p = { id: uuid(), name: to, data: save, version: 0, dirty: true, playedAt: stamp(), full: false };
        M.players.push(p); M.current = me = p.id;
        return shown(p);
      });
      if (made) kick(0);
      return made;
    },
    rename: function (id, name) {
      var to = tidyName(name);
      var done = own(function () {
        var p = find(id);
        if (!p || !to) return 0;
        if (to === p.name) return 1;
        p.name = to; touch(p);
        return 2;
      });
      if (done === 2) kick(0);
      return done > 0;
    },
    remove: function (id) {
      var had = own(function () {
        var p = find(id);
        if (!p) return false;
        if (REMOTE) M.gone.push(id);                              // even one the service has not answered for: its first write may be on its way
        drop(p);
        if (me === id) me = null;
        for (var i = 0; i < M.players.length; i++) if (M.players[i].full) { M.players[i].full = false; M.players[i].dirty = true; }   // there is room again
        return true;
      });
      if (had) kick(0);
    },
    write: function (data) {
      var save = plain(data);
      var done = own(function () {
        var p = me ? find(me) : null;
        if (!p) return 0;
        if (same(p.data, save)) return 1;                         // the save it already has: nothing was played, so nothing is new
        p.data = save; touch(p);
        return 2;
      }, true);
      if (done === 2) kick();
      return done > 0;
    },
    refresh: refresh,
    /** sends what is waiting at once: the page is about to go */
    flush: function () {
      if (!REMOTE) return Promise.resolve();
      fresh();
      if (status() === 'kept') return Promise.resolve();
      leaving = true;
      return pump().then(function () { leaving = false; });
    },
  };

  /* ── start ── */
  keep('sonic-hub.code', null);   // what the first version of this file kept beside the players: no longer anything
  fresh();
  me = M.current;
  seen = look();
  lastStatus = status();
  if (win && win.addEventListener) {
    win.addEventListener('online', function () { kick(0); });
    win.addEventListener('pagehide', function () { api.flush(); });
    // another tab wrote (a save, a new player): what it wrote is what this one holds too
    win.addEventListener('storage', function (ev) {
      var key = ev ? ev.key : null;
      if (key !== null && key !== undefined && key !== MIRROR_KEY) return;
      fresh(); notice(); told();
      if (REMOTE && !pumping && !timer && status() !== 'kept') kick(WAITS[1]);   // the tab that wrote it sends it; should that tab be gone, this one does
    });
  }
  if (doc && doc.addEventListener) doc.addEventListener('visibilitychange', function () {
    if (doc.visibilityState === 'hidden') api.flush();
    else if (REMOTE && clock() - lastList > 30000) refresh();     // back after a while: something may have been played elsewhere
  });
  if (REMOTE) { listing = true; later(pump, 0); }
  return api;
}
