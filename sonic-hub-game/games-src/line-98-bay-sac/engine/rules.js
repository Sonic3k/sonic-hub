/* The rules of Lines 98, as the program itself plays them.

   Written from Lines 98 version 4.2 (SORCERER, Perm, 08/1998: the build the hub keeps as package lines98), read from
   its help file and from the program's own code, and held against version 5.0 (02/2004), which plays the same. What
   was read, and where each rule stands in the program, is in docs/RULES.md.

   Only the game called Lines is here: a line of five or more. The program's two other games (Squares, Blocks), its
   countdown timer, its files of saved games and its skins are left out.

   The page and the tests both run this one file. Nothing in it draws, waits or keeps time.

     const game = Lines.newGame(rnd);                 a game at its start: five balls, and the three to come
     Lines.path(game, from, to)                       the squares a ball would pass over, or null when it cannot get there
     Lines.move(game, from, to, rnd)                  one move: null when it cannot be made, otherwise what happened, in order
     Lines.stepBack(game, rnd)                        takes the last move back (one move only), false when there is none
     rnd(n)                                           a whole number from 0 to n - 1, each as likely as the others

   A square is a number from 0 to 80: row * 9 + column, counted from the top left.
   A game: { board: 81 squares, each -1 (empty) or a colour 0..6
             next:  the three balls to come, each { c: its colour, at: the square it is to come up on }
             shown: do the three to come have squares of their own? (not when fewer than three squares were free
                    as they were drawn: then only their colours are known)
             score, moves, over
             back:  what Step back returns to, or null }

   What a move answers with is a list. Each entry is one thing that happened, to be shown in that order:
     { type: 'move', colour, path }                                  the ball went along these squares
     { type: 'clear', by: 'move' | 'grow', groups: [{ colour, cells, points }] }   lines were taken off
     { type: 'grow', balls: [{ c, at, from }] }                     the three came up (from: where it was to come up,
                                                                     when the ball that moved took that square)
     { type: 'next', next, shown }                                  the three after them were drawn
     { type: 'over' }                                               the game is over */
(function (root, make) {
  if (typeof module === 'object' && module.exports) module.exports = make();
  else root.Lines = make();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const N = 9, CELLS = N * N, COLOURS = 7, AT_START = 5, TO_COME = 3, SHORTEST = 5;
  const EMPTY = -1;

  const isFree = (s, at) => s.board[at] === EMPTY;
  function freeCount(s) { let n = 0; for (let i = 0; i < CELLS; i++) if (s.board[i] === EMPTY) n++; return n; }
  /** points for one colour's balls taken off together: each of them is worth four fewer than there are */
  const points = count => (count - 4) * count;

  /** Gives ball `i` of the three to come a square: any free one, each as likely as the others, that none of the
   *  balls before it has (`all`: that neither of the other two has, which is how a ball is given a new square once
   *  the one it was to come up on has been taken). */
  function place(s, i, rnd, all) {
    const open = [];
    for (let at = 0; at < CELLS; at++) {
      if (s.board[at] !== EMPTY) continue;
      let taken = false;
      for (let j = 0; j < TO_COME; j++) if (j !== i && (all || j < i) && s.next[j].at === at) taken = true;
      if (!taken) open.push(at);
    }
    s.next[i].at = open[rnd(open.length)];
  }

  /** Draws the three to come: their colours always, their squares only while three squares are free. */
  function draw(s, rnd, ev) {
    for (let i = 0; i < TO_COME; i++) s.next[i].c = rnd(COLOURS);
    s.shown = false;
    if (freeCount(s) >= TO_COME) {
      for (let i = 0; i < TO_COME; i++) place(s, i, rnd, false);
      s.shown = true;
    }
    if (ev) ev.push({ type: 'next', next: s.next.map(b => ({ c: b.c, at: b.at })), shown: s.shown });
  }

  /** Looks for lines and takes them off, a colour at a time. For each colour and each of the four ways a line can
   *  run, the longest line is looked for first (nine balls, then eight, down to five), from the top row down and
   *  from the left, and the first one found is the one taken: so a line is always taken whole, and of two separate
   *  lines of one colour running the same way only one goes at this look (the other at the next). Balls of one
   *  colour taken together are counted once each, also where two lines cross.
   *  Returns true when nothing was taken. */
  function shapes(s, rnd, ev, by) {
    const b = s.board, groups = [];
    let none = true, emptied = false;
    for (let colour = 0; colour < COLOURS && !emptied; colour++) {
      const mark = new Uint8Array(CELLS), look = [true, true, true, true];
      let count = 0;
      const hit = (x, y, way) => { const at = y * N + x; if (!mark[at]) { mark[at] = 1; count++; } look[way] = false; };
      for (let len = N; len >= SHORTEST; len--)
        for (let row = 0; row < N; row++)
          for (let col = 0; col < N; col++) {
            let n = 0, k;
            if (len + col <= N && look[0]) for (k = 0; k < len; k++) if (b[row * N + col + k] === colour) n++;      // across
            if (n === len) for (k = 0; k < len; k++) hit(col + k, row, 0);
            n = 0;
            if (len + row <= N && look[1]) for (k = 0; k < len; k++) if (b[(row + k) * N + col] === colour) n++;    // down
            if (n === len) for (k = 0; k < len; k++) hit(col, row + k, 1);
            n = 0;
            if (len + row <= N && len + col <= N && look[2]) for (k = 0; k < len; k++) if (b[(row + k) * N + col + k] === colour) n++;   // down to the right
            if (n === len) for (k = 0; k < len; k++) hit(col + k, row + k, 2);
            n = 0;
            if (len + row <= N && col - len >= -1 && look[3]) for (k = 0; k < len; k++) if (b[(row + k) * N + col - k] === colour) n++;  // down to the left
            if (n === len) for (k = 0; k < len; k++) hit(col - k, row + k, 3);
          }
      if (count > 0) {
        none = false;
        const cells = [];
        for (let at = 0; at < CELLS; at++) if (mark[at]) { cells.push(at); b[at] = EMPTY; }
        s.score += points(count);
        groups.push({ colour, cells, points: points(count) });
        // a board with nothing left on it does not wait for a move: the three to come come up at once
        if (freeCount(s) === CELLS) emptied = true;
      }
    }
    if (groups.length && ev) ev.push({ type: 'clear', by, groups });
    if (emptied) turn(s, rnd, ev);
    return none;
  }

  /** What the game does once the board has changed by the player's hand. Returns true when the game is over. */
  function turn(s, rnd, ev) {
    if (shapes(s, rnd, ev, 'move')) {
      // nothing was taken, so the three to come come up; with fewer than three free squares the game is over instead
      if (freeCount(s) < TO_COME) return true;
      const balls = [];
      for (let i = 0; i < TO_COME; i++) {
        const was = s.next[i].at;
        if (!isFree(s, was)) { place(s, i, rnd, true); balls.push({ c: s.next[i].c, at: s.next[i].at, from: s.shown ? was : null }); }
        else balls.push({ c: s.next[i].c, at: was, from: null });
      }
      for (let i = 0; i < TO_COME; i++) s.board[s.next[i].at] = s.next[i].c;
      if (ev) ev.push({ type: 'grow', balls });
      draw(s, rnd, ev);
      shapes(s, rnd, ev, 'grow');          // a line the new balls made is taken too, and counts
    }
    return freeCount(s) === 0;
  }

  /** How far every square is from `from`, going from free square to free square up, down, left and right; the
   *  square `from` itself is 1, a square that cannot be got to is 0. */
  function distances(s, from) {
    const dist = new Int16Array(CELLS), queue = [from];
    dist[from] = 1;
    for (let q = 0; q < queue.length; q++) {
      const at = queue[q], x = at % N, y = (at - x) / N, d = dist[at] + 1;
      if (y > 0 && !dist[at - N] && s.board[at - N] === EMPTY) { dist[at - N] = d; queue.push(at - N); }
      if (y < N - 1 && !dist[at + N] && s.board[at + N] === EMPTY) { dist[at + N] = d; queue.push(at + N); }
      if (x > 0 && !dist[at - 1] && s.board[at - 1] === EMPTY) { dist[at - 1] = d; queue.push(at - 1); }
      if (x < N - 1 && !dist[at + 1] && s.board[at + 1] === EMPTY) { dist[at + 1] = d; queue.push(at + 1); }
    }
    return dist;
  }

  /** The squares a ball on `from` passes over to get to `to`, both ends counted, or null when it cannot: `to` must
   *  be free and joined to `from` by free squares side by side. It is a shortest way. Of several the program takes
   *  one in particular, found from the far end backwards: the square before is the one to the right if that is on
   *  a shortest way, else the one to the left, else the one below, else the one above. */
  function path(s, from, to) {
    if (from === to || s.board[from] === EMPTY || s.board[to] !== EMPTY) return null;
    const dist = distances(s, from);
    if (!dist[to]) return null;
    const way = [to];
    for (let at = to; at !== from;) {
      const x = at % N, y = (at - x) / N, d = dist[at] - 1;
      if (x < N - 1 && dist[at + 1] === d) at += 1;
      else if (x > 0 && dist[at - 1] === d) at -= 1;
      else if (y < N - 1 && dist[at + N] === d) at += N;
      else at -= N;
      way.push(at);
    }
    return way.reverse();
  }

  /** every square the ball on `from` could be moved to */
  function reach(s, from) {
    const dist = distances(s, from), out = [];
    for (let at = 0; at < CELLS; at++) if (at !== from && dist[at]) out.push(at);
    return out;
  }

  const copyNext = next => next.map(b => ({ c: b.c, at: b.at }));

  function newGame(rnd) {
    const s = { board: new Array(CELLS).fill(EMPTY), next: [{ c: 0, at: 0 }, { c: 0, at: 0 }, { c: 0, at: 0 }], shown: false, score: 0, moves: 0, over: false, back: null };
    for (let i = 0; i < AT_START; i++) {
      place(s, 0, rnd, false);
      s.board[s.next[0].at] = rnd(COLOURS);
    }
    draw(s, rnd, null);
    return s;
  }

  function move(s, from, to, rnd) {
    if (s.over) return null;
    const way = path(s, from, to);
    if (!way) return null;
    s.back = { board: s.board.slice(), next: copyNext(s.next), shown: s.shown, score: s.score, moves: s.moves };
    const ev = [{ type: 'move', colour: s.board[from], path: way }];
    s.board[to] = s.board[from];
    s.board[from] = EMPTY;
    s.moves++;
    if (turn(s, rnd, ev)) { s.over = true; s.back = null; ev.push({ type: 'over' }); }
    return ev;
  }

  /** Step back: the board, the score and the three to come as they were before the last move. One move only: there
   *  is nothing to step back to until another move has been made. (Back on a board with fewer than three free
   *  squares, the program draws the colours of the three to come anew.) */
  function stepBack(s, rnd) {
    if (!s.back || s.over) return false;
    const k = s.back;
    s.board = k.board; s.next = k.next; s.shown = k.shown; s.score = k.score; s.moves = k.moves; s.back = null;
    if (freeCount(s) < TO_COME) draw(s, rnd, null);
    return true;
  }

  /** A whole-number source that gives the same numbers again for the same seed (for tests, and for a game that is
   *  to be played again exactly). */
  function seeded(seed) {
    let a = seed >>> 0;
    return n => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return Math.floor(((t ^ (t >>> 14)) >>> 0) / 4294967296 * n);
    };
  }

  return { N, CELLS, COLOURS, AT_START, TO_COME, SHORTEST, EMPTY, newGame, move, stepBack, path, reach, points, freeCount, seeded };
});
