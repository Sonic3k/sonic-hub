/* The player's decks: the list of them, and the bench where one is built from the cards she owns, led by one of the
   heroes who have joined her. The rules a deck is held to are the original's (see 40-model.js). */

const Decks = (() => {
  let editing = -1;
  const filter = { realm: -1, kind: -1, special: false, mine: false, q: '' };
  const cells = new Map();

  function list() {
    Screens.show('decks');
    const box = $('#deck-list'); box.innerHTML = '';
    Me.data.decks.forEach((d, i) => {
      const rank = heroRank(Me.data, d.hero), issues = deckIssues(d, rank, Me.data.cards), lands = landsOf(d).map(t => REALM_SHORT[t]).join(' · ');
      box.append(h('button.deck-tile', { onclick: () => edit(i) }, faceEl(HERO[d.hero], 64),
        h('div', h('b', d.name), h('small', `${heroTitle(HERO[d.hero])} · rank ${rank} · ${d.cards.length} cards`), h('br'), h('small', lands),
          issues.length ? h('div.warn', issues[0]) : '', i === Me.data.deck ? h('div.okay', 'Your deck at the table') : '')));
    });
    if (Me.data.decks.length < MAX_DECKS) box.append(h('button.deck-tile.new', { onclick: () => { Me.data.decks.push({ name: 'Deck ' + (Me.data.decks.length + 1), hero: Me.deck.hero, cards: [], lands: null }); Me.write(); edit(Me.data.decks.length - 1); } }, '+ A new deck'));
  }

  let back = null;
  /** i: the deck; from: where 'Done' goes back to (the deck list when none is given) */
  function edit(i, from) {
    editing = i; back = from || null;
    Screens.show('builder');
    $('#builder-done').onclick = () => { Me.write(); if (back) back(); else list(); };
    drawFilters(); drawPool(); drawSide();
  }
  const deck = () => Me.data.decks[editing];
  const countOf = id => deck().cards.filter(x => x === id).length;
  const owned = id => ownCount(Me.data, id);

  function drawFilters() {
    const f = $('#filters'); f.innerHTML = '';
    const btn = (label, on, fn, style) => h('button' + (on ? '.on' : ''), { onclick: fn, style }, label);
    f.append(btn('All', filter.realm < 0, () => { filter.realm = -1; drawFilters(); drawPool(); }));
    REALM_SHORT.forEach((r, i) => f.append(btn(r, filter.realm === i, () => { filter.realm = i; drawFilters(); drawPool(); }, { borderBottom: `5px solid ${REALM_LOOK[i].main}` })));
    f.append(h('span', { style: { width: '8px' } }));
    KINDS.forEach((k, i) => f.append(btn(k + 's', filter.kind === i, () => { filter.kind = filter.kind === i ? -1 : i; drawFilters(); drawPool(); })));
    f.append(btn('Special editions', filter.special, () => { filter.special = !filter.special; drawFilters(); drawPool(); }));
    f.append(btn('Mine only', filter.mine, () => { filter.mine = !filter.mine; drawFilters(); drawPool(); }));
    const q = h('input', { placeholder: 'Find a card', value: filter.q, oninput: e => { filter.q = e.target.value; drawPool(); } });
    f.append(q);
  }
  function shown(row) {
    if (row.album === false) return false;
    if (filter.realm >= 0 && row.faction !== filter.realm) return false;
    if (filter.kind >= 0 && row.type !== filter.kind) return false;
    if (filter.special !== !!row.edition) return false;
    if (filter.q && !(row.name + ' ' + row.text).toLowerCase().includes(filter.q.toLowerCase())) return false;
    return true;
  }
  function drawPool() {
    const box = $('#pool'); box.innerHTML = '';
    const all = DATA.cards.filter(shown).sort((a, b) => a.faction - b.faction || a.type - b.type || a.cost - b.cost || a.name.localeCompare(b.name));
    const rows = all.filter(r => owned(r.id)), missing = all.filter(r => !owned(r.id));
    if (!rows.length) box.append(h('p', { style: { gridColumn: '1 / -1', color: 'var(--ink2)' } }, 'You have no card like that.'));
    for (const row of rows) {
      let cell = cells.get(row.id);
      if (!cell) {
        cell = h('div.cell', cardEl(row, { lazy: true }));
        cell.addEventListener('click', () => (phone() ? look(row) : add(row.id)));
        cell.addEventListener('contextmenu', e => { e.preventDefault(); look(row); });
        cells.set(row.id, cell);
      }
      setCount(cell, row.id);
      box.append(cell);
    }
    if (missing.length && !filter.mine) {
      box.append(h('div.poolhead', 'Not yours yet — tap one to see where it is found'));
      for (const row of missing) {
        const c = cardEl(row, { lazy: true }); c.classList.add('ghost-card');
        box.append(h('div.cell', { onclick: () => Album.lookMissing(row.id) }, c));
      }
    }
  }
  function setCount(cell, id) {
    let b = cell.querySelector('.count'); const n = countOf(id), have = owned(id);
    if (!b) { b = h('span.count'); cell.append(b); }
    b.textContent = `${n}/${have}`; b.title = `${n} in this deck, ${have} owned`;
    b.classList.toggle('zero', !n);
  }
  function add(id) {
    if (countOf(id) >= owned(id)) { toast(owned(id) === 1 ? 'You have only one of these.' : `You have only ${owned(id)} of these.`); return; }
    if (countOf(id) >= MAX_COPIES) { toast(`No more than ${MAX_COPIES} of one card.`); return; }
    if (deck().cards.length >= deckMax(DATA.rankUp[DATA.rankUp.length - 1].rank)) { toast('No hero can take more cards than this.'); return; }
    deck().cards.push(id); Me.write();
    const cell = cells.get(id); if (cell) setCount(cell, id);
    drawSide();
  }
  function remove(id) {
    const k = deck().cards.lastIndexOf(id); if (k < 0) return;
    deck().cards.splice(k, 1); Me.write();
    const cell = cells.get(id); if (cell) setCount(cell, id);
    drawSide();
  }
  function look(row) {
    const pop = $('#deck-pop') || document.body.appendChild(h('div.modal#deck-pop'));
    const n = countOf(row.id);
    pop.innerHTML = '';
    pop.append(h('div.plate', { style: { width: 'auto', display: 'grid', justifyItems: 'center', gap: '12px' } }, cardEl(row, {}), h('div.row',
      h('button.jewel.green', { onclick: () => { add(row.id); pop.classList.remove('on'); } }, 'Add one'),
      n ? h('button.jewel.quiet', { onclick: () => { remove(row.id); pop.classList.remove('on'); } }, 'Take one out') : '',
      h('button.jewel.small.quiet', { onclick: () => pop.classList.remove('on') }, 'Close'))));
    pop.querySelector('.card').style.setProperty('--w', '230px');
    pop.onclick = e => { if (e.target === pop) pop.classList.remove('on'); };
    pop.classList.add('on');
  }

  function drawSide() {
    const d = deck(), side = $('#deck-side'); side.innerHTML = '';
    $('#builder-title').textContent = d.name;
    const name = h('input.pick', { value: d.name, maxLength: 28, oninput: e => { d.name = e.target.value || 'Deck'; $('#builder-title').textContent = d.name; Me.write(); } });
    const heroSel = h('select.pick', { onchange: e => { d.hero = e.target.value; Me.write(); drawSide(); } });
    const mine = DATA.leaders.filter(l => Me.data.heroes[l.id] !== undefined).sort((a, b) => heroRank(Me.data, b.id) - heroRank(Me.data, a.id) || nameOf(a.cast).localeCompare(nameOf(b.cast)));
    for (const f of mine) heroSel.append(h('option', { value: f.id, selected: f.id === d.hero }, `${heroTitle(f)} · rank ${heroRank(Me.data, f.id)}`));
    const hero = HERO[d.hero], rank = heroRank(Me.data, d.hero);
    const head = h('div', { style: { display: 'grid', gap: '8px' } },
      h('div.row', { style: { flexWrap: 'nowrap' } }, h('div', { style: { width: '56px', height: '56px', borderRadius: '50%', border: '3px solid var(--lead)', overflow: 'hidden', flex: 'none' } }, faceEl(hero, 56)), name),
      heroSel, h('div', { style: { fontSize: '14px', color: 'var(--ink2)', lineHeight: 1.3 } }, `Rank ${rank}: ${10 + 5 * rank} health, up to ${deckMax(rank)} cards. Her gift: ${hero.text}`));
    const lands = landsOf(d), landRow = h('div.lands', { style: { margin: '2px 0' } });
    lands.forEach((t, k) => landRow.append(h('button', { title: 'Tap to change', onclick: () => { const next = landsOf(d); next[k] = (next[k] + 1) % 5; d.lands = next; Me.write(); drawSide(); } }, Pictures.img('landscape', t), h('span', REALM_SHORT[t]))));
    const landHead = h('div.row', { style: { justifyContent: 'space-between' } }, h('span.caps', { style: { fontSize: '13px' } }, d.lands ? 'Landscapes, laid by hand' : 'Landscapes, laid by the deck'),
      d.lands ? h('button.jewel.small.quiet', { onclick: () => { d.lands = null; Me.write(); drawSide(); } }, 'Lay them by the deck') : '');
    const counts = {}; for (const id of d.cards) counts[id] = (counts[id] || 0) + 1;
    const rows = h('div.rows');
    Object.keys(counts).sort((a, b) => ROW[a].faction - ROW[b].faction || ROW[a].cost - ROW[b].cost || ROW[a].name.localeCompare(ROW[b].name)).forEach(id => {
      const r = ROW[id];
      rows.append(h('div.line' + (counts[id] > MAX_COPIES ? '.bad' : ''), { onclick: () => remove(id), title: 'Tap to take one out' }, h('span.c', String(r.cost)), h('span.n', r.name + (r.edition ? ' · ' + r.edition : '')), h('span', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, '×' + counts[id], h('span.r', { style: { background: REALM_LOOK[r.faction].main } }))));
    });
    if (!d.cards.length) rows.append(h('p', { style: { color: 'var(--ink2)', margin: '6px 2px' } }, phone() ? 'Tap a card above, then add it.' : 'Click cards on the left to add them.'));
    const issues = deckIssues(d, rank, Me.data.cards), kinds = [0, 1, 2].map(k => d.cards.filter(id => ROW[id].type === k).length);
    const foot = h('div', { style: { display: 'grid', gap: '6px' } },
      h('div', { style: { fontSize: '14px' } }, `${d.cards.length} cards · ${kinds[0]} creatures · ${kinds[1]} buildings · ${kinds[2]} spells`),
      issues.length ? h('div.warn', issues.join(' ')) : h('div.okay', 'Ready for the table.'),
      h('div.row', Me.data.deck === editing ? h('span.okay', 'Your deck at the table') : h('button.jewel.small', { onclick: () => { Me.data.deck = editing; Me.write(); drawSide(); } }, 'Bring this deck to the table'),
        Me.data.decks.length > 1 ? h('button.jewel.small.quiet', { onclick: async () => { if (!(await ask('Throw this deck away?', 'Its cards stay in your collection.', 'Throw away', 'Keep'))) return; Me.data.decks.splice(editing, 1); if (Me.data.deck >= Me.data.decks.length) Me.data.deck = 0; Me.write(); list(); } }, 'Throw away') : ''));
    side.append(head, h('div', landHead, landRow), rows, foot);
  }
  return { list, edit };
})();
