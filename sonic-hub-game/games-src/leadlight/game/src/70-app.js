/* The game from the front door: who is playing, the menu, the practice tables, the options; and the start of it all. */

/** a question in a pane of its own: resolves true for yes */
function ask(title, text, yes = 'Yes', no = 'No') {
  const pop = $('#ask'), inn = $('#ask-in');
  return new Promise(res => {
    inn.innerHTML = '';
    inn.append(h('h3', title), text ? h('p', text) : '', h('div.row', { style: { justifyContent: 'center' } },
      h('button.jewel.quiet', { onclick: () => { pop.classList.remove('on'); res(false); } }, no),
      h('button.jewel', { onclick: () => { pop.classList.remove('on'); res(true); } }, yes)));
    pop.classList.add('on');
  });
}

/* ---------------------------------------------------------------- who is playing */

const Door = {
  show() { Screens.show('door'); this.draw(); },
  draw() {
    const box = $('#players'); box.innerHTML = '';
    const players = Game.save.players();
    for (const p of players) {
      const d = mendSave(p.data), deck = d.decks[d.deck];
      box.append(h('div.player', { onclick: () => this.enter(p.id) },
        h('div', { style: { width: '48px', height: '48px', borderRadius: '50%', border: '3px solid var(--lead)', overflow: 'hidden', flex: 'none' } }, faceEl(HERO[deck.hero], 48)),
        h('div.who', p.name, h('div.what', `${deck.name} · ${heroTitle(HERO[deck.hero])}`)),
        h('button.x', { title: 'Remove this player', onclick: async e => { e.stopPropagation(); if (await ask(`Remove ${p.name}?`, 'Everything this player has done goes with her.', 'Remove', 'Keep')) { Game.save.remove(p.id); this.draw(); } } }, '×')));
    }
    const full = players.length >= Game.save.max();
    $('#newp').style.display = full ? 'none' : '';
    const heard = Game.save.heard();
    $('#door-status').textContent = full ? `There is room for ${Game.save.max()} players.` : !Game.save.remote() ? 'Players are kept in this browser.' : heard === false ? 'The saves service cannot be reached: players are kept in this browser until it can.' : '';
  },
  enter(id) {
    const p = Game.save.choose(id);
    if (!p) return;
    Game.me = mendSave(p.data);
    Menu.show();
  },
};

/* ---------------------------------------------------------------- the menu, the options */

const Menu = {
  show() {
    Screens.show('menu');
    $('#menu-who').textContent = (Game.save.current() || {}).name || '';
    const art = (id, card) => Pictures.card(ROW[card] || DATA.cards[0], url => { $(id).style.backgroundImage = `url(${url})`; });
    art('#go-practice', 'standing-stones'); art('#go-decks', 'tome-of-the-dunes'); art('#go-options', 'seers-globe');
  },
};
function options() {
  Screens.show('options');
  const o = Me.data.options, body = $('#options-body'); body.innerHTML = '';
  body.append(
    h('label.toggle', h('input', { type: 'checkbox', checked: o.autoSpin, onchange: e => { o.autoSpin = e.target.checked; Me.write(); } }), 'Let the Rose Window stop by itself'),
    h('p', { style: { color: 'var(--ink2)', margin: '0 0 14px 32px' } }, 'The needle then stops wherever it happens to be, as when you tap blind.'),
    h('label.toggle', 'Her pace at the table ', h('select.pick', { style: { width: 'auto' }, onchange: e => { o.pace = e.target.value; Me.write(); } },
      h('option', { value: 'calm', selected: o.pace !== 'brisk' }, 'Calm'), h('option', { value: 'brisk', selected: o.pace === 'brisk' }, 'Brisk'))));
}

/* ---------------------------------------------------------------- the practice tables */

const Practice = (() => {
  let who = null, at = null;
  function show() {
    Screens.show('practice');
    const box = $('#ladies'); box.innerHTML = '';
    for (const s of SITTERS) {
      const hero = HERO[s.tables[0].hero], wins = s.tables.filter(q => (Me.data.record[q.id] || {}).won).length;
      box.append(h('button.lady' + (who === s.key ? '.on' : ''), { onclick: () => { who = s.key; at = null; show(); } }, faceEl(hero, 92),
        h('b', nameOf(s.key)), h('small', `Rank ${s.tables[0].rank}–${s.tables[s.tables.length - 1].rank}` + (wins ? ` · beaten ${wins}×` : ''))));
    }
    side();
  }
  function side() {
    const box = $('#practice-side'); box.innerHTML = '';
    if (!who) { box.append(h('h3', 'Choose who sits across'), h('p', 'Every woman you will meet in the land keeps her tables here. At a practice table your hero plays at the same rank as hers.')); return; }
    const s = SITTERS.find(x => x.key === who), person = CONTENT.cast.people[who], age = (Game.cast && Game.cast.age(who)) || person.age;
    box.append(h('div', { style: { width: '132px', height: '132px', margin: '0 auto 10px', borderRadius: '50%', border: '3px solid var(--lead)', overflow: 'hidden' } }, faceEl(HERO[s.tables[0].hero], 132)),
      h('h3', { style: { textAlign: 'center' } }, nameOf(who)), h('p', { style: { textAlign: 'center', margin: '0 0 8px' } }, `${person.role}, ${age}`), h('p', person.about));
    const tb = h('div.tables');
    s.tables.forEach((q, k) => tb.append(h('button' + (at === q.id ? '.on' : ''), { onclick: () => { at = q.id; side(); }, title: `Rank ${q.rank}` }, h('b', String(k + 1) + ((Me.data.record[q.id] || {}).won ? ' ✓' : '')), h('small', { style: { display: 'block', fontSize: '11px', fontWeight: 500 } }, 'rank ' + q.rank))));
    box.append(h('div.caps', { style: { marginTop: '12px' } }, 'Her tables'), tb);
    if (!at) return;
    const q = QUEST[at], hero = HERO[q.hero], their = q.deck === 'player-clone' ? null : Catalog.decks[q.deck];
    const sel = h('select.pick', { onchange: e => { Me.data.deck = Number(e.target.value); Me.write(); side(); } });
    Me.data.decks.forEach((d, i) => sel.append(h('option', { value: i, selected: i === Me.data.deck }, `${d.name} · ${d.cards.length} cards`)));
    const mine = Me.deck, issues = deckIssues(mine, q.rank);
    box.append(h('div', { style: { marginTop: '14px', display: 'grid', gap: '8px' } },
      h('p', { style: { margin: 0 } }, `${heroTitle(hero)} plays ${their ? `a deck of ${their.cards.length} cards` : 'a copy of your own deck'}. Her gift: ${hero.text}`),
      h('div.caps', 'Your deck'), sel,
      h('p', { style: { margin: 0, fontSize: '14px' } }, `${heroTitle(HERO[mine.hero])} at rank ${q.rank}: ${10 + 5 * q.rank} health, up to ${deckMax(q.rank)} cards.`),
      issues.length ? h('div.warn', issues.join(' ')) : '',
      h('button.jewel.go', { disabled: issues.length > 0, onclick: () => Battle.start({ quest: q, deck: Me.data.deck }, () => show()) }, 'Sit down')));
  }
  return { show };
})();

/* ---------------------------------------------------------------- the start */

(async function boot() {
  const service = CONTENT.saves || {};
  const savesChanged = what => {
    if (what === 'replaced') { const p = Game.save.current(); if (p) Game.me = mendSave(p.data); else if (Screens.now !== 'door') Door.show(); }
    if (Screens.now === 'door') Door.draw();
  };
  Game.save = SonicSave({ api: service.api || '', game: service.game || 'leadlight', onChange: savesChanged });
  Game.cast = SonicCast({ api: service.api || '', game: service.game || 'leadlight', onChange: () => { if (Screens.now === 'practice') Practice.show(); else if (Screens.now === 'door') Door.draw(); } });
  glassTextures();
  try { await Promise.race([document.fonts.load('400 64px Federant'), sleep(1500)]); } catch (e) { /* the title is drawn in another face */ }
  drawTitle($('#title-glass'));
  const room = drawRoom(1280, 820);
  room.toBlob(b => { if (b) $('#room').style.backgroundImage = `url(${URL.createObjectURL(b)})`; }, 'image/jpeg', 0.85);
  $('#newp').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#newname').value.trim();
    if (!name) { $('#newname').focus(); return; }
    const p = Game.save.add(name.slice(0, 24), newSave());
    if (!p) { Door.draw(); return; }
    $('#newname').value = '';
    Game.me = mendSave(p.data);
    Menu.show();
  });
  $('#switch').onclick = () => Door.show();
  $('#go-practice').onclick = () => Practice.show();
  $('#go-decks').onclick = () => Decks.list();
  $('#go-options').onclick = () => options();
  for (const b of $$('[data-back]')) b.onclick = () => Menu.show();
  const cur = Game.save.current();
  if (cur) { Game.me = mendSave(cur.data); Menu.show(); } else Door.show();
})();
