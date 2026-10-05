/* ── Flow: setup → relic → turns → end ── */
let S = null;
const UI = { n: 2, civ: 'daiviet', targeting: null, busy: false, last: null, round: 1 };
const STORE = 'civclash.v2';
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
  $('#setup').innerHTML = `<div class="hero"><h1>Medieval Mayhem</h1><p>Every civilization fights with its own deck. Draw 1, play 1: the last realm standing wins.</p></div>
  <div class="setup-grid">
    <div class="pick">
      <div class="seg"><span>Players</span>${[2, 3, 4].map(n => `<button class="${UI.n === n ? 'on' : ''}" data-n="${n}">${n === 2 ? 'Duel' : n + ' players'}</button>`).join('')}</div>
      ${GROUPS.map(g => `<div class="grp"><h4>${esc(g)}</h4><div class="tiles">${CIV_ORDER.filter(c => CIVS[c].group === g).map(c => `<button class="tile${c === UI.civ ? ' on' : ''}" data-civ="${c}" style="--civ:${CIVS[c].color}" title="${esc(CIVS[c].style)}">${crest(c, 30)}<span>${esc(CIVS[c].name)}</span><em>${hp(c)} HP</em></button>`).join('')}</div></div>`).join('')}
    </div>
    <div class="detail" style="--civ:${C.color}">
      <div class="d-head">${crest(UI.civ, 64)}<div><h2>${esc(C.name)}</h2><p>${esc(C.style)}</p><p class="d-hp">Starting <b class="kw k-hp">${hp(UI.civ)} HP</b> ${UI.n === 2 ? 'in a duel' : 'at a 3–4 player table'}${rec ? ` · won ${rec[0]} of ${rec[1]}` : ''}</p></div></div>
      <h4>Signature cards</h4><div class="d-uniques">${uniques.map(u => cardHTML(u, { small: 1 })).join('')}</div>
      <h4>Imperial Age</h4><p class="d-bonus">${kw(IMPERIAL[UI.civ].bonus.text)}</p><div class="d-uniques">${IMPERIAL[UI.civ].cards.map(d => cardHTML({ uid: 0, name: d.name, icons: d.icons, text: d.text, civ: UI.civ, imperial: true, steps: [] }, { small: 1 })).join('')}</div>
      <h4>The 24-card deck</h4><div class="d-mix">${deckMix(UI.civ).map(([ch, k]) => `<span title="${esc(SYM[ch].name)}: ${esc(SYM[ch].desc)}">${symBadge(ch, 22)}<b>×${k}</b></span>`).join('')}</div>
      <p class="d-opp">Opponents: ${UI.n - 1} random civilization${UI.n > 2 ? 's' : ''} played by the computer</p>
      <div class="d-actions"><button class="btn big" id="go">To battle</button><button class="btn ghost" id="randCiv">Random civ</button></div>
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
  modal(`<h2>Choose a relic</h2><p class="muted">Your relic stays with you all game. Three are drawn at random each match.</p><div class="relics">${P.relicOffer.map(id => `<button class="relic" data-relic="${id}"><b>${esc(RELICS[id].name)}</b><span>${kw(RELICS[id].text)}</span></button>`).join('')}</div>
    <p class="muted small">Opponents: ${S.players.slice(1).map(o => `${esc(CIVS[o.civ].name)} (${esc(RELICS[o.relic].name)})`).join(', ')}</p>`);
}
function beginPlay(relic) {
  chooseRelic(S, 0, relic); closeModal(); startGame(S); renderGame();
  banner('Round 1', 'You go first; every opponent starts with 1 extra card'); SFX.play('turn');
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
  if (buy(S, 0, i)) { SFX.play('coin'); renderGame(); floatText(0, 'Hired ' + card.name, 'gold', 0); }
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
  let roundBanner = false;
  if (S.round !== UI.round) { UI.round = S.round; const E = EVENT_BY[S.event]; banner(`Round ${S.round}: ${E.name}`, E.text); roundBanner = true; }
  if (S.turn === 0) {
    UI.busy = false; renderGame(); SFX.play('turn');
    const me = S.players[0];
    if (me.ageGiven && !me.aged && me.turns === RULES.ageTurn) setTimeout(() => banner('The Imperial Age', 'Play the Imperial Age card when you are ready'), roundBanner ? 1500 : 0);
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
  if (a.kind === 'buy') { const card = S.market[a.idx]; if (buy(S, pid, a.idx)) { SFX.play('coin'); renderGame(); floatText(pid, 'Hired ' + card.name, 'gold', 0); setTimeout(aiStep, wait); return; } }
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
  const reason = S.wonderWin ? 'wonder completed' : S.timeUp ? '40 rounds passed, most HP wins' : 'last realm standing';
  modal(`<div class="end ${win ? 'win' : 'lose'}">${W ? crest(W.civ, 76) : crest(me.civ, 76)}
    <h2>${win ? 'Victory!' : me.alive ? 'Defeat' : 'You were defeated'}</h2>
    <p>${W ? `${W.id === 0 ? 'You win' : esc(CIVS[W.civ].name) + ' win'} · ${reason}` : `Still standing: ${S.players.filter(p => p.alive).map(p => esc(CIVS[p.civ].name)).join(', ')}`}</p>
    <div class="stats"><span>Damage dealt <b>${me.stats.dmg}</b></span><span>Cards played <b>${me.stats.played}</b></span><span>Mercenaries hired <b>${me.stats.bought}</b></span><span>Rounds <b>${S.round}</b></span></div>
    <div class="row"><button class="btn big" data-act="again">Play again</button><button class="btn ghost" data-act="setup">Choose another civ</button></div></div>`);
}
function rulesModal() {
  modal(`<h2>How to play</h2>
  <p>Each player holds their own civilization's deck. On your turn <b>draw 1 card, then play 1 card</b>; with an empty hand you draw 2. A card does what its symbols say, left to right. The last player with HP left wins.</p>
  <p class="legend-key">Card texts colour their keywords: <b class="kw k-dmg">damage</b> · <b class="kw k-hp">HP</b> · <b class="kw k-gold">gold</b> · <b class="kw k-card">cards</b> · <b class="kw k-wall">walls</b> · <b class="kw k-play">play another card</b> · <b class="kw k-aoe">every opponent</b> · <b class="kw k-pierce">over the walls</b> · <b class="kw k-steal">steal</b> · <b class="kw k-raze">destroy</b></p>
  <div class="legend">${SYM_ORDER.split('').map(ch => `<div>${symBadge(ch, 26)}<b>${esc(SYM[ch].name)}</b><span>${kw(SYM[ch].desc)}</span></div>`).join('')}</div>
  <p><b>Walls</b> soak up damage before it reaches your HP. <b>Cards with ★</b> are a civilization's signature cards. <b>Events</b>: one hits everyone each round, and the next one is always shown in advance. <b>Mercenary Market</b>: hire 1 card per turn with gold; it goes to your hand and joins your deck. <b>Relics</b>: pick 1 of 3 when the match starts.</p>
  <p><b>Imperial Age</b>: at the start of your ${RULES.ageTurn}th turn an Imperial Age card arrives in your hand. Playing it costs your play for that turn, but no gold: your civilization's three Imperial cards join your deck and its age-up bonus happens at once (some civs get gold, cards, an attack, or a card straight to hand). Nobody can steal or discard it.</p>
  <p><b>Wonders</b> (Angkor Wat, Chichén Itzá) win the game if they still stand at the start of their builder's third turn, so the whole table has to pile on. The first time you fall to 3 HP or less you draw 2 extra cards. From round 16 everyone loses 1 HP each round.</p>
  <p class="muted small">Each civilization's starting HP is tuned with hundreds of thousands of AI-vs-AI games, separately for duels and for 3–4 player tables: every civ wins roughly 46–54% of duels and close to its fair share at bigger tables.</p>
  <div class="row"><button class="btn" data-act="close">Close</button></div>`);
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
  if (t.id === 'soundBtn') { SFX.on = !SFX.on; prefs.sound = SFX.on; savePrefs(); t.textContent = SFX.on ? 'Sound: on' : 'Sound: off'; return; }
  if (t.id === 'newBtn') { if (S && S.winner == null && S.started && !$('#modal .end')) { modal('<h2>Abandon this game?</h2><p>It will not count.</p><div class="row"><button class="btn" data-act="setup">Abandon and choose again</button><button class="btn ghost" data-act="close">Keep playing</button></div>'); return; } closeModal(); S = null; showScreen('setup'); renderSetup(); return; }
  if (t.dataset.act === 'close') { closeModal(); return; }
  if (t.dataset.act === 'again') { closeModal(); newMatch(); return; }
  if (t.dataset.act === 'setup') { closeModal(); S = null; showScreen('setup'); renderSetup(); return; }
  if (t.classList.contains('seat') && t.classList.contains('targetable') && UI.targeting) { doPlay(UI.targeting, +t.dataset.pid); return; }
  if (t.classList.contains('card') && t.closest('#hand') && t.classList.contains('playable')) { handPlay(+t.dataset.uid); return; }
  if (t.classList.contains('card') && t.closest('#market') && t.classList.contains('buyable')) { doBuy(+t.dataset.mi); return; }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (UI.targeting) { UI.targeting = null; renderGame(); } else if (!$('#modal .relics') && !$('#modal .end')) closeModal(); } });
$('#soundBtn').textContent = SFX.on ? 'Sound: on' : 'Sound: off';
renderSetup();
