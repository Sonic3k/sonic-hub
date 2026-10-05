/* ── Controller ── */
const SAVE_KEY = 'len-doi.v1';
function freshMeta() { return { v: 1, sound: true, helped: false, games: 0, wins: 0, byCiv: {}, run: null }; }
function loadMeta() { try { const m = JSON.parse(localStorage.getItem(SAVE_KEY)); if (m && m.v === 1) return Object.assign(freshMeta(), m); } catch (e) { } return freshMeta(); }
function persist() { META.run = S && !S.over ? S : null; try { localStorage.setItem(SAVE_KEY, JSON.stringify(META)); } catch (e) { } }
let toastT = 0;
function toast(msg, good = true) { if (!msg) return; const t = $('#toast'); t.textContent = msg; t.className = 'show ' + (good ? 'good' : 'bad'); clearTimeout(toastT); toastT = setTimeout(() => { t.className = ''; }, 2600); }

function onRegion(r) {
  if (UI.mode && UI.mode.kind === 'move') {
    const reach = pathsFrom(S, ME, UI.mode.from, moveRange(S, ME, UI.mode.units));
    if (reach[r]) { UI.mode.to = r; SFX.play('click'); render(); return; }
    if (r === UI.mode.from) { UI.mode = null; render(); return; }
    toast('Vùng đó quá xa với đạo quân này.', false); return;
  }
  UI.sel = r; SFX.play('click'); render();
}
function checkMoveTarget() { if (UI.mode && UI.mode.to && !pathsFrom(S, ME, UI.mode.from, moveRange(S, ME, UI.mode.units))[UI.mode.to]) UI.mode.to = null; }
function onClick(e) {
  const el = e.target.closest('[data-a]');
  if (!el || el.disabled) return;
  SFX.init();
  const a = el.dataset.a, x = el.dataset.x, r = el.dataset.r;
  let res = null;
  switch (a) {
    case 'region': onRegion(r); return;
    case 'job': res = setJob(S, ME, x, +el.dataset.d); break;
    case 'train': res = planTrain(S, ME, x, +el.dataset.d); break;
    case 'untrain': res = planTrain(S, ME, x, -1); break;
    case 'build': res = planBuild(S, ME, x, r); break;
    case 'unbuild': res = cancelBuild(S, ME, +el.dataset.i); break;
    case 'research': res = planResearch(S, ME, S.sides[ME].orders.research === x ? null : x); break;
    case 'scout': res = planScout(S, ME, r); break;
    case 'captab': UI.capTab = x; SFX.play('click'); render(); return;
    case 'move': UI.mode = { kind: 'move', from: r, units: { ...availableAt(S, ME, r) }, to: null }; SFX.play('click'); render(); return;
    case 'mvu': { const av = availableAt(S, ME, UI.mode.from); UI.mode.units[x] = clamp((UI.mode.units[x] || 0) + +el.dataset.d, 0, av[x] || 0); checkMoveTarget(); render(); return; }
    case 'mvall': UI.mode.units = { ...availableAt(S, ME, UI.mode.from) }; checkMoveTarget(); render(); return;
    case 'mvmounted': { const av = availableAt(S, ME, UI.mode.from); UI.mode.units = {}; for (const t in av) if (MOUNTED.has(UNITS[t].cls)) UI.mode.units[t] = av[t]; checkMoveTarget(); render(); return; }
    case 'mvcancel': UI.mode = null; render(); return;
    case 'mvok': res = planMove(S, ME, UI.mode.from, UI.mode.to, UI.mode.units); if (res.ok) { UI.mode = null; res.msg = 'Quân đã nhận lệnh.'; } break;
    case 'unmove': res = cancelMove(S, ME, +el.dataset.i); break;
    case 'commit': commit(); return;
    case 'closechron': afterChronicle(); return;
    case 'card': { const rr = chooseCard(S, ME, x); closeModal(); SFX.play('quill'); persist(); render(); toast(rr.msg); return; }
    case 'helped': META.helped = true; persist(); render(); return;
    case 'help': META.helped = false; UI.mode = null; render(); return;
    case 'sound': META.sound = !META.sound; SFX.on = META.sound; persist(); render(); return;
    case 'home': persist(); S = null; UI.mode = null; closeModal(); render(); window.scrollTo({ top: 0 }); return;
    case 'newgame': closeModal(); S = null; persist(); render(); window.scrollTo({ top: 0 }); return;
    case 'pickciv': UI.pick.civ = x; SFX.play('click'); render(); return;
    case 'pickfoe': UI.pick.foe = x; SFX.play('click'); render(); return;
    case 'pickdiff': UI.pick.diff = +x; SFX.play('click'); render(); return;
    case 'start': startGame(); return;
    case 'resume': S = META.run; UI.sel = 'c0'; UI.mode = null; render(); if (S.sides[ME].pendingCard) showModal(cardHTML()); return;
    case 'abandon': if (UI.confirm !== 'abandon') { UI.confirm = 'abandon'; render(); return; } UI.confirm = null; META.run = null; try { localStorage.setItem(SAVE_KEY, JSON.stringify(META)); } catch (e2) { } render(); return;
  }
  if (res) {
    if (!res.ok && res.msg) toast(res.msg, false); else if (res.ok && res.msg) toast(res.msg);
    SFX.play(res.ok ? (a === 'train' || a === 'build' || a === 'research' ? 'coin' : 'quill') : 'bad');
    if (res.ok) persist();
    render();
  }
}
function onKey(e) {
  const t = e.target;
  if ((e.key === 'Enter' || e.key === ' ') && t.getAttribute && t.getAttribute('data-a') === 'region') { e.preventDefault(); onRegion(t.getAttribute('data-r')); return; }
  if (e.key === 'Escape' && S) { if (UI.mode) { UI.mode = null; render(); } else if ($('#modal .overlay') && !S.sides[ME].pendingCard) afterChronicle(); }
}
function startGame() {
  const foe = UI.pick.foe === 'random' ? CIV_ORDER[Math.floor(Math.random() * CIV_ORDER.length)] : UI.pick.foe;
  const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  S = newGame({ seed, civ0: UI.pick.civ, civ1: foe, ai1: true, diff: UI.pick.diff });
  aiPlan(S, FOE);
  UI.sel = 'c0'; UI.mode = null; UI.capTab = 'train';
  persist(); render(); window.scrollTo({ top: 0 }); SFX.play('horn');
}
function commit() {
  if (S.over) return;
  SFX.play('drum');
  const R = resolveTurn(S);
  if (!S.over) aiPlan(S, FOE);
  UI.mode = null;
  persist(); render();
  if (R.battles.length) setTimeout(() => SFX.play('clash'), 450);
  if (R.ev.some(e => e.k === 'age' && e.side === ME)) setTimeout(() => SFX.play('age'), 700);
  showModal(reportHTML(R));
}
function afterChronicle() {
  closeModal();
  if (S.over) {
    if (!S.counted) { S.counted = true; META.games++; if (S.winner === ME) META.wins++; const b = META.byCiv[S.sides[ME].civ] || { g: 0, w: 0 }; b.g++; if (S.winner === ME) b.w++; META.byCiv[S.sides[ME].civ] = b; persist(); }
    render(); showModal(endHTML()); SFX.play(S.winner === ME ? 'win' : 'lose'); return;
  }
  if (S.sides[ME].pendingCard) showModal(cardHTML());
}
function boot() {
  META = loadMeta(); SFX.on = META.sound !== false;
  if (!/game-age-duel\.html$/.test(location.pathname) || /claude/.test(location.hostname)) document.documentElement.classList.add('no-home');
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  render();
}
