/* ── AI: it resolves each card it could play on a light copy of the table and values what changes.
   The value of a camp is its HP (the last few count more), its structures (a wonder near completion counts a lot), its guards,
   Traps and Storm, its gold and its cards. Nothing here knows about particular units, so new units need no AI code. ── */
const AI_NOISE = { easy: 3.2, normal: 1.1, hard: 0.15 };
/* the AI's weights (a player can carry its own set in P.aiw, which the balance experiments use to pit two AIs against each other) */
const AI_W = { hand: [0.95, 0.5, 0.25], play: 1.5, wall: 0.85, shield: 1.5, gold: 0.45, trap: 0.5, storm: 1.6, pick: 0.4, hpCurve: 6 };
/* how much of each kind of hit a civilization throws, so a guard is worth more against the decks it answers */
const HIT_MIX = {};
function hitMix(civ) {
  if (HIT_MIX[civ]) return HIT_MIX[civ];
  const n = { strike: 0, cavalry: 0, direct: 0 }, deck = CIVS[civ].deck;
  let cards = 0;
  for (const [id, k] of Object.entries(deck)) { const ic = UNITS[id].icons; cards += k; n.strike += k * (count(ic, 'A') + count(ic, 'Y')); n.cavalry += k * count(ic, 'K'); n.direct += k * count(ic, 'O'); }
  return (HIT_MIX[civ] = { strike: n.strike / cards, cavalry: n.cavalry / cards, direct: n.direct / cards });
}
function guardWorth(S, X) {
  const opp = opponents(S, X);
  if (!opp.length) return { bodyguard: 0.3, camel: 0.2, mantlet: 0.2 };
  const m = { strike: 0, cavalry: 0, direct: 0 };
  for (const o of opp) { const h = hitMix(o.civ); m.strike += h.strike; m.cavalry += h.cavalry; m.direct += h.direct; }
  const k = 1 / opp.length;
  return { bodyguard: 0.25 + 1.1 * m.strike * k, camel: 0.15 + 2.2 * m.cavalry * k, mantlet: 0.15 + 1.6 * m.direct * k };
}
/* one play a turn: the first cards in hand keep the turns coming, more of them only add choice */
function handWorth(n, W = AI_W) { return W.hand[0] * Math.min(n, 2) + W.hand[1] * clamp(n - 2, 0, 2) + W.hand[2] * Math.max(0, n - 4); }
function campValue(S, X, W = AI_W) {
  if (!X.alive) return -22;
  let v = X.hp + W.hpCurve * (1 - Math.exp(-X.hp / 3));
  const Wd = wonderOf(X);
  for (const st of X.structs) v += st.wonder ? wonderWorth(S, X, st) : st.dur * (Wd ? W.shield : W.wall);   /* walls in front of a wonder shield it */
  const g = guardWorth(S, X);
  v += X.guards.bodyguard * g.bodyguard + X.guards.camel * g.camel + X.guards.mantlet * g.mantlet;
  v += X.traps.trap * W.trap + (X.traps.storm ? W.storm : 0);
  v += X.gold * W.gold;
  v += handWorth(X.hand.length + (X.vgain || 0) - (X.vlost || 0) + (X.vdraw || 0), W) + (X.vpick || 0) * W.pick;
  return v;
}
/* a wonder is worth what it is likely to bring: more as its countdown runs down, less when the camp has little in front of it
   to soak the hits every opponent will send */
function wonderWorth(S, X, st) {
  const opp = Math.max(1, S.players.filter(o => o.alive && o.id !== X.id).length);
  const shield = structTotal(X) + X.guards.bodyguard * 0.5, need = 1.3 * opp * st.cd;
  const live = clamp(0.35 + (shield - need) / 6, 0.15, 1);
  return st.dur * 1.4 + (st.cd <= 1 ? 18 : st.cd === 2 ? 10 : 6) * live;
}
function strength(X) { return (X.hp / X.maxHP) * 10 + structTotal(X) * 0.6 + (wonderOf(X) ? 6 : 0); }
function threat(S, P, X) {
  const opp = opponents(S, P);
  let t = 1;
  if (opp.length > 1) { const avg = opp.reduce((a, o) => a + strength(o), 0) / opp.length; t *= 1 + clamp((strength(X) - avg) / Math.max(4, avg), -0.3, 0.4); }
  if (X.hp <= 3) t *= 1.3;
  if (wonderOf(X)) t *= 1.5;
  return t;
}
/* the value of playing a card now (it does not have to be in hand: market cards are scored the same way) */
function evalCard(S, P, card, tid) {
  const C = liteCopy(S), me = C.players[P.id];
  if (!me.hand.some(c => c.uid === card.uid)) me.hand.push(card);
  if (C.plays <= 0) C.plays = 1;
  const AW = P.aiw || AI_W;
  const before = C.players.map(X => campValue(C, X, AW)), alive = C.players.map(X => X.alive);
  const w = S.players.map(X => (X.id === P.id ? 1 : threat(S, P, X)));
  const ev = playCard(C, P.id, card.uid, tid);
  if (!ev) return -99;
  let u = 0;
  C.players.forEach((X, i) => { const d = campValue(C, X, AW) - before[i]; if (i === P.id) u += d; else if (alive[i]) u -= d * w[i]; });
  if (C.winner === P.id) u += 50;
  u += C.plays * (C.players[P.id].hand.length ? AW.play : 0.2);
  if (card.age) u += 3 + (RULES.maxRound - S.round > 10 ? 1 : 0);
  return u;
}
function bestPlay(S, P) {
  const noise = AI_NOISE[P.skill] != null ? AI_NOISE[P.skill] : 0.15;
  let best = null;
  for (const card of P.hand) {
    const targets = needsTarget(card) ? opponents(S, P) : [null];
    for (const T of targets) {
      const v = evalCard(S, P, card, T ? T.id : null) + rnd(S) * noise;
      if (!best || v > best.v) best = { card, target: T ? T.id : null, v };
    }
  }
  return best;
}
function aiBuy(S, P) {
  if (S.flags.bought) return null;
  if (P.skill === 'easy' && rnd(S) < 0.5) return null;
  let best = null;
  S.market.forEach((card, i) => {
    if (!card) return;
    const cost = marketCost(S, P, card);
    if (P.gold < cost) return;
    const targets = needsTarget(card) ? opponents(S, P) : [null];
    const v = Math.max(...targets.map(T => evalCard(S, P, card, T ? T.id : null))) - cost * 0.6;
    if (v > 0.5 && (!best || v > best.v)) best = { i, v };
  });
  return best ? best.i : null;
}
/* a Monk takes the card worth most to its new owner */
function aiPickCard(S, A, X) {
  const loose = X.hand.filter(c => !c.bound);
  let best = null, bv = -1e9;
  for (const c of loose) { const ts = needsTarget(c) ? opponents(S, A) : [null]; const v = Math.max(...ts.map(T => evalCard(S, A, c, T ? T.id : null))); if (v > bv) { bv = v; best = c; } }
  return best;
}
function aiRelic(S, P) {
  const deck = CIVS[P.civ].deck, sym = {};
  for (const [id, k] of Object.entries(deck)) for (const ch of UNITS[id].icons) sym[ch] = (sym[ch] || 0) + k;
  const n = ch => sym[ch] || 0, hits = n('A') + n('X') + n('Y') + n('B') + n('O') + n('K') + n('L') + n('E') + n('F') + n('N');
  const score = {
    joyeuse: 1.6 + hits * 0.03, grail: 1 + n('H') * 0.22, scone: 1 + n('W') * 0.2, compass: 1.8 + n('D') * 0.05,
    seal: 1 + (n('G') + n('J')) * 0.25, jade: 2.6, horn: 2.0, banner: 2.7, shroud: 2.3, mint: 1.2 + (n('G') + n('J')) * 0.2,
  };
  return P.relicOffer.slice().sort((a, b) => score[b] - score[a])[0];
}
function aiAct(S, pid) {
  const P = S.players[pid];
  const b = aiBuy(S, P);
  if (b != null) return { kind: 'buy', idx: b };
  if (S.plays > 0 && P.hand.length) { const best = bestPlay(S, P); if (best) return { kind: 'play', uid: best.card.uid, target: best.target }; }
  return { kind: 'end' };
}
