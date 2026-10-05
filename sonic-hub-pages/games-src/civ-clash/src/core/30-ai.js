/* ── AI: one-ply card evaluation with sensible targeting ── */
function strength(X) { return (X.hp / X.maxHP) * 10 + wallTotal(X) * 0.6 + (wonderOf(X) ? 5 : 0); }
function threatOf(S, P, X, leader) {
  let t = 1;
  const opp = opponents(S, P);
  if (opp.length > 1) { const avg = opp.reduce((a, o) => a + strength(o), 0) / opp.length; t *= 1 + clamp((strength(X) - avg) / Math.max(4, avg), -0.3, 0.4); }
  else if (X === leader) t *= 1.15;
  if (X.hp <= 3) t *= 1.4;
  const W = wonderOf(X); if (W) t *= 1.6;
  return t;
}
const AI_AGE = { base: 4 };
function ageValue(S, P) {
  if (P.aged) return -5;
  if (P.agePolicy === 'never') return -100;
  if (P.agePolicy === 'asap') return 100;
  const I = IMPERIAL[P.civ];
  return AI_AGE.base + (I.bonus.steps ? cardValue(S, P, { steps: I.bonus.steps, wall: 0 }, null) : 0) + (I.bonus.fetch != null ? 1.2 : 0);
}
function cardValue(S, P, card, T) {
  if (card.age) return ageValue(S, P);
  const opp = opponents(S, P);
  if (!opp.length) return 0;
  const leader = opp.reduce((a, b) => (b.hp + wallTotal(b) > a.hp + wallTotal(a) ? b : a));
  let v = 0;
  for (const s of card.steps) {
    if (s.dmg) {
      const xs = s.all ? opp : s.others ? opp.filter(X => X !== T) : T ? [T] : [];
      for (const X of xs) {
        let n = s.dmg + (s.basic && S.mod.crusade ? 1 : 0) + ((s.samurai || s.eagle) && !hasWalls(X) ? 1 : 0) + (P.relic === 'horn' && P.hp <= 4 ? 1 : 0) + (P.relic === 'joyeuse' && !S.flags.joy ? 1 : 0);
        if (X.tokens.immune) continue;
        if (s.cav && X.tokens.camel) { v += 0.3; continue; }
        const W = !s.pierce && wonderOf(X), toWonder = W ? Math.min(n, W.dur) : 0;
        const wt = s.pierce ? 0 : wallTotal(X), toWall = Math.min(n - toWonder, wt), toHP = n - toWonder - toWall;
        let val = toHP * threatOf(S, P, X, leader) + toWall * 0.55 + toWonder * (2 + W && W.age >= 2 ? 3 : 2) + (W && toWonder >= W.dur ? 6 : 0);
        if (toHP >= X.hp && !(X.relic === 'banner' && !X.bannerUsed)) val += 7;
        if (X.tokens.trap) val -= 2;
        if (walls(X).some(w => w.kind === 'thorns') && !s.pierce) val -= 0.6;
        v += val;
      }
    }
    if (s.heal) v += Math.min(s.heal, P.maxHP - P.hp) * (P.hp <= 4 ? 1.5 : 0.75);
    if (s.plays) v += P.hand.length > 1 ? 0.9 * s.plays : 0;
    if (s.draw) v += 0.6 * s.draw * (P.hand.length > 5 ? 0.4 : 1);
    if (s.gold) { const cheap = Math.min(...S.market.filter(Boolean).map(c => marketCost(S, P, c)), 9); v += 0.45 * s.gold + (P.gold < cheap && P.gold + s.gold >= cheap ? 0.4 : 0); }
    if (s.raze && T) { const W = wonderOf(T); if (W) v += 9 * s.raze; else { const ws = walls(T).sort((a, b) => b.dur - a.dur); v += ws.length ? ws.slice(0, s.raze).reduce((a, w) => a + 0.75 * w.dur, 0) : -0.2; } }
    if (s.steal) for (const X of (s.all ? opp : T ? [T] : [])) v += Math.min(s.steal, X.hand.filter(c => !c.bound).length) * 0.8;
    if (s.tribute) v += 0.8 * opp.filter(X => X.gold > 0).length;
    if (s.convert && T) { const ws = walls(T).sort((a, b) => b.dur - a.dur); v += ws.length ? 1.3 * ws[0].dur : -0.2; }
    if (s.token === 'camel') v += opp.some(X => /K/.test(CIVS[X.civ].deck)) ? 0.8 : 0.35;
    if (s.token === 'immune') v += 1.3 + (P.hp <= 4 ? 2 : 0);
    if (s.token === 'trap') v += P.tokens.trap ? 0 : 1.4;
    if (s.self) v -= s.self * (P.hp <= 3 ? 3 : P.hp <= 5 ? 1.5 : 0.8);
    if (s.discard) v += 0.5 * opp.filter(X => X.hand.length).length;
    if (s.buyFree) v += S.market.some(c => c && c.cost >= 2) ? 1.3 : 0.3;
    if (s.fortify) v += 0.6 * s.fortify * walls(P).length;
  }
  if (card.wall && !S.mod.monsoon) v += card.wall * 0.8 * (walls(P).length >= 3 ? 0.6 : 1) + ({ regen: 0.8, sacred: 1.6, thorns: 0.7, fortress: 0.6, income: 1.4 }[card.kind] || 0);
  if (card.wonder && !S.mod.monsoon) v += wonderOf(P) ? -1 : 4 - opp.length * 0.5;
  // answer an enemy wonder before anything else
  if (opp.some(X => wonderOf(X)) && !card.steps.some(s => s.raze)) v -= 2;
  return v;
}
/* difficulty only changes how much noise the AI adds to its own judgement; balance runs use 'hard' */
const AI_NOISE = { easy: 3.2, normal: 1.1, hard: 0.15 };
function bestPlay(S, P) {
  const noise = AI_NOISE[P.skill] != null ? AI_NOISE[P.skill] : 0.15;
  let best = null;
  for (const card of P.hand) {
    const targets = needsTarget(card) ? opponents(S, P) : [null];
    for (const T of targets) {
      const v = cardValue(S, P, card, T) + rnd(S) * noise;
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
    const v = Math.max(...targets.map(T => cardValue(S, P, card, T))) - cost * 0.55;
    if (v > 0.6 && (!best || v > best.v)) best = { i, v };
  });
  return best ? best.i : null;
}
function aiRelic(S, P) {
  const deck = CIVS[P.civ].deck;
  const count = re => (deck.match(re) || []).length;
  const score = {
    joyeuse: 2 + count(/A/g) * 0.1, grail: 1 + count(/H/g) * 0.35, scone: 1 + count(/W/g) * 0.25, compass: 1.8 + count(/D/g) * 0.1,
    seal: 1 + count(/G/g) * 0.4, jade: 2.6, horn: 2.2, banner: 2.7, shroud: 2.3, mint: 1.2 + count(/G/g) * 0.3,
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
