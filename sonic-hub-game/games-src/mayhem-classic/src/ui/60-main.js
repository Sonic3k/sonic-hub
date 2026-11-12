/* ── Controller: screens, the flow of a brawl with motion, input ── */
const STORE = 'mayhem.classic';
const SET = (() => { const d = { difficulty: 'normal', speed: 'normal', sound: true, haptics: true, n: 2, hero: 'barbarian', stats: {} }; try { return Object.assign(d, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) { return d; } })();
function saveSettings() { try { localStorage.setItem(STORE, JSON.stringify(SET)); } catch (e) { } }
let S = null;
UI.n = SET.n; UI.hero = HEROES[SET.hero] ? SET.hero : 'barbarian'; SFX.on = SET.sound;
function go(screen) {
  UI.screen = screen; closeSheet(); clearAim(); hideTip(); if (CODEX.open) closeCodex();
  for (const id of ['menu', 'select', 'match']) $('#screen-' + id).classList.toggle('hidden', id !== screen);
  if (screen === 'menu') renderMenu(); else if (screen === 'select') renderSelect();
}
function newMatch(o = {}) {
  const hero = o.hero || UI.hero, n = clamp(o.n || UI.n, 2, 4), seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  const others = shuffled({ rs: seed }, HERO_ORDER.filter(h => h !== hero)).slice(0, n - 1);
  S = newGame({ seed, heroes: [hero, ...others], ai: [false, ...others.map(() => true)] });
  for (const P of S.players.slice(1)) P.skill = SET.difficulty;
  Object.assign(UI, { sel: null, aim: null, last: null, view: null, busy: true, finished: false, drawer: false, known: null, lastSetup: { hero, n } });
  $('#chronicle').classList.remove('open');
  go('match');
  startGame(S); renderMatch();
  begin();
}
async function begin() {
  const first = S.first;
  banner(first === 0 ? 'You go first' : `${nameOf(first)} goes first`, first === 0 ? 'Draw 1, play 1. Chain the lightning.' : `${esc(heroName(S.players[first].hero))} opens the brawl.`, 1600);
  await wait(Math.max(700, D(1500)));
  if (S.turn === 0) myTurnStart(); else aiTurn();
}

/* the human */
function onHandCard(uid) {
  if (humanPending()) return;
  const c = S.players[0].hand.find(x => x.uid === uid); if (!c) return;
  if (!isMyTurn() || UI.sel === uid) return cardSheet(c, { hand: true });
  UI.sel = uid; UI.aim = null; markHand(); SFX.play('click'); buzz(8); later(renderSelection);
}
function unselect() { if (humanPending()) return; UI.sel = null; UI.aim = null; markHand(); buzz(6); later(renderSelection); }
function choiceFor(pid, sh) {
  /* what clicking a seat (or one of its shields) means for the chosen card, if it can be aimed there */
  const c = selCard(); if (!c || !boardAim(c)) return null;
  const A = aimable(c);
  if (sh != null) { if (!A.shields.has(sh)) return null; return { t: pid, sh }; }
  if (!A.seats.has(pid)) return null;
  return { t: pid };
}
function onSeat(pid, touch) {
  const ch = (isMyTurn() || humanPending()) && choiceFor(pid, null);
  if (!ch) return seatSheet(pid);
  aimAt(ch, touch);
}
function onShield(uid, pid, touch) {
  const ch = (isMyTurn() || humanPending()) && choiceFor(pid, uid);
  if (!ch) { const f = findShield(S, uid); if (f) cardSheet(f.sh.card); return; }
  aimAt(ch, touch);
}
/* with a mouse a click on a target plays at once; on touch the first tap aims and the Play button (or a second tap) plays */
function aimAt(ch, touch) {
  const same = UI.aim && sameChoice(UI.aim, ch);
  UI.aim = ch;
  if (touch && !same) { SFX.play('click'); renderSelection(); return; }
  const c = selCard(); if (c) humanPlay(c.uid, ch);
}
async function humanPlay(uid, ch, landed) {
  const pd = humanPending(), card = selCard();
  if (!card || (!isMyTurn() && !pd)) { if (landed) dropGhost(); return; }
  const el = !pd && document.querySelector(`#hand .card[data-uid="${card.uid}"]`), from = el ? el.getBoundingClientRect() : null;
  UI.busy = true; clearAim();
  if (aimOf(card) === 'discard') {
    const pile = S.players[0].discard;
    if (pile.length) { if (landed) { dropGhost(); landed = false; } renderAction(); ch = { pick: await discardPick(pile.slice().reverse()) }; }
    else ch = null;
  }
  if (boardAim(card) && !ch) ch = chosenAim(card);
  UI.view = S.players.map(p => p.hp);
  const ev = pd ? resolvePending(S, ch) : playCard(S, 0, card.uid, ch);
  if (!ev) { UI.busy = false; UI.view = null; if (landed) dropGhost(); SFX.play('bad'); return renderMatch(); }
  await animatePlay(ev, 0, pd ? null : from, landed);
  if (S.winner != null || !S.players[0].alive) return finish();
  UI.busy = false; UI.sel = null; UI.aim = null;
  if (humanPending()) { renderMatch(); SFX.play('steal'); return; }
  if (!turnOver(S)) return renderMatch();
  nextTurn();
}
/* turns */
async function nextTurn() {
  UI.busy = true; UI.sel = null; UI.aim = null; renderMatch();
  await wait(D(320));
  if (S.winner != null) return finish();
  endTurn(S);
  if (S.winner != null || !S.players[0].alive) return finish();
  if (S.turn === 0) return myTurnStart();
  return aiTurn();
}
function myTurnStart() {
  UI.busy = false; renderMatch(); SFX.play('turn'); buzz(20);
  if (turnOver(S)) nextTurn();
}
async function aiTurn() {
  const pid = S.turn;
  renderMatch(); await wait(D(520));
  for (let guard = 0; guard < 40 && S.winner == null && S.turn === pid; guard++) {
    if (turnOver(S)) break;
    const a = aiAct(S, pid);
    if (a.kind === 'end') break;
    const from = seatRect(pid);
    UI.view = S.players.map(p => p.hp);
    const ev = a.kind === 'pending' ? resolvePending(S, a.ch) : playCard(S, pid, a.uid, a.ch);
    if (!ev) { UI.view = null; break; }
    await animatePlay(ev, pid, a.kind === 'pending' ? null : from);
    if (S.winner != null || !S.players[0].alive) return finish();
    await wait(D(240));
  }
  return nextTurn();
}
function finish() {
  if (UI.finished) return; UI.finished = true; UI.busy = true; UI.sel = null; UI.aim = null; renderMatch();
  const me = S.players[0], win = S.winner === 0, r = SET.stats[me.hero] || [0, 0];
  r[1]++; if (win) r[0]++; SET.stats[me.hero] = r; saveSettings();
  setTimeout(() => { SFX.play(win ? 'win' : 'lose'); resultsSheet(); }, D(700) + 500);
}
function toggleChronicle(force) { UI.drawer = force != null ? force : !UI.drawer; $('#chronicle').classList.toggle('open', UI.drawer); if (UI.drawer) renderChronicle(); }
function cycleSpeed() { SET.speed = SPEED_ORDER[(SPEED_ORDER.indexOf(SET.speed) + 1) % SPEED_ORDER.length]; saveSettings(); if (S) renderTopbar(); }

/* input */
document.addEventListener('click', e => {
  SFX.init();
  if (performance.now() - DRAG.droppedAt < 450 && e.target.closest('#hand, #stage, .seat')) return;   /* the click after a drop is not a tap */
  const pick = e.target.closest('[data-pick]'); if (pick && UI.pickResolve) return UI.pickResolve(+pick.dataset.pick);
  const act = e.target.closest('[data-act]'), touch = e.pointerType === 'touch' || matchMedia('(pointer: coarse)').matches;
  if (act) return action(act.dataset.act, act);
  const cref = e.target.closest('[data-cref]'); if (cref) { const [h, id] = cref.dataset.cref.split(':'); return cardSheet(staticCard(h, HEROES[h].cards.find(d => d.id === id))); }
  const cuid = e.target.closest('[data-cuid]'); if (cuid) { const f = findShield(S, +cuid.dataset.cuid); if (f) return cardSheet(f.sh.card); return; }
  if (e.target.closest('#stage-card .card')) { const c = selCard() || (UI.last && UI.last.card); if (c) cardSheet(c, { hand: !!(UI.sel && !humanPending()) }); return; }
  const t = e.target.closest('.hero-tile, [data-n], [data-diff], [data-set], #hand .card, .shc, .seat');
  if (!t) { if (e.target.id === 'sheet' && !$('#sheet').dataset.lock) closeSheet(); return; }
  if (t.classList.contains('hero-tile') && t.dataset.hero) { UI.hero = t.dataset.hero; SET.hero = UI.hero; saveSettings(); SFX.play('click'); if (mobile()) { UI.selView = 'detail'; renderSelect(); $('#screen-select').scrollTop = 0; return; } return rerenderSelect(); }
  if (t.dataset.n) { UI.n = +t.dataset.n; SET.n = UI.n; saveSettings(); return rerenderSelect(); }
  if (t.dataset.diff) { SET.difficulty = t.dataset.diff; saveSettings(); return rerenderSelect(); }
  if (t.dataset.set) { const v = t.dataset.val; SET[t.dataset.set] = v === 'true' ? true : v === 'false' ? false : v; SFX.on = SET.sound; saveSettings(); settingsSheet(); if (S && UI.screen === 'match') renderTopbar(); return; }
  if (t.matches('#hand .card')) return onHandCard(+t.dataset.uid);
  if (t.classList.contains('shc')) return onShield(+t.dataset.sh, +t.dataset.pid, touch);
  if (t.classList.contains('seat')) return onSeat(+t.dataset.pid, touch);
});
function action(a, el) {
  switch (a) {
    case 'quick': return newMatch({ hero: UI.hero, n: UI.n });
    case 'choose': UI.selView = 'list'; return go('select');
    case 'menu': return go('menu');
    case 'start': return newMatch({ hero: UI.hero, n: UI.n });
    case 'again': return newMatch(UI.lastSetup);
    case 'random-hero': UI.hero = HERO_ORDER[Math.floor(Math.random() * HERO_ORDER.length)]; SET.hero = UI.hero; saveSettings(); if (mobile()) { UI.selView = 'detail'; renderSelect(); $('#screen-select').scrollTop = 0; return; } return rerenderSelect();
    case 'sel-list': UI.selView = 'list'; renderSelect(); return;
    case 'rules': closeSheet(); return openCodex('rules');
    case 'codex': closeSheet(); return openCodex(S && UI.screen === 'match' ? 'heroes' : 'rules', { hero: S && UI.screen === 'match' ? S.players[0].hero : null });
    case 'codex-tab': CODEX.tab = el.dataset.tab; CODEX.hero = null; return renderCodex();
    case 'codex-hero': closeSheet(); if (!CODEX.open) return openCodex('heroes', { hero: el.dataset.hero }); CODEX.tab = 'heroes'; CODEX.hero = el.dataset.hero; return renderCodex();
    case 'codex-heroes': CODEX.hero = null; return renderCodex();
    case 'codex-back': if (CODEX.tab === 'heroes' && CODEX.hero) { CODEX.hero = null; return renderCodex(); } return closeCodex();
    case 'codex-play': closeCodex(); UI.hero = el.dataset.hero; SET.hero = UI.hero; saveSettings(); UI.selView = 'detail'; return go('select');
    case 'card-info': { const c = selCard(); if (c) cardSheet(c, { hand: !humanPending() }); return; }
    case 'play-card': { const uid = +el.dataset.uid; closeSheet(); if (!isMyTurn() || humanPending()) return; UI.sel = uid; UI.aim = null; return renderSelection(); }
    case 'hand-prev': return handStep(-1);
    case 'hand-next': return handStep(1);
    case 'settings': return settingsSheet();
    case 'pause': return pauseSheet();
    case 'close': closeSheet(); return UI.screen === 'menu' ? renderMenu() : null;
    case 'concede': return go('menu');
    case 'chronicle': return toggleChronicle();
    case 'speed': return cycleSpeed();
    case 'deck': return deckSheet('deck');
    case 'discard': return deckSheet('discard');
    case 'cancel-sel': return unselect();
    case 'play-sel': { const c = selCard(); if (!c) return; const t = chosenAim(c); if (boardAim(c) && !t) return; return humanPlay(c.uid, t); }
  }
}
/* aiming with a mouse: the seat or shield under the pointer is shown as the target while the card is chosen */
document.addEventListener('pointerover', e => {
  if (e.pointerType === 'touch' || DRAG.on || !S || UI.screen !== 'match') return;
  const c = selCard(); if (!c || !boardAim(c) || UI.busy) return;
  const sh = e.target.closest('.shc.targetable'), seat = !sh && e.target.closest('.seat.targetable');
  const ch = sh ? { t: +sh.dataset.pid, sh: +sh.dataset.sh } : seat ? { t: +seat.dataset.pid } : null;
  if (ch && !sameChoice(ch, UI.aim)) { UI.aim = ch; renderStage(); renderAction(); renderPreview(); syncTargets(); }
});
function rerenderSelect() { const l = $('.sel-list'), d = $('.sel-detail'), ly = l ? l.scrollTop : 0, dy = d ? d.scrollTop : 0; renderSelect(); if ($('.sel-list')) $('.sel-list').scrollTop = ly; if ($('.sel-detail')) $('.sel-detail').scrollTop = dy; }
document.addEventListener('keydown', e => {
  if (CODEX.open) { if (e.key === 'Escape') { if (!$('#sheet').classList.contains('hidden')) closeSheet(); else action('codex-back'); } return; }
  if (UI.screen !== 'match' || !S) return;
  const sheetOpen = !$('#sheet').classList.contains('hidden');
  if (e.key === 'Escape') { if (sheetOpen) { if (!$('#sheet').dataset.lock) closeSheet(); return; } if (UI.sel != null) return unselect(); return pauseSheet(); }
  if (sheetOpen) return;
  const k = e.key.toLowerCase();
  if (/^[1-9]$/.test(e.key)) { const c = S.players[0].hand[+e.key - 1]; if (c) onHandCard(c.uid); }
  else if (e.key === 'Enter' && selCard()) { e.preventDefault(); action('play-sel'); }
  else if (k === 'i' && selCard()) action('card-info');
  else if (k === 'h') action('codex');
  else if (k === 'l') toggleChronicle();
  else if (k === 's') cycleSpeed();
  else if (e.key === 'Tab' && selCard() && boardAim(selCard())) {
    e.preventDefault();
    const all = aimChoices(selCard()), i = all.findIndex(ch => sameChoice(ch, UI.aim));
    UI.aim = all[(i + 1) % all.length]; renderSelection();
  }
});
/* drag a card into the ring, or onto a target, to play it. Hold it a moment (or pull it up) to pick it up; a sideways swipe scrolls
   the hand. One ghost card on its own layer; the drop zones are measured once, when the card is picked up */
const DRAG = { uid: null, el: null, pid: null, mouse: false, x0: 0, y0: 0, lx: 0, ly: 0, hold: 0, on: false, back: false, ox: 0, oy: 0, w: 0, k: 0.8, zone: null, ok: false, ch: null, droppedAt: 0 };
const TILT = -3 * Math.PI / 180;
function ghostAt(x, y) {
  const k = DRAG.k, c = Math.cos(TILT), s = Math.sin(TILT), gx = DRAG.ox * k, gy = DRAG.oy * k;
  $('#drag-ghost').style.transform = `translate3d(${(x - (gx * c - gy * s)).toFixed(1)}px,${(y - (gx * s + gy * c)).toFixed(1)}px,0) rotate(-3deg) scale(${k})`;
}
function ghostTo(r, ms, ease) {
  const g = $('#drag-ghost'); g.style.transition = `transform ${ms}ms ${ease}`;
  g.style.transform = `translate3d(${r.left.toFixed(1)}px,${r.top.toFixed(1)}px,0) rotate(0deg) scale(${(r.width / DRAG.w).toFixed(4)})`;
  return wait(ms + 16);
}
function dropGhost() { const g = $('#drag-ghost'); g.classList.remove('on'); g.style.transition = ''; g.innerHTML = ''; }
function landingRect(c) { const cur = $('#stage-card .card'); return cur && +cur.dataset.uid === c.uid ? cur.getBoundingClientRect() : stageRect(); }
function beginDrag(x, y) {
  clearTimeout(DRAG.hold);
  const c = S.players[0].hand.find(h => h.uid === DRAG.uid);
  if (!c || !isMyTurn() || humanPending() || !DRAG.el.isConnected) { DRAG.uid = null; return; }
  const r = DRAG.el.getBoundingClientRect(), aimed = boardAim(c), A = aimable(c);
  DRAG.w = DRAG.el.offsetWidth; DRAG.ox = DRAG.x0 - r.left; DRAG.oy = DRAG.y0 - r.top;
  DRAG.zone = {
    top: $('#hand').getBoundingClientRect().top - 6, aimed,
    shields: aimed ? [...A.shields].map(u => { const el = chipEl(u); return el && { ch: { t: +el.dataset.pid, sh: u }, r: el.getBoundingClientRect() }; }).filter(Boolean) : [],
    seats: aimed ? [...A.seats].map(pid => ({ ch: { t: pid }, r: seatEl(pid).getBoundingClientRect() })) : [],
    solo: aimed ? chosenAim(c) : null,
  };
  DRAG.on = true; DRAG.ok = false; DRAG.ch = null; UI.sel = c.uid; UI.aim = null;
  try { DRAG.el.setPointerCapture(DRAG.pid); } catch (_) { }
  const g = $('#drag-ghost');
  g.innerHTML = DRAG.el.outerHTML;
  const gc = g.firstElementChild; gc.classList.remove('sel', 'playable', 'drag-src', 'fresh'); gc.removeAttribute('tabindex'); gc.removeAttribute('role'); gc.style.transformOrigin = `${DRAG.ox}px ${DRAG.oy}px`;
  g.style.transition = ''; ghostAt(x, y); g.classList.add('on');
  DRAG.el.classList.add('drag-src'); $('#stage').classList.add('holding');
  hideTip(); SFX.play('card'); buzz(12);
  later(() => { if (!DRAG.on) return; markHand(); renderAction(); renderPreview(); syncTargets(); });
}
function dragMove(x, y) {
  ghostAt(x, y);
  const Z = DRAG.zone, inR = r => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  let ok = false, ch = null;
  if (Z.aimed) {
    const hit = Z.shields.find(q => inR(q.r)) || Z.seats.find(q => inR(q.r));
    if (hit) { ok = true; ch = hit.ch; }
    else if (Z.solo && y < Z.top) { ok = true; ch = Z.solo; }
  } else ok = y < Z.top;
  if (ok === DRAG.ok && sameChoice(ch, DRAG.ch)) return;
  DRAG.ok = ok; DRAG.ch = ch; UI.aim = ch;
  $('#stage').classList.toggle('drop-ok', ok && !ch);
  renderPreview(); syncTargets();
}
async function endDrag(x, y, cancelled) {
  const uid = UI.sel, c = S.players[0].hand.find(h => h.uid === uid);
  if (!cancelled) dragMove(x, y);
  const ok = !cancelled && DRAG.ok && c && (!boardAim(c) || DRAG.ch), ch = DRAG.ch;
  DRAG.on = false; DRAG.back = true; DRAG.droppedAt = performance.now();
  $('#stage').classList.remove('drop-ok', 'holding');
  if (ok) {
    UI.busy = true; buzz(14);
    await ghostTo(landingRect(c), 180, 'ease-out');
    DRAG.back = false;
    return humanPlay(uid, ch, true);
  }
  const src = document.querySelector(`#hand .card[data-uid="${uid}"]`);
  if (src) { const r = src.getBoundingClientRect(); await ghostTo({ left: r.left, top: r.top - 8, width: r.width }, 200, 'ease-in'); src.classList.remove('drag-src'); }
  dropGhost(); DRAG.back = false; UI.aim = null;
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
$('#hand').addEventListener('touchmove', e => { if (DRAG.on) e.preventDefault(); }, { passive: false });
document.addEventListener('contextmenu', e => { if (e.target.closest('#hand .card')) e.preventDefault(); });
$('#hand').addEventListener('wheel', e => { const h = e.currentTarget; if (mobile() || h.scrollWidth <= h.clientWidth + 2 || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return; e.preventDefault(); h.scrollLeft += e.deltaY; }, { passive: false });
$('#hand').addEventListener('scroll', () => { if (!mobile()) handNav(); }, { passive: true });
addEventListener('resize', () => { updateMode(); if (UI.screen === 'match' && S && !UI.busy) renderMatch(); else if (UI.screen === 'menu') renderMenu(); else if (UI.screen === 'select') renderSelect(); });
UI.selView = 'list';
updateMode(); installHeroStyles(); installMaterials(); go('menu');
