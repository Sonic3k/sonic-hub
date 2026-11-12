// Make each transcribed page finishable with the real game physics, changing as little as possible.
// Reads design/levels.raw.json, writes src/10-levels.js and design/fixes.log.
// Fixes, in order of preference: open a decorative door pair as a warp, add a short one-way ledge (pen line)
// between the furthest reachable spot and the next floor, or fill a pit column. Usage: node design/repair.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..'), SRC = path.join(ROOT, 'src') + '/';
global.document = { createElement: () => ({ getContext: () => ({}) }) };
for (const f of ['00-core.js', '15-world.js', '20-player.js']) vm.runInThisContext(fs.readFileSync(SRC + f, 'utf8'), { filename: f });
const chk = fs.readFileSync(path.join(ROOT, 'check.js'), 'utf8');
vm.runInThisContext(chk.slice(chk.indexOf('function simLevel'), chk.indexOf('const ids = process.argv')), { filename: 'check.js' });

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'levels.raw.json'), 'utf8'));
const log = [];
const SOLIDISH = '#X?+=';
function asDef(L, rows) { return { id: L.id, name: L.name, theme: 'paper', signs: [], maze: false, map: '\n' + rows.join('\n') + '\n' }; }
function surfaceAt(g, x, fromY) { for (let y = Math.max(1, fromY); y < g.length; y++) if (SOLIDISH.includes(g[y][x]) && g[y - 1][x] !== '#') return y - 1; return null; }
function put(g, x, y, ch) { if (y >= 0 && y < g.length && x >= 0 && x < g[0].length && g[y][x] === ' ') { g[y][x] = ch; return true; } return false; }

function reachOf(rows, L, limit) {
  const r = simLevel(asDef(L, rows), { limit });
  let best = null;
  for (const v of r.visited.values()) { const cx = Math.floor((v.x + 5) / 16), cy = Math.floor((v.y + 13) / 16); if (!best || cx > best.x || (cx === best.x && cy < best.y)) best = { x: cx, y: cy }; }
  return { goal: r.reach.goal, best, maxX: best ? best.x : 0 };
}
// candidate edits around the furthest reachable cell; the one that pushes reach furthest wins
function candidates(g, best) {
  const H = g.length, W = g[0].length, out = [];
  const clone = () => g.map(r => r.slice());
  const empty = (c, x, y) => y >= 0 && y < H && x >= 0 && x < W && c[y][x] === ' ';
  const ledge = (c, x0, y, w = 3) => { let n = 0; for (let x = x0; x < x0 + w; x++) if (empty(c, x, y)) { c[y][x] = '='; n++; } return n; };
  for (const off of [1, -2, -4, 3]) for (const k of [1, 2, 3, 4]) {          // a stack of one-way ledges climbing up
    const c = clone(); let n = 0;
    for (let i = 1; i <= k; i++) n += ledge(c, best.x + off, best.y + 1 - 3 * i);
    if (n) out.push({ c, n, what: `${k} ledge(s) up at x=${best.x + off}` });
  }
  for (const [dx, dy] of [[2, 1], [3, 0], [4, 1], [2, -1], [5, 2]]) {        // a ledge out over a gap
    const c = clone(); const n = ledge(c, best.x + dx, best.y + dy);
    if (n) out.push({ c, n, what: `ledge over gap at ${best.x + dx},${best.y + dy}` });
  }
  { const c = clone(); let n = 0;                                              // an opening through a wall
    for (let x = best.x + 1; x <= best.x + 2; x++) for (const y of [best.y, best.y - 1]) if (y >= 0 && c[y][x] && c[y][x] !== ' ' && c[y][x] !== 'G') { c[y][x] = ' '; n++; }
    if (n) out.push({ c, n, what: `opening at ${best.x + 1},${best.y}` }); }
  { const c = clone(); let n = 0;                                              // spikes / lava right ahead
    for (let x = best.x; x <= best.x + 6; x++) for (let y = 0; y < H; y++) if (c[y][x] === '^') { c[y][x] = ' '; n++; }
    if (n) out.push({ c, n, what: `hazard cleared near ${best.x}` }); }
  return out;
}
function repairLevel(L) {
  let g = L.rows.map(r => r.split(''));
  const W = g[0].length, fixes = [];
  let cur = reachOf(L.rows, L, 40000);
  for (let iter = 0; iter < 16 && !cur.goal && cur.best; iter++) {
    let win = null;
    for (const cand of candidates(g, cur.best)) {
      const r = reachOf(cand.c.map(x => x.join('')), L, 25000);
      const gain = (r.goal ? 10000 : r.maxX) - cur.maxX;
      if (gain > 0 && (!win || gain > win.gain || (gain === win.gain && cand.n < win.cand.n))) win = { cand, gain, r };
    }
    if (!win) break;
    g = win.cand.c; fixes.push(win.cand.what);
    cur = reachOf(g.map(x => x.join('')), L, 40000);
  }
  const rows = g.map(r => r.join(''));
  const fin = reachOf(rows, L, 80000);
  return { rows, fixes, ok: fin.goal, maxX: fin.maxX, W };
}
// `node design/repair.js 2 3` redoes only those level numbers and keeps the rest from the current 10-levels.js
const only = process.argv.slice(2).map(Number);
let prev = {};
if (only.length) { const ctx = {}; vm.runInNewContext(fs.readFileSync(SRC + '10-levels.js', 'utf8') + ';this.LEVELS = LEVELS;', ctx); for (const L of ctx.LEVELS) prev[L.page] = L; }
const prevLog = only.length && fs.existsSync(path.join(__dirname, 'fixes.log')) ? Object.fromEntries(fs.readFileSync(path.join(__dirname, 'fixes.log'), 'utf8').split('\n').filter(Boolean).map(l => [+l.split(' ')[1], l])) : {};
const out = [];
for (const L of raw) {
  if (only.length && !only.includes(L.page) && prev[L.page]) {
    const P = prev[L.page]; out.push({ ...P, id: L.id, rows: P.map.replace(/^\n/, '').replace(/\n$/, '').split('\n') }); delete out[out.length - 1].map;
    if (prevLog[L.page]) log.push(prevLog[L.page]); continue;
  }
  const t0 = Date.now();
  const r = repairLevel(L);
  log.push(`page ${L.page} (${L.file}): ${r.ok ? 'OK' : 'NOT FINISHABLE (reached ' + r.maxX + '/' + r.W + ')'}; ${r.fixes.length} fixes${r.fixes.length ? ': ' + r.fixes.join('; ') : ''} [${((Date.now() - t0) / 1000).toFixed(1)}s]`);
  console.log(log[log.length - 1]);
  out.push({ id: L.id, page: L.page, name: L.name, theme: 'paper', signs: [], maze: false, stars: false, coins: L.coins, fixes: r.fixes.length, ok: r.ok, rows: r.rows });
}
const js = ['/* ── Levels: the owner\'s hand-drawn MARIO 4 pages (generated by design/gen.py + design/repair.js — edit design/pages/) ── */', 'const LEVELS = ['];
for (const L of out) {
  const { rows, ...meta } = L;
  js.push('  { ' + JSON.stringify(meta).slice(1, -1) + ', map: `\n' + rows.join('\n') + '\n` },');
}
js.push('];');
fs.writeFileSync(SRC + '10-levels.js', js.join('\n') + '\n');
fs.writeFileSync(path.join(__dirname, 'fixes.log'), log.join('\n') + '\n');
