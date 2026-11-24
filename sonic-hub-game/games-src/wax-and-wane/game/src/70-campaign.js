/* ── The campaign: a crossing of the Moon, sea by sea ──
   CONTENT (content/campaign.json, with each opponent's rating from the league and the writer of her bot) is put in
   front of the page's script by the build, and BOTS_AT with it: where the opponents' bots lie beside the page ('' when
   the page carries them all).

   The places are seas of the Moon; in each, people sit who will play. A player has points (15-points.js is the whole
   rule), and the best they have stood at decides who will sit down with them: the light comes on across the map as
   they grow. A game for points moves them, and every one won puts a picture in that opponent's album.

   The players are the game's own, the same few for whoever opens it, kept by the saves service CONTENT.saves names
   (12-save.js talks to it). What the opponents were given there in place of the campaign's own, a name, an age, a
   picture, the pictures of her album, comes through 13-cast.js. The game on the board itself is 60-game.js's: this
   file seats her bot across from the player, listens to each move, and takes over when the game ends. */
const Camp = (() => {
  const VENUES = CONTENT.venues, OPP = CONTENT.opponents, SERVICE = CONTENT.saves || {};
  for (const id in OPP) { const o = OPP[id]; o.id = id; o.own = o.name; o.ownAge = o.age; o.ownPlates = o.plates; }
  for (const v of VENUES) for (const id of v.opponents) OPP[id].venue = v;
  const venueOf = id => VENUES.find(v => v.id === id);
  const OPENS = opensAt(VENUES, OPP);          // the points at which each opponent and each place opens
  World.Chart.road(VENUES.map(v => v.scene));  // the map draws the way from each place to the next
  const CORNER_SQ = [0, 7, 56, 63];
  const BIG = 6;                                // discs turned by one move before she remarks on it
  const LATE = 12;                              // empty squares left when she says what she makes of endings
  let SAVE = null, CAST = null;
  /** The game of the player being played. vs[id]: the games for points against one opponent. match: a game under way.
   *  at: the place last looked at. streak: games for points won one after another. fresh: who and what has opened
   *  and has not been looked at since. */
  const P = { points: START, peak: START, vs: {}, match: null, at: '', streak: 0, fresh: [] };
  /** What the campaign's screens are showing. sure: what was asked once and waits to be asked again. edge: how far
   *  the light stands on the map as it is drawn (see edgeFor). end: what the game just over did. */
  const C = { venue: VENUES[0], opp: null, sure: '', edit: '', note: '', end: null, edge: null, albumOf: '', busy: '' };

  /* ── points and what they open (the sums are in 15-points.js) ── */
  /** An opponent is open once the player's best points have reached what she asks; one who has been played for
   *  points stays open even if the ratings are measured again. A place is open when someone in it is. */
  const isOpen = id => (OPP[id] ? P.peak >= OPENS[id] || !!P.vs[id] : venueOf(id).opponents.some(isOpen));
  const rec = id => P.vs[id] || { w: 0, l: 0, d: 0 };
  const leaves = id => Math.min(OPP[id].plates, rec(id).w);                 // one picture for every game won for points
  const nextSide = id => { const r = rec(id); return (r.w + r.l + r.d) % 2 ? LIGHT : DARK; };   // turn and turn about: Dark moves first
  const beaten = v => v.opponents.filter(id => rec(id).w > 0).length;
  /** What a player is called for the points they stand at: the moon as it fills, and what it may be after that.
   *  Only a name for a number: nothing opens or shuts by it. [from, name, how much of the moon beside the name is
   *  light, the colour that moon takes past full]. */
  const RANKS = [[0, 'New moon', 0.05], [700, 'Young moon', 0.14], [850, 'Crescent', 0.3], [1000, 'Half moon', 0.5], [1150, 'Gibbous moon', 0.76], [1300, 'Full moon', 1],
    [1450, 'Harvest moon', 1, 'rgba(240,150,60,.4)'], [1600, 'Blue moon', 1, 'rgba(90,140,255,.44)'], [1750, 'Blood moon', 1, 'rgba(204,52,40,.5)'], [1900, 'Eclipse', 1, 'eclipse']];
  /** the moon that stands beside a rank, px across */
  function paintRank(c, i, px) {
    const [, , lit, tint] = RANKS[i] || RANKS[0], g = c.getContext('2d');
    c.width = c.height = px;
    if (tint === 'eclipse') {                     // the moon gone dark and red, a ring of light round it
      g.drawImage(paintFace(px, false, 3), 0, 0);
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(150,40,30,.5)'; g.fillRect(0, 0, px, px); g.globalCompositeOperation = 'source-over';
      g.strokeStyle = PAL.goldHi; g.lineWidth = Math.max(1.5, px * 0.045); g.shadowColor = '#ffd98a'; g.shadowBlur = px * 0.09; g.beginPath(); g.arc(px / 2, px / 2, px * 0.41, 0, TAU); g.stroke(); g.shadowBlur = 0;
      return;
    }
    g.drawImage(moonIcon(px, lit, 3), 0, 0);
    if (tint) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = tint; g.fillRect(0, 0, px, px); g.globalCompositeOperation = 'source-over'; }
  }
  function rankOf(pts) {
    let i = 0; while (i + 1 < RANKS.length && pts >= RANKS[i + 1][0]) i++;
    const from = i ? RANKS[i][0] : 500, next = RANKS[i + 1];
    return { i, name: RANKS[i][1], lit: RANKS[i][2], next: next ? next[0] : 0, nextName: next ? next[1] : '', share: next ? Math.max(0.04, Math.min(1, (pts - from) / (next[0] - from))) : 1 };
  }
  /** How far the light has come across the map for a player whose best points are `peak`: 1 the whole face dark,
   *  −1 all of it lit. It stands just past the last place that is open, and moves towards the next one as the points
   *  grow towards what that place asks. */
  function edgeFor(peak) {
    let k = 0; while (k + 1 < VENUES.length && isOpen(VENUES[k + 1].id)) k++;
    if (k === VENUES.length - 1) return -1.06;
    let a = World.Chart.reach(VENUES[k].scene) - 0.1, b = World.Chart.reach(VENUES[k + 1].scene) + 0.04;   // the last place reached stands clear in the light, the next one just short of it
    if (a < b) a = b = (a + b) / 2;
    const span = OPENS[VENUES[k + 1].id] - OPENS[VENUES[k].id];
    return lerp(a, b, span > 0 ? clamp01((peak - OPENS[VENUES[k].id]) / span) : 0);
  }

  /* ── the cast: what she was given in place of the campaign's own ── */
  const worn = () => Object.keys(OPP).map(id => [OPP[id].name, OPP[id].age, CAST.photo(id), ...CAST.plates(id).map(n => n + CAST.plate(id, n))].join('\n')).join('\n\n');
  function wearCast() { for (const id in OPP) { const o = OPP[id]; o.name = CAST.name(id) || o.own; o.age = CAST.age(id) || o.ownAge; o.plates = CAST.plates(id).length || o.ownPlates; } }
  /** What an opponent says or what is said of her, with every {key} in it read as the name that opponent goes by now. */
  const named = text => text.replace(/\{([a-z0-9-]+)\}/g, (all, id) => (OPP[id] ? OPP[id].name : all));

  /* ── keeping ── */
  const newcomer = () => ({ points: START, peak: START, vs: {}, match: null });
  function write() { SAVE.write({ points: P.points, peak: P.peak, vs: P.vs, match: P.match, at: P.at, streak: P.streak, fresh: P.fresh }); }
  /** the game on the board, written down beside the player's points: 60-game.js asks for this after every move */
  function keep() {
    const k = G.camp;
    if (k && G.screen === 'play' && !G.S.over) P.match = { opp: k.opp.id, rated: k.rated, side: k.side, moves: G.S.history.slice() };
    write();
  }
  /** Takes up the game of the player being played, as it was kept: whatever is missing or cannot be right is left
   *  out. False when nobody is being played. */
  function takeUp() {
    const me = SAVE.current(), d = (me && me.data) || {};
    P.points = Number.isFinite(d.points) ? Math.max(FLOOR, Math.round(d.points)) : START;
    P.peak = Math.max(P.points, Number.isFinite(d.peak) ? Math.round(d.peak) : 0);
    P.vs = {}; P.match = null;
    for (const id in d.vs || {}) if (OPP[id]) { const r = d.vs[id] || {}; P.vs[id] = { w: r.w | 0, l: r.l | 0, d: r.d | 0 }; }
    const m = d.match;
    if (m && typeof m === 'object' && OPP[m.opp] && (m.side === DARK || m.side === LIGHT)) { const S = replay(m.moves); if (S && !S.over) P.match = { opp: m.opp, rated: !!m.rated, side: m.side, moves: m.moves.slice() }; }
    P.streak = Math.max(0, d.streak | 0);
    P.fresh = Array.isArray(d.fresh) ? d.fresh.filter(id => typeof id === 'string' && (OPP[id] || venueOf(id)) && isOpen(id)) : [];
    P.at = typeof d.at === 'string' && venueOf(d.at) && isOpen(d.at) ? d.at : '';
    // the place last looked at; for someone who has played but was never asked, the farthest one reached; else where the crossing starts
    C.venue = venueOf(P.at) || (Object.keys(P.vs).length && VENUES.slice().reverse().find(v => isOpen(v.id))) || VENUES[0];
    return !!me;
  }

  /* ── small things the screens are made of ── */
  const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);
  const firstSign = name => esc(Array.from(name.trim() || '?')[0].toUpperCase());
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const lookOf = o => World.lookOf((o.venue || o).scene);
  const narrow = () => matchMedia('(max-width: 980px)').matches;
  /** Her picture for a place in the page, when she has one. The place is painted with her likeness in it, and the
   *  picture is hung over that a moment later, once the place has a width to ask for (hang); a picture that does not
   *  come leaves the likeness standing. size 'full': as large as the screen. */
  const hasPhoto = o => !!CAST.photo(o.id);
  const photo = (o, alt = '', size = '') => (hasPhoto(o) ? `<img data-photo="${o.id}"${size ? ` data-size="${size}"` : ''} alt="${esc(alt)}" decoding="async">` : '');
  const shot = (o, alt = '', size = '', dim = false) => `<span class="shot${hasPhoto(o) ? ' has' : ''}"><canvas data-paint="face:${o.id}"${dim ? ' data-dim="1"' : ''} aria-hidden="true"></canvas>${photo(o, alt, size)}</span>`;
  /** a picture from an album, or the card that stands in for it: a moon, a little fuller with each one */
  function leafCard(o, n, tag = 'button') {
    const place = CAST.plates(o.id)[n - 1], attr = tag === 'button' ? ` type="button" data-leaf="${n}" aria-label="Picture ${n}"` : '';   // the nth picture she was given stands at this place of what the service keeps
    return `<${tag} class="leaf${place ? ' has' : ''}"${attr} style="--her:${lookOf(o).her};--deep:${lookOf(o).deep}"><canvas data-paint="phase:${(0.16 + 0.84 * n / o.plates).toFixed(3)}" aria-hidden="true"></canvas><b>${n}</b>${place ? `<img data-photo="${o.id}" data-n="${place}"${tag === 'button' ? '' : ' data-size="full"'} alt="${esc(o.name)}, picture ${n}" decoding="async">` : ''}</${tag}>`;
  }
  /** Everything in the page that is painted and has not been yet: the map, the pictures of places, likenesses, small
   *  moons. Then the pictures the cast was given are hung over their stand-ins. */
  function paint() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const c of document.querySelectorAll('canvas[data-paint]:not([data-done])')) {
      const w = c.clientWidth, h = c.clientHeight, [kind, arg] = c.dataset.paint.split(':');
      if (!w || !h) continue;
      if (kind === 'map') World.Chart.paint(c, w, dpr, c.dataset.edge !== undefined ? +c.dataset.edge : C.edge === null ? edgeFor(P.peak) : C.edge);
      else if (kind === 'scene') World.scene(c, arg, w, h, dpr);
      else if (kind === 'face') World.face(c, OPP[arg], OPP[arg].venue.scene, w, h, dpr, !!c.dataset.dim);
      else if (kind === 'rank') paintRank(c, +arg, Math.round(Math.min(w, h) * dpr));
      else if (kind === 'phase') { const px = Math.round(Math.min(w, h) * dpr), m = moonIcon(px, +arg, 3); c.width = c.height = px; c.getContext('2d').drawImage(m, 0, 0); }
      c.dataset.done = '1';
    }
    for (const img of document.querySelectorAll('img[data-photo]:not([src])')) {
      const size = img.dataset.size || img.parentElement.clientWidth || undefined;
      const src = img.dataset.n ? CAST.plate(img.dataset.photo, +img.dataset.n, size) : CAST.photo(img.dataset.photo, size);
      if (src) img.src = src; else img.remove();
    }
    drawDiscs();
  }
  const drawn = () => requestAnimationFrame(paint);
  /** the light on the map moves to where the player's points have brought it, rather than jumping there */
  let edgeRaf = 0;
  function lightTo(target, now) {
    cancelAnimationFrame(edgeRaf);
    const c = $('#mapbox canvas[data-paint=map]'), dpr = Math.min(2, window.devicePixelRatio || 1);
    if (C.edge === null || now || REDUCED || !c || Math.abs(C.edge - target) < 0.004) { C.edge = target; if (c && c.dataset.done) World.Chart.paint(c, c.clientWidth, dpr, target); return; }
    const from = C.edge, t0 = performance.now() + 350, ms = 900 + Math.abs(from - target) * 2200;
    const step = t => {
      const k = easeIO(clamp01((t - t0) / ms));
      C.edge = lerp(from, target, k);
      if (c.isConnected && c.clientWidth) World.Chart.paint(c, c.clientWidth, dpr, C.edge);
      if (k < 1 && c.isConnected) edgeRaf = requestAnimationFrame(step); else C.edge = target;
    };
    edgeRaf = requestAnimationFrame(step);
  }
  /** a number counting from one value to another */
  function countUp(el, from, to, ms) {
    if (!el) return;
    if (REDUCED || from === to) { el.textContent = to; return; }
    const t0 = performance.now(), step = t => { const k = easeOut(clamp01((t - t0) / ms)); el.textContent = Math.round(lerp(from, to, k)); if (k < 1 && el.isConnected) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  /** a handful of stars thrown up from a point of the page */
  function burst(x, y, colours) {
    if (REDUCED) return;
    const box = document.createElement('div'); box.className = 'burst'; box.style.left = x + 'px'; box.style.top = y + 'px';
    for (let i = 0; i < 22; i++) { const a = Math.random() * TAU, d = 70 + Math.random() * 190, s = document.createElement('i'); s.style.cssText = `--dx:${(Math.cos(a) * d).toFixed(0)}px;--dy:${(Math.sin(a) * d - 60).toFixed(0)}px;--c:${colours[i % colours.length]};--s:${(7 + Math.random() * 11).toFixed(0)}px;--t:${(0.9 + Math.random() * 0.8).toFixed(2)}s`; box.appendChild(s); }
    document.body.appendChild(box); setTimeout(() => box.remove(), 2000);
  }

  /* ── the strip above everything ── */
  function top() {
    const me = SAVE.current(), s = G.screen, k = G.camp, camp = s === 'who' || s === 'world' || s === 'face' || (s === 'play' && k);
    const first = s === 'world' || (s === 'who' && !me);                                    // the screen the game opens on
    const home = $('#home'); if (home) home.hidden = !first;
    // A game for points is not walked away from: it is played out or given up. The one way out of it leads to the
    // players, for someone else to play, and whoever comes back to it is set down at the board again.
    const bound = s === 'play' && k && k.rated && !G.S.over, waiting = s === 'who' && P.match && P.match.rated;
    const back = $('#back'); back.hidden = first;
    back.innerHTML = `‹ ${bound ? 'Players' : s === 'play' && k ? esc(k.opp.name) : s === 'face' ? esc(C.opp.venue.name) : s === 'play' && G.armed ? 'Leave this game?' : s === 'setup' || s === 'play' ? (me ? 'The Moon' : 'Players') : waiting ? 'Your game' : 'The Moon'}`;
    const chip = $('#me'); chip.hidden = s !== 'world' || !me;
    if (me) chip.innerHTML = `<span class="chip-dot">${firstSign(me.name)}</span><span class="chip-text"><b>${esc(me.name)}</b><small>${rankOf(P.points).name}</small></span>`;
    const pts = $('#pts'); pts.hidden = !camp || s === 'who' || !me; pts.innerHTML = `<b>${P.points}</b><span>points</span>`;
    const st = $('#streak'); st.hidden = pts.hidden || P.streak < 2 || s === 'play'; st.innerHTML = `${icon('comet')}<b>${P.streak}</b>`; st.title = `${P.streak} games for points won in a row`;
  }

  /* ── who is playing ── */
  /** when a player last played, in a word or two */
  function ago(iso) {
    const day = t => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
    const days = Math.round((day(Date.now()) - day(Date.parse(iso))) / 86400000);
    return !(days > 0) ? 'today' : days === 1 ? 'yesterday' : days < 60 ? `${days} days ago` : `${Math.round(days / 30)} months ago`;
  }
  function seatRow(p, me, i) {
    const on = me && me.id === p.id ? ' on' : '';
    if (C.edit === p.id) {
      const begun = on && (P.points !== START || P.peak !== START || P.match || Object.keys(P.vs).length);   // starting over is for whoever is being played, once there is something to lose
      return `<li class="player${on}"><form class="who-form" data-form="rename" data-id="${p.id}"><input class="field" name="name" value="${esc(p.name)}" maxlength="24" autocomplete="off" aria-label="Name"><button type="submit" class="plate">Save</button><span class="who-more">${begun ? `<button type="button" class="link bad" data-act="reset">${C.sure === 'reset' ? 'Sure? Points and pictures go' : 'Start over'}</button>` : ''}<button type="button" class="link bad" data-act="remove-player" data-id="${p.id}">${C.sure === 'remove' ? 'Sure? Remove for good' : 'Remove'}</button><button type="button" class="link" data-act="edit-cancel">Cancel</button></span></form></li>`;
    }
    const points = Number.isFinite(p.data.points) ? Math.max(FLOOR, Math.round(p.data.points)) : START, m = p.data.match, her = m && m.rated && OPP[m.opp], rk = rankOf(points);
    const won = Object.entries(p.data.vs || {}).filter(([id, r]) => OPP[id] && r && r.w > 0), pics = won.reduce((n, [id, r]) => n + Math.min(OPP[id].plates, r.w | 0), 0);
    const tally = won.length ? `${won.length} beaten, ${pics} ${pics === 1 ? 'picture' : 'pictures'} won. ` : '';
    return `<li class="player${on}" style="--i:${i}"><button type="button" class="player-pick" data-player="${p.id}" aria-label="${esc(p.name)}, ${points} points"><canvas class="player-moon" data-paint="rank:${rk.i}" aria-hidden="true"></canvas><span class="player-text"><b>${esc(p.name)}</b><small>${rk.name}</small></span><span class="player-pts"><b>${points}</b><small>points</small></span></button><p class="player-note">${tally}${p.full ? 'Only on this device: there is no room left to keep another player. ' : ''}${her ? `In a game with ${esc(her.name)}. ` : ''}${p.playedAt ? `Played ${ago(p.playedAt)}.` : ''}<button type="button" class="link" data-act="edit" data-id="${p.id}" aria-label="Change ${esc(p.name)}">${icon('pen')}Change</button></p></li>`;
  }
  /** under the players, only when there is something to say: they could not be read, or not all of it is kept yet */
  const seatNote = () => (SAVE.players().length && SAVE.heard() === false ? 'The players cannot be reached just now: these are the names as this device last saw them.' : SAVE.status() === 'waiting' ? 'Not all of it is kept yet. It is tried again by itself.' : '');
  const TIPS = [['star', 'Win for points', 'Beat someone who stands above you and your points leap.'], ['lock', 'Bring the light on', 'Your best points decide who will play you, and how much of the Moon you can reach.'], ['crown', 'Fill her album', 'Every game won for points puts a picture in it.']];
  function renderWho() {
    const list = SAVE.players(), me = SAVE.current(), max = SAVE.max(), heard = SAVE.heard();
    // until the list has been read there may be players in it that are not shown yet: nobody is asked to sign before that
    const lead = list.length ? 'Pick your name and go on from where you were.' : heard === null ? 'Looking for the players…' : heard ? 'Nobody has set out yet. Put your name down.' : 'The players cannot be reached just now. A name put down here is kept as soon as it can be.';
    let h = `<div class="book-moon"><canvas data-paint="map" data-edge="${(me ? edgeFor(P.peak) : edgeFor(START)).toFixed(4)}" role="img" aria-label="The Moon, partly lit"></canvas></div>`;
    h += `<div class="book-body"><div class="book-title"><h1>Wax &amp; Wane</h1><p>Othello, played with moons. Cross the Moon sea by sea, and bring the light with you.</p></div>`;
    h += `<ol class="trail" aria-hidden="true">${VENUES.map(v => `<li style="--her:${World.lookOf(v.scene).her}">${World.sign(v.scene)}</li>`).join('')}</ol>`;
    h += `<h2>Who is playing?</h2><p class="lead">${lead} A player keeps a place on the Moon: the points, the games, the pictures won.</p><ol class="players">${list.map((p, i) => seatRow(p, me, i)).join('')}`;
    if (list.length < max && (list.length || heard !== null)) h += `<li class="player blank"><form class="who-form" data-form="new"><input class="field" name="name" maxlength="24" autocomplete="off" placeholder="Your name" aria-label="A new player’s name"><button type="submit" class="go">Set out</button></form></li>`;
    h += `</ol><p class="who-note" aria-live="polite">${list.length >= max ? 'Every place is taken. Remove a player to start another. ' : ''}${seatNote()}</p>`;
    if (!list.length) h += `<ul class="tips">${TIPS.map(([i, a, b]) => `<li>${icon(i)}<span><b>${a}</b>${b}</span></li>`).join('')}</ul>`;
    h += `<p class="aside"><button type="button" class="link" data-act="free">A game with no points: against a friend at this screen, or the computer</button></p></div>`;
    $('#who').innerHTML = h;
    drawn();
  }
  function toWho() { stop(); C.edit = ''; setPlace(''); renderWho(); show('who'); SAVE.refresh(); }   // whoever set out from somewhere else meanwhile is read in
  /** onto the Moon as the player just picked; a game for points left under way comes first */
  function enter() {
    takeUp(); C.edge = null;
    if (P.match && P.match.rated) { C.opp = OPP[P.match.opp]; startMatch(true, P.match); } else toWorld();
  }
  function startOver() {
    if (C.sure !== 'reset') { C.sure = 'reset'; renderWho(); const t = G.token; setTimeout(() => { if (C.sure === 'reset' && t === G.token && G.screen === 'who') { C.sure = ''; renderWho(); } }, 5000); return; }
    P.points = P.peak = START; P.vs = {}; P.match = null; P.streak = 0; P.fresh = []; P.at = ''; C.sure = ''; C.edit = ''; C.edge = null; write(); takeUp(); renderWho(); top();
  }
  function removePlayer(id) {
    if (C.sure !== 'remove') { C.sure = 'remove'; renderWho(); const t = G.token; setTimeout(() => { if (C.sure === 'remove' && t === G.token && G.screen === 'who') { C.sure = ''; renderWho(); } }, 5000); return; }
    C.sure = ''; C.edit = ''; SAVE.remove(id); takeUp(); renderWho(); top();
  }

  /* ── the map, and the sea picked on it ── */
  /** One opponent among the people of a place: her likeness filling the card, her rating in its corner, her name
   *  over the foot of it. For someone who will play, the other corner shows what beating her for points brings just
   *  now, which is what makes the one standing highest the one to go for, and under her name stand the moons of her
   *  album, one lit for each picture won. For someone who will not play yet: dimmed, with the points at which she will. */
  function card(id, i) {
    const o = OPP[id], open = isOpen(id), got = leaves(id), win = stake(P.points, o.rating, 1), last = o.venue.opponents[o.venue.opponents.length - 1] === id, r = rec(id);
    const begin = !Object.keys(P.vs).length && !P.match && id === VENUES[0].opponents[0];   // nobody played yet: the gentlest of them is where to start
    const corner = open ? `<span class="cd-gain${win >= 40 ? ' high' : ''}" title="What beating her for points brings now">${signed(win)}</span>` : '';
    const under = open ? `<span class="pips" aria-hidden="true">${Array.from({ length: o.plates }, (_, n) => `<i${n < got ? ' class="on"' : ''}></i>`).join('')}</span>` : `<span class="cd-lock">${icon('lock')}Plays at ${OPENS[id]}</span>`;
    const inner = `${shot(o, '', '', !open)}<span class="cd-rate">${last ? icon('crown') : ''}${o.rating}</span>${corner}${P.fresh.includes(id) ? '<span class="cd-new">New</span>' : begin ? '<span class="cd-new">Start here</span>' : r.w ? `<span class="cd-won" title="Beaten">${icon('check')}</span>` : ''}<span class="cd-foot"><b>${esc(o.name)}</b><small>${esc(o.role)}</small>${under}</span>`;
    const style = ` style="--i:${i};--her:${lookOf(o).her};--deep:${lookOf(o).deep}"`;
    if (!open) return `<li class="card locked"${style}><span class="cd">${inner}</span></li>`;
    return `<li class="card${got >= o.plates ? ' done' : ''}${last ? ' crowned' : ''}"${style}><button type="button" class="cd" data-opp="${id}" aria-label="${esc(o.name)}, ${esc(o.role)}, ${o.rating} points. A win brings ${win}. ${got} of ${o.plates} pictures won.">${inner}</button></li>`;
  }
  /** under the player's rank: who opens next, and at what */
  function standLine() {
    const shut = [];
    for (const v of VENUES) { if (!isOpen(v.id)) shut.push(v); else for (const id of v.opponents) if (!isOpen(id)) shut.push(OPP[id]); }
    if (!shut.length) return 'The whole Moon is lit. Everyone on it will play you.';
    const next = shut.reduce((a, c) => (OPENS[c.id] < OPENS[a.id] ? c : a));
    return next.opponents ? `The light reaches the ${esc(next.name)} at <b>${OPENS[next.id]}</b> points.` : `${esc(next.name)} will play you at <b>${OPENS[next.id]}</b> points.`;
  }
  /** under the rank, only when there is something to say: there is no room to keep this player, or what was played
   *  has not been kept yet */
  const keptNote = () => { const me = SAVE.current(); return me && me.full ? 'Only on this device: there is no room left to keep another player.' : SAVE.status() === 'waiting' ? 'Not kept yet. It is tried again by itself.' : ''; };
  function renderWorld() {
    const me = SAVE.current(), rk = rankOf(P.points);
    let h = `<div class="map"><canvas data-paint="map" role="img" aria-label="The Moon. The part you have reached is lit."></canvas>`;
    for (const v of VENUES) {
      const open = isOpen(v.id), state = !open ? 'shut' : P.fresh.includes(v.id) ? 'new' : 'open', [x, y] = World.Chart.spot(v.scene, 100), n = v.opponents.length, done = beaten(v), news = v.opponents.filter(id => P.fresh.includes(id)).length;
      h += `<button type="button" class="spot ${state} tag-${World.lookOf(v.scene).tag}${v.id === C.venue.id ? ' on' : ''}${done === n ? ' all' : ''}" data-venue="${v.id}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;--her:${World.lookOf(v.scene).her};--deep:${World.lookOf(v.scene).deep};--p:${Math.round(done / n * 100)}" aria-label="${esc(v.name)}${open ? `, ${done} of ${n} beaten` : `, in the dark until ${OPENS[v.id]} points`}"${v.id === C.venue.id ? ' aria-current="true"' : ''}>`
        + `<span class="spot-disc">${open ? World.sign(v.scene) : icon('lock')}${news && open ? `<i class="spot-news">${news}</i>` : ''}</span><span class="spot-name">${esc(v.name)}${open ? '' : `<small>${OPENS[v.id]}</small>`}</span></button>`;
    }
    h += '</div>';
    h += `<div class="stand"><canvas class="stand-moon" data-paint="rank:${rk.i}" aria-hidden="true"></canvas><div class="stand-text"><p class="rank"><span>${esc(me.name)}</span><b>${rk.name}</b></p><div class="bar" role="img" aria-label="${rk.next ? `${P.points} of ${rk.next} points to ${rk.nextName}` : 'The highest name there is'}"><i style="width:${Math.round(rk.share * 100)}%"></i></div><p class="hint">${rk.next ? `${rk.nextName} at ${rk.next}. ` : ''}${C.note ? esc(C.note) : standLine()}</p><p class="hint kept-note" aria-live="polite">${keptNote()}</p></div></div>`;
    C.note = '';
    h += `<div class="map-acts">${P.match ? `<button type="button" class="go" data-act="resume">Back to your game with ${esc(OPP[P.match.opp].name)}</button>` : ''}<button type="button" class="link" data-act="free">A game with no points: against a friend, or the computer</button></div>`;
    $('#mapbox').innerHTML = h;
    renderRegion();
  }
  function renderRegion() {
    const v = C.venue, on = isOpen(v.id), look = World.lookOf(v.scene), n = v.opponents.length, done = beaten(v);
    let h = `<header class="rg-head${on ? '' : ' shut'}" style="--her:${look.her};--deep:${look.deep}"><canvas data-paint="scene:${v.scene}" aria-hidden="true"></canvas><div class="rg-shade"></div><div class="rg-title"><span class="rg-sign">${World.sign(v.scene)}</span><h2>${esc(v.name)}</h2><p>${esc(v.line)}</p></div>`;
    h += on ? `<p class="rg-prog${done === n ? ' all' : ''}">${done === n ? icon('check') + 'Everyone here beaten' : `${done} of ${n} beaten`}</p></header><ol class="cards n${n}">${v.opponents.map(card).join('')}</ol>`
      : `<p class="rg-prog">${icon('lock')}In the dark until ${OPENS[v.id]} points</p></header><div class="rg-locked"><p>The light has not come this far yet, and nobody here will sit down with you. Win games for points anywhere on the Moon: at <b>${OPENS[v.id]}</b> points the first of them will.</p><ol class="cards n${n} veiled" aria-hidden="true">${v.opponents.map(card).join('')}</ol></div>`;
    $('#region').innerHTML = h; $('#region').style.setProperty('--her', look.her);
    drawn();
  }
  /** another sea is picked on the map */
  function toVenue(id, scroll) {
    const v = venueOf(id); if (!v) return;
    C.venue = v; C.sure = '';
    if (isOpen(id)) { P.at = id; P.fresh = P.fresh.filter(x => x !== id); write(); }
    for (const b of document.querySelectorAll('#mapbox .spot')) { const on = b.dataset.venue === id; b.classList.toggle('on', on); if (on) { b.setAttribute('aria-current', 'true'); b.classList.remove('new'); } else b.removeAttribute('aria-current'); }
    renderRegion();
    if (scroll && narrow()) $('#region').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
  }
  /** whatever is going on at the board stops here: an answer being thought of is dropped */
  function stop() { G.token++; C.sure = ''; C.busy = ''; Bots.dropAll('the game was left'); View.setInput(null); $('#result').hidden = true; $('#toast').classList.remove('on'); G.camp = null; }
  /** the map drawn again where it stands, because someone's name or picture has changed: the light goes on from
   *  where it was on its way to where it belongs */
  function redrawWorld() { renderWorld(); requestAnimationFrame(() => { paint(); lightTo(edgeFor(P.peak)); }); }
  /** the map; `inside`: someone coming back from a game goes on from the place they were in, not from the top of the page */
  function toWorld(inside) {
    if (!SAVE.current()) return toWho();
    const was = C.edge;
    stop(); setPlace(''); renderWorld(); show('world');
    requestAnimationFrame(() => { paint(); lightTo(edgeFor(P.peak), was === null); });
    if (inside === true && narrow()) $('#region').scrollIntoView({ block: 'start' });
  }

  /* ── one opponent, before a game ── */
  function renderFace() {
    const o = C.opp, r = rec(o.id), got = leaves(o.id), side = nextSide(o.id), look = lookOf(o);
    const held = P.match && P.match.opp === o.id && !P.match.rated;   // a practice game left on the board
    const strip = Array.from({ length: o.plates }, (_, i) => (i < got ? leafCard(o, i + 1) : `<span class="leaf shut${i === got ? ' next' : ''}">${icon('lock')}</span>`)).join('');
    const played = r.w + r.l + r.d ? ` You have won ${r.w} and lost ${r.l} against her${r.d ? `, with ${r.d} drawn` : ''}.` : '';
    $('#face').innerHTML = `<div class="fp" style="--her:${look.her};--deep:${look.deep}">
      <div class="fp-card">
        <div class="fp-side">
          ${hasPhoto(o) ? `<button type="button" class="fp-shot" data-act="portrait" aria-label="${esc(o.name)}, larger">${shot(o, o.name)}</button>` : `<figure class="fp-shot">${shot(o)}</figure>`}
          <div class="strip"><span class="strip-label">Her album: a picture for every game won for points</span><div class="leaves">${strip}</div></div>
          <p class="fp-mind">Her moves are played by <b>${esc(o.bot)}${o.bot.toLowerCase().endsWith(o.level.toLowerCase()) ? '' : ', ' + esc(o.level)}</b>, a bot written by <b>${esc(o.by)}</b>.</p>
        </div>
        <div class="fp-body">
          <p class="fp-where"><span>${World.sign(o.venue.scene)}</span>${esc(o.venue.name)}</p>
          <h2>${esc(o.name)}</h2>
          <p class="fp-facts"><b>${o.rating}</b> points<span>${esc(o.role)}</span><span>Age ${o.age}</span></p>
          <blockquote class="bubble">${esc(named(pick(o.lines.hello)))}</blockquote>
          <p class="fp-about">${esc(named(o.about))}</p>
          <dl class="stakes"><div class="up"><dt>Win</dt><dd>${signed(stake(P.points, o.rating, 1))}</dd></div><div><dt>Draw</dt><dd>${signed(stake(P.points, o.rating, 0.5))}</dd></div><div class="down"><dt>Lose</dt><dd>${signed(stake(P.points, o.rating, 0))}</dd></div></dl>
          <div class="btns2"><button type="button" class="go" data-act="play">Play for points</button><button type="button" class="plate" data-act="${held ? 'resume' : 'practice'}">${held ? 'Back to practice' : 'Practice'}</button></div>
          <p class="fp-note" id="fp-note" aria-live="polite">You play ${SIDE[side]}${side === DARK ? ' and move first' : ', and she moves first'}. With points at stake no move is taken back.${played}</p>
        </div>
      </div></div>`;
    drawn();
  }
  function toFace(id) {
    if (!OPP[id] || !isOpen(id)) return;
    stop(); C.opp = OPP[id]; C.venue = C.opp.venue;
    if (P.fresh.includes(id) || P.at !== C.venue.id) { P.fresh = P.fresh.filter(x => x !== id && x !== C.venue.id); P.at = C.venue.id; write(); }
    setPlace(C.venue.scene); renderFace(); show('face');
    seatBot(C.opp.bot);                                   // her bot is sent for while her page is being read
  }

  function openAlbum(id) {
    const o = OPP[id], got = leaves(id);
    C.albumOf = id;
    $('#album-title').textContent = `${o.name}’s album`;
    $('#album-note').textContent = got >= o.plates ? 'All of it is yours.' : got ? 'One more for every game you win from her for points.' : 'Empty so far. Every game you win from her for points puts a picture in.';
    $('#leaves').innerHTML = Array.from({ length: o.plates }, (_, i) => (i < got ? leafCard(o, i + 1) : `<span class="leaf shut${i === got ? ' next' : ''}">${icon('lock')}<small>${i === got ? 'Your next win' : ''}</small></span>`)).join('');
    $('#album').hidden = false; $('#album').scrollTop = 0;
    drawn();
  }
  const closeAlbum = () => { $('#album').hidden = true; closeView(); };
  /** one picture, as large as the screen lets it be; a tap anywhere puts it away */
  function openView(html) { const v = $('#view'); v.innerHTML = html; v.hidden = false; drawn(); }
  const closeView = () => { $('#view').hidden = true; $('#view').replaceChildren(); };

  /* ── at the board ── */
  /** Her bot, fetched from beside the page the first time she is wanted. Comes back true when it is there. */
  const sent = new Map();
  function seatBot(bot) {
    if (Bots.source(bot) !== null) return Promise.resolve(true);
    if (!sent.has(bot)) sent.set(bot, fetch(BOTS_AT + bot + '.js').then(r => { if (!r.ok) throw new Error(r.status); return r.text(); }).then(src => { if (Bots.source(bot) === null) Bots.load(bot, src); return true; }).catch(() => { sent.delete(bot); return false; }));
    return sent.get(bot);
  }
  /** the place a game is played in lends the page its sky and the board its colour; '': the game's own */
  let placed = '';
  function setPlace(scene) {
    if (placed === scene) return;
    placed = scene;
    const f = scene ? World.lookOf(scene).field : HOME_FIELD;
    PAL.field = f[0]; PAL.fieldHi = f[1]; PAL.fieldLo = f[2];
    Sky.scene = scene; Sky.paint(true); View.fit(true);
  }
  const HOME_FIELD = [PAL.field, PAL.fieldHi, PAL.fieldLo];
  function renderRival() {
    const k = G.camp, el = $('#rival'); if (!k) { el.hidden = true; return; }
    const o = k.opp, r = rec(o.id), look = lookOf(o);
    el.hidden = false; el.style.setProperty('--her', look.her); el.style.setProperty('--deep', look.deep);
    el.innerHTML = `${hasPhoto(o) ? `<button type="button" class="rv-shot" data-act="portrait" aria-label="${esc(o.name)}, larger">${shot(o)}</button>` : `<div class="rv-shot">${shot(o)}</div>`}
      <div class="rv-text"><p class="rv-name"><b>${esc(o.name)}</b><span>${k.rated ? `${o.rating} points` : 'practice'}</span></p><p class="rv-role">${esc(o.role)}${r.w + r.l + r.d ? ` · you ${r.w}, her ${r.l}` : ''}</p>
      <p class="rv-stake">${k.rated ? `<span class="up">Win ${signed(stake(P.points, o.rating, 1))}</span><span class="down">Lose ${signed(stake(P.points, o.rating, 0))}</span>` : '<span>Nothing at stake</span>'}</p></div>
      <p class="bubble" id="said" aria-live="polite">${esc(k.said)}</p>`;
    drawn();
  }
  /** She says one of her lines for `key`, if she has one left that she has not used in this game. A small thing is
   *  let pass when she has only just spoken; `must` is for what nobody would stay quiet about. */
  function speak(key, must = false) {
    const k = G.camp; if (!k) return false;
    const pool = (k.opp.lines[key] || []).filter(t => !k.used.has(t));
    if (!pool.length || (!must && G.S.history.length - k.saidAt < 4)) return false;
    const t = pick(pool);
    k.used.add(t); k.saidAt = G.S.history.length; k.said = named(t);
    const el = $('#said'); if (el) { el.textContent = k.said; if (!REDUCED) { el.classList.remove('new'); el.getBoundingClientRect(); el.classList.add('new'); } }
    return true;
  }
  /** what she makes of the disc just put down (ev: what the move did, as the rules describe it) */
  function react(ev) {
    const k = G.camp; if (!k || !ev || ev.pass || G.S.over) return;
    const mine = ev.side === k.side;
    if (CORNER_SQ.includes(ev.to) && speak(mine ? 'youCorner' : 'iCorner', true)) return;
    if (ev.flips.length >= BIG && speak(mine ? 'youBig' : 'iBig')) return;
    if (G.S.empties <= LATE) speak('late');
  }
  /** a side has no move and misses its turn */
  function passed(side) { const k = G.camp; if (k) speak(side === k.side ? 'youPass' : 'iPass', true); }
  /** what stands under the score while a campaign game is on the board */
  function buttons() {
    const k = G.camp, S = G.S;
    if (S.over) return '<button type="button" class="plate" data-act="result">See the result</button>';
    if (k.rated) return `<button type="button" class="plate${C.sure === 'resign' ? ' bad' : ''}" data-act="resign">${C.sure === 'resign' ? 'Sure? Give it up' : 'Resign'}</button>`;
    return `<button type="button" class="plate" data-act="undo"${canUndo() ? '' : ' disabled'}>Take back</button><button type="button" class="plate" data-act="practice">Start again</button>`;
  }
  /** giving up a game for points: asked twice, then it counts as lost */
  function resign() {
    const k = G.camp; if (G.screen !== 'play' || !k || !k.rated || G.S.over) return;
    if (C.sure !== 'resign') { C.sure = 'resign'; renderHud(); const t = G.token; setTimeout(() => { if (C.sure === 'resign' && t === G.token && !G.S.over) { C.sure = ''; renderHud(); } }, 4000); return; }
    C.sure = ''; G.token++; Bots.dropAll('the game was given up'); View.setInput(null);
    G.S.over = { winner: 1 - k.side, loser: k.side, discs: Array.from(G.S.count), why: 'resign' };
    turn(G.token);
  }
  /** A game against C.opp: for points or for practice; `held` is a game under way to go on with. */
  async function startMatch(rated, held) {
    const o = C.opp, token = ++G.token;
    $('#result').hidden = true; C.sure = '';
    if (Bots.source(o.bot) === null) {
      // her bot is not here yet: her page is where it is waited for
      if (G.screen !== 'face') { View.setInput(null); G.camp = null; C.venue = o.venue; setPlace(o.venue.scene); renderFace(); show('face'); }
      C.busy = o.id; $('#fp-note').textContent = `${o.name} is coming to the table…`;
      for (const b of document.querySelectorAll('#face .btns2 button')) b.disabled = true;
      const there = await seatBot(o.bot);
      if (token !== G.token || C.opp !== o) return;
      C.busy = '';
      if (!there) { renderFace(); $('#fp-note').textContent = `${o.name} could not be reached. Look at the connection, then ask her again.`; snd('no'); return; }
    }
    G.camp = { opp: o, rated, side: held ? held.side : nextSide(o.id), used: new Set(), saidAt: -9, said: '', done: false };
    C.end = null;
    const her = { kind: 'bot', bot: o.bot, level: o.level, name: o.name, label: o.name };
    setPlace(o.venue.scene);
    startGame({ seat: G.camp.side === DARK ? [{ kind: 'human' }, her] : [her, { kind: 'human' }], moves: held ? held.moves : [] });
    if (!held) snd('start');
    renderRival(); speak('start', true); top();
  }
  /** The game is over: what it did to the player's points, and what it opened. */
  function finish() {
    const k = G.camp; if (!k || k.done) return;
    const S = G.S, o = k.opp, w = S.over.winner, score = w < 0 ? 0.5 : w === k.side ? 1 : 0;
    const end = C.end = { score, rated: k.rated, before: P.points, after: P.points, rankWas: rankOf(P.points), leaf: 0, opened: [], said: '', discs: S.over.discs.slice(), why: S.over.why, edgeWas: edgeFor(P.peak) };
    k.done = true; C.sure = '';
    if (k.rated) {
      const was = Object.keys(OPENS).filter(isOpen), had = leaves(o.id), r = P.vs[o.id] = rec(o.id);
      P.points = end.after = Math.max(FLOOR, end.before + stake(end.before, o.rating, score)); P.peak = Math.max(P.peak, P.points);
      if (score === 1) { r.w++; P.streak++; } else { if (score === 0) r.l++; else r.d++; P.streak = 0; }
      if (leaves(o.id) > had) end.leaf = leaves(o.id);
      end.opened = Object.keys(OPENS).filter(id => !was.includes(id) && isOpen(id));
      P.fresh = [...new Set([...P.fresh, ...end.opened])];
    }
    P.match = null; write(); top(); renderRival();
    speak(w < 0 ? 'draw' : w === k.side ? 'lose' : 'win', true); end.said = k.said;
    const t = G.token; setTimeout(() => { if (t === G.token && G.screen === 'play' && G.camp === k) showResult(true); }, REDUCED ? 0 : 1500);
  }
  /** the sheet that says how the game ended and what it brought */
  function showResult(fresh) {
    const e = C.end, k = G.camp; if (!e || !k) return;
    const o = k.opp, look = lookOf(o), kind = e.score === 1 ? 'win' : e.score === 0 ? 'lose' : 'draw', rk = rankOf(e.after), up = rk.i > e.rankWas.i;
    const mine = e.discs[k.side], hers = e.discs[1 - k.side];
    const how = e.why === 'resign' ? `${o.name} takes this one.` : e.score === 0.5 ? `${mine} discs each.` : `${Math.max(mine, hers)} discs to ${Math.min(mine, hers)}.`;
    let h = `<div class="res-band ${kind}" style="--her:${look.her};--deep:${look.deep}"><canvas data-paint="scene:${o.venue.scene}" aria-hidden="true"></canvas><div class="res-shade"></div><h2 id="result-title">${e.score === 1 ? 'Victory' : e.score === 0 ? (e.why === 'resign' ? 'Given up' : 'Defeat') : 'A draw'}</h2><p>${esc(how)}</p></div>`;
    h += `<div class="res-her" style="--her:${look.her};--deep:${look.deep}"><span class="res-face">${shot(o)}</span><blockquote class="bubble">${esc(e.said)}</blockquote></div>`;
    if (e.rated) {
      const d = e.after - e.before;
      h += `<div class="res-pts"><span class="res-label">Your points</span><b id="res-now">${fresh ? e.before : e.after}</b><span class="delta ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d ? signed(d) : 'no change'}</span></div>`;
      h += `<div class="res-rank${up ? ' up' : ''}"><canvas class="res-moon" data-paint="rank:${rk.i}" aria-hidden="true"></canvas><div><p><b>${rk.name}</b>${up ? '<span>A new name</span>' : rk.next ? `<span>${rk.nextName} at ${rk.next}</span>` : ''}</p><div class="bar"><i style="width:${Math.round((fresh ? rankOf(Math.max(e.before, rk.i ? RANKS[rk.i][0] : 500)).share : rk.share) * 100)}%" data-to="${Math.round(rk.share * 100)}"></i></div></div></div>`;
      if (e.leaf) h += `<div class="res-leaf"><div class="flip${fresh ? ' turn' : ''}"><span class="flip-back">${icon('star')}</span>${leafCard(o, e.leaf, 'div')}</div><p><b>${e.leaf === o.plates ? `The last picture of ${esc(o.name)}’s album is yours.` : `A new picture in ${esc(o.name)}’s album.`}</b><small>${e.leaf} of ${o.plates}</small></p></div>`;
      if (e.opened.length) h += `<ul class="res-new">${e.opened.map(id => (OPP[id] ? `<li>${icon('check')}<span><b>${esc(OPP[id].name)}</b> will play you now.</span></li>` : `<li class="place">${icon('star')}<span>The light has reached the <b>${esc(venueOf(id).name)}</b>.</span></li>`)).join('')}</ul>`;
      if (P.streak >= 2 && e.score === 1) h += `<p class="res-streak">${icon('comet')}${P.streak} wins in a row</p>`;
    } else h += '<p class="res-practice">Practice: your points stay where they were.</p>';
    h += `<div class="btns2"><button type="button" class="go" data-act="${e.rated ? 'play' : 'practice'}">Play again</button>${e.rated ? `<button type="button" class="plate" data-act="album">Her album</button>` : `<button type="button" class="plate" data-act="undo"${canUndo() ? '' : ' disabled'}>Take back</button>`}<button type="button" class="plate" data-act="home">The Moon</button></div><button type="button" class="link" data-act="result-close">Look at the board</button>`;
    $('#result-in').innerHTML = h; $('#result-in').className = 'sheet result ' + kind; $('#result').hidden = false; $('#result').scrollTop = 0;
    drawn();
    if (!fresh) return;
    if (e.rated) {
      countUp($('#res-now'), e.before, e.after, 900); if (e.after > e.before) snd('coin');
      requestAnimationFrame(() => requestAnimationFrame(() => { const bar = $('#result .bar i'); if (bar) bar.style.width = bar.dataset.to + '%'; const f = $('#result .flip'); if (f) setTimeout(() => f.classList.remove('turn'), 700); }));
      if (e.opened.length || up) setTimeout(() => snd('open'), 1000);
      C.edge = e.edgeWas;                                 // the map shows the light coming on when it is next looked at
    }
    if (e.score === 1) { const r = $('#result-in').getBoundingClientRect(); burst(r.left + r.width / 2, r.top + 80, [look.her, PAL.goldHi, '#fffdf2', PAL.gold]); }
    const b = $('#result .go'); if (b) b.focus({ preventScroll: true });
  }

  /* ── when the service has something to say ── */
  /** The cast has been heard from, and someone's name or picture may not be what this page was showing. Only then
   *  is anything drawn again, and a game under way goes on undisturbed. */
  function castChanged() {
    const before = worn();
    wearCast();
    if (worn() === before) return;
    if (G.screen === 'world') redrawWorld();
    else if (G.screen === 'face') renderFace();
    else if (G.screen === 'play' && G.camp) { G.seat.forEach(s => { if (s.kind === 'bot') s.name = s.label = G.camp.opp.name; }); top(); renderRival(); renderHud(); }
  }
  /** The list of players changed, or what is kept; or the game of the player being played is now another one,
   *  because it was played on from another device or the player was removed. */
  function savesChanged(what) {
    if (!booted) return;
    if (what === 'replaced') {
      if (G.screen === 'who') { takeUp(); renderWho(); top(); return; }
      if (G.screen === 'setup' || (G.screen === 'play' && !G.camp)) return;      // a game with no points is nobody's: it goes on
      if (!SAVE.current()) return toWho();
      C.note = 'Taken up from where it was left elsewhere.';
      stop(); enter();
      return;
    }
    if (G.screen === 'who') {
      // someone typing a name is not interrupted: only the line under the players is brought up to date
      const typing = document.activeElement && document.activeElement.closest('#who form'), note = $('#who .who-note');
      if (what === 'status' || typing) { if (note) note.textContent = seatNote(); } else renderWho();
    } else if (G.screen === 'world') {
      // the map shows the player being played, whose game has not changed: only what is said of keeping it, and the name
      const note = $('#mapbox .kept-note'), name = $('#mapbox .rank span'), me = SAVE.current();
      if (note) note.textContent = keptNote();
      if (name && me) name.textContent = me.name;
      top();
    }
  }

  /* ── what is pressed ── */
  /** the way back from wherever the page is */
  function back() {
    const s = G.screen, k = G.camp;
    if (s === 'who') return enter();
    if (s === 'setup' || (s === 'play' && !k)) {
      // one press too many should not cost a game that is under way
      if (s === 'play' && G.S.history.length && !G.S.over && !G.forfeit && !G.armed) { G.armed = setTimeout(() => { G.armed = 0; if (G.screen === 'play') { renderHud(); top(); } }, 3200); renderHud(); return top(); }
      clearTimeout(G.armed); G.armed = 0; stop(); Store.write({ cfg: G.cfg, sound: SFX.on, game: null });
      return SAVE.current() ? enter() : toWho();
    }
    if (s === 'play') return k.rated && !G.S.over ? toWho() : toFace(k.opp.id);
    toWorld(true);
  }
  /** A press anywhere in the page: true when it was the campaign's to answer. */
  function click(ev) {
    const t = ev.target, opp = t.closest('[data-opp]'), leaf = t.closest('[data-leaf]'), act = t.closest('[data-act]'), player = t.closest('[data-player]'), spot = t.closest('[data-venue]');
    if (t.closest('#view')) { closeView(); return true; }
    if (player) { snd('pick'); if (SAVE.choose(player.dataset.player)) enter(); return true; }
    if (leaf) { openView(leafCard(OPP[$('#album').hidden ? C.opp.id : C.albumOf], +leaf.dataset.leaf, 'div')); return true; }
    if (opp) { snd('pick'); toFace(opp.dataset.opp); return true; }
    if (spot) { snd(isOpen(spot.dataset.venue) ? 'pick' : 'tick'); toVenue(spot.dataset.venue, true); return true; }
    if (t.id === 'album') { closeAlbum(); return true; }
    if (t.id === 'result') { $('#result').hidden = true; return true; }
    if (!act || act.disabled) return false;
    switch (act.dataset.act) {
      case 'home': toWorld(true); return true;
      case 'back': back(); return true;
      case 'who': toWho(); return true;
      case 'play': startMatch(true); return true;
      case 'practice': startMatch(false); return true;
      case 'resume': if (P.match) { C.opp = OPP[P.match.opp]; startMatch(P.match.rated, P.match); } return true;
      case 'resign': resign(); return true;
      case 'result': showResult(false); return true;
      case 'result-close': $('#result').hidden = true; return true;
      case 'reset': startOver(); return true;
      case 'edit': C.edit = act.dataset.id; C.sure = ''; renderWho(); { const f = $('#who form[data-form=rename] .field'); if (f) { f.focus(); f.select(); } } return true;
      case 'edit-cancel': C.edit = ''; C.sure = ''; renderWho(); return true;
      case 'remove-player': removePlayer(act.dataset.id); return true;
      case 'album': openAlbum(C.opp.id); return true;
      case 'album-close': closeAlbum(); return true;
      case 'portrait': if (C.opp && hasPhoto(C.opp)) openView(`<div class="leaf has">${photo(C.opp, C.opp.name, 'full')}</div>`); return true;
      case 'free': stop(); setPlace(''); toSetup(); top(); return true;
      case 'undo': if (G.camp) { $('#result').hidden = true; G.camp.done = false; C.end = null; } return false;   // the board's own taking back does the rest
    }
    return false;
  }
  function submit(ev) {
    const form = ev.target.closest('form[data-form]');
    if (!form) return;
    ev.preventDefault();
    const field = form.querySelector('.field'), typed = field.value;
    if (form.dataset.form === 'new') {
      if (!typed.trim()) return field.focus();
      if (SAVE.add(typed, newcomer())) { snd('pick'); enter(); } else renderWho();
    } else if (form.dataset.form === 'rename') {
      if (!SAVE.rename(form.dataset.id, typed)) return field.focus();
      C.edit = ''; renderWho();
    }
  }
  /** Escape puts away whatever lies over the page; true when there was something */
  function escape() {
    if (!$('#view').hidden) { closeView(); return true; }
    if (!$('#album').hidden) { closeAlbum(); return true; }
    if (!$('#result').hidden) { $('#result').hidden = true; return true; }
    return false;
  }
  /** the window changed its size: what is painted to a size is painted again */
  function resized() {
    for (const c of document.querySelectorAll('canvas[data-paint]')) delete c.dataset.done;
    paint();
  }

  /* ── opening ── */
  let booted = false;
  /** called by the page once the board stands: `free` is a game with no points left under way, which comes first */
  function boot(free) {
    SAVE = SonicSave({ api: SERVICE.api || '', game: SERVICE.game || 'wax-and-wane', onChange: savesChanged });
    CAST = SonicCast({ api: SERVICE.api || '', game: SERVICE.game || 'wax-and-wane', onChange: castChanged });
    wearCast();
    document.addEventListener('submit', submit);
    document.addEventListener('error', e => {   // a picture that does not come leaves her likeness standing
      const img = e.target, box = img instanceof HTMLImageElement && img.dataset.photo ? img.closest('.shot, .leaf') : null;
      if (!box) return;
      img.remove(); box.classList.remove('has');
      if (box.closest('#view')) closeView();
    }, true);
    addEventListener('pageshow', () => { if (G.screen === 'who') SAVE.refresh(); });
    $('.top').insertAdjacentHTML('afterbegin', '<button type="button" class="home" id="back" data-act="back" hidden></button>');
    $('.top-sp').insertAdjacentHTML('afterend', '<button type="button" class="chip" id="me" data-act="who" title="Another player" hidden></button><span class="streak" id="streak" hidden></span><span class="pts" id="pts" hidden></span>');
    $('#steps').insertAdjacentHTML('afterend', '<p class="lead more">A game for points moves yours by who she is: beating someone who stands above you brings a lot and losing to her costs little, and the other way round against someone below. The best you have ever stood at decides who will play you and how far the light has come across the Moon, and every game won for points puts a picture in her album. You and she take turns at moving first from game to game.</p>');
    // for looking around without earning it: open the page with ?points=1200 and whoever is playing starts from there
    const given = +(new URLSearchParams(location.search).get('points') || NaN);
    if (Number.isFinite(given) && given >= FLOOR) {
      if (takeUp()) { P.points = Math.round(given); P.peak = Math.max(P.peak, P.points); write(); }
      history.replaceState(null, '', location.pathname);
    }
    booted = true;
    if (free) { top(); return startGame(free); }
    if (!SAVE.current()) return toWho();
    enter();
  }

  return { boot, click, escape, resized, top, keep, react, passed, finish, buttons, renderRival, back, OPENS, isOpen, P, C, get SAVE() { return SAVE; }, get CAST() { return CAST; } };
})();
