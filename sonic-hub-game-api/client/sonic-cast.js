/* Sonic Hub game cast, the browser side. One file with nothing beside it: a game copies it into its page, or loads
   it from the service at /api/cast.js.

     const cast = SonicCast({ api: 'https://…', game: 'keep-it-down-extended', onChange: () => … });

   A game has a CAST: the characters a player meets in it. The game knows them, each by a key of its own (mina,
   celeste). With the service, any of them can be given another name, another age, a picture, and the pictures of
   her album, which the game shows in place of its own. This file reads what they were given; changing it is not
   done from the game.

     cast.name(id)             the name she was given, or null: the game's own stands
     cast.age(id)              the age she was given, or null: the game's own stands
     cast.plate(id, n, px)     the address of the picture at place n of her album (1, 2, 3…), for a place px CSS
                               pixels wide or 'full' as below, or '' when there is none at that place
     cast.plates(id)           the places of her album that have a picture, in order
     cast.photo(id, px)        the address of her picture for a place px CSS pixels wide, or '' when she has none.
                               px left out: the width a profile is shown at. px 'full': for looking at it as
                               large as the screen
     cast.heard()              has the cast been read from the service this time? null: not yet · true · false: it
                               could not be reached, and what is shown is what this browser last held
     cast.refresh()            reads it anew (it is read when the page opens)

     onChange()                someone's name or picture is no longer what it was: draw them again

   What was last heard is kept in this browser, so names and pictures are there at once the next time the game is
   opened, and stay when there is no connection. A game built with no service to talk to (api left empty) has the
   game's own cast and nothing else.

   A picture is not read from the service: it is kept on the hub's CDN, and the cast says at which address. The CDN
   hands a picture out at a few widths (320, 640, 960, 1280 and 1920 pixels), whichever its address asks for with
   ?width=. cast.photo() asks for the one that fits the place: the place's width, half as much again on a screen
   with finer dots than CSS pixels, and from there the next width up. Looked at large, it is 1280 on a phone and
   1920 on a wider screen. A picture's address is its own for good: another picture is at another address. */
function SonicCast(opt) {
  const api = String(opt.api || '').replace(/\/+$/, ''), game = opt.game;
  const onChange = opt.onChange || (() => {});
  const fetchFn = opt.fetch || ((...a) => fetch(...a));
  const store = opt.storage === undefined ? (() => { try { return window.localStorage; } catch (e) { return null; } })() : opt.storage;
  const screen = opt.screen || (() => ({ fine: typeof devicePixelRatio === 'number' && devicePixelRatio > 1, narrow: typeof matchMedia === 'function' && matchMedia('(max-width: 760px)').matches }));
  const KEY = 'sonic-cast.' + game, WIDTHS = [320, 640, 960, 1280, 1920], PROFILE = 640, WAIT_MS = 8000;

  /** id → { name, age, photo, album }, only for those who were given something. photo: her picture's address at the CDN,
   *  with no width asked for yet; album: place → address, the same way */
  let members = {}, heard = null;
  const address = v => (typeof v === 'string' && /^https?:\/\/[^\s?#]+$/.test(v) ? v : null);
  const take = list => {
    const next = {};
    for (const m of Array.isArray(list) ? list : []) {
      if (!m || typeof m.id !== 'string') continue;
      const name = typeof m.name === 'string' && m.name ? m.name : null, photo = address(m.photo);
      const age = Number.isInteger(m.age) && m.age >= 18 && m.age <= 99 ? m.age : null, album = {};
      for (const a of Array.isArray(m.album) ? m.album : []) if (a && Number.isInteger(a.n) && a.n > 0 && a.n < 100 && address(a.photo)) album[a.n] = a.photo;
      if (name !== null || age !== null || photo !== null || Object.keys(album).length) next[m.id] = { name, age, photo, album };
    }
    return next;
  };
  const places = m => Object.keys(m.album).map(Number).sort((a, b) => a - b);
  /** as the service gives a cast: what is kept in the browser, and what two readings are compared by */
  const flat = of => Object.keys(of).sort().map(id => ({ id, name: of[id].name, age: of[id].age, photo: of[id].photo, album: places(of[id]).map(n => ({ n, photo: of[id].album[n] })) }));
  const text = of => JSON.stringify(flat(of));
  try { members = take(JSON.parse((store && store.getItem(KEY)) || '[]')); } catch (e) { members = {}; }

  /** The width a picture is asked for at, for a place so many CSS pixels wide. */
  function widthFor(px) {
    const s = screen();
    if (px === 'full') return s.narrow ? 1280 : 1920;
    const need = (Number(px) > 0 ? Number(px) : PROFILE) * (s.fine ? 1.5 : 1);
    return WIDTHS.find(w => w >= need) || WIDTHS[WIDTHS.length - 1];
  }

  let asking = null;
  /** Reads the cast from the service. One reading at a time: asked again meanwhile, it is the same reading. */
  function refresh() {
    if (!api) return Promise.resolve(false);
    if (asking) return asking;
    const stop = typeof AbortController === 'function' ? new AbortController() : null, timer = setTimeout(() => stop && stop.abort(), WAIT_MS);
    asking = Promise.resolve()
      .then(() => fetchFn(`${api}/api/games/${encodeURIComponent(game)}/cast`, stop ? { signal: stop.signal } : {}))
      .then(res => { if (!res.ok) throw new Error('cast: ' + res.status); return res.json(); })
      .then(body => {
        const next = take(body && body.cast), changed = text(next) !== text(members);
        members = next;
        try { if (store) store.setItem(KEY, text(next)); } catch (e) { /* a browser that keeps nothing: asked again next time */ }
        const first = heard !== true;
        heard = true;
        if (changed || first) onChange();
        return true;
      })
      .catch(() => { const first = heard === null; heard = heard === true ? true : false; if (first) onChange(); return false; })
      .then(ok => { clearTimeout(timer); asking = null; return ok; });
    return asking;
  }

  const cast = {
    name: id => (members[id] ? members[id].name : null),
    age: id => (members[id] ? members[id].age : null),
    plate(id, n, px) {
      const m = members[id], at = m && m.album[n];
      return api && at ? `${at}?width=${widthFor(px)}` : '';
    },
    plates: id => (members[id] ? places(members[id]) : []),
    photo(id, px) {
      const m = members[id];
      return api && m && m.photo ? `${m.photo}?width=${widthFor(px)}` : '';
    },
    heard: () => heard,
    refresh,
    remote: () => !!api,
  };
  refresh();
  return cast;
}
