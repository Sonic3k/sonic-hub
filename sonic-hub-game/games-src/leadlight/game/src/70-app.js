/* The game from the front door: who is playing, the atelier that leads everywhere, the options; and the start of it all. */

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
      const d = mendSave(p.data), deck = d.decks[d.deck], next = nextTable(d), at = next && REGION_OF[next.id];
      box.append(h('div.player', { onclick: () => this.enter(p.id) },
        h('div', { style: { width: '48px', height: '48px', borderRadius: '50%', border: '3px solid var(--lead)', overflow: 'hidden', flex: 'none' } }, faceEl(HERO[deck.hero], 48)),
        h('div.who', p.name, h('div.what', `★ ${starsTotal(d)} · ${heroTitle(HERO[deck.hero])}, rank ${heroRank(d, deck.hero)}` + (at ? ` · ${REGIONS[at.region].name}` : ''))),
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

/* ---------------------------------------------------------------- the purse, the atelier, the options */

/** every purse on the page shows the player's coins and Jewels */
function purse() {
  if (!Me.data) return;
  for (const el of $$('.purse')) { el.innerHTML = ''; el.append(h('span.coin', { title: 'Coins' }, h('i'), fmt(Me.data.coins)), h('span.gem', { title: 'Jewels' }, h('i'), String(Me.data.jewels))); }
}
const Menu = {
  show() {
    Screens.show('menu'); purse();
    const s = Me.data;
    $('#menu-who').textContent = (Game.save.current() || {}).name || '';
    const bg = (id, url) => { $(id).style.backgroundImage = `url(${url})`; };
    const next = nextTable(s), at = next ? REGION_OF[next.id] : { region: REGIONS.length - 1, at: 14, encore: false };
    Pictures.region(at.region, true, url => bg('#go-campaign', url));
    $('#go-campaign-where').textContent = `${REGIONS[at.region].name} · ★ ${starsTotal(s)}`;
    const who = $('#go-campaign-who'); who.innerHTML = '';
    if (next) {
      const her = HERO[next.hero];
      $('#go-campaign-next').textContent = `Next: ${at.encore ? 'encore table' : 'table'} ${at.at + 1}, ${nameOf(her.cast)} at rank ${next.rank}`;
      who.append(faceEl(her, 92), h('small', 'Waiting at the table'));
    } else $('#go-campaign-next').textContent = 'Every table of the land has its three stars.';
    // the roads around the campaign: what each holds now, or what opens it
    const road = (id, open, art, text) => { const d = $(id); d.classList.toggle('locked', !open); art(url => bg(id, url)); $(id + '-what').textContent = text; };
    const nm = nextMirrorTable(s), mAt = nm ? MIRROR_OF[nm.id] : null;
    road('#go-mirror', mirrorOpen(s), fn => Pictures.mirror(mAt ? mAt.region : 0, true, fn),
      !mirrorOpen(s) ? `Opens when you win table 15 of ${REGIONS[1].name}.` : `★ ${mirrorStars(s)} · ${mAt ? MIRROR_REGIONS[mAt.region].name : 'every table at three stars'}` + (s.goldie.at ? ' · Goldie is about' : ''));
    const cDone = CELLARS.reduce((a, c, k) => a + (s.cellars[k] || 0), 0);
    road('#go-cellars', cellarsOpen(s), fn => Pictures.cellar(0, fn),
      !cellarsOpen(s) ? `Opens when you win table ${Number(CELLARS_AFTER)} of ${REGIONS[0].name}.` : `${cDone} of ${CELLARS.length * 5} stages cleared · a hero of rank ${CELLAR_RANK} goes down`);
    const cupNow = LADDER.cups.reduce((k, c, i) => (cupOpen(s, i) && !cupDone(s, i) && k < 0 ? i : k), -1);
    road('#go-ladder', ladderOpen(s), fn => Pictures.cup(Math.max(0, cupNow), fn),
      !ladderOpen(s) ? `Opens when you win table 15 of ${REGIONS[0].name}.` : cupNow < 0 ? 'Every cup climbed.' : `${LADDER.cups[cupNow].name}: ${Ladder.place(RUNGS[cupAt(s, cupNow).rung])}`);
    Pictures.card(ROW['tome-of-the-dunes'] || DATA.cards[0], url => bg('#go-decks', url));
    Pictures.card(ROW['owl-archivist'] || DATA.cards[1], url => bg('#go-collection', url));
    Pictures.kiln(url => bg('#go-kiln', url));
    Pictures.chest('premium', url => bg('#go-chests', url));
    Pictures.card(ROW['seers-globe'] || DATA.cards[2], url => bg('#go-options', url));
    const badge = (id, text) => { const d = $(id); const old = d.querySelector('.new'); if (old) old.remove(); if (text) d.append(h('span.new', text)); };
    const seen = new Set(s.seen.kiln || []);
    badge('#go-kiln', openRecipes(s).some(r => !seen.has(r.card)) ? 'New' : '');
    badge('#go-chests', s.freePremium ? 'Free' : '');
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

/* ---------------------------------------------------------------- the start */

(async function boot() {
  const service = CONTENT.saves || {};
  const savesChanged = what => {
    if (what === 'replaced') { const p = Game.save.current(); if (p) { Game.me = mendSave(p.data); purse(); } else if (Screens.now !== 'door') Door.show(); }
    if (Screens.now === 'door') Door.draw();
  };
  Game.save = SonicSave({ api: service.api || '', game: service.game || 'leadlight', onChange: savesChanged });
  Game.cast = SonicCast({ api: service.api || '', game: service.game || 'leadlight', onChange: () => { if (Screens.now === 'campaign') Campaign.show(); else if (Screens.now === 'door') Door.draw(); else if (Screens.now === 'menu') Menu.show(); } });
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
  $('#go-campaign').onclick = () => Campaign.show({ world: 'main' });
  $('#go-mirror').onclick = () => { if (mirrorOpen(Me.data)) Campaign.show({ world: 'fc' }); else toast(`Mirrorside opens when you win table 15 of ${REGIONS[1].name}.`); };
  $('#go-cellars').onclick = () => { if (cellarsOpen(Me.data)) Cellars.show(); else toast(`The cellars open when you win table ${Number(CELLARS_AFTER)} of ${REGIONS[0].name}.`); };
  $('#go-ladder').onclick = () => { if (ladderOpen(Me.data)) Ladder.show(); else toast(`The ladder opens when you win table 15 of ${REGIONS[0].name}.`); };
  $('#go-decks').onclick = () => Decks.list();
  $('#go-collection').onclick = () => Album.show();
  $('#go-kiln').onclick = () => Kiln.show();
  $('#go-chests').onclick = () => Chests.show();
  $('#go-options').onclick = () => options();
  for (const b of $$('[data-back]')) b.onclick = () => Menu.show();
  const cur = Game.save.current();
  if (cur) { Game.me = mendSave(cur.data); Menu.show(); } else Door.show();
})();
