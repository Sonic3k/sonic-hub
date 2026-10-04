/* ── Controller: clicks, months, saving ── */
const SAVE_KEY = 'ong-trum-4rum.v1';
function freshMeta() { return { v: 1, sound: true, tips: false, hall: [], ach: {}, unlocked: {}, played: {}, run: null }; }
function loadMeta() { try { const m = JSON.parse(localStorage.getItem(SAVE_KEY)); if (m && m.v === 1) return Object.assign(freshMeta(), m); } catch (e) { } return freshMeta(); }
function persist() { META.run = S && !S.over ? S : null; try { localStorage.setItem(SAVE_KEY, JSON.stringify(META)); } catch (e) { } }

function onClick(e) {
  const el = e.target.closest('[data-a]');
  if (!el || el.disabled) return;
  SFX.init();
  const a = el.dataset.a, x = el.dataset.x, id = el.dataset.id ? +el.dataset.id : null;
  let res = null;
  switch (a) {
    case 'tab': UI.tab = x; UI.open = null; UI.confirm = null; UI.pickBox = null; render(); window.scrollTo({ top: 0 }); return;
    case 'open': UI.open = UI.open === id ? null : id; UI.confirm = null; SFX.play('click'); render(); return;
    case 'tact': res = doThreadAction(S, id, x); break;
    case 'policy': res = togglePolicy(S, x); break;
    case 'buy': res = buyPlugin(S, x); break;
    case 'reroll': res = rerollShop(S); break;
    case 'host': res = setHosting(S, x); break;
    case 'ads': res = toggleAds(S, x); break;
    case 'pickbox': UI.pickBox = UI.pickBox === x ? null : x; UI.confirm = null; render(); return;
    case 'activity': { const arg = el.dataset.arg; res = runActivity(S, x, arg == null ? undefined : /^\d+$/.test(arg) ? +arg : arg); UI.pickBox = null; break; }
    case 'promote': res = promote(S, id, +el.dataset.box); UI.pickBox = null; break;
    case 'reassign': res = reassign(S, id, +el.dataset.box); UI.pickBox = null; break;
    case 'demote': res = demote(S, id); break;
    case 'thank': res = thankMod(S, id); break;
    case 'ban': if (UI.confirm !== 'ban' + id) { UI.confirm = 'ban' + id; render(); return; } UI.confirm = null; res = banNotable(S, notableById(S, id)); break;
    case 'im': openIM(); return;
    case 'choose': {
      res = chooseEvent(S, +el.dataset.uid, +el.dataset.i);
      if (!res.ok) { toast(res.msg, false); SFX.play('bad'); return; }
      SFX.play('ok'); persist(); render();
      const b = document.querySelector('#im .btn'); if (b) b.focus({ preventScroll: true });
      return;
    }
    case 'imnext': { const p = pending(); if (p.length) openIM(p[0].uid); else { UI.im = null; renderIM(); } return; }
    case 'imclose': UI.im = null; renderIM(); return;
    case 'end': endMonth(); return;
    case 'next': closeReport(); return;
    case 'tipsok': META.tips = true; persist(); render(); return;
    case 'tips': META.tips = false; UI.tab = 'forum'; render(); window.scrollTo({ top: 0 }); return;
    case 'sound': META.sound = !META.sound; SFX.on = META.sound; persist(); render(); return;
    case 'home': persist(); S = null; UI.im = null; closeModal(); render(); window.scrollTo({ top: 0 }); return;
    case 'pickarch': { const old = ARCH[UI.pick.arch].defaultName, cur = ($('#fname') || {}).value || ''; UI.pick.name = !cur.trim() || cur === old ? '' : cur; UI.pick.arch = x; SFX.play('click'); render(); return; }
    case 'pickbg': { const cur = ($('#fname') || {}).value || ''; if (cur && cur !== ARCH[UI.pick.arch].defaultName) UI.pick.name = cur; UI.pick.bg = x; SFX.play('click'); render(); return; }
    case 'start': startRun(); return;
    case 'resume': S = META.run; UI.tab = 'forum'; UI.open = null; UI.im = null; UI.buzzed = {}; UI.gotAch = []; render(); window.scrollTo({ top: 0 }); if (pending().length) setTimeout(() => openIM(), 400); return;
    case 'abandon': if (UI.confirm !== 'abandon') { UI.confirm = 'abandon'; render(); return; } UI.confirm = null; META.run = null; try { localStorage.setItem(SAVE_KEY, JSON.stringify(META)); } catch (e2) { } render(); return;
    case 'newrun': closeModal(); S = null; UI.gotAch = []; UI.im = null; persist(); render(); window.scrollTo({ top: 0 }); return;
  }
  if (res) {
    if (res.ok) { SFX.play(FX_SOUND[res.fx] || 'click'); persist(); }
    else SFX.play('bad');
    toast(res.msg, res.ok);
    render();
  }
}
function onKey(e) {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role="button"][data-a]')) { e.preventDefault(); e.target.click(); return; }
  if (e.key === 'Escape' && S) {
    const ev = UI.im && S.inbox.find(x => x.uid === UI.im);
    if (ev && ev.done) { UI.im = null; renderIM(); }
    else if (UI.open) { UI.open = null; render(); }
  }
}
function startRun() {
  const input = $('#fname');
  const name = ((input && input.value) || '').trim() || ARCH[UI.pick.arch].defaultName;
  const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  S = newGame({ seed, arch: UI.pick.arch, bg: UI.pick.bg, name });
  UI.tab = 'forum'; UI.open = null; UI.im = null; UI.buzzed = {}; UI.fresh = true; UI.gotAch = []; UI.pick.name = '';
  persist(); render(); window.scrollTo({ top: 0 });
  SFX.play('month'); monthFx(monthLabel(S.turn));
  if (pending().length) setTimeout(() => openIM(), 1100);
}
function endMonth() {
  const p = pending();
  if (p.length) { openIM(p[0].uid); return; }
  const r = endTurn(S);
  if (!r.ok) { toast(r.msg, false); return; }
  UI.open = null; UI.confirm = null; UI.pickBox = null; UI.im = null;
  const got = checkAchievements(S, META.ach);
  if (S.stats.peakMembers >= 1500 && !META.unlocked.game) { META.unlocked.game = true; got.push('_game'); }
  UI.gotAch = UI.gotAch.concat(got);
  if (S.over) finishRun();
  persist();
  SFX.play(S.over ? 'over' : r.report.record ? 'record' : 'month');
  renderIM();
  showModal(reportHTML(r.report));
  if (!S.over) got.forEach((id, i) => { const A = ACHIEVEMENTS.find(a => a.id === id); if (A) setTimeout(() => toast('Thành tựu mới: ' + A.name), 500 + i * 2700); if (id === '_game') setTimeout(() => toast('Mở khóa loại 4rum mới: Game online!'), 500 + i * 2700); });
}
function finishRun() {
  META.played[S.arch] = true;
  if (['fan', 'teen', 'photo'].every(a => META.played[a]) && !META.ach.allthree) { META.ach.allthree = true; UI.gotAch.push('allthree'); }
  META.hall.push({ name: S.name, arch: S.arch, bg: S.bg, score: S.over.score, rank: S.over.rank, members: S.stats.peakMembers, record: S.record.n, legends: S.legends.length, reason: S.over.reason, end: shortMonth(S.over.turn), at: Date.now() });
  META.hall.sort((a, b) => b.score - a.score);
  META.hall = META.hall.slice(0, 12);
}
function closeReport() {
  closeModal();
  if (S.over) { render(); showModal(memoirHTML()); return; }
  UI.fresh = true;
  render(); window.scrollTo({ top: 0 });
  monthFx(monthLabel(S.turn));
  if (pending().length) setTimeout(() => openIM(), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 50 : 1000);
}
function boot() {
  META = loadMeta(); SFX.on = META.sound !== false;
  if (!/game-forum-tycoon\.html$/.test(location.pathname) || /claude/.test(location.hostname)) document.documentElement.classList.add('no-home');
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  window.matchMedia('(max-width: 860px)').addEventListener('change', () => { if (S) render(); });
  render();
}
