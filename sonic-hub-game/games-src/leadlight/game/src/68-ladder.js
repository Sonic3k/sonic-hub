/* The ladder: the original's tournaments, played against the land's own tables instead of other players. A cup is
   climbed from 999th place to the first, a rung a win, each opponent drawn among the tables near the rung's rank;
   its prizes come on the way, as the tournament's table gives them for each place. Reaching the tenth place opens
   the next cup. A loss keeps the rung and draws another opponent. */

const Ladder = (() => {
  let cup = 0;
  const S = () => Me.data;
  const place = n => n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : n + 'th';
  const prizeText = p => (p.card ? cardName(p.card) : p.jewels ? `${p.jewels} Jewels` : `${fmt(p.coins)} coins`);
  const prizeEl = p => (p.card ? h('span.prize.cardprize', { title: cardName(p.card) }, cardEl(ROW[p.card], { mini: true, lazy: true })) : p.jewels ? h('span.prize', h('i.gem'), String(p.jewels)) : h('span.prize', h('i.coin'), fmt(p.coins)));

  function show(o = {}) {
    Screens.show('ladder'); purse();
    const s = S();
    if (o.cup !== undefined) cup = o.cup;
    if (!cupOpen(s, cup)) cup = 0;
    $('#ladder-side').classList.remove('open');
    draw(); side(false);
  }

  function draw() {
    const s = S(), box = $('#cup-list'), open = ladderOpen(s);
    box.innerHTML = '';
    const strip = h('div.cupstrip');
    LADDER.cups.forEach((c, k) => {
      const ok = cupOpen(s, k), disc = h('span.disc'), at = cupAt(s, k);
      Pictures.cup(k, url => { disc.style.backgroundImage = `url(${url})`; });
      const b = h('button.cuptab' + (k === cup ? '.on' : '') + (ok ? '' : '.locked'), { title: c.name, onclick: () => {
        if (!ok) { toast(k === 0 ? `The ladder opens when you win table 15 of ${REGIONS[0].name}.` : `${c.name} opens when you reach 10th place in ${LADDER.cups[k - 1].name}.`); return; }
        cup = k; draw(); side(true);
      } }, disc, h('span', c.name.replace(/^The /, '').replace(/ Cup$/, '')), h('small', !ok ? 'Not yet' : cupDone(s, k) ? '1st ✓' : place(RUNGS[at.rung])));
      strip.append(b);
      if (k === cup) requestAnimationFrame(() => b.scrollIntoView({ block: 'nearest', inline: 'center' }));
    });
    box.append(strip);
    if (!open) { box.append(h('p.note.wide', `The ladder opens when you win table 15 of ${REGIONS[0].name}.`)); return; }
    // the ladder itself: the first place at the top
    const at = cupAt(s, cup), c = LADDER.cups[cup], deck = s.decks[s.deck], rungs = h('div.rungs');
    for (let k = RUNGS.length - 1; k >= 0; k--) {
      const rank = RUNGS[k], prize = c.prizes.find(p => p.rank === rank);
      rungs.append(h('div.rung' + (k === at.rung ? '.here' : k < at.rung ? '.past' : '') + (prize ? '.prized' : ''),
        h('span.place', place(rank)), h('span.rail', k === at.rung ? h('span.me', faceEl(HERO[deck.hero], 34)) : ''),
        prize ? h('span.what' + (at.given[rank] ? '.got' : ''), prizeEl(prize), at.given[rank] ? h('em', '✓') : '') : h('span.what')));
    }
    // what the cup is climbed for: its two cards, large, under its picture
    const best = c.prizes.filter(p => p.card).sort((a, b) => a.rank - b.rank).map(p => {
      const card = cardEl(ROW[p.card], { lazy: true }); card.style.setProperty('--w', phone() ? '96px' : '112px');
      if (at.given[p.rank]) card.classList.add('won');
      card.onclick = () => Campaign.lookCard(p.card);
      return h('div.topprize', card, h('b', `${place(p.rank)} place`), h('small', at.given[p.rank] ? 'Yours' : cardName(p.card)));
    });
    box.append(h('div.ladderwrap', h('div.cupside', h('div.cupart', Pictures.img('cup', cup)), h('div.caps', 'Climbed for'), h('div.topprizes', best)), rungs));
    requestAnimationFrame(() => { const here = rungs.querySelector('.rung.here'); if (here) here.scrollIntoView({ block: 'nearest' }); });
  }

  function side(opened) {
    const s = S(), el = $('#ladder-side'), c = LADDER.cups[cup];
    el.innerHTML = ''; el.scrollTop = 0; el.append(sheetCloser(el));
    el.append(h('h3', c.name));
    if (!cupOpen(s, cup)) { el.append(h('p.note', { style: { textAlign: 'center' } }, cup === 0 ? `The ladder opens when you win table 15 of ${REGIONS[0].name}.` : `It opens when you reach 10th place in ${LADDER.cups[cup - 1].name}.`)); if (opened) sheetOpen(el); return; }
    const at = cupAt(s, cup), next = nextPrize(s, cup);
    el.append(h('div.sub', `You stand ${place(RUNGS[at.rung])}` + (cupDone(s, cup) ? ' — the top of the cup.' : `; a win takes you to ${place(RUNGS[at.rung + 1])}.`)));
    if (next) el.append(h('p.note', { style: { textAlign: 'center' } }, h('b', `At ${place(next.rank)}: `), prizeText(next) + '.'));
    if (!at.given[RUNGS[0]]) el.append(h('p.note', { style: { textAlign: 'center' } }, `Your first battle in this cup brings ${prizeText(c.prizes.find(p => p.rank === RUNGS[0]))}, win or lose.`));
    if (cupDone(s, cup)) { el.append(h('p.note', { style: { textAlign: 'center' } }, 'Every prize of this cup is yours.')); if (opened) sheetOpen(el); return; }
    const q = cupFoe(s, cup); Me.write();
    const her = HERO[q.hero], person = CONTENT.cast.people[her.cast], from = REGION_OF[q.id] ? `${Campaign.tableLabel(q.id)} of ${REGIONS[REGION_OF[q.id].region].name}` : CELLAR_OF[q.id] ? `stage ${CELLAR_OF[q.id].stage} of ${CELLARS[CELLAR_OF[q.id].cellar].name}` : '';
    el.append(h('div.face-big', faceEl(her, 120)), h('h3', nameOf(her.cast)), h('div.sub', (her.form ? her.form + ' · ' : '') + person.role),
      h('p.hello', `“${person.lines.hello}”`),
      h('div.facts', h('span', 'Rank ' + q.rank), from ? h('span', 'Her deck from ' + from) : ''),
      h('p.note', 'On the ladder a battle pays no XP and no coins, and her creatures leave nothing: the cup\'s prizes are the reward.'),
      h('p.note', h('b', 'Her gift: '), her.text));
    const blocked = s.decks.every(d => sitBlock(s, q, d));
    if (blocked) el.append(h('div.row', { style: { justifyContent: 'center' } }, h('button.jewel.small.quiet', { onclick: () => { drawFoe(s, cup); Me.write(); side(true); } }, 'None of your heroes may face her: draw another')));
    el.append(Campaign.sitbar(q, () => sit(q), () => show({ cup })));
    if (opened) sheetOpen(el);
  }

  function sit(q) {
    $('#ladder-side').classList.remove('open');
    const c = cup;
    Battle.start({ quest: q, deck: Me.data.deck, mode: 'ladder', cup: c }, after => {
      if (after && after.again && cupOpen(S(), c) && !cupDone(S(), c)) { const t = cupFoe(S(), c); Me.write(); if (!tableIssues(S(), t, S().decks[S().deck]).length) { cup = c; sit(t); return; } }
      show({ cup: after && after.cup !== undefined ? after.cup : c });
    });
  }
  return { show, place, prizeText };
})();
