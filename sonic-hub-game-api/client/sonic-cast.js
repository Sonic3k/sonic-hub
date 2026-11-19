/* Sonic Hub game cast, the browser side. One file with nothing beside it: a game copies it into its page, or loads
   it from the service at /api/cast.js.

     const cast = SonicCast({ api: 'https://…', game: 'keep-it-down-extended', onChange: () => … });

   A game has a CAST: the characters a player meets in it. The game knows them, each by a key of its own (mina,
   celeste). With the service, any of them can be given another name and a picture, which the game shows in place
   of its own. This file reads what they were given; changing it is not done from the game.

     cast.name(id)             the name she was given, or null: the game's own stands
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

   Pictures are handed out at a few widths: 320, 640, 960, 1280 and 1920 pixels. An address asks for the one that
   fits the place: the place's width, half as much again on a screen with finer dots than CSS pixels, and from there
   the next width up. Looked at large, it is 1280 on a phone and 1920 on a wider screen. An address names the
   picture's version, so a browser keeps a picture for good and fetches another only when she is given another. */
function SonicCast(opt) {
  const api = String(opt.api || '').replace(/\/+$/, ''), game = opt.game;
  const onChange = opt.onChange || (() => {});
  const fetchFn = opt.fetch || ((...a) => fetch(...a));
  const store = opt.storage === undefined ? (() => { try { return window.localStorage; } catch (e) { return null; } })() : opt.storage;
  const screen = opt.screen || (() => ({ fine: typeof devicePixelRatio === 'number' && devicePixelRatio > 1, narrow: typeof matchMedia === 'function' && matchMedia('(max-width: 760px)').matches }));
  const KEY = 'sonic-cast.' + game, WIDTHS = [320, 640, 960, 1280, 1920], PROFILE = 640, WAIT_MS = 8000;

  /** id → { name, photo }, only for those who were given something; kept as the service's own answer */
  let members = {}, heard = null;
  const take = list => {
    const next = {};
    for (const m of Array.isArray(list) ? list : []) {
      if (!m || typeof m.id !== 'string') continue;
      const name = typeof m.name === 'string' && m.name ? m.name : null, photo = Number.isSafeInteger(m.photo) && m.photo > 0 ? m.photo : null;
      if (name !== null || photo !== null) next[m.id] = { name, photo };
    }
    return next;
  };
  const text = of => JSON.stringify(Object.keys(of).sort().map(id => [id, of[id].name, of[id].photo]));
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
        try { if (store) store.setItem(KEY, JSON.stringify(Object.keys(next).map(id => ({ id, name: next[id].name, photo: next[id].photo })))); } catch (e) { /* a browser that keeps nothing: asked again next time */ }
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
    photo(id, px) {
      const m = members[id];
      return api && m && m.photo ? `${api}/api/games/${encodeURIComponent(game)}/cast/${encodeURIComponent(id)}/photo?v=${m.photo}&width=${widthFor(px)}` : '';
    },
    heard: () => heard,
    refresh,
    remote: () => !!api,
  };
  refresh();
  return cast;
}
