/* ── Asking an opponent for her turn ──
   The rules, the table, the seat and the league's players sit in their own <script id="engine">, so the same text
   can be started as a worker: an opponent thinks for up to a second, and the page keeps drawing meanwhile. Who she
   is, is one of the league's players: a file, a player in it, a level. Where a worker cannot be started the turn is
   worked out on the page's own thread. An opponent who has not answered after a long while is given up on: the
   worker is started afresh and her turn is played for her with a plain move, so a game can never hang. */
const Brain = {
  worker: null, seq: 0, waiting: new Map(), fault: '',
  GIVE_UP: 20000,                                             // ms: twenty times what a turn has
  start() {
    try {
      const glue = 'onmessage = e => { const q = e.data; let r; try { r = Seat.turn(q); } catch (err) { try { r = Seat.anyTurn(q); r.fault = String((err && err.message) || err); } catch (e2) { r = { moves: [], ms: 0, fault: String(e2) }; } } postMessage({ req: q.req, moves: r.moves, ms: r.ms, fault: r.fault }); };';
      const url = URL.createObjectURL(new Blob([document.getElementById('engine').textContent, '\n', glue], { type: 'text/javascript' }));
      this.worker = new Worker(url);
      this.worker.onmessage = e => { const f = this.waiting.get(e.data.req); this.waiting.delete(e.data.req); if (f) f(e.data); };
      this.worker.onerror = () => this.again();
    } catch (e) { this.worker = null; }
  },
  /** the worker is gone or stuck: whoever waits gets a plain turn, and a new worker is started */
  again() {
    const fs = [...this.waiting.values()]; this.waiting.clear();
    try { if (this.worker) this.worker.terminate(); } catch (e) { /* it was gone already */ }
    this.worker = null; this.start();
    fs.forEach(f => f(null));
  },
  /** on the page's own thread */
  here(q) { try { return Seat.turn(q); } catch (e) { const r = Seat.anyTurn(q); r.fault = String((e && e.message) || e); return r; } },
  /** the moves of one whole turn for the side to move, played by `bot` ({ file, id, level }); seed: the game's own */
  turn(setup, moves, bot, seed) {
    const q = { setup, moves: moves.slice(), file: bot.file, id: bot.id, level: bot.level, seed };
    const done = r => { this.fault = (r && r.fault) || ''; if (this.fault && typeof console !== 'undefined') console.warn('The opponent went wrong (' + bot.id + '): ' + this.fault); return r.moves; };
    if (!this.worker) return new Promise(res => setTimeout(() => res(done(this.here(q))), 30));
    return new Promise(res => {
      const req = ++this.seq;                                 // this asking's number (q.id is who is asked)
      const timer = setTimeout(() => { if (this.waiting.has(req)) this.again(); }, this.GIVE_UP);
      this.waiting.set(req, r => { clearTimeout(timer); res(done(r && Array.isArray(r.moves) && r.moves.length ? r : Object.assign(Seat.anyTurn(q), { fault: r ? r.fault || 'no move came back' : 'no answer in time' }))); });
      this.worker.postMessage(Object.assign({ req }, q));
    });
  },
};
