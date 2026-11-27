/* After a battle. A win: the star it brought (or did not), what it paid — XP, coins, the cards her creatures left,
   a hero won over, what a milestone gave, what opened — and then the cards turned over, one for each star of the
   table, each of which may be turned again for a Jewel. A loss: her word, and what stays with her. */

const After = (() => {
  const box = () => $('#after'), inn = () => $('#after-in');
  function open() { box().classList.add('on'); inn().innerHTML = ''; inn().scrollTop = 0; }
  function close() { box().classList.remove('on'); }
  const caps = text => h('div.caps', { style: { fontSize: '13px', color: 'var(--ink2)' } }, text);

  function win(res, q, done) {
    open();
    const s = Me.data, her = HERO[q.hero], person = CONTENT.cast.people[her.cast], me = HERO[res.hero], el = inn();
    el.append(h('div.result-face', faceEl(her, 120)), h('h3', 'You win'), h('p.said', { style: { margin: '0' } }, `“${person.lines.lose}”`));
    el.append(h('div.bigstars', [0, 1, 2].map(i => h('i' + (i < res.stars ? '.on' : '') + (i === res.stars - 1 && res.stars > res.starsBefore ? '.fresh' : '')))));
    if (res.condition) el.append(h('div.check' + (res.met ? '.ok' : '.no'), (res.met ? '✓ ' : '✗ ') + conditionText(res.condition) + (res.met ? '' : ' — that star waits for another win.')));
    else el.append(h('div.check', 'Every star of this table was already yours.'));
    if (res.jewel) el.append(h('div.check.ok', h('i.gem'), ' A Jewel for the third star.'));
    // what it paid
    const rankUp = res.rankAfter > res.rankBefore, lo = xpForRank(res.rankAfter, schemeOf(res.hero)), hi = res.rankAfter >= MAX_RANK ? lo : xpForRank(res.rankAfter + 1, schemeOf(res.hero));
    const fill = h('i', { style: { width: '0%' } });
    const paid = h('div.paid',
      h('div', h('div.k', heroTitle(me)), h('div.v', `+${fmt(res.xp)} XP`), h('div', { style: { fontSize: '14px', fontWeight: rankUp ? 700 : 500, color: rankUp ? 'var(--ok)' : 'var(--ink2)' } }, rankUp ? `Rank ${res.rankBefore} → ${res.rankAfter}: ${10 + 5 * res.rankAfter} health, ${deckMax(res.rankAfter)} cards` : `Rank ${res.rankAfter}`), h('div.xpbar', fill)),
      h('div', h('div.k', 'Coins'), h('div.v', h('i.coin'), ' +' + fmt(res.coins)), h('div', { style: { fontSize: '14px', color: 'var(--ink2)' } }, res.coins > res.reward ? `${fmt(res.reward)} for the win, ${fmt(res.coins - res.reward)} found` : 'for the win')));
    el.append(paid);
    requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = (hi > lo ? clampN((res.xpAfter - lo) / (hi - lo), 0, 1) * 100 : 100) + '%'; }));
    const gifts = res.gifts.filter(g => g.kind === 'card');
    if (res.cards.length || gifts.length) {
      const row = h('div.gotcards');
      for (const id of res.cards) row.append(cardEl(ROW[id], { mini: true }));
      for (const g of gifts) row.append(cardEl(ROW[g.id], { mini: true }));
      el.append(h('div', caps(res.cards.length ? 'Her creatures left you' + (gifts.length ? ', and a gift' : '') : 'A gift'), row));
      for (const g of gifts) el.append(h('p.note', h('b', ROW[g.id].name), ` — ${g.why}.`));
    }
    if (res.joined.length) el.append(h('div.joined', res.joined.map(j => h('div', faceEl(HERO[j.id], 56), h('div', h('b', `${heroTitle(HERO[j.id])} joins you`), h('br'), h('small', j.why))))));
    else if (res.recruitChance !== null) el.append(h('p.note', `She stays on her side of the table this time. The next win over her is ${Math.round(Math.min(1, ((s.recruit[q.hero] || 0) + 1) / RECRUIT_SURE) * 100)}% likely to bring her over.`));
    if (res.recipes.length) el.append(h('p.note', h('b', 'New at the Kiln: '), res.recipes.map(id => ROW[id].name).join(', ') + '.'));
    const opened = res.opened.map(id => REGION_OF[id]).filter(Boolean);
    if (opened.length) el.append(h('p.note', h('b', 'Opened: '), opened.map(a => (a.encore ? 'the encore road of ' : a.at === 0 ? '' : `table ${a.at + 1} of `) + REGIONS[a.region].name).join(', ') + '.'));
    const n = res.stars;
    el.append(h('div.row', { style: { justifyContent: 'center', marginTop: '4px' } }, h('button.jewel.go', { onclick: () => flips(res, q, done) }, `Turn over ${n === 1 ? 'a card' : n + ' cards'}`)));
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
      const nextQ = nextTable(s);
      foot.append(h('button.jewel.quiet', { onclick: () => { close(); done({ again: q.id }); } }, 'Play this table again'),
        h('button.jewel.go', { onclick: () => { close(); done({ next: nextQ ? nextQ.id : q.id }); } }, 'Back to the map'));
    };
    foot.append(h('span.note', 'Tap a card to turn it over.'));
  }

  function loss(q, loot, done) {
    open();
    const her = HERO[q.hero], person = CONTENT.cast.people[her.cast], el = inn();
    el.append(h('div.result-face', faceEl(her, 120)), h('h3', `${nameOf(her.cast)} wins`), h('p.said', `“${person.lines.win}”`));
    const lost = loot.cards.length || loot.coins;
    el.append(h('p.note', { style: { textAlign: 'center' } }, lost ? `What you found at her table stays with her: ${[loot.cards.length ? `${loot.cards.length} card${loot.cards.length > 1 ? 's' : ''}` : '', loot.coins ? fmt(loot.coins) + ' coins' : ''].filter(Boolean).join(' and ')}.` : 'Nothing is lost but the table.'));
    el.append(h('div.row', { style: { justifyContent: 'center' } }, h('button.jewel.go', { onclick: () => { close(); done({ again: q.id }); } }, 'Try again'),
      h('button.jewel.quiet', { onclick: () => { close(); done({ next: q.id }); } }, 'Back to the map')));
  }
  return { win, loss, close };
})();
