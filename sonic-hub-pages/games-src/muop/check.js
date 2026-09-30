// Usage: node check.js [levelId ...]   — runs the real World+Player physics headlessly.
const fs = require('fs'), vm = require('vm'), path = require('path');
const SRC = path.join(__dirname, 'src') + '/';
global.document = { createElement: () => ({ getContext: () => ({}) }) };
for (const f of ['00-core.js', '15-world.js', '20-player.js', '10-levels.js']) vm.runInThisContext(fs.readFileSync(SRC + f, 'utf8'), { filename: f });

function simLevel(def, opts = {}) {
  const W = new World(def);
  const abil = { wall: def.id >= 5, dash: def.id >= 9, ...(opts.abil || {}) };
  const ents = W.ents;
  const find = ch => ents.filter(e => e.ch === ch);
  const start = find('P')[0];
  const goalE = find('G')[0];
  const goal = goalE && { x: goalE.x * 16, y: goalE.y * 16 - 40, w: 16, h: 56 };
  const stars = find('*').map(e => ({ x: e.x * 16 + 2, y: e.y * 16 + 2, w: 12, h: 12 }));
  const cps = find('F').map(e => ({ x: e.x * 16 + 2, y: e.y * 16 - 16, w: 12, h: 32 }));
  const springs = find('s').map(e => ({ x: e.x * 16 + 1, y: e.y * 16 + 8, w: 14, h: 8 }));
  const crystals = find('d').map(e => ({ x: e.x * 16 + 2, y: e.y * 16 + 2, w: 12, h: 12 }));
  const keys = [...find('k').map(e => ({ c: 'gold', x: e.x * 16 + 2, y: e.y * 16 + 5, w: 12, h: 7 })), ...find('j').map(e => ({ c: 'teal', x: e.x * 16 + 2, y: e.y * 16 + 5, w: 12, h: 7 }))];
  const abilityItem = find('W')[0];
  const warps = {};
  for (const e of ents) if ('1234'.includes(e.ch)) (warps[e.ch] = warps[e.ch] || []).push({ x: e.x * 16 + 2, y: e.y * 16 - 8, w: 12, h: 24, n: e.ch });
  // moving platforms: over-approximate their whole rail as one-way ledges
  for (const e of ents) {
    if (e.ch === 'm') { let k = e.x + 1; while (k < W.w && W.rows[e.y][k] !== ':') k++; if (k >= W.w) { k = e.x - 1; while (k >= 0 && W.rows[e.y][k] !== ':') k--; } for (let x = Math.min(e.x, k); x <= Math.max(e.x, k) + 2; x++) if (W.tiles[e.y * W.w + x] === 0) W.tiles[e.y * W.w + x] = T.ONEWAY; }
    if (e.ch === 'n') { let k = e.y - 1; while (k >= 0 && W.rows[k][e.x] !== ':') k--; if (k < 0) { k = e.y + 1; while (k < W.h && W.rows[k][e.x] !== ':') k++; } for (let y = Math.min(e.y, k); y <= Math.max(e.y, k); y += 2) for (let x = e.x; x <= e.x + 2; x++) if (W.tiles[y * W.w + x] === 0) W.tiles[y * W.w + x] = T.ONEWAY; }
  }
  if (opts.noBreak === false) for (let i = 0; i < W.tiles.length; i++) if (W.tiles[i] === T.BREAK) W.tiles[i] = T.EMPTY;
  const base = W.tiles.slice();
  // door groups
  const doorGroups = [];
  const seen = new Set();
  for (let i = 0; i < base.length; i++) {
    if ((base[i] === T.DOOR_GOLD || base[i] === T.DOOR_TEAL) && !seen.has(i)) { const g = W.doorGroup(i % W.w, (i / W.w) | 0); g.forEach(j => seen.add(j)); doorGroups.push({ c: base[i] === T.DOOR_GOLD ? 'gold' : 'teal', tiles: g }); }
  }
  const doorOf = new Map(); doorGroups.forEach((g, gi) => g.tiles.forEach(j => doorOf.set(j, gi)));
  const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const applyState = st => {
    W.tiles.set(base);
    for (let gi = 0; gi < doorGroups.length; gi++) if (st.doors & (1 << gi)) for (const j of doorGroups[gi].tiles) W.tiles[j] = T.EMPTY;
    W.sw = st.sw; W.ghost.clear(); W.swCooldown = 0; W.crumble.clear();
  };
  const held = (st, c) => { let n = 0; keys.forEach((k, i) => { if (k.c === c && (st.keys & (1 << i))) n++; }); doorGroups.forEach((g, gi) => { if (g.c === c && (st.doors & (1 << gi))) n--; }); return n; };
  const reach = { goal: false, stars: new Set(), cps: new Set(), keys: new Set(), maxX: 0 };
  const stub = { abilities: abil, wind: 0, fx() {}, bump(tx, ty, p) { if (W.code(tx, ty) === T.SWITCH) W.toggleSwitch(p); }, hitSwitch(tx, ty, p) { W.toggleSwitch(p); }, breakColumn() { return false; } };
  // policies: functions (frame, player, mem) -> input
  const P = [];
  const mkJump = (d0, pre, h, dirFn) => f => { const dir = f < pre ? d0 : dirFn(f - pre); return { left: dir < 0, right: dir > 0, jump: f >= pre && f < pre + h, dash: false }; };
  for (const d0 of [-1, 1]) for (const n of [8, 22]) P.push(f => ({ left: d0 < 0 && f < n, right: d0 > 0 && f < n, jump: false }));
  for (const d0 of [-1, 0, 1]) for (const pre of d0 ? [0, 12] : [0]) for (const h of [2, 7, 13, 40]) for (const d1 of d0 ? [d0, 0, -d0] : [-1, 0, 1]) P.push(mkJump(d0, pre, h, () => d1));
  for (const d of [-1, 1]) for (const k of [8, 16, 26]) P.push(mkJump(0, 0, 40, g => (g < k ? 0 : d)));
  for (const d of [-1, 1]) for (const k of [10, 20]) P.push(mkJump(d, 12, 40, g => (g < k ? d : -d)));
  if (abil.wall) {
    for (const d0 of [-1, 1]) for (const pre of [0, 12]) for (const mode of ['zig', 'same', 'slide']) P.push((f, p, m) => {
      if (m.dir === undefined) { m.dir = d0; m.jumpUntil = pre + 40; m.lastWJ = -99; }
      const inp = { left: false, right: false, jump: false };
      if (f >= pre && f < m.jumpUntil) inp.jump = true;
      if (mode !== 'slide' && f > pre + 2 && p.wallDir && f - m.lastWJ > 10) {
        m.lastWJ = f; m.jumpUntil = f + 40; inp.jump = false; m.wantPress = true;
        if (mode === 'zig') m.dir = -p.wallDir; else m.dir = p.wallDir;
      }
      if (m.wantPress && f === m.lastWJ + 1) { inp.jump = true; m.wantPress = false; }
      const dir = f < pre ? d0 : m.dir;
      if (dir < 0) inp.left = true; if (dir > 0) inp.right = true;
      return inp;
    });
  }
  if (abil.dash) {
    for (const d0 of [-1, 1]) for (const pre of [0, 12]) for (const df of [0, 10, 20, 30]) for (const h of [40, 8]) P.push((f, p) => ({ left: d0 < 0, right: d0 > 0, jump: f >= pre && f < pre + h, dash: f === pre + df }));
    // two dashes (a crystal refills the second)
    for (const d0 of [-1, 1]) for (const pre of [0, 12]) for (const [a, b] of [[14, 26], [18, 32], [22, 36], [10, 24]]) P.push(f => ({ left: d0 < 0, right: d0 > 0, jump: f >= pre && f < pre + 40, dash: f === pre + a || f === pre + b }));
    for (const d0 of [-1, 1]) for (const [a, b, c] of [[14, 28, 42], [18, 32, 46]]) P.push(f => ({ left: d0 < 0, right: d0 > 0, jump: f < 40, dash: f === a || f === b || f === c }));
    // dash then wall-cling toward a wall
    for (const d0 of [-1, 1]) P.push((f, p, m) => { const inp = { left: d0 < 0, right: d0 > 0, jump: (f < 40) || (f > 50 && f < 90), dash: f === 16 }; return inp; });
  }
  const key = (p, st) => { const cx = Math.floor((p.x + 5) / 16), cy = Math.floor((p.y + 14) / 16), half = ((p.x + 5) % 16) < 8 ? 0 : 1; return cx + ',' + cy + ',' + half + '|' + st.sw + '|' + st.doors + '|' + st.keys; };
  const q = [], visited = new Map();
  const p0 = new Player(start.x * 16 + 3, start.y * 16 + 16 - PHYS.H);
  let st0 = { sw: 0, doors: 0, keys: 0 };
  // settle onto the ground
  applyState(st0);
  for (let i = 0; i < 30; i++) p0.update({}, W, stub);
  const push = (p, st, from) => { const k = key(p, st); if (visited.has(k)) return; visited.set(k, { x: p.x, y: p.y, st, from }); q.push([p, st, k]); };
  push(p0, st0, null);
  const clone = p => { const c = new Player(0, 0); Object.assign(c, p); c.platform = null; return c; };
  let sims = 0;
  const limitNodes = opts.limit || 60000;
  while (q.length && visited.size < limitNodes) {
    const [pn, stn, kn] = q.shift();
    for (const pol of P) {
      applyState(stn);
      const st = { ...stn };
      const p = clone(pn); p.prevJump = false; p.prevDash = false; p.canDashAir = true;
      const mem = {};
      let ok = true, landed = false;
      for (let f = 0; f < 260; f++) {
        const inp = pol(f, p, mem);
        p.update(inp, W, stub); W.stepTiles(); W.updateGhosts(p);
        sims++;
        // entities
        for (const s of springs) if (p.vy >= 0 && ov(p, { x: s.x, y: s.y - 2, w: s.w, h: 6 }) && p.y + p.h - p.vy <= s.y + 4) { p.y = s.y - p.h; p.vy = -PHYS.SPRING; p.springBoost = true; p.jumping = false; p.grounded = false; p.canDashAir = true; }
        for (const c of crystals) if (!p.canDashAir && !p.grounded && ov(p, c)) p.canDashAir = true;
        keys.forEach((k, i) => { if (!(st.keys & (1 << i)) && ov(p, k)) { st.keys |= 1 << i; reach.keys.add(i); } });
        if (doorGroups.length) {
          const x0 = Math.floor((p.x - 2) / 16), x1 = Math.floor((p.x + p.w + 2) / 16), y0 = Math.floor((p.y - 2) / 16), y1 = Math.floor((p.y + p.h + 2) / 16);
          for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) { const gi = doorOf.get(ty * W.w + tx); if (gi !== undefined && !(st.doors & (1 << gi)) && held(st, doorGroups[gi].c) > 0) { st.doors |= 1 << gi; for (const j of doorGroups[gi].tiles) W.tiles[j] = T.EMPTY; } }
        }
        for (const k in warps) { const [a, b] = warps[k]; for (const [u, v] of [[a, b], [b, a]]) if (v && Math.abs(p.x + 5 - (u.x + 6)) < 6 && Math.abs(p.y + 7 - (u.y + 12)) < 10 && !(mem.warped === k)) { p.x = v.x + 6 - 5; p.y = v.y + 24 - 14 - 2; p.vx = 0; p.vy = 0; mem.warped = k; } }
        stars.forEach((s, i) => { if (ov(p, s)) reach.stars.add(i); });
        cps.forEach((c, i) => { if (ov(p, c)) reach.cps.add(i); });
        if (goal && ov(p, goal)) reach.goal = true;
        if (W.spikeHit(p.x + 1, p.y + 1, p.w - 2, p.h - 1) || p.y > W.ph + 8) { ok = false; break; }
        st.sw = W.sw;
        if (f > 3 && p.grounded && Math.abs(p.vx) < 0.05 && !inp.left && !inp.right && !inp.jump) { landed = true; break; }
        if (f > 3 && p.grounded && f > 40 && !inp.jump) { landed = true; break; }
      }
      if (ok && landed) { reach.maxX = Math.max(reach.maxX, p.x); push(p, st, kn); }
    }
  }
  return { reach, nodes: visited.size, sims, stars: stars.length, keys: keys.length, cps: cps.length, visited, W, goalE };
}
const ids = process.argv.slice(2).map(Number);
const list = ids.length ? ids : LEVELS.map(l => l.id);
for (const id of list) {
  const def = LEVELS[id - 1];
  const t0 = Date.now();
  const r = simLevel(def);
  const rb = (r.reach.stars.size < r.stars || !r.reach.goal) ? simLevel(def, { noBreak: false }) : null;
  const starsOk = rb ? rb.reach.stars.size : r.reach.stars.size;
  console.log(`L${id} ${def.name.padEnd(14)} goal:${r.reach.goal ? 'YES' : rb && rb.reach.goal ? 'YES(break)' : 'NO '} stars:${r.reach.stars.size}${rb ? '(+break ' + starsOk + ')' : ''}/${r.stars} keys:${r.reach.keys.size}/${r.keys} cps:${r.reach.cps.size}/${r.cps} nodes:${r.nodes} ${((Date.now() - t0) / 1000).toFixed(1)}s maxX:${(r.reach.maxX / 16) | 0}/${r.W.w}`);
}
module.exports = { simLevel };
if (process.env.DUMP) {
  const id = +process.env.DUMP, def = LEVELS[id - 1], r = simLevel(def, process.env.BREAK ? { noBreak: false } : {});
  const cells = [...r.visited.values()].map(v => [Math.floor((v.x + 5) / 16), Math.floor((v.y + 13) / 16), v.st.sw, v.st.doors, v.st.keys]);
  fs.writeFileSync(path.join(require('os').tmpdir(), 'reach.json'), JSON.stringify({ rows: r.W.rows, cells }));
}
