/* ── Wax & Wane: the rules ──
   The rules of Othello as one plain script, no DOM: the game page, every bot's worker and the arena under node all
   run this same file, so there is one set of rules. Everything declared here is there for a bot to use
   (docs/BOT_BRIEF.md lists it).

   An 8 × 8 board, and discs that are dark on one face and light on the other. The game starts with two discs of each
   side on the four middle squares, and Dark moves first. A move puts one disc on an empty square so that, in at
   least one straight line from it (along a row, a column or a diagonal), one or more of the other side's discs stand
   in an unbroken run with one of the mover's own discs at the far end. Every disc enclosed like that, in every
   direction, is turned over; nothing else is. A side that cannot move like this passes, and may not pass otherwise.
   When neither side can move the game is over, and the side with more discs showing its face has won. */
const DARK = 0, LIGHT = 1, SIDE = ['Dark', 'Light'];
const EMPTY = 0;                                              // a square holds 0, or a disc: 1 for Dark's face up, 2 for Light's (the side + 1)
const PASS_MOVE = 64;                                         // a move is the square a disc is put on, 0 … 63, or this

/* squares are written the way Othello is written down: files a … h from left to right, ranks 1 … 8 from the top */
const sqName = s => (s === PASS_MOVE ? 'pass' : 'abcdefgh'[s & 7] + ((s >> 3) + 1));
const sqOf = name => 'abcdefgh'.indexOf(name[0]) + 8 * (+name[1] - 1);

/** DIR[d]: what one step in direction d adds to a square's number (0 up-left, 1 up, 2 up-right, 3 left, 4 right,
 *  5 down-left, 6 down, 7 down-right). RUN[s * 8 + d]: how many squares lie beyond s that way before the edge. */
const DIR = new Int8Array([-9, -8, -7, -1, 1, 7, 8, 9]);
const RUN = new Int8Array(512);
for (let s = 0; s < 64; s++) {
  const up = s >> 3, down = 7 - up, left = s & 7, right = 7 - left;
  RUN.set([Math.min(up, left), up, Math.min(up, right), left, right, Math.min(down, left), down, Math.min(down, right)], s * 8);
}

/* keys for telling positions apart quickly (a bot remembers positions it has already searched): ZL / ZH by
   square × 3 + disc, ZFL / ZFH for a disc on a square being turned over, ZTL / ZTH for whose move it is */
const ZL = new Int32Array(192), ZH = new Int32Array(192), ZFL = new Int32Array(64), ZFH = new Int32Array(64), ZT = new Int32Array(2);
(() => {
  let s = 0x9E3779B9;
  const r = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return (t ^ (t >>> 14)) | 0; };
  for (let i = 0; i < 192; i++) { ZL[i] = r(); ZH[i] = r(); }
  for (let q = 0; q < 64; q++) { ZFL[q] = ZL[q * 3 + 1] ^ ZL[q * 3 + 2]; ZFH[q] = ZH[q * 3 + 1] ^ ZH[q * 3 + 2]; }
  ZT[0] = r(); ZT[1] = r();
})();

/** A position from 64 numbers (a1 first, row by row): 0 empty, 1 a Dark disc, 2 a Light disc. */
function position(squares, turn = DARK) {
  const S = { b: Int8Array.from(squares), turn, count: [0, 0], empties: 0, hl: turn ? ZT[0] : 0, hh: turn ? ZT[1] : 0, undo: new Int8Array(2048), sp: 0, history: [], over: null };
  for (let s = 0; s < 64; s++) {
    const p = S.b[s];
    if (!p) { S.empties++; continue; }
    S.count[p - 1]++; S.hl ^= ZL[s * 3 + p]; S.hh ^= ZH[s * 3 + p];
  }
  settle(S);
  return S;
}
function newGame() {
  const b = new Int8Array(64);
  b[27] = b[36] = LIGHT + 1;                                  // d4, e5
  b[28] = b[35] = DARK + 1;                                   // e4, d5
  return position(b);
}

/** Would a disc of `side`, put on the empty square s of board b, turn anything over? */
function encloses(b, s, side) {
  const me = side + 1, foe = 2 - side;
  for (let d = 0; d < 8; d++) {
    const run = RUN[s * 8 + d];
    if (run < 2) continue;
    const step = DIR[d]; let t = s + step;
    if (b[t] !== foe) continue;
    let k = 1; t += step;
    while (k < run && b[t] === foe) { k++; t += step; }
    if (k < run && b[t] === me) return true;
  }
  return false;
}
/** Has `side` a square to put a disc on? */
function canMove(S, side) {
  const b = S.b;
  for (let s = 0; s < 64; s++) if (!b[s] && encloses(b, s, side)) return true;
  return false;
}
/** How many discs the side to play would turn over by putting one on the empty square s. */
function countFlips(S, s) {
  const b = S.b, me = S.turn + 1, foe = 3 - me; let n = 0;
  for (let d = 0; d < 8; d++) {
    const run = RUN[s * 8 + d];
    if (run < 2) continue;
    const step = DIR[d]; let t = s + step, k = 0;
    while (k < run && b[t] === foe) { k++; t += step; }
    if (k && k < run && b[t] === me) n += k;
  }
  return n;
}
/** The discs the side to play would turn over by putting one on the empty square s: their squares are written into
 *  out from index off, line by line and the nearest first. Returns how many. */
function flipsInto(S, s, out, off = 0) {
  const b = S.b, me = S.turn + 1, foe = 3 - me; let n = off;
  for (let d = 0; d < 8; d++) {
    const run = RUN[s * 8 + d];
    if (run < 2) continue;
    const step = DIR[d]; let t = s + step, k = 0;
    while (k < run && b[t] === foe) { k++; t += step; }
    if (k && k < run && b[t] === me) for (let i = 1; i <= k; i++) out[n++] = s + i * step;
  }
  return n - off;
}

/** Every move the side to play may make, written into out from index off; returns how many. A side with nowhere to
 *  put a disc has one move, the pass, as long as the other side can still move. When neither can, there are none:
 *  the game is over. */
function gen(S, out, off = 0) {
  const b = S.b, side = S.turn; let n = off;
  for (let s = 0; s < 64; s++) if (!b[s] && encloses(b, s, side)) out[n++] = s;
  if (n === off && canMove(S, 1 - side)) out[n++] = PASS_MOVE;
  return n - off;
}

/** Plays a move without asking whether it is allowed. Returns how many discs were turned over. Undone by unmake. */
function make(S, m) {
  if (S.sp + 24 > S.undo.length) { const grown = new Int8Array(S.undo.length * 2); grown.set(S.undo); S.undo = grown; }
  const u = S.undo, side = S.turn; let n = S.sp, k = 0;
  if (m !== PASS_MOVE) {
    const b = S.b, me = side + 1, foe = 3 - me;
    for (let d = 0; d < 8; d++) {
      const run = RUN[m * 8 + d];
      if (run < 2) continue;
      const step = DIR[d]; let t = m + step, j = 0;
      while (j < run && b[t] === foe) { j++; t += step; }
      if (j && j < run && b[t] === me) for (t -= step; t !== m; t -= step) { b[t] = me; u[n++] = t; S.hl ^= ZFL[t]; S.hh ^= ZFH[t]; }
    }
    k = n - S.sp;
    b[m] = me; S.hl ^= ZL[m * 3 + me]; S.hh ^= ZH[m * 3 + me];
    S.count[side] += k + 1; S.count[1 - side] -= k; S.empties--;
  }
  u[n++] = k; u[n++] = m; S.sp = n;
  S.turn = 1 - side; S.hl ^= ZT[0]; S.hh ^= ZT[1];
  return k;
}

function unmake(S) {
  const u = S.undo; let n = S.sp;
  const m = u[--n], k = u[--n], side = 1 - S.turn;
  S.turn = side; S.hl ^= ZT[0]; S.hh ^= ZT[1];
  if (m !== PASS_MOVE) {
    const b = S.b, me = side + 1, foe = 3 - me;
    for (let i = 0; i < k; i++) { const t = u[--n]; b[t] = foe; S.hl ^= ZFL[t]; S.hh ^= ZFH[t]; }
    b[m] = EMPTY; S.hl ^= ZL[m * 3 + me]; S.hh ^= ZH[m * 3 + me];
    S.count[side] -= k + 1; S.count[1 - side] += k; S.empties++;
  }
  S.sp = n;
  return m;
}

/** The move played just before this position, or −1 where make has played none. */
const lastMove = S => (S.sp ? S.undo[S.sp - 1] : -1);
/** A position's key in two halves: the discs and whose move it is. */
const keyLo = S => S.hl, keyHi = S => S.hh;

const legalMoves = S => { if (S.over) return []; const out = []; gen(S, out); return out; };
const isLegal = (S, m) => legalMoves(S).includes(m);
/** The squares of the discs a move would turn over, line by line and the nearest first. */
const flipsOf = (S, m) => { const out = []; if (m !== PASS_MOVE && !S.b[m]) flipsInto(S, m, out); return out; };

/** Marks the game as over when neither side can move, and says who has won. */
function settle(S) {
  if (canMove(S, S.turn) || canMove(S, 1 - S.turn)) { S.over = null; return; }
  const dark = S.count[DARK], light = S.count[LIGHT];
  S.over = { winner: dark > light ? DARK : light > dark ? LIGHT : -1, loser: dark > light ? LIGHT : light > dark ? DARK : -1, discs: [dark, light],
    why: !S.empties ? 'full' : !dark || !light ? 'swept' : 'blocked' };
}

/** What a move is going to do, worked out before it is played: for the hints on the board and for showing it happen.
 *  side: who plays it. to: the square (−1 for a pass). flips: every disc turned over. lines: the same discs, one list
 *  for each line that encloses something, the nearest disc first. */
function describe(S, m) {
  const ev = { m, side: S.turn, pass: m === PASS_MOVE, to: m === PASS_MOVE ? -1 : m, flips: [], lines: [] };
  if (ev.pass) return ev;
  const b = S.b, me = S.turn + 1, foe = 3 - me;
  for (let d = 0; d < 8; d++) {
    const run = RUN[m * 8 + d], step = DIR[d]; let t = m + step, k = 0;
    while (k < run && b[t] === foe) { k++; t += step; }
    if (!(k && k < run && b[t] === me)) continue;
    const line = [];
    for (let i = 1; i <= k; i++) line.push(m + i * step);
    ev.lines.push(line); ev.flips.push(...line);
  }
  return ev;
}

/** Plays a move in a game. Returns what happened (see describe), or null if the move is not allowed. */
function playMove(S, m) {
  if (!isLegal(S, m)) return null;
  const ev = describe(S, m);
  make(S, m); S.history.push(m);
  settle(S);
  ev.count = S.count.slice(); ev.over = S.over;
  return ev;
}
function undoMove(S) {
  if (!S.history.length) return null;
  S.history.pop(); S.over = null;
  return unmake(S);
}
/** A game played again from its list of moves; null if one of them is not allowed. */
function replay(moves) {
  const S = newGame();
  if (!Array.isArray(moves)) return null;
  for (const m of moves) if (!Number.isInteger(m) || !playMove(S, m)) return null;
  return S;
}
