/* After a battle. A win: the star it brought (or did not), what it paid — XP, coins, the cards her creatures left,
   a hero won over, what a milestone gave, what opened — and then, at a table of either road, the cards turned over,
   one for each star of the table, each of which may be turned again for a Jewel. At the treasure thief's table her
   hoard and her treasure's step; at the masked brawler's, the round's prize; in a cellar, the stage. A loss: her
   word, and what stays with her. On the ladder: the rung, and the cup's prizes. */

const After = (() => {
  const box = () => $('#after'), inn = () => $('#after-in');
  function open() { box().classList.add('on'); inn().innerHTML = ''; inn().scrollTop = 0; }
  function close() { box().classList.remove('on'); }
  const caps = text => h('div.caps', { style: { fontSize: '13px', color: 'var(--ink2)' } }, text);

  function win(res, q, done) {
    open();
    const s = Me.data, her = HERO[q.hero], person = CONTENT.cast.people[her.cast], me = HERO[res.hero], el = inn();
    el.append(h('div.result-face', faceEl(her, 120)), h('h3', 'You win'), h('p.said', { style: { margin: '0' } }, `“${person.lines.lose}”`));
    const road = res.kind === 'main' || res.kind === 'fc';
    if (road || res.kind === 'tcat') el.append(h('div.bigstars', [0, 1, 2].map(i => h('i' + (i < res.stars ? '.on' : '') + (i === res.stars - 1 && res.stars > res.starsBefore ? '.fresh' : '')))));
    if (res.kind === 'tcat') el.append(h('div.check.ok', `Treasure ${GOLDIE.tables.indexOf(q.id) + 1} of hers: ${res.stars} of 3` + (res.newlyCleared ? ' — the first time.' : '.')));
    else if (res.kind === 'elfisto' && res.prize) el.append(h('div.check.ok', `Round ${res.prize.round} of ${ROUNDS.length} is yours: ` + (res.prize.card ? cardName(res.prize.card) : res.prize.jewels ? `${res.prize.jewels} Jewels` : `${fmt(res.prize.coins)} coins`) + '.'));
    else if (res.stage) el.append(h('div.check.ok', `Stage ${res.stage.stage} of ${CELLARS[res.stage.cellar].name}` + (res.newlyCleared ? (res.stage.stage < 5 ? ` cleared: stage ${res.stage.stage + 1} opens.` : ' cleared: the whole cellar is yours.') : ' — won again.')));
    else if (res.condition) el.append(h('div.check' + (res.met ? '.ok' : '.no'), (res.met ? '✓ ' : '✗ ') + conditionText(res.condition) + (res.met ? '' : ' — that star waits for another win.')));
    else if (road) el.append(h('div.check', 'Every star of this table was already yours.'));
    if (res.jewel) el.append(h('div.check.ok', h('i.gem'), ' A Jewel for the third star.'));
    if (res.prize && res.prize.jewels) el.append(h('div.check.ok', h('i.gem'), ` ${res.prize.jewels} Jewels from her round.`));
    // what it paid
    const rankUp = res.rankAfter > res.rankBefore, lo = xpForRank(res.rankAfter, schemeOf(res.hero)), hi = res.rankAfter >= MAX_RANK ? lo : xpForRank(res.rankAfter + 1, schemeOf(res.hero));
    const fill = h('i', { style: { width: '0%' } });
    const paid = h('div.paid',
      h('div', h('div.k', heroTitle(me)), h('div.v', `+${fmt(res.xp)} XP`), h('div', { style: { fontSize: '14px', fontWeight: rankUp ? 700 : 500, color: rankUp ? 'var(--ok)' : 'var(--ink2)' } }, rankUp ? `Rank ${res.rankBefore} → ${res.rankAfter}: ${10 + 5 * res.rankAfter} health, ${deckMax(res.rankAfter)} cards` : `Rank ${res.rankAfter}`), h('div.xpbar', fill)),
      h('div', h('div.k', 'Coins'), h('div.v', h('i.coin'), ' +' + fmt(res.coins)), h('div', { style: { fontSize: '14px', color: 'var(--ink2)' } }, res.coins > res.reward ? `${fmt(res.reward)} for the win, ${fmt(res.coins - res.reward)} found` : 'for the win')));
    el.append(paid);
    requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = (hi > lo ? clampN((res.xpAfter - lo) / (hi - lo), 0, 1) * 100 : 100) + '%'; }));
    const gifts = res.gifts.filter(g => g.kind === 'card'), found = res.cards.filter(id => id !== res.hoard), extra = [];
    if (res.hoard) extra.push([res.hoard, 'from her hoard']);
    if (res.prize && res.prize.card) extra.push([res.prize.card, 'the round\'s prize']);
    for (const id of res.done) extra.push([COMMISSION[id].reward, COMMISSION[id].name + ', done']);
    if (found.length || gifts.length || extra.length) {
      const row = h('div.gotcards');
      for (const id of found) row.append(cardEl(ROW[id], { mini: true }));
      for (const [id] of extra) row.append(cardEl(ROW[id], { mini: true }));
      for (const g of gifts) row.append(cardEl(ROW[g.id], { mini: true }));
      el.append(h('div', caps(found.length ? 'Her creatures left you' + (extra.length || gifts.length ? ', and more' : '') : 'Yours now'), row));
      for (const [id, why] of extra) el.append(h('p.note', h('b', ROW[id].name), ` — ${why}.`));
      for (const g of gifts) el.append(h('p.note', h('b', ROW[g.id].name), ` — ${g.why}.`));
    }
    for (const [id, n] of res.pieces) { const c = COMMISSION[id], w = s.commissions[id]; el.append(h('p.note', h('b', `${c.name}: `), `${piecesOf(c, n)} found, ${w.got} of ${c.need}` + (w.done ? ' — done.' : '.'))); }
    for (const id of res.started) { const c = COMMISSION[id]; el.append(h('p.note', h('b', `A commission: ${c.name}. `), c.line)); }
    for (const g of res.gifts.filter(x => x.kind === 'deck')) el.append(h('p.note', h('b', 'A deck for Mirrorside: '), `${g.why}. The mirror's tables take its heroes only.`));
    if (res.joined.length) el.append(h('div.joined', res.joined.map(j => h('div', faceEl(HERO[j.id], 56), h('div', h('b', `${heroTitle(HERO[j.id])} joins you`), h('br'), h('small', j.why))))));
    else if (res.recruitChance !== null) el.append(h('p.note', `She stays on her side of the table this time. The next win over her is ${Math.round(Math.min(1, ((s.recruit[q.hero] || 0) + 1) / RECRUIT_SURE) * 100)}% likely to bring her over.`));
    if (res.recipes.length) el.append(h('p.note', h('b', 'New at the Kiln: '), res.recipes.map(cardName).join(', ') + '.'));
    const opened = res.opened.map(id => (REGION_OF[id] ? (REGION_OF[id].encore ? 'the encore road of ' : REGION_OF[id].at === 0 ? '' : `table ${REGION_OF[id].at + 1} of `) + REGIONS[REGION_OF[id].region].name
      : MIRROR_OF[id] ? (id === MIRROR.first ? 'Mirrorside, through the glass' : `${Campaign.tableLabel(id)} of ${MIRROR_REGIONS[MIRROR_OF[id].region].name}`) : '')).filter(Boolean);
    if (opened.length) el.append(h('p.note', h('b', 'Opened: '), opened.join(', ') + '.'));
    const n = res.stars;
    if (road) el.append(h('div.row', { style: { justifyContent: 'center', marginTop: '4px' } }, h('button.jewel.go', { onclick: () => flips(res, q, done) }, `Turn over ${n === 1 ? 'a card' : n + ' cards'}`)));
    else el.append(h('div.row', { style: { justifyContent: 'center', marginTop: '4px' } },
      res.stage ? h('button.jewel.quiet', { onclick: () => { close(); done({ again: q.id }); } }, 'Play this stage again') : '',
      res.stage && res.stage.stage < 5 ? h('button.jewel.go', { onclick: () => { close(); done({ next: CELLARS[res.stage.cellar].tables[res.stage.stage].id }); } }, 'On to the next stage') : '',
      h('button.jewel' + (res.stage && res.stage.stage < 5 ? '.quiet' : '.go'), { onclick: () => { close(); done({ next: q.id }); } }, res.stage ? 'Back to the cellars' : 'Back to the map')));
  }

  /** a ladder battle: the rung climbed (or kept), the prizes on the way, what comes next */
  function ladder(res, q, done) {
    open();
    const s = Me.data, her = HERO[q.hero], person = CONTENT.cast.people[her.cast], el = inn(), c = LADDER.cups[res.cup];
    el.append(h('div.result-face', faceEl(her, 120)), h('h3', res.won ? 'You win' : `${nameOf(her.cast)} wins`), h('p.said', { style: { margin: '0' } }, `“${res.won ? person.lines.lose : person.lines.win}”`));
    el.append(h('div.check' + (res.won ? '.ok' : ''), res.won ? `${c.name}: ${Ladder.place(RUNGS[res.from])} → ${Ladder.place(RUNGS[res.rung])}` : `${c.name}: you keep ${Ladder.place(RUNGS[res.rung])}, and another opponent waits.`));
    if (res.prizes.length) {
      const row = h('div.gotcards');
      for (const p of res.prizes) if (p.card) row.append(cardEl(ROW[p.card], { mini: true }));
      if (row.childNodes.length) el.append(row);
      for (const p of res.prizes) el.append(h('p.note', h('b', p.rank === RUNGS[0] ? 'For taking part: ' : `For ${Ladder.place(p.rank)}: `), Ladder.prizeText(p) + '.'));
    }
    if (res.opened !== null) el.append(h('p.note', h('b', 'Opened: '), `${LADDER.cups[res.opened].name}.`));
    const next = nextPrize(s, res.cup), top = cupDone(s, res.cup);
    if (top) el.append(h('p.note', `The top of ${c.name}: every prize of it is yours.`));
    else if (next) el.append(h('p.note', `Next: ${Ladder.prizeText(next)} at ${Ladder.place(next.rank)}.`));
    purse();
    el.append(h('div.row', { style: { justifyContent: 'center', marginTop: '4px' } },
      !top ? h('button.jewel.go', { onclick: () => { close(); done({ again: true, cup: res.cup }); } }, 'Next opponent') : '',
      h('button.jewel' + (top ? '.go' : '.quiet'), { onclick: () => { close(); done({ cup: res.opened !== null ? res.opened : res.cup }); } }, 'Back to the ladder')));
  }

  /** the cards turned over: n of them, each drawn as the original's daily gift draws a card, each may be turned again */
  function flips(res, q, done) {
    open();
    const s = Me.data, n = res.stars, el = inn(), got = new Array(n).fill(null);
    el.append(h('h3', 'Turn them over'), h('p.note', { style: { textAlign: 'center' } }, `One card for each star of this table. Gilded ones come about one time in seven; Obsidian is very rare. Not the one you hoped for? Turn it again for ${DATA.flips.retry} Jewel${DATA.flips.retry > 1 ? 's' : ''} — the card it showed goes back.`));
    const row = h('div.flips'), foot = h('div.row', { style: { justifyContent: 'center' } });
    el.append(row, foot);
    const cols = [];
    for (let i = 0; i < n; i++) {
      const col = h('div.flipcol'), flip = h('div.flip', h('div.card.back'));
      col.append(flip, h('div', { style: { minHeight: '30px' } }));
      flip.onclick = () => { if (!got[i]) turn(i); };
      cols.push(col); row.append(col);
    }
    const turn = (i, again) => {
      const col = cols[i], old = col.firstChild;
      if (again) { removeCards(s, got[i].card, 1); if (got[i].fresh && !ownCount(s, got[i].card)) delete s.met[got[i].card]; s.jewels -= DATA.flips.retry; }
      const d = flipDraw(); d.fresh = !s.met[d.card]; got[i] = d; addCard(s, d.card); Me.write(); purse();
      const face = cardEl(ROW[d.card]); face.classList.add('face-side');
      const flip = h('div.flip.tier-' + d.tier, h('div.card.back'), face);
      col.replaceChild(flip, old);
      requestAnimationFrame(() => requestAnimationFrame(() => flip.classList.add('turned')));
      const under = col.lastChild; under.innerHTML = '';
      setTimeout(() => {
        under.append(h('div.row', { style: { justifyContent: 'center', gap: '6px' } }, d.tier !== 'standard' ? h('span.tiertag.' + d.tier, d.tier === 'gilded' ? 'Gilded' : 'Obsidian') : '',
          ownCount(s, d.card) === 1 ? h('span.tiertag', 'New') : '',
          h('button.jewel.small.quiet', { disabled: s.jewels < DATA.flips.retry, title: s.jewels < DATA.flips.retry ? 'Not enough Jewels' : '', onclick: () => turn(i, true) }, 'Again · ', h('i.gem'), String(DATA.flips.retry))));
        if (got.every(Boolean)) finishRow();
      }, 650);
    };
    const finishRow = () => {
      foot.innerHTML = '';
      const nextQ = q.type === 'fc' ? nextMirrorTable(s) : nextTable(s);
      foot.append(h('button.jewel.quiet', { onclick: () => { close(); done({ again: q.id }); } }, 'Play this table again'),
        h('button.jewel.go', { onclick: () => { close(); done({ next: nextQ ? nextQ.id : q.id }); } }, 'Back to the map'));
    };
    foot.append(h('span.note', 'Tap a card to turn it over.'));
  }

  function loss(q, loot, done, mode) {
    open();
    const her = HERO[q.hero], person = CONTENT.cast.people[her.cast], el = inn();
    el.append(h('div.result-face', faceEl(her, 120)), h('h3', `${nameOf(her.cast)} wins`), h('p.said', `“${person.lines.win}”`));
    const pieces = Object.entries(loot.pieces || {}).filter(([, n]) => n > 0).map(([id, n]) => piecesOf(COMMISSION[id], n));
    const lost = [loot.cards.length ? `${loot.cards.length} card${loot.cards.length > 1 ? 's' : ''}` : '', loot.coins ? fmt(loot.coins) + ' coins' : '', ...pieces].filter(Boolean);
    el.append(h('p.note', { style: { textAlign: 'center' } }, lost.length ? `What you found at her table stays with her: ${lost.join(', ').replace(/, ([^,]*)$/, ' and $1')}.` : 'Nothing is lost but the table.'));
    if (mode === 'goldie') el.append(h('p.note', { style: { textAlign: 'center' } }, 'Goldie slips away with her treasure. She will turn up again at Mirrorside before long.'));
    if (mode === 'velvet') el.append(h('p.note', { style: { textAlign: 'center' } }, 'The round is still to be won: she will step in again.'));
    const again = mode !== 'goldie' && mode !== 'velvet';
    el.append(h('div.row', { style: { justifyContent: 'center' } }, again ? h('button.jewel.go', { onclick: () => { close(); done({ again: q.id }); } }, 'Try again') : '',
      h('button.jewel' + (again ? '.quiet' : '.go'), { onclick: () => { close(); done({ next: q.id }); } }, mode === 'cellar' ? 'Back to the cellars' : 'Back to the map')));
  }
  return { win, loss, ladder, close };
})();
