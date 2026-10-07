/* ── Controller: screens, match flow with motion, input ── */
const STORE = 'mayhem.ii';   /* Medieval Mayhem II keeps its own settings and record, apart from the first game */
const SET = (() => { const d = { difficulty: 'normal', speed: 'normal', sound: true, haptics: true, tutorialDone: false, n: 2, civ: 'franks', stats: {} }; try { return Object.assign(d, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) { return d; } })();
function saveSettings() { try { localStorage.setItem(STORE, JSON.stringify(SET)); } catch (e) { } }
let S = null;
UI.n = SET.n; UI.civ = CIVS[SET.civ] ? SET.civ : 'franks'; SFX.on = SET.sound;
function go(screen) {
  UI.screen = screen; closeSheet(); clearAim(); hideTip(); if (CODEX.open) closeCodex();
  for (const id of ['menu', 'select', 'match']) $('#screen-' + id).classList.toggle('hidden', id !== screen);
  if (screen === 'menu') renderMenu(); else if (screen === 'select') renderSelect();
}
function newMatch(o = {}) {
  const civ = o.civ || UI.civ, n = o.n || UI.n, seed = o.tutorial ? 20261005 : (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  const others = o.opps || shuffled({ rs: seed }, CIV_ORDER.filter(c => c !== civ)).slice(0, n - 1);
  S = newGame({ seed, civs: [civ, ...others], ai: [false, ...others.map(() => true)] });
  nameTable(S, seed);
  for (const P of S.players.slice(1)) { P.skill = o.tutorial ? 'easy' : SET.difficulty; chooseRelic(S, P.id, aiRelic(S, P)); }
  Object.assign(UI, { sel: null, hoverT: null, last: null, view: null, busy: false, finished: false, round: 1, drawer: false, tutorial: null, lastSetup: o });
  $('#chronicle').classList.remove('open');
  go('match'); renderMatch();
  if (o.tutorial) { chooseRelic(S, 0, 'jade'); UI.tutorial = { i: 0, live: false }; beginMatch(); } else relicSheet();
}
async function beginMatch() { closeSheet(); startGame(S); UI.busy = true; renderMatch(); await herald(1, null, S.eventNext, 'You go first; every opponent starts with 1 extra card.'); UI.busy = false; renderMatch(); SFX.play('turn'); coachShow && UI.tutorial && coachShow(); }

/* the human */
function onHandCard(uid) {
  /* first tap chooses a card (only classes move), the next one opens it in full; playing takes the Play button or a drag */
  const c = S.players[0].hand.find(x => x.uid === uid); if (!c) return;
  if (!isMyTurn() || UI.sel === uid) return cardSheet(c, { hand: true });
  UI.sel = uid; UI.hoverT = null; markHand(); SFX.play('click'); buzz(8); later(renderSelection); coachEvent('select');
}
function unselect() { UI.sel = null; UI.hoverT = null; markHand(); buzz(6); later(renderSelection); }
function aiming() { const c = selCard(); return !!(c && isMyTurn() && needsTarget(c) && opponents(S, S.players[0]).length > 1); }
function onCamp(pid, touch) {
  if (!aiming()) return campSheet(pid);
  if (pid === 0 || !S.players[pid].alive) return;
  if (touch && UI.hoverT !== pid) return setAimTarget(pid);
  humanPlay(UI.sel, pid);
}
function setAimTarget(pid) {
  if (UI.hoverT === pid) return;
  UI.hoverT = pid; renderSelection();
}
async function humanPlay(uid, tid, landed) {
  const el = document.querySelector(`#hand .card[data-uid="${uid}"]`), from = el ? el.getBoundingClientRect() : null;
  const card = S.players[0].hand.find(c => c.uid === uid), opt = {};
  UI.busy = true;
  /* a Monk: look at the target's hand first and pick the card to take */
  if (card && card.icons.includes('C')) {
    const T = needsTarget(card) && tid != null ? S.players[tid] : opponents(S, S.players[0])[0], loose = T ? T.hand.filter(c => !c.bound) : [];
    /* a dragged Monk has already glided onto the chart: lift it away so the choice is in plain view, then it flies in after the pick */
    if (loose.length) { if (landed) { dropGhost(); landed = false; } renderAction(); opt.pick = await monkPick(T, loose); }
  }
  UI.view = S.players.map(p => p.hp);
  const ev = playCard(S, 0, uid, tid, opt);
  if (!ev) { UI.busy = false; UI.view = null; if (landed) dropGhost(); return renderMatch(); }
  coachEvent('play');
  await animatePlay(ev, 0, from, landed);
  UI.busy = false;
  if (S.winner != null || !S.players[0].alive) return finish();
  if (S.plays > 0 && S.players[0].hand.length) return renderMatch();
  nextTurn();
}
async function humanBuy(i) {
  if (!isMyTurn()) return;
  const card = S.market[i], el = document.querySelector(`[data-hire="${i}"]`) || document.querySelector(`.mk-item[data-mi="${i}"]`), from = el ? el.closest('.mk-col, .mk-item').getBoundingClientRect() : null;
  if (!card || !buy(S, 0, i)) return;
  closeSheet(); UI.busy = true; SFX.play('coin'); renderMatch();
  await animateBuy(card, 0, from);
  UI.busy = false; renderMatch(); coachEvent('buy');
}
/* turns */
async function nextTurn() {
  UI.busy = true; UI.sel = null; renderMatch(); await wait(D(380)); await holdForOverlay();
  const round = S.round; endTurn(S);
  if (S.round !== round && S.winner == null) await roundStart();
  if (S.winner != null || !S.players[0].alive) return finish();
  if (S.turn === 0) return myTurnStart();
  return aiTurn();
}
async function roundStart() {
  UI.flipEvent = true; UI.eventSeen = S.round; renderMatch();
  const note = S.round >= 16 ? 'The war drags on: everyone lost 1 HP.' : S.round >= 14 ? `From round 16 everyone loses 1 HP each round.` : '';
  await herald(S.round, S.event, S.eventNext, note);
  await roundMoves(S.moves);
}
function myTurnStart() {
  UI.busy = false; UI.sel = null; renderMatch(); SFX.play('turn'); buzz(20);
  const me = S.players[0];
  coachEvent('turn');
  if (me.ageGiven && !me.aged && me.turns === RULES.ageTurn) { banner('The Imperial Age', 'Your Imperial Age card has arrived', 2000); coachEvent('agecard'); }
  if (!me.hand.length) nextTurn();
}
async function aiTurn() {
  const pid = S.turn, P = S.players[pid];
  renderMatch(); await wait(D(500));
  for (let guard = 0; guard < 30 && S.winner == null && S.turn === pid; guard++) {
    await holdForOverlay();
    const a = aiAct(S, pid);
    if (a.kind === 'buy') {
      const card = S.market[a.idx], el = document.querySelector(`.mk-item[data-mi="${a.idx}"]`), from = el ? el.getBoundingClientRect() : document.getElementById('stage').getBoundingClientRect();
      if (buy(S, pid, a.idx)) { SFX.play('coin'); renderMatch(); await animateBuy(card, pid, from); renderMatch(); await wait(D(200)); continue; }
    }
    if (a.kind === 'play') {
      const camp = document.getElementById('camp-' + pid), from = camp ? camp.getBoundingClientRect() : null;
      UI.view = S.players.map(p => p.hp);
      const ev = playCard(S, pid, a.uid, a.target);
      if (ev) { await animatePlay(ev, pid, from); if (S.winner != null || !S.players[0].alive) return finish(); if (S.plays > 0 && P.hand.length && P.alive) continue; }
      else UI.view = null;
    }
    break;
  }
  if (S.winner != null || !S.players[0].alive) return finish();
  return nextTurn();
}
function finish() {
  if (UI.finished) return; UI.finished = true; UI.busy = true; renderMatch();
  const me = S.players[0], win = S.winner === 0, r = SET.stats[me.civ] || [0, 0];
  if (!UI.lastSetup.tutorial) { r[1]++; if (win) r[0]++; SET.stats[me.civ] = r; }
  if (UI.tutorial) endTutorial();
  saveSettings();
  setTimeout(() => { SFX.play(win ? 'win' : 'lose'); resultsSheet(); }, D(700) + 400);
}
function toggleChronicle(force) { UI.drawer = force != null ? force : !UI.drawer; $('#chronicle').classList.toggle('open', UI.drawer); if (UI.drawer) renderChronicle(); }
function cycleSpeed() { SET.speed = SPEED_ORDER[(SPEED_ORDER.indexOf(SET.speed) + 1) % SPEED_ORDER.length]; saveSettings(); if (S) renderTopbar(); }

/* input */
document.addEventListener('click', e => {
  SFX.init();
  if (performance.now() - DRAG.droppedAt < 450 && e.target.closest('#hand, #stage, .camp')) return;   /* the click that follows a drop is not a tap */
  const pick = e.target.closest('[data-pick]'); if (pick && UI.pickResolve) return UI.pickResolve(+pick.dataset.pick);
  const act = e.target.closest('[data-act]'), touch = e.pointerType === 'touch' || matchMedia('(pointer: coarse)').matches;
  if (act) return action(act.dataset.act, act);
  const hire = e.target.closest('[data-hire]'); if (hire) { if (!hire.disabled) humanBuy(+hire.dataset.hire); return; }
  const cref = e.target.closest('[data-cref]'); if (cref) { const r = cref.dataset.cref; return cardSheet(staticCard(r), { hire: r.startsWith('mk:') ? +r.slice(3) : null }); }
  if (e.target.closest('#stage-card .card')) { const sel = isMyTurn() && selCard(), c = sel || (UI.last && UI.last.card); if (c) cardSheet(c, { hand: !!sel }); return; }
  const t = e.target.closest('.civ-tile, [data-n], [data-diff], [data-set], .relic-pick, .mk-item, #hand .card, .camp');
  if (!t) { if (e.target.id === 'sheet' && !$('#sheet').dataset.lock) closeSheet(); return; }
  if (t.classList.contains('civ-tile')) { UI.civ = t.dataset.civ; SET.civ = UI.civ; saveSettings(); SFX.play('click'); if (mobile()) { UI.selScroll = $('#screen-select').scrollTop; UI.selView = 'detail'; renderSelect(); $('#screen-select').scrollTop = 0; return; } return rerenderSelect(); }
  if (t.dataset.n) { UI.n = +t.dataset.n; SET.n = UI.n; saveSettings(); return rerenderSelect(); }
  if (t.dataset.diff) { SET.difficulty = t.dataset.diff; saveSettings(); return rerenderSelect(); }
  if (t.dataset.set) { const v = t.dataset.val; SET[t.dataset.set] = v === 'true' ? true : v === 'false' ? false : v; SFX.on = SET.sound; saveSettings(); settingsSheet(); if (S && UI.screen === 'match') renderTopbar(); return; }
  if (t.classList.contains('relic-pick')) { chooseRelic(S, 0, t.dataset.relic); return beginMatch(); }
  if (t.classList.contains('mk-item')) { if (t.classList.contains('can')) humanBuy(+t.dataset.mi); return; }
  if (t.matches('#hand .card')) return onHandCard(+t.dataset.uid);
  if (t.classList.contains('camp')) return onCamp(+t.dataset.pid, touch);
});
function action(a, el) {
  switch (a) {
    case 'tutorial': return newMatch({ civ: 'franks', n: 2, opps: ['japanese'], tutorial: true });
    case 'quick': return newMatch({ civ: UI.civ, n: UI.n });
    case 'choose': UI.selView = 'list'; return go('select');
    case 'menu': return go('menu');
    case 'start': return newMatch({ civ: UI.civ, n: UI.n });
    case 'again': return newMatch(UI.lastSetup.tutorial ? { civ: UI.civ, n: UI.n } : UI.lastSetup);
    case 'random-civ': UI.civ = CIV_ORDER[Math.floor(Math.random() * CIV_ORDER.length)]; SET.civ = UI.civ; saveSettings(); if (mobile()) { UI.selView = 'detail'; renderSelect(); $('#screen-select').scrollTop = 0; return; } return rerenderSelect();
    case 'sel-list': UI.selView = 'list'; renderSelect(); $('#screen-select').scrollTop = UI.selScroll || 0; return;
    case 'codex': closeSheet(); return openCodex('civs', { civ: S && UI.screen === 'match' ? S.players[0].civ : null });
    case 'rules': closeSheet(); return openCodex('rules');
    case 'codex-back': if (CODEX.tab === 'civs' && CODEX.civ) { CODEX.civ = null; return renderCodex(); } return closeCodex();
    case 'codex-close': return closeCodex();
    case 'codex-tab': CODEX.tab = el.dataset.tab; return renderCodex();
    case 'codex-civ': closeSheet(); return openCodex('civs', { civ: el.dataset.civ });
    case 'codex-play': closeCodex(); UI.civ = el.dataset.civ; SET.civ = UI.civ; saveSettings(); UI.selView = 'detail'; return go('select');
    case 'cx-filter': CODEX.filter = el.dataset.f; return renderCodex(true);
    case 'card-info': { const c = selCard(); if (c) cardSheet(c, { hand: true }); return; }
    case 'play-card': { const uid = +el.dataset.uid, c = S && S.players[0].hand.find(x => x.uid === uid); closeSheet(); if (!c || !isMyTurn()) return; UI.sel = uid; const t = selTarget(c); if (needsTarget(c) && t == null) { UI.hoverT = null; return renderSelection(); } return humanPlay(uid, t); }
    case 'hand-prev': return handStep(-1);
    case 'hand-next': return handStep(1);
    case 'settings': return settingsSheet();
    case 'tutorial-reset': SET.tutorialDone = false; saveSettings(); return settingsSheet();
    case 'pause': return pauseSheet();
    case 'help': return helpSheet();
    case 'close': closeSheet(); return UI.screen === 'menu' ? renderMenu() : null;
    case 'concede': UI.tutorial = null; $('#coach').classList.add('hidden'); return go('menu');
    case 'chronicle': return toggleChronicle();
    case 'speed': return cycleSpeed();
    case 'deck': return deckSheet('deck');
    case 'discard': return deckSheet('discard');
    case 'events': return mobileSheet('events');
    case 'market': return mobileSheet('market');
    case 'coach-next': return coachNext();
    case 'cancel-sel': return unselect();
    case 'play-sel': { const c = selCard(); if (!c) return; const t = selTarget(c); if (needsTarget(c) && t == null) return; return humanPlay(c.uid, t); }
    case 'coach-skip': return endTutorial();
  }
}
/* aiming with a mouse: the camp under the pointer becomes the target, and stays it until another camp is pointed at */
document.addEventListener('pointerover', e => {
  if (e.pointerType === 'touch' || DRAG.on || !aiming()) return;
  const camp = e.target.closest('.camp.targetable'); if (camp) setAimTarget(+camp.dataset.pid);
});
function rerenderSelect() { const l = $('.sel-list'), d = $('.sel-detail'), ly = l ? l.scrollTop : 0, dy = d ? d.scrollTop : 0, sy = $('#screen-select').scrollTop; renderSelect(); if ($('.sel-list')) $('.sel-list').scrollTop = ly; if ($('.sel-detail')) $('.sel-detail').scrollTop = dy; $('#screen-select').scrollTop = sy; }
document.addEventListener('keydown', e => {
  if (CODEX.open) { if (e.key === 'Escape') { if (!$('#sheet').classList.contains('hidden')) closeSheet(); else action('codex-back'); } return; }
  if (UI.screen !== 'match' || !S) return;
  const sheetOpen = !$('#sheet').classList.contains('hidden');
  if (e.key === 'Escape') { if (sheetOpen) { if (!$('#sheet').dataset.lock) closeSheet(); return; } if (UI.sel != null) return unselect(); return pauseSheet(); }
  if (sheetOpen) return;
  const k = e.key.toLowerCase();
  if (/^[1-9]$/.test(e.key)) { const c = S.players[0].hand[+e.key - 1]; if (c) onHandCard(c.uid); }
  else if (e.key === 'Enter' && UI.sel != null) { e.preventDefault(); action('play-sel'); }
  else if (k === 'i' && UI.sel != null) action('card-info');
  else if (k === 'c') action('codex');
  else if (e.key === 'Tab' && aiming()) { e.preventDefault(); const o = opponents(S, S.players[0]).map(p => p.id), i = o.indexOf(UI.hoverT); UI.hoverT = null; setAimTarget(o[(i + 1) % o.length]); clearAim(); }
  else if (k === 'l') toggleChronicle();
  else if (k === 's') cycleSpeed();
  else if (k === 'h') action('rules');
});
/* drag a card onto the chart, or onto an enemy camp, to play it — Photo Studio's model. Hold it a moment or pull it up to pick it
   up; a sideways swipe scrolls the hand. One ghost card, made once and moved on the GPU; where the drop zones are is measured
   once, when the card is picked up, and nothing on the table is rebuilt while it moves */
const DRAG = { uid: null, el: null, pid: null, mouse: false, x0: 0, y0: 0, lx: 0, ly: 0, hold: 0, on: false, back: false, ox: 0, oy: 0, w: 0, k: 0.8, zone: null, ok: false, t: null, droppedAt: 0 };
const TILT = -3 * Math.PI / 180;
function ghostAt(x, y) {
  /* the point where the card was grabbed stays under the pointer while the ghost tilts and shrinks about its corner */
  const k = DRAG.k, c = Math.cos(TILT), s = Math.sin(TILT), gx = DRAG.ox * k, gy = DRAG.oy * k;
  $('#drag-ghost').style.transform = `translate3d(${(x - (gx * c - gy * s)).toFixed(1)}px,${(y - (gx * s + gy * c)).toFixed(1)}px,0) rotate(-3deg) scale(${k})`;
}
function ghostTo(r, ms, ease) {
  const g = $('#drag-ghost'); g.style.transition = `transform ${ms}ms ${ease}`;
  g.style.transform = `translate3d(${r.left.toFixed(1)}px,${r.top.toFixed(1)}px,0) rotate(0deg) scale(${(r.width / DRAG.w).toFixed(4)})`;
  return wait(ms + 16);
}
function dropGhost() { const g = $('#drag-ghost'); g.classList.remove('on'); g.style.transition = ''; g.innerHTML = ''; }
/* where a dropped card settles: on the chart, over the copy already shown there if it is this card */
function landingRect(c) { const cur = $('#stage-card .card'); return cur && +cur.dataset.uid === c.uid ? cur.getBoundingClientRect() : stageRect(); }
function beginDrag(x, y) {
  clearTimeout(DRAG.hold);
  const c = S.players[0].hand.find(h => h.uid === DRAG.uid);
  if (!c || !isMyTurn() || !DRAG.el.isConnected) { DRAG.uid = null; return; }
  /* every position is read before anything is written: the card, and the drop zones (above the hand for most cards, the enemy
     camps when there is a choice of target) */
  const r = DRAG.el.getBoundingClientRect(), opps = opponents(S, S.players[0]), aim = needsTarget(c);
  DRAG.w = DRAG.el.offsetWidth; DRAG.ox = DRAG.x0 - r.left; DRAG.oy = DRAG.y0 - r.top;
  DRAG.zone = { top: $('#hand').getBoundingClientRect().top - 6, solo: aim && opps.length === 1 ? opps[0].id : null,
    camps: aim && opps.length > 1 ? opps.map(P => ({ pid: P.id, r: document.getElementById('camp-' + P.id).getBoundingClientRect() })) : null };
  DRAG.on = true; DRAG.ok = false; DRAG.t = null; UI.sel = c.uid; UI.hoverT = null;
  try { DRAG.el.setPointerCapture(DRAG.pid); } catch (_) { }
  /* the ghost: a copy of the card itself, tilted and a little smaller, rising off the hand */
  const g = $('#drag-ghost');
  g.innerHTML = DRAG.el.outerHTML;
  const gc = g.firstElementChild; gc.classList.remove('sel', 'playable', 'drag-src'); gc.removeAttribute('tabindex'); gc.removeAttribute('role'); gc.style.transformOrigin = `${DRAG.ox}px ${DRAG.oy}px`;
  g.style.transition = ''; ghostAt(x, y); g.classList.add('on');
  DRAG.el.classList.add('drag-src'); $('#stage').classList.add('holding');
  hideTip(); SFX.play('card'); buzz(12);
  later(() => { if (!DRAG.on) return; markHand(); renderAction(); renderPreview(); syncCampMarks(); coachEvent('select'); });
}
function dragMove(x, y) {
  ghostAt(x, y);
  const Z = DRAG.zone; let ok, t = null;
  if (Z.camps) { const hit = Z.camps.find(q => x >= q.r.left && x <= q.r.right && y >= q.r.top && y <= q.r.bottom); t = hit ? hit.pid : null; ok = t != null; }
  else { ok = y < Z.top; t = ok ? Z.solo : null; }
  if (ok === DRAG.ok && t === DRAG.t) return;
  DRAG.ok = ok; DRAG.t = t; UI.hoverT = t;
  $('#stage').classList.toggle('drop-ok', ok && !Z.camps);
  renderPreview(); syncCampMarks();
}
async function endDrag(x, y, cancelled) {
  const uid = UI.sel, c = S.players[0].hand.find(h => h.uid === uid);
  if (!cancelled) dragMove(x, y);
  const ok = !cancelled && DRAG.ok && c && (!needsTarget(c) || DRAG.t != null), t = DRAG.t;
  DRAG.on = false; DRAG.back = true; DRAG.droppedAt = performance.now();
  $('#stage').classList.remove('drop-ok', 'holding');
  if (ok) {
    /* it glides onto the chart and is played from there */
    UI.busy = true; buzz(14);
    await ghostTo(landingRect(c), 180, 'ease-out');
    DRAG.back = false;
    return humanPlay(uid, needsTarget(c) ? t : null, true);
  }
  /* anywhere else: it slides back into the hand and stays chosen */
  const src = document.querySelector(`#hand .card[data-uid="${uid}"]`);
  if (src) { const r = src.getBoundingClientRect(); await ghostTo({ left: r.left, top: r.top - 8, width: r.width }, 200, 'ease-in'); src.classList.remove('drag-src'); }
  dropGhost(); DRAG.back = false;
  renderSelection();
}
document.addEventListener('pointerdown', e => {
  if (DRAG.on || DRAG.back) return;
  const el = e.target.closest('#hand .card.playable'); if (!el || !isMyTurn() || e.button > 0) return;
  clearTimeout(DRAG.hold);
  Object.assign(DRAG, { uid: +el.dataset.uid, el, pid: e.pointerId, mouse: e.pointerType === 'mouse', x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY });
  if (!DRAG.mouse) DRAG.hold = setTimeout(() => { if (DRAG.uid != null && !DRAG.on) beginDrag(DRAG.lx, DRAG.ly); }, 240);
});
document.addEventListener('pointermove', e => {
  if (DRAG.uid == null || e.pointerId !== DRAG.pid) return;
  if (!DRAG.on) {
    /* a finger: a pull up (or down) of 10px picks the card up, a sideways move of 18px is a scroll; a mouse: any 6px move */
    DRAG.lx = e.clientX; DRAG.ly = e.clientY;
    const dx = e.clientX - DRAG.x0, dy = e.clientY - DRAG.y0;
    if (DRAG.mouse ? Math.hypot(dx, dy) > 6 : Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 0.8) beginDrag(e.clientX, e.clientY);
    else if (Math.hypot(dx, dy) > 18) { clearTimeout(DRAG.hold); DRAG.uid = null; }
    return;
  }
  e.preventDefault(); dragMove(e.clientX, e.clientY);
}, { passive: false });
document.addEventListener('pointerup', e => { if (e.pointerId !== DRAG.pid) return; clearTimeout(DRAG.hold); if (DRAG.on) endDrag(e.clientX, e.clientY); DRAG.uid = null; });
document.addEventListener('pointercancel', e => { if (e.pointerId !== DRAG.pid) return; clearTimeout(DRAG.hold); if (DRAG.on) endDrag(0, 0, true); DRAG.uid = null; });
/* while a card is held the page never scrolls under it (only gestures that start on the hand can hold a card) */
$('#hand').addEventListener('touchmove', e => { if (DRAG.on) e.preventDefault(); }, { passive: false });
document.addEventListener('contextmenu', e => { if (e.target.closest('#hand .card')) e.preventDefault(); });
/* the hand row: a mouse wheel scrolls it sideways when it is wider than its space, and the arrows follow the scroll */
$('#hand').addEventListener('wheel', e => { const h = e.currentTarget; if (mobile() || h.scrollWidth <= h.clientWidth + 2 || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return; e.preventDefault(); h.scrollLeft += e.deltaY; }, { passive: false });
$('#hand').addEventListener('scroll', () => { if (!mobile()) handNav(); }, { passive: true });

addEventListener('resize', () => { updateMode(); if (UI.screen === 'match' && S && !UI.busy) renderMatch(); else if (UI.screen === 'menu') renderMenu(); });
UI.selView = 'list';
updateMode(); installCivStyles(); installMaterials(); installTableArt(); installSymbolSprites(); go('menu');
