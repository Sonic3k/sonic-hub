/* ── AI: it plays each card it could play, with each target, on a light copy of the table and values what changes.
   A seat is worth its HP (the last few count more), its shields, its cards in hand and a Vanish that is still up. Opponents count
   against it, the most dangerous one a little more. When a card gives another play it looks one card further. It never sees a
   hidden card: other hands only by their size, a stolen card only once it is turned up. ── */
const AI_NOISE = { easy: 2.4, normal: 0.7, hard: 0.04 };
const AI_DEPTH = { easy: 0, normal: 1, hard: 2 };
function handWorth(n) { return 0.95 * Math.min(n, 3) + 0.45 * clamp(n - 3, 0, 3) + 0.15 * Math.max(0, n - 6); }
function seatValue(S, X) {
  if (!X.alive) return -14;
  let v = X.hp + 4.5 * (1 - Math.exp(-X.hp / 2.2));
  for (const sh of X.shields) v += shieldLeft(sh) * 0.85;
  v += handWorth(handCount(X)) + (X.vsteal || 0) * 1.7;
  /* a Vanish still up: about one round of the opponents' damage that cannot reach this seat (more when it is close to falling) */
  if (X.disguised) v += 2.4 + (X.hp <= 4 ? 1.6 : 0);
  return v;
}
/* how much each opponent counts: the strongest a little more, one close to falling more still */
function oppWeights(S, P) {
  const opps = opponents(S, P), W = {};
  const power = X => X.hp + shieldTotal(X) * 0.7 + handCount(X) * 0.3;
  const avg = opps.reduce((a, X) => a + power(X), 0) / Math.max(1, opps.length);
  for (const X of opps) W[X.id] = (opps.length > 1 ? 1 + clamp((power(X) - avg) / 12, -0.2, 0.3) : 1) * (X.hp <= 3 ? 1.15 : 1);
  return W;
}
function utility(S, P, W) {
  const me = S.players[P.id];
  if (S.winner === P.id) return 1000;
  if (S.winner === -1) return -60;
  if (!me.alive) return -500;
  let u = seatValue(S, me);
  for (const X of S.players) if (X.id !== P.id) u -= (W[X.id] != null ? W[X.id] : 1) * seatValue(S, X);
  return u;
}
/* a rough worth for a card in hand, used to choose what to bring back from the discard pile */
function cardWorth(S, P, c) {
  let v = count(c.sym, 'A') * 1.15 + count(c.sym, 'S') * 0.95 + count(c.sym, 'H') * (P.hp <= 5 ? 1.1 : 0.5) + count(c.sym, 'D') * 0.85 + count(c.sym, 'P') * 0.8;
  const opps = opponents(S, P);
  const pw = { whirl: 1 + opps.length * 1.2, roar: 1.4, destroy: 1.6, fireball: 2.6, swap: P.hp <= 5 ? 3.4 : 0.6, charm: 2, recall: 1.8, purge: 1.8, disguise: P.hp <= 5 ? 2.6 : 1.2, steal: 2 };
  if (c.power) v += pw[c.power] || 1.5;
  return v;
}
function playValue(S, P, card, ch, W, depth, pending) {
  const C = liteCopy(S);
  const ev = pending ? resolvePending(C, ch) : playCard(C, P.id, card.uid, ch);
  if (!ev) return -1e9;
  let v = utility(C, P, W);
  if (ch && ch.pick != null) { const c = S.players[P.id].discard.find(x => x.uid === ch.pick); if (c) v += cardWorth(S, P, c) * 0.6; }
  const me = C.players[P.id];
  /* another play is owed: it will be the best of the cards known to be in hand; when only cards still to be drawn are left, a play
     is worth about what an average card brings */
  if (C.winner == null && me.alive && C.plays > 0) {
    if (depth > 0 && me.hand.length) { const next = bestPlay(C, me, depth - 1, W, true); if (next) v = next.v; }
    else if (handCount(me)) v += 1.3 * Math.min(C.plays, handCount(me));
  }
  return v;
}
function bestPlay(S, P, depth, W, quiet) {
  W = W || oppWeights(S, P);
  const noise = quiet ? 0 : AI_NOISE[P.skill] != null ? AI_NOISE[P.skill] : 0.7;
  let best = null;
  const seen = new Set();
  for (const card of P.hand) {
    const key = card.id;   /* two copies of the same card play the same */
    if (seen.has(key)) continue; seen.add(key);
    for (const ch of choicesFor(S, P, card)) {
      const v = playValue(S, P, card, ch, W, depth) + rnd(S) * noise;
      if (!best || v > best.v) best = { card, ch, v };
    }
  }
  return best;
}
function bestPending(S, P) {
  const W = oppWeights(S, P), card = S.pending.card, noise = AI_NOISE[P.skill] != null ? AI_NOISE[P.skill] : 0.7;
  let best = null;
  for (const ch of choicesFor(S, P, card)) { const v = playValue(S, P, card, ch, W, 1, true) + rnd(S) * noise; if (!best || v > best.v) best = { ch, v }; }
  return best ? best.ch : null;
}
function aiAct(S, pid) {
  const P = S.players[pid];
  if (S.pending && S.pending.pid === pid) return { kind: 'pending', ch: bestPending(S, P) };
  if (S.plays > 0 && P.hand.length) {
    const b = bestPlay(S, P, AI_DEPTH[P.skill] != null ? AI_DEPTH[P.skill] : 1);
    if (b) return { kind: 'play', uid: b.card.uid, ch: b.ch };
  }
  return { kind: 'end' };
}
