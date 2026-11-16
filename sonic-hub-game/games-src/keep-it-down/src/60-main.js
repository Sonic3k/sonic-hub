/* ── The game on the page: setup, turns, the computer, undo, what is kept between visits ── */
const STORE = 'keep-it-down.v1';
const MIN_THINK = 430;   // the computer never answers faster than a hand could

/** cfg.level is one of LEVELS, or 'friend' for two people at one screen; cfg.side is the side the person plays against
 *  the computer. log holds what each move of the game did (see describe), in step with S.history. */
const G = { screen: 'setup', cfg: { level: 'medium', side: LIGHT }, S: null, log: [], token: 0, busy: false, passing: false, sel: -1, drag: null, cur: -1, keys: false, note: '' };

const vsComputer = () => G.cfg.level !== 'friend';
const person = side => !vsComputer() || side === G.cfg.side;
const computerToMove = () => vsComputer() && !G.S.over && G.S.turn !== G.cfg.side;
const canPlay = () => G.screen === 'play' && !G.busy && !G.S.over && !computerToMove();
const canUndo = () => G.screen === 'play' && G.log.some(ev => person(ev.side) && ev.what !== 'pass');   // even while the computer thinks: a move can be taken straight back
const snd = name => { if (G.screen === 'play') SFX.play(name); };   // the game that plays itself on the setup screen is silent

function save() {
  try {
    const S = G.S, game = G.screen === 'play' && S && !S.over && S.history.length ? { moves: S.history } : null;
    localStorage.setItem(STORE, JSON.stringify({ cfg: G.cfg, sound: SFX.on, game }));
  } catch (e) { /* a browser that keeps nothing: the game still plays */ }
}
/** reads what was kept; returns the moves of a game to go on with, or null */
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (!d) return null;
    const c = d.cfg || {};
    if (LEVELS.includes(c.level) || c.level === 'friend') G.cfg.level = c.level;
    if (c.side === LIGHT || c.side === DARK) G.cfg.side = c.side;
    if (d.sound === false) SFX.on = false;
    const S = d.game ? replay(d.game.moves) : null;
    return S && !S.over && S.history.length ? d.game.moves : null;
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
  const name = side => (vs ? (side === me ? 'You' : `<span class="long">Computer · </span>${LEVEL_NAME[G.cfg.level]}`) : SIDE[side]);
  const took = side => G.log.filter(ev => ev.side === side && ev.victim && ev.what !== 'shove').map(ev => pieceIcon(kindOf(ev.victim), sideOf(ev.victim), 22)).join('');
  const who = side => `<div class="who${live && S.turn === side ? ' on' : ''}${live && vs && S.turn === side && side !== me ? ' busy' : ''}"><i class="hole"></i>${pieceIcon(RAM, side, 34)}<b>${name(side)}</b><span class="took">${took(side)}</span></div>`;
  $('#players').innerHTML = V.flip ? who(LIGHT) + who(DARK) : who(DARK) + who(LIGHT);   // as they sit at the board: the far side first

  let text;
  if (S.over) { const w = S.over.winner; text = w < 0 ? 'A draw' : !vs ? `${SIDE[w]} wins!` : w === me ? 'You win!' : 'Your Keeps are down'; }
  else text = G.passing ? 'No move' : !vs ? `${SIDE[S.turn]} to move` : S.turn === me ? 'Your move' : 'Thinking<span class="dots"></span>';
  $('#status').innerHTML = text; $('#sub').textContent = subLine();
  const undo = `<button type="button" class="plate" data-act="undo"${canUndo() ? '' : ' disabled'}>Undo</button>`;
  const btns = $('#btns');
  btns.innerHTML = S.over
    ? `<button type="button" class="plate ink" data-act="restart">Play again</button>${undo}${vs ? '<button type="button" class="plate" data-act="swap">Swap sides</button>' : ''}<button type="button" class="plate" data-act="setup">Setup</button>`
    : `${undo}<button type="button" class="plate" data-act="restart">Restart</button><button type="button" class="plate" data-act="setup">Setup</button>`;
  btns.classList.toggle('four', btns.children.length === 4);   // four plates sit two and two
}
/** The line under the status: how the game ended; else what was last said (see say); else what the position calls for. */
function subLine() {
  const S = G.S, vs = vsComputer();
  if (S.over) {
    const w = S.over.winner;
    if (w < 0) return { spent: 'No Rams are left on either side.', quiet: 'Sixty moves each, and nothing taken.', stuck: 'Neither side can move.' }[S.over.why];
    return !vs ? `Both of ${SIDE[1 - w]}’s Keeps are down.` : w === G.cfg.side ? 'Both of the computer’s Keeps are down.' : 'The computer wins this one.';
  }
  if (G.note) return G.note;
  const mine = person(S.turn);
  if (wokenKeeps(S).length) return !mine ? 'That was loud.' : vs ? 'Your bell is ringing: you may strike the Ram that woke it.' : 'The bell is ringing: the Keep may strike the Ram that woke it.';
  return mine && S.history.length < 2 ? 'Tap a piece, then where it should go.' : '';
}
/** says why something was not allowed, or what just happened; say('') takes it back */
function say(text) { G.note = text; if (G.screen === 'play') $('#sub').textContent = subLine(); }

function select(s) { G.sel = s; showTargets(G.S, s); snd('lift'); }
function clearSel() { G.sel = -1; clearTargets(); }

/** after any change to the board: redraw what surrounds it, and let the computer move if it is its turn */
function afterMove() {
  const S = G.S;
  clearSel(); markState(S); renderHud(); save();
  $('#board').classList.remove('point');
  showCursor(G.keys && canPlay() ? G.cur : -1);   // the keyboard stays where it was
  if (S.over) { showStrikes(S, false); snd(S.over.winner < 0 ? 'draw' : !vsComputer() || S.over.winner === G.cfg.side ? 'win' : 'lose'); return; }
  if (legalMoves(S)[0] === PASS_MOVE) return passTurn();
  showStrikes(S, canPlay());
  if (computerToMove()) computerMove();
}

/** plays move m and shows it; false if the game was left meanwhile */
async function perform(m, token, lead = 0) {
  const S = G.S, room = slack(S, describe(S, m).anvil), ev = playMove(S, m);
  G.log.push(ev); G.note = ''; ev.lead = lead;
  await showMove(ev, room);
  if (token !== G.token) return false;
  if (ev.wakes.length && !S.over) {   // a bell: let it be heard before anyone answers
    markState(S); ev.wakes.forEach(rings); snd('bell');
    await sleep(REDUCED ? 0 : 460);
    if (token !== G.token) return false;
  }
  return true;
}
async function humanMove(m, lead = 0) {
  if (!canPlay() || !isLegal(G.S, m)) return;
  const token = G.token;
  G.busy = true; G.drag = null; clearSel(); showStrikes(G.S, false); showCursor(-1); $('#board').classList.remove('point');
  if (!(await perform(m, token, lead))) return;
  G.busy = false; afterMove();
}
async function computerMove() {
  const token = G.token, S = G.S, t0 = performance.now();
  G.busy = true;
  let move = await Brain.move(S, G.cfg.level);
  if (token !== G.token) return;
  const rest = MIN_THINK - (performance.now() - t0);
  if (rest > 0) { await sleep(rest); if (token !== G.token) return; }
  if (!isLegal(S, move)) move = legalMoves(S)[0];
  if (!(await perform(move, token))) return;
  G.busy = false; afterMove();
}
/** the side to move has nothing it can do: say so, and hand the turn over */
async function passTurn() {
  const token = G.token, S = G.S;
  G.busy = true; G.passing = true;
  G.note = `${!vsComputer() ? SIDE[S.turn] + ' has' : person(S.turn) ? 'You have' : 'The computer has'} nothing to move, so the turn passes.`;
  renderHud();
  await sleep(1500);
  if (token !== G.token) return;
  G.log.push(playMove(S, PASS_MOVE)); G.busy = false; G.passing = false; G.note = '';
  afterMove();
}

/** back to before the person's last move (against the computer that takes its answer back too) */
function undo() {
  if (!canUndo()) return;
  G.token++;
  for (;;) { undoMove(G.S); const ev = G.log.pop(); if (!G.log.length || (person(ev.side) && ev.what !== 'pass')) break; }
  G.busy = false; G.passing = false; G.note = ''; G.drag = null;
  placeAll(G.S); snd('tick'); afterMove();
}

function startGame(moves) {
  G.token++;
  G.screen = 'play'; G.busy = false; G.passing = false; G.drag = null; G.cur = -1; G.note = ''; G.S = newGame(); G.log = [];
  for (const m of moves || []) G.log.push(playMove(G.S, m));
  document.body.className = 'play'; $('#setup').hidden = true; $('#hud').hidden = false;
  buildBoard(vsComputer() && G.cfg.side === DARK);
  placeAll(G.S);
  if (!moves) deal();
  afterMove();
}
/** a new game: the pieces are set down one after another */
function deal() {
  let i = 0;
  for (const el of V.L.pieces.children) el.style.setProperty('--i', i++);
  V.L.pieces.classList.add('deal'); setTimeout(() => V.L.pieces.classList.remove('deal'), 900);
}

function toSetup() {
  G.screen = 'setup'; G.busy = false; G.passing = false; G.drag = null;
  document.body.className = 'setup'; $('#hud').hidden = true; $('#setup').hidden = false;
  renderSetup(); save(); demo();
}
/** While nobody is playing, the board plays itself: one game after another. */
async function demo() {
  const token = ++G.token;
  G.S = null;
  while (token === G.token) {
    const S = newGame();
    buildBoard(false); placeAll(S); deal();
    await sleep(1300); if (token !== G.token) return;
    while (!S.over && S.history.length < 260) {
      const m = AI.think(S, { level: 'medium' }).move, room = slack(S, describe(S, m).anvil), ev = playMove(S, m);
      await showMove(ev, room); if (token !== G.token) return;
      markState(S); if (!S.over) ev.wakes.forEach(rings);
      await sleep(REDUCED ? 1200 : 560); if (token !== G.token) return;
    }
    await sleep(2600); if (token !== G.token) return;
    $('#board').classList.add('fade-out');
    await sleep(540); if (token !== G.token) return;
  }
}

function openHelp() { $('#help').hidden = false; $('[data-act=help-close]').focus({ preventScroll: true }); $('#help').scrollTop = 0; }   // the rules open at their top, however long they are
function closeHelp() { $('#help').hidden = true; }

/* ── a hand on the board ── */
/** why the Ram on `from` may not go to the square beside it: a line for the person, or nothing */
function whyNot(S, from, to) {
  const q = S.b[to];
  if (kindOf(S.b[from]) !== RAM || !q || sideOf(q) === S.turn) return '';
  if (kindOf(q) === RAM) return from === S.koP && to === S.koQ ? 'It has just been shoved: it can’t shove straight back.' : '';
  return kindOf(q) === GATE ? 'A Gate won’t budge. Push it where something stands behind it.' : '';   // a Keep can always be taken
}
/** why a piece of one's own has no move at all */
function whyStuck(S, s) {
  const k = kindOf(S.b[s]);
  return k === KEEP ? 'A Keep never moves. It strikes only when its bell rings.' : k === GATE ? 'Its other post is taken.' : 'There is no room for it to move.';
}
/** the square next to s in a direction on the screen, or −1 */
function beside(s, dx, dy) {
  const [c, r] = colRow(s), x = c + dx, y = r + dy;
  return x < 0 || y < 0 || x > 7 || y > 7 ? -1 : V.flip ? y * 8 + (7 - x) : (7 - y) * 8 + x;
}
/** A press on square s, by finger, mouse or key. Returns true when the piece there is now held (and may be dragged). */
function press(s) {
  const S = G.S;
  if (s < 0) { clearSel(); return false; }
  if (G.sel >= 0 && G.sel !== s) {
    const m = movesFrom(S, G.sel).find(x => mTo(x) === s);
    if (m !== undefined) { humanMove(m); return false; }
  }
  const p = S.b[s], own = p !== 0 && sideOf(p) === S.turn;
  if (!own) {
    const strike = legalMoves(S).find(x => mKind(x) === STRIKE && mTo(x) === s);   // the Ram a ringing Keep may strike
    if (strike !== undefined) { humanMove(strike); return false; }
    if (G.sel >= 0) { const why = [0, 1, 2, 3].some(d => NB[G.sel * 4 + d] === s) ? whyNot(S, G.sel, s) : ''; if (why) { say(why); nudge(G.sel); return false; } }
    clearSel(); return false;
  }
  if (!movesFrom(S, s).length) { clearSel(); say(whyStuck(S, s)); nudge(s); return false; }
  if (G.sel !== s) { say(''); select(s); }
  return true;
}
/** the move of the held piece that a drag of (dx, dy) points at, or −1 */
function aimed(S, s, dx, dy) {
  const len = Math.hypot(dx, dy), a = xy(s);
  if (len < 34) return -1;
  let best = -1, top = 0.7;
  for (const m of movesFrom(S, s)) {
    const b = xy(mTo(m)), tx = b[0] - a[0], ty = b[1] - a[1], dot = (dx * tx + dy * ty) / (len * Math.hypot(tx, ty));
    if (dot > top) { top = dot; best = m; }
  }
  return best;
}
/** a Ram follows the finger along the way it is being dragged: all the way onto an empty square, up to the piece on a taken one */
function follow(d, dx, dy) {
  const el = V.pc.get(d.s);
  if (!el || el.kind !== RAM) return;
  const horiz = Math.abs(dx) > Math.abs(dy), sx = horiz ? Math.sign(dx) : 0, sy = horiz ? 0 : Math.sign(dy), far = Math.abs(horiz ? dx : dy);
  const to = beside(d.s, sx, sy), m = to < 0 ? undefined : movesFrom(G.S, d.s).find(x => mTo(x) === to);
  const reach = m === undefined ? Math.min(far, 100) * 0.1 : Math.min(far, mKind(m) === STEP ? 100 : 28), a = xy(d.s);
  d.lead = m === undefined || m !== d.m ? 0 : reach / 100;
  setAt(el, [a[0] + sx * reach, a[1] + sy * reach]);
}
function settle(d) { const el = V.pc.get(d.s); if (el && el.kind === RAM) setAt(el, xy(d.s)); setHot(-1); }

const KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };

function wire() {
  document.addEventListener('click', ev => {
    const opt = ev.target.closest('[data-opt]'), act = ev.target.closest('[data-act]');
    if (opt) {
      const k = opt.dataset.opt, v = opt.dataset.val;
      G.cfg[k] = k === 'level' ? v : +v;
      renderSetup(); save(); SFX.play('tick');
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
  board.addEventListener('pointerdown', ev => {
    if (G.screen !== 'play' || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    SFX.init();
    if (!canPlay()) return;
    if (G.drag) { if (!ev.isPrimary) return; settle(G.drag); G.drag = null; }   // a second finger is ignored; a drag that never ended is dropped
    ev.preventDefault();
    G.cur = -1; G.keys = false; showCursor(-1);
    const s = squareAt(ev), was = G.sel === s;
    if (!press(s)) return;
    G.drag = { id: ev.pointerId, s, p0: boardPoint(ev), moved: false, was, m: -1, lead: 0 };
    try { board.setPointerCapture(ev.pointerId); } catch (e) { /* an older browser: the pointer simply is not held */ }
  });
  board.addEventListener('pointermove', ev => {
    const d = G.drag;
    if (d) {
      if (ev.pointerId !== d.id) return;
      const p = boardPoint(ev), dx = p[0] - d.p0[0], dy = p[1] - d.p0[1];
      if (!d.moved && Math.hypot(dx, dy) < 14) return;
      d.moved = true; d.m = aimed(G.S, d.s, dx, dy); setHot(d.m); follow(d, dx, dy);
      return;
    }
    if (ev.pointerType !== 'mouse' || !canPlay()) return;
    const s = squareAt(ev), S = G.S;
    let m = -1;
    if (s >= 0 && G.sel >= 0) { const f = movesFrom(S, G.sel).find(x => mTo(x) === s); if (f !== undefined) m = f; }
    setHot(m);
    const own = s >= 0 && S.b[s] !== 0 && sideOf(S.b[s]) === S.turn && movesFrom(S, s).length > 0;
    board.classList.toggle('point', m >= 0 || own || (s >= 0 && legalMoves(S).some(x => mKind(x) === STRIKE && mTo(x) === s)));
  });
  const drop = ev => {
    const d = G.drag;
    if (!d || ev.pointerId !== d.id) return;
    G.drag = null;
    if (!d.moved) { if (d.was) clearSel(); return; }          // a second tap on the piece that is held lets it go
    if (ev.type === 'pointerup' && d.m >= 0) return humanMove(d.m, d.lead);
    settle(d);
    if (ev.type !== 'pointerup') return;
    const p = boardPoint(ev), dx = p[0] - d.p0[0], dy = p[1] - d.p0[1];
    if (Math.hypot(dx, dy) < 34) return;
    const horiz = Math.abs(dx) > Math.abs(dy), to = beside(d.s, horiz ? Math.sign(dx) : 0, horiz ? 0 : Math.sign(dy)), why = to < 0 ? '' : whyNot(G.S, d.s, to);
    if (why) say(why);
    nudge(d.s);
  };
  board.addEventListener('pointerup', drop);
  board.addEventListener('pointercancel', drop);
  board.addEventListener('pointerleave', () => { if (!G.drag) { setHot(-1); board.classList.remove('point'); } });

  document.addEventListener('keydown', ev => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (!$('#help').hidden) { if (ev.key === 'Escape') closeHelp(); return; }
    if (G.screen !== 'play') return;
    const key = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key, onButton = ev.target.closest && ev.target.closest('button, a');
    if (key === 'u') return undo();
    if (!canPlay()) return;
    const S = G.S, dir = KEYS[key];
    if (dir) {
      ev.preventDefault(); G.keys = true;
      if (G.sel >= 0 && kindOf(S.b[G.sel]) === RAM) {          // a Ram that is held goes the way the arrow points
        const to = beside(G.sel, dir[0], dir[1]), m = to < 0 ? undefined : movesFrom(S, G.sel).find(x => mTo(x) === to);
        if (m !== undefined) { G.cur = to; return humanMove(m); }
        if (to >= 0) say(whyNot(S, G.sel, to));
        return nudge(G.sel);
      }
      if (G.cur < 0) G.cur = G.sel >= 0 ? G.sel : firstSquare(S); else { const to = beside(G.cur, dir[0], dir[1]); if (to >= 0) G.cur = to; }
      return showCursor(G.cur);
    }
    if (key === 'Escape') { clearSel(); return; }
    if ((key === 'Enter' || key === ' ') && !onButton) {
      ev.preventDefault(); G.keys = true;
      if (G.cur < 0) { G.cur = firstSquare(S); return showCursor(G.cur); }
      if (G.sel === G.cur) {                                   // Enter again on a Gate or a Keep that can do one thing only does it
        const moves = movesFrom(S, G.sel);
        return moves.length === 1 && kindOf(S.b[G.sel]) !== RAM ? humanMove(moves[0]) : clearSel();
      }
      press(G.cur);
    }
  });
}
/** where the keyboard starts: the mover's Ram nearest the middle of the board */
function firstSquare(S) {
  let best = -1, far = 99;
  for (let s = 0; s < 64; s++) if (S.b[s] === RAM + (S.turn << 2) && movesFrom(S, s).length) { const d = Math.abs((s & 7) - 3.4) + Math.abs((s >> 3) - 3.5); if (d < far) { far = d; best = s; } }
  return best < 0 ? 27 : best;
}

function boot() {
  // the way back to the shelf shows only where there is a shelf: under /games/ on the portal
  if (!/^\/games\//.test(location.pathname) || /claude/.test(location.hostname)) document.documentElement.classList.add('no-home');
  $('#crest').outerHTML = CREST;
  $('#crib').innerHTML = [[RAM, '<b>Ram</b> shoves. No room behind: taken.'], [GATE, '<b>Gate</b> has two posts, and takes a Ram on the other one.'], [KEEP, '<b>Keep</b> strikes a Ram that has just taken something beside it.']]
    .map(([k, t]) => `<li>${pieceIcon(k, LIGHT, 34)}<span>${t}</span></li>`).join('');
  Brain.start(); buildHelp(); wire();
  const saved = load();
  renderSound();
  if (saved) startGame(saved); else toSetup();
}
