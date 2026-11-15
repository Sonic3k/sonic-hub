/* ── Asking the computer for its move ──
   The engine (00-core.js, 10-ai.js) sits in its own <script id="engine">, so the same text can be started as a worker:
   hard thinks for a good part of a second, and the page keeps drawing meanwhile. Where a worker cannot be started the
   move is worked out on the page's own thread, with a shorter think. */
const HARD_MS = 520;
const Brain = {
  worker: null, seq: 0, waiting: new Map(),
  start() {
    try {
      const glue = 'onmessage = e => { const q = e.data, S = replay(q.n, q.cells); let move = null; try { move = AI.think(S, { level: q.level, timeMs: q.timeMs }).move; } catch (err) {} postMessage({ id: q.id, move }); };';
      const url = URL.createObjectURL(new Blob([document.getElementById('engine').textContent, '\n', glue], { type: 'text/javascript' }));
      this.worker = new Worker(url);
      this.worker.onmessage = e => { const f = this.waiting.get(e.data.id); this.waiting.delete(e.data.id); if (f) f(e.data.move); };
      this.worker.onerror = () => { this.worker = null; const fs = [...this.waiting.values()]; this.waiting.clear(); fs.forEach(f => f(null)); };
    } catch (e) { this.worker = null; }
  },
  /** the computer's move for the side to play in S, at one of LEVELS */
  move(S, level) {
    const n = S.n, cells = S.history.map(m => m.to);
    const here = () => AI.think(replay(n, cells), { level, timeMs: 220 }).move;
    if (!this.worker) return new Promise(res => setTimeout(() => res(here()), 30));
    return new Promise(res => {
      const id = ++this.seq;
      this.waiting.set(id, m => res(Number.isInteger(m) && m >= 0 ? m : here()));
      this.worker.postMessage({ id, n, cells, level, timeMs: HARD_MS });
    });
  },
};
