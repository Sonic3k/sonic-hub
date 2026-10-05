/* ── Flow: setup → relic → turns → end ── */
let S = null;
const UI = { n: 2, civ: 'daiviet', targeting: null, busy: false, last: null, round: 1, opps: [] };
const STORE = 'civclash.v1';
const prefs = (() => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } })();
function savePrefs() { try { localStorage.setItem(STORE, JSON.stringify(prefs)); } catch (e) { } }
if (prefs.n) UI.n = prefs.n; if (prefs.civ && CIVS[prefs.civ]) UI.civ = prefs.civ; if (prefs.sound === false) SFX.on = false;
function modal(html) { const m = $('#modal'); m.innerHTML = `<div class="sheet">${html}</div>`; m.classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); $('#modal').innerHTML = ''; }
function deckMix(civ) {
  const cnt = {};
  for (const c of buildDeck({ nextUid: 1 }, civ)) for (const ch of c.icons) cnt[ch] = (cnt[ch] || 0) + 1;
  return Object.entries(cnt).sort((a, b) => b[1] - a[1]);
}
function renderSetup() {
  const hp = c => (UI.n === 2 ? CIVS[c].hp2 : CIVS[c].hp4), C = CIVS[UI.civ], rec = (prefs.wins || {})[UI.civ];
  const uniques = C.deck.split(/\s+/).filter(t => t[0] === '+').map(t => { const id = t.slice(1), U = UNIQUE[id]; return { uid: 0, name: U.name, icons: U.icons, text: U.text, civ: UI.civ, unique: id, steps: [] }; });
  $('#setup').innerHTML = `<div class="hero"><h1>Hỗn Chiến Trung Cổ</h1><p>Mỗi văn minh một bộ bài riêng. Mỗi lượt rút 1 lá, đánh 1 lá. Ai còn trụ cuối cùng thì thắng.</p></div>
  <div class="setup-grid">
    <div class="pick">
      <div class="seg"><span>Số người chơi</span>${[2, 3, 4].map(n => `<button class="${UI.n === n ? 'on' : ''}" data-n="${n}">${n === 2 ? 'Tay đôi' : n + ' người'}</button>`).join('')}</div>
      ${GROUPS.map(g => `<div class="grp"><h4>${esc(g)}</h4><div class="tiles">${CIV_ORDER.filter(c => CIVS[c].group === g).map(c => `<button class="tile${c === UI.civ ? ' on' : ''}" data-civ="${c}" style="--civ:${CIVS[c].color}">${crest(c, 30)}<span>${esc(CIVS[c].name)}</span><em>${hp(c)}</em></button>`).join('')}</div></div>`).join('')}
    </div>
    <div class="detail" style="--civ:${C.color}">
      <div class="d-head">${crest(UI.civ, 64)}<div><h2>${esc(C.name)}</h2><p>${esc(C.style)}</p><p class="d-hp">Máu khởi đầu <b>${hp(UI.civ)}</b> ${UI.n === 2 ? '(tay đôi)' : '(3–4 người)'}${rec ? ` · đã thắng ${rec[0]}/${rec[1]} ván` : ''}</p></div></div>
      <h4>Lá riêng</h4><div class="d-uniques">${uniques.map(u => cardHTML(u, { small: 1 })).join('')}</div>
      <h4>Bộ 24 lá gồm</h4><div class="d-mix">${deckMix(UI.civ).map(([ch, k]) => `<span title="${esc(SYM[ch].name)}: ${esc(SYM[ch].desc)}">${symBadge(ch, 22)}<b>×${k}</b></span>`).join('')}</div>
      <p class="d-opp">Đối thủ: ${UI.n - 1} văn minh ngẫu nhiên do máy điều khiển</p>
      <div class="d-actions"><button class="btn big" id="go">Vào trận</button><button class="btn ghost" id="randCiv">Chọn ngẫu nhiên</button></div>
    </div>
  </div>`;
}
function showScreen(id) { for (const s of ['setup', 'game']) $('#' + s).classList.toggle('hidden', s !== id); }
function newMatch() {
  SFX.init();
  prefs.n = UI.n; prefs.civ = UI.civ; savePrefs();
  const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, R = { rs: seed };
  const others = shuffled(R, CIV_ORDER.filter(c => c !== UI.civ)).slice(0, UI.n - 1);
  S = newGame({ seed, civs: [UI.civ, ...others], ai: [false, ...others.map(() => true)] });
  for (const P of S.players.slice(1)) chooseRelic(S, P.id, aiRelic(S, P));
  UI.last = null; UI.targeting = null; UI.busy = false; UI.round = 1;
  showScreen('game'); renderGame();
  const P = S.players[0];
  modal(`<h2>Chọn một thánh tích</h2><p class="muted">Thánh tích theo bạn suốt trận. Mỗi trận được bốc ngẫu nhiên 3 cái.</p><div class="relics">${P.relicOffer.map(id => `<button class="relic" data-relic="${id}"><b>${esc(RELICS[id].name)}</b><span>${esc(RELICS[id].text)}</span></button>`).join('')}</div>
    <p class="muted small">Đối thủ: ${S.players.slice(1).map(o => `${esc(CIVS[o.civ].name)} (${esc(RELICS[o.relic].name)})`).join(', ')}</p>`);
}
function beginPlay(relic) {
  chooseRelic(S, 0, relic); closeModal(); startGame(S); renderGame();
  banner('Vòng 1', 'Bạn đi trước, đối thủ được thêm 1 lá'); SFX.play('turn');
  if (window.__auto) setTimeout(autoHuman, 300);
}
/* human */
function handPlay(uid) {
  if (S.turn !== 0 || UI.busy || S.winner != null) return;
  const card = S.players[0].hand.find(c => c.uid === uid); if (!card) return;
  if (needsTarget(card)) {
    const opps = opponents(S, S.players[0]);
    if (opps.length > 1) { UI.targeting = UI.targeting === uid ? null : uid; renderGame(); return; }
    return doPlay(uid, opps.length ? opps[0].id : null);
  }
  doPlay(uid, null);
}
function doPlay(uid, tid) {
  const ev = playCard(S, 0, uid, tid);
  UI.targeting = null;
  if (!ev) { renderGame(); return; }
  UI.last = { card: ev.card, pid: 0, target: ev.target };
  SFX.play('card'); renderGame(); showFx(ev.fx); afterHuman();
}
function doBuy(i) {
  if (S.turn !== 0 || UI.busy) return;
  const card = S.market[i];
  if (buy(S, 0, i)) { SFX.play('coin'); renderGame(); floatText(0, 'Thuê ' + card.name, 'gold', 0); }
}
function afterHuman() {
  if (S.winner != null || !S.players[0].alive) { UI.busy = true; setTimeout(endScreen, 1100); return; }
  const me = S.players[0];
  if (S.plays > 0 && me.hand.length) { renderGame(); if (window.__auto) setTimeout(autoHuman, 250); return; }
  UI.busy = true; renderGame();
  setTimeout(() => { endTurn(S); afterTurnChange(); }, 700);
}
function autoHuman() {
  if (S.turn !== 0 || S.winner != null) return;
  const a = aiAct(S, 0);
  if (a.kind === 'buy') { doBuy(a.idx); setTimeout(autoHuman, 200); }
  else if (a.kind === 'play') doPlay(a.uid, a.target);
  else afterHuman();
}
/* turns */
function afterTurnChange() {
  if (S.winner != null) { renderGame(); setTimeout(endScreen, 900); return; }
  if (S.round !== UI.round) { UI.round = S.round; const E = EVENT_BY[S.event]; banner(`Vòng ${S.round}: ${E.name}`, E.text); }
  if (S.turn === 0) {
    UI.busy = false; renderGame(); SFX.play('turn');
    if (!S.players[0].hand.length) { afterHuman(); return; }
    if (window.__auto) setTimeout(autoHuman, 300);
    return;
  }
  renderGame(); setTimeout(aiStep, window.__fast ? 30 : 750);
}
function aiStep() {
  if (S.winner != null) { setTimeout(endScreen, 600); return; }
  const pid = S.turn, P = S.players[pid], wait = window.__fast ? 30 : 950;
  const a = aiAct(S, pid);
  if (a.kind === 'buy') { const card = S.market[a.idx]; if (buy(S, pid, a.idx)) { SFX.play('coin'); renderGame(); floatText(pid, 'Thuê ' + card.name, 'gold', 0); setTimeout(aiStep, wait); return; } }
  let ok = false;
  if (a.kind === 'play') { const ev = playCard(S, pid, a.uid, a.target); if (ev) { ok = true; UI.last = { card: ev.card, pid, target: ev.target }; SFX.play('card'); renderGame(); showFx(ev.fx); } }
  if (S.winner != null || !S.players[0].alive) { setTimeout(endScreen, 1100); return; }
  if (!ok || S.plays <= 0 || !P.hand.length || !P.alive) setTimeout(() => { endTurn(S); afterTurnChange(); }, wait);
  else setTimeout(aiStep, wait);
}
function endScreen() {
  if (!S || $('#modal .end')) return;
  const me = S.players[0], W = S.winner != null && S.winner >= 0 ? S.players[S.winner] : null, win = S.winner === 0;
  prefs.wins = prefs.wins || {}; const r = prefs.wins[me.civ] || [0, 0]; r[1]++; if (win) r[0]++; prefs.wins[me.civ] = r; savePrefs();
  SFX.play(win ? 'win' : 'lose');
  const reason = S.wonderWin ? 'Kỳ quan đã hoàn thành' : S.timeUp ? 'Hết 40 vòng, người nhiều máu nhất thắng' : 'Hạ gục mọi đối thủ';
  modal(`<div class="end ${win ? 'win' : 'lose'}">${W ? crest(W.civ, 76) : crest(me.civ, 76)}
    <h2>${win ? 'Chiến thắng!' : me.alive ? 'Thất bại' : 'Bạn đã bại trận'}</h2>
    <p>${W ? `${W.id === 0 ? 'Bạn' : esc(CIVS[W.civ].name)} thắng · ${reason}` : `Còn trụ: ${S.players.filter(p => p.alive).map(p => esc(CIVS[p.civ].name)).join(', ')}`}</p>
    <div class="stats"><span>Sát thương gây ra <b>${me.stats.dmg}</b></span><span>Lá đã đánh <b>${me.stats.played}</b></span><span>Lính thuê <b>${me.stats.bought}</b></span><span>Số vòng <b>${S.round}</b></span></div>
    <div class="row"><button class="btn big" data-act="again">Đánh lại</button><button class="btn ghost" data-act="setup">Chọn văn minh khác</button></div></div>`);
}
function rulesModal() {
  modal(`<h2>Luật chơi</h2>
  <p>Mỗi người cầm bộ bài riêng của văn minh mình. Mỗi lượt <b>rút 1 lá rồi đánh 1 lá</b>; hết bài trên tay thì rút 2. Lá bài làm theo các ký hiệu in trên nó, từ trái sang phải. Ai còn máu cuối cùng thì thắng.</p>
  <div class="legend">${SYM_ORDER.split('').map(ch => `<div>${symBadge(ch, 26)}<b>${esc(SYM[ch].name)}</b><span>${esc(SYM[ch].desc)}</span></div>`).join('')}</div>
  <p><b>Tường</b> đỡ đòn trước khi tới máu. <b>Lá có ★</b> là lá riêng của văn minh. <b>Thời cuộc</b>: mỗi vòng một biến cố chung, biến cố vòng sau luôn nhìn thấy trước. <b>Chợ đánh thuê</b>: mỗi lượt được thuê 1 lá bằng vàng, lá đó vào tay và từ đó thuộc bộ bài của bạn. <b>Thánh tích</b>: chọn 1 trong 3 lúc vào trận.</p>
  <p><b>Kỳ quan</b> (Angkor Wat, Chichén Itzá): còn đứng tới đầu lượt thứ ba sau khi xây thì thắng ngay, nên cả bàn phải xúm vào phá. Khi còn 3 máu trở xuống lần đầu, bạn rút thêm 2 lá. Từ vòng 16, mỗi vòng mọi người mất 1 máu.</p>
  <p class="muted small">Máu khởi đầu của từng văn minh được chỉnh bằng hàng chục nghìn ván máy đấu máy: tay đôi mỗi văn minh thắng 41–59%, bàn 4 người 17–30%.</p>
  <div class="row"><button class="btn" data-act="close">Đóng</button></div>`);
}
/* wiring */
document.addEventListener('click', e => {
  const t = e.target.closest('button, .card, .seat'); if (!t) return;
  SFX.init();
  if (t.dataset.n) { UI.n = +t.dataset.n; SFX.play('click'); renderSetup(); return; }
  if (t.dataset.civ) { UI.civ = t.dataset.civ; SFX.play('click'); renderSetup(); return; }
  if (t.id === 'randCiv') { UI.civ = CIV_ORDER[Math.floor(Math.random() * CIV_ORDER.length)]; renderSetup(); return; }
  if (t.id === 'go') { newMatch(); return; }
  if (t.dataset.relic) { beginPlay(t.dataset.relic); return; }
  if (t.id === 'cancelTarget') { UI.targeting = null; renderGame(); return; }
  if (t.id === 'rulesBtn') { rulesModal(); return; }
  if (t.id === 'soundBtn') { SFX.on = !SFX.on; prefs.sound = SFX.on; savePrefs(); t.textContent = SFX.on ? 'Âm thanh: bật' : 'Âm thanh: tắt'; return; }
  if (t.id === 'newBtn') { if (S && S.winner == null && S.started && !$('#modal .end')) { modal('<h2>Bỏ ván đang chơi?</h2><p>Ván này sẽ không được tính.</p><div class="row"><button class="btn" data-act="setup">Bỏ ván, chọn lại</button><button class="btn ghost" data-act="close">Chơi tiếp</button></div>'); return; } closeModal(); S = null; showScreen('setup'); renderSetup(); return; }
  if (t.dataset.act === 'close') { closeModal(); return; }
  if (t.dataset.act === 'again') { closeModal(); newMatch(); return; }
  if (t.dataset.act === 'setup') { closeModal(); S = null; showScreen('setup'); renderSetup(); return; }
  if (t.classList.contains('seat') && t.classList.contains('targetable') && UI.targeting) { doPlay(UI.targeting, +t.dataset.pid); return; }
  if (t.classList.contains('card') && t.closest('#hand') && t.classList.contains('playable')) { handPlay(+t.dataset.uid); return; }
  if (t.classList.contains('card') && t.closest('#market') && t.classList.contains('buyable')) { doBuy(+t.dataset.mi); return; }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (UI.targeting) { UI.targeting = null; renderGame(); } else if (!$('#modal .relics') && !$('#modal .end')) closeModal(); } });
$('#soundBtn').textContent = SFX.on ? 'Âm thanh: bật' : 'Âm thanh: tắt';
renderSetup();
