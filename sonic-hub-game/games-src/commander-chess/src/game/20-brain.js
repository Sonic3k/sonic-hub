/* ── Asking the computer for its turn ──
   The rules and the computer player sit in their own <script id="engine">, so the same text can be started as a
   worker: the strong players think for a few seconds, and the page keeps drawing meanwhile. Where a worker cannot be
   started the turn is worked out on the page's own thread, with a shorter think. */
const Brain = {
  worker: null, seq: 0, waiting: new Map(),
  start() {
    try {
      const glue = 'onmessage = e => { const q = e.data; let moves = []; try { const S = replay(q.setup, q.moves); moves = AI.turn(S, Object.assign({}, PLAYERS[q.who], { seen: q.seen, salt: q.salt })).moves; } catch (err) {} postMessage({ id: q.id, moves }); };';
      const url = URL.createObjectURL(new Blob([document.getElementById('engine').textContent, '\n', glue], { type: 'text/javascript' }));
      this.worker = new Worker(url);
      this.worker.onmessage = e => { const f = this.waiting.get(e.data.id); this.waiting.delete(e.data.id); if (f) f(e.data.moves); };
      this.worker.onerror = () => { this.worker = null; const fs = [...this.waiting.values()]; this.waiting.clear(); fs.forEach(f => f(null)); };
    } catch (e) { this.worker = null; }
  },
  /** the moves of one whole turn for the side to move, played the way `who` plays */
  turn(setup, moves, who, seen, salt) {
    const here = () => AI.turn(replay(setup, moves), Object.assign({}, PLAYERS[who], { seen, salt, ms: Math.min(PLAYERS[who].ms || 600, 600) })).moves;
    if (!this.worker) return new Promise(res => setTimeout(() => res(here()), 30));
    return new Promise(res => {
      const id = ++this.seq;
      this.waiting.set(id, m => res(Array.isArray(m) && m.length ? m : here()));
      this.worker.postMessage({ id, setup, moves: moves.slice(), who, seen, salt });
    });
  },
};
