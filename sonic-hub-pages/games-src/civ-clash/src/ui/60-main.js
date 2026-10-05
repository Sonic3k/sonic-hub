/* ── Controller: screens, match flow with motion, input ── */
const STORE = 'mayhem.v2';
const SET = (() => { const d = { difficulty: 'normal', speed: 'normal', sound: true, tutorialDone: false, n: 2, civ: 'franks', stats: {} }; try { return Object.assign(d, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) { return d; } })();
function saveSettings() { try { localStorage.setItem(STORE, JSON.stringify(SET)); } catch (e) { } }
let S = null;
UI.n = SET.n; UI.civ = CIVS[SET.civ] ? SET.civ : 'franks'; SFX.on = SET.sound;
function go(screen) {
  UI.screen = screen; closeSheet(); clearAim(); hideTip();
  for (const id of ['menu', 'select', 'match']) $('#screen-' + id).classList.toggle('hidden', id !== screen);
  if (screen === 'menu') renderMenu(); else if (screen === 'select') renderSelect();
}
function newMatch(o = {}) {
  const civ = o.civ || UI.civ, n = o.n || UI.n, seed = o.tutorial ? 20261005 : (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  const others = o.opps || shuffled({ rs: seed }, CIV_ORDER.filter(c => c !== civ)).slice(0, n - 1);
  S = newGame({ seed, civs: [civ, ...others], ai: [false, ...others.map(() => true)] });
  for (const P of S.players.slice(1)) { P.skill = o.tutorial ? 'easy' : SET.difficulty; chooseRelic(S, P.id, aiRelic(S, P)); }
  Object.assign(UI, { sel: null, hoverT: null, last: null, view: null, busy: false, finished: false, round: 1, drawer: false, tutorial: null, lastSetup: o });
  $('#chronicle').classList.remove('open');
  go('match'); renderMatch();
  if (o.tutorial) { chooseRelic(S, 0, 'jade'); beginMatch(); startTutorial(); } else relicSheet();
}
function beginMatch() { closeSheet(); startGame(S); renderMatch(); banner('Round 1', 'You go first; every opponent starts with 1 extra card'); SFX.play('turn'); }

/* the human */
function onHandCard(uid) {
  if (!isMyTurn()) return;
  const c = S.players[0].hand.find(x => x.uid === uid); if (!c) return;
  if (UI.sel !== uid) { UI.sel = uid; UI.hoverT = null; clearAim(); SFX.play('click'); renderMatch(); coachEvent('select'); return; }
  const opps = opponents(S, S.players[0]);
  if (needsTarget(c)) { if (opps.length === 1) return humanPlay(uid, opps[0].id); if (UI.hoverT != null) return humanPlay(uid, UI.hoverT); UI.sel = null; clearAim(); return renderMatch(); }
  humanPlay(uid, null);
}
function aiming() { const c = selCard(); return !!(c && isMyTurn() && needsTarget(c) && opponents(S, S.players[0]).length > 1); }
function onCamp(pid, touch) {
  if (!aiming() || pid === 0 || !S.players[pid].alive) return;
  if (touch && UI.hoverT !== pid) return setAimTarget(pid);
  humanPlay(UI.sel, pid);
}
function setAimTarget(pid) {
  if (UI.hoverT === pid) return;
  UI.hoverT = pid;
  $$('.camp.targetable').forEach(el => el.classList.toggle('hot', +el.dataset.pid === pid));
  renderStage(); renderPreview();
}
async function humanPlay(uid, tid) {
  const el = document.querySelector(`#hand .card[data-uid="${uid}"]`), from = el ? el.getBoundingClientRect() : null;
  UI.busy = true; clearAim(); UI.view = S.players.map(p => p.hp);
  const ev = playCard(S, 0, uid, tid);
  if (!ev) { UI.busy = false; UI.view = null; return renderMatch(); }
  coachEvent('play');
  await animatePlay(ev, 0, from);
  UI.busy = false;
  if (S.winner != null || !S.players[0].alive) return finish();
  if (S.plays > 0 && S.players[0].hand.length) return renderMatch();
  nextTurn();
}
async function humanBuy(i) {
  if (!isMyTurn()) return;
  const card = S.market[i], el = document.querySelector(`.mk-item[data-mi="${i}"]`), from = el ? el.getBoundingClientRect() : null;
  if (!card || !buy(S, 0, i)) return;
  closeSheet(); UI.busy = true; SFX.play('coin'); renderMatch();
  await animateBuy(card, 0, from);
  UI.busy = false; renderMatch(); coachEvent('buy');
}
/* turns */
async function nextTurn() {
  UI.busy = true; UI.sel = null; renderMatch(); await wait(D(380));
  const round = S.round; endTurn(S);
  if (S.round !== round && S.winner == null) await roundStart();
  if (S.winner != null || !S.players[0].alive) return finish();
  if (S.turn === 0) return myTurnStart();
  return aiTurn();
}
async function roundStart() {
  UI.flipEvent = true; renderMatch(); SFX.play('quill');
  const E = EVENT_BY[S.event]; banner(`Round ${S.round}`, `${E.name}: ${E.text}`, 2000);
  await wait(D(1100));
}
function myTurnStart() {
  UI.busy = false; UI.sel = null; renderMatch(); SFX.play('turn');
  const me = S.players[0];
  coachEvent('turn');
  if (me.ageGiven && !me.aged && me.turns === RULES.ageTurn) { banner('The Imperial Age', 'Your Imperial Age card has arrived', 2000); coachEvent('agecard'); }
  if (!me.hand.length) nextTurn();
}
async function aiTurn() {
  const pid = S.turn, P = S.players[pid];
  renderMatch(); await wait(D(500));
  for (let guard = 0; guard < 30 && S.winner == null && S.turn === pid; guard++) {
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
  const act = e.target.closest('[data-act]'), touch = e.pointerType === 'touch' || matchMedia('(pointer: coarse)').matches;
  if (act) return action(act.dataset.act, act);
  const t = e.target.closest('.civ-tile, [data-n], [data-diff], [data-set], .relic-pick, .mk-item, #hand .card, .camp');
  if (!t) { if (e.target.id === 'sheet' && !$('#sheet').dataset.lock) closeSheet(); return; }
  if (t.classList.contains('civ-tile')) { UI.civ = t.dataset.civ; SET.civ = UI.civ; saveSettings(); SFX.play('click'); const y = $('.sel-list').scrollTop; renderSelect(); $('.sel-list').scrollTop = y; return; }
  if (t.dataset.n) { UI.n = +t.dataset.n; SET.n = UI.n; saveSettings(); const y = $('.sel-list').scrollTop; renderSelect(); $('.sel-list').scrollTop = y; return; }
  if (t.dataset.diff) { SET.difficulty = t.dataset.diff; saveSettings(); const y = $('.sel-list').scrollTop; renderSelect(); $('.sel-list').scrollTop = y; return; }
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
    case 'choose': return go('select');
    case 'menu': return go('menu');
    case 'start': return newMatch({ civ: UI.civ, n: UI.n });
    case 'again': return newMatch(UI.lastSetup.tutorial ? { civ: UI.civ, n: UI.n } : UI.lastSetup);
    case 'random-civ': UI.civ = CIV_ORDER[Math.floor(Math.random() * CIV_ORDER.length)]; SET.civ = UI.civ; saveSettings(); return renderSelect();
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
    case 'coach-skip': return endTutorial();
  }
}
document.addEventListener('pointermove', e => {
  if (!aiming() || e.pointerType === 'touch') return;
  const camp = e.target.closest('.camp.targetable');
  setAimTarget(camp ? +camp.dataset.pid : null);
  const cardEl = document.querySelector(`#hand .card[data-uid="${UI.sel}"]`);
  if (camp) { const r = camp.getBoundingClientRect(); aim(cardEl && cardEl.getBoundingClientRect(), r.left + r.width / 2, r.top + r.height / 2); }
  else aim(cardEl && cardEl.getBoundingClientRect(), e.clientX, e.clientY);
});
document.addEventListener('keydown', e => {
  if (UI.screen !== 'match' || !S) return;
  const sheetOpen = !$('#sheet').classList.contains('hidden');
  if (e.key === 'Escape') { if (sheetOpen) { if (!$('#sheet').dataset.lock) closeSheet(); return; } if (UI.sel != null) { UI.sel = null; UI.hoverT = null; clearAim(); return renderMatch(); } return pauseSheet(); }
  if (sheetOpen) return;
  const k = e.key.toLowerCase();
  if (/^[1-9]$/.test(e.key)) { const c = S.players[0].hand[+e.key - 1]; if (c) onHandCard(c.uid); }
  else if (e.key === 'Enter' && UI.sel != null) { e.preventDefault(); onHandCard(UI.sel); }
  else if (e.key === 'Tab' && aiming()) { e.preventDefault(); const o = opponents(S, S.players[0]).map(p => p.id), i = o.indexOf(UI.hoverT); UI.hoverT = null; setAimTarget(o[(i + 1) % o.length]); clearAim(); }
  else if (k === 'l') toggleChronicle();
  else if (k === 's') cycleSpeed();
  else if (k === 'h') helpSheet();
});
addEventListener('resize', () => { if (UI.screen === 'match' && S && !UI.busy) renderMatch(); });
installCivStyles(); installTableArt(); go('menu');
