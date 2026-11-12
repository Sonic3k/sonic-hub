/* ── AI: plays with its own fog of war (no peeking), one of four plans, and reacts to what it scouts ── */
const AI_STRATS = {
  rush:   { name: 'Đánh sớm',     vill: [10, 15, 22, 28], ageAt: [0, 10, 15, 22], mil: [0.6, 0.6, 0.55, 0.5], attack: 1.0, raid: 1, towers: 0, walls: 0, towns: 0, wonder: 0, relic: 0.6, early: 1 },
  boom:   { name: 'Phát triển',   vill: [13, 24, 34, 42], ageAt: [0, 12, 22, 31], mil: [0.08, 0.25, 0.5, 0.6], attack: 1.2, raid: 0, towers: 1, walls: 0, towns: 2, wonder: 0, relic: 0.8, early: 0 },
  turtle: { name: 'Phòng thủ',    vill: [12, 22, 32, 40], ageAt: [0, 11, 20, 28], mil: [0.25, 0.3, 0.4, 0.35], attack: 1.4, raid: 0, towers: 2, walls: 1, towns: 1, wonder: 1, relic: 1.6, early: 0 },
  relic:  { name: 'Giữ thánh địa', vill: [12, 20, 30, 36], ageAt: [0, 11, 20, 30], mil: [0.4, 0.45, 0.5, 0.5], attack: 1.1, raid: 0, towers: 1, walls: 0, towns: 1, wonder: 0, relic: 2, early: 0 },
};
const simplePower = st => { let p = 0; for (const t in st) p += (st[t] || 0) * UNITS[t].str; return p; };
function knownEnemy(S, me, r, maxAge) {
  const I = enemySeen(S, me, r);
  if (!I || I.age > maxAge) return null;
  if (I.units) return { units: I.units, p: simplePower(I.units) * (1 + 0.15 * I.age) };
  return { units: null, p: (I.n || 0) * 4.2 * (1 + 0.15 * I.age) };
}
function enemyComp(S, me) {
  const c = {};
  for (const r of REGION_IDS) { const I = enemySeen(S, me, r); if (I && I.age <= 4 && I.units) addTo(c, I.units); }
  const CI = S.sides[me].capIntel;
  if (CI && S.turn - CI.turn <= 6) { if (CI.bld.stable) c.cav = (c.cav || 0) + 2 * CI.bld.stable; if (CI.bld.range) c.archer = (c.archer || 0) + 2 * CI.bld.range; if (CI.bld.barracks && !c.spear) c.spear = 1; }
  return c;
}
function enemyTotalEstimate(S, me) {
  let seen = 0;
  for (const r of REGION_IDS) { const k = knownEnemy(S, me, r, 3); if (k) seen += k.p; }
  return Math.max(seen, Math.max(0, S.turn - 3) * 1.3 * S.sides[1 - me].age);
}
function threatMap(S, me) {
  const out = {};
  for (const r of REGION_IDS) {
    const k = knownEnemy(S, me, r, 1);
    if (!k || !k.p) continue;
    const mounted = k.units ? Object.keys(k.units).length > 0 && Object.keys(k.units).every(t => MOUNTED.has(UNITS[t].cls)) : false;
    const reach = pathsFrom(S, 1 - me, r, mounted ? 2 : 1);
    out[r] = (out[r] || 0) + k.p;
    for (const x in reach) out[x] = (out[x] || 0) + k.p * (reach[x].length > 2 ? 0.5 : 0.85);
  }
  return out;
}
function defenseAt(S, me, r) {
  const P = S.sides[me];
  let p = simplePower(P.army[r] || {}) + (P.towers[r] || 0) * 7 + (P.castles[r] > 0 ? 25 : 0) + (P.towns[r] ? 8 : 0);
  if (r === capOf(me)) p += (10 + (jobsIn(P, r) + P.idle) * 0.4) * (P.bld.walls ? 1.3 : 1);
  return p;
}
const myPower = (S, me) => { let p = 0; for (const r in S.sides[me].army) p += simplePower(S.sides[me].army[r]); return p; };

function aiPlan(S, me) {
  const P = S.sides[me];
  if (!P.ai.strat) P.ai.strat = wpick(S, Object.entries(CIVS[P.civ].ai));
  const st = AI_STRATS[P.ai.strat];
  if (P.pendingCard) chooseCard(S, me, aiCard(S, me, st));
  const T = threatMap(S, me);
  aiResearch(S, me, st, T);
  aiJobs(S, me, st, T);
  aiBuilds(S, me, st, T);
  aiTrain(S, me, st, T);
  aiMoves(S, me, st, T);
  aiScout(S, me, st);
}
function aiCard(S, me, st) {
  const opts = S.sides[me].pendingCard;
  const pref = { rush: ['civ', 'levy', 'spies', 'smith', 'imperial', 'trebuchet'], boom: ['tax', 'civ', 'academy', 'smith', 'imperial'], turtle: ['civ', 'masonry', 'academy', 'wonders', 'tax'], relic: ['civ', 'spies', 'smith', 'imperial', 'masonry'] }[S.sides[me].ai.strat];
  for (const p of pref) { const hit = opts.find(o => (p === 'civ' ? !!CARDS[o].civ : o === p)); if (hit) return hit; }
  return opts[0];
}
function aiResearch(S, me, st, T) {
  const P = S.sides[me];
  const danger = (T[capOf(me)] || 0) > defenseAt(S, me, capOf(me)) * 0.9;
  P.ai.saving = null;
  if (P.age < 4 && villCount(P) >= st.ageAt[P.age] && !danger) {
    const c = costOf(S, me, 'age');
    if (canAfford(P, c)) { planResearch(S, me, 'age'); return; }
    const close = RES.every(r => (P.res[r] || 0) >= (c[r] || 0) * 0.5);
    P.ai.saving = close ? c : Object.fromEntries(Object.entries(c).map(([r, v]) => [r, Math.round(v * 0.5)]));
    return;
  }
  const prefs = P.age >= 3 ? ['armor', 'wheel', 'forge', 'mine', 'plow', 'saw'] : (P.ai.strat === 'boom' || P.ai.strat === 'turtle') ? ['plow', 'saw', 'mine', 'forge'] : ['forge', 'plow', 'mine', 'saw'];
  for (const id of prefs) {
    if (P.techs.includes(id) || P.age < TECHS[id].age) continue;
    const c = costOf(S, me, 'tech', id);
    if (RES.every(r => (P.res[r] || 0) >= (c[r] || 0) * 1.6)) { planResearch(S, me, id); return; }
  }
}
function aiJobs(S, me, st, T) {
  const P = S.sides[me], cap = capOf(me), home = homeOf(me);
  for (const j in P.jobs) { P.idle += P.jobs[j]; delete P.jobs[j]; }
  const V = P.idle;
  let w = P.age === 1 ? { food: 0.62, wood: 0.38, gold: 0 } : P.age === 2 ? { food: 0.45, wood: 0.3, gold: 0.25 } : { food: 0.4, wood: 0.25, gold: 0.35 };
  if (P.age === 1 && villCount(P) >= st.ageAt[1] - 3) w = { food: 0.75, wood: 0.25, gold: 0 };
  if (P.age >= 3 && st.wonder) w = { food: 0.22, wood: 0.38, gold: 0.4 };
  const stock = P.res, sum = stock.food + stock.wood + stock.gold + 1;
  for (const r of RES) if (stock[r] / sum > 0.55 && w[r] > 0.15) { w[r] -= 0.1; const o = RES.filter(x => x !== r); w[o[0]] += 0.05; w[o[1]] += 0.05; }
  const backup = myPower(S, me) * 0.6;
  const safe = r => r === cap || (T[r] || 0) <= defenseAt(S, me, r) + (P.jobs[r] || 0) * 0.5 + backup;
  const mids = ['n', 's'].filter(r => jobOpen(S, me, r) && safe(r)).sort((a, b) => (S.owner[b] === me) - (S.owner[a] === me) || (P.towers[b] || 0) - (P.towers[a] || 0));
  const lists = { food: [cap, home[1]], wood: [home[2]], gold: [cap + 'g', ...mids] };
  const want = { food: Math.round(V * w.food), wood: Math.round(V * w.wood) };
  want.gold = Math.max(0, V - want.food - want.wood);
  const fill = (res, n) => {
    for (const j of lists[res]) {
      if (n <= 0) break;
      if (!jobOpen(S, me, j) || !safe(JOBS[j].region)) continue;
      const room = JOBS[j].slots - (P.jobs[j] || 0), k = Math.min(room, n, P.idle);
      if (k > 0) { P.jobs[j] = (P.jobs[j] || 0) + k; P.idle -= k; n -= k; }
    }
    return n;
  };
  let spill = 0;
  for (const r of ['gold', 'wood', 'food']) spill += fill(r, want[r]);
  for (const r of ['food', 'wood', 'gold']) if (spill > 0) spill = fill(r, spill);
}
function desiredUnits(S, me) {
  const P = S.sides[me], comp = enemyComp(S, me), tot = total(comp);
  const out = [];
  for (const t of unitsFor(S, me)) {
    const U = UNITS[t];
    if (t === 'siege' || P.age < U.age) continue;
    if (U.bld === 'castle' && !castleCount(P)) continue;
    let eff = 1;
    if (tot) { eff = 0; for (const e in comp) eff += comp[e] / tot * vsMult(t, e); }
    const c = costOf(S, me, 'unit', t), price = (c.food || 0) + (c.wood || 0) + (c.gold || 0) * 1.25;
    let v = U.str * eff / price * 100;
    if (U.civ) v *= 1.15;
    if (P.ai.strat === 'rush' && MOUNTED.has(U.cls)) v *= 1.15;
    if (!tot && t === 'spear' && P.age >= 2) v *= 0.8;
    out.push([t, v]);
  }
  return out.sort((a, b) => b[1] - a[1]).map(x => x[0]);
}
function aiBuilds(S, me, st, T) {
  const P = S.sides[me], cap = capOf(me), home = homeOf(me), age = P.age, B = k => P.bld[k] || 0;
  const danger = Object.keys(T).some(r => homeOf(me).includes(r) && T[r] > defenseAt(S, me, r));
  const tries = [];
  if (!B('barracks') && (st.early || S.turn >= 3 || danger)) tries.push(['barracks', cap]);
  if (age >= 2) {
    if (st.walls && !B('walls')) tries.push(['walls', cap]);
    for (const t of desiredUnits(S, me).filter(t => UNITS[t].bld !== 'castle').slice(0, 2)) { const b = UNITS[t].bld; if (B(b) < (age >= 3 ? 2 : 1)) tries.push([b, cap]); }
    if (townCount(P) < st.towns) tries.push(['town', S.owner[home[1]] === me ? home[1] : home[2]]);
    if (st.towers) for (const r of [home[1], home[2], 'n', 's', 'm']) if (S.owner[r] === me && (P.towers[r] || 0) < st.towers && (jobsIn(P, r) > 0 || (r === 'm' && st.relic > 1))) tries.push(['tower', r]);
  }
  if (age >= 3) {
    if (castleCount(P) < 1) tries.push(['castle', st.relic > 1 && S.owner.m === me ? 'm' : cap]);
    else if (castleCount(P) < 2 && S.owner.m === me && !(P.castles.m > 0) && (st.relic > 1 || P.ai.strat === 'turtle')) tries.push(['castle', 'm']);
    if (P.ai.siege && !B('workshop')) tries.push(['workshop', cap]);
  }
  if (age >= 4 && st.wonder && !P.wonder) tries.push(['wonder', cap]);
  for (const [k, r] of tries) {
    if (P.orders.builds.length >= AGES[age].builds) break;
    const c = costOf(S, me, 'bld', k);
    if (P.ai.saving && RES.some(x => c[x] && P.ai.saving[x] && P.res[x] - c[x] < P.ai.saving[x]) && k !== 'barracks') continue;
    if (!buildCheck(S, me, k, r)) planBuild(S, me, k, r);
  }
}
function aiTrain(S, me, st, T) {
  const P = S.sides[me], age = P.age, cap = capOf(me);
  const reserve = P.ai.saving || {};
  const keep = r => reserve[r] || 0;
  const valued = REGION_IDS.filter(r => r === cap || jobsIn(P, r) > 0);
  const gap = Math.max(0, ...valued.map(r => (T[r] || 0) - defenseAt(S, me, r)));
  const foeWonder = S.sides[1 - me].wonder, foeRelic = S.sides[1 - me].relic;
  const occupied = homeOf(me).some(r => S.owner[r] === 1 - me || (knownEnemy(S, me, r, 1) || { p: 0 }).p > 0);
  const pressure = gap > 0 || occupied || foeWonder || foeRelic >= RELIC_WIN - 4;
  // villagers first (unless the enemy is at the gates)
  const wantV = P.idle > 1 ? 0 : st.vill[age - 1] - villCount(P);
  for (let k = 0; k < Math.min(prodCap(S, me, 'vill'), wantV); k++) {
    if (gap > 0 && k >= 1) break;
    if (P.res.food - VILL_COST.food < keep('food') && !pressure) break;
    if (!planTrain(S, me, 'vill', 1).ok) break;
  }
  // siege when we mean to finish the job
  const eTot = enemyTotalEstimate(S, me);
  const maxed = popNow(S, me) >= popCap(S, me) * 0.8;
  P.ai.siege = age >= 3 && (myPower(S, me) > eTot * 1.1 || maxed || foeWonder || P.ai.strat === 'rush');
  if (P.ai.siege && prodCap(S, me, 'siege')) { const have = Object.values(P.army).reduce((a, s2) => a + (s2.siege || 0), 0); for (let k = have; k < 4; k++) if (!planTrain(S, me, 'siege', 1).ok) break; }
  // soldiers
  const share = pressure ? 1 : age === 1 ? st.mil[0] : Math.max(st.mil[age - 1], P.ai.strat === 'boom' && age === 2 ? 0.5 : 0.85);
  const budget = {}; for (const r of RES) budget[r] = Math.max(0, (P.res[r] - keep(r)) * share);
  const types = desiredUnits(S, me).filter(t => prodCap(S, me, t) > 0);
  if (!types.length) return;
  let progress = true, spent = { food: 0, wood: 0, gold: 0 };
  while (progress) {
    progress = false;
    for (const t of types.slice(0, 3)) {
      const c = costOf(S, me, 'unit', t);
      if (RES.some(r => (c[r] || 0) + spent[r] > budget[r] + 0.01)) continue;
      if (planTrain(S, me, t, 1).ok) { for (const r in c) spent[r] += c[r]; progress = true; }
    }
  }
}
function stepToward(S, me, from, to, units) {
  const range = moveRange(S, me, units), paths = pathsFrom(S, me, from, 8);
  const full = paths[to];
  if (!full) return false;
  const dest = full[Math.min(range, full.length - 1)];
  return planMove(S, me, from, dest, units).ok;
}
function aiMoves(S, me, st, T) {
  const P = S.sides[me], cap = capOf(me), foe = 1 - me, F = S.sides[foe];
  const stacks = Object.keys(P.army).filter(r => total(availableAt(S, me, r)) > 0);
  if (!stacks.length) return;
  const pow = myPower(S, me);
  const moveAll = to => { for (const r of stacks) if (r !== to) stepToward(S, me, r, to, availableAt(S, me, r)); };
  // 1. defend what matters
  const valued = REGION_IDS.filter(r => r === cap || jobsIn(P, r) > 0 || P.towns[r] || (r === 'm' && S.owner.m === me && st.relic >= 1));
  let worst = null, worstGap = 0;
  for (const r of valued) { const g = (T[r] || 0) - defenseAt(S, me, r); if (g > worstGap) { worstGap = g; worst = r; } }
  if (worst) {
    if (pow + defenseAt(S, me, worst) - simplePower(P.army[worst] || {}) >= (T[worst] || 0) * 0.8) moveAll(worst);
    else moveAll(cap);
    return;
  }
  // 2. strike
  const eTot = enemyTotalEstimate(S, me);
  const cands = [];
  for (const r of REGION_IDS) {
    if (S.owner[r] === me && !(r === 'm')) continue;
    if (homeOf(me).includes(r) && S.owner[r] === foe) { const k = knownEnemy(S, me, r, 2); cands.push({ r, def: (k ? k.p : eTot * 0.4) + 2, value: 30 }); continue; }
    const k = knownEnemy(S, me, r, 2), I = enemySeen(S, me, r);
    let def = k ? k.p : eTot * 0.5;
    if (I && I.age <= 3) def += I.towers * 7 + (I.castle ? 25 : 0) + (I.town ? 8 : 0);
    if (S.owner[r] === foe) def *= 1 + (REGIONS[r].terrain ? TERRAIN_DEF[REGIONS[r].terrain] || 0 : 0);
    let value = 0;
    if (r === capOf(foe)) {
      const sieges = Object.values(P.army).reduce((a, s2) => a + (s2.siege || 0), 0);
      if (!sieges && !F.wonder) continue;
      def += 16 * (P.capIntel && P.capIntel.bld.walls ? 1.3 : 1);
      value = 10 + (F.wonder ? 60 : 0) + sieges * 2 + (sieges >= 2 && myPower(S, me) >= eTot * 2 ? 40 : 0);
    } else if (r === 'm') {
      if (S.owner.m === me && total(P.army.m || {})) continue;
      value = 4 + st.relic * 5 + (F.relic >= RELIC_WIN - 4 ? 40 : 0);
    } else if (REGIONS[r].kind === 'gold') value = 4 + (I && I.vills ? I.vills * 2 : 0);
    else value = (I && I.vills ? I.vills * 2.5 : 2) + (st.raid ? 3 : 0);
    cands.push({ r, def, value });
  }
  cands.sort((a, b) => b.value / (b.def + 5) - a.value / (a.def + 5));
  const maxed = popNow(S, me) >= popCap(S, me) * 0.85;
  const desperate = F.wonder || F.relic >= RELIC_WIN - 3;
  const need = desperate ? 0.75 : maxed ? Math.min(st.attack, 0.95) : st.attack;
  const target = cands.find(c => pow >= need * c.def && pow > 6);
  if (target) {
    const guard = st.raid ? 0 : 0.25;
    const holdM = S.owner.m === me && P.age >= 3 && target.r !== 'm';
    for (const r of stacks) {
      const av = availableAt(S, me, r);
      const keepFrac = r === 'm' && holdM ? 0.5 : r === cap && guard ? guard : 0;
      if (keepFrac && total(av) > 3) { const send = {}; for (const t in av) send[t] = Math.floor(av[t] * (1 - keepFrac)); if (total(send)) stepToward(S, me, r, target.r, send); }
      else if (r !== target.r && !(r === 'm' && holdM)) stepToward(S, me, r, target.r, av);
    }
    P.ai.target = target.r;
    return;
  }
  // 3. raiders slip out (mounted only) — always worth it while the enemy army sits on the monastery
  const foeCamped = (knownEnemy(S, me, 'm', 1) || { p: 0 }).p > 8 && S.owner.m === foe;
  if (st.raid || P.civ === 'mongol' || foeCamped) {
    for (const r of stacks) {
      const av = availableAt(S, me, r), mounted = {};
      for (const t in av) if (MOUNTED.has(UNITS[t].cls)) mounted[t] = av[t];
      if (total(mounted) < 3) continue;
      const prey = REGION_IDS.filter(x => { const I = enemySeen(S, me, x); return S.owner[x] === foe && REGIONS[x].kind !== 'capital' && (!I || (I.age <= 3 && !(I.n > 0) && I.towers < 2)); });
      if (prey.length) { stepToward(S, me, r, prey[0], mounted); }
    }
  }
  // 4. hold the monastery or stage at the front
  if (S.owner.m === me && total(P.army.m || {}) && (st.relic >= 1 || P.age >= 3)) { for (const r of stacks) { const av = availableAt(S, me, r); if (total(av) && r !== 'm' && r !== cap) stepToward(S, me, r, 'm', av); } return; }
  const front = st.relic >= 1 && pow >= (knownEnemy(S, me, 'm', 2) || { p: eTot * 0.4 }).p * 1.2 ? 'm' : (st.early ? homeOf(me)[1] : cap);
  for (const r of stacks) { const av = availableAt(S, me, r); if (total(av) && r !== front) stepToward(S, me, r, front, av); }
}
function aiScout(S, me, st) {
  const P = S.sides[me], fc = capOf(1 - me);
  if (!P.capIntel || S.turn - P.capIntel.turn >= 4) { planScout(S, me, fc); return; }
  const t = P.ai.target;
  if (t && P.vis[t] !== 'full') { planScout(S, me, t); return; }
  const cands = ['m', 'n', 's', homeOf(1 - me)[1], homeOf(1 - me)[2]].filter(r => P.vis[r] !== 'full');
  if (cands.length) planScout(S, me, cands[S.turn % cands.length]);
}
