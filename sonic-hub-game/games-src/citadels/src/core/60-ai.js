/* ── AI: reads the table like a player. It values districts and characters in gold-equivalents, guesses who took which
   character from what it saw during the selection (and who has turned up since), and aims its killers, thieves and warrants
   where the expected harm or gain is largest. It never looks at a hidden card: other hands only by their size, other
   characters only through the draft, a hand only when an ability shows it. ── */
const AI_NOISE = { easy: 1.8, normal: 0.55, hard: 0.12 };
const AI_INFER = { easy: false, normal: true, hard: true };
const noiseOf = P => (AI_NOISE[P.skill] != null ? AI_NOISE[P.skill] : 0.55);
const jitter = (S, P, k = 1) => (rnd(S) - 0.5) * noiseOf(P) * k;

/* ── reading the table (public information only, except for the AI's own hand) ── */
function roundsLeft(S) { const best = Math.max(...S.players.map(cityCount)); return clamp((S.size - best) / 1.2, 0.8, 7); }
function typesOf(P) { return new Set(P.city.map(e => e.card.type)); }
function missingTypes(P) { const t = typesOf(P), hq = has(P, 'haunted-quarter'); const miss = TYPE_ORDER.filter(x => !t.has(x)); return hq && miss.length ? miss.slice(1) : miss; }
/* how strong a player looks from across the table */
function standing(S, X) { return cityPoints(X) + 1.7 * cityCount(X) + 0.45 * X.gold + 0.55 * X.hand.length + (missingTypes(X).length === 0 ? 3 : 0) + (S.crown === X.id ? 0.6 : 0); }
/* how much harming X matters to me: the leaders count more, a city about to be completed most */
function threatW(S, me, X) {
  if (X.id === me) return 0;
  const lead = standing(S, X) - standing(S, S.players[me]);
  return clamp(1 + lead / 12, 0.45, 2.2) + (cityCount(X) >= S.size - 1 ? 1.1 : cityCount(X) >= S.size - 2 ? 0.45 : 0);
}

/* ── districts ── */
const UNIQUE_VALUE = {
  armory: () => 1.3, basilica: (S, P) => P.city.filter(e => worth(e) % 2).length * 0.8 + 0.8,
  capitol: (S, P) => { const c = {}; for (const e of P.city) c[e.card.type] = (c[e.card.type] || 0) + 1; return Math.max(0, ...Object.values(c)) >= 2 ? 2.4 : 0.9; },
  'dragon-gate': () => 2, factory: (S, P, R) => 0.6 * P.hand.filter(c => c.type === 'unique').length + 0.3 * R, framework: () => 1, 'gold-mine': (S, P, R) => 0.6 * R,
  'great-wall': S => (['warlord', 'diplomat', 'marshal'].some(c => charIn(S, c)) ? 0.9 : 0.2), 'haunted-quarter': (S, P) => (missingTypes(P).length ? 1.6 : 0.4),
  'imperial-treasury': (S, P) => 1 + Math.min(P.gold, 6) * 0.55, 'ivory-tower': (S, P) => (P.city.some(e => e.card.type === 'unique') ? -1.5 : 3.6),
  keep: S => (['warlord', 'diplomat', 'marshal'].some(c => charIn(S, c)) ? 0.7 : 0), laboratory: (S, P, R) => 0.65 * R, library: (S, P, R) => 0.95 * R,
  'map-room': (S, P) => 1 + P.hand.length * 0.45, monument: (S, P) => (P.city.length >= 2 ? 2.6 : 1.2), museum: (S, P, R) => 0.55 * R, necropolis: () => 0.4,
  observatory: (S, P, R) => 0.45 * R, park: (S, P, R) => 0.45 * R, 'poor-house': (S, P, R) => 0.35 * R, quarry: (S, P, R) => 0.3 * R,
  'school-of-magic': (S, P, R) => 0.55 * R + 0.8, smithy: (S, P, R) => 0.75 * R, stables: () => 1.1, statue: (S, P) => (S.crown === P.id ? 3 : 1.6),
  theater: (S, P, R) => 0.35 * R, 'thieves-den': () => 0.6, 'wishing-well': (S, P) => 1 + P.city.filter(e => e.card.type === 'unique').length,
};
/* what a district in hand is worth to build, in points and points-to-come */
function dval(S, P, card) {
  if (card.id === 'secret-vault') return -50;
  const R = roundsLeft(S), miss = missingTypes(P);
  let v = card.cost;
  if (miss.includes(card.type)) v += miss.length <= 1 ? 3 : miss.length === 2 ? 1.6 : 0.7;
  if (card.type !== 'unique') v += 0.18 * Math.min(R, 4);
  const f = UNIQUE_VALUE[card.id]; if (f) v += f(S, P, R);
  return v;
}
function buildable(P, card) { return card.id !== 'secret-vault' && (!has(P, card.id) || has(P, 'quarry')); }
/* a card's worth in hand: what it will build later, discounted when it is far out of reach */
function holdValue(S, P, card) {
  if (card.id === 'secret-vault') return 3;
  if (!buildable(P, card)) return 0.3;
  const gap = Math.max(0, buildCost(P, card) - P.gold - 2);
  return dval(S, P, card) * (gap > 4 ? 0.35 : gap > 2 ? 0.6 : 0.85);
}

/* ── characters: what one is worth to a player this round. self: with the player's own hand; else from what anyone can see ── */
function charValue(S, X, c, self) {
  const g = X.gold, h = X.hand.length, R = roundsLeft(S), n = S.n;
  const opps = S.players.filter(Y => Y !== X);
  const goodCards = self ? X.hand.filter(card => buildable(X, card)) : null;
  const affordable = self ? goodCards.filter(card => buildCost(X, card) <= g + 2).length : Math.min(h, g >= 3 ? 2 : 1);
  const gainN = c2 => { const gi = CHAR[c2].gain; return gi ? gainFor(S, X, gi.type) : 0; };
  const nearEnd = R < 1.8;
  const leader = Math.max(...opps.map(Y => standing(S, Y)));
  const behind = leader - standing(S, X);
  switch (c) {
    case 'assassin': return 2.2 + clamp(behind / 8, 0, 1.5) + (opps.some(Y => cityCount(Y) >= S.size - 1) ? 1.3 : 0);
    case 'witch': return 2.6 + (affordable ? 0.8 : 0);
    case 'magistrate': return 2.1 + (opps.some(Y => Y.hand.length && Y.gold >= 3) ? 0.6 : 0);
    case 'thief': { const golds = opps.map(Y => Y.gold).sort((a, b) => b - a); return 0.6 + 0.42 * ((golds[0] || 0) + (golds[1] || 0)) / 2 + 0.25 * (golds[0] || 0); }
    case 'spy': return 0.8 + 0.3 * Math.max(...opps.map(Y => Y.hand.length)) + 0.15 * Math.max(...opps.map(Y => Math.min(Y.gold, 3)));
    case 'blackmailer': { const golds = opps.map(Y => Y.gold).sort((a, b) => b - a); return 0.5 + 0.3 * ((golds[0] || 0) + (golds[1] || 0)); }
    case 'magician': { const most = Math.max(...opps.map(Y => Y.hand.length)); return Math.max(0.6, (most - h) * 0.85) + (h === 0 ? 1 : 0); }
    case 'wizard': return 1.7 + (g >= 3 ? 1 : 0) + Math.min(1.5, Math.max(...opps.map(Y => Y.hand.length)) * 0.25);
    case 'seer': return 1.2 + (g >= 4 && affordable >= 2 ? 2 : affordable ? 0.5 : 0);
    case 'king': return gainN(c) + 1.4 + (has(X, 'statue') && nearEnd ? 3 : 0) + (S.crown === X.id ? -0.3 : 0);
    case 'emperor': return gainN(c) + 1.1;
    case 'patrician': return gainN(c) * 0.9 + 1.3 + (has(X, 'statue') && nearEnd ? 3 : 0);
    case 'bishop': return gainN(c) + (cityCount(X) >= 4 ? 1 : 0.4) * (['warlord', 'diplomat', 'marshal'].some(z => charIn(S, z)) ? 1 : 0.3) + 0.3;
    case 'abbot': return gainN(c) + (opps.some(Y => Y.gold > g) ? 1 : 0) + 0.2;
    case 'cardinal': return gainN(c) * 0.9 + (self && goodCards.some(card => buildCost(X, card) > g + 2) ? 1.2 : 0.4);
    case 'merchant': return gainN(c) + 1.1;
    case 'alchemist': return 0.5 + (self ? Math.min(g + 2, Math.max(0, ...goodCards.map(card => buildCost(X, card)).filter(v => v <= g + 2))) * 0.85 : Math.min(g, 4) * 0.65);
    case 'trader': { const tr = self ? goodCards.filter(card => card.type === 'trade' && buildCost(X, card) <= g + 2).length : 0.6; return gainN(c) + 0.3 + Math.min(tr, 2) * 1.2; }
    case 'architect': return 1.9 + Math.min(2, Math.max(0, affordable - 1)) * (g >= 5 ? 1.8 : 0.9) + (h === 0 ? 0.6 : 0);
    case 'navigator': return 3.3 - (affordable ? (nearEnd ? 3.5 : 1.6) : 0);
    case 'scholar': return 1.6 + (g >= 5 ? 1.3 : 0.3);
    case 'warlord': return gainN(c) + 0.9 + (opps.some(Y => cityCount(Y) >= S.size - 1) ? 1.6 : 0) + (g >= 3 ? 0.5 : 0);
    case 'diplomat': return gainN(c) + 0.9;
    case 'marshal': { const tg = opps.some(Y => !isComplete(S, Y) && Y.city.some(e => worth(e) <= 3 && e.card.id !== 'keep')); return gainN(c) + (tg && g >= 2 ? 1.8 : 0.4); }
    case 'queen': return 3 * (n >= 5 ? 0.45 : 0.3);
    case 'artist': return Math.min(2, g) * (nearEnd ? 1 : 0.65) + 0.2;
    case 'tax-collector': return S.tax + 0.35 * (n - 1) * (R > 2 ? 1 : 0.6);
  }
  return 1;
}

/* ── who has what: samples of the draft consistent with what this player saw and with who has turned up ── */
function beliefs(S, pid) {
  const key = `${S.round}|${S.rank}|${pid}|${S.need && S.need.kind}`;
  if (S._bel && S._bel.key === key) return S._bel.v;
  const P = S.players[pid], v = {};
  const avail = S.chars.filter(c => !S.sel.faceUp.includes(c) && !P.chars.includes(c));
  const known = {}; for (const [c, x] of Object.entries(S.revealed)) if (x !== pid) known[c] = x;
  for (const c of avail) { v[c] = { none: 0 }; for (const X of S.players) if (X !== P) v[c][X.id] = 0; }
  const per = S.n <= 3 ? 2 : 1, others = S.players.filter(X => X !== P);
  const unknownChars = avail.filter(c => known[c] == null);
  const slots = []; for (const X of others) { const k = per - Object.values(known).filter(x => x === X.id).length; for (let i = 0; i < k; i++) slots.push(X.id); }
  if (!AI_INFER[P.skill]) {
    /* no reading of the draft: every unknown character is equally likely to be anywhere (or nowhere) */
    const p = 1 / (others.length + 1);
    for (const c of avail) { if (known[c] != null) { v[c][known[c]] = 1; continue; } for (const X of others) if (slots.includes(X.id)) v[c][X.id] = p; v[c].none = p; }
    S._bel = { key, v }; return v;
  }
  /* weights: how much each player would want each character, from what anyone can see */
  const w = {}; for (const X of others) { w[X.id] = {}; for (const c of unknownChars) w[X.id][c] = Math.exp(0.55 * charValue(S, X, c, false)); }
  const order = S.sel.order || [];
  const myAt = order.indexOf(pid), seen0 = P.seen[0] || [];
  const before = new Set(S.n >= 4 && myAt >= 0 ? order.slice(0, myAt) : []);
  const N = 140, R = { rs: (S.rs ^ (pid * 2654435761) ^ (S.rank * 40503)) >>> 0 };
  for (let s = 0; s < N; s++) {
    const pool = unknownChars.slice(), sl = shuffled(R, slots);
    const assign = {};
    for (const x of sl) {
      /* a player who chose before me took something I never saw; a player after me took something I passed on */
      const cand = S.n >= 4 && myAt >= 0 && seen0.length ? pool.filter(c => (before.has(x) ? !seen0.includes(c) : seen0.includes(c))) : pool;
      const list = cand.length ? cand : pool;
      if (!list.length) continue;
      let tot = 0; for (const c of list) tot += w[x][c];
      let r = rnd(R) * tot, ch = list[list.length - 1];
      for (const c of list) { r -= w[x][c]; if (r <= 0) { ch = c; break; } }
      assign[ch] = x; pool.splice(pool.indexOf(ch), 1);
    }
    for (const c of unknownChars) { if (assign[c] != null) v[c][assign[c]] += 1 / N; else v[c].none += 1 / N; }
  }
  for (const [c, x] of Object.entries(known)) if (v[c]) v[c][x] = 1;
  S._bel = { key, v };
  return v;
}
/* the probability that player x has character c (1 when it has turned up) */
const holds = (B, c, x) => (B[c] ? B[c][x] || 0 : 0);

/* ── decisions ── */
function aiAct(S, pid) {
  const nd = S.need, P = S.players[pid];
  switch (nd.kind) {
    case 'pick': return aiPick(S, P, nd);
    case 'theater': return aiTheater(S, P);
    case 'keep': { const best = nd.cards.slice().sort((a, b) => holdValue(S, P, b) - holdValue(S, P, a)).slice(0, nd.keep); return { t: 'keep', uids: best.map(c => c.uid) }; }
    case 'bribe': return { t: 'bribe', pay: nd.amount <= 0 || P.gold >= 4 + jitter(S, P, 2) };
    case 'reveal': { const th = S.threats.find(x => x.char === S.cur.char && x.on); return { t: 'reveal', reveal: !!(th && th.real) }; }
    case 'confiscate': return { t: 'confiscate', take: true };
    case 'wizard': return aiWizard(S, P, nd);
    case 'seer': return aiSeer(S, P, nd);
    case 'heir': return { t: 'heir', target: weakestOf(S, crownTargets(S, pid)) };
    case 'turn': return aiTurn(S, P);
  }
  return null;
}
function weakestOf(S, ids) { return ids.slice().sort((a, b) => standing(S, S.players[a]) - standing(S, S.players[b]))[0]; }

/* the selection: the character worth most to me now, less the risk of being its victim, plus what taking it away from others is worth */
function aiPick(S, P, nd) {
  if (nd.op === 'down') {
    /* two players: put away the character the opponent wants most */
    const X = S.players.find(Y => Y !== P);
    const best = nd.options.slice().sort((a, b) => charValue(S, X, b, false) - charValue(S, X, a, false));
    return { t: 'pick', char: best[0] };
  }
  const killerOut = c => S.sel.faceUp.includes(c) || P.chars.includes(c);
  const thiefLive = charIn(S, 'thief') && !killerOut('thief');
  const opps = S.players.filter(X => X !== P);
  const lead = opps.slice().sort((a, b) => standing(S, b) - standing(S, a))[0];
  let best = null;
  for (const c of nd.options) {
    let v = charValue(S, P, c, true);
    /* the obvious characters get killed and robbed more */
    const r = CHAR[c].rank;
    if (charIn(S, 'assassin') && !killerOut('assassin') && c !== 'assassin') v -= 0.12 * Math.max(0, v) * (r > 1 ? 1 : 0);
    if (thiefLive && r > 2 && c !== 'thief') v -= 0.12 * P.gold;
    if (charIn(S, 'blackmailer') && !killerOut('blackmailer') && r > 2) v -= 0.06 * P.gold;
    /* denial: a character the leader would love, when the leader is close */
    if (lead && cityCount(lead) >= S.size - 2) {
      const dv = charValue(S, lead, c, false);
      v += 0.25 * dv * (cityCount(lead) >= S.size - 1 ? 1.4 : 0.8);
      if (['assassin', 'warlord', 'magistrate', 'witch'].includes(c)) v += cityCount(lead) >= S.size - 1 ? 1.5 : 0.6;
    }
    if (S.n <= 3 && P.chars.length) v += pairBonus(P.chars[0], c);
    v += jitter(S, P, 2.2);
    if (!best || v > best.v) best = { c, v };
  }
  return { t: 'pick', char: best.c };
}
/* two characters each: an early killer with a late builder works well together */
function pairBonus(a, b) { const ra = CHAR[a].rank, rb = CHAR[b].rank; return (Math.min(ra, rb) <= 2 && Math.max(ra, rb) >= 6 ? 0.6 : 0) + (ra === rb ? -5 : 0); }
function aiTheater(S, P) {
  const mine = P.chars.map(c => charValue(S, P, c, true));
  const opps = S.players.filter(X => X !== P && X.chars.length);
  if (!opps.length) return { t: 'theater', target: null };
  const lead = opps.slice().sort((a, b) => standing(S, b) - standing(S, a))[0];
  const worst = P.chars[mine.indexOf(Math.min(...mine))];
  if (Math.min(...mine) < 1.8 + jitter(S, P)) return { t: 'theater', target: lead.id, give: worst };
  return { t: 'theater', target: null };
}
function aiWizard(S, P, nd) {
  const best = nd.cards.slice().sort((a, b) => dval(S, P, b) - dval(S, P, a))[0];
  const build = best.id !== 'secret-vault' && S.cur.char !== 'navigator' && P.gold >= buildCost(P, best) && !(best.id === 'monument' && cityCount(P) >= 5) && dval(S, P, best) >= 2.5;
  return { t: 'wizard', uid: best.uid, build };
}
function aiSeer(S, P, nd) {
  const sorted = P.hand.slice().sort((a, b) => holdValue(S, P, a) - holdValue(S, P, b));
  const gives = {}; nd.to.forEach((x, i) => { gives[x] = sorted[i].uid; });
  return { t: 'seer', gives };
}

/* ── a turn, one step at a time ── */
function aiTurn(S, P) {
  const t = S.cur, c = t.char, pid = P.id;
  if (t.mode === 'bewitched') return { t: 'gather', take: wantCards(S, P, c) ? 'cards' : 'gold' };
  if (t.mode === 'witch') {
    if (!t.gathered) return { t: 'gather', take: wantCards(S, P, c) ? 'cards' : 'gold' };
    const ch = aiNameTarget(S, P, 'witch'); return ch ? { t: 'ability', char: ch } : { t: 'end' };
  }
  /* abilities best used before gathering: aiming characters, swapping hands */
  if (!t.used.ability && abilityFree(S, pid) && ['assassin', 'thief', 'magistrate', 'blackmailer', 'magician', 'spy', 'emperor'].includes(c)) {
    const a = aiAbility(S, P); if (a) return a;
    t.used.aiSkip = true;
  }
  if (!t.gathered) return { t: 'gather', take: wantCards(S, P, c) ? 'cards' : 'gold' };
  if (!t.used.ability && !t.used.aiSkip && abilityFree(S, pid) && ['navigator', 'scholar', 'wizard', 'seer'].includes(c)) {
    const a = aiAbility(S, P); if (a) return a;
    t.used.aiSkip = true;
  }
  const d = aiDistricts(S, P); if (d) return d;
  const g = CHAR[c].gain;
  const plan = bestBuild(S, P);
  /* collect first unless the district about to be built is of the type collected for */
  if (g && !t.gainDone && turnOpen(S, pid) && !(plan && plan.card.type === g.type && plan.ok)) return gainAction(S, P);
  if (plan && plan.ok) return plan.a;
  if (g && !t.gainDone && turnOpen(S, pid)) return gainAction(S, P);
  if (!t.used.ability && !t.used.aiSkip2 && abilityFree(S, pid) && ['abbot', 'warlord', 'diplomat', 'marshal', 'artist', 'emperor'].includes(c)) {
    const a = aiAbility(S, P); if (a) return a;
    t.used.aiSkip2 = true;
  }
  if (c === 'emperor' && !t.crownGiven) return { t: 'ability', target: weakestOf(S, crownTargets(S, pid)), take: 'gold' };
  return { t: 'end' };
}
function gainAction(S, P) {
  const g = CHAR[S.cur.char].gain;
  if (g.res !== 'either') return { t: 'gain' };
  const n = gainCount(S, P, S.cur.char), wantCard = P.hand.filter(c => buildable(P, c)).length < 2;
  return { t: 'gain', gold: wantCard ? Math.max(0, n - 2) : n };
}
/* gold or cards: cards when the hand has nothing worth building soon, gold otherwise */
function wantCards(S, P, c) {
  const usable = P.hand.filter(card => buildable(P, card));
  if (!usable.length) return true;
  if (c === 'architect' || c === 'navigator' || c === 'scholar') return false;
  /* tested against each other: gold almost always wins; cards only when there is at most one district worth building and gold for it */
  if (usable.length <= 1 && P.gold >= 4) return true;
  return (has(P, 'library') || has(P, 'observatory')) && usable.length <= 1;
}
/* the best district to build now and how to pay for it */
function bestBuild(S, P) {
  const moves = buildMoves(S, P.id);
  let best = null;
  for (const a of moves) {
    const card = P.hand.find(c => c.uid === a.uid);
    let v = dval(S, P, card);
    if (a.pay === 'cards') v -= sum(a.cards, u => holdValue(S, P, P.hand.find(c => c.uid === u))) * 0.8 - (buildCost(P, card) - a.cards.length) * 0.1;
    if (a.pay === 'framework') { const fw = P.city.find(e => e.card.id === 'framework'); v -= worth(fw) + 0.5; v += buildCost(P, card) * 0.9; if (buildCost(P, card) < 4) v -= 3; }
    if (a.pay === 'necropolis') { const e = entry(P, a.sacrifice); v -= worth(e) + (missingTypes(P).length === 0 && P.city.filter(x => x.card.type === e.card.type).length === 1 ? 3 : 0); v += buildCost(P, card) * 0.6; }
    if (a.pay === 'cardinal') v -= a.give.length * 0.9;
    if (a.pay === 'gold') v -= buildCost(P, card) * 0.08;
    if (S.cur.char === 'alchemist' && a.pay === 'gold') v += buildCost(P, card) * 0.3;
    v += jitter(S, P, 0.6);
    if (!best || v > best.v) best = { a, card, v };
  }
  if (!best) return null;
  best.ok = best.v > 0.8;
  return best;
}
/* the districts that are used during a turn */
function aiDistricts(S, P) {
  const t = S.cur;
  if (!districtOK(S, P.id)) return null;
  const junk = P.hand.filter(c => c.id !== 'secret-vault').slice().sort((a, b) => holdValue(S, P, a) - holdValue(S, P, b));
  if (has(P, 'smithy') && !t.used.smithy && P.gold >= 2) {
    const reach = P.hand.filter(c => buildable(P, c) && buildCost(P, c) <= P.gold - 2).length;
    if ((P.hand.length <= 1 && P.gold >= 4) || (P.gold >= 7 && reach === 0)) return { t: 'smithy' };
  }
  if (has(P, 'laboratory') && !t.used.lab && junk.length) {
    const want = P.hand.filter(c => buildable(P, c)).map(c => buildCost(P, c)).filter(v => v > P.gold && v <= P.gold + 2);
    if ((want.length && junk[0].uid !== P.hand.find(c => buildCost(P, c) === want[0]).uid) || holdValue(S, P, junk[0]) < 1.2) return { t: 'lab', uid: junk[0].uid };
  }
  if (has(P, 'museum') && !t.used.museum && junk.length && (holdValue(S, P, junk[0]) < 1.4 || P.hand.length >= 5)) return { t: 'museum', uid: junk[0].uid };
  if (has(P, 'armory')) {
    let best = null;
    for (const o of armoryTargets(S, P.id)) {
      if (o.target === P.id) continue;
      const X = S.players[o.target], e = entry(X, o.uid);
      const v = worth(e) * threatW(S, P.id, X) + (cityCount(X) >= S.size - 1 ? 4 : 0) - 3.2;
      if (!best || v > best.v) best = { o, v };
    }
    if (best && best.v > 2 + jitter(S, P)) return { t: 'armory', target: best.o.target, uid: best.o.uid };
  }
  return null;
}
/* naming a character for the Assassin, the Thief or the Witch */
function aiNameTarget(S, P, c) {
  const B = beliefs(S, P.id), opps = S.players.filter(X => X !== P);
  let best = null;
  for (const x of namable(S, c)) {
    if (P.chars.includes(x) || S.sel.faceUp.includes(x) || S.revealed[x] != null) continue;
    let v = 0;
    for (const X of opps) {
      const p = holds(B, x, X.id); if (!p) continue;
      if (c === 'assassin') v += p * (charValue(S, X, x, false) + 2.6) * threatW(S, P.id, X);
      else if (c === 'thief') v += p * (X.gold + (CHAR[x].rank > 6 ? 0.4 : 0));
      else if (c === 'witch') v += p * (charValue(S, P, x, true) + 0.4 * charValue(S, X, x, false) + 1.5);
    }
    v += jitter(S, P, 1.2);
    if (!best || v > best.v) best = { x, v };
  }
  return best ? best.x : null;
}
function aiAbility(S, P) {
  const t = S.cur, c = t.char, pid = P.id, opps = S.players.filter(X => X !== P);
  switch (c) {
    case 'assassin': case 'thief': { const x = aiNameTarget(S, P, c); return x ? { t: 'ability', char: x } : null; }
    case 'magistrate': case 'blackmailer': {
      const B = beliefs(S, pid), k = c === 'magistrate' ? 3 : 2;
      const scored = namable(S, c).filter(x => !P.chars.includes(x) && !S.sel.faceUp.includes(x)).map(x => {
        let v = 0;
        for (const X of opps) { const p = holds(B, x, X.id); v += c === 'magistrate' ? p * (X.hand.length ? 1 : 0.1) * Math.min(6, X.gold + 2) : p * X.gold; }
        return { x, v: v + jitter(S, P, 0.8) };
      }).sort((a, b) => b.v - a.v);
      if (scored.length < k) return null;
      const chosen = scored.slice(0, k).map(o => o.x);
      return c === 'magistrate' ? { t: 'ability', chars: chosen, signed: chosen[0] } : { t: 'ability', chars: chosen, real: chosen[0] };
    }
    case 'spy': {
      const X = opps.slice().sort((a, b) => b.hand.length * 1 + Math.min(b.gold, 3) * 0.5 - (a.hand.length + Math.min(a.gold, 3) * 0.5))[0];
      if (!X || !X.hand.length) return null;
      return { t: 'ability', target: X.id, type: 'trade' };
    }
    case 'magician': {
      const mine = sum(P.hand, x => holdValue(S, P, x));
      const X = opps.slice().sort((a, b) => b.hand.length - a.hand.length)[0];
      if (X && X.hand.length >= P.hand.length + 2 && X.hand.length * 2.4 > mine + 1) return { t: 'ability', mode: 'swap', target: X.id };
      const bad = P.hand.filter(x => holdValue(S, P, x) < 1.2 && x.id !== 'secret-vault');
      if (bad.length) return { t: 'ability', mode: 'redraw', uids: bad.map(x => x.uid) };
      return null;
    }
    case 'wizard': { const X = opps.slice().sort((a, b) => b.hand.length - a.hand.length)[0]; return X && X.hand.length ? { t: 'ability', target: X.id } : null; }
    case 'seer': return opps.some(X => X.hand.length) && P.hand.length + opps.filter(X => X.hand.length).length >= opps.filter(X => X.hand.length).length ? { t: 'ability' } : null;
    case 'navigator': return { t: 'ability', take: P.hand.filter(x => buildable(P, x)).length >= 2 ? 'gold' : 'cards' };
    case 'scholar': return { t: 'ability' };
    case 'emperor': {
      const tg = crownTargets(S, pid); if (!tg.length) return null;
      const X = S.players[weakestOf(S, tg)];
      return { t: 'ability', target: X.id, take: X.gold > 0 ? 'gold' : 'card' };
    }
    case 'abbot': { const top = richest(S, pid); return top.length ? { t: 'ability', from: top[0] } : null; }
    case 'warlord': {
      let best = null;
      for (const o of warlordTargets(S, pid)) {
        if (o.target === pid || o.cost > P.gold) continue;
        const X = S.players[o.target], e = entry(X, o.uid);
        const typeBreak = missingTypes(X).length === 0 && X.city.filter(z => z.card.type === e.card.type).length === 1 && !has(X, 'haunted-quarter') ? 3 : 0;
        const v = (worth(e) + typeBreak) * threatW(S, pid, X) + (cityCount(X) === S.size - 1 ? 3.5 : 0) - o.cost * 1.05 - (roundsLeft(S) > 2.5 ? 1 : 0);
        if (!best || v > best.v) best = { o, v };
      }
      return best && best.v > 1.2 + jitter(S, P) ? { t: 'ability', target: best.o.target, uid: best.o.uid } : null;
    }
    case 'marshal': {
      let best = null;
      for (const o of marshalTargets(S, pid)) {
        if (o.cost > P.gold) continue;
        const X = S.players[o.target], e = entry(X, o.uid);
        const v = dval(S, P, e.card) + worth(e) * 0.4 * threatW(S, pid, X) - o.cost * 0.75 - o.cost * 0.25 * threatW(S, pid, X);
        if (!best || v > best.v) best = { o, v };
      }
      return best && best.v > 0.6 + jitter(S, P) ? { t: 'ability', target: best.o.target, uid: best.o.uid } : null;
    }
    case 'diplomat': {
      let best = null;
      for (const o of diplomatTargets(S, pid)) {
        if (o.cost > P.gold) continue;
        const X = S.players[o.target], mine = entry(P, o.mine), theirs = entry(X, o.uid);
        const v = (worth(theirs) - worth(mine)) * (1 + 0.35 * threatW(S, pid, X)) - o.cost * 0.85;
        if (!best || v > best.v) best = { o, v };
      }
      return best && best.v > 0.8 + jitter(S, P) ? { t: 'ability', mine: best.o.mine, target: best.o.target, uid: best.o.uid } : null;
    }
    case 'artist': {
      const spare = P.gold - (roundsLeft(S) < 1.6 ? 0 : 2);
      if (spare < 1) return null;
      const free = P.city.filter(e => !e.beau).sort((a, b) => (has(P, 'basilica') ? (worth(a) % 2) - (worth(b) % 2) : 0) || worth(b) - worth(a));
      const k = Math.min(2, spare, free.length);
      return k ? { t: 'ability', uids: free.slice(0, k).map(e => e.card.uid) } : null;
    }
  }
  return null;
}
/* a safe action for any decision, if a choice above was refused */
function aiFallback(S, pid) { const ms = legalMoves(S, pid); return ms.find(m => m.t === 'end') || ms.find(m => m.t === 'gather') || ms[0] || null; }
