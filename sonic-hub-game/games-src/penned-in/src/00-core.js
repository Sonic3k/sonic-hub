'use strict';
/* ── Penned In ──
   A pen-and-paper duel for two, invented by the owner as a child. A square sheet of 11×11 or 13×13. X starts in the
   top-left corner and writes first, O starts in the bottom-right. On your turn you write your mark in an empty square
   touching your own last mark (any of the 8 around it). Marks never come off, and both players' marks are in the way.
   Slipping diagonally between two marks that touch only at a corner is allowed. The player who has no empty square
   next to their last mark on their turn is penned in and loses. There are no draws.

   This file is the rules alone: one plain object per game, no DOM. It also runs inside the AI's worker and in node
   (test.js, sim.js). */
const SIZES = [11, 13];
const X = 0, O = 1;
const MARK = ['X', 'O'];

/** A size's geometry: every square's neighbours, kept flat for the search (nb[i * 8 + k], k < nbc[i]). */
const GEO = {};
function geo(n) {
  if (GEO[n]) return GEO[n];
  const N = n * n, nb = new Int16Array(N * 8), nbc = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const r = (i / n) | 0, c = i % n; let k = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const r2 = r + dr, c2 = c + dc;
      if (r2 < 0 || r2 >= n || c2 < 0 || c2 >= n) continue;
      nb[i * 8 + k++] = r2 * n + c2;
    }
    nbc[i] = k;
  }
  return (GEO[n] = { n, N, nb, nbc });
}

/** A new sheet: both starting marks are already written, X is to move. occ: 0 empty, 1 X, 2 O. */
function newGame(n) {
  const g = geo(n), occ = new Uint8Array(g.N);
  occ[0] = 1; occ[g.N - 1] = 2;
  return { n, occ, head: [0, g.N - 1], turn: X, history: [], over: null };
}

/** the empty squares around one side's last mark */
function movesOf(S, side) {
  const g = geo(S.n), h = S.head[side], out = [];
  for (let k = 0; k < g.nbc[h]; k++) { const c = g.nb[h * 8 + k]; if (!S.occ[c]) out.push(c); }
  return out;
}
const legalMoves = S => (S.over ? [] : movesOf(S, S.turn));
const isLegal = (S, cell) => !S.over && legalMoves(S).includes(cell);

/** Writes the mover's mark. Returns false (and changes nothing) when the square is not allowed. */
function playMove(S, cell) {
  if (!isLegal(S, cell)) return false;
  const side = S.turn;
  S.history.push({ side, from: S.head[side], to: cell });
  S.occ[cell] = side + 1; S.head[side] = cell; S.turn = 1 - side;
  if (!movesOf(S, S.turn).length) S.over = { winner: side, loser: S.turn };
  return true;
}

/** Takes the last mark back. Returns it, or null when only the two starting marks are left. */
function undoMove(S) {
  const m = S.history.pop();
  if (!m) return null;
  S.occ[m.to] = 0; S.head[m.side] = m.from; S.turn = m.side; S.over = null;
  return m;
}

/** a game rebuilt from its list of squares (a saved game); null if any of them is not a legal move */
function replay(n, cells) {
  if (!SIZES.includes(n) || !Array.isArray(cells)) return null;
  const S = newGame(n);
  for (const c of cells) if (!Number.isInteger(c) || !playMove(S, c)) return null;
  return S;
}
