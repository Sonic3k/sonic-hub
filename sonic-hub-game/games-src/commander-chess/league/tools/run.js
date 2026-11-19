// The league's runner: plays every game that has no result yet, two at a time (one for each processor core, each
// game pinned to its own core), and appends each result to out/results.jsonl. It can be stopped and started again.
//   node tools/run.js                 the league (tools/schedule.js)
//   node tools/run.js --plan f.json --out f.jsonl     an explicit list of games (a pilot)
'use strict';
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const ROOT = path.join(__dirname, '..');
const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : null; };
const OUT = path.resolve(ROOT, arg('out') || 'out/results.jsonl'), PROG = OUT.replace(/\.jsonl$/, '') + '.progress.json', LOCK = OUT + '.lock', FAILED = OUT.replace(/\.jsonl$/, '') + '.failed.jsonl';
const games = arg('plan') ? JSON.parse(fs.readFileSync(path.resolve(ROOT, arg('plan')), 'utf8')) : require('./schedule.js').games;
const CORES = (arg('cores') || '0,1').split(',').map(Number), KILL = 45 * 60 * 1000;

try { const pid = +fs.readFileSync(LOCK, 'utf8'); if (pid && pid !== process.pid) { try { process.kill(pid, 0); console.log('already running as', pid); process.exit(0); } catch (e) { /* stale */ } } } catch (e) { /* no lock */ }
fs.writeFileSync(LOCK, String(process.pid));

const done = new Set();
if (fs.existsSync(OUT)) for (const line of fs.readFileSync(OUT, 'utf8').split('\n')) if (line.trim()) { try { done.add(JSON.parse(line).id); } catch (e) { /* a torn last line: that game is played again */ } }
const queue = games.filter(g => !done.has(g.id)), total = games.length, tries = new Map(), running = new Map(), t0 = Date.now();
let finished = 0, wallSum = 0, stopping = false;
const log = s => fs.appendFileSync(path.join(ROOT, 'logs/run.log'), new Date().toISOString() + ' ' + s + '\n');
log('start pid ' + process.pid + ': ' + done.size + ' of ' + total + ' games already played, ' + queue.length + ' to go');

function progress() {
  const left = queue.length + running.size, per = finished ? (Date.now() - t0) / finished : 0;
  fs.writeFileSync(PROG, JSON.stringify({ total, done: total - left, left, running: [...running.values()].map(r => r.g.id + ' (' + Math.round((Date.now() - r.t) / 1000) + ' s)'), thisRun: finished,
    secPerGame: finished ? Math.round(wallSum / finished) : null, etaHours: finished ? Math.round(left * per / 3600000 * 10) / 10 : null, updated: new Date().toISOString(), pid: process.pid }));
}
function launch(core) {
  if (stopping) return;
  const g = queue.shift();
  if (!g) { if (!running.size) finish(); return; }
  const child = spawn('taskset', ['-c', String(core), process.execPath, path.join(ROOT, 'tools/game.js'), JSON.stringify(g)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  const r = { g, t: Date.now(), child }; running.set(core, r);
  let out = '', err = '';
  child.stdout.on('data', d => { out += d; }); child.stderr.on('data', d => { if (err.length < 4000) err += d; });
  const timer = setTimeout(() => { err += '\nkilled after ' + KILL / 60000 + ' minutes'; child.kill('SIGKILL'); }, KILL);
  child.on('close', code => {
    clearTimeout(timer); running.delete(core);
    if (stopping) return;
    let res = null; try { res = JSON.parse(out.trim().split('\n').pop()); } catch (e) { /* no result */ }
    if (res && res.id === g.id) {
      fs.appendFileSync(OUT, JSON.stringify(res) + '\n'); finished++; wallSum += res.wall;
      log('game ' + g.id + ': ' + (res.winner < 0 ? 'draw' : res.winner ? 'Blue' : 'Red') + ' (' + res.why + (res.cause ? '/' + res.cause : '') + (res.fault ? ' ' + res.fault.kind + ' by ' + (res.fault.side ? 'Blue' : 'Red') : '') + '), ' + res.turns + ' turns, ' + res.wall + ' s');
    } else {
      const n = (tries.get(g.id) || 0) + 1; tries.set(g.id, n);
      log('game ' + g.id + ' gave no result (exit ' + code + ', try ' + n + '): ' + err.trim().split('\n').slice(-3).join(' | ').slice(0, 400));
      if (n < 2) queue.unshift(g); else fs.appendFileSync(FAILED, JSON.stringify({ id: g.id, code, err: err.slice(-1500) }) + '\n');
    }
    progress(); launch(core);
  });
  progress();
}
function finish() { progress(); log('nothing left to play'); try { fs.unlinkSync(LOCK); } catch (e) { /* gone */ } process.exit(0); }
for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(sig, () => { stopping = true; log('stopped by ' + sig + ' with ' + running.size + ' games in play (they will be played again)'); for (const r of running.values()) r.child.kill('SIGKILL'); try { fs.unlinkSync(LOCK); } catch (e) { /* gone */ } process.exit(0); });
if (!queue.length) finish();
for (const core of CORES) launch(core);
