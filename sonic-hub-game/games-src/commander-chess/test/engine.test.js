/* Checks of the rules: node test/engine.test.js
   1. the points cotulenh.vn lit up for each piece in eleven positions of real games (site-vectors.js);
   2. one small position for each rule that those games did not happen to show;
   3. games played at random to the end, looking at every position for something that cannot be. */
const E = require('../src/engine/00-core.js');
const { RED, BLUE, COMMANDER, INFANTRY, TANK, MILITIA, ENGINEER, ARTILLERY, ANTIAIR, MISSILE, AIR, NAVY, HQ, MOVE, CAPTURE, STAY, SUICIDE, INTERCEPT, COMBINE, COMMIT, COMMIT_MOVE } = E;
let failed = 0, passed = 0;
const ok = (cond, what) => { if (cond) passed++; else { failed++; console.log('FAIL  ' + what); } };
const same = (got, want, what) => ok(got === want, what + '\n      got  ' + got + '\n      want ' + want);

/** a position from text like "g1=C g12=c h4=T(IM) k5=I*": capitals Red, * a hero, (…) riders */
function position(text, turn = RED) {
  const toks = text.trim().split(/\s+/), red = [], blue = [], stacks = [];
  for (const t of toks) {
    const [sq, rest] = t.split('='), m = /^([A-Za-z])(\*?)(?:\(([A-Za-z*]+)\))?$/.exec(rest);
    const side = m[1] === m[1].toUpperCase() ? RED : BLUE, list = side === RED ? red : blue;
    const riders = (m[3] || '').match(/[A-Za-z]\*?/g) || [];
    stacks.push({ sq, side, hero: !!m[2], kind: E.KIND_CODE.indexOf(m[1].toUpperCase()), riders: riders.map(r => ({ kind: E.KIND_CODE.indexOf(r[0].toUpperCase()), hero: r.length > 1 })) });
  }
  // every piece gets a point of its own first (riders parked on a1, a2 …), then the stacks are put together
  let park = 0; const spare = () => { for (;;) { const n = E.sqName(park++); if (!toks.some(t => t.startsWith(n + '='))) return n; } };
  const where = [];
  for (const s of stacks) { const list = s.side === RED ? red : blue; list.push([s.kind, s.sq]); where.push([s, list.length - 1, s.side]); for (const r of s.riders) { const n = spare(); list.push([r.kind, n]); r.at = n; r.idx = list.length - 1; } }
  const S = E.newGame({ red, blue });
  const id = (side, idx) => (side === RED ? idx : red.length + idx);
  for (const [s, idx, side] of where) {
    const c = id(side, idx); S.hero[c] = s.hero ? 1 : 0;
    if (!s.riders.length) continue;
    const ids = [c]; for (const r of s.riders) { const p = id(side, r.idx); S.top[E.sqNamed(r.at)] = -1; S.hero[p] = r.hero ? 1 : 0; ids.push(p); }
    E.setStack(S, E.sqNamed(s.sq), ids, c);
  }
  S.turn = turn; return S;
}
/** the points the piece standing on `from` may go to: "moves|xtakes", the way the site shows them */
function lit(S, from, legal = E.legalMoves(S), whole = false) {
  const s = E.sqNamed(from), top = S.top[s], mv = new Set(), cap = new Set(), all = (1 << E.members(S, s).length) - 1;
  for (const m of legal) {
    if (E.mFrom(m) !== s || E.mActor(m) !== top || (whole && E.mGroup(m) !== all)) continue;
    const mode = E.mMode(m);
    if (mode === MOVE || mode === COMBINE) mv.add(E.sqName(E.mTo(m))); else if (mode !== INTERCEPT && mode !== COMMIT) cap.add(E.sqName(E.mTo(m)));
  }
  return [...mv].sort().join(',') + (cap.size ? '|x' + [...cap].sort().join(',') : '');
}
const norm = t => { const [a, b] = t.split('|x'); return a.split(',').filter(Boolean).sort().join(',') + (b ? '|x' + b.split(',').sort().join(',') : ''); };
const find = (S, from, to, mode, pred) => E.legalMoves(S).find(m => E.mFrom(m) === E.sqNamed(from) && E.mTo(m) === E.sqNamed(to) && (mode === undefined || E.mMode(m) === mode) && (!pred || pred(m)));
const has = (S, from, to, mode, pred) => find(S, from, to, mode, pred) !== undefined;
const go = (S, from, to, mode, pred) => { const m = find(S, from, to, mode, pred); if (m === undefined) throw new Error('no move ' + from + '>' + to); if (!E.play(S, m, true)) throw new Error('refused ' + from + '>' + to); return S; };
const alone = S => m => E.mGroup(m) === 1 << E.members(S, E.mFrom(m)).indexOf(E.mActor(m));

/* 1 ── as seen on the site */
require('./site-vectors.js').forEach((v, n) => {
  const S = position(v.b), legal = E.legalMoves(S);
  for (const sq of Object.keys(v.t)) same(lit(S, sq, legal), norm(v.t[sq]), 'site position ' + (n + 1) + ', piece on ' + sq);
});

/* 2 ── rule by rule */
const K = 'i1=C d12=c ';                                      // two Commanders out of each other's sight
{ // heavy pieces and the river
  let S = position(K + 'f6=A e6=G d5=S k1=I k12=i');
  ok(has(S, 'f6', 'f7', MOVE), 'artillery crosses by the bridge'); ok(!has(S, 'f6', 'g7'), 'artillery does not cross slantwise off the bridge');
  ok(!has(S, 'e6', 'e7'), 'anti-air does not cross where there is no bridge'); ok(!has(S, 'd5', 'd7'), 'missile does not cross where there is no bridge');
  S = position(K + 'd5=A d8=i e6=T e8=i'); ok(has(S, 'd5', 'd8', CAPTURE), 'artillery takes across the river and lands there'); ok(has(S, 'e6', 'e8', CAPTURE), 'a tank needs no bridge');
  S = position(K + 'd3=A d4=I d6=i f2=H f3=A f1=i'); ok(has(S, 'd3', 'd6', CAPTURE), 'artillery fires over a piece'); ok(!has(S, 'f3', 'f1'), 'artillery does not fire over a Headquarters');
  S = position(K + 'f3=S f2=H f1=i'); ok(has(S, 'f3', 'f1', CAPTURE), 'a missile fires over a Headquarters');
}
{ // the Engineer's ferry
  const S = position(K + 'd6=E d5=A j5=E j4=G');
  ok(has(S, 'd5', 'd6', COMBINE), 'artillery mounts an Engineer on the bank'); ok(!has(S, 'j4', 'j5', COMBINE), 'not away from the bank');
  go(S, 'd5', 'd6', COMBINE); S.turn = RED;
  same(lit(S, 'd6', undefined, true), 'c6,d7,e6', 'a loaded Engineer keeps to the bank and crosses without a bridge');
  ok(!has(S, 'd6', 'd7', MOVE, m => S.kind[E.mActor(m)] === ARTILLERY), 'the gun cannot get off across the river by itself');
  ok(has(S, 'd6', 'd3', MOVE, m => S.kind[E.mActor(m)] === ARTILLERY), 'the gun gets off on its own side');
}
{ // ships
  let S = position(K + 'c5=N c8=n');
  ok(!has(S, 'c5', 'd6'), 'no ship goes c5–d6'); ok(has(S, 'c5', 'c6', MOVE), 'a ship sails the shore');
  S = position(K + 'c6=N'); ok(has(S, 'c6', 'e6', MOVE), 'a ship goes up the river mouth'); ok(!has(S, 'c6', 'f6'), 'but not onto a bridge');
  S = position(K + 'a5=N a7=N a9=n b5=n'); ok(!has(S, 'a5', 'a8'), 'a ship does not pass a ship'); ok(!has(S, 'a5', 'a9', CAPTURE), 'nor take through one moving in');
  ok(has(S, 'a5', 'b5', CAPTURE), 'ship takes ship');
  S = position(K + 'c4=N f4=i g4=t d5=i'); ok(has(S, 'c4', 'f4', STAY), 'a ship shells the land three points off'); ok(!has(S, 'c4', 'g4'), 'but not four'); ok(has(S, 'c4', 'd5', STAY), 'slantwise as well');
  S = position(K + 'c4=T b4=n d2=I a2=n d7=A b9=n'); ok(has(S, 'c4', 'b4', STAY), 'a tank fires at a ship from the shore'); ok(!has(S, 'c4', 'b4', CAPTURE), 'it cannot drive into the sea');
  ok(!has(S, 'd2', 'a2'), 'infantry reaches one point only'); ok(has(S, 'd7', 'b9', STAY), 'artillery fires out to sea');
  S = position(K + 'c3=I c5=N c7=t', BLUE); ok(has(S, 'c7', 'c5', CAPTURE), 'a tank takes a ship on the shore');
  S = position(K + 'c2=T c3=n c5=i'); ok(has(S, 'c2', 'c4', MOVE), 'along the shore a land piece passes a ship');
  S = position(K + 'd2=T d3=n'); ok(!has(S, 'd2', 'd4'), 'nowhere else does it pass anything');
}
{ // the two Commanders
  let S = position('g1=C g12=c g5=I a1=N');
  ok(!has(S, 'g5', 'f5') && !has(S, 'g5', 'h5'), 'the piece between the Commanders may not step aside'); ok(has(S, 'g5', 'g6', MOVE), 'it may go on along the line');
  S = position('g1=C d12=c a1=N'); ok(!has(S, 'g1', 'd1'), 'a Commander does not step into the other one’s line'); ok(!has(S, 'g1', 'c1'), 'nor pass through it'); ok(has(S, 'g1', 'e1', MOVE), 'short of it is fine');
  S = position('g1=C g12=c a1=N'); ok(has(S, 'g1', 'g12', CAPTURE), 'Commanders that see each other take at any distance');
  go(S, 'g1', 'g12', CAPTURE); ok(S.over && S.over.winner === RED && S.over.why === 'commander', 'taking the Commander wins');
  S = position('g1=C g12=c g2=T(I) a12=n'); ok(!has(S, 'g2', 'h2', MOVE, m => E.mGroup(m) === 3), 'a stack between the Commanders stays too'); ok(has(S, 'g2', 'h2', MOVE, m => E.mGroup(m) === 1), 'but its tank may leave the infantry there');
  S = position('f2=H(C) f12=c a1=N'); ok(!E.exposed(S), 'a Commander inside a Headquarters is not seen'); ok(has(S, 'f2', 'g2', MOVE), 'and may come out sideways'); ok(!has(S, 'f2', 'f3'), 'not out into the line');
}
{ // check, mate, and no move left
  let S = position('h1=C g12=c f11=I a1=N', BLUE);
  ok(!E.inCheck(S, BLUE), 'infantry beside and behind does not check'); S = position('h1=C g12=c g11=I a1=N', BLUE); ok(E.inCheck(S, BLUE), 'infantry in front checks');
  ok(has(S, 'g12', 'g11', CAPTURE), 'the Commander may take it');
  S = position('h1=C g12=c g11=I g10=T a1=N', BLUE); ok(!has(S, 'g12', 'g11'), 'unless it is guarded');
  S = position('g1=C k12=c k10=T j9=A a1=N i12=T', BLUE); ok(E.inCheck(S, BLUE) && E.legalMoves(S).length === 0, 'no way out'); same(JSON.stringify(E.status(S)), '{"winner":0,"why":"mate"}', 'that is mate');
  S = position('g1=C k12=c j12=H k11=H h12=T k9=T', BLUE); ok(!E.inCheck(S, BLUE) && E.legalMoves(S).length === 0, 'not in check, nowhere to go'); same(JSON.stringify(E.status(S)), '{"winner":-1,"why":"stalemate"}', 'that is a draw');
}
{ // heroes
  let S = position('h1=C g12=c e10=T a1=N a12=n');
  go(S, 'e10', 'g10', MOVE); ok(S.hero[S.top[E.sqNamed('g10')]] === 1, 'a piece that gives check becomes a hero');
  go(S, 'g12', 'f12', MOVE); same(lit(S, 'g10'), 'd10,e10,f10,f11,f9,g11,g12,g7,g8,g9,h10,h11,h9,i10,j10', 'a hero tank goes three, and one slantwise');
  S = position('h1=C g12=c f2=H a12=n b12=n'); go(S, 'h1', 'i1', MOVE); ok(S.hero[S.top[E.sqNamed('f2')]] === 1, 'a side’s last piece becomes a hero');
  S.turn = RED; same(lit(S, 'f2'), 'e1,e2,e3,f1,f3,g1,g2,g3', 'and a hero Headquarters walks');
}
{ // holding a Headquarters point
  let S = position('h1=C g12=c f10=T h2=H a1=N a12=n k8=i');
  go(S, 'f10', 'f11'); same(S.core[RED], 1, 'on the point: one'); go(S, 'k8', 'k7'); go(S, 'a1', 'a2'); same(S.core[RED], 2, 'a turn later: two'); go(S, 'k7', 'k6'); go(S, 'a2', 'a3');
  ok(S.over && S.over.winner === RED && S.over.why === 'hq', 'three turns on the point win');
  S = position('h1=C g12=c f10=T h2=H a1=N a12=n k8=i');
  go(S, 'f10', 'f11'); go(S, 'k8', 'k7'); go(S, 'f11', 'f10'); same(S.core[RED], 0, 'leaving the point starts the count again');
}
{ // planes and air defence
  let S = position(K + 'e2=F e6=g a1=N a12=n');
  ok(!has(S, 'e2', 'e5'), 'a plane does not land under a gun'); ok(has(S, 'e2', 'e4', MOVE), 'short of it, yes');
  ok(has(S, 'e2', 'e6', SUICIDE) && !has(S, 'e2', 'e6', CAPTURE), 'taking the gun costs the plane');
  ok(has(S, 'e2', 'i6', MOVE) && !has(S, 'e2', 'j2'), 'four points, no further');
  const T = E.clone(S); go(T, 'e2', 'e6', SUICIDE); ok(T.top[E.sqNamed('e6')] < 0 && T.top[E.sqNamed('e2')] < 0, 'both are gone');
  S = position(K + 'f3=F f5=g f7=i a1=N a12=n'); ok(has(S, 'f3', 'f7', INTERCEPT) && !has(S, 'f3', 'f7', CAPTURE) && !has(S, 'f3', 'f7', STAY), 'flying over a gun to something behind it is being shot down');
  go(S, 'f3', 'f7', INTERCEPT); ok(S.top[E.sqNamed('f3')] < 0 && S.top[E.sqNamed('f7')] >= 0, 'the plane is lost, the target stands');
  S = position(K + 'e2=F e5=i a1=N a12=n'); ok(has(S, 'e2', 'e5', CAPTURE) && has(S, 'e2', 'e5', STAY), 'in clear sky a plane may move in or strike from where it is');
  S = position(K + 'e2=F e5=f a1=N a12=n'); ok(has(S, 'e2', 'e5', CAPTURE) && !has(S, 'e2', 'e5', STAY), 'plane against plane has to fly in');
  S = position(K + 'c4=F a4=n a1=N'); ok(has(S, 'c4', 'a4', SUICIDE), 'a ship defends itself: the plane is lost with it');
  S = position(K + 'c2=F b2=N'); ok(has(S, 'c2', 'b2', COMBINE) && !has(S, 'c2', 'a2'), 'a plane lands on its own ship, never on open water');
  S = position(K + 'g4=F g8=s a1=N a12=n'); ok(!has(S, 'g4', 'g6') && has(S, 'g4', 'g5'), 'a missile reaches two points');
}
{ // air defence that moves up shoots two turns later
  let S = position(K + 'e5=F f7=g a1=N a12=n k8=i', BLUE);
  go(S, 'f7', 'f6', MOVE); same(S.exp.length, 0, 'a gun one point off slantwise covers nothing');
  S = position(K + 'e5=F f6=g a1=N a12=n k8=i', BLUE); go(S, 'f6', 'f5', MOVE); same(S.exp.length, 1, 'a gun moves up beside a plane: it is locked on');
  const T = E.clone(S); go(T, 'e5', 'e1', MOVE); go(T, 'k8', 'k7'); ok(T.top[E.sqNamed('e1')] >= 0 && T.exp.length === 0, 'the plane that leaves is safe');
  go(S, 'a1', 'a2', MOVE); ok(S.top[E.sqNamed('e5')] < 0 && S.turn === BLUE, 'the plane that stays is shot down, and the gunner still has the move');
}
{ // stacks and getting off
  let S = position(K + 'f4=T g5=M f5=I a12=n');
  ok(has(S, 'g5', 'f4', COMBINE) && has(S, 'f5', 'f4', COMBINE), 'infantry and militia mount a tank'); go(S, 'g5', 'f4', COMBINE); S.turn = RED; go(S, 'f5', 'f4', COMBINE); S.turn = RED;
  same(E.members(S, E.sqNamed('f4')).map(p => E.KIND_CODE[S.kind[p]]).join(''), 'TIM', 'the tank carries both');
  ok(has(S, 'f4', 'f6', MOVE, m => E.mGroup(m) === 7), 'all three move as one');
  const T = E.clone(S); go(T, 'f4', 'f6', MOVE, m => E.mGroup(m) === 1); ok(T.dOrg === E.sqNamed('f4') && T.turn === RED, 'the tank going on alone opens a deployment');
  ok(!E.play(E.clone(T), COMMIT_MOVE, true), 'which cannot end with two foot soldiers on one point'); go(T, 'f4', 'e4', MOVE); ok(T.dOrg >= 0, 'one walks off: still Red’s turn');
  ok(E.play(T, COMMIT_MOVE, true) && T.turn === BLUE && T.dOrg < 0, 'now it can end'); same(T.half, 1, 'and counts as one quiet turn');
  const U = E.clone(S); go(U, 'f4', 'f6', MOVE, m => E.mGroup(m) === 3 || E.mGroup(m) === 5); ok(U.dOrg >= 0 && E.members(U, E.sqNamed('f6')).length === 2, 'the tank may take one and leave one');
  S = position(K + 'b5=N(FT) b7=n d5=i'); ok(!has(S, 'b5', 'b6', MOVE, alone(S)), 'a ship does not sail from under its plane at sea');
  ok(has(S, 'b5', 'c5', MOVE, m => S.kind[E.mActor(m)] === TANK), 'a tank lands from the ship'); ok(has(S, 'b5', 'f5', MOVE, m => S.kind[E.mActor(m)] === AIR && E.mGroup(m) === 6), 'the plane may lift the tank off with it');
  ok(has(S, 'b5', 'd5', CAPTURE, m => S.kind[E.mActor(m)] === TANK), 'a tank storms ashore'); ok(!has(S, 'b5', 'b7', STAY, m => S.kind[E.mActor(m)] === TANK), 'but cannot fire from the deck');
  S = position(K + 'e2=F(TI)'); ok(has(S, 'e2', 'e6', MOVE, m => E.mGroup(m) === 7), 'a plane flies a tank and infantry'); S = position(K + 'e2=F g2=E'); ok(!has(S, 'e2', 'g2'), 'nobody carries an Engineer');
  S = position('g1=C d12=c f2=H'); ok(has(S, 'g1', 'f1', MOVE) && !has(S, 'g1', 'f2'), 'a Commander enters a Headquarters along a line only'); S = position('g2=C d12=c f2=H'); ok(has(S, 'g2', 'f2', COMBINE), 'like this');
}
{ // the count to a draw
  const S = position('h1=C g12=c a1=N b1=N a12=n b12=n'); S.half = 99; go(S, 'a1', 'a2'); ok(S.over && S.over.winner === -1 && S.over.why === 'fifty', 'a hundred quiet turns are a draw');
}

/* 3 ── games at random */
function sane(S) {
  const seen = new Set();
  for (let s = 0; s < E.NSQ; s++) for (const p of E.members(S, s)) { if (S.at[p] !== s || seen.has(p)) return 'piece ' + p + ' misplaced'; seen.add(p); if (p !== S.top[s] && S.car[p] !== S.top[s]) return 'rider without carrier'; }
  for (let p = 0; p < S.n; p++) if ((S.at[p] >= 0) !== seen.has(p)) return 'piece ' + p + ' lost';
  if (S.dOrg < 0) for (let s = 0; s < E.NSQ; s++) { const M = E.members(S, s); if (M.length > 1 && E.carrierOf(S, M) !== M[0]) return 'bad stack on ' + E.sqName(s); if (M.length && !E.standsOn(S.kind[M[0]], s)) return 'piece on wrong ground ' + E.sqName(s); }
  return '';
}
let seed = 12345; const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const ends = {}; let plies = 0, deploys = 0, t0 = Date.now();
for (let g = 0; g < 60; g++) {
  const S = E.newGame(); let n = 0, why = '';
  while (n < 500) {
    const st = E.status(S); if (st) { why = st.why; break; }
    const L = E.legalMoves(S); if (!L.length) { failed++; console.log('FAIL  no move in a deployment'); break; }
    // prefer taking and getting off now and then, so that games go somewhere
    const pick = L.filter(m => E.mMode(m) !== MOVE && E.mMode(m) !== INTERCEPT), m = pick.length && rnd(3) ? pick[rnd(pick.length)] : L[rnd(L.length)];
    if (S.dOrg >= 0) deploys++;
    if (!E.play(S, m, true)) { failed++; console.log('FAIL  legal move refused'); break; }
    const bad = sane(S); if (bad) { failed++; console.log('FAIL  game ' + g + ' ply ' + n + ': ' + bad); break; }
    n++;
  }
  plies += n; ends[why || 'unfinished'] = (ends[why || 'unfinished'] || 0) + 1;
}
passed++;
console.log('random games: ' + JSON.stringify(ends) + ', ' + plies + ' plies (' + deploys + ' inside deployments), ' + (Date.now() - t0) + ' ms');
console.log(failed ? failed + ' FAILED, ' + passed + ' passed' : 'all ' + passed + ' checks passed');
process.exit(failed ? 1 : 0);
