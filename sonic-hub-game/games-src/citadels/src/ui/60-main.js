/* ── Controller: screens, the flow of a game (the computer players and you), input ── */
const STORE = 'masks.mortar';
const SET = (() => {
  const d = { difficulty: 'normal', speed: 'normal', sound: true, haptics: true, n: 4, set: 'first', ninth: true, record: { played: 0, won: 0, best: 0 } };
  try { const s = JSON.parse(localStorage.getItem(STORE) || '{}'); return Object.assign(d, s, { record: Object.assign(d.record, s.record || {}) }); } catch (e) { return d; }
})();
function saveSettings() { try { localStorage.setItem(STORE, JSON.stringify(SET)); } catch (e) { } }
let S = null;
UI.setup = { n: clamp(SET.n, 2, 8), set: SET.set === 'random' || PRESETS.some(p => p.id === SET.set) ? SET.set : 'first', ninth: SET.ninth !== false };
UI.game = 0;
SFX.on = SET.sound;
function go(screen) {
  if (screen !== 'match' && UI.screen === 'match') UI.game++;
  UI.screen = screen; closeSheet(); hideTip(); if (CODEX.open) closeCodex();
  for (const id of ['menu', 'setup', 'match']) $('#screen-' + id).classList.toggle('hidden', id !== screen);
  if (screen === 'menu') renderMenu(); else if (screen === 'setup') renderSetup();
}
function pickNames(R, k) { const out = [], used = new Set(); for (const nm of shuffled(R, AI_NAMES)) { if (out.length >= k) break; if (used.has(nm[0])) continue; used.add(nm[0]); out.push(nm); } return out; }
function newMatch() {
  const su = UI.setup, n = clamp(su.n, 2, 8), seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, R = { rs: (seed ^ 0x9e3779b9) >>> 0 };
  const set = su.set === 'random' ? randomSet(R) : PRESETS.find(p => p.id === su.set) || PRESETS[0];
  const mode = ninthMode(n), chars = charsFor(set, n, mode === 'always' ? true : mode === 'never' ? false : su.ninth);
  const names = ['You', ...pickNames(R, n - 1)];
  S = newGame({ seed, names, ai: names.map((_, i) => i > 0), chars, uniques: set.uniques, setName: set.name, skill: SET.difficulty });
  S.snap = true;
  UI.cards = new Map();
  for (const c of S.deck) UI.cards.set(c.uid, c);
  for (const P of S.players) for (const c of P.hand) UI.cards.set(c.uid, c);
  UI.game++;
  Object.assign(UI, { sel: null, busy: true, view: null, calling: null, killedWas: null, flash: null, hint: '', known: null, hideNeed: false, form: null, post: [], finished: false, drawer: false, running: false, buildFrom: null });
  $('#chronicle').classList.remove('open');
  go('match');
  renderMatch();
  begin();
}
async function begin() {
  const G = UI.game;
  await wait(300);
  if (UI.game !== G) return;
  await play(startGame(S));
  if (UI.game !== G) return;
  advance();
}
/* the game waits while you read something (a card, a plaque, the codex, the pause menu) */
const reading = () => CODEX.open || (sheetOpen() && !UI.form && $('#sheet').dataset.lock !== '1');
async function advance() {
  const G = UI.game;
  if (UI.running) return;
  UI.running = true;
  try {
    while (S && !S.over && UI.game === G) {
      const nd = S.need;
      if (!nd || nd.pid === 0) break;
      UI.busy = true; UI.hint = `${esc(nameOf(nd.pid))} ${nd.kind === 'pick' ? 'is choosing a character' : 'is playing'}…`; renderAction();
      await wait(D(nd.kind === 'pick' ? 460 : nd.kind === 'turn' ? 430 : 380));
      while (reading() && UI.game === G) await wait(150);
      if (UI.game !== G || S.need !== nd) break;
      const a = aiAct(S, nd.pid);
      let ev = a && act(S, nd.pid, a);
      if (!ev) { const f = aiFallback(S, nd.pid); ev = f && act(S, nd.pid, f); }
      if (!ev) { console.error('the computer player is stuck', nd); break; }
      await play(ev);
    }
  } finally { UI.running = false; }
  if (UI.game !== G || !S) return;
  if (S.over) return finish();
  humanPrompt();
}
function humanPrompt() {
  UI.busy = false; UI.hint = '';
  renderMatch();
  if (UI.post.length) return showPost();
  if (S.need.kind !== 'turn' && !UI.hideNeed && !sheetOpen()) openNeed();
}
function showPost() { const p = UI.post.shift(); if (p && p.kind === 'peek') peekSheet(p); }
async function humanAct(a, ctx = {}) {
  if (UI.busy || !needMine()) return false;
  const ev = act(S, 0, a);
  if (!ev) { SFX.play('bad'); renderMatch(); return false; }
  UI.sel = null; UI.form = null; UI.hideNeed = false;
  if (sheetOpen() && $('#sheet').dataset.lock !== '1') closeSheet();
  await play(ev, ctx);
  if (!S || UI.screen !== 'match') return true;
  if (S.over) return finish();
  advance();
  return true;
}
function finish() {
  if (UI.finished) return; UI.finished = true; UI.busy = true; UI.sel = null; renderMatch();
  const r = SET.record, my = S.scores[0].total; r.played++; if (S.winner === 0) r.won++; r.best = Math.max(r.best || 0, my); saveSettings();
  banner(S.winner === 0 ? 'Your city wins!' : `${S.players[S.winner].name} wins`, plural(S.scores[S.winner].total, 'point'), 1900);
  const G = UI.game;
  setTimeout(() => { if (UI.game !== G) return; SFX.play(S.winner === 0 ? 'win' : 'lose'); resultsSheet(); }, D(1300) + 500);
}

/* ── your turn ── */
function onHandCard(uid) {
  const c = S.players[0].hand.find(x => x.uid === uid); if (!c) return;
  const mine = needMine() && S.need.kind === 'turn' && !UI.busy;
  if (!mine || UI.sel === uid) return districtSheet(c, { hand: true });
  UI.sel = uid; markHand(); SFX.play('click'); buzz(8); later(renderSelection);
}
function unselect() { UI.sel = null; markHand(); buzz(6); later(renderSelection); }
function buildCard(uid, ctx = {}) {
  const P = S.players[0], card = P.hand.find(c => c.uid === uid); if (!card) return false;
  if (buildReason(card)) { SFX.play('bad'); return false; }
  const opts = payOptions(S, 0, card);
  if (opts.length === 1 && opts[0].pay === 'gold') { humanAct({ t: 'build', uid, pay: 'gold' }, ctx); return true; }
  form('pay', { uid, mode: opts[0].pay, uids: [], sac: null, from: null });
  return false;
}
function useGain() {
  const g = gainState(); if (!g) return;
  if (g.res === 'either') return form('gain', { n: g.n, gold: g.n });
  humanAct({ t: 'gain' });
}
function toggleChronicle(force) { UI.drawer = force != null ? force : !UI.drawer; $('#chronicle').classList.toggle('open', UI.drawer); if (UI.drawer) renderChronicle(); }
function cycleSpeed() { SET.speed = SPEED_ORDER[(SPEED_ORDER.indexOf(SET.speed) + 1) % SPEED_ORDER.length]; saveSettings(); if (S) renderTopbar(); }
/* after a sheet closes: a decision still waiting comes back, or what the Spy saw */
function afterClose() {
  if (UI.screen === 'menu') return renderMenu();
  if (UI.screen !== 'match' || !S || UI.busy) return;
  if (UI.post.length) return showPost();
  if (needMine() && S.need.kind !== 'turn' && !UI.hideNeed) openNeed();
}

/* ── input ── */
document.addEventListener('click', e => {
  SFX.init();
  if (TIP.long) { TIP.long = false; if (e.target.closest('[data-tip]') && !e.target.closest('button.btn, .pick, .prow, [data-act]')) return; }
  if (performance.now() - DRAG.droppedAt < 450 && e.target.closest('#hand, #stage')) return;
  const f = e.target.closest('[data-f]'); if (f) { if (!f.disabled) formTap(f.dataset.f, f.dataset.v); return; }
  const act = e.target.closest('[data-act]'); if (act) { if (!act.disabled) action(act.dataset.act, act); return; }
  const cref = e.target.closest('[data-cref]'); if (cref && S) { const X = S.players[+cref.dataset.pid], en = X && entry(X, +cref.dataset.cref); if (en) districtSheet(en.card, { beau: en.beau, mus: en.museum.length }); return; }
  const city = e.target.closest('[data-city]'); if (city && S) { const en = entry(S.players[0], +city.dataset.city); if (en) districtSheet(en.card, { city: true, beau: en.beau, mus: en.museum.length }); return; }
  const ch = e.target.closest('#track .med, .cx-item[data-char], .sd-cards .card[data-char], #stage-card .card[data-char]'); if (ch) return charSheet(ch.dataset.char);
  const dist = e.target.closest('.cx-item[data-dist], .sd-cards .card[data-id]'); if (dist) return districtSheet(staticDistrict(dist.dataset.dist || dist.dataset.id));
  if (e.target.closest('#stage-card .card[data-id]')) { const c = selCard(); if (c) districtSheet(c, { hand: true }); return; }
  const t = e.target.closest('[data-n], [data-diff], [data-set-id], [data-ninth], [data-set], #hand .card, .seat');
  if (!t) {
    if (e.target.id === 'sheet') { if (UI.form && FORMS[UI.form.kind].need) return action('hide-need'); if (!$('#sheet').dataset.lock) { closeSheet(); afterClose(); } }
    return;
  }
  if (t.dataset.n) { UI.setup.n = +t.dataset.n; SET.n = UI.setup.n; saveSettings(); SFX.play('click'); return rerenderSetup(); }
  if (t.dataset.diff) { SET.difficulty = t.dataset.diff; saveSettings(); SFX.play('click'); return rerenderSetup(); }
  if (t.dataset.setId) { UI.setup.set = t.dataset.setId; SET.set = UI.setup.set; saveSettings(); SFX.play('click'); return rerenderSetup(); }
  if (t.dataset.ninth) { UI.setup.ninth = t.dataset.ninth === '1'; SET.ninth = UI.setup.ninth; saveSettings(); SFX.play('click'); return rerenderSetup(); }
  if (t.dataset.set) { const v = t.dataset.val; SET[t.dataset.set] = v === 'true' ? true : v === 'false' ? false : v; SFX.on = SET.sound; saveSettings(); settingsSheet(); if (S && UI.screen === 'match') renderTopbar(); return; }
  if (t.matches('#hand .card')) return onHandCard(+t.dataset.uid);
  if (t.classList.contains('seat')) return seatSheet(+t.dataset.pid);
});
function rerenderSetup() { const l = $('.su-list'), d = $('.su-detail'), s = $('#screen-setup'), ly = l ? l.scrollTop : 0, dy = d ? d.scrollTop : 0, sy = s.scrollTop; renderSetup(); if ($('.su-list')) $('.su-list').scrollTop = ly; if ($('.su-detail')) $('.su-detail').scrollTop = dy; s.scrollTop = sy; }
function action(a, el) {
  switch (a) {
    case 'quick': return newMatch();
    case 'setup': return go('setup');
    case 'menu': return go('menu');
    case 'start': return newMatch();
    case 'again': return newMatch();
    case 'rules': closeSheet(); return openCodex('rules');
    case 'codex': closeSheet(); return openCodex(S && UI.screen === 'match' ? 'chars' : 'rules');
    case 'codex-tab': CODEX.tab = el.dataset.tab; renderCodex(); $('#codex .cx-body').scrollTop = 0; return;
    case 'codex-back': closeCodex(); return afterClose();
    case 'settings': return settingsSheet();
    case 'pause': return pauseSheet();
    case 'close': closeSheet(); return afterClose();
    case 'hide-need': closeSheet(); UI.hideNeed = true; return renderAction();
    case 'need': UI.hideNeed = false; return openNeed();
    case 'concede': return go('menu');
    case 'chronicle': return toggleChronicle();
    case 'speed': return cycleSpeed();
    case 'card-info': { const c = selCard(); if (c) districtSheet(c, { hand: true }); return; }
    case 'cancel-sel': return unselect();
    case 'build-sel': if (UI.sel != null) buildCard(UI.sel); return;
    case 'build-uid': { const uid = +el.dataset.uid; closeSheet(); return buildCard(uid); }
    case 'gather-gold': return humanAct({ t: 'gather', take: 'gold' });
    case 'gather-cards': return humanAct({ t: 'gather', take: 'cards' });
    case 'ability': return openAbility();
    case 'gain': return useGain();
    case 'use-laboratory': return form('handpick', { kind2: 'lab', uid: null });
    case 'use-museum': return form('handpick', { kind2: 'museum', uid: null });
    case 'use-smithy': return form('confirm', { title: 'The Smithy', text: 'Pay 2 gold to draw 3 cards.', label: `Pay 2${ic('gold')}`, a: { t: 'smithy' } });
    case 'use-armory': return form('city', { what: 'armory', uid: null });
    case 'end': return humanAct({ t: 'end' });
    case 'form-ok': return formOK();
    case 'form-alt': return formOK(true);
    case 'hand-prev': return handStep(-1);
    case 'hand-next': return handStep(1);
  }
}
document.addEventListener('keydown', e => {
  if (CODEX.open) { if (e.key === 'Escape') { if (sheetOpen()) { closeSheet(); } else action('codex-back'); } return; }
  if (UI.screen !== 'match' || !S) return;
  if (e.key === 'Escape') {
    if (sheetOpen()) { if (UI.form && FORMS[UI.form.kind].need) return action('hide-need'); if (!$('#sheet').dataset.lock) { closeSheet(); afterClose(); } return; }
    if (UI.sel != null) return unselect();
    return pauseSheet();
  }
  if (sheetOpen()) { if (e.key === 'Enter' && UI.form) { const b = $('#sheet [data-act="form-ok"]'); if (b && !b.disabled) { e.preventDefault(); formOK(); } } return; }
  const k = e.key.toLowerCase(), mine = needMine() && S.need.kind === 'turn' && !UI.busy;
  if (/^[1-9]$/.test(e.key)) { const c = S.players[0].hand[+e.key - 1]; if (c) onHandCard(c.uid); }
  else if (e.key === 'Enter' && mine && selCard()) { e.preventDefault(); action('build-sel'); }
  else if (k === 'e' && mine && canEnd(S, 0)) action('end');
  else if (k === 'g' && mine && canGather(S, 0)) action('gather-gold');
  else if (k === 'd' && mine && canGather(S, 0)) action('gather-cards');
  else if (k === 'a' && mine) { const ab = abilityState(); if (ab && ab.ok) openAbility(); }
  else if (k === 'i' && selCard()) action('card-info');
  else if (k === 'h') action('codex');
  else if (k === 'l') toggleChronicle();
  else if (k === 's') cycleSpeed();
  else if (e.key === 'Enter' && needMine() && S.need.kind !== 'turn') openNeed();
});

/* ── drag a card from your hand up into the square to build it. Hold it a moment (or pull it up) to pick it up; a sideways
   swipe scrolls the hand. One ghost card on its own layer ── */
const DRAG = { uid: null, el: null, pid: null, mouse: false, x0: 0, y0: 0, lx: 0, ly: 0, hold: 0, on: false, back: false, ox: 0, oy: 0, w: 0, k: 0.8, top: 0, ok: false, droppedAt: 0 };
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
function landingRect() { const cur = $('#stage-card .card'); if (cur) return cur.getBoundingClientRect(); const r = stageRect(); return { left: r.left, top: r.top, width: DRAG.w * 0.9 }; }
function beginDrag(x, y) {
  clearTimeout(DRAG.hold);
  const c = S.players[0].hand.find(h => h.uid === DRAG.uid);
  if (!c || !myTurnOpen() || !DRAG.el.isConnected) { DRAG.uid = null; return; }
  const r = DRAG.el.getBoundingClientRect();
  DRAG.w = DRAG.el.offsetWidth; DRAG.ox = DRAG.x0 - r.left; DRAG.oy = DRAG.y0 - r.top;
  DRAG.top = $('#hand').getBoundingClientRect().top - 6;
  DRAG.on = true; DRAG.ok = false; UI.sel = c.uid;
  try { DRAG.el.setPointerCapture(DRAG.pid); } catch (_) { }
  const g = $('#drag-ghost');
  g.innerHTML = DRAG.el.outerHTML;
  const gc = g.firstElementChild; gc.classList.remove('sel', 'can', 'drag-src', 'fresh'); gc.removeAttribute('tabindex'); gc.removeAttribute('role'); gc.style.transformOrigin = `${DRAG.ox}px ${DRAG.oy}px`;
  g.style.transition = ''; ghostAt(x, y); g.classList.add('on');
  DRAG.el.classList.add('drag-src'); $('#stage').classList.add('holding');
  hideTip(); SFX.play('card'); buzz(12);
  later(() => { if (!DRAG.on) return; markHand(); renderStage(); put('#prompt', '<span class="hint">Drop it above your hand to build it</span>'); });
}
function dragMove(x, y) {
  ghostAt(x, y);
  const ok = y < DRAG.top;
  if (ok === DRAG.ok) return;
  DRAG.ok = ok; $('#stage').classList.toggle('drop-ok', ok);
}
async function endDrag(x, y, cancelled) {
  const uid = UI.sel, c = S.players[0].hand.find(h => h.uid === uid);
  if (!cancelled) dragMove(x, y);
  const ok = !cancelled && DRAG.ok && c && !buildReason(c);
  DRAG.on = false; DRAG.back = true; DRAG.droppedAt = performance.now();
  $('#stage').classList.remove('drop-ok', 'holding');
  if (ok) {
    const opts = payOptions(S, 0, c);
    if (opts.length === 1 && opts[0].pay === 'gold') {
      UI.busy = true; buzz(14);
      await ghostTo(landingRect(), 180, 'ease-out');
      DRAG.back = false; UI.busy = false;
      return humanAct({ t: 'build', uid, pay: 'gold' }, { landed: uid });
    }
  }
  const src = document.querySelector(`#hand .card[data-uid="${uid}"]`);
  if (src) { const r = src.getBoundingClientRect(); await ghostTo({ left: r.left, top: r.top - 8, width: r.width }, 200, 'ease-in'); src.classList.remove('drag-src'); }
  dropGhost(); DRAG.back = false;
  if (ok) buildCard(uid);
  else if (c && DRAG.ok === false && !cancelled) { /* dropped back on the hand: stays chosen */ }
  if (!cancelled && c && DRAG.ok && buildReason(c)) SFX.play('bad');
  renderSelection();
}
document.addEventListener('pointerdown', e => {
  if (DRAG.on || DRAG.back) return;
  const el = e.target.closest('#hand .card.can'); if (!el || !myTurnOpen() || e.button > 0) return;
  clearTimeout(DRAG.hold);
  Object.assign(DRAG, { uid: +el.dataset.uid, el, pid: e.pointerId, mouse: e.pointerType === 'mouse', x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY });
  if (!DRAG.mouse) DRAG.hold = setTimeout(() => { if (DRAG.uid != null && !DRAG.on) beginDrag(DRAG.lx, DRAG.ly); }, 260);
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
addEventListener('resize', () => { updateMode(); if (UI.screen === 'match' && S) { forget($('#opps')); forget($('#me')); renderMatch(); } else if (UI.screen === 'menu') renderMenu(); else if (UI.screen === 'setup') rerenderSetup(); });
updateMode(); installStyles(); go('menu');
