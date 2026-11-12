/* ── Engine: rounds of secret characters, then the characters are called in rank order ──
   The state only ever waits for one decision: S.need = { pid, kind, ... }. act(S, pid, a) answers it, runs everything that
   follows on its own, and stops at the next decision. Every change is reported as an event in ev.fx (and kept in S.log), so the
   table can show it. Events that only one player may see carry only: pid. */

/* ── cards, the deck, the table ── */
function makeCard(S, id) { const d = DISTRICT[id]; return { uid: S.nextUid++, id, name: d.name, type: d.type, cost: d.cost }; }
function newPlayer(o, i) {
  return { id: i, name: o.names[i], ai: !!o.ai[i], skill: o.skill || 'normal', gold: RULES.startGold, hand: [], city: [], chars: [], revealed: [], seen: [],
    stats: { built: 0, destroyed: 0, stolen: 0, lost: 0, killed: 0, robbed: 0 } };
}
function newGame(o) {
  const n = clamp(o.n || o.names.length, RULES.minPlayers, RULES.maxPlayers);
  const S = { seed: o.seed >>> 0, rs: o.seed >>> 0, nextUid: 1, n, size: citySize(n), players: [], chars: o.chars.slice().sort((a, b) => CHAR[a].rank - CHAR[b].rank),
    uniques: o.uniques.slice(), setName: o.setName || '', deck: [], round: 0, phase: 'setup', crown: 0, need: null, log: [], over: false, winner: null,
    firstDone: null, ending: false, tax: 0, taxOn: o.chars.includes('tax-collector'), sel: null, holder: {}, revealed: {}, killed: null, robbed: null,
    bewitched: null, witch: null, warrants: null, threats: null, rank: 0, cur: null, queenWait: null, scores: null, kills: [] };
  S.players = Array.from({ length: n }, (_, i) => newPlayer(o, i));
  const deck = [];
  for (const d of BASIC) for (let k = 0; k < d.n; k++) deck.push(makeCard(S, d.id));
  for (const id of S.uniques) deck.push(makeCard(S, id));
  S.deck = shuffled(S, deck);
  for (const P of S.players) P.hand.push(...takeTop(S, RULES.startHand));
  S.crown = o.crown != null ? o.crown : Math.floor(rnd(S) * n);
  return S;
}
function startGame(S) { const ev = { fx: [] }; startRound(S, ev); return ev; }

/* the top of the deck is its end; cards put back go under it */
function takeTop(S, k) { const out = []; for (let i = 0; i < k && S.deck.length; i++) out.push(S.deck.pop()); return out; }
function toBottom(S, cards) { for (const c of cards) S.deck.unshift(c); }
function draw(S, P, k) { const got = takeTop(S, k); P.hand.push(...got); return got; }
const seatOf = (S, pid) => S.players[pid];
const left = (S, pid) => (pid + 1) % S.n;
const adjacent = (S, a, b) => a !== b && (left(S, a) === b || left(S, b) === a);
const has = (P, id) => P.city.some(e => e.card.id === id);
const entry = (P, uid) => P.city.find(e => e.card.uid === uid);
const cityCount = P => P.city.length + (has(P, 'monument') ? 1 : 0);
const isComplete = (S, P) => cityCount(P) >= S.size;
const worth = e => e.card.cost + (e.beau ? 1 : 0);
const cityPoints = P => sum(P.city, worth);
function log(S, ev, k, x) { const e = { k, round: S.round, ...x }; if (S.snap) e.v = publicView(S); ev.fx.push(e); if (!S.quiet) { S.log.push(e); if (S.log.length > 600) S.log.splice(0, 150); } return e; }
/* the table as everyone can see it. With S.snap set, every event carries one (as e.v), so a table can show the events one at a time */
function publicView(S) {
  const W = S.warrants;
  return {
    round: S.round, phase: S.phase, rank: S.rank, crown: S.crown, tax: S.tax, killed: S.killed, robbed: S.robbed, bewitched: S.bewitched,
    cur: S.cur ? { pid: S.cur.pid, char: S.cur.char, mode: S.cur.mode } : null, revealed: Object.assign({}, S.revealed), faceUp: S.sel ? S.sel.faceUp.slice() : [],
    warrants: W ? { by: W.by, chars: W.chars.slice(), shown: W.revealed, signed: W.revealed ? W.signed : null } : null,
    threats: S.threats ? S.threats.map(t => ({ char: t.char, by: t.by, on: t.on, shown: !!t.shown, paid: !!t.paid, real: t.shown ? t.real : null })) : null,
    p: S.players.map(P => ({ gold: P.gold, hand: P.hand.length, chars: P.chars.length, city: P.city.map(e => [e.card.uid, e.beau, e.museum.length]), done: !!P.done })),
  };
}
const charIn = (S, id) => S.chars.includes(id);
const charOfRank = (S, r) => S.chars.find(id => CHAR[id].rank === r) || null;
function gainFor(S, P, type) { return P.city.filter(e => e.card.type === type).length + (has(P, 'school-of-magic') ? 1 : 0); }
/* what a district costs this player to build (the Factory makes other unique districts 1 cheaper) */
function buildCost(P, card) { return Math.max(0, card.cost - (card.type === 'unique' && card.id !== 'factory' && has(P, 'factory') ? 1 : 0)); }

/* ── a round: the selection phase ── */
function faceUpCount(n, k) { return k === 8 ? ({ 4: 2, 5: 1, 6: 0, 7: 0 }[n] || 0) : ({ 4: 3, 5: 2, 6: 1, 7: 0, 8: 0 }[n] || 0); }
function startRound(S, ev) {
  S.round++; S.phase = 'select';
  Object.assign(S, { holder: {}, revealed: {}, killed: null, robbed: null, bewitched: null, witch: null, warrants: null, threats: null, rank: 0, cur: null, queenWait: null });
  for (const P of S.players) { P.chars = []; P.revealed = []; P.seen = []; }
  let deck = shuffled(S, S.chars);
  const sel = S.sel = { faceUp: [], faceDown: [], pass: [], steps: [], i: 0 };
  sel.faceDown.push(deck.pop());
  const up = S.n >= 4 ? faceUpCount(S.n, S.chars.length) : 0;
  while (sel.faceUp.length < up) {
    const c = deck.pop();
    /* the rank 4 character is never discarded face up: another goes instead and it is shuffled back */
    if (CHAR[c].rank === 4) { const next = deck.pop(); sel.faceUp.push(next); deck.push(c); deck = shuffled(S, deck); continue; }
    sel.faceUp.push(c);
  }
  sel.pass = deck;
  const order = Array.from({ length: S.n }, (_, k) => (S.crown + k) % S.n);
  sel.order = order;
  if (S.n === 2) sel.steps = [[order[0], 'keep'], [order[1], 'keep'], [order[1], 'down'], [order[0], 'keep'], [order[0], 'down'], [order[1], 'keep'], [order[1], 'down']];
  else if (S.n === 3) sel.steps = [[order[0], 'keep'], [order[1], 'keep'], [order[2], 'keep'], [null, 'random'], [order[0], 'keep'], [order[1], 'keep'], [order[2], 'keep'], [null, 'rest']];
  else {
    const special = (S.n === 7 && S.chars.length === 8) || (S.n === 8 && S.chars.length === 9);
    sel.steps = order.map((pid, k) => [pid, special && k === S.n - 1 ? 'keepPlus' : 'keep']);
    sel.steps.push([null, 'rest']);
  }
  log(S, ev, 'round', { crown: S.crown, faceUp: sel.faceUp.slice() });
  runSelection(S, ev);
}
function selOptions(S, op) { return op === 'keepPlus' ? S.sel.pass.concat(S.sel.faceDown.slice(0, 1)) : S.sel.pass.slice(); }
function runSelection(S, ev) {
  const sel = S.sel;
  while (sel.i < sel.steps.length) {
    const [pid, op] = sel.steps[sel.i];
    if (op === 'random') { const c = pick(S, sel.pass); sel.pass.splice(sel.pass.indexOf(c), 1); sel.faceDown.push(c); sel.i++; continue; }
    if (op === 'rest') { sel.faceDown.push(...sel.pass); sel.pass = []; sel.i++; continue; }
    const options = selOptions(S, op);
    if (op !== 'down') S.players[pid].seen.push(options.slice());
    S.need = { pid, kind: 'pick', op, options };
    return;
  }
  endSelection(S, ev);
}
function answerPick(S, pid, a, ev) {
  const nd = S.need, c = a.char;
  if (!nd.options.includes(c)) return false;
  const sel = S.sel, P = S.players[pid];
  if (nd.op === 'down') { sel.pass.splice(sel.pass.indexOf(c), 1); sel.faceDown.push(c); log(S, ev, 'down', { pid }); }
  else {
    if (nd.op === 'keepPlus') {
      /* the last player also took the first face-down card: the one not kept goes face down */
      const other = nd.options.find(x => x !== c), first = sel.faceDown[0];
      if (c === first) { sel.faceDown[0] = other; sel.pass = []; } else sel.pass = [];
    } else sel.pass.splice(sel.pass.indexOf(c), 1);
    P.chars.push(c); S.holder[c] = pid;
    log(S, ev, 'pick', { pid, char: c, only: pid });
  }
  sel.i++;
  S.need = null;
  runSelection(S, ev);
  return true;
}
function endSelection(S, ev) {
  const T = S.players.find(P => has(P, 'theater') && P.chars.length);
  if (T && !S.sel.theaterDone) { S.need = { pid: T.id, kind: 'theater' }; return; }
  startTurns(S, ev);
}
/* the Theater: swap your character with an opponent's without looking (with two characters each: you choose which to give, theirs is random) */
function answerTheater(S, pid, a, ev) {
  const P = S.players[pid];
  S.sel.theaterDone = true;
  if (a.target != null) {
    const X = S.players[a.target];
    if (!X || X === P || !X.chars.length) return false;
    const give = a.give && P.chars.includes(a.give) ? a.give : P.chars[0];
    const get = X.chars.length > 1 ? pick(S, X.chars) : X.chars[0];
    P.chars[P.chars.indexOf(give)] = get; X.chars[X.chars.indexOf(get)] = give;
    S.holder[get] = P.id; S.holder[give] = X.id;
    P.seen.push([get]); X.seen.push([give]);
    log(S, ev, 'theater', { pid, target: X.id });
    log(S, ev, 'theaterGot', { pid, char: get, only: pid });
    log(S, ev, 'theaterGot', { pid: X.id, char: give, only: X.id });
  } else log(S, ev, 'theaterPass', { pid });
  S.need = null;
  startTurns(S, ev);
  return true;
}

/* ── the turn phase: ranks are called one by one ── */
function startTurns(S, ev) { S.phase = 'turns'; S.rank = 0; callNext(S, ev); }
function callNext(S, ev) {
  for (;;) {
    S.rank++;
    if (S.rank > 9) return endRound(S, ev);
    const c = charOfRank(S, S.rank);
    if (!c) continue;
    const pid = S.holder[c];
    if (pid == null || S.killed === c) {
      log(S, ev, 'call', { char: c, pid: null, killed: S.killed === c });
      if (S.bewitched === c && S.witch) log(S, ev, 'witchLost', { pid: S.witch.pid, char: c });
      continue;
    }
    return beginTurn(S, pid, c, ev);
  }
}
const LIMITS = { architect: 3, seer: 2, scholar: 2, navigator: 0 };
function buildLimit(c) { return LIMITS[c] != null ? LIMITS[c] : 1; }
function newTurn(pid, c, mode) {
  return { pid, char: c, mode, gathered: false, threat: null, built: 0, paid: 0, spent: 0, limit: buildLimit(c), identical: false,
    used: {}, gainDone: false, crownGiven: false, keepWhy: null };
}
function beginTurn(S, pid, c, ev) {
  const P = S.players[pid];
  P.revealed.push(c); S.revealed[c] = pid;
  log(S, ev, 'call', { char: c, pid });
  if (S.robbed === c) {
    const Th = S.players[S.robbedBy];
    if (Th && Th !== P) { const g = P.gold; P.gold = 0; Th.gold += g; Th.stats.stolen += g; P.stats.lost += g; log(S, ev, 'rob', { pid, by: Th.id, n: g, char: c }); }
  }
  const mode = S.bewitched === c ? 'bewitched' : c === 'witch' ? 'witch' : 'normal';
  S.cur = newTurn(pid, c, mode);
  const th = S.threats && S.threats.find(t => t.char === c && t.on);
  if (th && th.by !== pid && mode !== 'bewitched') S.cur.threat = 'pending';
  if (mode === 'normal') startOfTurn(S, P, c, ev);
  S.need = { pid, kind: 'turn' };
}
/* what a character does on its own as its turn starts: the crown, the Queen's gold, the Tax Collector's token */
function startOfTurn(S, P, c, ev) {
  if (c === 'king' || c === 'patrician') takeCrown(S, P.id, ev);
  if (c === 'queen') {
    const r4 = charOfRank(S, 4), h = r4 != null ? S.holder[r4] : null;
    if (r4 && h != null) {
      if (S.killed === r4) S.queenWait = P.id;
      else if (adjacent(S, P.id, h)) { P.gold += 3; log(S, ev, 'gold', { pid: P.id, n: 3, why: 'queen' }); }
    }
  }
  if (c === 'tax-collector' && S.tax > 0) { const g = S.tax; S.tax = 0; P.gold += g; log(S, ev, 'gold', { pid: P.id, n: g, why: 'tax' }); }
}
function takeCrown(S, pid, ev, why) { if (S.crown === pid) return; S.crown = pid; log(S, ev, 'crown', { pid, why: why || 'take' }); }

/* ── what the player whose turn it is may do ── */
function canGather(S, pid) { const t = S.cur; return t && t.pid === pid && !t.gathered && t.mode !== 'resumed'; }
/* abilities and districts need the turn to be the player's own and any threat settled; the Witch's own turn only gathers and bewitches */
function turnOpen(S, pid) { const t = S.cur; return !!t && t.pid === pid && S.need && S.need.kind === 'turn' && S.need.pid === pid && t.threat !== 'pending' && t.mode !== 'bewitched'; }
function abilityFree(S, pid) { const t = S.cur; return turnOpen(S, pid) && !t.used.ability && (t.mode !== 'witch' || t.gathered); }
function districtOK(S, pid) { const t = S.cur; return turnOpen(S, pid) && t.mode !== 'witch'; }

/* building: what stops a district from being built at all, and the ways to pay for it */
function buildBlock(S, pid, card, o = {}) {
  const t = S.cur, P = S.players[pid];
  if (!t || t.pid !== pid || !t.gathered || t.mode === 'witch' || t.mode === 'bewitched' || t.threat === 'pending') return 'Not now';
  if (t.char === 'navigator') return 'The Navigator cannot build';
  if (card.id === 'secret-vault') return 'The Secret Vault cannot be built';
  if (card.id === 'monument' && cityCount(P) >= 5) return 'Not with 5 or more districts';
  if (!o.identicalOK && !t.identical && !has(P, 'quarry') && has(P, card.id)) return 'Already in your city';
  if (!o.free && countsToLimit(t, card) && t.built >= t.limit) return t.limit === 1 ? 'You have built this turn' : `Only ${t.limit} districts this turn`;
  return null;
}
function countsToLimit(t, card) { return !(card.id === 'stables' || (t.char === 'trader' && card.type === 'trade')); }
/* every way this player can pay for a card right now: [{ pay, label, gold }] */
function payOptions(S, pid, card) {
  const P = S.players[pid], t = S.cur, out = [];
  if (buildBlock(S, pid, card)) return out;
  const cost = buildCost(P, card), others = P.hand.filter(c => c.uid !== card.uid);
  if (P.gold >= cost) out.push({ pay: 'gold', gold: cost });
  if (card.id === 'thieves-den' && others.length && P.gold >= cost - Math.min(cost, others.length)) out.push({ pay: 'cards', gold: Math.max(0, cost - others.length), max: Math.min(cost, others.length) });
  if (has(P, 'framework')) out.push({ pay: 'framework', gold: 0 });
  if (card.id === 'necropolis' && P.city.length) out.push({ pay: 'necropolis', gold: 0 });
  if (t.char === 'cardinal' && P.gold < cost) {
    const short = cost - P.gold;
    if (others.length >= short && S.players.some(X => X !== P && X.gold >= short)) out.push({ pay: 'cardinal', gold: P.gold, short });
  }
  return out;
}
function doBuild(S, pid, a, ev) {
  const P = S.players[pid], t = S.cur, card = P.hand.find(c => c.uid === a.uid);
  if (!card) return false;
  const opts = payOptions(S, pid, card), how = opts.find(o => o.pay === (a.pay || 'gold'));
  if (!how) return false;
  const cost = buildCost(P, card);
  let goldPaid = 0;
  switch (how.pay) {
    case 'gold': goldPaid = cost; break;
    case 'cards': {
      const cards = (a.cards || []).map(u => P.hand.find(c => c.uid === u && c.uid !== card.uid));
      if (cards.some(c => !c) || new Set(a.cards).size !== cards.length || cards.length > cost || cards.length < 1) return false;
      goldPaid = cost - cards.length;
      if (P.gold < goldPaid) return false;
      P.hand = P.hand.filter(c => !a.cards.includes(c.uid)); toBottom(S, cards);
      log(S, ev, 'discard', { pid, n: cards.length, why: 'thieves-den' });
      break;
    }
    case 'framework': { const fw = P.city.find(e => e.card.id === 'framework'); removeFromCity(S, P, fw, ev, 'framework'); break; }
    case 'necropolis': {
      const e = entry(P, a.sacrifice); if (!e) return false;
      removeFromCity(S, P, e, ev, 'necropolis'); break;
    }
    case 'cardinal': {
      const X = S.players[a.from], short = cost - P.gold, give = (a.give || []).map(u => P.hand.find(c => c.uid === u && c.uid !== card.uid));
      if (!X || X === P || X.gold < short || give.length !== short || give.some(c => !c) || new Set(a.give).size !== short) return false;
      X.gold -= short; P.gold += short;
      P.hand = P.hand.filter(c => !a.give.includes(c.uid)); X.hand.push(...give);
      log(S, ev, 'cardinal', { pid, from: X.id, n: short });
      goldPaid = cost; break;
    }
  }
  P.gold -= goldPaid;
  P.hand.splice(P.hand.indexOf(card), 1);
  if (countsToLimit(t, card)) t.built++;
  t.spent += goldPaid;
  const paid = how.pay === 'gold' || how.pay === 'cards' || how.pay === 'cardinal';
  return finishBuild(S, P, card, { paid, goldPaid }, ev);
}
/* a paid build may be confiscated by the Magistrate (only the first paid district of the signed character's turn) */
function finishBuild(S, P, card, o, ev) {
  const t = S.cur, W = S.warrants;
  const first = o.paid && t.paid === 0;
  if (o.paid) t.paid++;
  if (first && W && !W.revealed && W.signed === t.char && W.by !== P.id && !has(S.players[W.by], card.id)) {
    S.need = { pid: W.by, kind: 'confiscate', builder: P.id, card, goldPaid: o.goldPaid };
    log(S, ev, 'paidBuild', { pid: P.id, card });
    return true;
  }
  placeBuilt(S, P, card, ev, o.how);
  backToTurn(S, ev);
  return true;
}
function answerConfiscate(S, pid, a, ev) {
  const nd = S.need, B = S.players[nd.builder], M = S.players[pid];
  if (a.take) {
    S.warrants.revealed = true;
    B.gold += nd.goldPaid; S.cur.spent -= nd.goldPaid;
    log(S, ev, 'confiscate', { pid, from: B.id, card: nd.card, refund: nd.goldPaid });
    placeBuilt(S, M, nd.card, ev, 'confiscated');
  } else placeBuilt(S, B, nd.card, ev);
  S.need = null;
  backToTurn(S, ev);
  return true;
}
function placeBuilt(S, owner, card, ev, how) {
  owner.city.push({ card, beau: 0, museum: [] });
  owner.stats.built++;
  log(S, ev, 'build', { pid: owner.id, card, how: how || null });
  /* the tax: everyone who builds puts 1 gold on the Tax Collector's token, except the Tax Collector in his own turn */
  if (S.taxOn && owner.gold > 0 && !(S.cur && S.cur.pid === owner.id && S.cur.char === 'tax-collector')) { owner.gold--; S.tax++; log(S, ev, 'tax', { pid: owner.id }); }
  if (isComplete(S, owner) && !owner.done) {
    owner.done = true;
    const first = S.firstDone == null;
    if (first) S.firstDone = owner.id;
    S.ending = true;
    log(S, ev, 'complete', { pid: owner.id, first });
  }
}
function backToTurn(S, ev) { if (S.cur) S.need = { pid: S.cur.pid, kind: 'turn' }; }
/* a district leaving a city goes under the deck; cards under a Museum go with it, gold on a beautified one goes back to the bank */
function removeFromCity(S, P, e, ev, why) {
  P.city.splice(P.city.indexOf(e), 1);
  toBottom(S, [e.card, ...e.museum]);
  if (isComplete(S, P) === false && P.done) P.done = false;
  log(S, ev, 'destroy', { pid: P.id, card: e.card, why });
}

/* ── gathering resources ── */
function doGather(S, pid, a, ev) {
  const P = S.players[pid], t = S.cur;
  if (!canGather(S, pid)) return false;
  if (a.take === 'gold') {
    const n = 2 + (has(P, 'gold-mine') ? 1 : 0);
    P.gold += n; log(S, ev, 'gold', { pid, n, why: 'gather' });
    return afterGather(S, P, ev);
  }
  const got = takeTop(S, has(P, 'observatory') ? 3 : 2);
  if (has(P, 'library') || got.length <= 1) { P.hand.push(...got); log(S, ev, 'cards', { pid, n: got.length, why: 'gather' }); return afterGather(S, P, ev); }
  t.keepWhy = 'gather';
  S.need = { pid, kind: 'keep', cards: got, keep: 1, why: 'gather' };
  return true;
}
function answerKeep(S, pid, a, ev) {
  const nd = S.need, P = S.players[pid];
  const keep = (a.uids || []).map(u => nd.cards.find(c => c.uid === u));
  if (keep.length !== Math.min(nd.keep, nd.cards.length) || keep.some(c => !c) || new Set(a.uids).size !== keep.length) return false;
  const rest = nd.cards.filter(c => !keep.includes(c));
  P.hand.push(...keep);
  if (nd.why === 'scholar') { S.deck = shuffled(S, S.deck.concat(rest)); log(S, ev, 'cards', { pid, n: keep.length, why: 'scholar' }); S.need = null; backToTurn(S, ev); return true; }
  toBottom(S, rest);
  log(S, ev, 'cards', { pid, n: keep.length, why: nd.why });
  S.need = null;
  if (nd.why === 'gather') return afterGather(S, P, ev);
  backToTurn(S, ev);
  return true;
}
function afterGather(S, P, ev) {
  const t = S.cur;
  t.gathered = true;
  if (t.mode === 'bewitched') return endBewitched(S, ev);
  if (t.mode === 'normal' || t.mode === 'resumed') afterGatherBonus(S, P, t.char, ev);
  if (t.threat === 'pending') {
    S.need = { pid: P.id, kind: 'bribe', amount: Math.floor(P.gold / 2) };
    return true;
  }
  backToTurn(S, ev);
  return true;
}
/* the extra resources some characters gain whatever they gathered */
function afterGatherBonus(S, P, c, ev) {
  if (c === 'architect') { const got = draw(S, P, 2); log(S, ev, 'cards', { pid: P.id, n: got.length, why: 'architect' }); }
  if (c === 'merchant') { P.gold += 1; log(S, ev, 'gold', { pid: P.id, n: 1, why: 'merchant' }); }
}

/* ── the Blackmailer's threat, settled right after the threatened player gathers ── */
function answerBribe(S, pid, a, ev) {
  const P = S.players[pid], th = S.threats.find(x => x.char === S.cur.char && x.on), B = S.players[th.by];
  if (a.pay) {
    const n = Math.floor(P.gold / 2);
    P.gold -= n; B.gold += n; th.on = false; th.paid = true;
    log(S, ev, 'bribe', { pid, by: B.id, n });
    S.cur.threat = 'done'; S.need = null; backToTurn(S, ev); return true;
  }
  log(S, ev, 'refuse', { pid, by: B.id });
  S.need = { pid: B.id, kind: 'reveal', target: pid };
  return true;
}
function answerReveal(S, pid, a, ev) {
  const nd = S.need, X = S.players[nd.target], th = S.threats.find(x => x.char === S.cur.char && x.on), B = S.players[pid];
  if (a.reveal) {
    th.on = false; th.shown = true;
    if (th.real) { const g = X.gold; X.gold = 0; B.gold += g; B.stats.stolen += g; X.stats.lost += g; log(S, ev, 'threat', { pid: X.id, by: pid, real: true, n: g }); }
    else log(S, ev, 'threat', { pid: X.id, by: pid, real: false, n: 0 });
  } else log(S, ev, 'spare', { pid: X.id, by: pid });
  S.cur.threat = 'done'; S.need = null; backToTurn(S, ev);
  return true;
}

/* ── the Witch: her own turn only gathers and bewitches; the bewitched player only gathers; then she resumes as them ── */
function endBewitched(S, ev) {
  const c = S.cur.char, W = S.witch;
  log(S, ev, 'bewitchedEnd', { pid: S.cur.pid, char: c });
  S.cur = null;
  if (!W) return callNext(S, ev);
  const P = S.players[W.pid];
  S.cur = newTurn(P.id, c, 'resumed');
  S.cur.gathered = true;
  log(S, ev, 'resume', { pid: P.id, char: c });
  startOfTurn(S, P, c, ev);
  afterGatherBonus(S, P, c, ev);
  S.need = { pid: P.id, kind: 'turn' };
  return true;
}

/* ── the characters' abilities ── */
const ABILITY_CHARS = ['assassin', 'witch', 'magistrate', 'thief', 'spy', 'blackmailer', 'magician', 'wizard', 'seer', 'emperor', 'abbot', 'navigator', 'scholar', 'warlord', 'diplomat', 'marshal', 'artist'];
/* the characters a targeting ability may name */
function namable(S, c) {
  const all = S.chars.filter(x => CHAR[x].rank > 1);
  switch (c) {
    case 'assassin': case 'witch': return all;
    case 'magistrate': return all;
    case 'thief': return all.filter(x => x !== 'thief' && x !== S.killed && x !== S.bewitched);
    case 'blackmailer': return all.filter(x => x !== 'blackmailer' && x !== S.killed && x !== S.bewitched);
  }
  return [];
}
/* the rank 8 character: which districts it can reach in a city, and what it costs */
function protectedCity(S, pid) {
  const b = charOfRank(S, 5) === 'bishop' ? 'bishop' : null;
  if (!b || S.killed === b || S.revealed[b] == null) return false;
  /* the Bishop's protection goes with whoever played the Bishop's turn: the Witch if she bewitched it */
  const actor = S.bewitched === b && S.witch ? S.witch.pid : S.holder[b];
  return actor === pid;
}
function rank8Extra(X, e) { return has(X, 'great-wall') && e.card.id !== 'great-wall' ? 1 : 0; }
function warlordTargets(S, pid) {
  const out = [];
  for (const X of S.players) {
    if (X.id !== pid && (isComplete(S, X) || protectedCity(S, X.id))) continue;
    for (const e of X.city) if (e.card.id !== 'keep') out.push({ target: X.id, uid: e.card.uid, cost: Math.max(0, worth(e) - 1 + rank8Extra(X, e)) });
  }
  return out;
}
function marshalTargets(S, pid) {
  const P = S.players[pid], out = [];
  for (const X of S.players) {
    if (X.id === pid || isComplete(S, X) || protectedCity(S, X.id)) continue;
    for (const e of X.city) if (e.card.id !== 'keep' && worth(e) <= 3 && !has(P, e.card.id)) out.push({ target: X.id, uid: e.card.uid, cost: worth(e) + rank8Extra(X, e) });
  }
  return out;
}
function diplomatTargets(S, pid) {
  const P = S.players[pid], out = [];
  for (const mine of P.city) {
    if (mine.card.id === 'keep') continue;
    for (const X of S.players) {
      if (X.id === pid || isComplete(S, X) || protectedCity(S, X.id)) continue;
      for (const e of X.city) {
        if (e.card.id === 'keep') continue;
        if (has(P, e.card.id) && e.card.id !== mine.card.id) continue;
        if (has(X, mine.card.id) && e.card.id !== mine.card.id) continue;
        if (e.card.id === mine.card.id) continue;
        out.push({ mine: mine.card.uid, target: X.id, uid: e.card.uid, cost: Math.max(0, worth(e) - worth(mine)) + rank8Extra(X, e) });
      }
    }
  }
  return out;
}
function armoryTargets(S, pid) {
  const out = [];
  for (const X of S.players) { if (isComplete(S, X)) continue; for (const e of X.city) if (!(X.id === pid && e.card.id === 'armory')) out.push({ target: X.id, uid: e.card.uid }); }
  return out;
}
/* the Emperor (and a killed Emperor at the end of the round) gives the crown to someone who is neither him nor its holder */
function crownTargets(S, pid) { return S.players.filter(X => X.id !== pid && X.id !== S.crown).map(X => X.id); }
function richest(S, pid) {
  const max = Math.max(...S.players.map(X => X.gold));
  const top = S.players.filter(X => X.gold === max);
  if (top.some(X => X.id === pid) || max <= 0) return [];
  return top.map(X => X.id);
}
function doAbility(S, pid, a, ev) {
  const t = S.cur, P = S.players[pid], c = t.char;
  if (!abilityFree(S, pid)) return false;
  const named = x => x && charIn(S, x);
  switch (c) {
    case 'assassin': {
      if (!named(a.char) || !namable(S, c).includes(a.char)) return false;
      S.killed = a.char; S.killedBy = pid; S.kills.push(a.char); log(S, ev, 'kill', { pid, char: a.char }); break;
    }
    case 'witch': {
      if (!t.gathered || !named(a.char) || !namable(S, c).includes(a.char)) return false;
      S.bewitched = a.char; S.witch = { pid };
      log(S, ev, 'bewitch', { pid, char: a.char });
      t.used.ability = true;
      S.cur = null; S.need = null;
      callNext(S, ev);
      return true;
    }
    case 'magistrate': {
      const cs = a.chars || [];
      if (cs.length !== 3 || new Set(cs).size !== 3 || cs.some(x => !namable(S, c).includes(x)) || !cs.includes(a.signed)) return false;
      S.warrants = { by: pid, chars: cs.slice(), signed: a.signed, revealed: false };
      log(S, ev, 'warrants', { pid, chars: cs.slice() });
      log(S, ev, 'signed', { pid, char: a.signed, only: pid });
      break;
    }
    case 'thief': {
      if (!named(a.char) || !namable(S, c).includes(a.char)) return false;
      S.robbed = a.char; S.robbedBy = pid; log(S, ev, 'robNamed', { pid, char: a.char }); break;
    }
    case 'blackmailer': {
      const cs = a.chars || [];
      if (cs.length !== 2 || new Set(cs).size !== 2 || cs.some(x => !namable(S, c).includes(x)) || !cs.includes(a.real)) return false;
      S.threats = cs.map(x => ({ char: x, real: x === a.real, on: true, by: pid }));
      log(S, ev, 'threats', { pid, chars: cs.slice() });
      log(S, ev, 'real', { pid, char: a.real, only: pid });
      break;
    }
    case 'spy': {
      const X = S.players[a.target];
      if (!X || X === P || !TYPE_ORDER.includes(a.type)) return false;
      const match = X.hand.filter(card => card.type === a.type).length;
      let gold = 0;
      for (let k = 0; k < match; k++) if (X.gold > 0) { X.gold--; P.gold++; gold++; }
      const got = draw(S, P, match);
      log(S, ev, 'spy', { pid, target: X.id, type: a.type, n: match, gold, cards: got.length });
      log(S, ev, 'peek', { pid, target: X.id, hand: X.hand.slice(), only: pid });
      break;
    }
    case 'magician': {
      if (a.mode === 'swap') {
        const X = S.players[a.target];
        if (!X || X === P) return false;
        const h = P.hand; P.hand = X.hand; X.hand = h;
        log(S, ev, 'swapHands', { pid, target: X.id, gave: X.hand.length, got: P.hand.length });
      } else if (a.mode === 'redraw') {
        const cards = (a.uids || []).map(u => P.hand.find(x => x.uid === u));
        if (!cards.length || cards.some(x => !x) || new Set(a.uids).size !== cards.length) return false;
        P.hand = P.hand.filter(x => !a.uids.includes(x.uid)); toBottom(S, cards);
        const got = draw(S, P, cards.length);
        log(S, ev, 'redraw', { pid, n: got.length });
      } else return false;
      break;
    }
    case 'wizard': {
      const X = S.players[a.target];
      if (!X || X === P || !t.gathered) return false;
      t.used.ability = true; t.identical = true;
      if (!X.hand.length) { log(S, ev, 'wizardEmpty', { pid, target: X.id }); return true; }
      S.need = { pid, kind: 'wizard', from: X.id, cards: X.hand.slice() };
      log(S, ev, 'wizardLook', { pid, target: X.id });
      return true;
    }
    case 'seer': {
      const from = [];
      for (const X of S.players) if (X !== P && X.hand.length) { const card = pick(S, X.hand); X.hand.splice(X.hand.indexOf(card), 1); P.hand.push(card); from.push(X.id); log(S, ev, 'seerTook', { pid, target: X.id, card, only: pid }); }
      t.used.ability = true;
      log(S, ev, 'seer', { pid, from: from.slice() });
      if (!from.length) return true;
      S.need = { pid, kind: 'seer', to: from };
      return true;
    }
    case 'emperor': {
      const X = S.players[a.target];
      if (!X || !crownTargets(S, pid).includes(X.id)) return false;
      S.crown = X.id; t.crownGiven = true;
      log(S, ev, 'crown', { pid: X.id, why: 'emperor', by: pid });
      let took = null;
      const want = a.take === 'card' ? ['card', 'gold'] : ['gold', 'card'];
      for (const w of want) {
        if (w === 'gold' && X.gold > 0) { X.gold--; P.gold++; took = 'gold'; break; }
        if (w === 'card' && X.hand.length) { const card = pick(S, X.hand); X.hand.splice(X.hand.indexOf(card), 1); P.hand.push(card); took = 'card'; break; }
      }
      log(S, ev, 'tribute', { pid, from: X.id, took });
      break;
    }
    case 'abbot': {
      const top = richest(S, pid);
      if (!top.length) return false;
      const from = top.includes(a.from) ? a.from : top[0];
      S.players[from].gold--; P.gold++;
      log(S, ev, 'alms', { pid, from });
      break;
    }
    case 'navigator': {
      if (a.take === 'gold') { P.gold += 4; log(S, ev, 'gold', { pid, n: 4, why: 'navigator' }); }
      else if (a.take === 'cards') { const got = draw(S, P, 4); log(S, ev, 'cards', { pid, n: got.length, why: 'navigator' }); }
      else return false;
      break;
    }
    case 'scholar': {
      const got = takeTop(S, 7);
      t.used.ability = true;
      if (!got.length) return true;
      S.need = { pid, kind: 'keep', cards: got, keep: 1, why: 'scholar' };
      log(S, ev, 'scholar', { pid, n: got.length });
      return true;
    }
    case 'warlord': {
      const o = warlordTargets(S, pid).find(x => x.target === a.target && x.uid === a.uid);
      if (!o || P.gold < o.cost) return false;
      const X = S.players[o.target], e = entry(X, o.uid);
      P.gold -= o.cost; removeFromCity(S, X, e, ev, 'warlord');
      ev.fx[ev.fx.length - 1].by = pid; ev.fx[ev.fx.length - 1].paid = o.cost;
      if (X !== P) P.stats.destroyed++;
      break;
    }
    case 'marshal': {
      const o = marshalTargets(S, pid).find(x => x.target === a.target && x.uid === a.uid);
      if (!o || P.gold < o.cost) return false;
      const X = S.players[o.target], e = entry(X, o.uid);
      P.gold -= o.cost; X.gold += o.cost;
      X.city.splice(X.city.indexOf(e), 1); P.city.push(e);
      log(S, ev, 'seize', { pid, from: X.id, card: e.card, paid: o.cost });
      checkComplete(S, P, ev);
      break;
    }
    case 'diplomat': {
      const o = diplomatTargets(S, pid).find(x => x.mine === a.mine && x.target === a.target && x.uid === a.uid);
      if (!o || P.gold < o.cost) return false;
      const X = S.players[o.target], mine = entry(P, o.mine), theirs = entry(X, o.uid);
      P.gold -= o.cost; X.gold += o.cost;
      P.city[P.city.indexOf(mine)] = theirs; X.city[X.city.indexOf(theirs)] = mine;
      log(S, ev, 'exchange', { pid, with: X.id, gave: mine.card, got: theirs.card, paid: o.cost });
      break;
    }
    case 'artist': {
      const es = (a.uids || []).map(u => entry(P, u));
      if (!es.length || es.length > 2 || es.some(e => !e || e.beau) || new Set(a.uids).size !== es.length || P.gold < es.length) return false;
      for (const e of es) { e.beau = 1; P.gold--; }
      log(S, ev, 'beautify', { pid, cards: es.map(e => e.card) });
      break;
    }
    default: return false;
  }
  t.used.ability = true;
  return true;
}
function checkComplete(S, P, ev) {
  if (isComplete(S, P) && !P.done) { P.done = true; const first = S.firstDone == null; if (first) S.firstDone = P.id; S.ending = true; log(S, ev, 'complete', { pid: P.id, first }); }
}
/* the Wizard took a look: one card to build at once or to keep */
function answerWizard(S, pid, a, ev) {
  const nd = S.need, P = S.players[pid], X = S.players[nd.from], card = X.hand.find(c => c.uid === a.uid);
  if (!card) return false;
  if (a.build) {
    const cost = buildCost(P, card);
    if (card.id === 'secret-vault' || (card.id === 'monument' && cityCount(P) >= 5) || P.gold < cost || S.cur.char === 'navigator') return false;
    X.hand.splice(X.hand.indexOf(card), 1);
    P.gold -= cost; S.cur.spent += cost;
    log(S, ev, 'wizardTake', { pid, from: X.id, card, build: true });
    S.need = null;
    return finishBuild(S, P, card, { paid: true, goldPaid: cost }, ev);
  }
  X.hand.splice(X.hand.indexOf(card), 1); P.hand.push(card);
  log(S, ev, 'wizardTake', { pid, from: X.id, build: false });
  log(S, ev, 'wizardCard', { pid, card, only: pid });
  S.need = null; backToTurn(S, ev);
  return true;
}
/* the Seer gives one card back to each player she took from */
function answerSeer(S, pid, a, ev) {
  const nd = S.need, P = S.players[pid], gives = a.gives || {};
  const uids = nd.to.map(x => gives[x]);
  if (uids.some(u => u == null) || new Set(uids).size !== uids.length) return false;
  const cards = uids.map(u => P.hand.find(c => c.uid === u));
  if (cards.some(c => !c)) return false;
  nd.to.forEach((x, i) => { P.hand.splice(P.hand.indexOf(cards[i]), 1); S.players[x].hand.push(cards[i]); });
  log(S, ev, 'seerGave', { pid, to: nd.to.slice() });
  S.need = null; backToTurn(S, ev);
  return true;
}
/* gaining resources for districts: once per turn, at any time */
function gainCount(S, P, c) { const g = CHAR[c].gain; return g ? gainFor(S, P, g.type) : 0; }
function doGain(S, pid, a, ev) {
  const t = S.cur, P = S.players[pid], g = CHAR[t.char].gain;
  if (!g || t.gainDone || !turnOpen(S, pid) || t.mode === 'witch') return false;
  const n = gainCount(S, P, t.char);
  t.gainDone = true;
  if (g.res === 'gold') { P.gold += n; log(S, ev, 'gold', { pid, n, why: 'gain' }); }
  else if (g.res === 'cards') { const got = draw(S, P, n); log(S, ev, 'cards', { pid, n: got.length, why: 'gain' }); }
  else {
    const gold = clamp(a.gold != null ? a.gold : n, 0, n), cards = n - gold;
    P.gold += gold; const got = draw(S, P, cards);
    if (gold) log(S, ev, 'gold', { pid, n: gold, why: 'gain' });
    if (cards) log(S, ev, 'cards', { pid, n: got.length, why: 'gain' });
    if (!n) log(S, ev, 'gold', { pid, n: 0, why: 'gain' });
  }
  return true;
}

/* ── the districts used during a turn ── */
function doDistrict(S, pid, a, ev) {
  const t = S.cur, P = S.players[pid];
  if (!districtOK(S, pid)) return false;
  switch (a.t) {
    case 'lab': {
      const card = P.hand.find(c => c.uid === a.uid);
      if (!has(P, 'laboratory') || t.used.lab || !card) return false;
      P.hand.splice(P.hand.indexOf(card), 1); toBottom(S, [card]); P.gold += 2; t.used.lab = true;
      log(S, ev, 'gold', { pid, n: 2, why: 'laboratory' }); return true;
    }
    case 'smithy': {
      if (!has(P, 'smithy') || t.used.smithy || P.gold < 2) return false;
      P.gold -= 2; const got = draw(S, P, 3); t.used.smithy = true;
      log(S, ev, 'cards', { pid, n: got.length, why: 'smithy' }); return true;
    }
    case 'museum': {
      const card = P.hand.find(c => c.uid === a.uid), m = P.city.find(e => e.card.id === 'museum');
      if (!m || t.used.museum || !card) return false;
      P.hand.splice(P.hand.indexOf(card), 1); m.museum.push(card); t.used.museum = true;
      log(S, ev, 'museum', { pid }); return true;
    }
    case 'armory': {
      const ar = P.city.find(e => e.card.id === 'armory');
      const o = ar && armoryTargets(S, pid).find(x => x.target === a.target && x.uid === a.uid);
      if (!o) return false;
      removeFromCity(S, P, ar, ev, 'armory');
      const X = S.players[o.target], e = entry(X, o.uid);
      if (e && !isComplete(S, X)) { removeFromCity(S, X, e, ev, 'armory'); ev.fx[ev.fx.length - 1].by = pid; if (X !== P) P.stats.destroyed++; }
      return true;
    }
  }
  return false;
}

/* ── ending a turn: the Emperor must have given the crown; a resource ability not used yet is taken now ── */
function canEnd(S, pid) {
  const t = S.cur;
  if (!t || t.pid !== pid || !t.gathered || S.need.kind !== 'turn' || t.threat === 'pending') return false;
  if (t.char === 'emperor' && t.mode !== 'witch' && !t.crownGiven) return false;
  return true;
}
function doEnd(S, pid, ev) {
  const t = S.cur, P = S.players[pid];
  if (!canEnd(S, pid)) return false;
  if (t.mode === 'witch') { log(S, ev, 'witchIdle', { pid }); S.cur = null; S.need = null; callNext(S, ev); return true; }
  if (CHAR[t.char].gain && !t.gainDone) doGain(S, pid, { gold: CHAR[t.char].gain.res === 'either' ? defaultAbbotGold(S, P) : null }, ev);
  if (has(P, 'poor-house') && P.gold === 0) { P.gold += 1; log(S, ev, 'gold', { pid, n: 1, why: 'poor-house' }); }
  if (t.char === 'alchemist' && t.spent > 0) { P.gold += t.spent; log(S, ev, 'gold', { pid, n: t.spent, why: 'alchemist' }); }
  if (has(P, 'park') && !P.hand.length) { const got = draw(S, P, 2); log(S, ev, 'cards', { pid, n: got.length, why: 'park' }); }
  log(S, ev, 'end', { pid, char: t.char });
  S.cur = null; S.need = null;
  callNext(S, ev);
  return true;
}
function defaultAbbotGold(S, P) { const n = gainCount(S, P, 'abbot'); return P.hand.length < 2 ? Math.max(0, n - 1) : n; }

/* ── the end of a round: the killed character is turned up (a killed King still takes the crown) ── */
function endRound(S, ev) {
  S.phase = 'roundEnd'; S.cur = null;
  const k = S.killed, h = k != null ? S.holder[k] : null;
  if (k && h != null) {
    log(S, ev, 'killedWas', { char: k, pid: h });
    if (k === 'king' || k === 'patrician') takeCrown(S, h, ev, 'heir');
    if (k === 'emperor') { S.need = { pid: h, kind: 'heir' }; return; }
  }
  return finishRound(S, ev);
}
function answerHeir(S, pid, a, ev) {
  const X = S.players[a.target];
  if (!X || !crownTargets(S, pid).includes(X.id)) return false;
  S.crown = X.id; log(S, ev, 'crown', { pid: X.id, why: 'advisor', by: pid });
  S.need = null;
  finishRound(S, ev);
  return true;
}
function finishRound(S, ev) {
  const k = S.killed, h = k != null ? S.holder[k] : null;
  if (S.queenWait != null && k && CHAR[k].rank === 4 && h != null && adjacent(S, S.queenWait, h)) {
    S.players[S.queenWait].gold += 3; log(S, ev, 'gold', { pid: S.queenWait, n: 3, why: 'queen' });
  }
  log(S, ev, 'roundEnd', { round: S.round, chars: S.players.map(P => P.chars.slice()) });
  if (S.ending) return finishGame(S, ev);
  startRound(S, ev);
}

/* ── scoring ── */
function scoreOf(S, P) {
  const best = { total: -1 };
  const hq = has(P, 'haunted-quarter');
  for (const as of hq ? TYPE_ORDER : [null]) {
    const r = scoreWith(S, P, as);
    if (r.total > best.total) Object.assign(best, r);
  }
  return best;
}
function scoreWith(S, P, hqAs) {
  const typeOf = e => (e.card.id === 'haunted-quarter' && hqAs ? hqAs : e.card.type);
  const lines = [], base = cityPoints(P);
  const types = new Set(P.city.map(typeOf)), uniques = P.city.filter(e => typeOf(e) === 'unique').length;
  const add = (id, pts, why) => { if (pts) lines.push({ id, pts, why }); };
  add('types', TYPE_ORDER.every(t => types.has(t)) ? 3 : 0, 'One district of every type');
  const done = isComplete(S, P);
  add('complete', done ? (S.firstDone === P.id ? 4 : 2) : 0, S.firstDone === P.id ? 'First to complete a city' : 'Completed city');
  if (has(P, 'dragon-gate')) add('dragon-gate', 2, 'Dragon Gate');
  if (has(P, 'basilica')) add('basilica', P.city.filter(e => worth(e) % 2 === 1).length, 'Basilica: odd-cost districts');
  if (has(P, 'capitol')) { const c = {}; for (const e of P.city) c[typeOf(e)] = (c[typeOf(e)] || 0) + 1; add('capitol', Object.values(c).some(v => v >= 3) ? 3 : 0, 'Capitol: 3 of a type'); }
  if (has(P, 'imperial-treasury')) add('imperial-treasury', P.gold, 'Imperial Treasury: your gold');
  if (has(P, 'ivory-tower')) add('ivory-tower', uniques === 1 ? 5 : 0, 'Ivory Tower: the only unique district');
  if (has(P, 'map-room')) add('map-room', P.hand.length, 'Map Room: cards in hand');
  if (has(P, 'museum')) add('museum', P.city.find(e => e.card.id === 'museum').museum.length, 'Museum: cards under it');
  if (P.hand.some(c => c.id === 'secret-vault')) add('secret-vault', 3, 'Secret Vault, shown from the hand');
  if (has(P, 'statue')) add('statue', S.crown === P.id ? 5 : 0, 'Statue: you hold the crown');
  if (has(P, 'wishing-well')) add('wishing-well', uniques, 'Wishing Well: unique districts');
  return { base, lines, total: base + sum(lines, l => l.pts), hqAs: hqAs || null };
}
function finishGame(S, ev) {
  S.phase = 'over'; S.over = true; S.need = null;
  S.scores = S.players.map(P => scoreOf(S, P));
  /* ties go to the player with the highest-ranked character in the last round */
  const rankOf = P => Math.max(0, ...P.chars.map(c => CHAR[c].rank));
  const order = S.players.slice().sort((a, b) => S.scores[b.id].total - S.scores[a.id].total || rankOf(b) - rankOf(a));
  S.winner = order[0].id; S.standings = order.map(P => P.id);
  log(S, ev, 'gameEnd', { winner: S.winner, scores: S.scores.map(s => s.total) });
}

/* ── one entry point for every decision ── */
function act(S, pid, a) {
  if (S.over || !S.need || S.need.pid !== pid || !a) return null;
  const ev = { fx: [] }, kind = S.need.kind;
  let ok = false;
  switch (kind) {
    case 'pick': ok = a.t === 'pick' && answerPick(S, pid, a, ev); break;
    case 'theater': ok = a.t === 'theater' && answerTheater(S, pid, a, ev); break;
    case 'keep': ok = a.t === 'keep' && answerKeep(S, pid, a, ev); break;
    case 'bribe': ok = a.t === 'bribe' && answerBribe(S, pid, a, ev); break;
    case 'reveal': ok = a.t === 'reveal' && answerReveal(S, pid, a, ev); break;
    case 'confiscate': ok = a.t === 'confiscate' && answerConfiscate(S, pid, a, ev); break;
    case 'wizard': ok = a.t === 'wizard' && answerWizard(S, pid, a, ev); break;
    case 'seer': ok = a.t === 'seer' && answerSeer(S, pid, a, ev); break;
    case 'heir': ok = a.t === 'heir' && answerHeir(S, pid, a, ev); break;
    case 'turn':
      switch (a.t) {
        case 'gather': ok = doGather(S, pid, a, ev); break;
        case 'build': ok = doBuild(S, pid, a, ev); break;
        case 'ability': ok = doAbility(S, pid, a, ev); break;
        case 'gain': ok = doGain(S, pid, a, ev); break;
        case 'lab': case 'smithy': case 'museum': case 'armory': ok = doDistrict(S, pid, a, ev); break;
        case 'end': ok = doEnd(S, pid, ev); break;
      }
      break;
  }
  return ok ? ev : null;
}
