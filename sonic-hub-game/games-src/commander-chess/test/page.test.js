/* Checks the page as it is built, without a browser:
   node test/page.test.js
   dist/index.html is built, and what it is made of is taken out of it again: the players' files, the script that is
   the rules, the table and the seat, and the game. Then an opponent is asked for her turn the way the page asks,
   through a worker that is stood in for here: the engine's own text started in a world of its own, talked to by
   messages that are copied on the way, as a browser copies them. So what is checked is the text that ships and the
   words the page and its worker exchange. */
const fs = require('fs'), path = require('path'), vm = require('vm'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
let failed = 0, passed = 0;
const ok = (cond, what) => { if (cond) passed++; else { failed++; console.log('FAIL  ' + what); } };

execFileSync(process.execPath, [path.join(root, 'build.mjs')], { stdio: 'pipe' });
const page = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
const scripts = [...page.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].map(m => ({ attrs: m[1], text: m[2] }));
const botsText = scripts.find(s => /id="bots"/.test(s.attrs)).text, engine = scripts.find(s => /id="engine"/.test(s.attrs)).text, game = scripts[scripts.length - 1].text;
ok(scripts.length === 3, 'the page has its three scripts: the players, the engine, the game');
ok(!/\/\*__[A-Z]+__\*\//.test(page.replace(botsText, '')), 'nothing in the shell was left unfilled');
for (const [name, text] of [['the engine', engine], ['the game', game]]) { let err = ''; try { new vm.Script(text); } catch (e) { err = e.message; } ok(!err, name + ' is a script that reads: ' + err); }
/* where the players are kept: the page says so itself, and carries the saves service's client as it is */
const saves = JSON.parse(fs.readFileSync(path.join(root, 'src/saves.json'), 'utf8')), said = /\nconst SAVES = (\{[^\n]*\});\n/.exec(game);
ok(said && JSON.stringify(JSON.parse(said[1])) === JSON.stringify({ api: saves.api, game: saves.game }), 'the page keeps its players where src/saves.json says: ' + (said && said[1]));
ok(/^https:\/\/[a-z0-9.-]+$/.test(saves.api) && saves.game === 'commander-chess', 'which is the saves service, over https, under the game\'s own name');
ok(game.includes(fs.readFileSync(path.join(root, 'src/game/10-save.js'), 'utf8')), 'and carries the service\'s client whole');
{ // a page built for trying things out goes somewhere else, and says where its players are kept
  const os = require('os'), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-trial-'));
  const run = args => { try { return execFileSync(process.execPath, [path.join(root, 'build.mjs'), ...args], { stdio: 'pipe' }).toString(); } catch (e) { return 'refused: ' + String(e.stderr || e.message); } };
  const none = run(['--saves', 'none', '--out', tmp]), trial = fs.readFileSync(path.join(tmp, 'index.html'), 'utf8');
  ok(/players kept in the browser only/.test(none) && trial.includes('const SAVES = {"api":"","game":"commander-chess"};'), 'a trial page with no service keeps its players in the browser only');
  const local = run(['--saves', 'http://127.0.0.1:3200', '--out', tmp]);
  ok(/players kept with http:\/\/127\.0\.0\.1:3200/.test(local) && fs.readFileSync(path.join(tmp, 'index.html'), 'utf8').includes('const SAVES = {"api":"http://127.0.0.1:3200","game":"commander-chess"};'), 'a trial page can be pointed at a service on this machine');
  ok(/^refused: /.test(run(['--saves', 'none'])) && /^refused: /.test(run(['--saves', 'http://example.com', '--out', tmp])) && /^refused: /.test(run(['--saves', 'https://example.com/path', '--out', tmp])), 'dist/ is never a trial page, and a service is https with nothing after the host');
  ok(fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8') === page, 'and none of that touched dist/');
  fs.rmSync(tmp, { recursive: true, force: true });
}
const bots = JSON.parse(botsText), files = fs.readdirSync(path.join(root, 'league/bots')).filter(f => f.endsWith('.js')).sort();
ok(Object.keys(bots).sort().join() === files.join() && files.every(f => bots[f] === fs.readFileSync(path.join(root, 'league/bots', f), 'utf8')), 'the players on the page are the files of league/bots/, to the letter');

const CC = require('../league/kit/engine.js'), setup = { game: 'battles', lineup: 'standard' };
/** is `turn` one whole legal turn after `moves`? */
function wholeTurn(moves, turn) {
  const S = CC.replay(setup, moves), side = S.turn;
  if (!Array.isArray(turn) || !turn.length) return 'no move';
  for (let i = 0; i < turn.length; i++) {
    if (S.over || S.turn !== side) return 'a move after the turn was over';
    if (!CC.legalMoves(S).includes(turn[i])) return 'move ' + (i + 1) + ' is not legal';
    CC.play(S, turn[i], true);
  }
  return S.over || S.turn !== side ? '' : 'the turn was left open';
}

/** A page with nothing on it but the two scripts a turn needs. `how`: 'worker' (workers that work), 'silent' (workers
 *  that never answer), 'none' (a browser that will not start one). sent: every message the page posted. */
function world(how) {
  const sent = [], workers = [], blobs = new Map();
  const copy = v => JSON.parse(JSON.stringify(v));           // a message arrives as a copy
  class Worker {
    constructor(url) {
      if (how === 'none') throw new Error('no workers here');
      this.dead = false; workers.push(this);
      const post = data => setImmediate(() => { if (!this.dead && this.onmessage) this.onmessage({ data: copy(data) }); });
      this.inside = vm.createContext({ console, postMessage: post, setTimeout, clearTimeout });
      try { vm.runInContext(blobs.get(url), this.inside, { filename: 'worker.js' }); } catch (e) { setImmediate(() => this.onerror && this.onerror(e)); }
    }
    postMessage(data) { sent.push(data); if (how === 'silent') return; const d = copy(data); setImmediate(() => { if (!this.dead) vm.runInContext('onmessage', this.inside)({ data: d }); }); }
    terminate() { this.dead = true; }
  }
  const ctx = vm.createContext({ console, setTimeout, clearTimeout, Worker,
    document: { getElementById: id => ({ textContent: id === 'bots' ? botsText : id === 'engine' ? engine : '' }) },
    Blob: class { constructor(parts) { this.text = parts.join(''); } },
    URL: { createObjectURL(b) { const k = 'blob:' + blobs.size; blobs.set(k, b.text); return k; } } });
  vm.runInContext(engine, ctx, { filename: 'engine.js' });
  vm.runInContext(fs.readFileSync(path.join(root, 'src/game/20-brain.js'), 'utf8') + '\nthis.Brain = Brain;', ctx, { filename: '20-brain.js' });
  return { Brain: ctx.Brain, sent, workers };
}
const quiet = f => { const w = console.warn; console.warn = () => {}; return f().finally(() => { console.warn = w; }); };

(async () => {
  const hana = { file: 'house.js', id: 'house-hana', level: 1 }, pia = { file: 'house.js', id: 'house-pia', level: 1 }, eagle = { file: 'dai-bang.js', id: 'dai-bang', level: 2 };
  { // a worker that works
    const W = world('worker'); W.Brain.start();
    ok(W.Brain.worker, 'the engine starts as a worker');
    const first = await W.Brain.turn(setup, [], hana, 7);
    ok(!wholeTurn([], first) && !W.Brain.fault, 'she answers with a whole legal turn: ' + (wholeTurn([], first) || W.Brain.fault));
    ok(typeof W.sent[0].source === 'string' && W.sent[0].id === 'house-hana' && typeof W.sent[0].req === 'number', 'the first asking carries her file, who she is, and its own number');
    const reply = await W.Brain.turn(setup, first, pia, 7);
    ok(!wholeTurn(first, reply) && !W.Brain.fault, 'another player of the same file answers: ' + (wholeTurn(first, reply) || W.Brain.fault));
    const again = await W.Brain.turn(setup, first.concat(reply), hana, 7);
    ok(!wholeTurn(first.concat(reply), again) && !('source' in W.sent[2]), 'asked again, her file is not sent again');
    const both = await Promise.all([W.Brain.turn(setup, [], eagle, 3), W.Brain.turn(setup, first, hana, 3)]);
    ok(!wholeTurn([], both[0]) && !wholeTurn(first, both[1]), 'two askings at once each get their own answer');
    ok(W.workers.length === 1 && W.Brain.waiting.size === 0, 'all of it from one worker, with nobody left waiting');
    // (asked of the ensign, who looks one move ahead: a player that thinks until its time is up may get further on a faster day)
    const same = await Promise.all([world('worker'), world('worker')].map(X => { X.Brain.start(); return X.Brain.turn(setup, first, pia, 99); }));
    ok(same[0].join() === same[1].join(), 'the same game and the same seed give the same turn');
  }
  await quiet(async () => {
    { // a worker that never answers is given up on
      const W = world('silent'); W.Brain.start(); W.Brain.GIVE_UP = 60;
      const t = await W.Brain.turn(setup, [], hana, 7);
      ok(!wholeTurn([], t) && /no answer in time/.test(W.Brain.fault), 'a silent opponent has her turn played for her: ' + W.Brain.fault);
      ok(W.workers.length === 2 && W.workers[0].dead && W.Brain.worker === W.workers[1] && W.Brain.sent.size === 0, 'and a new worker is started, which knows nobody yet');
    }
    { // a browser without workers
      const W = world('none'); W.Brain.start();
      ok(W.Brain.worker === null, 'where no worker can be started, none is');
      const t = await W.Brain.turn(setup, [], eagle, 7);
      ok(!wholeTurn([], t) && !W.Brain.fault, 'and the turn is worked out on the page: ' + (wholeTurn([], t) || W.Brain.fault));
    }
    { // a player that is not there
      const W = world('worker'); W.Brain.start();
      const t = await W.Brain.turn(setup, [], { file: 'house.js', id: 'nobody', level: 1 }, 7);
      ok(!wholeTurn([], t) && /no player/.test(W.Brain.fault), 'asking for someone who is not in her file still gets a legal turn, and says why: ' + W.Brain.fault);
    }
  });
  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
