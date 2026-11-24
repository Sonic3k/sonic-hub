/* ── Lantern Line: the rules ──
   Dots and boxes. One plain script, no DOM: the game page, every bot's worker and the arena under node all run this
   same file, so there is one set of rules. Everything declared here is there for a bot to use (docs/BOT_BRIEF.md).

   A square of dots, 6 × 6 (25 squares) or 8 × 8 (49 squares). The two sides, Red and Gold, take turns to draw one
   line between two dots next to each other, across or down. Whoever draws the fourth side of a square takes it, and
   must draw again; a line that takes nothing hands the turn over. When every line is drawn every square is taken,
   and whoever took more wins. Red draws first. Taking is never compulsory, and nobody ever passes. */
const RED = 0, GOLD = 1, SIDE = ['Red', 'Gold'];
const SIZES = [5, 7];                                         // squares to a row: the two boards the game is played on
const COLS = 'abcdefgh';                                      // dots are named by column letter and row number: a1 is the top left dot
const UNDO = 2;                                               // numbers kept for each move made, to take it back

/* A board of n × n squares has (n + 1) × (n + 1) dots. A dot is the number  x + (n + 1) × y, counted from the top left.
   A line (a move) is a number too:
     across, from dot (x, y) to (x + 1, y)    x + n × y                     0 … n(n + 1) − 1
     down,   from dot (x, y) to (x, y + 1)    n(n + 1) + x + (n + 1) × y    n(n + 1) … 2n(n + 1) − 1
   A square is  x + n × y, named by its top left dot: square a1 has the dots a1, b1, a2 and b2 at its corners. */
const GEO = {};
/** What a board of n × n squares looks like, worked out once for each size:
 *    n, dots (to a row: n + 1), across (how many lines run across: n(n + 1)), lines, squares
 *    lineSq[2m], lineSq[2m + 1]   the squares on either side of line m (above and below it, or left and right); −1 off the board
 *    sqLine[4s … 4s + 3]          the four sides of square s: top, right, bottom, left
 *    lineDot[2m], lineDot[2m + 1] the two dots line m joins, top or left one first */
function geometry(n) {
  if (!SIZES.includes(n)) throw new Error('the game is played on ' + SIZES.map(k => k + ' × ' + k).join(' and ') + ' squares, not ' + n);
  if (GEO[n]) return GEO[n];
  const D = n + 1, across = n * D, lines = 2 * across, squares = n * n;
  const lineSq = new Int16Array(lines * 2).fill(-1), sqLine = new Int16Array(squares * 4), lineDot = new Int16Array(lines * 2);
  for (let y = 0; y <= n; y++) for (let x = 0; x < n; x++) {
    const m = x + n * y;
    lineDot[2 * m] = x + D * y; lineDot[2 * m + 1] = x + 1 + D * y;
    if (y > 0) lineSq[2 * m] = x + n * (y - 1);
    if (y < n) lineSq[2 * m + 1] = x + n * y;
  }
  for (let y = 0; y < n; y++) for (let x = 0; x <= n; x++) {
    const m = across + x + D * y;
    lineDot[2 * m] = x + D * y; lineDot[2 * m + 1] = x + D * (y + 1);
    if (x > 0) lineSq[2 * m] = x - 1 + n * y;
    if (x < n) lineSq[2 * m + 1] = x + n * y;
  }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const s = x + n * y;
    sqLine[4 * s] = x + n * y; sqLine[4 * s + 1] = across + x + 1 + D * y; sqLine[4 * s + 2] = x + n * (y + 1); sqLine[4 * s + 3] = across + x + D * y;
  }
  return (GEO[n] = { n, dots: D, across, lines, squares, lineSq, sqLine, lineDot });
}

/* keys for telling positions apart quickly (a bot may remember positions it has already searched): one pair a line,
   and one for Gold to move */
const MAX_LINES = 2 * 7 * 8;
const ZL = new Int32Array(MAX_LINES + 1), ZH = new Int32Array(MAX_LINES + 1);
(() => {
  let s = 0x2545F491;
  const r = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return (t ^ (t >>> 14)) | 0; };
  for (let i = 0; i <= MAX_LINES; i++) { ZL[i] = r(); ZH[i] = r(); }
})();
const Z_GOLD = MAX_LINES;

/** A new game on a board of n × n squares: 5 or 7. Red is to draw.
 *    S.line[m]    1 where line m is drawn, 0 where it is not
 *    S.sides[s]   how many of square s's four sides are drawn
 *    S.owner[s]   who took square s: RED, GOLD, or −1
 *    S.score      squares taken, [Red, Gold];   S.turn: whose move it is;   S.left: lines still to draw
 *    S.history    every line drawn, in order;   S.over: null while the game is on */
function newGame(n = SIZES[0]) {
  const g = geometry(n);
  return { n, g, line: new Uint8Array(g.lines), sides: new Uint8Array(g.squares), owner: new Int8Array(g.squares).fill(-1),
    score: [0, 0], turn: RED, left: g.lines, hl: 0, hh: 0, undo: new Int32Array(UNDO * g.lines), sp: 0, history: [], over: null };
}

/** Every move the side to play may make (every line not yet drawn), written into out from index off; returns how many. */
function gen(S, out, off = 0) {
  const L = S.line; let k = off;
  for (let m = 0; m < L.length; m++) if (!L[m]) out[k++] = m;
  return k - off;
}

/** Draws line m for the side to play without asking whether it may. Returns how many squares it took (0, 1 or 2):
 *  when it took any, the same side is to move again; when it took none, the turn has passed. Undone by unmake. */
function make(S, m) {
  const side = S.turn, LS = S.g.lineSq, a = LS[2 * m], b = LS[2 * m + 1];
  let got = 0;
  S.line[m] = 1; S.left--;
  if (a >= 0 && ++S.sides[a] === 4) { S.owner[a] = side; got++; }
  if (b >= 0 && ++S.sides[b] === 4) { S.owner[b] = side; got++; }
  S.score[side] += got;
  S.undo[S.sp] = m; S.undo[S.sp + 1] = side; S.sp += UNDO;
  S.hl ^= ZL[m]; S.hh ^= ZH[m];
  if (!got) { S.turn = 1 - side; S.hl ^= ZL[Z_GOLD]; S.hh ^= ZH[Z_GOLD]; }
  return got;
}
/** Takes the last make back. Returns the line it undrew. */
function unmake(S) {
  S.sp -= UNDO;
  const m = S.undo[S.sp], side = S.undo[S.sp + 1], LS = S.g.lineSq, a = LS[2 * m], b = LS[2 * m + 1];
  if (S.turn !== side) { S.turn = side; S.hl ^= ZL[Z_GOLD]; S.hh ^= ZH[Z_GOLD]; }
  if (a >= 0) { if (S.sides[a] === 4) { S.owner[a] = -1; S.score[side]--; } S.sides[a]--; }
  if (b >= 0) { if (S.sides[b] === 4) { S.owner[b] = -1; S.score[side]--; } S.sides[b]--; }
  S.line[m] = 0; S.left++;
  S.hl ^= ZL[m]; S.hh ^= ZH[m];
  return m;
}

/** The move made just before this position, or −1 when make has made none. */
const lastMove = S => (S.sp ? S.undo[S.sp - UNDO] : -1);
/** A position's key in two halves: the lines drawn and whose move it is. (Not the score: what is still to be won
 *  from a position does not depend on who took the squares already taken.) */
const keyLo = S => S.hl, keyHi = S => S.hh;

const legalMoves = S => { if (S.over) return []; const out = []; gen(S, out); return out; };
const isLegal = (S, m) => !S.over && Number.isInteger(m) && m >= 0 && m < S.line.length && !S.line[m];
/** How many squares line m would take for the side to play: those of its squares that already have three sides. */
function takes(S, m) { const LS = S.g.lineSq, a = LS[2 * m], b = LS[2 * m + 1]; return (a >= 0 && S.sides[a] === 3 ? 1 : 0) + (b >= 0 && S.sides[b] === 3 ? 1 : 0); }
/** Is line m safe: does neither square beside it have two sides drawn already? A safe line takes nothing and leaves
 *  no square with three sides for the other side to take. */
function isSafe(S, m) { const LS = S.g.lineSq, a = LS[2 * m], b = LS[2 * m + 1]; return (a < 0 || S.sides[a] < 2) && (b < 0 || S.sides[b] < 2); }

/* ── names ── */
const dotName = (d, n) => COLS[d % (n + 1)] + (((d / (n + 1)) | 0) + 1);
/** a line's name: its two dots, top or left one first ('a1-b1' across, 'a1-a2' down) */
const lineName = (m, n) => { const g = geometry(n); return dotName(g.lineDot[2 * m], n) + '-' + dotName(g.lineDot[2 * m + 1], n); };
/** a square's name: its top left dot */
const squareName = (s, n) => COLS[s % n] + (((s / n) | 0) + 1);
function dotAt(name, n) {
  const hit = /^([a-h])([1-8])$/.exec(String(name)); if (!hit) return -1;
  const x = COLS.indexOf(hit[1]), y = +hit[2] - 1;
  return x <= n && y <= n ? x + (n + 1) * y : -1;
}
/** The line between two dots named in either order ('b1-a1' is 'a1-b1'), or −1 when they are not next to each other. */
function lineAt(name, n) {
  const parts = String(name).split('-'); if (parts.length !== 2) return -1;
  let a = dotAt(parts[0], n), b = dotAt(parts[1], n); if (a < 0 || b < 0) return -1;
  if (a > b) { const t = a; a = b; b = t; }
  const D = n + 1, x = a % D, y = (a / D) | 0;
  if (b === a + 1 && x < n) return x + n * y;
  if (b === a + D) return n * D + x + D * y;
  return -1;
}
function squareAt(name, n) {
  const hit = /^([a-h])([1-8])$/.exec(String(name)); if (!hit) return -1;
  const x = COLS.indexOf(hit[1]), y = +hit[2] - 1;
  return x < n && y < n ? x + n * y : -1;
}

/** What a move is going to do, worked out before it is made: for the hints on the board and for showing it happen.
 *    side: who draws.  across: the line runs across (otherwise down).  from, to: its two dots, top or left first.
 *    took: the squares it takes.  again: the same side moves again (it took something and lines are left).
 *    gives: the squares it leaves with three sides when the turn passes: the other side may take them. */
function describe(S, m) {
  const g = S.g, LS = g.lineSq, side = S.turn, took = [], gives = [];
  for (const s of [LS[2 * m], LS[2 * m + 1]]) {
    if (s < 0) continue;
    if (S.sides[s] === 3) took.push(s); else if (S.sides[s] === 2) gives.push(s);
  }
  return { m, side, across: m < g.across, from: g.lineDot[2 * m], to: g.lineDot[2 * m + 1], took, again: took.length > 0 && S.left > 1, gives: took.length ? [] : gives };
}

/** Plays a move in a game. Returns what happened (see describe), or null if the move is not allowed. */
function playMove(S, m) {
  if (!isLegal(S, m)) return null;
  const ev = describe(S, m);
  make(S, m); S.history.push(m);
  if (!S.left) S.over = { winner: S.score[RED] > S.score[GOLD] ? RED : S.score[GOLD] > S.score[RED] ? GOLD : -1, score: S.score.slice() };
  ev.over = S.over;
  return ev;
}
function undoMove(S) {
  if (!S.history.length) return null;
  S.history.pop(); S.over = null;
  return unmake(S);
}
/** A game played again from its board size and its list of moves; null if the size is not one of the game's or a
 *  move is not allowed. */
function replay(n, moves) {
  if (!SIZES.includes(n) || !Array.isArray(moves)) return null;
  const S = newGame(n);
  for (const m of moves) if (!playMove(S, m)) return null;
  return S;
}
