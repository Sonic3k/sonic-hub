/* Lạc Hồng — Commander Chess, kit 2. Load this file directly in match.html.
   The public rules decide every move returned to the table. The search uses
   precomputed rays and reuses positions at each ply for the common moves. */
'use strict';

const {
  NSQ, TERRAIN, WATER, MIXED, BANK, LINE, RAY, COMMANDER, INFANTRY, TANK,
  MILITIA, ENGINEER, ARTILLERY, ANTIAIR, MISSILE, AIR, NAVY, HQ,
  MOVE, CAPTURE, STAY, SUICIDE, INTERCEPT, COMBINE, COMMIT, COMMIT_MOVE,
  mFrom, mTo, mMode, mActor, mGroup
} = CC;
const VALUE = [0, 105, 235, 126, 87, 480, 157, 279, 665, 505, 52];
const HERO = [0, 85, 128, 73, 72, 181, 112, 159, 435, 205, 104];
const ARM = [-1, 2, 2, -1, -1, 2, -1, -1, 1, 0, -1];
const SMALL = [0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 0];
const HEAVY = [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0];
const PAIRS = NSQ * NSQ, MATE = 30000, MATE_BAND = 27000, INF = 32000;
const code = (k, h) => k * 2 + h;
const file = s => s % 11;
const rank = s => (s / 11) | 0;
const distance = new Uint8Array(PAIRS);
const reach = new Uint8Array(22 * PAIRS);
const pressure = new Int8Array(22 * PAIRS);
const steps = new Array(22 * NSQ);
const squareValue = new Int16Array(2 * 22 * NSQ);
const kindPair = new Int8Array(121).fill(-1);
const blocks = (S, step, shipsOnly, shorePass) => {
  for (let j = 0; j < step.i; j++) {
    const p = S.top[step.ray[j]];
    if (p < 0) continue;
    if (shipsOnly ? S.kind[p] === NAVY : !(shorePass && S.kind[p] === NAVY && TERRAIN[step.ray[j]] === MIXED)) return true;
  }
  return false;
};

for (let k = 0; k <= HQ; k++) for (let q = 0; q <= HQ; q++) {
  const mock = { kind: [k, q] };
  const carrier = CC.carrierOf(mock, [0, 1]);
  if (carrier >= 0) kindPair[k * 11 + q] = mock.kind[carrier];
}
const corner = (a, b) => (a === 46 && b === 58) || (a === 58 && b === 46) ||
                            (a === 79 && b === 69) || (a === 69 && b === 79);
for (let from = 0; from < NSQ; from++) {
  for (let t = 0; t < NSQ; t++) distance[from * NSQ + t] = Math.max(Math.abs(file(from) - file(t)), Math.abs(rank(from) - rank(t)));
  for (let k = 0; k <= HQ; k++) for (let h = 0; h < 2; h++) {
    const c = code(k, h), buffer = steps[c * NSQ + from] = [];
    for (let d = 0; d < 8; d++) {
      const ray = RAY[from * 8 + d];
      const max = k === HQ ? (h ? (d < 4 ? 2 : 1) : 0) : (d < 4 ? CC.CAP_ORTH[k] : CC.CAP_DIAG[k]) + (k === COMMANDER ? 0 : h);
      let seaRoute = true, allShore = TERRAIN[from] === MIXED, dry = TERRAIN[from] !== WATER, someShore = allShore;
      let boarding = true;
      for (let i = 0; i < max && i < ray.length; i++) {
        const to = ray[i], ground = TERRAIN[to];
        if (d >= 4 && corner(i ? ray[i-1] : from, to)) seaRoute = false;
        allShore = allShore && ground === MIXED;
        someShore = someShore || ground === MIXED;
        dry = dry && ground !== WATER;
        const crossing = (rank(from) < 6) !== (rank(to) < 6);
        const ford = (d === 2 || d === 3) && (file(from) === 5 || file(from) === 7);
        const canCross = !HEAVY[k] || !crossing || ford;
        const shipLand = seaRoute && (ground === WATER || ground === MIXED);
        buffer.push({ to, d, i, ray, shipLand, shorePass: dry && d < 4 && (d >= 2 ? allShore : someShore),
          walk: canCross && ground !== WATER, boardShip: canCross && boarding, gun: i < max - 1 });
        reach[c * PAIRS + from * NSQ + to] = 1;
        if (ground !== WATER && ground !== MIXED) seaRoute = false;
        if (ground === WATER) boarding = false;
      }
    }
    for (let target = 0; target < NSQ; target++) {
      const dx = Math.abs(file(from) - file(target)), dy = Math.abs(rank(from) - rank(target));
      const dist = Math.max(dx, dy), gap = Math.min(dx, dy, Math.abs(dx - dy));
      const r = k === AIR ? 4 + h : k === ARTILLERY ? 3 + h : k === NAVY ? 3 + h : k === TANK || k === MISSILE ? 2 + h : 1 + h;
      const weight = k === AIR ? 7 : k === ARTILLERY ? 6 : k === NAVY || k === TANK || k === MISSILE ? 3 : k === COMMANDER || k === HQ ? 0 : 2;
      pressure[c * PAIRS + from * NSQ + target] = Math.max(0, r + 4 - dist) * weight +
        (weight >= 6 && dist >= r && dist <= r + 3 ? Math.max(0, 3 - gap) * 2 : 0);
    }
    for (let side = 0; side < 2; side++) {
      const f = file(from), y = side ? 11 - rank(from) : rank(from);
      const xCenter = Math.max(0, 5 - Math.abs(f - 6)), yCenter = Math.min(y, 11-y);
      const mid = xCenter + yCenter;
      let v = 0;
      switch (k) {
        case COMMANDER: v = -8 * Math.max(0, y-1) + 2 * xCenter; break;
        case INFANTRY: case MILITIA: case ENGINEER: v = 3 * mid + 3 * y; break;
        case TANK: v = 4 * mid + 4 * Math.min(y, 8); break;
        case ARTILLERY: v = 6 * mid + 4 * Math.min(y, 7) + ((f === 5 || f === 7) ? 9 : 0); break;
        case ANTIAIR: v = 4 * mid + (y > 1 && y < 7 ? 9 : 0); break;
        case MISSILE: v = 5 * mid + (y > 1 && y < 7 ? 12 : 0); break;
        case AIR: v = 6 * mid + 3 * Math.min(y, 7) - (f < 2 ? 24 : 0); break;
        case NAVY: v = 5 * yCenter + (f === 2 ? 17 : f > 2 ? 25 : f === 1 ? 8 : 0) + 2 * Math.min(y, 7); break;
        case HQ: v = h ? 3 * mid : 0; break;
      }
      squareValue[(side * 22 + c) * NSQ + from] = v;
    }
  }
}

// Two independent additive hashes. Identical riders on the same carrier count
// twice. The representation also matches the table's identity-free posKey.
const HSIZE = 2 * 11 * 2 * 2 * NSQ + 2;
const hash1 = new Int32Array(HSIZE), hash2 = new Int32Array(HSIZE);
let seed = 0x62e71b4d;
function nextHash() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; }
for (let i = 0; i < HSIZE; i++) { hash1[i] = nextHash(); hash2[i] = nextHash(); }
const pieceKey = (side, k, h, rider, s) => (((side * 11 + k) * 2 + h) * 2 + rider) * NSQ + s;
const signed = side => side ? -1 : 1;
const profile = (S, p) => code(S.kind[p], S.hero[p]);
const power = (S, p) => VALUE[S.kind[p]] + (S.hero[p] ? HERO[S.kind[p]] : 0);
const squareTerm = (S, p, s) => squareValue[(S.own[p] * 22 + profile(S, p)) * NSQ + s];
const forceAt = (S, p, s, t) => pressure[profile(S, p) * PAIRS + s * NSQ + t];

let sideIds, pool, listPool, pv, killers, history, generation = 0;
const EMPTY = [];
function frame(S) {
  const T = CC.clone(S);
  T.count = new Uint8Array(6); T.last = new Int16Array(6);
  T.live = new Uint8Array(2); T.survivor = new Int16Array(2);
  return T;
}
function pieceOn(S, p, square, change) {
  const side = S.own[p], k = S.kind[p], h = S.hero[p], rider = +(S.car[p] >= 0);
  const key = pieceKey(side, k, h, rider, square);
  S.h1 = (S.h1 + change * hash1[key]) | 0;
  S.h2 = (S.h2 + change * hash2[key]) | 0;
  S.base += change * signed(side) * (power(S, p) + squareTerm(S,p,square));
}
function rebuild(S) {
  S.count.fill(0); S.last.fill(0); S.live.fill(0); S.survivor.fill(0);
  S.base = S.h1 = S.h2 = S.points = 0;
  S.check = -1;
  for (let p = 0; p < S.n; p++) {
    const s = S.at[p], side = S.own[p], k = S.kind[p], arm = ARM[k];
    if (s < 0) { S.points -= signed(side) * (CC.POINTS[k] + 10 * S.hero[p]); continue; }
    pieceOn(S, p, s, 1);
    if (arm >= 0) { const a = side*3 + arm; S.count[a]++; S.last[a] ^= p; }
    if (k !== COMMANDER) { S.live[side]++; S.survivor[side] ^= p; }
  }
}
function copyInto(S, T) {
  T.top.set(S.top); T.at.set(S.at); T.hero.set(S.hero); T.car.set(S.car); T.c1.set(S.c1); T.c2.set(S.c2);
  T.count.set(S.count); T.last.set(S.last); T.live.set(S.live); T.survivor.set(S.survivor);
  T.h1 = S.h1; T.h2 = S.h2; T.base = S.base; T.points = S.points;
  T.turn = S.turn; T.half = S.half; T.full = S.full; T.over = S.over;
  T.dOrg = S.dOrg; T.dIrr = S.dIrr; T.dAct = S.dOrg >= 0 ? S.dAct.slice() : EMPTY;
  T.ad[0] = S.ad[0]; T.ad[1] = S.ad[1]; T.check = -1;
}
function threaten(S, p, target) {
  return reach[profile(S,p) * PAIRS + S.at[p] * NSQ + target] && CC.attacks(S,p,target);
}
function attacked(S, target, side) {
  const ids = sideIds[side];
  for (let j = 0; j < ids.length; j++) {
    const p = ids[j];
    if (S.at[p] >= 0 && threaten(S,p,target)) return true;
  }
  return false;
}
function inCheck(S) {
  if (S.check < 0) S.check = +attacked(S, S.at[S.cmd[S.turn]], 1-S.turn);
  return S.check;
}
function removePiece(S, p) {
  const side = S.own[p], k = S.kind[p], arm = ARM[k];
  if (CC.AD_R[k] && S.car[p] < 0) S.ad[side] = null;
  pieceOn(S, p, S.at[p], -1);
  S.points -= signed(side) * (CC.POINTS[k] + 10 * S.hero[p]);
  S.at[p] = S.car[p] = S.c1[p] = S.c2[p] = -1;
  if (arm >= 0) { const a = side*3+arm; S.count[a]--; S.last[a] ^= p; }
  if (k !== COMMANDER) { S.live[side]--; S.survivor[side] ^= p; }
}
function removeStack(S, s) {
  const t = S.top[s], a = S.c1[t], b = S.c2[t];
  removePiece(S,t);
  if (a >= 0) removePiece(S,a);
  if (b >= 0) removePiece(S,b);
  S.top[s] = -1;
}
function relocate(S, p, from, to) {
  pieceOn(S,p,from,-1); S.at[p] = to; pieceOn(S,p,to,1);
}
function crown(S, p) {
  const s = S.at[p];
  pieceOn(S,p,s,-1); S.hero[p] = 1; pieceOn(S,p,s,1);
  if (CC.AD_R[S.kind[p]] && S.car[p] < 0) S.ad[S.own[p]] = null;
}
function lost(S, side) {
  if (S.at[S.cmd[side]] < 0) return 'commander';
  if (!S.total) {
    for (let a = 0; a < 3; a++) if (!S.count[side*3+a] && S.had[side][a]) return CC.ARM_NAME[a];
  }
  return !S.live[side] && S.men[side] ? 'alone' : '';
}

// The reference handles splitting and joining, including the requirement that
// an intermediate deployment can eventually finish with its commander safe.
function advance(S, T, m) {
  copyInto(S,T);
  const mode = mMode(m), from = mFrom(m), to = mTo(m), a = mActor(m);
  const full = T.c2[a] >= 0 ? 7 : T.c1[a] >= 0 ? 3 : 1;
  if (S.dOrg >= 0 || mode === COMBINE || mode === COMMIT || T.top[from] !== a || mGroup(m) !== full) {
    if (!CC.play(T,m,true)) return false;
    if (T.dOrg >= 0 && !CC.canFinish(T,0)) return false;
    rebuild(T);
    return true;
  }
  const me = S.turn, foe = 1-me, k = T.kind[a];
  if (mode === CAPTURE || mode === STAY || mode === SUICIDE) removeStack(T,to);
  if (mode === SUICIDE || mode === INTERCEPT) removeStack(T,from);
  else if (mode !== STAY) {
    T.top[from] = -1; T.top[to] = a;
    relocate(T,a,from,to);
    if (T.c1[a] >= 0) relocate(T,T.c1[a],from,to);
    if (T.c2[a] >= 0) relocate(T,T.c2[a],from,to);
    if (CC.AD_R[k]) T.ad[me] = null;
  }
  if (CC.exposed(T) || T.at[T.cmd[me]] < 0 || attacked(T,T.at[T.cmd[me]],foe)) return false;
  {
    let why = lost(T,foe);
    if (why) { T.over = { winner: me, why }; return true; }
    why = lost(T,me);
    if (why) { T.over = { winner: foe, why }; return true; }
  }
  const ec = T.at[T.cmd[foe]], ids = sideIds[me];
  let promoted = false;
  for (let j = 0; j < ids.length; j++) {
    const p = ids[j];
    if (T.at[p] >= 0 && !T.hero[p] && T.kind[p] !== COMMANDER && threaten(T,p,ec)) {
      crown(T,p); promoted = true;
    }
  }
  for (let side = 0; side < 2; side++) {
    const p = T.survivor[side];
    if (T.live[side] === 1 && !T.hero[p]) { crown(T,p); promoted = true; }
  }
  T.half = mode !== MOVE || promoted ? 0 : T.half + 1;
  if (T.half >= 100) { T.over = CC.onPoints(T,'quiet'); return true; }
  T.turn = foe; if (me) T.full++;
  return true;
}

function mayJoin(S, a, q, to) {
  let carrier;
  if (S.c1[q] < 0) carrier = kindPair[S.kind[a]*11 + S.kind[q]];
  else {
    if (S.c2[q] >= 0) return false;
    const c = CC.carrierOf(S,[a,q,S.c1[q]]);
    carrier = c < 0 ? -1 : S.kind[c];
  }
  return carrier >= 0 && (carrier !== ENGINEER || BANK[to]);
}
function singletonMoves(S, p, out, onlyTakes, quietChecks) {
  const from = S.at[p], k = S.kind[p], side = S.turn, h = S.hero[p];
  if (k === COMMANDER) { CC.genSquare(S,from,out,onlyTakes); return; }
  const list = steps[profile(S,p)*NSQ + from], ec = S.at[S.cmd[1-side]];
  const checks = quietChecks && !h && (k === AIR || k === ARTILLERY || k === NAVY || k === MISSILE);
  const base = (1 << 25) | (p << 19) | from;
  for (let j = 0; j < list.length; j++) {
    const step = list[j], to = step.to, q = S.top[to];
    const encoded = base | (to << 8);
    if (q < 0 || S.own[q] === side) {
      if (onlyTakes && (q >= 0 || !checks || !reach[code(k,h)*PAIRS+to*NSQ+ec])) continue;
      if (q >= 0 && !mayJoin(S,p,q,to)) continue;
      let allowed;
      if (k === AIR) {
        allowed = (TERRAIN[to] !== WATER || (q >= 0 && S.kind[q] === NAVY)) &&
          (h || CC.airOutcome(S,side,from,step.d,step.i) === CC.SAFE);
      } else if (k === NAVY) allowed = step.shipLand && !blocks(S,step,true,false);
      else {
        allowed = step.walk && !blocks(S,step,false,step.shorePass);
        if (!allowed && q >= 0 && S.kind[q] === NAVY && step.boardShip) allowed = !blocks(S,step,false,false);
      }
      if (allowed) out.push(encoded | ((q < 0 ? MOVE : COMBINE) << 16));
      continue;
    }
    const qk = S.kind[q];
    if (qk === HQ && SMALL[k] && S.c1[q] >= 0) continue;
    if (k === AIR) {
      const flight = h ? CC.SAFE : CC.airOutcome(S,side,from,step.d,step.i);
      if (flight !== CC.SAFE) out.push(encoded | ((flight === CC.TRADE ? SUICIDE : INTERCEPT) << 16));
      else {
        if (TERRAIN[to] !== WATER) out.push(encoded | (CAPTURE << 16));
        if (qk !== AIR) out.push(encoded | (STAY << 16));
      }
    } else if (k === NAVY) {
      if (qk === NAVY ? blocks(S,step,true,false) : !step.gun) continue;
      const lands = step.shipLand && !blocks(S,step,true,false);
      out.push(encoded | ((lands ? CAPTURE : STAY) << 16));
    } else if (k === ARTILLERY || !blocks(S,step,false,false)) {
      out.push(encoded | ((TERRAIN[to] === WATER ? STAY : CAPTURE) << 16));
    }
  }
}
function generate(S, out, onlyTakes, quietChecks) {
  out.length = 0;
  if (S.dOrg >= 0) { CC.gen(S,out,false); return; }
  const ids = sideIds[S.turn];
  for (let j = 0; j < ids.length; j++) {
    const p = ids[j], s = S.at[p];
    if (s < 0 || S.car[p] >= 0) continue;
    if (S.c1[p] < 0) singletonMoves(S,p,out,onlyTakes,quietChecks);
    else {
      const start = out.length;
      CC.genSquare(S,s,out,false);
      if (onlyTakes) {
        let write = start;
        for (let i = start; i < out.length; i++) {
          const m = out[i], mode = mMode(m);
          if (mode >= CAPTURE && mode <= INTERCEPT) out[write++] = m;
        }
        out.length = write;
      }
    }
  }
}

function reserveValue(S, p) {
  const k = S.kind[p], side = S.own[p], a = ARM[k];
  if (k === COMMANDER) return 20000;
  if ((!S.total && a >= 0 && S.count[side*3+a] === 1) || S.live[side] === 1) return 14500;
  return power(S,p);
}
function stackValue(S,p) {
  let v = reserveValue(S,p);
  if (S.c1[p] >= 0) v += reserveValue(S,S.c1[p]);
  if (S.c2[p] >= 0) v += reserveValue(S,S.c2[p]);
  return v;
}
function lastThreat(S, side) {
  if (S.total) return false;
  for (let a = 0; a < 3; a++) {
    const key = side*3+a;
    if (S.count[key] === 1 && attacked(S,S.at[S.last[key]],1-side)) return true;
  }
  return false;
}
// Threats on valuable pieces distinguish a protected exchange, a free shot,
// and a double attack. A plane which must die to hit the target pays its price.
function cheapestAttack(S, target, side) {
  const ids = sideIds[side], at = S.at, offset = target;
  let cheapest = 20000;
  for (let i = 0; i < ids.length; i++) {
    const p = ids[i], s = at[p];
    if (s < 0 || !reach[profile(S,p)*PAIRS + s*NSQ + offset] || !CC.attacks(S,p,target)) continue;
    let price = S.kind[p] === COMMANDER ? 2200 : power(S,p);
    if (S.kind[p] === AIR && !S.hero[p]) {
      const line = LINE[s*NSQ+target];
      if (CC.airOutcome(S,side,s,line >> 4,line & 15) === CC.TRADE) price += 850;
    }
    if (price < cheapest) cheapest = price;
  }
  return cheapest;
}
const EVAL_SIZE = 1 << 17, EVAL_MASK = EVAL_SIZE-1;
const evalA = new Int32Array(EVAL_SIZE), evalB = new Int32Array(EVAL_SIZE);
const evalAge = new Uint16Array(EVAL_SIZE), evalValue = new Int16Array(EVAL_SIZE);
function evaluate(S) {
  const a = positionA(S), b = (positionB(S) ^ Math.imul(S.points+2048,0x1e35a7bd) ^ Math.max(0,S.half-66)) | 0;
  const slot = (a ^ (b >>> 13)) & EVAL_MASK;
  if (evalAge[slot] === generation && evalA[slot] === a && evalB[slot] === b) return evalValue[slot];
  let v = S.base + 2 * S.points;
  for (let side = 0; side < 2; side++) {
    const foe = 1-side, ids = sideIds[side], ec = S.at[S.cmd[foe]], ownKing = S.at[S.cmd[side]];
    let val = 0, highest = 0, next = 0;
    if (!S.total) {
      const a = side*3;
      if (S.count[a] === 1 && S.had[side][0] > 1) val -= 201;
      if (S.count[a+1] === 1 && S.had[side][1] > 1) val -= 236;
      if (S.count[a+2] === 1 && S.had[side][2] > 1) val -= 220;
    }
    const homeAD = CC.adMask(S,side);
    val += homeAD[ownKing] ? 13 : 0;
    for (let i = 0; i < ids.length; i++) {
      const p = ids[i], s = S.at[p];
      if (s < 0) continue;
      const k = S.kind[p];
      val += forceAt(S,p,s,ec);
      if (S.car[p] >= 0) {
        const carrier = S.car[p];
        if (k === COMMANDER) val += S.kind[carrier] === HQ ? 22 : -30;
        else if (k === AIR) val -= 55;
        else val += k === TANK ? 22 : 8;
        continue;
      }
      if (k === AIR) val += homeAD[s] ? 28 : 0;
      if (k === ARTILLERY) val += homeAD[s] ? 16 : 0;
      if (k === HQ || k === COMMANDER) continue;
      if (k !== AIR && k !== NAVY && k !== ARTILLERY && k !== MISSILE && S.c1[p] < 0 && !S.hero[p]) continue;
      const price = cheapestAttack(S,s,foe);
      if (price >= 20000) continue;
      let worth = power(S,p);
      if (S.c1[p] >= 0) worth += power(S,S.c1[p]);
      if (S.c2[p] >= 0) worth += power(S,S.c2[p]);
      const arm = ARM[k], essential = !S.total && arm >= 0 && S.count[side*3+arm] === 1;
      let liability = 0;
      if (price < 1000) {
        const defended = attacked(S,s,side);
        liability = defended ? 11 + Math.max(0,worth-price)*0.16 : 22 + worth*0.20;
      } else liability = 8 + Math.max(0, worth-650)*0.18;
      if (essential) liability += 105;
      if (liability > highest) { next = highest; highest = liability; }
      else if (liability > next) next = liability;
    }
    val -= highest * (side === S.turn ? 0.38 : 0.86) + next * 0.81;
    v += signed(side) * val;
  }
  if (S.half > 66 && S.points) v += Math.sign(S.points) * (S.half-66) * 5;
  const result = ((S.turn ? -v : v) + 10) | 0;
  evalA[slot] = a; evalB[slot] = b; evalAge[slot] = generation; evalValue[slot] = result;
  return result;
}

// Move ordering. Tactical targets and new heroes come first. A history table
// learns useful quiet replies as the iterative search gets deeper.
const HIST_SIZE = 2 * 11 * NSQ * NSQ;
const histKey = (S,m) => (S.turn*11+S.kind[mActor(m)])*PAIRS + mFrom(m)*NSQ + mTo(m);
function order(S,m,ply,ttMove) {
  if (m === ttMove) return 1200000;
  const mode = mMode(m);
  if (mode === COMMIT) return 112;
  const a = mActor(m), k = S.kind[a], from = mFrom(m), to = mTo(m), group = mGroup(m);
  const foe = 1-S.turn, ec = S.at[S.cmd[foe]];
  if (mode === INTERCEPT) return -99000;
  const moved = mode !== STAY && mode !== SUICIDE;
  let bonus = 0;
  if (moved) {
    bonus = squareTerm(S,a,to) - squareTerm(S,a,from) + 2*(forceAt(S,a,to,ec)-forceAt(S,a,from,ec));
    if (reach[profile(S,a)*PAIRS+to*NSQ+ec]) bonus += S.hero[a] ? 163 : k === AIR ? 600 : k === ARTILLERY ? 360 : 215;
  }
  if (mode >= CAPTURE && mode <= SUICIDE) {
    const q = S.top[to], target = stackValue(S,q);
    let cost = power(S,a);
    if (mode === SUICIDE) {
      cost = reserveValue(S,a);
      const top = S.top[from];
      if ((group & 1) && top !== a) cost += reserveValue(S,top);
      if ((group & 2) && S.c1[top] !== a) cost += reserveValue(S,S.c1[top]);
      if ((group & 4) && S.c2[top] !== a) cost += reserveValue(S,S.c2[top]);
      return (target >= 14000 ? 540000 : target+80 >= cost ? 90000 : 280) + 6*Math.min(30000,target) - 5*Math.min(cost,25000);
    }
    return 95000 + Math.min(35000,target)*9 - cost + (mode === STAY ? 60 : 0) + bonus;
  }
  if (mode === COMBINE) {
    const q = S.top[to], qk = S.kind[q];
    bonus += k === COMMANDER ? (qk === HQ ? 35 : -42) : k === AIR || qk === AIR ? -18 : 5;
  }
  if (m === killers[ply][0]) bonus += 820;
  else if (m === killers[ply][1]) bonus += 640;
  return bonus + history[histKey(S,m)];
}

const TT_SIZE = 1 << 18, TT_MASK = TT_SIZE-1;
const ttA = new Int32Array(TT_SIZE), ttB = new Int32Array(TT_SIZE), ttMove = new Int32Array(TT_SIZE);
const ttValue = new Int16Array(TT_SIZE), ttDepth = new Int8Array(TT_SIZE), ttFlag = new Int8Array(TT_SIZE), ttAge = new Uint16Array(TT_SIZE);
const EXACT = 1, LOWER = 2, UPPER = 3;
let ctx, reserveMs, nodes, previous, keysA, keysB, repetitionAt;
const timeout = {};
const asMate = (winner,side,ply) => winner < 0 ? 0 : (winner === side ? MATE-ply : ply-MATE);
const pointWinner = p => p === 0 ? -1 : p > 0 ? 0 : 1;
function hashHistory(seen) {
  const map = new Map();
  for (const key of Object.keys(seen || {})) {
    const chunks = key.split('|'), side = +(chunks[0] === 'b');
    let a = side ? hash1[HSIZE-1] : 0, b = side ? hash2[HSIZE-1] : 0;
    for (let i = 1; i < chunks.length; i++) {
      const part = chunks[i], sep = part.indexOf(':'), sq = +part.slice(0,sep);
      let first = true;
      for (let j = sep+1; j < part.length;) {
        const k = CC.KIND_CODE.indexOf(part[j++]), owner = +(part[j++] === 'b');
        const hero = +(part[j] === '*'); if (hero) j++;
        const index = pieceKey(owner,k,hero,+!first,sq); first = false;
        a = (a+hash1[index])|0; b = (b+hash2[index])|0;
      }
    }
    // A second hash distinguishes positions sharing a bucket.
    const bucket = map.get(a);
    if (bucket) bucket.push(b,seen[key]); else map.set(a,[b,seen[key]]);
  }
  return map;
}
function positionA(S) { return (S.h1 + (S.turn ? hash1[HSIZE-1] : 0)) | 0; }
function positionB(S) { return (S.h2 + (S.turn ? hash2[HSIZE-1] : 0)) | 0; }
function occurrences(a,b,ply) {
  let count = 0;
  const bucket = previous.get(a);
  if (bucket) for (let i=0; i<bucket.length; i+=2) if (bucket[i] === b) { count += bucket[i+1]; break; }
  for (let i = 1; i < ply; i++) if (repetitionAt[i] && keysA[i] === a && keysB[i] === b) count++;
  return count;
}
function checkTime(force) {
  if ((force || (nodes & 31) === 0) && ctx.timeLeft() <= reserveMs) throw timeout;
}
function rememberQuiet(S,m,ply,depth) {
  if (mMode(m) !== MOVE && mMode(m) !== COMBINE) return;
  const moves = killers[ply];
  if (moves[0] !== m) { moves[1] = moves[0]; moves[0] = m; }
  const i = histKey(S,m), gain = Math.min(150,10*depth*depth);
  history[i] += gain - ((history[i]*gain) >> 11);
}
const RADIX = 268435456;
const descending = (a,b) => b-a;
function ordered(S,ply,takes,checks,best) {
  const list = listPool[ply];
  generate(S,list,takes,checks);
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    list[i] = (order(S,m,ply,best)+200000)*RADIX + m;
  }
  list.sort(descending);
  return list;
}
function recordPV(ply,m,continuation) {
  const line = pv[ply];
  line.length = 1; line[0] = m;
  if (continuation) for (const step of pv[ply+1]) line.push(step);
}
function setupSearch(S, context) {
  ctx = context;
  reserveMs = Math.min(74, Math.max(5, context.timeMs*0.065));
  if (context.timeMs < 50) reserveMs = Math.max(2,context.timeMs*0.15);
  nodes = 0; previous = hashHistory(ctx.seen);
  sideIds = [[],[]];
  for (let p = 0; p < S.n; p++) sideIds[S.own[p]].push(p);
  pool = Array.from({length:47},()=>frame(S));
  listPool = Array.from({length:47},()=>[]);
  pv = Array.from({length:47},()=>[]);
  killers = Array.from({length:47},()=>[0,0]);
  if (!history) history = new Int16Array(HIST_SIZE);
  else {
    // Decay entries for the ongoing game; they are ordering hints only.
    for (let i=0;i<history.length;i++) history[i] >>= 1;
  }
  generation++;
  if (generation >= 65535) { ttAge.fill(0); evalAge.fill(0); generation = 1; }
  keysA = new Int32Array(47); keysB = new Int32Array(47); repetitionAt = new Uint8Array(47);
  const root = pool[0];
  rebuild(root);
  return root;
}

/* Depth is in changes of side. A deployment is searched until it finishes
   at the same depth and with the same sign. The quiescence search includes
   rider captures, forced check evasions and threats to a side's last arm. */
function search(S,depth,alpha,beta,ply,qply,extensions) {
  nodes++; checkTime(false);
  pv[ply].length = 0;
  const deploy = S.dOrg >= 0, me = S.turn;
  let a = 0, b = 0, prior = 0;
  repetitionAt[ply] = +!deploy;
  if (!deploy) {
    keysA[ply] = a = positionA(S); keysB[ply] = b = positionB(S);
    prior = occurrences(a,b,ply);
    if (prior >= 2) return asMate(pointWinner(S.points),me,ply);
  }
  if (ply >= 42) return evaluate(S);
  const check = !deploy && inCheck(S);
  if (depth > 0 && check && extensions > 0 && depth <= 4) { depth++; extensions--; }
  const q = depth <= 0;
  // At a quiet leaf, stand pat is unsound if a single capture ends Battles.
  const danger = !deploy && !check && q && qply < 2 && lastThreat(S,me);
  const forced = deploy || check || danger;
  const ah = (a ^ Math.imul(S.half+1,0x9e3779b1)) | 0;
  const bh = (b ^ Math.imul(S.points+2048,0x27d4eb2d)) | 0;
  const slot = (ah ^ (bh >>> 13)) & TT_MASK;
  const match = !deploy && ttAge[slot] === generation && ttA[slot] === ah && ttB[slot] === bh;
  const hint = match ? ttMove[slot] : 0;
  const ttOK = !deploy && !prior && !q;
  if (ttOK && match && ttDepth[slot] >= depth && beta === alpha+1) {
    let v = ttValue[slot];
    if (v > MATE_BAND) v -= ply; else if (v < -MATE_BAND) v += ply;
    if (ttFlag[slot] === EXACT || (ttFlag[slot] === LOWER && v >= beta) || (ttFlag[slot] === UPPER && v <= alpha)) return v;
  }
  const originalAlpha = alpha;
  let best = -INF, bestMove = 0, staticEval = -INF;
  if (q && !deploy) {
    staticEval = evaluate(S);
    if (!forced) {
      if (staticEval >= beta) return staticEval;
      best = staticEval;
      if (best > alpha) alpha = best;
      if (qply >= 7) return best;
    } else if (qply >= 10) return staticEval - (check ? 55 : 0);
  }
  const quietChecks = q && !forced && qply === 0 && beta-alpha > 1;
  const list = ordered(S,ply,q && !forced,quietChecks,hint), T = pool[ply+1];
  const scout = beta-alpha === 1;
  let legal = 0, quietSearched = 0;
  for (let i = 0; i < list.length; i++) {
    const m = list[i] % RADIX, mode = mMode(m), quiet = mode === MOVE || mode === COMBINE;
    const simple = !deploy && !check && !danger;
    if (mode === INTERCEPT && legal > 0 && !forced) continue;
    if (q && !forced && mode === SUICIDE && S.live[me] > 1) {
      const victim = stackValue(S,S.top[mTo(m)]), cost = reserveValue(S,mActor(m));
      if (victim < 10000 && cost > victim+230 && staticEval+victim+210 < alpha) continue;
    }
    if (!advance(S,T,m)) continue;
    legal++;
    const continuing = !T.over && T.turn === me;
    const givesCheck = !T.over && !continuing && inCheck(T);
    if (q && !forced && quiet && !givesCheck) continue;
    let v;
    if (T.over) v = asMate(T.over.winner,me,ply+1);
    else if (continuing) v = search(T,depth,alpha,beta,ply+1,qply,extensions);
    else {
      const next = depth-1, childQ = q ? qply+1 : 0;
      const reducible = simple && quiet && !givesCheck && !prior && m !== hint && m !== killers[ply][0];
      if (reducible) quietSearched++;
      // Late, quiet moves get a shorter first probe. Every improving probe
      // is verified at full depth before it can replace the principal move.
      if (!q && scout && reducible && depth <= 2 && quietSearched > (depth === 1 ? 14 : 28) && best > -MATE_BAND) continue;
      const reduction = !q && reducible && depth >= 3 && legal >= 5 ? (depth >= 5 && legal >= 15 ? 2 : 1) : 0;
      if (!q && legal > 1 && (reduction || beta-alpha > 1)) {
        v = -search(T,next-reduction,-alpha-1,-alpha,ply+1,childQ,extensions);
        if (reduction && v > alpha) v = -search(T,next,-alpha-1,-alpha,ply+1,childQ,extensions);
        if (v > alpha && v < beta) v = -search(T,next,-beta,-alpha,ply+1,childQ,extensions);
      } else v = -search(T,next,-beta,-alpha,ply+1,childQ,extensions);
    }
    if (v > best) {
      best = v; bestMove = m; recordPV(ply,m,continuing);
      if (v > alpha) {
        alpha = v;
        if (alpha >= beta) {
          if (!q && quiet) rememberQuiet(S,m,ply,depth);
          break;
        }
      }
    }
  }
  if (!legal && (!q || forced)) best = ply-MATE;
  if (ttOK && (!match || depth >= ttDepth[slot]-1)) {
    ttAge[slot] = generation; ttA[slot] = ah; ttB[slot] = bh; ttDepth[slot] = depth;
    ttMove[slot] = bestMove; ttFlag[slot] = best <= originalAlpha ? UPPER : best >= beta ? LOWER : EXACT;
    ttValue[slot] = best > MATE_BAND ? best+ply : best < -MATE_BAND ? best-ply : best;
  }
  return best;
}

function completeTurn(S, legal, line) {
  const result = [], T = CC.clone(S), side = S.turn;
  while (!T.over && T.turn === side && legal.length) {
    let m = line[result.length];
    if (!legal.includes(m)) {
      // A timed-out search can end in the middle of a planned deployment.
      // Prefer a winning finish, then a profitable shot, then a safe commit.
      let best = -Infinity;
      for (const candidate of legal) {
        const mode = mMode(candidate);
        let v = mode === COMMIT ? 10 : mode === INTERCEPT ? -90000 : -1;
        if (mode === CAPTURE || mode === STAY || mode === SUICIDE) {
          const q = T.top[mTo(candidate)];
          v = 0;
          for (const p of CC.members(T,mTo(candidate))) v += T.kind[p] === COMMANDER ? MATE : power(T,p);
          if (mode === SUICIDE) v -= power(T,mActor(candidate));
          if (!T.total && ARM[T.kind[q]] >= 0 && CC.arms(T,1-side)[ARM[T.kind[q]]] === 1) v += 14000;
        }
        if (v > best) { best = v; m = candidate; }
      }
    }
    result.push(m); CC.play(T,m,true);
    if (T.over || T.turn !== side) break;
    legal = CC.legalMoves(T);
  }
  return result;
}

// Opening positions analysed ahead of time with longer searches (both line-ups).
// Each line stores both board hashes and the verified move sequence.
const openings = [new Map(), new Map()];
openings[0].set(1458169198, [923205948, 34093068]);  // initial position
openings[0].set(1969038923, [1349677202, 45630822]);  // Nb2-b6
openings[0].set(-1888679029, [-668217132, 34615311]);  // Nb2-b6 Ad10-d7
openings[0].set(-1791459036, [-564719286, 47731036]);  // Nb2-b6 Ad10-d7 Fe2-e5
openings[0].set(1098304992, [1621002301, 47332442]);  // Tf4-f6
openings[0].set(-744791264, [1476572429, 43008879]);  // Fi2-g4
openings[0].set(904230026, [-1191328313, 43008879]);  // Fi2-k4
openings[0].set(-1446420575, [1603707204, 43008879]);  // Fe2+c4
openings[0].set(-1732818760, [-1674908496, 43017071]);  // Nc4-a6
openings[0].set(-1790356396, [-211143365, 45113974]);  // Th4-h6
openings[0].set(-399699718, [1960243805, 47268954]);  // Nc4-c7
openings[0].set(1710300015, [69582105, 47266138]);  // Nc4-c6
openings[0].set(1613828791, [-312168829, 45110646]);  // Nb2-b5
openings[0].set(2032686772, [-221476967, 43008879]);  // Fi2-i6
openings[0].set(868324948, [-1167048984, 43014511]);  // Fe2-e6
openings[0].set(1555389191, [1026703794, 43008879]);  // Fe2-e5
openings[0].set(-412907852, [-784349517, 43008879]);  // Fi2-i5
openings[0].set(-1056497284, [1253753285, 43008879]);  // Fi2-h3
openings[0].set(1624223926, [-369193621, 43008879]);  // Aj3-j4
openings[0].set(1325890949, [-664482648, 43008879]);  // Mg5-g6
openings[0].set(1822921221, [954280188, 43008879]);  // Ic5-c6
openings[0].set(1475198714, [-899853747, 43008879]);  // Ik5-k6
openings[0].set(1379076248, [672056697, 43008879]);  // Fe2-g4
openings[0].set(-1914593449, [-1056741797, 43008879]);  // Fi2-f5
openings[0].set(-704747866, [402233123, 34093068]);  // initial position
openings[0].set(-193878141, [828704377, 44063087]);  // Nb2-b6
openings[0].set(1760804338, [-239046046, 34167096]);  // Nb2-b6 Nb11-b9
openings[0].set(1723758105, [1377147562, 48322906]);  // Nb2-b6 Nb11-b9 Nb6xb9
openings[0].set(-1064612072, [1100029476, 48381018]);  // Tf4-f6
openings[0].set(1387258968, [955599604, 44057455]);  // Fi2-g4
openings[0].set(-1258687038, [-1712301138, 44057455]);  // Fi2-k4
openings[0].set(685629657, [1082734379, 44057455]);  // Fe2+c4
openings[0].set(399231472, [2099085975, 44063087]);  // Nc4-a6
openings[0].set(341693836, [-732116190, 44583538]);  // Th4-h6
openings[0].set(1732350514, [1439270980, 48317530]);  // Nc4-c7
openings[0].set(-452617049, [-451390720, 48314714]);  // Nc4-c6
openings[0].set(-549088273, [-833141654, 44588658]);  // Nb2-b5
openings[0].set(-130230292, [-742449792, 44057455]);  // Fi2-i6
openings[0].set(-1294592116, [-1688021809, 48251482]);  // Fe2-e6
openings[0].set(-607527873, [505730969, 44057455]);  // Fe2-e5
openings[0].set(1719142380, [-1305322342, 44057455]);  // Fi2-i5
openings[0].set(1075552948, [732780460, 44057455]);  // Fi2-h3
openings[0].set(-538693138, [-890166446, 44057455]);  // Aj3-j4
openings[0].set(-837026115, [-1185455473, 44057455]);  // Mg5-g6
openings[0].set(-339995843, [433307363, 44057455]);  // Ic5-c6
openings[0].set(-687718350, [-1420826572, 44057455]);  // Ik5-k6
openings[0].set(-783840816, [151083872, 44057455]);  // Fe2-g4
openings[0].set(217456783, [-1577714622, 44057455]);  // Fi2-f5
openings[1].set(1458169198, [923205948, 34093068]);  // initial position
openings[1].set(1969038923, [1349677202, 43534962]);  // Nb2-b6
openings[1].set(738666613, [-1662201783, 34093880]);  // Nb2-b6 Fe11-i7
openings[1].set(217518658, [766724465, 43008879]);  // Nb2-b6 Fe11-i7 Nb6-e6
openings[1].set(1098304992, [1621002301, 43008879]);  // Tf4-f6
openings[1].set(-744791264, [1476572429, 43008879]);  // Fi2-g4
openings[1].set(904230026, [-1191328313, 43008879]);  // Fi2-k4
openings[1].set(-1446420575, [1603707204, 43008879]);  // Fe2+c4
openings[1].set(-1732818760, [-1674908496, 47203418]);  // Nc4-a6
openings[1].set(-1790356396, [-211143365, 45113974]);  // Th4-h6
openings[1].set(-399699718, [1960243805, 47268954]);  // Nc4-c7
openings[1].set(1710300015, [69582105, 47266138]);  // Nc4-c6
openings[1].set(1613828791, [-312168829, 43540082]);  // Nb2-b5
openings[1].set(2032686772, [-221476967, 43008879]);  // Fi2-i6
openings[1].set(868324948, [-1167048984, 43008879]);  // Fe2-e6
openings[1].set(1555389191, [1026703794, 43008879]);  // Fe2-e5
openings[1].set(-412907852, [-784349517, 43008879]);  // Fi2-i5
openings[1].set(-1056497284, [1253753285, 43008879]);  // Fi2-h3
openings[1].set(1624223926, [-369193621, 43008879]);  // Aj3-j4
openings[1].set(1325890949, [-664482648, 43008879]);  // Mg5-g6
openings[1].set(1822921221, [954280188, 43008879]);  // Ic5-c6
openings[1].set(1475198714, [-899853747, 43008879]);  // Ik5-k6
openings[1].set(1379076248, [672056697, 43008879]);  // Fe2-g4
openings[1].set(-1914593449, [-1056741797, 43008879]);  // Fi2-f5
openings[1].set(-704747866, [402233123, 34093068]);  // initial position
openings[1].set(-193878141, [828704377, 44063087]);  // Nb2-b6
openings[1].set(1760804338, [-239046046, 34167096]);  // Nb2-b6 Nb11-b9
openings[1].set(1723758105, [1377147562, 48322906]);  // Nb2-b6 Nb11-b9 Nb6xb9
openings[1].set(-1064612072, [1100029476, 48381018]);  // Tf4-f6
openings[1].set(1387258968, [955599604, 44057455]);  // Fi2-g4
openings[1].set(-1258687038, [-1712301138, 44057455]);  // Fi2-k4
openings[1].set(685629657, [1082734379, 44588658]);  // Fe2+c4
openings[1].set(399231472, [2099085975, 44063087]);  // Nc4-a6
openings[1].set(341693836, [-732116190, 44057455]);  // Th4-h6
openings[1].set(1732350514, [1439270980, 48317530]);  // Nc4-c7
openings[1].set(-452617049, [-451390720, 48314714]);  // Nc4-c6
openings[1].set(-549088273, [-833141654, 44066159]);  // Nb2-b5
openings[1].set(-130230292, [-742449792, 44057455]);  // Fi2-i6
openings[1].set(-1294592116, [-1688021809, 44057455]);  // Fe2-e6
openings[1].set(-607527873, [505730969, 44057455]);  // Fe2-e5
openings[1].set(1719142380, [-1305322342, 44057455]);  // Fi2-i5
openings[1].set(1075552948, [732780460, 44057455]);  // Fi2-h3
openings[1].set(-538693138, [-890166446, 44057455]);  // Aj3-j4
openings[1].set(-837026115, [-1185455473, 44057455]);  // Mg5-g6
openings[1].set(-339995843, [433307363, 44057455]);  // Ic5-c6
openings[1].set(-687718350, [-1420826572, 44057455]);  // Ik5-k6
openings[1].set(-783840816, [151083872, 44057455]);  // Fe2-g4
openings[1].set(217456783, [-1577714622, 44057455]);  // Fi2-f5

function openingLine(S,legal,context) {
  // Only use the book during its original opening window. A repeated board
  // later in the game or a custom setup may have a different point outcome.
  if (context.timeMs > 3500 || S.full > 2 || S.dOrg >= 0 || S.half > 3 ||
      (S.n !== 34 && S.n !== 38) || Object.values(context.seen || {}).some(n=>n>1)) return null;
  const r=frame(S);
  rebuild(r);
  const entry=openings[S.total].get(positionA(r));
  if (!entry || entry[0] !== positionB(r) || !legal.includes(entry[1])) return null;
  return completeTurn(S,legal,entry.slice(1));
}

function choose(S, context) {
  const legal = CC.legalMoves(S);
  if (!legal.length) return [];
  if (legal.length === 1) {
    const forced = CC.clone(S);
    CC.play(forced,legal[0],true);
    if (forced.over || forced.turn !== S.turn) return legal;
  }
  const book = openingLine(S,legal,context);
  if (book) return book;
  const root = setupSearch(S,context), me = S.turn;
  const ranking = legal.map(m => ({ m, raw: order(root,m,0,0), score: -INF, child: null }));
  ranking.sort((a,b)=>b.raw-a.raw);
  let line = [ranking[0].m], bestStatic = -Infinity;
  try {
    for (const item of ranking) {
      checkTime(true);
      const m = item.m, T = frame(root);
      if (!advance(root,T,m)) continue;
      item.child = T;
      const continues = !T.over && T.turn === me;
      let v = T.over ? asMate(T.over.winner,me,1) : (T.turn === me ? 1 : -1)*evaluate(T);
      if (T.over && v >= MATE_BAND) return completeTurn(S,legal,[m]);
      if (!T.over && !continues) {
        const times = occurrences(positionA(T),positionB(T),1);
        if (times >= 2) {
          v = asMate(pointWinner(T.points),me,1);
          if (v > MATE_BAND) return completeTurn(S,legal,[m]);
        } else if (lastThreat(T,me) && !inCheck(T)) v -= 6500;
      }
      if (continues) {
        const finish = CC.clone(T);
        if (CC.commit(finish,true) && finish.over && finish.over.winner === me) return completeTurn(S,legal,[m,COMMIT_MOVE]);
      }
      item.score = v + Math.max(-36,Math.min(36,item.raw/25));
      if (item.score > bestStatic) { bestStatic = item.score; line = [m]; }
    }
    for (let depth = 1; depth <= 16; depth++) {
      ranking.sort((a,b)=>(b.m === line[0])-(a.m === line[0]) || b.score-a.score || b.raw-a.raw);
      let best = -INF;
      let answered = 0;
      for (const item of ranking) {
        checkTime(true);
        if (!item.child) continue;
        const T = item.child, cont = !T.over && T.turn === me;
        let v;
        if (T.over) v = asMate(T.over.winner,me,1);
        else if (cont) v = search(T,depth,best,INF,1,0,1);
        else if (answered === 0) v = -search(T,depth-1,-INF,INF,1,0,1);
        else {
          v = -search(T,depth-1,-best-1,-best,1,0,1);
          if (v > best) v = -search(T,depth-1,-INF,-best,1,0,1);
        }
        answered++;
        item.score = v;
        if (v > best) {
          best = v; line = cont ? [item.m,...pv[1]] : [item.m];
          if (best >= MATE-2) return completeTurn(S,legal,line);
        }
      }
      if (best >= MATE_BAND || best <= -MATE_BAND) break;
    }
  } catch (e) {
    if (e !== timeout) throw e;
  }
  return completeTurn(S,legal,line);
}

registerAI({
  id: 'lac-hong',
  name: 'Lạc Hồng',
  author: 'OpenAI Codex (GPT-6)',
  about: 'Săn máy bay và tàu cuối cùng của đối thủ. Dùng đòn chiếu để phong anh hùng và phối hợp nhiều quân trong cùng một lượt.',
  levels: 1,
  turn: choose
});
