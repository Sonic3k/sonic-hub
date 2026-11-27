/* The collection: every card of the land by realm, the ones not yet found as dark glass with where to find them;
   a card owned can be sold for its price. And the heroes: those who have joined, with their ranks, and how each
   of the others is won. */

const Album = (() => {
  let tab = 'cards', pickId = null, pickHero = null;
  const filter = { realm: -1, kind: -1, have: 'all', q: '' };
  const S = () => Me.data;
  const ALBUM = DATA.cards.filter(c => c.album !== false);
  const caps = text => h('div.caps', { style: { fontSize: '13px', color: 'var(--ink2)' } }, text);
  const tableWord = id => { const a = REGION_OF[id]; return a ? `${a.encore ? 'encore table' : 'table'} ${a.at + 1} of ${REGIONS[a.region].name}` : 'a table further on'; };

  function show(which) {
    if (which) tab = which;
    Screens.show('collection'); purse();
    for (const b of $$('#album-tabs button')) { b.classList.toggle('on', b.dataset.tab === tab); b.onclick = () => { tab = b.dataset.tab; show(); }; }
    $('#album-side').classList.remove('open');
    if (tab === 'cards') { drawFilters(); drawCards(); sideCard(pickId); } else { $('#album-filters').innerHTML = ''; drawHeroes(); sideHero(pickHero); }
  }

  /* ---------------------------------------------------------------- cards */

  function drawFilters() {
    const f = $('#album-filters'); f.innerHTML = '';
    const btn = (label, on, fn, style) => h('button' + (on ? '.on' : ''), { onclick: fn, style }, label);
    const again = () => { drawFilters(); drawCards(); };
    f.append(btn('All', filter.realm < 0, () => { filter.realm = -1; again(); }));
    REALM_SHORT.forEach((r, i) => f.append(btn(r, filter.realm === i, () => { filter.realm = filter.realm === i ? -1 : i; again(); }, { borderBottom: `5px solid ${REALM_LOOK[i].main}` })));
    f.append(h('span', { style: { width: '6px' } }));
    KINDS.forEach((k, i) => f.append(btn(k + 's', filter.kind === i, () => { filter.kind = filter.kind === i ? -1 : i; again(); })));
    f.append(h('span', { style: { width: '6px' } }));
    f.append(btn('Owned', filter.have === 'own', () => { filter.have = filter.have === 'own' ? 'all' : 'own'; again(); }), btn('Not yet', filter.have === 'not', () => { filter.have = filter.have === 'not' ? 'all' : 'not'; again(); }));
    f.append(h('input', { placeholder: 'Find a card', value: filter.q, oninput: e => { filter.q = e.target.value; drawCards(); } }));
  }
  function shown(row) {
    const s = S(), n = ownCount(s, row.id);
    if (filter.realm >= 0 && row.faction !== filter.realm) return false;
    if (filter.kind >= 0 && row.type !== filter.kind) return false;
    if (filter.have === 'own' && !n) return false;
    if (filter.have === 'not' && n) return false;
    if (filter.q && !(row.name + ' ' + row.text).toLowerCase().includes(filter.q.toLowerCase())) return false;
    return true;
  }
  function drawCards() {
    const s = S(), box = $('#album'); box.className = 'album'; box.innerHTML = '';
    for (let realm = 0; realm < 6; realm++) {
      const all = ALBUM.filter(c => c.faction === realm), rows = all.filter(shown).sort((a, b) => a.type - b.type || a.cost - b.cost || (a.edition > b.edition ? 1 : -1) || a.name.localeCompare(b.name));
      if (!rows.length) continue;
      const have = all.filter(c => ownCount(s, c.id)).length, grid = h('div.grid');
      for (const row of rows) {
        const n = ownCount(s, row.id), met = s.met[row.id];
        const c = cardEl(row, { mini: phone(), lazy: true });
        if (!n && !met) c.classList.add('ghost-card'); else if (!n) c.classList.add('faded');
        const cell = h('div.cell', { onclick: () => { pickId = row.id; sideCard(row.id, true); } }, c);
        if (n || met) cell.append(h('span.count' + (n ? '' : '.zero'), '×' + n));
        grid.append(cell);
      }
      box.append(h('section', h('h4', REALMS[realm], h('small', `${have} of ${all.length}`)), grid));
    }
    if (!box.children.length) box.append(h('p.note', 'No card is like that.'));
  }
  /** where a card can be had, in words, the ways open now first */
  function waysTo(id) {
    const s = S(), out = [];
    const tables = MAIN.filter(q => tableDrops(q).includes(id)).sort((a, b) => (tableOpen(s, b.id) - tableOpen(s, a.id)) || Number(a.id) - Number(b.id));
    if (tables.length) out.push({ open: tables.some(q => tableOpen(s, q.id)), text: `Left by her creatures at ${tables.slice(0, 2).map(q => tableWord(q.id)).join(' and at ')}${tables.length > 2 ? ', and other tables' : ''}.` });
    const r = RECIPE[id];
    if (r) {
      const open = recipeOpen(s, r);
      let when = '';
      if (!open) {
        const q = QUEST[r.unlock];
        if (q && q.type === 'main') when = ` once you win ${tableWord(q.id)}`;
        else {
          const M = CAMPAIGN.milestones, k = REGIONS.findIndex((x, i) => M.clear[i + 1].recipes.includes(id)), g = REGIONS.findIndex((x, i) => M.glazed[i + 1].recipes.includes(id));
          when = k >= 0 ? ` once the last table of ${REGIONS[k].name} is won` : g >= 0 ? ` once every table of ${REGIONS[g].name} has three stars` : ' — a recipe not yet in reach';
        }
      }
      out.push({ open: open && ROW[id].fuse, text: `Fired in the Kiln${when}.` });
    }
    const inPool = pool => pool.some(([c]) => c === id);
    if (inPool(DATA.chests.normal.pool)) out.push({ open: true, text: 'In normal chests.' });
    if (inPool(DATA.chests.premium.pool)) out.push({ open: true, text: 'In premium chests.' });
    const tier = Object.entries(DATA.flips.pools).find(([, pl]) => inPool(pl));
    if (tier) out.push({ open: true, text: `Turned over after a win${tier[0] === 'standard' ? '' : ', when the ' + (tier[0] === 'gilded' ? 'Gilded' : 'Obsidian') + ' edition comes up'}.` });
    const g = REGIONS.findIndex((x, i) => CAMPAIGN.milestones.glazed[i + 1].card === id);
    if (g >= 0) out.push({ open: regionOpen(s, g), text: `Given when every table of ${REGIONS[g].name} has three stars.` });
    if (!out.length) out.push({ open: false, text: 'Not in reach yet: it is found on roads still to come.' });
    return out.sort((a, b) => b.open - a.open);
  }
  function sideCard(id, opened) {
    const s = S(), el = $('#album-side'); el.innerHTML = ''; el.append(sheetCloser(el));
    if (!id) { el.append(h('h3', 'Your cards'), h('p', 'Tap a card to see it close, where to find it, or to sell one you have to spare.'), h('p', `Cards found: ${ALBUM.filter(c => ownCount(s, c.id)).length} of ${ALBUM.length}.`)); return; }
    const row = ROW[id], n = ownCount(s, id);
    const big = cardEl(row); big.style.setProperty('--w', '220px'); big.style.justifySelf = 'center';
    if (!n) big.classList.add('ghost-card');
    el.append(big, h('h3', { style: { textAlign: 'center' } }, cardName(id)), n ? '' : h('p', { style: { textAlign: 'center', margin: '-6px 0 0' } }, s.met[id] ? 'You have none left.' : 'Not found yet.'));
    if (n) {
      const inDecks = s.decks.filter(d => d.cards.includes(id)).map(d => d.name);
      el.append(h('p', { style: { textAlign: 'center' } }, `You have ${n}.` + (inDecks.length ? ` In ${inDecks.join(', ')}.` : '')));
      const why = sellBlock(s, id);
      el.append(h('div.row', { style: { justifyContent: 'center' } }, h('button.jewel', { disabled: !!why, title: why, onclick: () => {
        if (!sell(s, id)) return;
        Me.write(); purse(); toast(`Sold for ${fmt(salePrice(id))} coins.`); drawCards(); sideCard(id);
      } }, 'Sell one · ', h('i.coin'), fmt(salePrice(id)))), why ? h('p.note', { style: { textAlign: 'center' } }, why) : '');
    }
    el.append(caps(n ? 'More of it' : 'Where to find it'), h('div.how', waysTo(id).map(w => h('div' + (w.open ? '.open' : ''), w.text))));
    if (opened) sheetOpen(el);
  }

  /* ---------------------------------------------------------------- heroes */

  const SHOWN_HEROES = DATA.leaders.filter(l => !HIDDEN_HEROES.has(l.id));
  function heroWay(id) {
    const s = S();
    const award = MAIN.find(q => q.heroAwarded === id);
    if (award) return { open: tableOpen(s, award.id), text: `Joins you when you first win ${tableWord(award.id)}.` };
    const star = CAMPAIGN.milestones.stars.find(m => m.hero === id);
    if (star) return { open: true, text: `Joins you at ${star.at} stars across the land (you have ${starsTotal(s)}).` };
    if (RECRUIT.has(id)) {
      const at = MAIN.filter(q => q.hero === id);
      if (at.length) return { open: at.some(q => tableOpen(s, q.id)), text: `Sits at ${at.slice(0, 3).map(q => tableWord(q.id)).join(', ')}. Each win over her may bring her over, more likely each time; the fifth surely does.` };
    }
    return { open: false, text: 'Not in reach yet: she is met on roads still to come.' };
  }
  /** in a few words, how she is won: for under her portrait */
  function heroHint(id) {
    const s = S(), award = MAIN.find(q => q.heroAwarded === id);
    if (award) { const a = REGION_OF[award.id]; return `Table ${a.at + 1}, ${REGIONS[a.region].name}`; }
    const star = CAMPAIGN.milestones.stars.find(m => m.hero === id);
    if (star) return `At ${star.at} stars`;
    if (RECRUIT.has(id) && MAIN.some(q => q.hero === id)) return `Beat her: ${s.recruit[id] || 0} of ${RECRUIT_SURE}`;
    return 'Further on';
  }
  function drawHeroes() {
    const s = S(), box = $('#album'); box.className = 'heroes'; box.innerHTML = '';
    // those with her first, the highest rank first; then the others in the order the road brings them
    const soon = id => {
      const award = MAIN.find(q => q.heroAwarded === id); if (award) return Number(award.id);
      const at = MAIN.filter(q => q.hero === id && RECRUIT.has(id)).map(q => Number(q.id)); if (at.length) return Math.min(...at) + 0.5;
      const star = CAMPAIGN.milestones.stars.find(m => m.hero === id); if (star) return 1000 + star.at;
      return 100000;
    };
    const list = SHOWN_HEROES.slice().sort((a, b) => (s.heroes[b.id] !== undefined) - (s.heroes[a.id] !== undefined) || (s.heroes[a.id] !== undefined ? heroRank(s, b.id) - heroRank(s, a.id) : soon(a.id) - soon(b.id)));
    for (const hero of list) {
      const own = s.heroes[hero.id] !== undefined, rank = heroRank(s, hero.id);
      const t = h('button.herotile' + (own ? '' : '.locked') + (pickHero === hero.id ? '.sel' : ''), { onclick: () => { pickHero = hero.id; for (const x of $$('.herotile')) x.classList.remove('sel'); t.classList.add('sel'); sideHero(hero.id, true); } },
        faceEl(hero, 96), h('b', nameOf(hero.cast)), h('small', own ? (hero.form ? hero.form + ' · ' : '') + 'Rank ' + rank : [hero.form, heroHint(hero.id)].filter(Boolean).join(' · ')));
      if (own) { const lo = xpForRank(rank, schemeOf(hero.id)), hi = rank >= MAX_RANK ? lo : xpForRank(rank + 1, schemeOf(hero.id)); t.append(h('div.xpbar', h('i', { style: { width: (hi > lo ? clampN((s.heroes[hero.id] - lo) / (hi - lo), 0, 1) * 100 : 100) + '%' } }))); }
      box.append(t);
    }
  }
  function sideHero(id, opened) {
    const s = S(), el = $('#album-side'); el.innerHTML = ''; el.append(sheetCloser(el));
    if (!id) { el.append(h('h3', 'Your heroes'), h('p', 'A hero leads a deck to the table: her rank gives it health and how many cards it can hold, and her gift can be called on in battle.'), h('p', `Heroes with you: ${Object.keys(s.heroes).length} of ${SHOWN_HEROES.length}.`)); return; }
    const hero = HERO[id], own = s.heroes[id] !== undefined, person = CONTENT.cast.people[hero.cast];
    const portrait = h('div', { style: { width: '132px', height: '132px', margin: '0 auto', borderRadius: '50%', border: '3px solid var(--lead)', overflow: 'hidden', background: '#ece6ee' } }, faceEl(hero, 132));
    if (!own) for (const im of portrait.querySelectorAll('img')) Object.assign(im.style, { filter: 'grayscale(1) contrast(.8) brightness(1.08)', opacity: '.5' });
    el.append(portrait);
    if (own) {
      const rank = heroRank(s, id), xp = s.heroes[id], next = rank >= MAX_RANK ? null : xpForRank(rank + 1, schemeOf(id));
      el.append(h('h3', { style: { textAlign: 'center' } }, nameOf(hero.cast)), h('p', { style: { textAlign: 'center', margin: '0' } }, `${hero.form ? hero.form + ' · ' : ''}${person.role}`),
        h('p.hello', { style: { fontStyle: 'italic', textAlign: 'center' } }, `“${person.lines.hello}”`),
        h('div.facts', { style: { justifyContent: 'center' } }, h('span', 'Rank ' + rank), h('span', `${10 + 5 * rank} health`), h('span', `${deckMax(rank)} cards`), h('span', next ? `${fmt(next - xp)} XP to rank ${rank + 1}` : 'Highest rank')),
        h('p', h('b', 'Her gift: '), hero.text), h('p.note', person.about));
      const decks = s.decks.filter(d => d.hero === id).map(d => d.name);
      el.append(h('p.note', decks.length ? `Leads ${decks.join(', ')}.` : 'She leads none of your decks yet: choose her in a deck.'));
    } else {
      const w = heroWay(id);
      el.append(h('h3', { style: { textAlign: 'center' } }, nameOf(hero.cast)), h('p', { style: { textAlign: 'center', margin: 0 } }, [hero.form, person.role].filter(Boolean).join(' · ')), caps('How she joins you'), h('div.how', h('div' + (w.open ? '.open' : ''), w.text)), h('p', h('b', 'Her gift: '), hero.text));
    }
    if (opened) sheetOpen(el);
  }
  /** where a card not yet owned is found, in a pane of its own (for the deck bench) */
  function lookMissing(id) {
    const pop = $('#deck-pop') || document.body.appendChild(h('div.modal#deck-pop'));
    pop.innerHTML = '';
    const c = cardEl(ROW[id]); c.style.setProperty('--w', '210px'); c.classList.add('ghost-card'); c.style.opacity = '.75';
    pop.append(h('div.plate', { style: { width: 'min(420px, 94vw)', display: 'grid', justifyItems: 'center', gap: '10px' } }, c, h('h3', cardName(id)),
      h('div.how', { style: { width: '100%' } }, waysTo(id).map(w => h('div' + (w.open ? '.open' : ''), w.text))),
      h('button.jewel.small.quiet', { onclick: () => pop.classList.remove('on') }, 'Close')));
    pop.onclick = e => { if (e.target === pop) pop.classList.remove('on'); };
    pop.classList.add('on');
  }
  return { show, waysTo, lookMissing };
})();
