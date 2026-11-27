/* The cellars (the original's dungeons, one for each day of the week, here every one open every day): five stages
   each, played one after another, a keeper at each, for XP, coins and what her creatures leave by their own
   chances (DungeonBattleResolver: no stars, and no cards turned over). A hero of the land of rank five or more goes
   down. */

const Cellars = (() => {
  let pick = 0, stage = null;
  const S = () => Me.data;
  const rangeText = ([a, b]) => { const lo = Math.floor(a + 0.5), hi = Math.floor(b + 0.5) - 1; return hi > lo ? `${fmt(lo)}–${fmt(hi)}` : fmt(lo); };
  const caps = text => h('div.caps', { style: { fontSize: '13px', color: 'var(--ink2)', marginBottom: '6px' } }, text);
  const stageNow = (s, k) => Math.min(CELLARS[k].tables.length, (s.cellars[k] || 0) + 1);

  function show(o = {}) {
    Screens.show('cellars'); purse();
    const s = S();
    if (o.quest && CELLAR_OF[o.quest]) { pick = CELLAR_OF[o.quest].cellar; stage = CELLAR_OF[o.quest].stage; }
    if (stage === null) stage = stageNow(s, pick);
    $('#cellar-side').classList.remove('open');
    list(); side(false);
  }

  function list() {
    const s = S(), box = $('#cellar-list'), open = cellarsOpen(s);
    box.innerHTML = '';
    if (!open) box.append(h('p.note.wide', `The way down opens when you win table ${Number(CELLARS_AFTER)} of ${REGIONS[0].name}.`));
    CELLARS.forEach((c, k) => {
      const done = s.cellars[k] || 0, art = h('span.art');
      Pictures.cellar(k, url => { art.style.backgroundImage = `url(${url})`; });
      const b = h('button.cellar' + (k === pick ? '.sel' : '') + (open ? '' : '.locked'), { onclick: () => { if (!open) { toast(`The cellars open when you win table ${Number(CELLARS_AFTER)} of ${REGIONS[0].name}.`); return; } pick = k; stage = stageNow(s, k); list(); side(true); } },
        art, h('span.txt', h('b', c.name), h('small', c.line)),
        h('span.depth', [1, 2, 3, 4, 5].map(i => h('i' + (i <= done ? '.on' : ''))), h('em', done >= c.tables.length ? 'All cleared' : `Stage ${done + 1} next`)),
        c.double ? h('span.twice', '×2') : '');
      box.append(b);
    });
    box.append(h('div.cellar.about', h('b', 'Down here'), h('p.note', 'Five stages a cellar, one after another, each kept by a woman of the land. No stars and no cards turned over: each of her creatures leaves what it carries by its own chance, and the stage pays its XP and coins. The Gilt and Silver cellars pay twice what the others do.'),
      h('p.note', `Only a hero of the land of rank ${CELLAR_RANK} or more goes down.`)));
  }

  function side(opened) {
    const s = S(), el = $('#cellar-side'), c = CELLARS[pick], done = s.cellars[pick] || 0;
    el.innerHTML = ''; el.scrollTop = 0; el.append(sheetCloser(el));
    el.append(h('div.cellar-art', Pictures.img('cellar', pick)), h('h3', c.name), h('div.sub', c.line));
    const rows = h('div.stages');
    c.tables.forEach((q, i) => {
      const n = i + 1, open = cellarStageOpen(s, pick, n), her = HERO[q.hero];
      rows.append(h('button.stage' + (n === stage ? '.sel' : '') + (open ? '' : '.locked') + (n <= done ? '.won' : ''), { disabled: !open, onclick: () => { stage = n; side(true); } },
        h('span.face-small', open ? faceEl(her, 40) : ''), h('span', h('b', `Stage ${n}`), h('small', `Rank ${q.rank} · ${rangeText(q.xp)} XP`)),
        h('em', n <= done ? '✓' : open ? 'Open' : '—')));
    });
    el.append(caps('Five stages, one after another'), rows);
    const q = c.tables[stage - 1];
    if (!cellarsOpen(s) || !q || !cellarStageOpen(s, pick, stage)) { if (opened) sheetOpen(el); return; }
    const her = HERO[q.hero], person = CONTENT.cast.people[her.cast];
    el.append(h('div.row', { style: { gap: '12px', alignItems: 'center', justifyContent: 'center' } }, h('div.face-small', faceEl(her, 72)),
      h('div', h('b', `${nameOf(her.cast)}, keeper of stage ${stage}`), h('br'), h('small', (her.form ? her.form + ' · ' : '') + person.role))),
      h('p.hello', `“${person.lines.hello}”`),
      h('div.facts', h('span', 'Rank ' + q.rank), h('span', rangeText(q.xp) + ' XP'), h('span', h('i.coin'), rangeText(q.coins)), s.wins[q.id] ? h('span', `Won ${s.wins[q.id]}×`) : ''));
    const drops = tableDrops(q);
    if (drops.length) {
      const row = h('div.drops');
      for (const cid of drops) { const cc = cardEl(ROW[cid], { mini: true }); cc.title = cardName(cid) + (ownCount(s, cid) ? ` · you have ${ownCount(s, cid)}` : ''); cc.onclick = () => Campaign.lookCard(cid); row.append(cc); }
      el.append(h('div', caps(`Her creatures may leave, up to ${q.maxLoot} a battle — each by its own chance`), row));
    }
    el.append(h('p.note', 'No stars down here, and no cards turned over: what a cellar gives is what her creatures leave, and its XP and coins.'));
    if (RECRUIT.has(q.hero) && s.heroes[q.hero] === undefined) el.append(h('p.note', h('b', 'Each win over her may bring her over to you.')));
    el.append(h('p.note', h('b', 'Her gift: '), her.text));
    el.append(Campaign.sitbar(q, () => sit(q), () => show({ quest: q.id })));
    if (opened) sheetOpen(el);
  }

  function sit(q) {
    $('#cellar-side').classList.remove('open');
    Battle.start({ quest: q, deck: Me.data.deck, mode: 'cellar' }, after => {
      const s = S(), at = CELLAR_OF[q.id];
      if (after && after.again) { const t = QUEST[after.again]; if (t && CELLAR_OF[t.id] && cellarStageOpen(s, CELLAR_OF[t.id].cellar, CELLAR_OF[t.id].stage)) { sit(t); return; } }
      stage = after && after.next && CELLAR_OF[after.next] ? CELLAR_OF[after.next].stage : at.stage;
      show({ quest: CELLARS[at.cellar].tables[stage - 1].id });
    });
  }
  return { show };
})();
