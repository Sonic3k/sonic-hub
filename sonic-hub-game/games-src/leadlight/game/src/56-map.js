/* The campaign: the land as eight windows, each with its fifteen tables along a leaded road (and, in the first four,
   the encore road beside it once it opens). A table shows who sits there and the stars won at it; the panel beside
   the window tells what she plays for, what her table may give, and seats the player. */

const Campaign = (() => {
  let region = null, encore = false, sel = null;
  const S = () => Me.data;
  const rangeText = ([a, b]) => { const lo = Math.floor(a + 0.5), hi = Math.floor(b + 0.5) - 1; return hi > lo ? `${fmt(lo)}–${fmt(hi)}` : fmt(lo); };
  const pips = n => h('span.pips', [0, 1, 2].map(i => h('i' + (i < n ? '.on' : ''))));

  /** where a road's tables stand in the window, in percent: a snake of three rows (or five, in a tall window) */
  function places(n, wide) {
    const out = [];
    for (let k = 0; k < n; k++) {
      if (wide) { const row = Math.floor(k / 5), c = k % 5, col = row % 2 ? 4 - c : c; out.push([10.5 + col * 19.75, 77 - row * 25.5 + Math.sin(k * 1.7) * 3.2]); }
      else { const row = Math.floor(k / 3), c = k % 3, col = row % 2 ? 2 - c : c; out.push([19 + col * 31, 77 - row * 15.2 + Math.sin(k * 1.7) * 1.6]); }
    }
    return out;
  }

  function show(o = {}) {
    Screens.show('campaign'); purse();
    const s = S();
    if (o.quest && REGION_OF[o.quest]) { const at = REGION_OF[o.quest]; region = at.region; encore = at.encore; sel = o.quest; }
    if (region === null || !regionOpen(s, region)) { const n = nextTable(s) || QUEST['1'], at = REGION_OF[n.id]; region = at.region; encore = at.encore; sel = n.id; }
    tabs(); draw();
  }

  function tabs() {
    const s = S(), box = $('#region-tabs'); box.innerHTML = '';
    REGIONS.forEach((r, k) => {
      const open = regionOpen(s, k), stars = r.tables.reduce((a, q) => a + starsAt(s, q.id), 0), disc = h('span.disc');
      Pictures.region(k, true, url => { disc.style.backgroundImage = `url(${url})`; });
      const b = h('button.rtab' + (k === region ? '.on' : '') + (open ? '' : '.locked'), { title: r.name, onclick: () => {
        if (!open) { toast(`${r.name} opens when the last table of ${REGIONS[k - 1].name} is won.`); return; }
        region = k; encore = false; sel = null; tabs(); draw();
      } }, disc, h('span', r.name), h('small', open ? `★ ${stars} / 45` : 'Not yet'));
      box.append(b);
      if (k === region) requestAnimationFrame(() => b.scrollIntoView({ block: 'nearest', inline: 'center' }));
    });
  }

  function draw() {
    const s = S(), r = REGIONS[region], list = encore ? r.encore : r.tables, map = $('#map');
    $('#region-name').textContent = r.name;
    map.innerHTML = '';
    const box = map.getBoundingClientRect(), wide = box.width >= box.height * 0.95;
    const art = h('img.art', { alt: '' }); Pictures.region(region, wide, url => { art.src = url; }); map.append(art);
    const at = places(list.length, wide), next = nextTable(s), nextId = next && next.id;
    if (!sel || !list.some(q => q.id === sel)) sel = (list.find(q => q.id === nextId) || list.find(q => tableOpen(s, q.id) && starsAt(s, q.id) < 3) || list[0]).id;
    // the road, and how far along it the wins have come
    const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'trail'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none');
    const line = (pts, cls) => { const pl = document.createElementNS(NS, 'polyline'); pl.setAttribute('points', pts.map(p => p.join(',')).join(' ')); pl.setAttribute('class', cls); svg.append(pl); };
    line(at, 'lead'); line(at, 'glass');
    const won = list.findIndex(q => !starsAt(s, q.id));
    const upto = won < 0 ? list.length : won;
    if (upto > 1) line(at.slice(0, upto), 'done');
    map.append(svg);
    list.forEach((q, k) => {
      const open = tableOpen(s, q.id), st = starsAt(s, q.id), hero = HERO[q.hero], medal = h('span.medal');
      if (open) medal.append(faceEl(hero, 66));
      const node = h('button.node' + (open ? '' : '.locked') + (q.id === nextId ? '.next' : '') + (q.id === sel ? '.sel' : '') + (encore ? '.encore' : ''),
        { style: { left: at[k][0] + '%', top: at[k][1] + '%', '--nd': phone() ? '50px' : '64px' }, title: open ? `${nameOf(hero.cast)} · rank ${q.rank}` : 'Not open yet', onclick: () => pick(q.id) },
        medal, h('span.tag', h('span', String(k + 1)), pips(st)));
      if (open && q.heroAwarded && s.heroes[q.heroAwarded] === undefined && !st) node.append(h('span.gift', { title: 'She joins you when you first win here' }, '+'));
      else if (open && RECRUIT.has(q.hero) && s.heroes[q.hero] === undefined) node.append(h('span.gift.maybe', { title: 'Each win here may bring her over to you' }, '?'));
      map.append(node);
    });
    // what this region is, and its roads
    const stars = r.tables.reduce((a, q) => a + starsAt(s, q.id), 0), top = h('div.map-top');
    top.append(h('div.glasslabel', phone() ? '' : h('em', r.line), h('b', encore ? `Encore · ★ ${r.encore.reduce((a, q) => a + starsAt(s, q.id), 0)} / 45` : `★ ${stars} / 45`)));
    if (r.encore.length) {
      const eOpen = tableOpen(s, r.encore[0].id);
      top.append(h('div.road', h('button' + (!encore ? '.on' : ''), { onclick: () => { encore = false; sel = null; draw(); } }, 'Main road'),
        h('button' + (encore ? '.on' : ''), { disabled: !eOpen, title: eOpen ? 'The same tables, reset with new decks and new stars to win' : `Opens when you win the last table of ${REGIONS[0].name}`, onclick: () => { encore = true; sel = null; draw(); } }, 'Encore')));
    }
    map.append(top);
    if (!encore) {
      const M = CAMPAIGN.milestones, cl = M.clear[region + 1], gl = M.glazed[region + 1], foot = h('div.map-foot');
      const names = ids => ids.map(id => ROW[id].name).join(' and ');
      foot.append(h('span' + (regionCleared(s, region) ? '.got' : ''), (regionCleared(s, region) ? '✓ ' : '') + `Win the last table: ${names(cl.recipes)} at the Kiln`));
      foot.append(h('span' + (regionGlazed(s, region) ? '.got' : ''), (regionGlazed(s, region) ? '✓ ' : '') + `Every table at three stars: ${ROW[gl.card].name}` + (gl.recipes.length ? `, and ${names(gl.recipes)} at the Kiln` : '')));
      map.append(foot);
    }
    side(sel, false);
  }

  function pick(id) {
    sel = id;
    for (const n of $$('#map .node')) n.classList.remove('sel');
    const list = encore ? REGIONS[region].encore : REGIONS[region].tables, k = list.findIndex(q => q.id === id), node = $$('#map .node')[k];
    if (node) node.classList.add('sel');
    side(id, true);
  }

  function side(id, opened) {
    const s = S(), q = QUEST[id], el = $('#table-side'), at = REGION_OF[id], r = REGIONS[at.region];
    el.innerHTML = ''; el.scrollTop = 0; el.append(sheetCloser(el));
    const label = `${at.encore ? 'Encore table' : 'Table'} ${at.at + 1} of ${r.name}`;
    if (!tableOpen(s, id)) {
      const by = (OPENED_BY[id] || [])[0], from = by && REGION_OF[by[0]];
      el.append(h('div.face-big', { style: { background: 'radial-gradient(circle at 40% 35%, #9a92a6, #4a4454)' } }), h('h3', 'Not open yet'), h('div.sub', label),
        h('p.note', { style: { textAlign: 'center' } }, from ? `It opens when you win ${from.encore ? 'encore table' : 'table'} ${from.at + 1}${from.region !== at.region ? ' of ' + REGIONS[from.region].name : ''}.` : 'It opens further along the road.'));
      if (opened) sheetOpen(el);
      return;
    }
    const hero = HERO[q.hero], person = CONTENT.cast.people[hero.cast], st = starsAt(s, id);
    el.append(h('div.face-big', faceEl(hero, 120)), h('h3', nameOf(hero.cast)), h('div.sub', (hero.form ? hero.form + ' · ' : '') + person.role),
      h('p.hello', `“${person.lines.hello}”`),
      h('div.facts', h('span', label), h('span', 'Rank ' + q.rank), h('span', rangeText(q.xp) + ' XP'), h('span', h('i.coin'), rangeText(q.coins)),
        s.wins[id] ? h('span', `Won ${s.wins[id]}×`) : ''));
    const stars = h('div.starlist');
    q.conditions.forEach((c, i) => stars.append(h('div' + (i === st ? '.now' : ''), h('i' + (i < st ? '.on' : '')), conditionText(c))));
    el.append(h('div', h('div.caps', { style: { fontSize: '13px', color: 'var(--ink2)', marginBottom: '6px' } }, st >= 3 ? 'Every star of this table is yours' : 'Her stars, one a win, in order'), stars),
      st < 3 ? h('p.note', `The third star brings a Jewel. After each win you turn over one card for every star of this table.`) : h('p.note', 'After each win here you turn over three cards.'));
    const drops = tableDrops(q);
    if (drops.length) {
      const row = h('div.drops');
      for (const cid of drops) { const c = cardEl(ROW[cid], { mini: true }); c.title = cardName(cid) + (ownCount(s, cid) ? ` · you have ${ownCount(s, cid)}` : ''); c.onclick = () => lookCard(cid); row.append(c); }
      el.append(h('div', h('div.caps', { style: { fontSize: '13px', color: 'var(--ink2)', marginBottom: '6px' } }, `Her creatures may leave, up to ${q.maxLoot} a battle`), row));
    }
    if (q.heroAwarded && s.heroes[q.heroAwarded] === undefined) el.append(h('p.note', h('b', `${heroTitle(HERO[q.heroAwarded])} joins you`), ' when you first win here.'));
    else if (RECRUIT.has(q.hero) && s.heroes[q.hero] === undefined) {
      const tries = s.recruit[q.hero] || 0;
      el.append(h('p.note', h('b', `Each win over her may bring her over to you`), ` — next time ${Math.round(Math.min(1, (tries + 1) / RECRUIT_SURE) * 100)}% likely, and the fifth win surely.`));
    }
    el.append(h('p.note', h('b', 'Her gift: '), hero.text));
    // the player's side
    const pickDeck = h('select.pick', { onchange: e => { s.deck = Number(e.target.value); Me.write(); side(id, false); } });
    s.decks.forEach((d, i) => pickDeck.append(h('option', { value: i, selected: i === s.deck }, `${d.name} · ${heroTitle(HERO[d.hero])} · ${d.cards.length} cards`)));
    const mine = s.decks[s.deck], rank = heroRank(s, mine.hero), issues = deckIssues(mine, rank, s.cards);
    el.append(h('div.sitbar', pickDeck,
      h('p.note', `${heroTitle(HERO[mine.hero])} at rank ${rank}: ${10 + 5 * rank} health, up to ${deckMax(rank)} cards.`),
      issues.length ? h('div.warn', issues.join(' ')) : '',
      h('div.row', h('button.jewel.go', { disabled: issues.length > 0, onclick: () => sit(q) }, 'Sit down'), issues.length ? h('button.jewel.small.quiet', { onclick: () => Decks.edit(s.deck, () => show({ quest: id })) }, 'Fix the deck') : '')));
    if (opened) sheetOpen(el);
  }

  function sit(q) {
    $('#table-side').classList.remove('open');
    Battle.start({ quest: q, deck: Me.data.deck }, after => {
      if (after && after.again) { const t = QUEST[after.again]; if (t && tableOpen(Me.data, t.id)) { sit(t); return; } }
      show({ quest: after && after.next ? after.next : q.id });
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
  return { show, lookCard, _rt: 0 };
})();
