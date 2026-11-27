/* The campaign: the land as eight windows, each with its fifteen tables along a leaded road (and, in the first four,
   the encore road beside it once it opens); and, once the land's second region is cleared, Mirrorside as five
   silvered windows, its tables along roads that branch where a table opens another for two or three stars. A table
   shows who sits there and the stars won at it; the panel beside the window tells what she plays for, what her table
   may give, and seats the player. The treasure thief sits at a table of Mirrorside; the masked brawler may step in
   when one is chosen. */

const Campaign = (() => {
  let world = 'main', region = null, encore = false, sel = null;
  const S = () => Me.data;
  const rangeText = ([a, b]) => { const lo = Math.floor(a + 0.5), hi = Math.floor(b + 0.5) - 1; return hi > lo ? `${fmt(lo)}–${fmt(hi)}` : fmt(lo); };
  const pips = n => h('span.pips', [0, 1, 2].map(i => h('i' + (i < n ? '.on' : ''))));
  const caps = text => h('div.caps', { style: { fontSize: '13px', color: 'var(--ink2)', marginBottom: '6px' } }, text);
  const mirror = () => world === 'fc';
  const regionsNow = () => (mirror() ? MIRROR_REGIONS : REGIONS);
  const tablesOf = r => (mirror() ? [...r.tables, ...r.bonus] : encore ? r.encore : r.tables);
  const regionStars = r => r.tables.reduce((a, q) => a + starsAt(S(), q.id), 0) + (r.bonus || []).reduce((a, q) => a + starsAt(S(), q.id), 0);

  /** where a road's tables stand in the land's window, in percent: a snake of three rows (or five, in a tall window) */
  function places(n, wide) {
    const out = [];
    for (let k = 0; k < n; k++) {
      if (wide) { const row = Math.floor(k / 5), c = k % 5, col = row % 2 ? 4 - c : c; out.push([10.5 + col * 19.75, 77 - row * 25.5 + Math.sin(k * 1.7) * 3.2]); }
      else { const row = Math.floor(k / 3), c = k % 3, col = row % 2 ? 2 - c : c; out.push([19 + col * 31, 77 - row * 15.2 + Math.sin(k * 1.7) * 1.6]); }
    }
    return out;
  }

  /** Mirrorside's roads in a region: how far along each table lies — the numbered tables in their order, the others
   *  one step past the table that opens them — and the ways between them, with the stars each asks */
  const LAYOUT = {};
  function mirrorRoads(k) {
    if (LAYOUT[k]) return LAYOUT[k];
    const r = MIRROR_REGIONS[k], all = [...r.tables, ...r.bonus], ids = new Set(all.map(q => q.id));
    const ways = [], openers = {};
    for (const q of all) for (const [from, n] of OPENED_BY[q.id] || []) if (ids.has(from)) { ways.push({ from, to: q.id, stars: n }); (openers[q.id] = openers[q.id] || []).push(from); }
    const order = all.filter(q => /^\d+$/.test(q.label) || q.label === 'boss').sort((a, b) => (a.label === 'boss' ? 1e9 : +a.label) - (b.label === 'boss' ? 1e9 : +b.label)).map(q => q.id);
    const rank = Object.fromEntries(order.map((id, i) => [id, i])), depth = {};
    for (const q of all) depth[q.id] = rank[q.id] !== undefined ? rank[q.id] : Infinity;
    for (let it = 0; it < 40; it++) {
      let changed = false;
      for (const q of all) {
        const ops = openers[q.id] || [], via = ops.length ? 1 + Math.min(...ops.map(f => depth[f])) : Infinity;
        const d = rank[q.id] !== undefined ? Math.max(rank[q.id], Number.isFinite(via) ? via : 0) : via;
        if (d !== depth[q.id]) { depth[q.id] = d; changed = true; }
      }
      if (!changed) break;
    }
    const known = Object.values(depth).filter(Number.isFinite), last = known.length ? Math.max(...known) : 0;
    for (const q of all) if (!Number.isFinite(depth[q.id])) depth[q.id] = last + 1;   // a bonus table opened from another region
    const layers = [];
    for (const q of all) (layers[depth[q.id]] = layers[depth[q.id]] || []).push(q.id);
    return (LAYOUT[k] = { ways, layers: layers.map(l => (l || []).sort((a, b) => (rank[a] !== undefined ? -1 : 0) - (rank[b] !== undefined ? -1 : 0))), main: new Set(order) });
  }
  /** where each table of a Mirrorside region stands, in percent of its window. In a wide window the road runs left
   *  to right (in two rows, turning back, when it is long), the tables it opens aside above and below it; in a tall one
   *  it climbs from the bottom, the others to either side, and the window is `tall` pixels high (taller than the
   *  screen when the road needs it, to be scrolled) */
  function mirrorPlaces(k, wide, tall = 0) {
    const { layers, main } = mirrorRoads(k), at = {}, n = layers.length;
    const rows = wide && n > 9 ? 2 : 1, per = Math.ceil(n / rows);
    layers.forEach((layer, d) => {
      const sides = layer.filter(id => !main.has(id)), centre = layer.find(id => main.has(id)), lone = !centre && sides.length === 1;
      let x, y;
      if (wide) {
        const row = Math.floor(d / per), c = d % per, col = row % 2 ? per - 1 - c : c, off = rows === 1 ? 25 : 13;
        x = 7 + (per > 1 ? col / (per - 1) : 0.5) * 86;
        y = rows === 1 ? 50 + Math.sin(d * 1.3 + k) * 6 : (row ? 71 : 31) + Math.sin(d * 1.3 + k) * 2.5;
        if (centre) at[centre] = [x, y];
        sides.forEach((id, i) => { at[id] = lone ? [x, y] : [x + (i === 2 ? 4.5 : 0), clampN(y + [-off, off, -off * 0.5][i], 12, 88)]; });
      } else {
        const pad = 72, span = Math.max(1, tall - pad * 2);
        x = 50 + Math.sin(d * 1.3 + k) * 5;
        y = ((tall - pad - (n > 1 ? d / (n - 1) : 0.5) * span) / tall) * 100;
        if (centre) at[centre] = [x, y];
        sides.forEach((id, i) => { at[id] = lone ? [x, y] : [clampN(x + [-31, 31, -16][i], 13, 87), y + (i === 2 ? 4 : 0)]; });
      }
    });
    return at;
  }

  function show(o = {}) {
    Screens.show('campaign'); purse();
    const s = S();
    if (o.world) world = o.world;
    const q = o.quest && QUEST[o.quest];
    if (q) world = q.type === 'fc' ? 'fc' : 'main';
    if (mirror() && !mirrorOpen(s)) world = 'main';
    if (mirror()) {
      const was = s.goldie.at, how = goldieUpdate(s);
      if (how) Me.write();
      if ((how === 'came' || how === 'moved') && s.goldie.at !== was) { const at = MIRROR_OF[s.goldie.at]; toast(`Goldie has slipped in at ${tableLabel(s.goldie.at)} of ${MIRROR_REGIONS[at.region].name}, a treasure under her arm.`); }
    }
    if (q && mirror() && MIRROR_OF[q.id]) { region = MIRROR_OF[q.id].region; sel = q.id; }
    else if (q && !mirror() && REGION_OF[q.id]) { const at = REGION_OF[q.id]; region = at.region; encore = at.encore; sel = q.id; }
    else if (o.world || region === null || region >= regionsNow().length) region = null;
    if (mirror()) {
      if (region === null || !mirrorRegionOpen(s, region)) { const n = nextMirrorTable(s) || QUEST[MIRROR.first]; region = MIRROR_OF[n.id].region; sel = n.id; }
    } else if (region === null || !regionOpen(s, region)) { const n = nextTable(s) || QUEST['1'], at = REGION_OF[n.id]; region = at.region; encore = at.encore; sel = n.id; }
    if (mirror()) encore = false;
    tabs(); draw();
  }

  function tabs() {
    const s = S(), box = $('#region-tabs'); box.innerHTML = '';
    if (mirror()) box.append(h('button.rtab.world', { onclick: () => { world = 'main'; region = null; sel = null; show(); } }, h('span.disc.land'), h('span', '‹ The land'), h('small', `★ ${starsTotal(s)}`)));
    regionsNow().forEach((r, k) => {
      const open = mirror() ? mirrorRegionOpen(s, k) : regionOpen(s, k), disc = h('span.disc');
      (mirror() ? Pictures.mirror : Pictures.region).call(Pictures, k, true, url => { disc.style.backgroundImage = `url(${url})`; });
      const all = mirror() ? r.tables.length + r.bonus.length : r.tables.length;
      const b = h('button.rtab' + (k === region ? '.on' : '') + (open ? '' : '.locked') + (mirror() ? '.silver' : ''), { title: r.name, onclick: () => {
        if (!open) { toast(mirror() ? `${r.name} opens further along Mirrorside's roads.` : `${r.name} opens when the last table of ${REGIONS[k - 1].name} is won.`); return; }
        region = k; encore = false; sel = null; tabs(); draw();
      } }, disc, h('span', r.name), h('small', open ? `★ ${regionStars(r)} / ${all * 3}` : 'Not yet'));
      box.append(b);
      if (k === region) requestAnimationFrame(() => b.scrollIntoView({ block: 'nearest', inline: 'center' }));
    });
    if (!mirror()) {
      const open = mirrorOpen(s), disc = h('span.disc');
      Pictures.mirror(0, true, url => { disc.style.backgroundImage = `url(${url})`; });
      box.append(h('button.rtab.world.silver' + (open ? '' : '.locked'), { title: 'Mirrorside', onclick: () => {
        if (!open) { toast(`Mirrorside opens when you win table 15 of ${REGIONS[1].name}.`); return; }
        world = 'fc'; region = null; sel = null; show();
      } }, disc, h('span', 'Mirrorside ›'), h('small', open ? `★ ${mirrorStars(s)} / ${FC.length * 3}` : 'Not yet')));
    }
  }

  /** a table's name on its road: its number, or what kind of table it is */
  function tableLabel(id) {
    const q = QUEST[id];
    if (MIRROR_OF[id]) return q.label === 'boss' ? 'the boss table' : q.label === 'bonus' ? 'the bonus table' : /^\d+$/.test(q.label) ? `table ${q.label}` : 'a side table';
    const at = REGION_OF[id];
    return at ? `${at.encore ? 'encore table' : 'table'} ${at.at + 1}` : 'a table';
  }

  function draw() {
    const s = S(), r = regionsNow()[region], list = tablesOf(r), map = $('#map');
    $('#region-name').textContent = r.name;
    map.innerHTML = ''; map.classList.toggle('silver', mirror()); map.classList.remove('scrolly'); map.scrollTop = 0;
    const box = map.getBoundingClientRect(), wide = box.width >= box.height * 0.95;
    // a long Mirrorside road in a tall window gets a window taller than the screen, scrolled
    const tall = mirror() && !wide ? Math.max(box.height, mirrorRoads(region).layers.length * 86 + 150) : 0;
    let pane = map;
    if (tall > box.height + 1) { map.classList.add('scrolly'); pane = h('div.mapin', { style: { height: tall + 'px' } }); map.append(pane); }
    const art = h('img.art', { alt: '' }); (mirror() ? Pictures.mirror : Pictures.region).call(Pictures, region, wide, url => { art.src = url; }); pane.append(art);
    const next = mirror() ? nextMirrorTable(s) : nextTable(s), nextId = next && next.id;
    if (!sel || !list.some(q => q.id === sel)) sel = (list.find(q => q.id === nextId) || list.find(q => tableOpen(s, q.id) && starsAt(s, q.id) < 3) || list[0]).id;
    // the roads, and how far along them the wins have come
    const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'trail'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none');
    const line = (pts, cls) => { const pl = document.createElementNS(NS, 'polyline'); pl.setAttribute('points', pts.map(p => p.join(',')).join(' ')); pl.setAttribute('class', cls); svg.append(pl); };
    let at;
    if (mirror()) {
      const pos = mirrorPlaces(region, wide, tall), { ways } = mirrorRoads(region);
      at = list.map(q => pos[q.id]);
      for (const w of ways) { const a = pos[w.from], b = pos[w.to]; line([a, b], 'lead' + (w.stars > 1 ? ' gated' : '')); line([a, b], 'glass' + (w.stars > 1 ? ' gated' : '')); if (starsAt(s, w.from) >= w.stars) line([a, b], 'done'); }
      pane.append(svg);
      for (const w of ways) if (w.stars > 1) {
        const a = pos[w.from], b = pos[w.to];
        pane.append(h('span.gate' + (starsAt(s, w.from) >= w.stars ? '.got' : ''), { style: { left: (a[0] + b[0]) / 2 + '%', top: (a[1] + b[1]) / 2 + '%' }, title: `Opens with ${w.stars} stars at the table before it` }, '★'.repeat(w.stars)));
      }
    } else {
      at = places(list.length, wide);
      line(at, 'lead'); line(at, 'glass');
      const won = list.findIndex(q => !starsAt(s, q.id)), upto = won < 0 ? list.length : won;
      if (upto > 1) line(at.slice(0, upto), 'done');
      map.append(svg);
    }
    const thief = mirror() && s.goldie.at ? s.goldie.at : '';
    list.forEach((q, k) => {
      const open = tableOpen(s, q.id), st = starsAt(s, q.id), hero = HERO[q.hero], medal = h('span.medal');
      if (open) medal.append(faceEl(hero, 66));
      const num = mirror() ? (q.label === 'boss' ? '♛' : q.label === 'bonus' ? '✦' : /^\d+$/.test(q.label) ? q.label : '·') : String(k + 1);
      const node = h('button.node' + (open ? '' : '.locked') + (q.id === nextId ? '.next' : '') + (q.id === sel ? '.sel' : '') + (encore ? '.encore' : '') + (q.label === 'bonus' ? '.bonus' : '') + (q.id === thief ? '.thief' : ''),
        { style: { left: at[k][0] + '%', top: at[k][1] + '%', '--nd': phone() ? '50px' : '64px' }, title: open ? `${nameOf(hero.cast)} · rank ${q.rank}` : 'Not open yet', onclick: () => pick(q.id) },
        medal, h('span.tag', h('span', num), pips(st)));
      if (q.id === thief) node.append(h('span.thiefface', { title: 'Goldie is here with a treasure' }, faceEl(HERO[QUEST[s.goldie.table].hero], 30)));
      else if (open && q.heroAwarded && s.heroes[q.heroAwarded] === undefined && !st) node.append(h('span.gift', { title: 'She joins you when you first win here' }, '+'));
      else if (open && RECRUIT.has(q.hero) && s.heroes[q.hero] === undefined) node.append(h('span.gift.maybe', { title: 'Each win here may bring her over to you' }, '?'));
      pane.append(node);
    });
    // what this region is, and its roads
    const top = h('div.map-top');
    top.append(h('div.glasslabel', phone() ? '' : h('em', r.line), h('b', encore ? `Encore · ★ ${r.encore.reduce((a, q) => a + starsAt(s, q.id), 0)} / 45` : `★ ${regionStars(r)} / ${list.length * 3}`)));
    if (!mirror() && r.encore.length) {
      const eOpen = tableOpen(s, r.encore[0].id);
      top.append(h('div.road', h('button' + (!encore ? '.on' : ''), { onclick: () => { encore = false; sel = null; draw(); } }, 'Main road'),
        h('button' + (encore ? '.on' : ''), { disabled: !eOpen, title: eOpen ? 'The same tables, reset with new decks and new stars to win' : `Opens when you win the last table of ${REGIONS[0].name}`, onclick: () => { encore = true; sel = null; draw(); } }, 'Encore')));
    }
    const work = commissionsRibbon(mirror() ? 'fc' : 'main');
    if (work) top.append(work);
    pane.append(top);
    if (!mirror() && !encore) {
      const M = CAMPAIGN.milestones, cl = M.clear[region + 1], gl = M.glazed[region + 1], foot = h('div.map-foot');
      const names = ids => ids.map(id => ROW[id].name).join(' and ');
      foot.append(h('span' + (regionCleared(s, region) ? '.got' : ''), (regionCleared(s, region) ? '✓ ' : '') + `Win the last table: ${names(cl.recipes)} at the Kiln`));
      foot.append(h('span' + (regionGlazed(s, region) ? '.got' : ''), (regionGlazed(s, region) ? '✓ ' : '') + `Every table at three stars: ${ROW[gl.card].name}` + (gl.recipes.length ? `, and ${names(gl.recipes)} at the Kiln` : '')));
      map.append(foot);
    } else if (mirror() && !tall) {
      const foot = h('div.map-foot');
      if (velvetOpen(s)) foot.append(h('span', `The masked brawler is about: round ${s.velvet.round} of ${ROUNDS.length}, ready to step in at any table.`));
      else if (s.velvet.round > ROUNDS.length) foot.append(h('span.got', '✓ Every round against the masked brawler won'));
      if (thief) { const g = MIRROR_OF[thief]; foot.append(h('span', `Goldie sits at ${tableLabel(thief)} of ${MIRROR_REGIONS[g.region].name}` + (g.region === region ? '' : ' — another window') + '.')); }
      else if (goldieOpen(s)) foot.append(h('span', `Goldie is away: she comes back after ${Math.max(1, GOLDIE.every + 1 - (mirrorDone(s) - s.goldie.back))} more battles at Mirrorside.`));
      if (foot.childNodes.length) map.append(foot);
    }
    if (pane !== map) requestAnimationFrame(() => { const n = map.querySelector('.node.sel') || map.querySelector('.node.next'); if (n) map.scrollTop = n.offsetTop - map.clientHeight * 0.55; });
    side(sel, false);
  }

  /** the commissions of a road, as a small window of their own; null when there are none */
  function commissionsRibbon(road) {
    const s = S(), list = activeCommissions(s, road);
    if (!list.length) return null;
    return h('div.work', list.map(c => h('button', { title: c.line, onclick: () => commissionLook(c.id) }, h('i.piece.' + road), h('span', c.name), h('b', `${s.commissions[c.id].got} / ${c.need}`))));
  }
  function commissionLook(id) {
    const s = S(), c = COMMISSION[id], w = s.commissions[id], pop = $('#deck-pop') || document.body.appendChild(h('div.modal#deck-pop'));
    pop.innerHTML = '';
    const card = cardEl(ROW[c.reward]); card.style.setProperty('--w', '190px');
    pop.append(h('div.plate', { style: { width: 'min(460px, 94vw)', display: 'grid', justifyItems: 'center', gap: '10px', textAlign: 'center' } },
      h('h3', c.name), h('p.note', c.line),
      h('div.workbar', h('i', { style: { width: (w.got / c.need) * 100 + '%' } })), h('b', `${w.got} of ${piecesOf(c, c.need)}`),
      h('p.note', `Her creatures leave them now and then when they fall at ${c.world === 'fc' ? 'Mirrorside' : 'the land'}'s tables — no more than ${c.perTable} at any one table. They are yours only if you win.`),
      caps('When it is done'), card,
      h('button.jewel.small.quiet', { onclick: () => pop.classList.remove('on') }, 'Close')));
    pop.onclick = e => { if (e.target === pop) pop.classList.remove('on'); };
    pop.classList.add('on');
  }

  function pick(id) {
    sel = id;
    for (const n of $$('#map .node')) n.classList.remove('sel');
    const k = tablesOf(regionsNow()[region]).findIndex(q => q.id === id), node = $$('#map .node')[k];
    if (node) node.classList.add('sel');
    side(id, true);
  }

  /** what opens a table, in words */
  function openedByText(id) {
    const by = (OPENED_BY[id] || []).slice().sort((a, b) => a[1] - b[1])[0];
    if (!by) return id === MIRROR.first ? `It opens with Mirrorside, when you win table 15 of ${REGIONS[1].name}.` : 'It opens further along the road.';
    const [from, n] = by, stars = n > 1 ? ` with ${n} stars` : '';
    if (MIRROR_OF[from]) { const f = MIRROR_OF[from], here = MIRROR_OF[id]; return `It opens when you win ${tableLabel(from)}${here && f.region === here.region ? '' : ' of ' + MIRROR_REGIONS[f.region].name}${stars}.`; }
    const f = REGION_OF[from], here = REGION_OF[id];
    return f ? `It opens when you win ${tableLabel(from)}${here && f.region === here.region ? '' : ' of ' + REGIONS[f.region].name}${stars}.` : 'It opens further along the road.';
  }

  function side(id, opened) {
    const s = S(), q = QUEST[id], el = $('#table-side');
    el.innerHTML = ''; el.scrollTop = 0; el.append(sheetCloser(el));
    const r = mirror() ? MIRROR_REGIONS[MIRROR_OF[id].region] : REGIONS[REGION_OF[id].region];
    const label = `${tableLabel(id).replace(/^./, c => c.toUpperCase())} of ${r.name}`;
    if (!tableOpen(s, id)) {
      el.append(h('div.face-big', { style: { background: 'radial-gradient(circle at 40% 35%, #9a92a6, #4a4454)' } }), h('h3', 'Not open yet'), h('div.sub', label),
        h('p.note', { style: { textAlign: 'center' } }, openedByText(id)));
      if (opened) sheetOpen(el);
      return;
    }
    if (mirror() && phone()) {
      const notes = [];
      if (velvetOpen(s)) notes.push(`The masked brawler is about: round ${s.velvet.round} of ${ROUNDS.length}, ready to step in at any table.`);
      if (s.goldie.at && s.goldie.at !== id) { const g = MIRROR_OF[s.goldie.at]; notes.push(`Goldie sits at ${tableLabel(s.goldie.at)} of ${MIRROR_REGIONS[g.region].name}.`); }
      for (const n of notes) el.append(h('p.note.aside', n));
    }
    if (mirror() && s.goldie.at === id) el.append(goldieBlock());
    const hero = HERO[q.hero], person = CONTENT.cast.people[hero.cast], st = starsAt(s, id);
    el.append(h('div.face-big', faceEl(hero, 120)), h('h3', nameOf(hero.cast)), h('div.sub', (hero.form ? hero.form + ' · ' : '') + person.role),
      h('p.hello', `“${person.lines.hello}”`),
      h('div.facts', h('span', label), h('span', 'Rank ' + q.rank), h('span', rangeText(q.xp) + ' XP'), h('span', h('i.coin'), rangeText(q.coins)),
        s.wins[id] ? h('span', `Won ${s.wins[id]}×`) : ''));
    const stars = h('div.starlist');
    q.conditions.forEach((c, i) => stars.append(h('div' + (i === st ? '.now' : ''), h('i' + (i < st ? '.on' : '')), conditionText(c))));
    el.append(h('div', caps(st >= 3 ? 'Every star of this table is yours' : 'Her stars, one a win, in order'), stars),
      st < 3 ? h('p.note', `The third star brings a Jewel. After each win you turn over one card for every star of this table.`) : h('p.note', 'After each win here you turn over three cards.'));
    // what winning here opens
    const opens = q.unlocks.map((list, k) => [list.split(/[ ,;]+/).filter(x => MIRROR_OF[x] || REGION_OF[x]), k + 1]).filter(([l]) => l.length);
    const elsewhere = [...new Set(opens.flatMap(([l]) => l).map(x => (MIRROR_OF[x] ? MIRROR_REGIONS[MIRROR_OF[x].region] : REGIONS[REGION_OF[x].region])).filter(x => x !== r).map(x => x.name))];
    if (elsewhere.length) el.append(h('p.note', h('b', 'The road goes on: '), `winning here also opens the way to ${elsewhere.join(' and ')}.`));
    if (q.heroRules === 'allow') el.append(h('p.note', h('b', 'Only '), `${q.restricted.map(x => heroTitle(HERO[x])).join(' or ')} may sit at this table.`));
    const drops = tableDrops(q);
    if (drops.length) {
      const row = h('div.drops');
      for (const cid of drops) { const c = cardEl(ROW[cid], { mini: true }); c.title = cardName(cid) + (ownCount(s, cid) ? ` · you have ${ownCount(s, cid)}` : ''); c.onclick = () => lookCard(cid); row.append(c); }
      el.append(h('div', caps(`Her creatures may leave, up to ${q.maxLoot} a battle`), row));
    }
    if (id === MIRROR.first && !st) el.append(h('p.note', h('b', 'The first card here '), `is always ${ROW[MIRROR.firstCard].name}, the first time.`));
    if (q.heroAwarded && s.heroes[q.heroAwarded] === undefined) el.append(h('p.note', h('b', `${heroTitle(HERO[q.heroAwarded])} joins you`), ' when you first win here.'));
    else if (RECRUIT.has(q.hero) && s.heroes[q.hero] === undefined) {
      const tries = s.recruit[q.hero] || 0;
      el.append(h('p.note', h('b', `Each win over her may bring her over to you`), ` — next time ${Math.round(Math.min(1, (tries + 1) / RECRUIT_SURE) * 100)}% likely, and the fifth win surely.`));
    }
    el.append(h('p.note', h('b', 'Her gift: '), hero.text));
    el.append(sitbar(q, () => sit(q), () => show({ quest: id })));
    if (opened) sheetOpen(el);
  }

  /** where Goldie sits: who she is, what her treasure table pays, and the way to face her */
  function goldieBlock() {
    const s = S(), t = QUEST[s.goldie.table], her = HERO[t.hero], person = CONTENT.cast.people[her.cast], recipe = DATA.recipes.find(x => x.unlock === t.id);
    const hoard = [...new Set(Catalog.decks[GOLDIE.hoard].cards.filter(r => r[4] > 0).map(r => Catalog.order[r[0]]))];
    const row = h('div.drops');
    for (const cid of hoard) { const c = cardEl(ROW[cid], { mini: true }); c.title = cardName(cid); c.onclick = () => lookCard(cid); row.append(c); }
    const k = deckFor(s, t), issues = tableIssues(s, t, s.decks[k]);
    return h('div.goldie',
      h('div.row', { style: { gap: '12px', alignItems: 'center' } }, h('div.face-small', faceEl(her, 64)), h('div', h('b', `${nameOf(her.cast)} is sitting here`), h('br'), h('small', person.role))),
      h('p.hello', `“${person.lines.hello}”`),
      h('div.facts', h('span', 'Rank ' + t.rank), h('span', rangeText(t.xp) + ' XP'), h('span', h('i.coin'), rangeText(t.coins)), h('span', `Treasure ${GOLDIE.tables.indexOf(t.id) + 1} · ${'★'.repeat(starsAt(s, t.id)) || 'not yet won'}`)),
      caps('Beat her and one of her hoard is yours'), row,
      recipe && !starsAt(s, t.id) ? h('p.note', h('b', 'Her treasure: '), `winning it opens ${ROW[recipe.card].name} at the Kiln.`) : '',
      h('p.note', `She moves on after ${goldieStays(s)} more battle${goldieStays(s) > 1 ? 's' : ''} at Mirrorside; once you face her she is gone for a while.`),
      issues.length ? h('div.warn', issues[0]) : '',
      h('button.jewel.go', { disabled: issues.length > 0, onclick: () => { s.deck = k; sitAt(t, { mode: 'goldie', from: s.goldie.at }); } }, `Face ${nameOf(her.cast)}`));
  }

  /** the player's side of a table: a deck to bring, what keeps it, and the seat */
  function sitbar(q, go, back) {
    const s = S(), k = deckFor(s, q), pickDeck = h('select.pick', { onchange: e => { s.deck = Number(e.target.value); Me.write(); back(); } });
    s.decks.forEach((d, i) => pickDeck.append(h('option', { value: i, selected: i === k }, `${d.name} · ${heroTitle(HERO[d.hero])} · ${d.cards.length} cards`)));
    const mine = s.decks[k], rank = heroRank(s, mine.hero), issues = tableIssues(s, q, mine), hardOnly = issues.length && sitBlock(s, q, mine);
    return h('div.sitbar', pickDeck,
      h('p.note', `${heroTitle(HERO[mine.hero])} at rank ${rank}: ${10 + 5 * rank} health, up to ${deckMax(rank)} cards.`),
      issues.length ? h('div.warn', issues.join(' ')) : '',
      h('div.row', h('button.jewel.go', { disabled: issues.length > 0, onclick: () => { s.deck = k; go(); } }, 'Sit down'),
        issues.length && !hardOnly ? h('button.jewel.small.quiet', { onclick: () => Decks.edit(k, back) }, 'Fix the deck') : issues.length ? h('button.jewel.small.quiet', { onclick: () => Decks.list() }, 'Decks') : ''));
  }

  /** the seat taken: at Mirrorside the masked brawler may take the table's place */
  function sit(q) {
    const s = S(), deck = s.decks[s.deck], r = velvetRound(s);
    if (q.type === 'fc' && r && !sitBlock(s, QUEST[r.quest], deck)) {
      const her = velvetSteps(s, q);
      if (her) { Me.write(); velvetIntro(her, r).then(() => sitAt(her, { mode: 'velvet', from: q.id })); return; }
    }
    sitAt(q);
  }
  function sitAt(q, o = {}) {
    $('#table-side').classList.remove('open');
    Battle.start(Object.assign({ quest: q, deck: Me.data.deck }, o), after => {
      if (after && after.again) { const t = QUEST[after.again]; if (t && tableOpen(Me.data, t.id) && (t.type === 'main' || t.type === 'fc')) { sit(t); return; } }
      show({ quest: o.from || (after && after.next) || q.id });
    });
  }
  /** the masked brawler steps in: her round, what it is worth, and her word */
  function velvetIntro(q, r) {
    const pop = $('#ask'), inn = $('#ask-in'), her = HERO[q.hero], person = CONTENT.cast.people[her.cast], p = r.prize;
    return new Promise(res => {
      inn.innerHTML = '';
      inn.append(h('div.velvet',
        h('div.caps', `Round ${r.round} of ${ROUNDS.length}`),
        h('div.result-face', faceEl(her, 120)),
        h('h3', `${nameOf(her.cast)} steps in`),
        h('p.said', `“${person.lines.hello}”`),
        h('p.note', `She takes the table's place for this battle. Beat her and the round is yours: ` + (p.card ? `${cardName(p.card)}.` : p.jewels ? `${p.jewels} Jewels.` : `${fmt(p.coins)} coins.`)),
        p.card ? (() => { const c = cardEl(ROW[p.card], { mini: true }); return h('div.row', { style: { justifyContent: 'center' } }, c); })() : '',
        h('div.row', { style: { justifyContent: 'center' } }, h('button.jewel.go', { onclick: () => { pop.classList.remove('on'); res(); } }, 'Face her'))));
      pop.classList.add('on');
    });
  }

  function lookCard(id) {
    const pop = $('#deck-pop') || document.body.appendChild(h('div.modal#deck-pop'));
    pop.innerHTML = '';
    const c = cardEl(ROW[id]); c.style.setProperty('--w', '230px');
    pop.append(h('div.plate', { style: { width: 'auto', display: 'grid', justifyItems: 'center', gap: '12px' } }, c,
      h('p.note', ownCount(Me.data, id) ? `You have ${ownCount(Me.data, id)}.` : 'You have none yet.'),
      h('button.jewel.small.quiet', { onclick: () => pop.classList.remove('on') }, 'Close')));
    pop.onclick = e => { if (e.target === pop) pop.classList.remove('on'); };
    pop.classList.add('on');
  }

  addEventListener('resize', () => { if (Screens.now === 'campaign') { clearTimeout(Campaign._rt); Campaign._rt = setTimeout(draw, 200); } });
  return { show, lookCard, sitbar, commissionLook, tableLabel, _rt: 0 };
})();
