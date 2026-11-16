/* ── Keep It Down: the rules ──
   No DOM in here: this file and 10-ai.js also run inside the worker and under node.

   An 8 × 8 board with a wall all round. Light sets up on ranks 1–3 and moves first, Dark on ranks 6–8.
     Ram   Eight a side. One square up, down, left or right. Stepping into an enemy Ram shoves it one square on;
           if it has no room to go (any piece behind it, or the wall) it is taken and the shover has its square.
           A Ram that has just been shoved may not push back at the Ram that shoved it on the very next turn.
     Gate  Two a side, one for each Keep. It stands on one of two posts, beside its Keep or in front of it, and steps
           from one to the other, taking an enemy Ram that stands there. A Ram cannot shove a Gate, but takes it the
           way it takes a Ram: by pushing when there is no room behind.
     Keep  Two a side, never moves. It cannot be shoved either, so a Ram that gets to it simply takes it: nothing
           has to stand behind. A Ram that has just taken something on a square next to a Keep has made a noise:
           on the next move, and only then, that Keep may strike it off the board. A Ram that only walked up is safe.
   Lose both Keeps and you lose. */
const LIGHT = 0, DARK = 1, SIDE = ['Light', 'Dark'];
const RAM = 1, GATE = 2, KEEP = 3;                            // a piece is its kind + 4 × its side; 0 is an empty square
const STEP = 0, PUSH = 1, SWING = 2, STRIKE = 3, PASS = 4;    // kinds of move; a move is the number  from | to << 6 | kind << 12
const PASS_MOVE = PASS << 12;
const QUIET_LIMIT = 120;                                      // plies with nothing taken (sixty moves each) before the game is a draw

const sideOf = p => p >> 2, kindOf = p => p & 3;
const sqName = s => 'abcdefgh'[s & 7] + ((s >> 3) + 1);
const mFrom = m => m & 63, mTo = m => (m >> 6) & 63, mKind = m => m >> 12;
const moveOf = (from, to, kind) => from | to << 6 | kind << 12;

/** NB[s * 4 + d]: the square next to s going d. 0 towards rank 8, 1 towards rank 1, 2 towards the h file, 3 towards the a file. −1 is the wall. */
const NB = new Int8Array(256);
for (let s = 0; s < 64; s++) {
  const r = s >> 3, f = s & 7;
  NB[s * 4] = r < 7 ? s + 8 : -1; NB[s * 4 + 1] = r > 0 ? s - 8 : -1; NB[s * 4 + 2] = f < 7 ? s + 1 : -1; NB[s * 4 + 3] = f > 0 ? s - 1 : -1;
}
const dirOf = (from, to) => { const x = to - from; return x === 8 ? 0 : x === -8 ? 1 : x === 1 ? 2 : 3; };

/** POST[s]: the other post of the Gate that stands on s. GATE_KEEP[s]: where the Keep stands that this Gate guards. */
const POST = new Int8Array(64).fill(-1), GATE_KEEP = new Int8Array(64).fill(-1);
for (const [a, b, k] of [[2, 11, 3], [5, 12, 4], [58, 51, 59], [61, 52, 60]]) { POST[a] = b; POST[b] = a; GATE_KEEP[a] = GATE_KEEP[b] = k; }

/* keys for telling positions apart quickly (the computer remembers positions it has already searched):
   ZL / ZH by square × 8 + piece; ZXL / ZXH for the rest of a position, see keyLo */
const ZL = new Int32Array(512), ZH = new Int32Array(512), ZXL = new Int32Array(264), ZXH = new Int32Array(264);
const UNDO = 9;                                               // numbers kept for each move played, to take it back
(() => {
  let s = 0x9E3779B9;
  const r = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return (t ^ (t >>> 14)) | 0; };
  for (let i = 0; i < 512; i++) { ZL[i] = r(); ZH[i] = r(); }
  for (let i = 0; i < 264; i++) { ZXL[i] = r(); ZXH[i] = r(); }
})();

/** A position from 64 piece numbers (a1 first). koP / koQ: the Ram that was just shoved and the one that shoved it. alarm: where a Ram has just taken something. */
function position(squares, turn = LIGHT, koP = -1, koQ = -1, alarm = -1) {
  const S = { b: Int8Array.from(squares), turn, koP, koQ, alarm, quiet: 0, keeps: [0, 0], rams: [0, 0], hl: 0, hh: 0, undo: new Int32Array(UNDO * 512), sp: 0, history: [], over: null };
  for (let s = 0; s < 64; s++) {
    const p = S.b[s]; if (!p) continue;
    S.hl ^= ZL[s * 8 + p]; S.hh ^= ZH[s * 8 + p];
    if ((p & 3) === KEEP) S.keeps[p >> 2]++; else if ((p & 3) === RAM) S.rams[p >> 2]++;
  }
  return S;
}
function newGame() {
  const b = new Int8Array(64);
  for (let f = 0; f < 8; f++) { b[16 + f] = RAM; b[40 + f] = RAM + 4; }
  b[2] = b[5] = GATE; b[3] = b[4] = KEEP; b[58] = b[61] = GATE + 4; b[59] = b[60] = KEEP + 4;
  return position(b);
}

/** Every move the side to play may make, written into out from index off; returns how many. With nothing to do, the one move is a pass. */
function gen(S, out, off = 0) {
  const b = S.b, me = S.turn, base = me << 2, ram = RAM + base, gate = GATE + base, foeRam = RAM + ((1 - me) << 2);
  let n = off;
  for (let s = 0; s < 64; s++) {
    const p = b[s]; if (!p || (p >> 2) !== me) continue;
    if (p === ram) {
      for (let d = 0; d < 4; d++) {
        const t = NB[s * 4 + d]; if (t < 0) continue;
        const q = b[t];
        if (!q) { out[n++] = s | t << 6; continue; }
        if ((q >> 2) === me) continue;
        if (q === foeRam) { if (s === S.koP && t === S.koQ) continue; out[n++] = s | t << 6 | PUSH << 12; continue; }
        if ((q & 3) === KEEP) { out[n++] = s | t << 6 | PUSH << 12; continue; }   // a Keep cannot be shoved: it is taken where it stands
        const u = NB[t * 4 + d];                                        // a Gate does not budge either,
        if (u < 0 || b[u]) out[n++] = s | t << 6 | PUSH << 12;         // but is taken only with something behind it
      }
    } else if (p === gate) {
      const t = POST[s];
      if (t >= 0 && (!b[t] || b[t] === foeRam)) out[n++] = s | t << 6 | SWING << 12;
    } else if (S.alarm >= 0 && b[S.alarm] === foeRam) {                 // a Keep that has heard something
      for (let d = 0; d < 4; d++) if (NB[s * 4 + d] === S.alarm) out[n++] = s | S.alarm << 6 | STRIKE << 12;
    }
  }
  if (n === off) out[n++] = PASS_MOVE;
  return n - off;
}

/** Plays a move without asking whether it is allowed. Returns the piece taken, or 0. Undone by unmake. */
function make(S, m) {
  const b = S.b, from = m & 63, to = (m >> 6) & 63, kind = m >> 12;
  let cap = 0, pushed = -1, koP = -1, koQ = -1, alarm = -1;
  if (S.sp + UNDO > S.undo.length) { const grown = new Int32Array(S.undo.length * 2); grown.set(S.undo); S.undo = grown; }
  const u = S.undo, n = S.sp;
  u[n] = m; u[n + 3] = S.koP; u[n + 4] = S.koQ; u[n + 5] = S.alarm; u[n + 6] = S.quiet; u[n + 7] = S.hl; u[n + 8] = S.hh;
  S.sp = n + UNDO;
  if (kind === STEP) {
    const p = b[from]; b[to] = p; b[from] = 0;
    S.hl ^= ZL[from * 8 + p] ^ ZL[to * 8 + p]; S.hh ^= ZH[from * 8 + p] ^ ZH[to * 8 + p];
  } else if (kind === PUSH) {
    const p = b[from], q = b[to], beyond = NB[to * 4 + dirOf(from, to)];
    if ((q & 3) === RAM && beyond >= 0 && !b[beyond]) {                 // room behind: it is shoved along
      b[beyond] = q; pushed = beyond; koP = beyond; koQ = to;
      S.hl ^= ZL[beyond * 8 + q]; S.hh ^= ZH[beyond * 8 + q];
    } else { cap = q; alarm = to; }                                     // no room, or a Keep: it is taken, and that makes a noise
    b[to] = p; b[from] = 0;
    S.hl ^= ZL[to * 8 + q] ^ ZL[to * 8 + p] ^ ZL[from * 8 + p]; S.hh ^= ZH[to * 8 + q] ^ ZH[to * 8 + p] ^ ZH[from * 8 + p];
  } else if (kind === SWING) {
    const p = b[from], q = b[to];
    if (q) { cap = q; S.hl ^= ZL[to * 8 + q]; S.hh ^= ZH[to * 8 + q]; }
    b[to] = p; b[from] = 0;
    S.hl ^= ZL[from * 8 + p] ^ ZL[to * 8 + p]; S.hh ^= ZH[from * 8 + p] ^ ZH[to * 8 + p];
  } else if (kind === STRIKE) {
    cap = b[to]; b[to] = 0;
    S.hl ^= ZL[to * 8 + cap]; S.hh ^= ZH[to * 8 + cap];
  }
  u[n + 1] = cap; u[n + 2] = pushed;
  if (cap) { const k = cap & 3; if (k === KEEP) S.keeps[cap >> 2]--; else if (k === RAM) S.rams[cap >> 2]--; S.quiet = 0; } else S.quiet++;
  S.koP = koP; S.koQ = koQ; S.alarm = alarm; S.turn = 1 - S.turn;
  return cap;
}

function unmake(S) {
  const u = S.undo, n = S.sp - UNDO, m = u[n], cap = u[n + 1], pushed = u[n + 2], b = S.b, from = m & 63, to = (m >> 6) & 63, kind = m >> 12;
  S.koP = u[n + 3]; S.koQ = u[n + 4]; S.alarm = u[n + 5]; S.quiet = u[n + 6]; S.hl = u[n + 7]; S.hh = u[n + 8]; S.sp = n;
  S.turn = 1 - S.turn;
  if (kind === STEP) { b[from] = b[to]; b[to] = 0; }
  else if (kind === PUSH) { b[from] = b[to]; if (pushed >= 0) { b[to] = b[pushed]; b[pushed] = 0; } else b[to] = cap; }
  else if (kind === SWING) { b[from] = b[to]; b[to] = cap; }
  else if (kind === STRIKE) b[to] = cap;
  if (cap) { const k = cap & 3; if (k === KEEP) S.keeps[cap >> 2]++; else if (k === RAM) S.rams[cap >> 2]++; }
  return m;
}

/** The move played just before this position, or −1 at the start. */
const lastMove = S => S.sp ? S.undo[S.sp - UNDO] : -1;
/** A position's key in two halves: the pieces, whose turn it is, the Ram that may not push back, and the square that made a noise. */
const keyLo = S => S.hl ^ ZXL[S.koP + 1] ^ ZXL[S.koQ + 67] ^ ZXL[S.alarm + 133] ^ (S.turn ? ZXL[200] : 0);
const keyHi = S => S.hh ^ ZXH[S.koP + 1] ^ ZXH[S.koQ + 67] ^ ZXH[S.alarm + 133] ^ (S.turn ? ZXH[200] : 0);

const legalMoves = S => { if (S.over) return []; const out = []; gen(S, out); return out; };
const isLegal = (S, m) => legalMoves(S).includes(m);
const movesFrom = (S, s) => legalMoves(S).filter(m => m !== PASS_MOVE && (m & 63) === s);

/** The Keeps of the side to play that may strike on this move. */
function wokenKeeps(S) {
  const out = [];
  if (S.over || S.alarm < 0 || S.b[S.alarm] !== RAM + ((1 - S.turn) << 2)) return out;
  for (let d = 0; d < 4; d++) { const s = NB[S.alarm * 4 + d]; if (s >= 0 && S.b[s] === KEEP + (S.turn << 2)) out.push(s); }
  return out;
}

/** What a move is going to do, worked out before it is played: for the hints on the board and for showing it happen.
 *  what:  step | shove | crush (a Ram taken) | take (a Gate or Keep taken) | swing | slam (a Gate taking a Ram) | strike | pass
 *  anvil: what the taken piece was pushed against: a square, or −1 for the wall; −2 for a Keep, which needs nothing behind it
 *  wakes: the enemy Keeps that will be allowed to answer, because the move takes something right next to them */
function describe(S, m) {
  const b = S.b, from = m & 63, to = (m >> 6) & 63, kind = m >> 12, side = S.turn;
  const ev = { m, what: 'pass', side, from, to, piece: 0, victim: 0, pushedTo: -1, anvil: -2, loud: false, wakes: [] };
  if (kind === PASS) return ev;
  ev.piece = b[from];
  if (kind === STEP) ev.what = 'step';
  else if (kind === SWING) { ev.victim = b[to]; ev.what = b[to] ? 'slam' : 'swing'; }
  else if (kind === STRIKE) { ev.victim = b[to]; ev.what = 'strike'; }
  else {
    const q = b[to], beyond = NB[to * 4 + dirOf(from, to)];
    if ((q & 3) === RAM && beyond >= 0 && !b[beyond]) { ev.what = 'shove'; ev.pushedTo = beyond; ev.victim = q; }
    else {
      ev.what = (q & 3) === RAM ? 'crush' : 'take'; ev.victim = q; ev.anvil = (q & 3) === KEEP ? -2 : beyond; ev.loud = true;
      for (let d = 0; d < 4; d++) { const s = NB[to * 4 + d]; if (s >= 0 && b[s] === KEEP + ((1 - side) << 2)) ev.wakes.push(s); }
    }
  }
  return ev;
}

/** Plays a move in a game. Returns what happened (see describe), or null if the move is not allowed. */
function playMove(S, m) {
  if (!isLegal(S, m)) return null;
  const ev = describe(S, m), prev = lastMove(S);
  make(S, m); S.history.push(m);
  const mover = 1 - S.turn;
  if (!S.keeps[S.turn]) S.over = { winner: mover, loser: S.turn, why: 'keeps' };
  else if (!S.rams[0] && !S.rams[1]) S.over = { winner: -1, why: 'spent' };            // nobody is left who could take a Keep
  else if (m === PASS_MOVE && prev === PASS_MOVE) S.over = { winner: -1, why: 'stuck' };
  else if (S.quiet >= QUIET_LIMIT) S.over = { winner: -1, why: 'quiet' };
  ev.over = S.over;
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
