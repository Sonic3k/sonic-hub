/* The battle at the light table. The engine (engine/match.js) holds the match; this draws it, takes the player's
   moves (a tap, or a card dragged onto a lane), plays her opponent's turn one decision at a time, and runs each
   attack through the Rose Window. What happened is read from the engine's log and shown as it is read. */

const Battle = (() => {
  let M = null, table = null, logAt = 0, busy = false, selected = null, over = false, onEnd = null, gen = 0;
  /* what her beaten creatures have left at this table (CreatureBattleScript.DeathActions): kept only if she is beaten */
  let loot = { cards: [], coins: 0, pieces: {}, dropped: false }, extra = {};
  const ladder = () => table.mode === 'ladder';
  const units = new Map(), handEls = new Map();
  const them = () => HERO[table.quest.hero], themName = () => nameOf(them().cast);
  const pace = () => (Me.data.options.pace === 'brisk' ? 480 : 850);
  const rowOf = item => ROW[item.Form.ID];

  /* ---------------------------------------------------------------- setting the table */

  /** t: { quest: a table of the data, deck: the index of the player's deck, mode: where the table is when it is not on
   *  a road ('goldie', 'velvet', 'cellar', 'ladder'), cup: the ladder's cup }. done({ again, next }) when it is over. */
  function start(t, done) {
    table = t; onEnd = done; over = false; selected = null; logAt = 0; busy = false; gen++; units.clear(); handEls.clear();
    $('#hand').innerHTML = ''; $('#rose').classList.remove('on'); $('#prompt').classList.remove('on'); closeInspect();
    const q = t.quest, deck = Me.data.decks[t.deck], rank = heroRank(Me.data, deck.hero);
    loot = { cards: [], coins: 0, pieces: {}, dropped: false };
    if (!ladder()) { beginTable(Me.data, q); Me.write(); }
    // what the stars are also judged on, as the original counts it when the decks are set (GameState.SetDecks)
    extra = { landscapes: new Set(landsOf(deck)).size, deckCost: deck.cards.length };
    const userDeck = engineDeck(deck), userLeader = Catalog.leader(deck.hero, rank);
    const oppDeck = q.deck === 'player-clone' ? engineDeck(deck, 'mirror') : Catalog.deck(q.deck), oppLeader = Catalog.leader(q.hero, q.rank);
    AIManager.Faults.length = 0;
    M = new Match({ seed: (Math.random() * 4294967296) >>> 0, user: { deck: userDeck, leader: userLeader }, opponent: { deck: oppDeck, leader: oppLeader },
      quest: { spinFactor: q.spin, p1Hit: q.p1Hit, p1Crit: q.p1Crit, p2Hit: q.p2Hit, p2Crit: q.p2Crit, aiReshuffle: q.reshuffle } });
    Screens.show('battle');
    $('#lanes-you').innerHTML = ''; $('#lanes-them').innerHTML = '';
    for (let i = 0; i < 4; i++) { $('#lanes-you').append(laneEl(0, i)); $('#lanes-them').append(laneEl(1, 3 - i)); }
    render();
    say('');
    chooseLandscapes(landsOf(deck));
  }
  function laneEl(p, i) {
    const el = h('div.lane', { onclick: () => laneTapped(p, i) }, h('img.land', { alt: '' }), h('div.bslot'), h('div.cslot'), h('span.tag'));
    el.dataset.p = p; el.dataset.i = i;
    return el;
  }
  const laneAt = (p, i) => $(`.lane[data-p="${p}"][data-i="${i}"]`);

  /** the player lays her four landscapes: tap two to swap them */
  function chooseLandscapes(order) {
    const pop = $('#pop'), inn = $('#pop-in');
    let pick = null;
    const draw = () => {
      inn.innerHTML = '';
      inn.append(h('h3', 'Lay your landscapes'), h('p', `Each creature can only be played on a lane of its own realm. Tap two to swap them; the leftmost faces ${themName()}'s rightmost.`));
      const row = h('div.lands');
      order.forEach((t, i) => {
        const b = h('button' + (pick === i ? '.on' : ''), { onclick: () => { if (pick === null) pick = i; else { [order[pick], order[i]] = [order[i], order[pick]]; pick = null; } draw(); } }, Pictures.img('landscape', t), h('span', LAND_NAMES[t]));
        row.append(b);
      });
      inn.append(row, h('button.jewel.go', { onclick: () => { pop.classList.remove('on'); M.placeLandscapes(order); bottle(); } }, 'Lay them down'));
    };
    draw(); pop.classList.add('on');
  }
  /** the spin of the prism that says who goes first */
  async function bottle() {
    const first = M.gs.Log.find(e => e.t === 'first').p, pop = $('#pop'), inn = $('#pop-in');
    const cv = h('canvas.bottle', { width: 280, height: 280 });
    inn.innerHTML = ''; inn.append(h('h3', 'Who goes first?'), cv, h('p.said', ' '));
    pop.classList.add('on');
    const g = cv.getContext('2d'), end = (first === 0 ? Math.PI / 2 : -Math.PI / 2) + TAU * 4, t0 = performance.now(), T = 1500;
    await new Promise(res => {
      const step = now => {
        const k = Math.min(1, (now - t0) / T), e = 1 - Math.pow(1 - k, 3), a = end * e;
        g.clearRect(0, 0, 280, 280); g.save(); g.translate(140, 140); g.rotate(a);
        const cols = ['#e2a62e', '#be3a5e', '#2f62b4', '#3f7d52'];
        for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(120, i % 2 ? -14 : 14); g.lineTo(120, 0); g.closePath(); }
        g.beginPath(); g.moveTo(118, 0); g.lineTo(-40, -26); g.lineTo(-56, 0); g.lineTo(-40, 26); g.closePath();
        const gr = g.createLinearGradient(-56, 0, 118, 0); cols.forEach((c, i) => gr.addColorStop(i / 3, c)); g.fillStyle = gr; g.fill();
        g.lineWidth = 6; g.strokeStyle = '#2b2830'; g.stroke(); g.beginPath(); g.moveTo(-40, -26); g.lineTo(30, 0); g.lineTo(-40, 26); g.lineWidth = 3; g.stroke();
        g.restore();
        if (k < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
    $('.said', inn).textContent = first === 0 ? 'The prism points to you: you go first.' : `The prism points to ${themName()}: she goes first.`;
    await sleep(1100);
    pop.classList.remove('on');
    logAt = M.gs.Log.length;
    render();
    say(first === 0 ? 'Your turn. Lay a card on a lane of its realm, then go to battle.' : `${themName()} begins.`);
    advance();
  }

  /* ---------------------------------------------------------------- drawing the table */

  function heroBar(p) {
    const gs = M.gs, L = gs.GetLeader(p), row = HERO[L.Form.ID], hp = gs.GetHealth(p), max = gs.GetMaxHealth(p);
    const ready = p === 0 ? M.canUseHero() : gs.IsLeaderAbilityReady(p), cd = gs.GetLeaderCooldown(p);
    const lightN = gs.GetMagicPoints(p);
    const mini = h('div.lightmini'); for (let i = 0; i < Math.max(10, lightN); i++) mini.append(h('i' + (i < lightN ? '.on' : ''))); mini.append(h('span', ' ' + lightN));
    const w = h('div.hero-w', { onclick: () => inspectHero(p), onmouseenter: () => !phone() && inspectHero(p, true), onmouseleave: () => !phone() && unhover() },
      faceEl(row, 64),
      h('div.who', h('b', p === 0 ? (phone() ? 'You' : 'You · ' + nameOf(row.cast)) : nameOf(row.cast)), h('small', (row.form ? row.form + ' · ' : '') + 'Rank ' + L.Rank),
        h('div.hpbar', h('i', { style: { width: clampN((hp / max) * 100, 0, 100) + '%' } }), h('span', `${Math.max(0, hp)} / ${max}`)), mini),
      h('div.ability' + (ready && cd <= 0 ? '.ready' : '.wait'), { title: row.text }, cd > 0 ? String(cd) : '✦'),
    );
    w.dataset.p = p;
    const light = h('div.light', { title: 'Light' });
    for (let i = 0; i < Math.max(10, lightN); i++) light.append(h('i' + (i < lightN ? '.on' : '')));
    light.append(h('b', String(lightN)));
    const pieces = Object.values(loot.pieces).reduce((a, n) => a + n, 0);
    const found = p === 1 && (loot.cards.length || loot.coins || pieces) ? h('span.loot#loot', { title: 'Found at this table: yours if you win' }, loot.cards.length ? `◆ ${loot.cards.length} card${loot.cards.length > 1 ? 's' : ''}` : '', loot.coins ? h('span', h('i.coin'), fmt(loot.coins)) : '', pieces ? h('span', h('i.piece.' + table.quest.type), String(pieces)) : '') : '';
    const pills = h('div.pills', found, h('span', { title: 'Cards left in the deck' }, `Deck ${gs.GetDeck(p).CardCount()}`),
      p === 1 ? h('span', { title: 'Cards in her hand' }, `Hand ${gs.GetCardsInHand(1)}`) : '',
      h('span', { onclick: () => showPile(p), title: 'The discard pile' }, `Gone ${gs.GetDiscardPile(p).length}`));
    return p === 1 ? h('div.bar.them', w, light, pills) : h('div.bar', { style: { flexWrap: 'wrap', minHeight: 0 } }, w, h('div', { style: { display: 'grid', gap: '6px' } }, light, pills));
  }
  function render() {
    if (!M) return;
    const gs = M.gs;
    $('#bar-them').replaceWith(Object.assign(heroBar(1), { id: 'bar-them' }));
    $('#bar-you').replaceChildren(heroBar(0));
    for (const p of [0, 1]) for (let i = 0; i < 4; i++) drawLane(p, i);
    drawHand();
    const go = $('#go-w'); go.innerHTML = '';
    if (M.phase === 'user-setup') go.append(h('button.jewel.go', { onclick: endSetup, disabled: busy || !!gs.Pending }, gs.Turn <= 1 ? 'End turn' : 'Battle ⚔'));
    go.append(h('button.jewel.small.quiet', { onclick: leaveAsk }, 'Leave'));
    $('#phase').textContent = M.phase === 'over' ? 'The end' : M.phase.startsWith('user') ? (M.phase === 'user-battle' ? 'Your battle' : 'Your turn') : (M.phase === 'ai-battle' ? 'Her battle' : 'Her turn');
    markLanes();
  }
  function drawLane(p, i) {
    const gs = M.gs, lane = gs.GetLane(p, i), el = laneAt(p, i);
    if (!el) return;
    const land = el.querySelector('.land'), t = lane.Type === undefined ? 5 : lane.Type, flipped = lane.Flipped;
    if (land.dataset.t !== String(t)) { land.dataset.t = String(t); Pictures.landscape(t, url => { land.src = url; }); }
    land.style.filter = flipped ? 'grayscale(1) brightness(.6)' : '';
    el.querySelector('.tag').textContent = flipped ? 'Turned over' : LAND_NAMES[t];
    el.classList.toggle('full', lane.HasCreature());
    slot(el.querySelector('.cslot'), lane.GetCreature(), p, i, false);
    slot(el.querySelector('.bslot'), lane.GetBuilding(), p, i, true);
  }
  function slot(box, script, p, i, building) {
    const cur = box.firstElementChild, curScript = cur && cur._script;
    if (curScript && curScript !== script) {   // what stood here has gone: it fades from the glass
      cur.classList.add('dying'); cur._script = null; setTimeout(() => cur.remove(), 520);
    }
    if (!script) return;
    let el = units.get(script);
    if (!el || el.parentElement !== box || el.classList.contains('dying')) {
      if (el) el.remove();
      const row = rowOf(script.Data);
      el = h('div.unit' + (building ? '.building' : ''), { onclick: e => { e.stopPropagation(); unitTapped(p, i, building); }, onmouseenter: () => !phone() && inspectUnit(script, true), onmouseleave: () => !phone() && unhover() }, Pictures.img('card', row), h('div.nm', row.name));
      if (!building) el.append(h('span.s.atk'), h('span.s.hp'));
      el._script = script; units.set(script, el);
      box.append(el);
    }
    if (!building) {
      el.querySelector('.atk').textContent = String(script.ATK);
      const hp = el.querySelector('.hp'); hp.textContent = String(script.Health); hp.classList.toggle('hurt', script.Damage > 0);
      el.classList.toggle('glinted', !!script.Flooped);
      let chip = el.querySelector('.gl');
      const can = p === 0 && M.canFloop(i) && !busy;
      if (can && !chip) { chip = h('span.s.gl', { title: 'Glint', onclick: e => { e.stopPropagation(); glint(i); } }); el.append(chip); }
      if (chip) { if (!can) chip.remove(); else chip.textContent = '✦' + script.DetermineFloopCost(); }
    }
  }
  function drawHand() {
    const box = $('#hand'), hand = M.gs.GetHand(0), keep = new Set(hand);
    for (const [item, el] of handEls) if (!keep.has(item)) { el.remove(); handEls.delete(item); }
    hand.forEach((item, k) => {
      let el = handEls.get(item);
      const cost = item.Form.DetermineCost(0);
      if (!el || el._cost !== cost) {
        const fresh = cardEl(rowOf(item), { mini: true, cost });
        fresh._cost = cost; fresh._item = item;
        hookDrag(fresh, item);
        if (el) el.replaceWith(fresh); el = fresh; handEls.set(item, el);
      }
      if (box.children[k] !== el) box.insertBefore(el, box.children[k] || null);
      el.classList.toggle('sel', selected === item);
      el.classList.toggle('no', !playableAnywhere(item));
    });
    const n = hand.length, w = phone() ? 70 : innerHeight <= 760 ? 88 : 104, room = box.clientWidth || innerWidth;
    const gap = n > 1 ? clampN((room - w * n) / (2 * (n - 1)) - 1, -w * 0.36, 4) : 0;
    box.style.setProperty('--gap', gap.toFixed(1) + 'px');
  }
  function playableAnywhere(item) {
    if (M.phase !== 'user-setup') return false;
    if (item.Form.Type === CardType.Spell) return M.canCast(item);
    for (let i = 0; i < 4; i++) if (M.canSummon(item, i)) return true;
    return false;
  }
  /** which lanes glow: where the picked card can go, or what a card waits on */
  function markLanes() {
    for (const el of $$('.lane')) el.classList.remove('can');
    const pe = M.gs.Pending;
    if (pe && pe.kind === 'lane') { for (const i of pe.lanes) laneAt(pe.side, i).classList.add('can'); return; }
    if (selected && selected.Form.Type !== CardType.Spell) for (let i = 0; i < 4; i++) if (M.canSummon(selected, i)) laneAt(0, i).classList.add('can');
  }

  /* ---------------------------------------------------------------- the player's moves */

  const canAct = () => M && M.phase === 'user-setup' && !busy && !over;
  function select(item) {
    if (!canAct() || M.gs.Pending) return;
    selected = selected === item ? null : item;
    render();
    if (selected) inspectCard(selected); else closeInspect();
  }
  function laneTapped(p, i) {
    const pe = M.gs.Pending;
    if (pe && pe.kind === 'lane' && !busy) { if (pe.side === p && pe.lanes.includes(i)) { M.chooseLane(i); $('#prompt').classList.remove('on'); advance(); } return; }
    if (selected && p === 0 && canAct() && M.canSummon(selected, i)) { play(selected, i); return; }
    const lane = M.gs.GetLane(p, i);
    if (lane.HasCreature()) unitTapped(p, i, false);
  }
  function unitTapped(p, i, building) {
    const pe = M.gs.Pending;
    if (pe && pe.kind === 'lane') { laneTapped(p, i); return; }
    if (selected && p === 0 && canAct() && M.canSummon(selected, i)) { play(selected, i); return; }
    const s = building ? M.gs.GetBuilding(p, i) : M.gs.GetCreature(p, i);
    if (s) inspectUnit(s, false, p === 0 && !building ? i : null);
  }
  function play(item, i) {
    selected = null; closeInspect();
    M.summon(item, i);
    advance();
  }
  function cast(item) {
    if (!canAct() || !M.canCast(item)) return;
    selected = null; closeInspect();
    M.cast(item);
    advance();
  }
  function glint(i) {
    if (!canAct() || !M.canFloop(i)) return;
    closeInspect();
    M.floop(i);
    advance();
  }
  function useHero() {
    if (!canAct() || !M.canUseHero()) return;
    closeInspect();
    M.useHero();
    advance();
  }
  function endSetup() {
    if (!canAct() || M.gs.Pending) return;
    selected = null; closeInspect();
    M.endSetup();
    advance();
  }

  /* dragging a card from the hand: it follows the finger, lanes it can go to glow, and it is laid where it is let go */
  function hookDrag(el, item) {
    let start = null, ghost = null, gx = 0, gy = 0, vx = 0, lastX = 0, raf = 0, hoverLane = null;
    const move = e => {
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!ghost && Math.hypot(dx, dy) > 7) begin(e);
      if (!ghost) return;
      vx = vx * 0.7 + (e.clientX - lastX) * 0.3; lastX = e.clientX; gx = e.clientX; gy = e.clientY;
      if (!raf) raf = requestAnimationFrame(place);
      const under = document.elementFromPoint(e.clientX, e.clientY), lane = under && under.closest('.lane');
      const ok = lane && lane.dataset.p === '0' && M.canSummon(item, Number(lane.dataset.i));
      if (hoverLane && hoverLane !== lane) hoverLane.classList.remove('over');
      hoverLane = ok ? lane : null; if (hoverLane) hoverLane.classList.add('over');
      const zone = $('#cast-zone'); if (item.Form.Type === CardType.Spell) zone.classList.toggle('over', e.clientY < $('#hand').getBoundingClientRect().top - 10);
    };
    const place = () => { raf = 0; if (ghost) ghost.style.transform = `translate3d(${gx - 56}px, ${gy - 90}px, 0) rotate(${clampN(vx * 0.6, -12, 12)}deg) scale(1.06)`; };
    const begin = e => {
      if (!canAct() || M.gs.Pending) { start = null; return; }
      selected = item; markLanes(); el.classList.add('sel');
      ghost = h('div.ghost', el.cloneNode(true)); ghost.firstChild.classList.remove('sel'); document.body.append(ghost);
      el.style.opacity = '.25'; lastX = e.clientX; gx = e.clientX; gy = e.clientY; place();
      if (item.Form.Type === CardType.Spell && M.canCast(item)) $('#cast-zone').classList.add('on');
      closeInspect();
    };
    const end = (e, cancelled) => {
      if (!start) return;
      try { el.releasePointerCapture && el.releasePointerCapture(e.pointerId); } catch (x) { /* already let go */ }
      const was = ghost; start = null;
      if (!was) { if (!cancelled) select(item); return; }
      const zone = $('#cast-zone'), castIt = !cancelled && zone.classList.contains('on') && zone.classList.contains('over');
      zone.classList.remove('on', 'over');
      const target = cancelled ? null : hoverLane; if (hoverLane) hoverLane.classList.remove('over'); hoverLane = null;
      ghost = null; el.style.opacity = '';
      if (target) { was.remove(); play(item, Number(target.dataset.i)); return; }
      if (castIt) { was.remove(); cast(item); return; }
      const r = el.getBoundingClientRect();   // back to the hand it goes
      was.style.transition = 'transform .28s cubic-bezier(.2,.9,.3,1.2)'; was.style.transform = `translate3d(${r.left - 4}px, ${r.top - 4}px, 0) scale(1)`;
      setTimeout(() => was.remove(), 300);
      selected = null; render();
    };
    el.addEventListener('pointerdown', e => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      start = { x: e.clientX, y: e.clientY }; el.setPointerCapture && el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('dragstart', e => e.preventDefault());   // the browser's own dragging of the picture would cancel ours
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', e => end(e, true));
    el.addEventListener('mouseenter', () => { if (!phone() && !selected && !ghost) inspectCard(item, true); });
    el.addEventListener('mouseleave', () => { if (!phone()) unhover(); });
  }

  /* ---------------------------------------------------------------- looking at a card */

  function panel(cardNode, acts) {
    const el = phone() ? $('#sheet-pop') : $('#inspect');
    el.innerHTML = ''; el.append(cardNode);
    if (acts && acts.length) el.append(h('div.acts', acts));
    else if (phone()) el.append(h('div.acts', h('button.jewel.small.quiet', { onclick: closeInspect }, 'Close')));
    el.classList.add('on');
  }
  function pickbar(item) {
    const bar = $('#pickbar'), row = rowOf(item), spell = item.Form.Type === CardType.Spell;
    bar.innerHTML = '';
    bar.append(h('span.c', String(item.Form.DetermineCost(0))), h('div.t', h('b', row.name), row.text || KINDS[row.type]),
      spell ? h('button.jewel.small.go', { onclick: () => cast(item), disabled: !M.canCast(item) }, 'Cast') : h('span.caps', { style: { fontSize: '11px', maxWidth: '84px', textAlign: 'center' } }, playableAnywhere(item) ? 'Tap a glowing lane' : 'No lane can take it'),
      h('button.jewel.small.quiet', { onclick: () => { selected = null; render(); closeInspect(); } }, '×'));
    const hand = $('#hand').getBoundingClientRect();
    bar.style.bottom = (innerHeight - hand.top + 6) + 'px';
    bar.classList.add('on');
  }
  function inspectCard(item, hover) {
    if (phone() && !hover && selected === item) { pickbar(item); return; }
    const row = rowOf(item), node = cardEl(row, { cost: item.Form.DetermineCost(0) }), acts = [];
    if (!hover && selected === item) {
      if (item.Form.Type === CardType.Spell) acts.push(h('button.jewel.go', { onclick: () => cast(item), disabled: !M.canCast(item) }, M.canCast(item) ? 'Cast it' : 'Cannot be cast now'));
      else acts.push(h('span.caps', { style: { color: phone() ? '#fff6e4' : 'var(--ink)', alignSelf: 'center' } }, playableAnywhere(item) ? 'Tap a glowing lane' : 'No lane of its realm can take it now'));
      if (phone()) acts.push(h('button.jewel.small.quiet', { onclick: () => { selected = null; render(); closeInspect(); } }, 'Close'));
    }
    panel(node, acts);
  }
  function inspectUnit(script, hover, myLane = null) {
    const row = rowOf(script.Data), isCreature = script.Data.Form.Type === CardType.Creature;
    const node = cardEl(row, isCreature ? { atk: script.ATK, def: script.Health, glint: script.DetermineFloopCost() } : {}), acts = [];
    if (!hover && myLane !== null && M.canFloop(myLane) && canAct()) acts.push(h('button.jewel.go', { onclick: () => glint(myLane) }, `Glint it (✦${script.DetermineFloopCost()})`));
    if (!hover && phone()) acts.push(h('button.jewel.small.quiet', { onclick: closeInspect }, 'Close'));
    panel(node, acts);
  }
  function inspectHero(p, hover) {
    const L = M.gs.GetLeader(p), row = HERO[L.Form.ID], cd = M.gs.GetLeaderCooldown(p);
    const node = h('div.plate', { style: { width: phone() ? '260px' : '240px', padding: '14px', textAlign: 'center' } },
      h('div', { style: { width: '120px', height: '120px', margin: '0 auto 8px', borderRadius: '50%', border: '3px solid var(--lead)', overflow: 'hidden' } }, faceEl(row, 120)),
      h('h3', { style: { fontSize: '20px' } }, nameOf(row.cast)), h('div.caps', { style: { color: 'var(--ink2)', fontSize: '13px' } }, (row.form ? row.form + ' · ' : '') + 'Rank ' + L.Rank),
      h('p', { style: { margin: '10px 0 4px', lineHeight: 1.35 } }, row.text),
      h('div.caps', { style: { fontSize: '13px', color: 'var(--ink2)' } }, cd > 0 ? `Ready in ${cd} turn${cd > 1 ? 's' : ''}` : 'Ready'));
    const acts = [];
    if (!hover && p === 0 && canAct()) acts.push(h('button.jewel.go', { onclick: useHero, disabled: !M.canUseHero() }, M.canUseHero() ? 'Use her gift' : cd > 0 ? 'Not yet' : 'Nothing it can do now'));
    if (!hover && phone()) acts.push(h('button.jewel.small.quiet', { onclick: closeInspect }, 'Close'));
    panel(node, acts);
  }
  function unhover() { if (selected) inspectCard(selected); else closeInspect(); }
  function closeInspect() { $('#inspect').classList.remove('on'); $('#sheet-pop').classList.remove('on'); $('#pickbar').classList.remove('on'); }
  function showPile(p) {
    const pile = M.gs.GetDiscardPile(p), m = $('#discard-modal');
    $('#discard-title').textContent = p === 0 ? 'Your discard pile' : `${themName()}'s discard pile`;
    const grid = $('#discard-grid'); grid.innerHTML = '';
    if (!pile.length) grid.append(h('p', 'Nothing has gone here yet.'));
    for (const item of pile) grid.append(cardEl(rowOf(item), { mini: true }));
    $('#discard-close').onclick = () => m.classList.remove('on');
    m.classList.add('on');
  }

  /* ---------------------------------------------------------------- what the engine reports, shown */

  function say(text) { $('#caption').textContent = text; }
  function float(target, text, kind) {
    if (!target) return;
    const r = target.getBoundingClientRect();
    const f = h('div.float.' + kind, { style: { left: r.left + r.width / 2 + 'px', top: r.top + r.height * 0.35 + 'px', position: 'fixed' } }, text);
    document.body.append(f); setTimeout(() => f.remove(), 1150);
  }
  function unitAt(p, lane) { const l = laneAt(p, lane); return l && (l.querySelector('.cslot .unit') || l); }
  /** plays what happened since last time; returns once it has been shown */
  async function playLog() {
    const log = M.gs.Log;
    while (logAt < log.length) {
      const e = log[logAt++], who = e.p === 1 ? themName() : 'You';
      switch (e.t) {
        case 'summon': render(); if (e.p === 1) { say(`${who} plays ${rowOf(e.card).name}.`); await sleep(pace() * 0.6); } break;
        case 'spell': if (e.p === 1) { await showSpell(e.card); } render(); break;
        case 'floop': render(); { const u = unitAt(e.p, e.lane); if (u) { u.classList.add('struck'); setTimeout(() => u.classList.remove('struck'), 400); } float(u, '✦ Glint', 'gold'); }
          if (e.p === 1) { say(`${who} glints ${rowOf(e.card).name}: ${rowOf(e.card).text}`); await sleep(pace()); } break;
        case 'hero': render(); say(e.p === 1 ? `${who} calls on her gift: ${HERO[M.gs.GetLeader(1).Form.ID].text}` : 'Your gift: ' + HERO[M.gs.GetLeader(0).Form.ID].text); await sleep(pace()); break;
        case 'hurt': { const u = unitAt(e.p, e.lane); if (u && u.classList.contains('unit')) { u.classList.add('struck'); setTimeout(() => u.classList.remove('struck'), 400); } float(u, '−' + e.amount, 'dmg'); render(); await sleep(140); break; }
        case 'heal': float(unitAt(e.p, e.lane), '+' + e.amount, 'heal'); render(); await sleep(100); break;
        case 'heroHurt': { const hw = $(`.hero-w[data-p="${e.p}"]`); float(hw, '−' + e.amount, 'dmg'); render(); const hw2 = $(`.hero-w[data-p="${e.p}"]`); if (hw2) hw2.classList.add('hit'); await sleep(260); break; }
        case 'mp': if (e.amount > 0 && M.phase !== 'landscapes') { render(); float($(`.hero-w[data-p="${e.p}"]`), '+' + e.amount + ' Light', 'gold'); } break;
        case 'death': {
          if (e.p === 1 && !loot.dropped && !over && !ladder()) {   // one of hers: what it leaves, once a turn at most
            const got = lootRoll(Me.data, table.quest, loot, e.card);
            if (got) { loot.dropped = true; await showLoot(e.lane, got); }
          }
          render(); await sleep(260); break;
        }
        case 'turn': loot.dropped = false; render(); say(e.p === 0 ? 'Your turn.' : `${who}'s turn.`); await sleep(e.p === 1 ? pace() * 0.5 : 120); break;
        case 'outOfCards': say(`You have run out of cards: you lose ${M.gs.GetLeader(0).Rank} health, your board is swept away, and you draw five anew.`); await sleep(1600); render(); break;
        case 'reshuffle': if (e.p === 1) { say(`${who} shuffles her hand and her discard pile back into her deck.`); await sleep(pace()); } break;
        case 'flip': render(); break;
        case 'over': render(); break;
        default: break;
      }
    }
    render();
  }
  /** a casket, or coins, rising from where her creature fell and going to what has been found here */
  async function showLoot(lane, got) {
    const from = unitAt(1, lane), r = from ? from.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    if (got.card) {
      loot.cards.push(got.card);
      const box = h('div.casket', { style: { left: r.left + r.width / 2 - 23 + 'px', top: r.top + r.height / 2 - 19 + 'px' } });
      document.body.append(box);
      say(`She left a casket behind: a card, yours if you win.`);
      await sleep(450);
      render();
      const to = $('#loot'), t = to ? to.getBoundingClientRect() : { left: innerWidth / 2, top: 20, width: 0, height: 0 };
      box.style.transform = `translate(${t.left + t.width / 2 - (r.left + r.width / 2)}px, ${t.top + t.height / 2 - (r.top + r.height / 2)}px) scale(.4)`; box.style.opacity = '0.2';
      await sleep(760); box.remove();
    } else if (got.piece) {
      const c = COMMISSION[got.piece];
      loot.pieces[got.piece] = (loot.pieces[got.piece] || 0) + 1;
      float(from, `+1 ${c.piece}`, 'gold');
      say(`She left a ${c.piece} behind, for “${c.name}” — yours if you win.`);
      render(); await sleep(420);
    } else {
      loot.coins += got.coins;
      float(from, `+${fmt(got.coins)} coins`, 'gold');
      render(); await sleep(300);
    }
  }
  async function showSpell(item) {
    const row = rowOf(item), node = cardEl(row);
    node.style.setProperty('--w', phone() ? '200px' : '240px');
    const pop = h('div', { style: { position: 'fixed', zIndex: 58, left: '50%', top: '50%', transform: 'translate(-50%,-50%)', animation: 'pop .4s ease', pointerEvents: 'none' } }, node);
    document.body.append(pop); say(`${themName()} casts ${row.name}.`);
    await sleep(pace() * 1.6); pop.remove();
  }

  /* ---------------------------------------------------------------- the turns go round */

  async function advance() {
    if (busy || over) return;
    const mine = gen;
    busy = true; render();
    try {
      for (;;) {
        await playLog();
        if (mine !== gen || over) return;
        if (M.phase === 'over') break;
        if (M.phase === 'user-setup') { if (M.gs.Pending) showPending(); break; }
        if (M.phase === 'ai-setup') { await sleep(pace()); M.aiStep(); continue; }
        if (M.phase === 'user-battle' || M.phase === 'ai-battle') { await attack(); continue; }
        break;
      }
    } catch (err) { console.error(err); say('Something went wrong at the table: ' + err.message); }
    if (mine !== gen) return;
    busy = false; render();
    if (M.phase === 'over') finish();
  }
  async function attack() {
    const a = M.nextAttack();
    if (!a) { await playLog(); return; }
    const lane = laneAt(a.p, a.lane), frontLane = laneAt(1 - a.p, 3 - a.lane);
    lane.classList.add('fight'); if (frontLane) frontLane.classList.add('fight');
    const cr = M.gs.GetCreature(a.p, a.lane), name = rowOf(cr.Data).name, foe = M.gs.GetCreature(1 - a.p, 3 - a.lane);
    say(a.p === 0 ? `${name} attacks${foe ? ' ' + rowOf(foe.Data).name : ' ' + themName() + ' herself'}.` : `${rowOf(cr.Data).name} attacks${foe ? ' your ' + rowOf(foe.Data).name : ' you'}.`);
    await sleep(380);
    let result = a.forced;
    if (!result) result = await Rose.spin({ zones: a.zones, attacking: a.p === 0, auto: Me.data.options.autoSpin, title: a.p === 0 ? name + ' strikes' : 'Defend from ' + name });
    else { say(a.p === 1 && !foe ? `Nothing stands in its way.` : `${name} has no strength to strike with.`); await sleep(500); }
    M.strike(result);
    await playLog();
    lane.classList.remove('fight'); if (frontLane) frontLane.classList.remove('fight');
    await sleep(200);
  }
  function showPending() {
    const pe = M.gs.Pending, pr = $('#prompt');
    if (pe.kind === 'lane') {
      pr.textContent = PROMPTS[pe.prompt] || 'Choose a lane';
      pr.classList.add('on'); markLanes();
      return;
    }
    const m = $('#discard-modal'), grid = $('#discard-grid');
    $('#discard-title').textContent = pe.cards.length ? 'Choose a card to take back' : 'Nothing there can be taken';
    grid.innerHTML = '';
    for (const item of pe.cards) grid.append(cardEl(rowOf(item), { mini: true }), );
    [...grid.children].forEach((el, k) => el.addEventListener('click', () => { m.classList.remove('on'); M.chooseCard(pe.cards[k]); advance(); }));
    const close = $('#discard-close');
    close.style.display = pe.cards.length ? 'none' : '';
    close.onclick = () => { m.classList.remove('on'); close.style.display = ''; M.skipChoice(); advance(); };
    m.classList.add('on');
  }

  /* ---------------------------------------------------------------- the end */

  function finish() {
    if (over) return;
    over = true;
    $('#rose').classList.remove('on'); closeInspect();
    const won = M.winner === 0, q = table.quest, deck = Me.data.decks[table.deck];
    if (ladder()) {
      const res = settleLadder(Me.data, table.cup, won); Me.write();
      After.ladder(res, q, how => onEnd && onEnd(how));
      return;
    }
    if (won) {
      const res = settleWin(Me.data, q, { hero: deck.hero, stats: Object.assign({}, M.gs.Stats, extra), earned: loot.cards.slice(), coins: loot.coins, pieces: Object.assign({}, loot.pieces) });
      Me.write();
      After.win(res, q, how => onEnd && onEnd(how));
    } else {
      settleLoss(Me.data, q); Me.write();
      After.loss(q, loot, how => onEnd && onEnd(how), table.mode);
    }
  }
  function leaveAsk() {
    const pop = $('#pop'), inn = $('#pop-in');
    inn.innerHTML = '';
    const found = loot.cards.length || loot.coins || Object.keys(loot.pieces).length;
    inn.append(h('h3', 'Leave the table?'), h('p', found ? 'The match ends here and counts as a loss; what you found here stays with her.' : 'The match ends here and counts as a loss.'),
      h('div.row', { style: { justifyContent: 'center' } },
        h('button.jewel.quiet', { onclick: () => pop.classList.remove('on') }, 'Stay'),
        h('button.jewel', { onclick: () => { pop.classList.remove('on'); over = true; gen++; if (ladder()) settleLadder(Me.data, table.cup, false); else settleLoss(Me.data, table.quest); Me.write(); $('#rose').classList.remove('on'); closeInspect(); onEnd && onEnd({ next: table.quest.id }); } }, 'Leave')));
    pop.classList.add('on');
  }

  return { start, get match() { return M; } };
})();
