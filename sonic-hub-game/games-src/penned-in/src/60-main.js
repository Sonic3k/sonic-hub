/* ── The game on the page: setup, turns, the computer, undo, what is kept between visits ── */
const STORE = 'penned-in.v1';
const MIN_THINK = 430;   // the computer never answers faster than a hand could

/** cfg.level is one of LEVELS, or 'friend' for two people at one screen; cfg.side is the mark the person writes against the computer */
const G = { screen: 'setup', cfg: { level: 'medium', size: 11, side: X }, S: null, token: 0, busy: false, aim: null };

const vsComputer = () => G.cfg.level !== 'friend';
const computerToMove = () => vsComputer() && !G.S.over && G.S.turn !== G.cfg.side;
const canWrite = () => G.screen === 'play' && !G.busy && !G.S.over && !computerToMove();
const canUndo = () => G.screen === 'play' && !G.busy && G.S.history.some(m => !vsComputer() || m.side === G.cfg.side);

function save() {
  try {
    const S = G.S, game = G.screen === 'play' && S && !S.over && S.history.length ? { n: S.n, cells: S.history.map(m => m.to) } : null;
    localStorage.setItem(STORE, JSON.stringify({ cfg: G.cfg, sound: SFX.on, game }));
  } catch (e) { /* a browser that keeps nothing: the game still plays */ }
}
/** reads what was kept; returns a game to go on with, or null */
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (!d) return null;
    const c = d.cfg || {};
    if (LEVELS.includes(c.level) || c.level === 'friend') G.cfg.level = c.level;
    if (SIZES.includes(c.size)) G.cfg.size = c.size;
    if (c.side === X || c.side === O) G.cfg.side = c.side;
    if (d.sound === false) SFX.on = false;
    const S = d.game ? replay(d.game.n, d.game.cells) : null;
    return S && !S.over && S.history.length ? S : null;
  } catch (e) { return null; }
}

function renderSetup() {
  for (const b of document.querySelectorAll('#setup [data-opt]')) b.setAttribute('aria-checked', String(String(G.cfg[b.dataset.opt]) === b.dataset.val));
  $('#opt-side').hidden = !vsComputer();
}
function renderSound() {
  const b = $('[data-act=sound]');
  b.textContent = SFX.on ? 'Sound on' : 'Sound off'; b.setAttribute('aria-pressed', String(SFX.on));
}
function renderHud() {
  const S = G.S, vs = vsComputer(), me = G.cfg.side, live = !S.over;
  const who = side => (vs ? (side === me ? 'You' : `<span class="long">Computer · </span>${LEVEL_NAME[G.cfg.level]}`) : side === X ? 'Player 1' : 'Player 2');
  const pen = side => penHtml(side, who(side), live && S.turn === side, live && vs && S.turn === side && side !== me);
  $('#players').innerHTML = pen(X) + pen(O);
  let text, sub = '', side = S.turn;
  if (S.over) {
    side = S.over.winner;
    if (vs) { text = side === me ? 'You win!' : 'Penned in!'; sub = side === me ? 'The computer has nowhere left to write.' : 'You have nowhere left to write.'; }
    else { text = `${MARK[side]} wins!`; sub = `${MARK[1 - side]} is penned in.`; }
  } else if (!vs) text = `${MARK[side]} to move`;
  else if (side === me) { text = 'Your move'; if (S.history.length < 2) sub = `Write your ${MARK[me]} next to your last one.`; }
  else text = 'Thinking<span class="dots"></span>';
  const st = $('#status');
  st.innerHTML = text; st.className = 'status ' + (side === X ? 'x' : 'o'); $('#sub').textContent = sub;
  const undo = `<button type="button" class="label" data-act="undo"${canUndo() ? '' : ' disabled'}>Undo</button>`;
  const btns = $('#btns');
  btns.innerHTML = S.over
    ? `<button type="button" class="label red" data-act="restart">Play again</button>${undo}${vs ? '<button type="button" class="label" data-act="swap">Swap sides</button>' : ''}<button type="button" class="label" data-act="setup">Setup</button>`
    : `${undo}<button type="button" class="label" data-act="restart">Restart</button><button type="button" class="label" data-act="setup">Setup</button>`;
  btns.classList.toggle('four', btns.children.length === 4);   // four labels sit two and two
}

/** after any change to the sheet: redraw what surrounds it, and let the computer move if it is its turn */
function afterMove() {
  renderHud(); showTurn(G.S, canWrite()); $('#board').classList.toggle('mine', canWrite()); save();
  if (G.S.over) {
    circleLoser(G.S);
    SFX.play(!vsComputer() || G.S.over.winner === G.cfg.side ? 'win' : 'lose');
  } else if (computerToMove()) computerMove();
}

async function humanMove(cell) {
  if (!canWrite() || !isLegal(G.S, cell)) return;
  const token = G.token, side = G.S.turn;
  G.busy = true; playMove(G.S, cell);
  V.L.hints.replaceChildren(); V.L.ghost.replaceChildren(); $('#board').classList.remove('mine');
  await drawMark(side, cell);
  if (token !== G.token) return;
  G.busy = false; afterMove();
}

async function computerMove() {
  const token = G.token, S = G.S, side = S.turn, t0 = performance.now();
  G.busy = true;
  let move = await Brain.move(S, G.cfg.level);
  if (token !== G.token) return;
  const rest = MIN_THINK - (performance.now() - t0);
  if (rest > 0) { await sleep(rest); if (token !== G.token) return; }
  if (!isLegal(S, move)) move = legalMoves(S)[0];
  playMove(S, move);
  const now = V.L.hl.querySelector('.now'); if (now) now.remove();
  await drawMark(side, move);
  if (token !== G.token) return;
  G.busy = false; afterMove();
}

/** back to before the person's last mark (against the computer that takes its answer back too) */
function undo() {
  if (!canUndo()) return;
  G.token++;
  const S = G.S;
  for (;;) { const m = undoMove(S); if (!m) break; eraseMark(m.to); if (!vsComputer() || m.side === G.cfg.side) break; }
  V.L.over.replaceChildren(); G.busy = false; SFX.play('tick');
  afterMove();
}

async function startGame(saved) {
  const token = ++G.token;
  G.screen = 'play'; G.aim = null; G.S = saved || newGame(G.cfg.size);
  document.body.className = 'play'; $('#setup').hidden = true; $('#hud').hidden = false;
  buildBoard(G.S.n);
  const last = G.S.n * G.S.n - 1;
  if (saved) {
    putMark(X, 0); putMark(O, last);
    for (const m of saved.history) putMark(m.side, m.to);
    G.busy = false; afterMove();
    return;
  }
  G.busy = true; renderHud(); save();
  await sleep(220); if (token !== G.token) return;
  await drawMark(X, 0); if (token !== G.token) return;
  await sleep(110); if (token !== G.token) return;
  await drawMark(O, last); if (token !== G.token) return;
  G.busy = false; afterMove();
}

function toSetup() {
  G.screen = 'setup'; G.busy = false;
  document.body.className = 'setup'; $('#hud').hidden = true; $('#setup').hidden = false;
  renderSetup(); save(); demo();
}

/** While nobody is playing, the sheet plays itself: two pens, one game after another. */
async function demo() {
  const token = ++G.token;
  G.S = null;
  while (token === G.token) {
    const S = newGame(G.cfg.size);
    buildBoard(S.n);
    await sleep(380); if (token !== G.token) return;
    await drawMark(X, 0, true); if (token !== G.token) return;
    await drawMark(O, S.n * S.n - 1, true); if (token !== G.token) return;
    while (!S.over) {
      await sleep(REDUCED ? 900 : 420); if (token !== G.token) return;
      const side = S.turn, move = AI.think(S, { level: 'medium' }).move;
      playMove(S, move);
      await drawMark(side, move, true); if (token !== G.token) return;
    }
    circleLoser(S, true);
    await sleep(3000); if (token !== G.token) return;
    $('#board').classList.add('fade-out');
    await sleep(540); if (token !== G.token) return;
  }
}

function openHelp() { $('#help').hidden = false; $('[data-act=help-close]').focus(); }
function closeHelp() { $('#help').hidden = true; }

const KEYS = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], w: [-1, 0], x: [1, 0], a: [0, -1], d: [0, 1], q: [-1, -1], e: [-1, 1], z: [1, -1], c: [1, 1],
  Home: [-1, -1], PageUp: [-1, 1], End: [1, -1], PageDown: [1, 1], 7: [-1, -1], 8: [-1, 0], 9: [-1, 1], 4: [0, -1], 6: [0, 1], 1: [1, -1], 2: [1, 0], 3: [1, 1] };

function wire() {
  document.addEventListener('click', ev => {
    const opt = ev.target.closest('[data-opt]'), act = ev.target.closest('[data-act]');
    if (opt) {
      const k = opt.dataset.opt, v = opt.dataset.val;
      G.cfg[k] = k === 'level' ? v : +v;
      renderSetup(); save(); SFX.play('tick');
      if (k === 'size' && G.screen === 'setup') demo();
      return;
    }
    if (ev.target.id === 'help') return closeHelp();
    if (!act || act.disabled) return;
    switch (act.dataset.act) {
      case 'start': SFX.init(); startGame(); break;
      case 'restart': startGame(); break;
      case 'swap': G.cfg.side = 1 - G.cfg.side; startGame(); break;
      case 'setup': toSetup(); break;
      case 'undo': undo(); break;
      case 'sound': SFX.on = !SFX.on; renderSound(); save(); SFX.play('tick'); break;
      case 'help': openHelp(); break;
      case 'help-close': closeHelp(); break;
    }
  });

  const board = $('#board');
  const aimAt = ev => {
    const side = G.S.turn, cell = canWrite() ? squareAt(ev, legalMoves(G.S)) : -1;
    if (cell === G.aim.cell) return;
    G.aim.cell = cell;
    if (cell < 0) return clearGhost();
    showGhost(side, cell, G.S.head[side], ev.pointerType !== 'mouse');
    if (ev.pointerType !== 'mouse' && navigator.vibrate) navigator.vibrate(4);
  };
  board.addEventListener('pointerdown', ev => {
    if (!canWrite() || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    ev.preventDefault(); SFX.init();
    G.aim = { id: ev.pointerId, cell: -2 };
    try { board.setPointerCapture(ev.pointerId); } catch (e) { /* an older browser: the pointer simply is not held */ }
    aimAt(ev);
  });
  board.addEventListener('pointermove', ev => {
    if (G.aim) { if (ev.pointerId === G.aim.id) aimAt(ev); return; }
    if (ev.pointerType !== 'mouse' || !canWrite()) return;
    const cell = squareAt(ev, legalMoves(G.S));
    if (cell < 0) clearGhost(); else showGhost(G.S.turn, cell, G.S.head[G.S.turn], false);
  });
  board.addEventListener('pointerup', ev => {
    if (!G.aim || ev.pointerId !== G.aim.id) return;
    const cell = canWrite() ? squareAt(ev, legalMoves(G.S)) : -1;
    G.aim = null; clearGhost();
    if (cell >= 0) humanMove(cell); else if (canWrite()) nudge();
  });
  board.addEventListener('pointercancel', () => { G.aim = null; clearGhost(); });
  board.addEventListener('pointerleave', () => { if (!G.aim) clearGhost(); });

  document.addEventListener('keydown', ev => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (!$('#help').hidden) { if (ev.key === 'Escape') closeHelp(); return; }
    if (G.screen !== 'play') return;
    const key = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (key === 'u') return undo();
    const d = KEYS[key];
    if (!d || !canWrite()) return;
    ev.preventDefault();
    const h = G.S.head[G.S.turn], r = Math.floor(h / V.n) + d[0], c = (h % V.n) + d[1];
    const cell = r < 0 || c < 0 || r >= V.n || c >= V.n ? -1 : r * V.n + c;
    if (cell >= 0 && isLegal(G.S, cell)) humanMove(cell); else nudge();
  });
}

function boot() {
  // the way back to the shelf shows only where there is a shelf: under /games/ on the portal
  if (!/^\/games\//.test(location.pathname) || /claude/.test(location.hostname)) document.documentElement.classList.add('no-home');
  Brain.start(); buildHelp(); wire(); drawMat();
  window.addEventListener('resize', drawMat);
  const saved = load();
  renderSound();
  if (saved) startGame(saved); else toSetup();
}
