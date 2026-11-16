/* ── Commander Chess: the rules ──
   The game is Cờ Tư Lệnh, by Nguyễn Quý Hải. The rules here are the ones the community site cotulenh.vn plays by
   (its guide, checked move by move against the site itself; test/site-vectors.js holds what was seen there).

   The board has 11 files (a–k) and 12 ranks; pieces stand on the points. Files a and b are sea, file c and the
   four points d6 e6 d7 e7 are shore (ships and land pieces both stand there), f6 f7 h6 h7 are the two bridges,
   the rest is land. The river runs between ranks 6 and 7.

   A position is a handful of small arrays, so that copying one is cheap: the computer player copies a position
   for every move it looks at. Pieces are numbered; a stack is a carrier with up to two pieces riding on it.

   A turn is one move, or a deployment: pieces of one stack moving off one after another from the same point
   (S.dOrg ≥ 0 while that is going on), ended by COMMIT. */
'use strict';
const NF = 11, NR = 12, NSQ = 132, FILES = 'abcdefghijk';
const RED = 0, BLUE = 1;
const COMMANDER = 0, INFANTRY = 1, TANK = 2, MILITIA = 3, ENGINEER = 4, ARTILLERY = 5, ANTIAIR = 6, MISSILE = 7, AIR = 8, NAVY = 9, HQ = 10;
const KIND_NAME = ['Commander', 'Infantry', 'Tank', 'Militia', 'Engineer', 'Artillery', 'Anti-Air', 'Missile', 'Air Force', 'Navy', 'Headquarters'];
const KIND_CODE = 'CITMEAGSFNH';
const LAND = 0, WATER = 1, MIXED = 2, BRIDGE = 3;
const MOVE = 0, CAPTURE = 1, STAY = 2, SUICIDE = 3, INTERCEPT = 4, COMBINE = 5, COMMIT = 6;
const SAFE = 0, TRADE = 1, INTERCEPTED = 2;

const sqOf = (f, r) => (r - 1) * NF + f, fileOf = s => s % NF, rankOf = s => ((s / NF) | 0) + 1;
const sqName = s => FILES[s % NF] + (((s / NF) | 0) + 1);
const sqNamed = n => sqOf(FILES.indexOf(n[0]), +n.slice(1));

const TERRAIN = new Uint8Array(NSQ), BANK = new Uint8Array(NSQ);
for (let s = 0; s < NSQ; s++) {
  const f = fileOf(s), r = rankOf(s), mid = r === 6 || r === 7;
  TERRAIN[s] = f < 2 ? WATER : mid && (f === 5 || f === 7) ? BRIDGE : f === 2 || (mid && (f === 3 || f === 4)) ? MIXED : LAND;
  BANK[s] = mid && f !== 5 && f !== 7 && f > 1 ? 1 : 0;      // where an Engineer may carry a heavy piece
}
/** the two points each side's Headquarters start on: holding one of the other side's for three turns wins */
const CORE = [[sqNamed('f2'), sqNamed('h2')], [sqNamed('f11'), sqNamed('h11')]];

/* the eight ways a piece can go: E W N S, then NE SE NW SW */
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const RAY = [], LINE = new Uint8Array(NSQ * NSQ).fill(255);
for (let s = 0; s < NSQ; s++) for (let d = 0; d < 8; d++) {
  const list = []; let f = fileOf(s) + DIRS[d][0], r = rankOf(s) + DIRS[d][1];
  while (f >= 0 && f < NF && r >= 1 && r <= NR) { const t = sqOf(f, r); LINE[s * NSQ + t] = (d << 4) | list.length; list.push(t); f += DIRS[d][0]; r += DIRS[d][1]; }
  RAY.push(Uint8Array.from(list));
}
/* how far each kind goes and takes; a hero adds one to every number here (a Commander is never a hero) */
const MOVE_ORTH = [12, 1, 2, 1, 1, 3, 1, 2, 4, 4, 0], MOVE_DIAG = [0, 0, 0, 1, 0, 3, 0, 1, 4, 4, 0];
const CAP_ORTH = [1, 1, 2, 1, 1, 3, 1, 2, 4, 4, 0], CAP_DIAG = [0, 0, 0, 1, 0, 3, 0, 1, 4, 4, 0];
const HEAVY = [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0];             // these cross the river only over a bridge
const SHOOT_OVER = [0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0];        // take over the heads of pieces in between
const SHOOT_HQ = [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0];          // … even over a Headquarters
const AD_R = [0, 0, 0, 0, 0, 0, 1, 2, 0, 1, 0];              // air-defence radius
const AD_SQ = [];                                            // AD_SQ[r][s]: the points within r of s, as the crow flies
for (let r = 0; r <= 3; r++) { const per = []; for (let s = 0; s < NSQ; s++) { const l = []; for (let t = 0; t < NSQ; t++) { const dx = fileOf(t) - fileOf(s), dy = rankOf(t) - rankOf(s); if (dx * dx + dy * dy <= r * r) l.push(t); } per.push(Uint8Array.from(l)); } AD_SQ.push(per); }
/* who may ride on whom: each carrier has one or two seats, each seat takes certain kinds */
const bit = (...ks) => ks.reduce((m, k) => m | (1 << k), 0);
const SEATS = [];
SEATS[NAVY] = [bit(AIR), bit(COMMANDER, INFANTRY, MILITIA, TANK)];
SEATS[AIR] = [bit(TANK), bit(COMMANDER, INFANTRY, MILITIA)];
SEATS[TANK] = [bit(INFANTRY, MILITIA), bit(INFANTRY, MILITIA)];
SEATS[ENGINEER] = [bit(ARTILLERY, ANTIAIR, MISSILE)];
SEATS[HQ] = [bit(COMMANDER)];

/** the usual starting position: [kind, point] for Red; Blue's is the same seen from the other side */
const SETUP_STANDARD = [[COMMANDER, 'g1'], [NAVY, 'b2'], [AIR, 'e2'], [HQ, 'f2'], [HQ, 'h2'], [AIR, 'i2'], [ARTILLERY, 'd3'], [MISSILE, 'g3'], [ARTILLERY, 'j3'],
  [NAVY, 'c4'], [ANTIAIR, 'e4'], [TANK, 'f4'], [TANK, 'h4'], [ANTIAIR, 'i4'], [INFANTRY, 'c5'], [ENGINEER, 'd5'], [MILITIA, 'g5'], [ENGINEER, 'j5'], [INFANTRY, 'k5']];
const mirror = name => name[0] + (13 - +name.slice(1));

/** A new game. setup: {red: [[kind, point]…], blue: […]} — blue defaults to red's mirrored. */
function newGame(setup) {
  const red = (setup && setup.red) || SETUP_STANDARD, blue = (setup && setup.blue) || red.map(([k, n]) => [k, mirror(n)]);
  const all = red.map(x => [x[0], x[1], RED]).concat(blue.map(x => [x[0], x[1], BLUE])), n = all.length;
  const S = { n, kind: new Uint8Array(n), own: new Uint8Array(n), cmd: [-1, -1],
    top: new Int8Array(NSQ).fill(-1), at: new Int16Array(n).fill(-1), car: new Int8Array(n).fill(-1), c1: new Int8Array(n).fill(-1), c2: new Int8Array(n).fill(-1), hero: new Uint8Array(n),
    turn: RED, half: 0, full: 1, core: [0, 0], over: null, dOrg: -1, dAct: [], dIrr: 0, exp: [], ad: [null, null], log: null };
  all.forEach(([k, name, side], p) => { const s = sqNamed(name); S.kind[p] = k; S.own[p] = side; S.at[p] = s; S.top[s] = p; if (k === COMMANDER) S.cmd[side] = p; });
  return S;
}
function clone(S) {
  return { n: S.n, kind: S.kind, own: S.own, cmd: S.cmd, top: S.top.slice(), at: S.at.slice(), car: S.car.slice(), c1: S.c1.slice(), c2: S.c2.slice(), hero: S.hero.slice(),
    turn: S.turn, half: S.half, full: S.full, core: [S.core[0], S.core[1]], over: S.over, dOrg: S.dOrg, dAct: S.dAct.length ? S.dAct.slice() : S.dAct, dIrr: S.dIrr,
    exp: S.exp.length ? S.exp.map(x => ({ p: x.p, d: x.d, e: x.e })) : S.exp, ad: [null, null], log: null };
}

/* ── stacks ── */
/** the pieces on a point: the carrier first */
function members(S, s) { const t = S.top[s]; if (t < 0) return []; const a = S.c1[t], b = S.c2[t]; return a < 0 ? [t] : b < 0 ? [t, a] : [t, a, b]; }
/** may c carry these others? */
function fits(S, c, others) {
  if (!others.length) return true;
  const seats = SEATS[S.kind[c]]; if (!seats || others.length > seats.length) return false;
  const ka = S.kind[others[0]]; if (ka === ENGINEER) return false;
  if (others.length === 1) return seats.some(m => (m >> ka) & 1);
  const kb = S.kind[others[1]]; if (kb === ENGINEER) return false;
  return !!((((seats[0] >> ka) & 1) && ((seats[1] >> kb) & 1)) || (((seats[0] >> kb) & 1) && ((seats[1] >> ka) & 1)));
}
/** which of these pieces carries the rest, or −1 if they cannot make one stack */
function carrierOf(S, ids) {
  if (ids.length === 1) return ids[0];
  if (ids.length > 3) return -1;
  for (const c of ids) if (fits(S, c, ids.filter(x => x !== c))) return c;
  return -1;
}
/** puts these pieces on point s, carrier first in the stack */
function setStack(S, s, ids, carrier) {
  if (!ids.length) { S.top[s] = -1; return; }
  const rest = ids.filter(x => x !== carrier);
  S.top[s] = carrier; S.car[carrier] = -1; S.at[carrier] = s; S.c1[carrier] = rest.length ? rest[0] : -1; S.c2[carrier] = rest.length > 1 ? rest[1] : -1;
  for (const p of rest) { S.car[p] = carrier; S.at[p] = s; S.c1[p] = -1; S.c2[p] = -1; }
}
function killStack(S, s, dead) {
  for (const p of members(S, s)) { S.at[p] = -1; S.car[p] = -1; S.c1[p] = -1; S.c2[p] = -1; if (dead) dead.push(p); }
  S.top[s] = -1;
}
/** may a piece of this kind stand on point s by itself? */
const standsOn = (k, s) => (k === NAVY ? TERRAIN[s] === WATER || TERRAIN[s] === MIXED : TERRAIN[s] !== WATER);

/* ── air defence ── */
/** for each point, which of this side's air-defence pieces reach it (one bit apiece). Only a piece standing by itself
 *  or carrying others counts: one that is being carried defends nothing. */
function adMask(S, side) {
  let m = S.ad[side]; if (m) return m;
  m = S.ad[side] = new Uint16Array(NSQ); let b = 1;
  for (let p = 0; p < S.n; p++) {
    if (S.own[p] !== side || S.at[p] < 0 || S.car[p] >= 0 || !AD_R[S.kind[p]]) continue;
    const l = AD_SQ[AD_R[S.kind[p]] + S.hero[p]][S.at[p]]; for (let j = 0; j < l.length; j++) m[l[j]] |= b; b <<= 1;
  }
  return m;
}
/** What happens to a plane of `me` flying from `from` along ray d to its i-th point: SAFE, TRADE (it gets there and is
 *  shot down there, taking what stands there with it) or INTERCEPTED (shot down on the way: see interceptPoint).
 *  A defence that covers the target lets the plane come as far as the target; any other defence on the way stops it. */
function airOutcome(S, me, from, d, i) {
  const m = adMask(S, 1 - me), ray = RAY[from * 8 + d], T = m[ray[i]];
  let first = T ? i : 99;
  if (T) for (let j = 0; j < i; j++) if (m[ray[j]] & T) { first = j; break; }
  for (let j = 0; j < i && j <= first; j++) if (m[ray[j]] & ~T) return INTERCEPTED;
  return T ? TRADE : SAFE;
}
function interceptPoint(S, me, from, d, i) {
  const m = adMask(S, 1 - me), ray = RAY[from * 8 + d], T = m[ray[i]];
  for (let j = 0; j < i; j++) if (m[ray[j]] & ~T) return ray[j];
  return -1;
}

/* ── what a piece may do ──
   Every test here is about piece a going from `from` along ray d to its i-th point t. `loaded` says a is carrying
   something (it matters to an Engineer only). */
const crosses = (a, b) => (rankOf(a) <= 6) !== (rankOf(b) <= 6);
/** nothing in the way, as this kind understands it */
function pathOK(S, k, from, d, i) {
  const ray = RAY[from * 8 + d];
  if (k === AIR) return true;
  if (k === NAVY) {                                           // water all the way, no ship in between, and not round the two river corners
    let prev = from;
    for (let j = 0; j <= i; j++) {
      const s = ray[j];
      if (d >= 4 && NAVY_BAR[prev * NSQ + s]) return false;
      if (j < i) { if (TERRAIN[s] !== WATER && TERRAIN[s] !== MIXED) return false; const q = S.top[s]; if (q >= 0 && S.kind[q] === NAVY) return false; }
      prev = s;
    }
    return true;
  }
  let corridor = -1;                                          // along the shore a land piece may pass a ship: worked out when first needed
  for (let j = 0; j < i; j++) {
    const s = ray[j], q = S.top[s];
    if (q < 0) continue;
    if (S.kind[q] === HQ && k === MISSILE) continue;          // the site lets a Missile pass a Headquarters
    if (S.kind[q] === NAVY && TERRAIN[s] === MIXED) {
      if (corridor < 0) {
        corridor = 0;
        if (d < 4 && TERRAIN[from] !== WATER) {
          let all = TERRAIN[from] === MIXED, some = all, dry = true;
          for (let x = 0; x <= i; x++) { const t = TERRAIN[ray[x]]; if (t === WATER) dry = false; if (t === MIXED) some = true; else all = false; }
          corridor = dry && (d >= 2 ? all : some) ? 1 : 0;
        }
      }
      if (corridor) continue;
    }
    return false;
  }
  return true;
}
const NAVY_BAR = new Uint8Array(NSQ * NSQ);
for (const [a, b] of [['c5', 'd6'], ['c8', 'd7']]) { NAVY_BAR[sqNamed(a) * NSQ + sqNamed(b)] = 1; NAVY_BAR[sqNamed(b) * NSQ + sqNamed(a)] = 1; }

/** A Commander may not step onto, or pass over, a point the other Commander looks straight at. */
function transitSafe(S, a, from, d, i) {
  const e = S.cmd[1 - S.own[a]]; if (e < 0 || S.at[e] < 0 || S.car[e] >= 0) return true;
  const ec = S.at[e], ray = RAY[from * 8 + d], gone = S.top[from] === a ? from : -1;
  for (let j = 0; j <= i; j++) {
    const li = LINE[ec * NSQ + ray[j]]; if (li === 255 || li >= 64) continue;
    const r2 = RAY[ec * 8 + (li >> 4)], n = li & 15; let clear = true;
    for (let x = 0; x < n; x++) if (S.top[r2[x]] >= 0 && r2[x] !== gone) { clear = false; break; }
    if (clear) return false;
  }
  return true;
}
/** to an empty point (also asked about a point with a friend on it, when joining it) */
function okMove(S, a, loaded, from, d, i) {
  const k = S.kind[a], t = RAY[from * 8 + d][i];
  if (k === ENGINEER && loaded && !(BANK[from] && BANK[t])) return false;
  if (k === AIR) { if (TERRAIN[t] === WATER) { const q = S.top[t]; if (q < 0 || S.own[q] !== S.own[a] || S.kind[q] !== NAVY) return false; } }
  else if (!standsOn(k, t)) return false;
  if (HEAVY[k] && crosses(from, t) && !((d === 2 || d === 3) && (fileOf(from) === 5 || fileOf(from) === 7))) return false;
  if (k === COMMANDER && !transitSafe(S, a, from, d, i)) return false;
  if (k === AIR && airOutcome(S, S.own[a], from, d, i) !== SAFE) return false;
  return pathOK(S, k, from, d, i);
}
/** can a reach the enemy on t at all: near enough, and nothing it cannot shoot past in between */
function okAttack(S, a, from, d, i) {
  const k = S.kind[a], h = k === COMMANDER ? 0 : S.hero[a], ray = RAY[from * 8 + d];
  if (i >= (d >= 4 ? CAP_DIAG[k] : CAP_ORTH[k]) + h) return false;
  if (k === NAVY && S.kind[S.top[ray[i]]] !== NAVY && i + 1 > CAP_ORTH[k] + h - 1) return false;   // a ship reaches one less at anything but a ship
  if (!SHOOT_HQ[k]) for (let j = 0; j < i; j++) { const q = S.top[ray[j]]; if (q >= 0 && S.kind[q] === HQ) return false; }
  if (k === NAVY || SHOOT_OVER[k]) return true;
  for (let j = 0; j < i; j++) if (S.top[ray[j]] >= 0) return false;
  return true;
}
/** take it and stand where it stood */
function okCapture(S, a, loaded, from, d, i) {
  const k = S.kind[a], ray = RAY[from * 8 + d], t = ray[i], q = S.top[t];
  if (k === COMMANDER && S.kind[q] === COMMANDER && d < 4) { let clear = true; for (let j = 0; j < i; j++) if (S.top[ray[j]] >= 0) { clear = false; break; } if (clear) return true; }
  if (k === ENGINEER && loaded && !(BANK[from] && BANK[t])) return false;
  if (k === AIR ? TERRAIN[t] === WATER : !standsOn(k, t)) return false;
  if (!okAttack(S, a, from, d, i)) return false;
  if (k === COMMANDER && !transitSafe(S, a, from, d, i)) return false;
  if (k === NAVY && !pathOK(S, k, from, d, i)) return false;
  if (k === AIR && airOutcome(S, S.own[a], from, d, i) !== SAFE) return false;
  return true;
}
/** take it without leaving one's place. deployed: a is acting apart from the stack it stands in, and then it has to be
 *  a piece that could stand on that point by itself. (A plane that would be shot down doing it is SUICIDE, not this.) */
function okStay(S, a, loaded, from, d, i, deployed) {
  const k = S.kind[a], t = RAY[from * 8 + d][i];
  if (k === COMMANDER || !okAttack(S, a, from, d, i)) return false;
  if (deployed && !standsOn(k, from)) return false;
  if (k === AIR) return S.kind[S.top[t]] !== AIR && airOutcome(S, S.own[a], from, d, i) === SAFE;
  if (k === TANK || k === NAVY) return !okCapture(S, a, loaded, from, d, i);
  return TERRAIN[t] === WATER;                                // the rest fire only at what lies in the sea, where they cannot follow
}
/** join the friends on t; group is a with whatever it brings */
function okCombine(S, a, group, from, d, i) {
  const k = S.kind[a], ray = RAY[from * 8 + d], t = ray[i], there = members(S, t), all = group.concat(there);
  const c = carrierOf(S, all); if (c < 0) return false;
  if (S.kind[c] === ENGINEER && !BANK[t]) return false;
  const loaded = group.length > 1;
  if (okMove(S, a, loaded, from, d, i)) return true;
  if (S.kind[S.top[t]] !== NAVY) return false;                // boarding a ship that lies in the sea
  if (k === ENGINEER && loaded && !(BANK[from] && BANK[t])) return false;
  if (HEAVY[k] && crosses(from, t) && !((d === 2 || d === 3) && (fileOf(from) === 5 || fileOf(from) === 7))) return false;
  if (k === AIR) return airOutcome(S, S.own[a], from, d, i) === SAFE;
  if (k === NAVY) return pathOK(S, k, from, d, i);
  for (let j = 0; j < i; j++) if (TERRAIN[ray[j]] === WATER || S.top[ray[j]] >= 0) return false;
  return true;
}
/** Could piece p, where it stands (riding or not), take what is on `target`? This is what "check" means. */
function attacks(S, p, target) {
  const from = S.at[p], li = LINE[from * NSQ + target]; if (li === 255) return false;
  const d = li >> 4, i = li & 15, k = S.kind[p];
  if (k === COMMANDER) return false;
  const loaded = S.car[p] < 0 && S.c1[p] >= 0;
  if (okCapture(S, p, loaded, from, d, i)) return true;
  if (k === AIR) return okAttack(S, p, from, d, i) && airOutcome(S, S.own[p], from, d, i) !== INTERCEPTED && (airOutcome(S, S.own[p], from, d, i) === TRADE || S.kind[S.top[target]] !== AIR);
  return okStay(S, p, loaded, from, d, i, false);
}
/** is this side's Commander under attack? */
function inCheck(S, side) {
  const c = S.cmd[side]; if (c < 0 || S.at[c] < 0) return true;
  const target = S.at[c];
  for (let p = 0; p < S.n; p++) if (S.own[p] !== side && S.at[p] >= 0 && attacks(S, p, target)) return true;
  return false;
}
/** do the two Commanders look straight at each other? (One that is being carried sees nothing and is not seen.) */
function exposed(S) {
  const a = S.cmd[0], b = S.cmd[1]; if (a < 0 || b < 0 || S.at[a] < 0 || S.at[b] < 0 || S.car[a] >= 0 || S.car[b] >= 0) return false;
  const li = LINE[S.at[a] * NSQ + S.at[b]]; if (li === 255 || li >= 64) return false;
  const ray = RAY[S.at[a] * 8 + (li >> 4)], n = li & 15;
  for (let j = 0; j < n; j++) if (S.top[ray[j]] >= 0) return false;
  return true;
}

/* ── moves ──
   A move is one number: from | to<<8 | mode<<16 | actor<<19 | group<<25. group has a bit for each piece of the stack on
   `from` (carrier first) that goes along; the actor's own bit is always set. COMMIT ends a deployment. */
const mk = (from, to, mode, a, grp) => from | (to << 8) | (mode << 16) | (a << 19) | (grp << 25);
const mFrom = m => m & 255, mTo = m => (m >> 8) & 255, mMode = m => (m >> 16) & 7, mActor = m => (m >> 19) & 63, mGroup = m => (m >> 25) & 7;
const COMMIT_MOVE = COMMIT << 16;

function genGroup(S, from, a, grp, group, whole, out, takesOnly) {
  const k = S.kind[a], h = k === COMMANDER ? 0 : S.hero[a], me = S.own[a], loaded = group.length > 1, alone = group.length === 1;
  for (let d = 0; d < 8; d++) {
    const rm = (d >= 4 ? MOVE_DIAG[k] : MOVE_ORTH[k]) + h, ray = RAY[from * 8 + d];
    const rc = (d >= 4 ? CAP_DIAG[k] : CAP_ORTH[k]) + h;
    const n = Math.min(ray.length, Math.max(rm, rc));
    for (let i = 0; i < n; i++) {
      const t = ray[i], q = S.top[t];
      if (q < 0) { if (!takesOnly && i < rm && okMove(S, a, loaded, from, d, i)) out.push(mk(from, t, MOVE, a, grp)); continue; }
      if (S.own[q] === me) { if (!takesOnly && i < rm && okCombine(S, a, group, from, d, i)) out.push(mk(from, t, COMBINE, a, grp)); continue; }
      if (i < rm) {
        if (okCapture(S, a, loaded, from, d, i)) out.push(mk(from, t, CAPTURE, a, grp));
        else if (k === AIR && okAttack(S, a, from, d, i)) { const o = airOutcome(S, me, from, d, i); if (o !== SAFE) out.push(mk(from, t, o === TRADE ? SUICIDE : INTERCEPT, a, grp)); }
      }
      if (i < rc && (whole || alone) && okStay(S, a, loaded, from, d, i, !whole)) out.push(mk(from, t, STAY, a, grp));
    }
  }
}
/** everything that may be done from point s by the side to move, legal or leaving its Commander in danger.
 *  takesOnly: captures alone, and (outside a deployment) only by the whole of what stands there. */
function genSquare(S, s, out, takesOnly) {
  const M = members(S, s), session = S.dOrg >= 0;
  if (takesOnly && !session) { const ids = M.slice(); genGroup(S, s, M[0], (1 << M.length) - 1, ids, true, out, true); return; }
  const free = session ? M.map(p => !S.dAct.includes(p)) : M.map(() => true);
  for (let x = 0; x < M.length; x++) {
    if (!free[x]) continue;
    const a = M[x], others = []; for (let y = 0; y < M.length; y++) if (y !== x && free[y]) others.push(y);
    for (let sub = (1 << others.length) - 1; sub >= 0; sub--) {      // every choice of the others to take along
      const ids = [a]; let grp = 1 << x;
      for (let z = 0; z < others.length; z++) if ((sub >> z) & 1) { ids.push(M[others[z]]); grp |= 1 << others[z]; }
      if (ids.length > 1 && !fits(S, a, ids.slice(1))) continue;
      genGroup(S, s, a, grp, ids, !session && ids.length === M.length, out, takesOnly);
    }
  }
}
function gen(S, out, takesOnly) {
  if (S.over) return out;
  if (S.dOrg >= 0) { genSquare(S, S.dOrg, out, takesOnly); if (!takesOnly) out.push(COMMIT_MOVE); return out; }
  for (let p = 0; p < S.n; p++) if (S.own[p] === S.turn && S.at[p] >= 0 && S.car[p] < 0) genSquare(S, S.at[p], out, takesOnly);
  return out;
}

/** enemy planes that none of my air defence reaches yet */
function planesInTheClear(S, me) {
  const m = adMask(S, me), out = [];
  for (let p = 0; p < S.n; p++) if (S.kind[p] === AIR && S.own[p] !== me && S.at[p] >= 0 && S.car[p] < 0 && !m[S.at[p]]) out.push(p);
  return out;
}
const note = (S, what) => { if (S.log) S.log.push(what); };

/** Plays move m on S (make a copy first if S is still needed). strict: refuse what the rules forbid for the safety of
 *  one's own Commander. Returns false, with S spoiled, when the move cannot be played. */
function play(S, m, strict) {
  const mode = mMode(m);
  if (mode === COMMIT) return S.dOrg >= 0 && commit(S, strict);
  const from = mFrom(m), to = mTo(m), a = mActor(m), grp = mGroup(m), me = S.turn, M = members(S, from), G = [a], L = [];
  for (let j = 0; j < M.length; j++) if (M[j] !== a) ((grp >> j) & 1 ? G : L).push(M[j]);
  const session = S.dOrg >= 0, deploy = session || L.length > 0;
  const clear = !deploy && AD_R[S.kind[a]] ? planesInTheClear(S, me) : null;
  const dead = S.log ? [] : null;
  let hit = -1;
  if (mode === INTERCEPT) { const li = LINE[from * NSQ + to]; hit = interceptPoint(S, me, from, li >> 4, li & 15); }
  if (mode === CAPTURE || mode === STAY || mode === SUICIDE) killStack(S, to, dead);
  if (mode !== STAY) {
    const lc = L.length ? carrierOf(S, L) : -1;
    setStack(S, from, L, lc < 0 && L.length ? L[0] : lc);    // pieces left behind that make no stack lie loose for the moment
    if (mode === SUICIDE || mode === INTERCEPT) for (const p of G) { S.at[p] = -1; S.car[p] = -1; S.c1[p] = -1; S.c2[p] = -1; if (dead) dead.push(p); }
    else if (mode === COMBINE) { const all = G.concat(members(S, to)); setStack(S, to, all, carrierOf(S, all)); }
    else setStack(S, to, G, a);
  }
  S.ad[0] = S.ad[1] = null;
  note(S, { what: 'move', mode, from, to, actor: a, group: G, dead, hit, side: me });
  if (deploy) {
    if (!session) { S.dOrg = from; S.dAct = []; S.dIrr = 0; }
    for (const p of G) S.dAct.push(p);
    if (mode !== MOVE) S.dIrr = 1;
    const here = members(S, from);
    if (here.length) {                                        // what is left behind has to be able to stand there
      const loose = carrierOf(S, here) < 0 || mode === STAY;
      if (loose) { for (const p of here) if (!standsOn(S.kind[p], from)) return false; }
      else if (!standsOn(S.kind[here[0]], from)) return false;
    }
    if (strict && exposed(S)) return false;
    const e = S.cmd[1 - me];
    if (S.at[e] < 0 || !here.some(p => !S.dAct.includes(p))) return commit(S, strict);
    return true;
  }
  if (strict && (exposed(S) || inCheck(S, me))) return false;
  endTurn(S, me, mode !== MOVE, a, clear);
  return true;
}
/** ends a deployment: what was left on the point must make one stack again */
function commit(S, strict) {
  const me = S.turn, s = S.dOrg, here = members(S, s);
  if (here.length > 1) { const c = carrierOf(S, here); if (c < 0) return false; setStack(S, s, here, c); }
  if (strict && (exposed(S) || inCheck(S, me))) return false;
  const irr = S.dIrr; S.dOrg = -1; S.dAct = []; S.dIrr = 0;
  endTurn(S, me, !!irr, -1, null);
  return true;
}
/** pieces that now threaten the other Commander become heroes; so does a side's last piece. Returns how many. */
function promote(S, me) {
  let n = 0; const e = S.cmd[1 - me], target = e < 0 ? -1 : S.at[e];
  if (target >= 0) for (let p = 0; p < S.n; p++) {
    if (S.own[p] !== me || S.at[p] < 0 || S.hero[p] || S.kind[p] === COMMANDER) continue;
    if (attacks(S, p, target)) { S.hero[p] = 1; n++; note(S, { what: 'hero', piece: p }); }
  }
  for (let side = 0; side < 2; side++) {
    let last = -1, cnt = 0;
    for (let p = 0; p < S.n; p++) if (S.own[p] === side && S.at[p] >= 0 && S.kind[p] !== COMMANDER) { cnt++; last = p; }
    if (cnt === 1 && !S.hero[last]) { S.hero[last] = 1; n++; note(S, { what: 'hero', piece: last }); }
  }
  if (n) S.ad[0] = S.ad[1] = null;
  return n;
}
function endTurn(S, me, irreversible, mover, clear) {
  const foe = 1 - me, ec = S.cmd[foe];
  if (ec < 0 || S.at[ec] < 0) { S.over = { winner: me, why: 'commander' }; note(S, { what: 'over' }); return; }
  let holds = false; for (const s of CORE[foe]) { const q = S.top[s]; if (q >= 0 && S.own[q] === me) holds = true; }
  S.core[me] = holds ? S.core[me] + 1 : 0;
  const promoted = promote(S, me);
  S.half = irreversible || promoted ? 0 : S.half + 1;
  if (S.core[me] >= 3) S.over = { winner: me, why: 'hq' }; else if (S.half >= 100) S.over = { winner: -1, why: 'fifty' };
  // air defence that has moved up to a plane may shoot it down two turns later, if the plane is still there
  if (S.exp.length) {
    const keep = [];
    for (const x of S.exp) { const p = x.p; if (S.at[p] >= 0 && S.car[p] < 0 && adMask(S, x.d)[S.at[p]]) { if (S.own[p] === me) x.e = 1; keep.push(x); } }
    S.exp = keep;
  }
  if (clear && clear.length && S.at[mover] >= 0 && S.car[mover] < 0) {
    const reach = AD_R[S.kind[mover]] + S.hero[mover], at = S.at[mover];
    for (const p of clear) {
      if (S.at[p] < 0 || S.car[p] >= 0) continue;
      const dx = fileOf(S.at[p]) - fileOf(at), dy = rankOf(S.at[p]) - rankOf(at);
      if (dx * dx + dy * dy <= reach * reach && !S.exp.some(x => x.p === p && x.d === me)) { S.exp = S.exp.concat([{ p, d: me, e: 0 }]); note(S, { what: 'lock', piece: p, by: mover }); }
    }
  }
  if (S.over) { note(S, { what: 'over' }); return; }
  S.turn = foe; if (me === BLUE) S.full++;
  if (S.exp.length) {                                         // the side now to move fires first, and it costs no move
    for (const x of S.exp.slice()) {
      if (x.d !== foe || !x.e) continue;
      const p = x.p; if (S.at[p] < 0 || S.car[p] >= 0 || !adMask(S, foe)[S.at[p]]) continue;
      const s = S.at[p], dead = S.log ? [] : null; killStack(S, s, dead); S.ad[0] = S.ad[1] = null;
      S.exp = S.exp.filter(y => y.p !== p); note(S, { what: 'shotdown', at: s, dead, side: foe });
      if (S.at[S.cmd[me]] < 0) { S.over = { winner: foe, why: 'commander' }; note(S, { what: 'over' }); return; }
    }
  }
}

/** can a deployment that has begun be brought to an end the rules allow? */
function canFinish(S, depth) {
  if (commit(clone(S), true)) return true;
  if (depth > 3) return false;
  const buf = []; genSquare(S, S.dOrg, buf);
  for (const m of buf) { const T = clone(S); if (play(T, m, true) && (T.dOrg < 0 || canFinish(T, depth + 1))) return true; }
  return false;
}
/** every move the side to move may make */
function legalMoves(S) {
  const out = [];
  for (const m of gen(S, [])) { const T = clone(S); if (play(T, m, true) && (T.dOrg < 0 || canFinish(T, 0))) out.push(m); }
  return out;
}
/** how the game stands for the side to move: null while it goes on */
function status(S) {
  if (S.over) return S.over;
  if (S.dOrg >= 0 || legalMoves(S).length) return null;
  return inCheck(S, S.turn) ? { winner: 1 - S.turn, why: 'mate' } : { winner: -1, why: 'stalemate' };
}
/** a position as text: the same for two positions exactly when the same moves are possible in both */
function posKey(S) {
  let k = S.turn ? 'b' : 'r';
  for (let s = 0; s < NSQ; s++) { const t = S.top[s]; if (t < 0) continue; k += '|' + s + ':'; for (const p of [t].concat(members(S, s).slice(1).sort((x, y) => S.kind[x] - S.kind[y]))) k += KIND_CODE[S.kind[p]] + (S.own[p] ? 'b' : 'r') + (S.hero[p] ? '*' : ''); }
  for (const x of S.exp) k += '|x' + S.at[x.p] + x.d + x.e;
  return k;
}
/** the position after these moves from the start (null if one of them cannot be played) */
function replay(setup, moves) {
  const S = newGame(setup);
  for (const m of moves || []) if (!play(S, m, true)) return null;
  return S;
}
/** a move as people write it: Tf4-f6, Fk4xk8 (takes, moving in), Fk4*k8 (takes from where it stands), +g5 a rider getting off */
function moveText(S, m) {
  if (mMode(m) === COMMIT) return 'done';
  const a = mActor(m), M = members(S, mFrom(m)), part = M.length > 1 && !(mGroup(m) === (1 << M.length) - 1);
  const sign = ['-', 'x', '*', 'x!', '?', '+', ''][mMode(m)];
  return (part ? '(' + KIND_CODE[S.kind[a]] + ')' : KIND_CODE[S.kind[a]]) + sqName(mFrom(m)) + sign + sqName(mTo(m));
}

if (typeof module !== 'undefined') module.exports = { NF, NR, NSQ, FILES, RED, BLUE, COMMANDER, INFANTRY, TANK, MILITIA, ENGINEER, ARTILLERY, ANTIAIR, MISSILE, AIR, NAVY, HQ, KIND_NAME, KIND_CODE,
  LAND, WATER, MIXED, BRIDGE, MOVE, CAPTURE, STAY, SUICIDE, INTERCEPT, COMBINE, COMMIT, COMMIT_MOVE, SAFE, TRADE, INTERCEPTED, TERRAIN, BANK, CORE, DIRS, RAY, LINE, AD_R, AD_SQ, SETUP_STANDARD,
  MOVE_ORTH, MOVE_DIAG, CAP_ORTH, CAP_DIAG, sqOf, fileOf, rankOf, sqName, sqNamed, newGame, clone, members, fits, carrierOf, setStack, killStack, standsOn, adMask, airOutcome, interceptPoint, attacks, inCheck, exposed,
  mk, mFrom, mTo, mMode, mActor, mGroup, gen, genSquare, play, commit, legalMoves, canFinish, status, posKey, replay, moveText };
