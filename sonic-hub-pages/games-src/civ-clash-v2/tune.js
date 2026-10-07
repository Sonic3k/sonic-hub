// Balance loop. node tune.js [iterations=6] [duel games per pair=16] [3-4 player games=10000] [seed=1] [--measure] [--write] [--only=civ,civ]
// Each iteration plays every duel pairing both ways plus random 3- and 4-player tables (AI vs AI, fresh seeds), split over all CPU cores,
// then moves each civ's duel HP (hp2) and table HP (hp4) toward a fair share by the measured worth of one HP.
// --only limits the HP changes to the listed civs (everyone still plays). --anchor=13,14 keeps the average duel / table HP there
// (only relative HP decides who wins; the average sets how long games last). --write saves the final HP into the region files.
const fs = require('fs'), path = require('path'), os = require('os'), { fork } = require('child_process');
const CORE = path.join(__dirname, 'src', 'core');

if (process.argv[2] === '--worker') {
  /* worker: play the games it is sent with the HP it is sent, and report wins */
  const { play } = require('./sim.js');
  process.on('message', job => {
    for (const [c, hp2, hp4] of job.hp) { CIVS[c].hp2 = hp2; CIVS[c].hp4 = hp4; }
    const out = { dw: {}, dg: {}, mx: {}, mg: {}, first: 0, duels: 0, rounds: [], mrounds: [], wonder: 0, seat4: [0, 0, 0, 0], n4: 0 };
    for (const c of CIV_ORDER) out.dw[c] = out.dg[c] = out.mx[c] = out.mg[c] = 0;
    for (const g of job.games) {
      const S = play(g.seed, g.civs);
      if (g.civs.length === 2) {
        out.duels++; if (S.winner === 0) out.first++; out.rounds.push(S.round); if (S.wonderWin) out.wonder++;
        for (const P of S.players) { out.dg[P.civ]++; if (S.winner === P.id) out.dw[P.civ]++; }
      } else {
        const n = g.civs.length; out.mrounds.push(S.round);
        if (n === 4) { out.n4++; if (S.winner >= 0) out.seat4[S.winner]++; }
        for (const P of S.players) { out.mg[P.civ]++; out.mx[P.civ] += (S.winner === P.id ? 1 : 0) - 1 / n; }
      }
    }
    process.send(out);
  });
  return;
}

const { play } = require('./sim.js');
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const iters = args[0] !== undefined ? +args[0] : 6, N = +args[1] || 16, MG = +args[2] || 10000, seed0 = +args[3] || 1;
const measureOnly = process.argv.includes('--measure');
const onlyArg = process.argv.find(a => a.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const anchorArg = process.argv.find(a => a.startsWith('--anchor='));
const anchor = anchorArg ? anchorArg.slice(9).split(',').map(Number) : null;
function applyAnchor() {
  if (!anchor) return;
  for (const [k, t] of [['hp2', anchor[0]], ['hp4', anchor[1]]]) {
    const mean = ids.reduce((a, c) => a + CIVS[c][k], 0) / ids.length, d = Math.round(t - mean);
    if (d) for (const c of ids) CIVS[c][k] = Math.max(6, CIVS[c][k] + d);
  }
}
const ids = CIV_ORDER;
const workers = Array.from({ length: Math.max(1, os.cpus().length) }, () => fork(__filename, ['--worker']));

function measure(base) {
  const games = [];
  let k = 0;
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (let r = 0; r < N; r++)
    games.push({ seed: (base + (k++) * 7919) >>> 0, civs: r % 2 ? [ids[i], ids[j]] : [ids[j], ids[i]] });
  for (let g = 0; g < MG; g++) {
    const n = g % 2 ? 3 : 4;
    games.push({ seed: (base + 900007 + g * 104729) >>> 0, civs: shuffled({ rs: (base + 500009 + g * 31) >>> 0 }, ids).slice(0, n) });
  }
  const hp = ids.map(c => [c, CIVS[c].hp2, CIVS[c].hp4]);
  return Promise.all(workers.map((w, wi) => new Promise(res => { w.once('message', res); w.send({ hp, games: games.filter((_, gi) => gi % workers.length === wi) }); })))
    .then(parts => {
      const T = { dw: {}, dg: {}, mx: {}, mg: {}, first: 0, duels: 0, rounds: [], mrounds: [], wonder: 0, seat4: [0, 0, 0, 0], n4: 0 };
      for (const c of ids) T.dw[c] = T.dg[c] = T.mx[c] = T.mg[c] = 0;
      for (const p of parts) {
        for (const c of ids) { T.dw[c] += p.dw[c]; T.dg[c] += p.dg[c]; T.mx[c] += p.mx[c]; T.mg[c] += p.mg[c]; }
        T.first += p.first; T.duels += p.duels; T.wonder += p.wonder; T.n4 += p.n4; T.rounds.push(...p.rounds); T.mrounds.push(...p.mrounds);
        p.seat4.forEach((v, i) => { T.seat4[i] += v; });
      }
      const r = {}; for (const c of ids) r[c] = { duel: T.dw[c] / T.dg[c], multi: T.mx[c] / T.mg[c] };
      T.rounds.sort((a, b) => a - b); T.mrounds.sort((a, b) => a - b);
      return { r, first: T.first / T.duels, wonder: T.wonder / T.duels, seat4: T.seat4.map(x => x / T.n4), med: T.rounds[T.rounds.length >> 1], mmed: T.mrounds[T.mrounds.length >> 1] };
    });
}
const pct = x => (Math.round(x * 1000) / 10).toFixed(1);
(async () => {
  applyAnchor();
  for (let it = 0; it <= iters; it++) {
    const t0 = Date.now(), M = await measure((seed0 * 1000003 + it * 777767) >>> 0);
    const d = ids.map(c => M.r[c].duel), m = ids.map(c => M.r[c].multi);
    console.log(`iter ${it} (${Math.round((Date.now() - t0) / 1000)}s): duel ${pct(Math.min(...d))}–${pct(Math.max(...d))}% | table ${pct(Math.min(...m))}..+${pct(Math.max(...m))} | first ${pct(M.first)}% | 4p seats ${M.seat4.map(pct).join('/')} | wonder ${pct(M.wonder)}% | rounds ${M.med}/${M.mmed}`);
    console.log('  ' + ids.map(c => `${c}:${pct(M.r[c].duel)}/${pct(M.r[c].multi)}(${CIVS[c].hp2}/${CIVS[c].hp4})`).join(' '));
    if (it === iters || measureOnly) break;
    /* one HP is worth about 3 points of duel win rate and 3 points of table share (measured): step by that much, at most 2 HP at a
       time (1 after the first pass), and only when the gap is clearly bigger than the noise */
    const cap = it === 0 ? 2 : 1;
    for (const c of ids) {
      if (only && !only.has(c)) continue;
      const gd = M.r[c].duel - 0.5, gm = M.r[c].multi;
      const sd = Math.abs(gd) > 0.03 ? clamp(Math.round(-gd / 0.032), -cap, cap) || -Math.sign(gd) : 0;
      const sm = Math.abs(gm) > 0.025 ? clamp(Math.round(-gm / 0.03), -cap, cap) || -Math.sign(gm) : 0;
      CIVS[c].hp2 = Math.max(6, CIVS[c].hp2 + sd); CIVS[c].hp4 = Math.max(6, CIVS[c].hp4 + sm);
    }
    applyAnchor();
  }
  if (process.argv.includes('--write')) {
    /* each civilization's HP lives in its region file */
    for (const f of fs.readdirSync(CORE).filter(f => f.endsWith('.js'))) {
      const p = path.join(CORE, f); let src = fs.readFileSync(p, 'utf8'); const before = src;
      for (const c of ids) src = src.replace(new RegExp(`(\\n  ${c}: \\{[^\\n]*?hp2: )\\d+(, hp4: )\\d+`), `$1${CIVS[c].hp2}$2${CIVS[c].hp4}`);
      if (src !== before) fs.writeFileSync(p, src);
    }
    console.log('wrote HP to the region files');
  }
  for (const w of workers) w.kill();
})();
