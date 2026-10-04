/* ── Engine: orders are planned in secret by both sides, then resolved together ── */
const ok = (msg, x) => ({ ok: true, msg: msg || '', ...x });
const no = msg => ({ ok: false, msg });
const total = st => { let n = 0; for (const t in st) n += st[t] > 0 ? st[t] : 0; return n; };
const clean = st => { for (const t in st) if (!(st[t] > 0)) delete st[t]; return st; };
const addTo = (st, u) => { for (const t in u) if (u[t] > 0) st[t] = (st[t] || 0) + u[t]; return st; };
const emptyOrders = () => ({ train: {}, builds: [], research: null, researchCost: null, moves: [], scouts: [] });
const seasonOf = t => SEASONS[(t - 1) % 4];
const yearOf = t => Math.floor((t - 1) / 4) + 1;
const turnLabel = t => `Năm ${yearOf(t)}, ${seasonOf(t).toLowerCase()}`;
function canAfford(P, c) { for (const r in c) if ((P.res[r] || 0) < c[r]) return false; return true; }
function pay(P, c) { for (const r in c) P.res[r] -= c[r]; }
function refund(P, c) { for (const r in c) P.res[r] += c[r]; }
const costText = c => RES.filter(r => c[r]).map(r => `${c[r]} ${RES_NAME[r].toLowerCase()}`).join(', ');

function newSide(civ, side) {
  return {
    civ, side, res: { food: 200, wood: 175, gold: 80 }, age: 1, cards: [], techs: [],
    bld: { barracks: 0, range: 0, stable: 0, workshop: 0, walls: 0 }, castles: {}, towers: {}, towns: {},
    jobs: {}, idle: 0, goldLeft: {}, army: {}, orders: emptyOrders(), pendingCard: null,
    capHP: CAP_HP, relic: 0, wonder: null, intel: {}, capIntel: null, vis: {}, ai: null,
    stats: { kills: 0, lost: 0, villsKilled: 0, villsLost: 0, battlesWon: 0, battlesLost: 0 },
  };
}
function newGame(o) {
  const S = { v: 1, seed: o.seed >>> 0, rs: o.seed >>> 0, turn: 1, owner: {}, sides: [newSide(o.civ0, 0), newSide(o.civ1, 1)], diff: o.diff || 1, report: null, winner: null, over: null, history: [] };
  for (const r of REGION_IDS) S.owner[r] = REGIONS[r].side == null ? null : REGIONS[r].side;
  for (const i of [0, 1]) {
    const P = S.sides[i], c = capOf(i);
    P.jobs[c] = 4; P.jobs[i === 0 ? 'w0' : 'w1'] = 2; P.goldLeft[c + 'g'] = JOBS[c + 'g'].reserve;
    if (o['ai' + i]) P.ai = { strat: o['ai' + i] === true ? null : o['ai' + i] };
  }
  for (const i of [0, 1]) updateVision(S, i, []);
  return S;
}

/* ── modifiers ── */
function modsOf(S, i) {
  const P = S.sides[i];
  const M = { gather: { food: 0, wood: 0, gold: 0 }, str: 0, cavStr: 0, uuStr: 0, cheap: {}, costMul: {}, fort: 0, fortDef: 0, homeDef: 0, defPen: 0, attrition: 0, evac: 0, plunderBase: 0, plunder: 0, scouts: 1, sharp: 0, cheapRes: 0, cheapWonder: 0, fastWonder: 0, cheapCastle: 0, prod: 0, trebuchet: 0, soldierFarm: 0, militia: 0, relicX: 0, retreat: 0, cavMove: 0 };
  const add = e => {
    if (!e) return;
    for (const k in e) {
      if (k === 'gather') for (const r in e.gather) M.gather[r] += e.gather[r];
      else if (k === 'cheap') for (const u in e.cheap) M.cheap[u] = (M.cheap[u] || 0) + e.cheap[u];
      else if (k === 'costMul') for (const u in e.costMul) M.costMul[u] = (M.costMul[u] || 1) * e.costMul[u];
      else M[k] = (M[k] || 0) + e[k];
    }
  };
  add(CIVS[P.civ].mods);
  for (const id of P.techs) add(TECHS[id].eff);
  for (const id of P.cards) add(CARDS[id].eff);
  return M;
}
function costOf(S, i, kind, what) {
  const P = S.sides[i], M = modsOf(S, i);
  let base, mul = 1;
  if (kind === 'vill') base = VILL_COST;
  else if (kind === 'unit') { base = UNITS[what].cost; mul = (1 - (M.cheap[what] || 0)) * (M.costMul[what] || 1); }
  else if (kind === 'bld') { base = BUILDINGS[what].cost; mul = M.costMul[what] || 1; if (what === 'castle') mul *= 1 - M.cheapCastle; if (what === 'wonder') mul *= 1 - M.cheapWonder; }
  else if (kind === 'tech') { base = TECHS[what].cost; mul = 1 - M.cheapRes; }
  else if (kind === 'age') { base = AGES[P.age + 1].cost; mul = 1 - M.cheapRes; }
  const out = {};
  for (const r in base) out[r] = Math.round(base[r] * mul);
  return out;
}

/* ── counting ── */
const villCount = P => sumObj(P.jobs) + P.idle;
const armyCount = P => { let n = 0; for (const r in P.army) n += total(P.army[r]); return n; };
const castleCount = P => Object.values(P.castles).filter(h => h > 0).length;
const townCount = P => Object.values(P.towns).filter(Boolean).length;
const popCap = (S, i) => AGES[S.sides[i].age].cap + 5 * townCount(S.sides[i]);
const popNow = (S, i) => { const P = S.sides[i]; return villCount(P) + armyCount(P) + sumObj(P.orders.train); };
const jobsIn = (P, r) => { let n = 0; for (const j in P.jobs) if (JOBS[j].region === r) n += P.jobs[j]; return n; };
function prodCap(S, i, what) {
  const P = S.sides[i], M = modsOf(S, i), per = AGES[P.age].prod + M.prod;
  if (what === 'vill') return (P.orders.research === 'age' ? 0 : 2) + 2 * townCount(P);
  const U = UNITS[what];
  if (!U || (U.civ && U.civ !== P.civ) || P.age < U.age) return 0;
  if (U.bld === 'castle') return 2 * castleCount(P);
  return (P.bld[U.bld] || 0) * per;
}
const unitsFor = (S, i) => UNIT_ORDER.filter(t => !UNITS[t].civ || UNITS[t].civ === S.sides[i].civ);

/* ── planning API (the player's UI and the AI both use these) ── */
function planTrain(S, i, what, delta) {
  const P = S.sides[i], O = P.orders, cur = O.train[what] || 0;
  const cost = what === 'vill' ? costOf(S, i, 'vill') : costOf(S, i, 'unit', what);
  if (delta < 0) { if (!cur) return no(''); refund(P, cost); if (cur - 1) O.train[what] = cur - 1; else delete O.train[what]; return ok(); }
  const cap = prodCap(S, i, what);
  if (cur + 1 > cap) return no(cap ? `Mỗi lượt chỉ luyện được ${cap}.` : what === 'vill' ? 'Nhà chính đang bận lên đời.' : `Cần ${BUILDINGS[UNITS[what].bld].name.toLowerCase()} trước.`);
  if (popNow(S, i) + 1 > popCap(S, i)) return no(`Đã chạm dân số tối đa ${popCap(S, i)}. Lên đời hoặc xây thị trấn để nuôi thêm.`);
  if (!canAfford(P, cost)) return no(`Thiếu tài nguyên: cần ${costText(cost)}.`);
  pay(P, cost); O.train[what] = cur + 1;
  return ok();
}
function planResearch(S, i, id) {
  const P = S.sides[i], O = P.orders;
  if (O.research) { refund(P, O.researchCost); const was = O.research; O.research = null; O.researchCost = null; if (id == null || id === was) return ok('Đã hủy nghiên cứu.'); }
  let cost;
  if (id === 'age') {
    if (P.age >= 4) return no('Đã ở đời cao nhất.');
    if ((O.train.vill || 0) > 2 * townCount(P)) return no('Nhà chính đang luyện dân; bớt dân trước khi lên đời.');
    cost = costOf(S, i, 'age');
  } else {
    const T = TECHS[id];
    if (!T || P.techs.includes(id)) return no('Đã có rồi.');
    if (P.age < T.age) return no(`Cần ${AGES[T.age].name}.`);
    cost = costOf(S, i, 'tech', id);
  }
  if (!canAfford(P, cost)) return no(`Thiếu tài nguyên: cần ${costText(cost)}.`);
  pay(P, cost); O.research = id; O.researchCost = cost;
  return ok();
}
function buildCheck(S, i, kind, r) {
  const P = S.sides[i], B = BUILDINGS[kind], O = P.orders, cap = capOf(i);
  if (P.age < B.age) return `Cần ${AGES[B.age].name}`;
  if (O.builds.length >= AGES[P.age].builds) return `Mỗi lượt chỉ xây được ${AGES[P.age].builds} công trình`;
  const queued = O.builds.filter(b => b.kind === kind);
  if (B.where === 'capital' && r !== cap) return 'Chỉ xây ở kinh thành';
  if (B.where !== 'capital') {
    if (S.owner[r] !== i) return 'Chỉ xây ở vùng mình đang giữ';
    if (REGIONS[r].kind === 'capital' && r !== cap) return 'Không xây được ở đây';
    if (B.where === 'home' && (r === cap || REGIONS[r].kind === 'relic')) return 'Thị trấn phải ở vùng ngoài kinh thành, không phải Tu viện';
  }
  if (kind === 'tower' && (P.towers[r] || 0) + queued.filter(b => b.region === r).length >= B.perRegion) return 'Vùng này đủ tháp rồi';
  if (kind === 'castle') { if (P.castles[r] > 0 || queued.some(b => b.region === r)) return 'Vùng này có lâu đài rồi'; if (castleCount(P) + queued.length >= B.max) return 'Đủ lâu đài rồi'; }
  if (kind === 'town') { if (P.towns[r] || queued.some(b => b.region === r)) return 'Vùng này có thị trấn rồi'; if (townCount(P) + queued.length >= B.max) return 'Đủ thị trấn rồi'; }
  if (['barracks', 'range', 'stable', 'workshop', 'walls'].includes(kind) && (P.bld[kind] || 0) + queued.length >= B.max) return 'Đủ rồi';
  if (kind === 'wonder' && (P.wonder || queued.length)) return 'Chỉ có một kỳ quan';
  if (!canAfford(P, costOf(S, i, 'bld', kind))) return `Thiếu tài nguyên: cần ${costText(costOf(S, i, 'bld', kind))}`;
  return '';
}
function planBuild(S, i, kind, r) {
  const why = buildCheck(S, i, kind, r);
  if (why) return no(why + '.');
  const cost = costOf(S, i, 'bld', kind);
  pay(S.sides[i], cost);
  S.sides[i].orders.builds.push({ kind, region: r, cost });
  return ok();
}
function cancelBuild(S, i, idx) { const O = S.sides[i].orders, b = O.builds[idx]; if (!b) return no(''); refund(S.sides[i], b.cost); O.builds.splice(idx, 1); return ok(); }
function availableAt(S, i, r) {
  const st = { ...(S.sides[i].army[r] || {}) };
  for (const mv of S.sides[i].orders.moves) if (mv.from === r) for (const t in mv.units) st[t] = (st[t] || 0) - mv.units[t];
  return clean(st);
}
function moveRange(S, i, units) {
  const keys = Object.keys(units).filter(t => units[t] > 0);
  return keys.length && keys.every(t => MOUNTED.has(UNITS[t].cls)) ? 2 + modsOf(S, i).cavMove : 1;
}
function pathsFrom(S, i, from, range) {
  const out = { [from]: [from] }, q = [from];
  while (q.length) {
    const r = q.shift();
    if (out[r].length - 1 >= range) continue;
    for (const a of ADJ[r]) if (!out[a]) { out[a] = out[r].concat(a); q.push(a); }
  }
  delete out[from];
  return out;
}
function planMove(S, i, from, to, units) {
  const av = availableAt(S, i, from), u = {};
  for (const t in units) { const k = Math.min(units[t] | 0, av[t] || 0); if (k > 0) u[t] = k; }
  if (!total(u)) return no('Chọn ít nhất một đơn vị.');
  const paths = pathsFrom(S, i, from, moveRange(S, i, u));
  if (!paths[to]) return no('Không tới được vùng đó trong một lượt.');
  S.sides[i].orders.moves.push({ from, to, units: u, path: paths[to] });
  return ok();
}
function cancelMove(S, i, idx) { const O = S.sides[i].orders; if (!O.moves[idx]) return no(''); O.moves.splice(idx, 1); return ok(); }
function planScout(S, i, r) {
  const O = S.sides[i].orders, k = O.scouts.indexOf(r);
  if (k >= 0) { O.scouts.splice(k, 1); return ok(); }
  const max = modsOf(S, i).scouts;
  if (O.scouts.length >= max) { if (max === 1) { O.scouts = [r]; return ok(); } return no(`Mỗi lượt do thám tối đa ${max} nơi.`); }
  O.scouts.push(r); return ok();
}
function jobOpen(S, i, job) {
  const J = JOBS[job], r = J.region;
  if (REGIONS[r].kind === 'capital' && r !== capOf(i)) return false;
  if (S.owner[r] !== null && S.owner[r] !== i) return false;
  if (J.reserve != null && (S.sides[i].goldLeft[job] || 0) <= 0) return false;
  return true;
}
function setJob(S, i, job, delta) {
  const P = S.sides[i], cur = P.jobs[job] || 0;
  if (delta > 0) {
    if (P.idle <= 0) return no('Không còn dân rảnh. Bớt dân ở chỗ khác trước.');
    if (!jobOpen(S, i, job)) return no('Không đưa dân tới đây được.');
    if (cur >= JOBS[job].slots) return no('Hết chỗ làm.');
    P.idle--; P.jobs[job] = cur + 1;
  } else {
    if (cur <= 0) return no('');
    P.jobs[job] = cur - 1; if (!P.jobs[job]) delete P.jobs[job]; P.idle++;
  }
  return ok();
}
function cardOptions(S, i, age) {
  const civ = S.sides[i].civ;
  const gen = Object.keys(CARDS).filter(k => CARDS[k].age === age && !CARDS[k].civ);
  const mine = Object.keys(CARDS).find(k => CARDS[k].age === age && CARDS[k].civ === civ);
  return [mine].concat(shuffled(S, gen).slice(0, 2)).filter(Boolean);
}
function chooseCard(S, i, id) {
  const P = S.sides[i];
  if (!P.pendingCard || !P.pendingCard.includes(id)) return no('');
  P.cards.push(id); P.pendingCard = null;
  return ok(`Đã chọn: ${CARDS[id].name}.`);
}

/* ── combat ── */
const clsOf = t => UNITS[t].cls;
function vsMult(t, e) { const U = UNITS[t]; return (U.vs && U.vs[clsOf(e)] != null) ? U.vs[clsOf(e)] : VS[clsOf(t)][clsOf(e)]; }
function unitStr(S, i, t, r) {
  const U = UNITS[t], M = modsOf(S, i);
  let s = U.str * (1 + M.str + (MOUNTED.has(U.cls) ? M.cavStr : 0) + (U.civ ? M.uuStr : 0));
  if (t === 'archer' && REGIONS[r] && REGIONS[r].terrain === 'hill') s *= 1.25;
  if (t === 'siege' && M.trebuchet) s *= 1.5;
  return s;
}
function stackPower(S, i, st, enemy, r) {
  const eTot = total(enemy);
  let p = 0;
  for (const t in st) {
    if (!(st[t] > 0)) continue;
    let mult = 1;
    if (eTot > 0) { mult = 0; for (const e in enemy) if (enemy[e] > 0) mult += (enemy[e] / eTot) * vsMult(t, e); }
    p += st[t] * unitStr(S, i, t, r) * mult;
  }
  return p;
}
function fortPower(S, d, r, attSt, attSide) {
  const P = S.sides[d], M = modsOf(S, d);
  let p = (P.towers[r] || 0) * 7 + (P.castles[r] > 0 ? 25 : 0) + (P.towns[r] ? 8 : 0);
  if (r !== capOf(d)) p += jobsIn(P, r) * 0.5;
  if (r === capOf(d)) {
    const garrison = jobsIn(P, r) + P.idle;
    p += (10 + garrison * (M.militia ? 1 : 0.4)) * (P.bld.walls ? 1.3 : 1);
  }
  p *= 1 + M.fort + ((r === capOf(d) || P.towers[r] || P.castles[r]) ? M.fortDef : 0);
  const sieges = attSt.siege || 0;
  return Math.max(0, p - sieges * 6 * (modsOf(S, attSide).trebuchet ? 2 : 1));
}
function defMul(S, d, r) {
  const M = modsOf(S, d), R = REGIONS[r];
  let m = 1 + (R.terrain ? TERRAIN_DEF[R.terrain] || 0 : 0) - M.defPen;
  if (homeOf(d).includes(r)) m += M.homeDef;
  return m;
}
/* Lanchester's square law: the winner keeps sqrt(1 − q²) of its army, q = loser power / winner power */
function applyLoss(st, frac) {
  const lost = {};
  for (const t in st) { const k = Math.min(st[t], Math.round(st[t] * frac + 1e-9)); if (k > 0) { lost[t] = k; st[t] -= k; } }
  clean(st);
  return lost;
}
function fight(S, r, a, aSt, d, dSt, opts = {}) {
  const forts = opts.forts ? fortPower(S, d, r, aSt, a) : 0;
  const pa = stackPower(S, a, aSt, dSt, r);
  const pd = stackPower(S, d, dSt, aSt, r) * (opts.def ? defMul(S, d, r) : 1) + forts;
  const before = [{ ...aSt }, { ...dSt }];
  let winner, lossA, lossD;
  const q = Math.min(pa, pd) / Math.max(pa, pd, 1e-9);
  const lw = q > 0.97 ? 0.85 : 1 - Math.sqrt(Math.max(0, 1 - q * q));
  if (pa > pd * 1.0001) { winner = a; lossA = applyLoss(aSt, lw); lossD = applyLoss(dSt, 1); }
  else { winner = d; lossD = applyLoss(dSt, lw); lossA = applyLoss(aSt, q > 0.97 ? 0.85 : 1); }
  return { r, a, d, pa, pd, forts, winner, before, lossA, lossD, field: !!opts.field };
}

/* ── the turn ── */
function resolveTurn(S) {
  const R = { turn: S.turn, label: turnLabel(S.turn), ev: [], moves: [[], []], battles: [], raided: [{}, {}], scouts: [S.sides[0].orders.scouts.slice(), S.sides[1].orders.scouts.slice()] };
  const own0 = { ...S.owner };
  const E = (k, x) => R.ev.push({ k, ...x });
  // 1. everyone marches out
  const groups = [[], []];
  for (const i of [0, 1]) {
    const P = S.sides[i];
    for (const mv of P.orders.moves) {
      const st = P.army[mv.from] || {}, u = {};
      for (const t in mv.units) { const k = Math.min(mv.units[t], st[t] || 0); if (k > 0) { u[t] = k; st[t] -= k; } }
      clean(st);
      if (total(u)) { groups[i].push({ path: mv.path, units: u, from: mv.from }); R.moves[i].push({ path: mv.path.slice(), n: total(u), units: { ...u } }); }
    }
  }
  // 2. armies crossing the same road in opposite directions meet halfway
  const edgeKey = (x, y) => x + '>' + y;
  const byEdge = [{}, {}];
  for (const i of [0, 1]) for (const g of groups[i]) (byEdge[i][edgeKey(g.path[0], g.path[1])] = byEdge[i][edgeKey(g.path[0], g.path[1])] || []).push(g);
  for (const k in byEdge[0]) {
    const [x, y] = k.split('>'), rev = edgeKey(y, x);
    if (!byEdge[1][rev]) continue;
    const g0 = byEdge[0][k], g1 = byEdge[1][rev];
    const s0 = {}, s1 = {};
    g0.forEach(g => addTo(s0, g.units)); g1.forEach(g => addTo(s1, g.units));
    if (!total(s0) || !total(s1)) continue;
    const res = fight(S, x, 0, s0, 1, s1, { field: true });
    res.where = [x, y];
    R.battles.push(res); E('battle', { b: res });
    scoreBattle(S, res);
    // shrink groups to survivors; the loser turns back home
    const share = (gs, after) => { const pool = { ...after }; for (const g of gs) { const u = {}; for (const t in g.units) { const k = Math.min(g.units[t], pool[t] || 0); if (k) { u[t] = k; pool[t] -= k; } } g.units = u; } };
    share(g0, s0); share(g1, s1);
    const loserGroups = res.winner === 0 ? g1 : g0;
    for (const g of loserGroups) { g.path = [g.path[0]]; }
  }
  // 3. arrive (multi-step marches stop at a region still held by enemy troops)
  const arrived = [{}, {}];
  for (const i of [0, 1]) for (const g of groups[i]) {
    if (!total(g.units)) continue;
    let dest = g.path[g.path.length - 1];
    for (let k = 1; k < g.path.length - 1; k++) { const mid = g.path[k]; if (total(S.sides[1 - i].army[mid] || {})) { dest = mid; break; } }
    const P = S.sides[i];
    P.army[dest] = addTo(P.army[dest] || {}, g.units);
    arrived[i][dest] = true;
  }
  // 4. battles where both sides stand, or where an army walks into enemy forts
  for (const r of REGION_IDS) {
    const st0 = S.sides[0].army[r] || {}, st1 = S.sides[1].army[r] || {};
    const has0 = total(st0) > 0, has1 = total(st1) > 0;
    const fortsOf = d => !!(S.sides[d].towers[r] || S.sides[d].castles[r] > 0 || S.sides[d].towns[r] || r === capOf(d) || jobsIn(S.sides[d], r) > 0);
    let d = null;
    if (has0 && has1) d = own0[r];
    else if (has0 && own0[r] === 1 && fortsOf(1)) d = 1;
    else if (has1 && own0[r] === 0 && fortsOf(0)) d = 0;
    else continue;
    if (d === null) {
      const res = fight(S, r, 0, st0, 1, st1, {});
      R.battles.push(res); E('battle', { b: res }); scoreBattle(S, res);
      retreat(S, res.winner === 0 ? 1 : 0, r, res.winner === 0 ? st1 : st0, R);
    } else {
      const a = 1 - d, aSt = S.sides[a].army[r] || {}, dSt = S.sides[d].army[r] || (S.sides[d].army[r] = {});
      const res = fight(S, r, a, aSt, d, dSt, { def: true, forts: fortsOf(d) });
      R.battles.push(res); E('battle', { b: res }); scoreBattle(S, res);
      if (res.winner === d) retreat(S, a, r, aSt, R);
      else {
        retreat(S, d, r, dSt, R);
        const P = S.sides[d], sieges = aSt.siege || 0, hit = sieges * (modsOf(S, a).trebuchet ? 2 : 1);
        if (P.castles[r] > 0) { P.castles[r] -= hit; if (P.castles[r] <= 0) { delete P.castles[r]; E('razed', { side: d, r, what: 'castle' }); } }
        if (P.towers[r] && !(P.castles[r] > 0)) { E('razed', { side: d, r, what: 'tower', n: P.towers[r] }); delete P.towers[r]; }
      }
    }
    clean(S.sides[0].army[r] || {}); clean(S.sides[1].army[r] || {});
  }
  // 5. raids on workers, sieges on capitals
  for (const r of REGION_IDS) for (const a of [0, 1]) {
    const st = S.sides[a].army[r] || {}, d = 1 - a, P = S.sides[d];
    if (!total(st) || total(S.sides[d].army[r] || {})) continue;
    const workers = jobsIn(P, r) + (r === capOf(d) ? P.idle : 0);
    if (workers > 0) {
      const Md = modsOf(S, d);
      let kills = 0;
      for (const t in st) kills += st[t] * UNITS[t].kill;
      kills = Math.min(Math.round(workers * 0.75), Math.round(kills));
      if (homeOf(d).includes(r)) kills = Math.round(kills * (1 - Md.evac));
      if (r === capOf(d)) kills = Math.round(kills * 0.3);
      if (kills > 0) {
        loseWorkers(S, d, r, kills);
        S.sides[a].stats.villsKilled += kills; P.stats.villsLost += kills;
        const Ma = modsOf(S, a);
        let loot = null;
        if (Ma.plunderBase) { loot = { food: Math.round(kills * 12 * (1 + Ma.plunder)), gold: Math.round(kills * 8 * (1 + Ma.plunder)) }; refund(S.sides[a], loot); }
        E('raid', { side: a, r, kills, loot });
      }
      R.raided[d][r] = true;
      // survivors run home
      for (const j in P.jobs) if (JOBS[j].region === r && r !== capOf(d)) { P.idle += P.jobs[j]; delete P.jobs[j]; }
    }
    if (r === capOf(d)) {
      const sieges = st.siege || 0, other = total(st) - sieges;
      const dmg = Math.round(sieges * 18 * (modsOf(S, a).trebuchet ? 2 : 1) + other * 0.6 * (P.bld.walls ? 0.35 : 1));
      if (dmg > 0) { P.capHP -= dmg; E('siege', { side: a, r, dmg, hp: Math.max(0, P.capHP) }); }
    }
  }
  // 6. who holds what
  for (const r of REGION_IDS) {
    if (REGIONS[r].kind === 'capital') continue;
    const h0 = total(S.sides[0].army[r] || {}) > 0, h1 = total(S.sides[1].army[r] || {}) > 0;
    if (h0 === h1) continue;
    const w = h0 ? 0 : 1, l = 1 - w;
    if (S.owner[r] === w) continue;
    if (S.sides[l].castles[r] > 0) continue;
    if (S.owner[r] === l) { const P = S.sides[l]; delete P.towers[r]; delete P.towns[r]; for (const j in P.jobs) if (JOBS[j].region === r) { P.idle += P.jobs[j]; delete P.jobs[j]; } }
    S.owner[r] = w;
    E('capture', { side: w, r, from: own0[r] });
  }
  // 7. the relic
  const mo = S.owner.m;
  if (mo !== null && total(S.sides[mo].army.m || {}) > 0) {
    S.sides[mo].res.gold += 12;
    if (S.sides[mo].age >= 3) { const pts = 1 + modsOf(S, mo).relicX; S.sides[mo].relic += pts; E('relic', { side: mo, pts, total: S.sides[mo].relic }); }
  }
  // 8. work, training, building, research
  for (const i of [0, 1]) {
    const P = S.sides[i], M = modsOf(S, i), O = P.orders;
    const diff = P.ai && S.sides[1 - i].ai == null ? S.diff : 1;
    const got = { food: 0, wood: 0, gold: 0 };
    for (const j in P.jobs) {
      const J = JOBS[j], r = J.region;
      if (R.raided[i][r] && r !== capOf(i)) continue;
      let g = P.jobs[j] * GATHER[J.res] * (1 + M.gather[J.res]) * diff;
      if (J.reserve != null) { g = Math.min(g, P.goldLeft[j] || 0); P.goldLeft[j] = (P.goldLeft[j] || 0) - g; if (P.goldLeft[j] <= 0) { P.idle += P.jobs[j]; delete P.jobs[j]; E('depleted', { side: i, r }); } }
      got[J.res] += g;
    }
    if (M.soldierFarm) for (const r of homeOf(i)) got.food += total(P.army[r] || {}) * M.soldierFarm;
    for (const r of RES) { got[r] = Math.round(got[r]); P.res[r] += got[r]; }
    R['got' + i] = got;
    const cap = capOf(i);
    for (const t in O.train) {
      if (t === 'vill') { for (let k = 0; k < O.train.vill; k++) autoPlace(S, i); }
      else P.army[cap] = addTo(P.army[cap] || {}, { [t]: O.train[t] });
    }
    if (sumObj(O.train)) E('trained', { side: i, units: { ...O.train } });
    for (const b of O.builds) {
      if (b.kind === 'tower') { if (S.owner[b.region] !== i) { refund(P, b.cost); continue; } P.towers[b.region] = (P.towers[b.region] || 0) + 1; }
      else if (b.kind === 'castle') { if (S.owner[b.region] !== i) { refund(P, b.cost); continue; } P.castles[b.region] = 4; }
      else if (b.kind === 'town') { if (S.owner[b.region] !== i) { refund(P, b.cost); continue; } P.towns[b.region] = true; }
      else if (b.kind === 'walls') { P.bld.walls = 1; P.capHP += WALL_HP; }
      else if (b.kind === 'wonder') P.wonder = { left: M.fastWonder ? 0 : 1, held: 0 };
      else P.bld[b.kind] = (P.bld[b.kind] || 0) + 1;
      E('built', { side: i, kind: b.kind, r: b.region });
    }
    if (O.research === 'age') { P.age++; P.pendingCard = cardOptions(S, i, P.age); E('age', { side: i, age: P.age }); }
    else if (O.research) { P.techs.push(O.research); E('tech', { side: i, id: O.research }); }
  }
  // 9. the land fights back, walls get mended, wonders rise
  for (const d of [0, 1]) {
    const Md = modsOf(S, d), a = 1 - d;
    if (Md.attrition) for (const r of homeOf(d)) {
      const st = S.sides[a].army[r];
      if (!st || !total(st)) continue;
      const lost = {};
      for (const t in st) { const x = st[t] * Md.attrition; let k = Math.floor(x); if (rnd(S) < x - k) k++; if (k > 0) { lost[t] = k; st[t] -= k; } }
      clean(st);
      if (total(lost)) { E('attrition', { side: a, r, lost }); S.sides[a].stats.lost += total(lost); }
    }
    const P = S.sides[d], maxHP = CAP_HP + (P.bld.walls ? WALL_HP : 0);
    if (!total(S.sides[a].army[capOf(d)] || {})) P.capHP = Math.min(maxHP, P.capHP + 12);
    if (P.wonder && P.capHP > 0) { if (P.wonder.left > 0) P.wonder.left--; else P.wonder.held++; if (P.wonder.left === 0 && P.wonder.held === 0) E('wonder', { side: d }); }
  }
  // 10. victory
  const collapsed = i => S.turn >= 8 && villCount(S.sides[i]) < 4 && armyCount(S.sides[i]) === 0;
  for (const i of [0, 1]) if (collapsed(i) && S.sides[i].capHP > 0) { S.sides[i].capHP = 0; E('collapse', { side: i }); }
  const lost0 = S.sides[0].capHP <= 0, lost1 = S.sides[1].capHP <= 0;
  let win = null, how = '';
  if (lost0 || lost1) { win = lost0 && lost1 ? -1 : lost0 ? 1 : 0; how = 'capital'; }
  else {
    const rel = [0, 1].filter(i => S.sides[i].relic >= RELIC_WIN), won = [0, 1].filter(i => S.sides[i].wonder && S.sides[i].wonder.held >= WONDER_HOLD);
    if (rel.length) { win = rel.length > 1 ? (S.sides[0].relic >= S.sides[1].relic ? 0 : 1) : rel[0]; how = 'relic'; }
    else if (won.length) { win = won[0]; how = 'wonder'; }
    else if (S.turn >= MAX_TURNS) { const sc = [0, 1].map(i => scoreOf(S, i)); win = sc[0] === sc[1] ? -1 : sc[0] > sc[1] ? 0 : 1; how = 'time'; }
  }
  for (const i of [0, 1]) { updateVision(S, i, R.scouts[i]); S.sides[i].orders = emptyOrders(); }
  S.history.push({ turn: S.turn, power: [armyValue(S, 0), armyValue(S, 1)], vills: [villCount(S.sides[0]), villCount(S.sides[1])] });
  S.report = R;
  if (win !== null) { S.winner = win; S.over = { how, turn: S.turn }; return R; }
  S.turn++;
  return R;
}
function scoreBattle(S, res) {
  const W = S.sides[res.winner], L = S.sides[res.winner === res.a ? res.d : res.a];
  W.stats.battlesWon++; L.stats.battlesLost++;
  S.sides[res.a].stats.lost += total(res.lossA); S.sides[res.d].stats.lost += total(res.lossD);
  S.sides[res.a].stats.kills += total(res.lossD); S.sides[res.d].stats.kills += total(res.lossA);
}
/* the beaten side's survivors (if any) fall back towards home; the rest are lost */
function retreat(S, side, r, st, R) {
  if (!total(st)) return;
  const M = modsOf(S, side);
  const keepFrac = Math.min(1, 0.2 + M.retreat + (Object.keys(st).every(t => MOUNTED.has(UNITS[t].cls)) ? 0.2 : 0));
  const seen = { [r]: true }, q = [r];
  let to = null;
  while (q.length && !to) {
    const x = q.shift();
    for (const y of ADJ[x]) {
      if (seen[y]) continue; seen[y] = true;
      if (S.owner[y] === side && !total(S.sides[1 - side].army[y] || {})) { to = y; break; }
      q.push(y);
    }
  }
  const keep = {};
  for (const t in st) { const k = Math.floor(st[t] * keepFrac); if (k > 0) keep[t] = k; }
  for (const t in st) delete st[t];
  if (to && total(keep)) { S.sides[side].army[to] = addTo(S.sides[side].army[to] || {}, keep); R.ev.push({ k: 'retreat', side, from: r, to, units: keep }); }
}
function loseWorkers(S, d, r, kills) {
  const P = S.sides[d];
  let left = kills;
  for (const j of Object.keys(P.jobs)) {
    if (JOBS[j].region !== r || left <= 0) continue;
    const k = Math.min(P.jobs[j], left); P.jobs[j] -= k; left -= k; if (!P.jobs[j]) delete P.jobs[j];
  }
  if (left > 0 && r === capOf(d)) { const k = Math.min(P.idle, left); P.idle -= k; }
}
function autoPlace(S, i) {
  const P = S.sides[i], c = capOf(i), home = homeOf(i);
  for (const j of [c, home[1], home[2], c + 'g']) if (jobOpen(S, i, j) && (P.jobs[j] || 0) < JOBS[j].slots) { P.jobs[j] = (P.jobs[j] || 0) + 1; return; }
  P.idle++;
}
const armyValue = (S, i) => { let v = 0; for (const r in S.sides[i].army) for (const t in S.sides[i].army[r]) v += S.sides[i].army[r][t] * UNITS[t].str; return Math.round(v); };
const scoreOf = (S, i) => { const P = S.sides[i]; return P.relic * 30 + Math.max(0, P.capHP) + armyValue(S, i) * 2 + villCount(P) * 5 + P.age * 50; };

/* ── fog of war ── */
function updateVision(S, i, scouts) {
  const P = S.sides[i], F = S.sides[1 - i], M = modsOf(S, i);
  const full = new Set();
  for (const r of REGION_IDS) if (S.owner[r] === i || total(P.army[r] || {}) || jobsIn(P, r) || P.towers[r] || P.castles[r] > 0 || P.towns[r]) full.add(r);
  const near = new Set();
  for (const r of full) for (const a of ADJ[r]) if (!full.has(a)) near.add(a);
  for (const r of scouts || []) { full.add(r); near.delete(r); }
  if (total(P.army.n || {})) for (const a of ADJ.n) for (const b of ADJ[a]) if (!full.has(b)) near.add(b);
  for (const r of REGION_IDS) {
    const v = full.has(r) ? 'full' : near.has(r) ? (M.sharp ? 'full' : 'near') : 'fog';
    P.vis[r] = v;
    if (v === 'fog') continue;
    const st = F.army[r] || {}, prev = P.intel[r] || {};
    P.intel[r] = {
      turn: S.turn, exact: v === 'full', n: total(st), units: v === 'full' ? { ...st } : prev.units && prev.n === total(st) ? prev.units : null,
      vills: v === 'full' ? jobsIn(F, r) : null, towers: F.towers[r] || 0, castle: F.castles[r] > 0, town: !!F.towns[r],
    };
  }
  const fc = capOf(1 - i);
  if (P.vis[fc] === 'full') P.capIntel = { turn: S.turn, bld: { ...F.bld }, castles: castleCount(F), towns: townCount(F), techs: F.techs.slice(), vills: villCount(F), hp: F.capHP, army: total(F.army[fc] || {}) };
}
/* what a side believes about an enemy stack: exact, approximate, or remembered */
function enemySeen(S, i, r) {
  const I = S.sides[i].intel[r];
  if (!I) return null;
  return { ...I, age: S.turn - I.turn };
}
function forecast(S, i, from, to, units) {
  const I = enemySeen(S, i, to), foe = 1 - i;
  const defending = S.owner[to] === foe;
  let dSt = null, guess = false;
  if (I && I.age <= 1 && I.units) dSt = I.units;
  else if (I && I.age <= 1 && I.n === 0) dSt = {};
  else if (I && I.age <= 1 && I.n) { dSt = { spear: I.n }; guess = true; }
  const towers = I ? I.towers * 7 + (I.castle ? 25 : 0) + (I.town ? 8 : 0) : 0;
  const capBase = to === capOf(foe) ? 14 : 0;
  if (!dSt && !defending) return { kind: 'unknown', text: 'Chưa rõ quân địch ở đó. Do thám trước sẽ chắc ăn hơn.' };
  if (!dSt) return { kind: 'unknown', text: 'Đất địch, không rõ phòng thủ. Do thám trước sẽ chắc ăn hơn.' };
  const pa = stackPower(S, i, units, dSt, to);
  const pd = stackPower(S, foe, dSt, units, to) * (defending ? defMul(S, foe, to) : 1) + (defending ? towers + capBase : 0);
  const q = pa / Math.max(pd, 0.01);
  const old = I.age ? ` (tin từ ${I.age} lượt trước)` : '';
  if (!total(dSt) && !towers && !capBase) return { kind: 'free', text: `Không thấy quân địch${old}.` };
  const kind = q > 1.6 ? 'win' : q > 1.1 ? 'edge' : q > 0.9 ? 'even' : 'lose';
  const T = { win: 'Thắng chắc', edge: 'Nhỉnh hơn', even: 'Ngang ngửa, thắng thua khó nói', lose: 'Dễ thua' }[kind];
  return { kind, text: `${T}${guess ? ' (chỉ đoán theo quân số)' : ''}${old}.` };
}
