/* The Kiln: the recipes the player's wins have opened (FusionManager, CWFuseFuseCards), what each takes and what it
   costs, and the firing (CWFuseCraft): the ingredients go, the card comes out, every time. */

const Kiln = (() => {
  let pickId = null;
  const S = () => Me.data;
  const order = r => { const q = QUEST[r.unlock]; return r.unlock === '0' ? 0 : q && (q.type === 'main' || q.type === 'fc' || q.type === 'tcat') ? Number(q.id) : 10000; };

  function show() {
    Screens.show('kiln'); purse();
    const s = S();
    s.seen.kiln = openRecipes(s).map(r => r.card); Me.write();
    $('#kiln-side').classList.remove('open');
    list(); side(pickId);
  }
  function list() {
    const s = S(), box = $('#recipes'); box.innerHTML = '';
    const rs = openRecipes(s).sort((a, b) => (!craftBlock(s, a) ? 0 : 1) - (!craftBlock(s, b) ? 0 : 1) || order(b) - order(a));
    for (const r of rs) {
      const why = craftBlock(s, r), mini = cardEl(ROW[r.card], { mini: true });
      const missing = Object.entries(recipeNeeds(r)).some(([id, n]) => ownCount(s, id) < n);
      const b = h('button.recipe' + (pickId === r.card ? '.sel' : ''), { onclick: () => { pickId = r.card; for (const x of $$('.recipe')) x.classList.remove('sel'); b.classList.add('sel'); side(r.card, true); } },
        mini, h('div', h('b', cardName(r.card)), h('small', r.needs.map(([id, n]) => `${n} × ${ROW[id].name}`).join(' · '))),
        h('span.chip' + (!why ? '.ready' : missing ? '.short' : ''), !why ? 'Ready' : missing ? 'Missing cards' : s.coins < r.cost ? 'Needs coins' : 'Not now'));
      box.append(b);
    }
    // the next recipes the road opens, faintly, with what opens them
    const shut = DATA.recipes.filter(r => !recipeOpen(s, r)).map(r => ({ r, when: recipeWhen(r) })).filter(x => x.when).sort((a, b) => a.when.at - b.when.at).slice(0, 8);
    if (shut.length) {
      box.append(h('h4', 'Still to open'));
      for (const { r, when } of shut) box.append(h('div.recipe.locked', cardEl(ROW[r.card], { mini: true, lazy: true }), h('div', h('b', cardName(r.card)), h('small', when.text)), h('span.chip', 'Not yet')));
    }
  }
  /** what opens a recipe still shut: { at (to put them in road order), text }, or null when nothing in reach does */
  function recipeWhen(r) {
    const q = QUEST[r.unlock];
    if (q && q.type === 'main' && REGION_OF[q.id]) { const a = REGION_OF[q.id]; return { at: Number(q.id), text: `Opens when you win table ${a.at + 1} of ${REGIONS[a.region].name}.` }; }
    if (q && q.type === 'fc' && MIRROR_OF[q.id]) return { at: 500 + Number(q.id) / 100, text: `Opens when you win ${Campaign.tableLabel(q.id)} of ${MIRROR_REGIONS[MIRROR_OF[q.id].region].name}.` };
    if (q && q.type === 'tcat' && goldieOpen(Me.data)) return { at: 3000 + GOLDIE.tables.indexOf(q.id), text: `Opens when you beat Goldie with her treasure ${GOLDIE.tables.indexOf(q.id) + 1}: she carries one of ${GOLDIE.tables.length} at a time.` };
    const M = CAMPAIGN.milestones;
    for (let k = 0; k < REGIONS.length; k++) {
      if (M.clear[k + 1].recipes.includes(r.card)) return { at: Number(REGIONS[k].tables[14].id) + 0.5, text: `Opens when the last table of ${REGIONS[k].name} is won.` };
      if (M.glazed[k + 1].recipes.includes(r.card)) return { at: 1000 + k, text: `Opens when every table of ${REGIONS[k].name} has three stars.` };
    }
    return null;
  }
  function side(id, opened) {
    const s = S(), el = $('#kiln-side'); el.innerHTML = ''; el.append(sheetCloser(el));
    const art = h('div.kiln-art', Pictures.img('kiln'));
    if (!id || !RECIPE[id] || !recipeOpen(s, RECIPE[id])) {
      el.append(art, h('h3', 'The Kiln'), h('p', 'Every recipe here always gives its card: put in what it asks for and the coins, and the card comes out of the fire. The cards you put in are used up.'),
        h('p.note', `You always keep at least ${MIN_CREATURES} creatures, so a recipe that would leave you fewer waits.`));
      return;
    }
    const r = RECIPE[id], why = craftBlock(s, r), need = recipeNeeds(r), big = cardEl(ROW[id]);
    big.style.setProperty('--w', '200px'); big.style.justifySelf = 'center';
    const needs = h('div.needs');
    for (const [cid, n] of Object.entries(need)) {
      const have = ownCount(s, cid), c = cardEl(ROW[cid], { mini: true });
      needs.append(h('div.need', { title: cardName(cid) }, c, h('span.have' + (have < n ? '.short' : ''), `${have} / ${n}`)));
    }
    el.append(big, h('h3', { style: { textAlign: 'center' } }, cardName(id)),
      h('div.caps', { style: { fontSize: '13px', color: 'var(--ink2)', textAlign: 'center' } }, 'It takes'), needs,
      h('div.row', { style: { justifyContent: 'center', marginTop: '10px' } }, h('button.jewel.go', { disabled: !!why, title: why, onclick: () => fire(r) }, 'Fire it · ', h('i.coin'), fmt(r.cost))),
      why ? h('p.note', { style: { textAlign: 'center' } }, why) : '',
      ownCount(s, id) ? h('p.note', { style: { textAlign: 'center' } }, `You have ${ownCount(s, id)} already.`) : '');
    if (opened) sheetOpen(el);
  }
  async function fire(r) {
    const s = S();
    if (!craft(s, r)) return;
    Me.write(); purse();
    const stage = $('#opening-stage'), pop = $('#opening'); stage.innerHTML = '';
    const art = h('div.art', Pictures.img('kiln'));
    stage.append(art); pop.classList.add('on');
    await sleep(1000);
    document.body.append(Object.assign(h('div.burst'), {})); setTimeout(() => $$('.burst').forEach(b => b.remove()), 800);
    stage.innerHTML = '';
    stage.append(cardEl(ROW[r.card]), h('div.row', h('button.jewel.go', { onclick: () => { pop.classList.remove('on'); list(); side(r.card); } }, 'Take it')));
  }
  return { show };
})();
