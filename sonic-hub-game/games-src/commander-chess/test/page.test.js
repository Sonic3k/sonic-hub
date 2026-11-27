/* Checks the page as it is built, without a browser:
   node test/page.test.js
   The page is built from the sources into a folder of its own and held against the one the portal serves
   (../../public/games/commander-chess.html, which is committed): the two are to be the same. Then what the page is
   made of is taken out of it again: the script that is the rules, the table, the seat and the league's players, and
   the game. Then an opponent is asked for her turn the way the page
   asks, through a worker that is stood in for here: the engine's own text started in a world of its own, talked to
   by messages that are copied on the way, as a browser copies them. Both worlds are ones where no code can be made
   from text (as under a page policy that forbids it), so what is checked is the text that ships, the words the page
   and its worker exchange, and that the page needs nothing of the kind. */
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..'), hub = path.join(root, '..', '..', '..');
const SERVED = path.join(root, '..', '..', 'public', 'games', 'commander-chess.html');   // what the portal serves at /games/commander-chess
let failed = 0, passed = 0;
const ok = (cond, what) => { if (cond) passed++; else { failed++; console.log('FAIL  ' + what); } };

const made = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-page-'));
execFileSync(process.execPath, [path.join(root, 'build.mjs'), '--out', made], { stdio: 'pipe' });
const page = fs.readFileSync(path.join(made, 'index.html'), 'utf8'), served = fs.existsSync(SERVED) ? fs.readFileSync(SERVED, 'utf8') : '';
fs.rmSync(made, { recursive: true, force: true });
ok(served === page, 'the page the portal serves (public/games/commander-chess.html) is what these sources build: run npm run build and commit it');
const scripts = [...page.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].map(m => ({ attrs: m[1], text: m[2] }));
const engine = scripts.find(s => /id="engine"/.test(s.attrs)).text, game = scripts[scripts.length - 1].text;
ok(scripts.length === 2, 'the page has its two scripts: the engine with the players, and the game');
ok(!/\/\*__[A-Z]+__\*\//.test(page.replace(engine, '')), 'nothing in the shell was left unfilled');
for (const [name, text] of [['the engine', engine], ['the game', game]]) { let err = ''; try { new vm.Script(text); } catch (e) { err = e.message; } ok(!err, name + ' is a script that reads: ' + err); }
/* where the players are kept: the page says so itself, and carries the saves service's client as it is */
const saves = JSON.parse(fs.readFileSync(path.join(root, 'src/saves.json'), 'utf8')), said = /\nconst SAVES = (\{[^\n]*\});\n/.exec(game);
ok(said && JSON.stringify(JSON.parse(said[1])) === JSON.stringify({ api: saves.api, game: saves.game }), 'the page keeps its players where src/saves.json says: ' + (said && said[1]));
ok(/^https:\/\/[a-z0-9.-]+$/.test(saves.api) && saves.game === 'commander-chess', 'which is the saves service, over https, under the game\'s own name');
ok(game.includes(fs.readFileSync(path.join(root, 'src/game/10-save.js'), 'utf8')) && game.includes(fs.readFileSync(path.join(root, 'src/game/12-cast.js'), 'utf8')), 'and carries the service\'s two clients whole: the players, and the cast with its pictures');
for (const [mine, theirs] of [['10-save.js', 'sonic-save.js'], ['12-cast.js', 'sonic-cast.js']]) {   // the service is in this repository: its clients are copied, never changed here
  const service = path.join(hub, 'sonic-hub-game-api', 'client', theirs);
  ok(fs.existsSync(service) && fs.readFileSync(service, 'utf8') === fs.readFileSync(path.join(root, 'src/game', mine), 'utf8'), `src/game/${mine} is sonic-hub-game-api/client/${theirs} as the service has it: copy it again`);
}
ok(/\nconst SHELF = '\/';/.test(game) && !/sonic-commander-chess-production|sonic-hub-game-production/.test(page), 'the way back to the shelf is the portal that serves the page, and no address of a site of its own is left in it');
ok(!/\nconst ART_BASE = /.test(game), 'the page that ships reads no pictures from a folder beside it');
{ // a page built for trying things out goes somewhere else, and says where its players are kept
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-trial-'));
  const run = args => { try { return execFileSync(process.execPath, [path.join(root, 'build.mjs'), ...args], { stdio: 'pipe' }).toString(); } catch (e) { return 'refused: ' + String(e.stderr || e.message); } };
  const none = run(['--saves', 'none', '--out', tmp]), trial = fs.readFileSync(path.join(tmp, 'index.html'), 'utf8');
  ok(/players kept in the browser only/.test(none) && trial.includes('const SAVES = {"api":"","game":"commander-chess"};'), 'a trial page with no service keeps its players in the browser only');
  const local = run(['--saves', 'http://127.0.0.1:3200', '--out', tmp]);
  ok(/players kept with http:\/\/127\.0\.0\.1:3200/.test(local) && fs.readFileSync(path.join(tmp, 'index.html'), 'utf8').includes('const SAVES = {"api":"http://127.0.0.1:3200","game":"commander-chess"};'), 'a trial page can be pointed at a service on this machine');
  ok(/^refused: /.test(run(['--saves', 'none'])) && /^refused: /.test(run(['--saves', 'http://example.com', '--out', tmp])) && /^refused: /.test(run(['--saves', 'https://example.com/path', '--out', tmp])), 'the page the portal serves is never a trial page, and a service is https with nothing after the host');
  const art = run(['--saves', 'none', '--art', 'art/', '--out', tmp]);
  ok(!/^refused/.test(art) && fs.readFileSync(path.join(tmp, 'index.html'), 'utf8').includes('\nconst ART_BASE = "art/";\n'), 'a trial page can read the officers\' pictures from a folder beside it');
  ok(/^refused: /.test(run(['--art', 'art/'])) && /^refused: /.test(run(['--saves', 'none', '--art', 'https://example.com/', '--out', tmp])) && /^refused: /.test(run(['--saves', 'none', '--art', '../art/', '--out', tmp])), 'but only a folder beside the page, and never for the page the portal serves');
  ok(/^refused: /.test(run(['--out', path.dirname(SERVED)])) && /^refused: /.test(run(['--saves', 'none', '--out', path.join(path.dirname(SERVED), 'trial')])), 'and a page for trying things out is never written into the folder the portal serves from');
  ok((fs.existsSync(SERVED) ? fs.readFileSync(SERVED, 'utf8') : '') === served && !fs.existsSync(path.join(path.dirname(SERVED), 'index.html')) && !fs.existsSync(path.join(path.dirname(SERVED), 'trial')), 'and none of that touched what the portal serves');
  fs.rmSync(tmp, { recursive: true, force: true });
}
const files = fs.readdirSync(path.join(root, 'league/bots')).filter(f => f.endsWith('.js')).sort();
ok(files.every(f => engine.includes(`${JSON.stringify(f)}: function (CC, registerAI) {\n${fs.readFileSync(path.join(root, 'league/bots', f), 'utf8')}\n}`)), 'the players on the page are the files of league/bots/, to the letter, each as the body of a function');
ok((engine.match(/^"[a-z0-9-]+\.js": function \(CC, registerAI\) \{$/gm) || []).length === files.length, 'and no file besides');

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
 *  that never answer), 'none' (a browser that will not start one). sent: every message the page posted. In the page's
 *  world and in each worker's, making code from text is switched off. */
const STRICT = { codeGeneration: { strings: false, wasm: false } };
function world(how) {
  const sent = [], workers = [], blobs = new Map();
  const copy = v => JSON.parse(JSON.stringify(v));           // a message arrives as a copy
  class Worker {
    constructor(url) {
      if (how === 'none') throw new Error('no workers here');
      this.dead = false; workers.push(this);
      const post = data => setImmediate(() => { if (!this.dead && this.onmessage) this.onmessage({ data: copy(data) }); });
      this.inside = vm.createContext({ console, performance, postMessage: post, setTimeout, clearTimeout }, STRICT);
      try { vm.runInContext(blobs.get(url), this.inside, { filename: 'worker.js' }); } catch (e) { setImmediate(() => this.onerror && this.onerror(e)); }
    }
    postMessage(data) { sent.push(data); if (how === 'silent') return; const d = copy(data); setImmediate(() => { if (!this.dead) vm.runInContext('onmessage', this.inside)({ data: d }); }); }
    terminate() { this.dead = true; }
  }
  const ctx = vm.createContext({ console, performance, setTimeout, clearTimeout, Worker,
    document: { getElementById: id => (id === 'engine' ? { textContent: engine } : null) },
    Blob: class { constructor(parts) { this.text = parts.join(''); } },
    URL: { createObjectURL(b) { const k = 'blob:' + blobs.size; blobs.set(k, b.text); return k; } } }, STRICT);
  vm.runInContext(engine, ctx, { filename: 'engine.js' });
  vm.runInContext(fs.readFileSync(path.join(root, 'src/game/20-brain.js'), 'utf8') + '\nthis.Brain = Brain;', ctx, { filename: '20-brain.js' });
  return { Brain: ctx.Brain, sent, workers, refuses: code => { try { vm.runInContext(code, ctx); return false; } catch (e) { return e.name === 'EvalError'; } }, inPage: code => vm.runInContext(code, ctx) };
}
const quiet = f => { const w = console.warn; console.warn = () => {}; return f().finally(() => { console.warn = w; }); };

(async () => {
  const hana = { file: 'house.js', id: 'house-hana', level: 1 }, pia = { file: 'house.js', id: 'house-pia', level: 1 }, eagle = { file: 'dai-bang.js', id: 'dai-bang', level: 2 };
  { // a worker that works
    const W = world('worker'); W.Brain.start();
    ok(W.Brain.worker, 'the engine starts as a worker');
    const first = await W.Brain.turn(setup, [], hana, 7);
    ok(!wholeTurn([], first) && !W.Brain.fault, 'she answers with a whole legal turn: ' + (wholeTurn([], first) || W.Brain.fault));
    ok(W.refuses('new Function("return 1")()') && W.refuses('eval("1")'), 'in a world where no code can be made from text');
    ok(W.sent[0].id === 'house-hana' && W.sent[0].file === 'house.js' && typeof W.sent[0].req === 'number' && !('source' in W.sent[0]), 'an asking says who is asked and has its own number; no file travels with it');
    ok(W.inPage('typeof Function === "function" && Function.name === "Function"'), 'and Function is left as it was');
    const reply = await W.Brain.turn(setup, first, pia, 7);
    ok(!wholeTurn(first, reply) && !W.Brain.fault, 'another player of the same file answers: ' + (wholeTurn(first, reply) || W.Brain.fault));
    const again = await W.Brain.turn(setup, first.concat(reply), hana, 7);
    ok(!wholeTurn(first.concat(reply), again) && !W.Brain.fault, 'asked again, she answers again');
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
      ok(W.workers.length === 2 && W.workers[0].dead && W.Brain.worker === W.workers[1], 'and a new worker is started');
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
      const u = await W.Brain.turn(setup, [], { file: 'nowhere.js', id: 'nobody', level: 1 }, 7);
      ok(!wholeTurn([], u) && /no file nowhere\.js/.test(W.Brain.fault), 'and so does asking for a file the page does not carry: ' + W.Brain.fault);
    }
  });
  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
