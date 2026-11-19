/* ── Asking a computer player for its move ──
   A computer player is a bot (docs/BOT_BRIEF.md) playing at one of its levels. A bot runs in a worker of its own,
   made of three texts the page carries: the rules, the bot's file kept to itself, and the host that hands it a
   fresh copy of the game and checks its answer (engine/host.js). The page carries its bots as text, each in a
   script element of type text/plain that names it; on the kit's board a bot's file is chosen from the disk instead. */
const MOVE_MS = 1000;          // what a bot is asked to stay within for a move; past three times that it has lost
const Bots = {
  files: new Map(), made: new Map(), local: new Map(), noWorker: new Set(), seq: 0,
  source(bot) { if (this.files.has(bot)) return this.files.get(bot); const el = document.querySelector(`script[data-bot="${bot}"]`); return el ? el.textContent : null; },
  program(bot) {
    const src = this.source(bot);
    return src === null ? null : document.getElementById('rules').textContent + "\nconst __BOT = (function () { 'use strict';\n" + src + "\n;return typeof BOT === 'undefined' ? null : BOT;\n})();\n" + document.getElementById('host').textContent;
  },
  /** takes a bot's file under a name; whatever ran under that name before is sent home */
  load(bot, src) { this.drop(bot, 'another file was loaded'); this.local.delete(bot); this.noWorker.delete(bot); this.files.set(bot, src); },
  /** the worker for a bot, started when it is wanted; null where none can be had */
  worker(bot) {
    let w = this.made.get(bot);
    if (w) return w;
    const text = this.noWorker.has(bot) ? null : this.program(bot);
    if (text === null) return null;
    try {
      w = { w: new Worker(URL.createObjectURL(new Blob([text], { type: 'text/javascript' }))), waiting: new Map(), answered: false };
      w.w.onmessage = e => { w.answered = true; const f = w.waiting.get(e.data.id); w.waiting.delete(e.data.id); if (f) f(e.data); };
      w.w.onerror = e => { if (e && e.preventDefault) e.preventDefault(); if (!w.answered) this.noWorker.add(bot); this.drop(bot, 'the bot stopped' + (e && e.message ? ': ' + e.message : '')); };   // one that never spoke was never allowed to start
      this.made.set(bot, w);
      return w;
    } catch (e) { this.noWorker.add(bot); return null; }
  },
  drop(bot, why) {
    const w = this.made.get(bot); if (!w) return;
    this.made.delete(bot); try { w.w.terminate(); } catch (e) { /* already gone */ }
    for (const f of w.waiting.values()) f({ error: why });
  },
  dropAll(why) { for (const bot of [...this.made.keys()]) this.drop(bot, why); },
  /** Where the browser lets no worker start (a page shown inside another, under some rules), the same three texts
   *  are run in the page itself, shut in a function of their own: the board stands still while the bot thinks, but
   *  the moves are its own. Null if the bot's file is not there or does not run. */
  inPage(bot) {
    if (!this.local.has(bot)) {
      const text = this.program(bot);
      let host = null;
      try { if (text !== null) host = new Function(text + '\n;return HOST;')(); } catch (e) { host = null; }
      this.local.set(bot, host);
    }
    return this.local.get(bot);
  },
  /** One question to a bot: q is { ask: 'info' } or { history, level, timeMs, seed }. Comes back with the host's
   *  answer, or { error } when the bot broke, could not be started, or did not answer within `wait` ms. */
  ask(bot, q, wait) {
    const here = () => new Promise(res => setTimeout(() => {
      const host = this.inPage(bot);
      if (!host) return res({ error: this.source(bot) === null ? 'there is no bot called ' + bot : 'the file could not be run' });
      try { res(q.ask === 'info' ? host.info() : host.move(q.history, q)); } catch (e) { res({ error: 'broke: ' + (e && e.message ? e.message : e) }); }
    }, 30));
    const w = this.worker(bot);
    if (!w) return here();
    return new Promise(res => {
      const id = ++this.seq;
      const late = setTimeout(() => this.drop(bot, `took more than ${wait} ms`), wait);
      w.waiting.set(id, a => { clearTimeout(late); if (a.error !== undefined && this.noWorker.has(bot)) here().then(res); else res(a); });
      w.w.postMessage(Object.assign({ id }, q));
    });
  },
  /** who a bot says it is: { name, author, levels } or { error } */
  info(bot) { return this.ask(bot, { ask: 'info' }, 4000); },
  /** The move of `bot` at `level` in game S: { move } when it is one of the moves allowed, else { error }. */
  async move(S, bot, level) {
    const legal = legalMoves(S), a = await this.ask(bot, { history: S.history.slice(), level, timeMs: MOVE_MS, seed: (Math.random() * 0x7fffffff) | 0 }, MOVE_MS * 3);
    if (a.error !== undefined) return { error: a.error };
    return Number.isInteger(a.move) && legal.includes(a.move) ? { move: a.move } : { error: 'no move came back' };
  },
};
