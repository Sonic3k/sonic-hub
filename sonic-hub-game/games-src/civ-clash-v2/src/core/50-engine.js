/* ── Engine: draw 1, play 1; the symbols do the rest ──
   S.virtual marks a light copy the AI and the previews resolve cards on: nothing hidden is revealed and no random draw is made
   there (cards drawn or stolen are only counted). */
function makeCard(S, base) { return { uid: S.nextUid++, ...base }; }
function unitCard(S, id, owner) { const U = UNITS[id]; return makeCard(S, { unit: id, name: U.name, icons: U.icons, civ: owner, crest: crestOf(id) }); }
function unitsOf(S, civ, list) { const out = []; for (const [id, n] of Object.entries(list)) for (let k = 0; k < n; k++) out.push(unitCard(S, id, civ)); return out; }
function buildDeck(S, civ) { return unitsOf(S, civ, CIVS[civ].deck); }
function imperialCards(S, civ) { return unitsOf(S, civ, CIVS[civ].imperial); }
function buildMercs(S) {
  const out = [];
  for (const M of MERCS) for (let k = 0; k < M.n; k++) { const U = UNITS[M.unit]; out.push(makeCard(S, { unit: M.unit, name: U.name, icons: U.icons, civ: 'merc', merc: M.unit, cost: M.cost })); }
  return shuffled(S, out);
}
function newPlayer(S, civ, id, ai) {
  const hp = S.duel ? CIVS[civ].hp2 : CIVS[civ].hp4;
  return { id, civ, ai: !!ai, hp, maxHP: hp, deck: shuffled(S, buildDeck(S, civ)), hand: [], discard: [], structs: [], gold: 0, relic: null, relicOffer: null,
    guards: { bodyguard: 0, camel: 0, mantlet: 0 }, traps: { trap: 0, storm: false }, alive: true, turns: 0, aged: false, ageGiven: false, hich: false, bannerUsed: false, shroudRound: 0,
    stats: { dmg: 0, played: 0, bought: 0, kills: 0 } };
}
function newGame(o) {
  const S = { v: 2, seed: o.seed >>> 0, rs: o.seed >>> 0, nextUid: 1, seq: 1, players: [], turn: 0, round: 1, plays: 0, flags: {}, mod: {}, event: null, eventNext: null, eventDeck: [], mercs: [], market: [], log: [], moves: [], winner: null, started: false };
  S.duel = o.civs.length === 2;
  S.players = o.civs.map((c, i) => newPlayer(S, c, i, o.ai ? o.ai[i] : i > 0));
  S.mercs = buildMercs(S);
  S.market = [0, 1, 2].map(() => S.mercs.pop() || null);
  S.eventDeck = shuffled(S, EVENTS.map(e => e.id));
  S.eventNext = drawEvent(S);
  for (const P of S.players) { draw(S, P, START_HAND + (P.id > 0 ? 1 : 0), true); P.relicOffer = shuffled(S, RELIC_IDS).slice(0, 3); }
  return S;
}
function drawEvent(S) { if (!S.eventDeck.length) S.eventDeck = shuffled(S, EVENTS.map(e => e.id)); return S.eventDeck.pop(); }
function chooseRelic(S, pid, id) {
  const P = S.players[pid];
  if (P.relic || !P.relicOffer.includes(id)) return false;
  P.relic = id;
  if (id === 'jade') { P.maxHP += 2; P.hp += 2; }
  if (id === 'seal') P.gold += 1;
  return true;
}
function startGame(S) { S.started = true; S.turn = 0; beginTurn(S, true); }

/* ── the table ── */
const cur = S => S.players[S.turn];
const opponents = (S, P) => S.players.filter(X => X.alive && X.id !== P.id);
const walls = X => X.structs.filter(s => !s.wonder);
const wallTotal = X => walls(X).reduce((a, s) => a + s.dur, 0);
const structTotal = X => X.structs.reduce((a, s) => a + s.dur, 0);
const wonderOf = X => X.structs.find(s => s.wonder);
const guardCount = X => X.guards.bodyguard + X.guards.camel + X.guards.mantlet;
/* hits reach the weakest structure first; a wonder always stands behind the rest */
function frontOrder(X) { return X.structs.slice().sort((a, b) => (a.wonder - b.wonder) || (a.dur - b.dur) || (a.seq - b.seq)); }
function biggest(X) { return X.structs.slice().sort((a, b) => (b.dur - a.dur) || (b.wonder - a.wonder) || (a.seq - b.seq))[0]; }
function log(S, k, x) { if (S.quiet) return; S.log.push({ k, round: S.round, ...x }); if (S.log.length > 400) S.log.splice(0, 100); }
function draw(S, P, n, quiet) {
  if (S.virtual) { P.vdraw = (P.vdraw || 0) + n; return n; }
  let got = 0;
  for (let k = 0; k < n; k++) {
    if (!P.deck.length) {
      if (!P.discard.length) break;
      P.deck = shuffled(S, P.discard); P.discard = [];
      if (!quiet) { log(S, 'fatigue', { pid: P.id }); loseHP(S, P, 1, null, null, true); if (!P.alive) return got; }
    }
    if (!P.deck.length) break;   /* the exhaustion above can make the low-HP draw empty the fresh deck */
    P.hand.push(P.deck.pop()); got++;
  }
  return got;
}
function heal(S, P, n) { const before = P.hp; P.hp = Math.min(P.maxHP, P.hp + n); return P.hp - before; }
function loseHP(S, X, n, ev, by, quiet) {
  if (n <= 0 || !X.alive) return;
  X.hp -= n;
  if (ev) ev.fx.push({ k: 'hp', t: X.id, n: -n });
  if (by && by !== X) by.stats.dmg += n;
  if (X.hp <= 0) {
    if (X.relic === 'banner' && !X.bannerUsed) { X.bannerUsed = true; X.hp = 3; log(S, 'banner', { pid: X.id }); if (ev) ev.fx.push({ k: 'banner', t: X.id }); }
    else {
      X.alive = false; X.hp = 0;
      if (!S.virtual) for (const st of X.structs) X.discard.push(st.card);
      X.structs = []; if (by && by !== X) by.stats.kills++;
      log(S, 'out', { pid: X.id, by: by ? by.id : null }); if (ev) ev.fx.push({ k: 'out', t: X.id });
    }
  }
  if (X.alive && X.hp <= 3 && !X.hich) { X.hich = true; draw(S, X, 2, true); log(S, 'hich', { pid: X.id }); if (ev) ev.fx.push({ k: 'hich', t: X.id }); }
}
function destroyStruct(S, X, st, ev) {
  X.structs = X.structs.filter(s => s !== st);
  if (!S.virtual) X.discard.push(st.card);
  if (ev) ev.fx.push({ k: 'razed', t: X.id, name: st.card.name, wonder: st.wonder });
}
function takeRandom(S, X) { const loose = X.hand.filter(c => !c.bound); if (!loose.length) return null; const c = loose[Math.floor(rnd(S) * loose.length)]; X.hand.splice(X.hand.indexOf(c), 1); return c; }
const looseCount = X => X.hand.filter(c => !c.bound).length - (X.vlost || 0);

/* ── one hit: Storm, then the matching guard, then damage into the front structure (or HP), then a Trap ── */
function hit(S, A, X, h, ev) {
  if (!X || !X.alive || !A.alive) return 'none';
  if (h.open && X.structs.length) { ev.fx.push({ k: 'miss', t: X.id, why: 'flank' }); return 'miss'; }
  if (X.traps.storm) { ev.fx.push({ k: 'storm', t: X.id }); return 'cancel'; }
  const g = GUARD_OF[h.kind];
  if (g && X.guards[g] > 0) { X.guards[g]--; ev.fx.push({ k: 'block', t: X.id, guard: g }); return 'blocked'; }
  let n = h.dmg + (h.bonusOpen && !X.structs.length ? 1 : 0);
  if (h.kind === 'strike' && S.mod.crusade) n++;
  if (A.relic === 'joyeuse' && !S.flags.joy) { n++; S.flags.joy = true; }
  if (A.relic === 'horn' && A.hp <= 4) n++;
  if (X.relic === 'shroud' && X.shroudRound !== S.round) { X.shroudRound = S.round; n--; ev.fx.push({ k: 'shroud', t: X.id }); }
  const trap = X.traps.trap > 0; if (trap) X.traps.trap--;
  if (n > 0) {
    const front = !h.direct && frontOrder(X)[0];
    if (front) { front.dur -= 1; ev.fx.push({ k: 'struct', t: X.id, n: 1, name: front.card.name, left: Math.max(0, front.dur), wonder: front.wonder }); if (front.dur <= 0) destroyStruct(S, X, front, ev); }
    else loseHP(S, X, n, ev, A);
  }
  if (trap && A.alive) { ev.fx.push({ k: 'trap', t: A.id, by: X.id }); loseHP(S, A, 1, ev, X); }
  return 'hit';
}
/* siege: a structure loses 2 durability; it never reaches HP */
function siege(S, A, X, mode, ev) {
  if (!X || !X.alive) return;
  if (X.traps.storm) { ev.fx.push({ k: 'storm', t: X.id }); return; }
  const st = mode === 'front' ? frontOrder(X)[0] : biggest(X);
  if (!st) { ev.fx.push({ k: 'miss', t: X.id, why: 'siege' }); return; }
  st.dur -= 2;
  ev.fx.push({ k: 'struct', t: X.id, n: 2, name: st.card.name, left: Math.max(0, st.dur), wonder: st.wonder, siege: 1 });
  if (st.dur <= 0) destroyStruct(S, X, st, ev);
}
/* kill 1 random guard; a Snipe (traps) can take out a set Trap the same way, one token among all of them */
function killGuard(S, X, ev, quiet, traps) {
  const pool = { bodyguard: X.guards.bodyguard, camel: X.guards.camel, mantlet: X.guards.mantlet, trap: traps ? X.traps.trap : 0 };
  const kinds = Object.keys(pool).filter(g => pool[g] > 0);
  if (!kinds.length) { if (!quiet) ev.fx.push({ k: 'miss', t: X.id, why: traps ? 'snipe' : 'guard' }); return false; }
  let g;
  if (S.virtual) g = kinds.sort((a, b) => pool[b] - pool[a])[0];
  else { let r = Math.floor(rnd(S) * kinds.reduce((a, k) => a + pool[k], 0)); for (const k of kinds) { if (r < pool[k]) { g = k; break; } r -= pool[k]; } }
  if (g === 'trap') X.traps.trap--; else X.guards[g]--;
  ev.fx.push({ k: 'snipe', t: X.id, guard: g });
  return true;
}
function stealCard(S, A, X, ev, how) {
  if (!X || !X.alive || looseCount(X) <= 0) return;
  if (S.virtual) { X.vlost = (X.vlost || 0) + 1; A.vgain = (A.vgain || 0) + 1; if (how === 'monk') A.vpick = (A.vpick || 0) + 1; return; }
  let c = null;
  if (how === 'monk') {
    const loose = X.hand.filter(x => !x.bound);
    c = (ev.pick != null && loose.find(x => x.uid === ev.pick)) || (typeof aiPickCard === 'function' ? aiPickCard(S, A, X) : loose[0]);
    if (c) X.hand.splice(X.hand.indexOf(c), 1);
  } else c = takeRandom(S, X);
  if (!c) return;
  A.hand.push(c);
  ev.fx.push({ k: how === 'monk' ? 'monk' : 'steal', t: X.id, by: A.id, card: c });
}
function resolveSym(S, A, ch, T, ev) {
  if (!A.alive) return;
  const sym = SYM[ch];
  switch (ch) {
    case 'A': case 'X': case 'Y': case 'B': case 'O': case 'K': hit(S, A, T, sym.hit, ev); return;
    case 'L': hit(S, A, T, sym.hit, ev); A.guards.camel++; ev.fx.push({ k: 'guard', t: A.id, guard: 'camel' }); return;
    case 'E': if (!T || !T.alive) return; if (T.traps.storm) { ev.fx.push({ k: 'storm', t: T.id }); return; } killGuard(S, T, ev, true); hit(S, A, T, sym.hit, ev); return;
    case 'F': for (const X of opponents(S, A)) hit(S, A, X, sym.hit, ev); return;
    case 'N': if (hit(S, A, T, sym.hit, ev) === 'hit') stealCard(S, A, T, ev, 'steal'); return;
    case 'R': siege(S, A, T, 'front', ev); return;
    case 'P': siege(S, A, T, 'big', ev); return;
    case 'Z': if (!T || !T.alive) return; if (T.traps.storm) { ev.fx.push({ k: 'storm', t: T.id }); return; } killGuard(S, T, ev, false, true); return;
    case 'J':
      if (!T || !T.alive) return;
      if (T.traps.storm) { ev.fx.push({ k: 'storm', t: T.id }); return; }
      A.gold++; ev.fx.push({ k: 'gold', t: A.id, n: 1 });
      if (T.gold > 0) { T.gold--; ev.fx.push({ k: 'raid', t: T.id, by: A.id }); }
      return;
    case 'S': stealCard(S, A, T, ev, 'steal'); return;
    case 'C': stealCard(S, A, T, ev, 'monk'); return;
    case 'Q': case 'I': A.guards[sym.guard]++; ev.fx.push({ k: 'guard', t: A.id, guard: sym.guard }); return;
    case 'T': A.traps.trap++; ev.fx.push({ k: 'trapset', t: A.id }); return;
    case 'V': A.traps.storm = true; ev.fx.push({ k: 'stormset', t: A.id }); return;
    case 'H': { let n = 1; if (A.relic === 'grail' && !S.flags.grail) { n++; S.flags.grail = true; } const h = heal(S, A, n); if (h) ev.fx.push({ k: 'hp', t: A.id, n: h }); return; }
    case 'D': draw(S, A, 1); return;
    case 'G': A.gold++; ev.fx.push({ k: 'gold', t: A.id, n: 1 }); return;
    case 'M': S.plays++; return;
  }
}
/* opt.pick: the card a Monk takes (the player chose it from the target's hand) */
function playCard(S, pid, uid, tid, opt = {}) {
  if (S.winner != null || S.turn !== pid || S.plays <= 0) return null;
  const A = S.players[pid], i = A.hand.findIndex(c => c.uid === uid);
  if (i < 0) return null;
  const card = A.hand.splice(i, 1)[0];
  let T = tid != null ? S.players[tid] : null;
  if (needsTarget(card) && (!T || !T.alive || T === A)) { const o = opponents(S, A); T = o.length ? o[0] : null; }
  if (!needsTarget(card)) T = null;
  S.plays--; A.stats.played++;
  const ev = { k: 'play', pid, card, target: T ? T.id : null, fx: [], pick: opt.pick };
  if (card.age) ageUp(S, A, ev);
  for (const ch of card.icons) { if (S.winner != null) break; resolveSym(S, A, ch, T, ev); }
  const w = count(card.icons, 'W'), u = count(card.icons, 'U');
  if (A.alive && w > 0) {
    if (S.mod.monsoon) { if (!S.virtual) A.discard.push(card); ev.fx.push({ k: 'rained', t: A.id }); }
    else { const dur = w + (A.relic === 'scone' ? 1 : 0); A.structs.push({ card, dur, max: dur, wonder: u > 0, cd: u, seq: S.seq++ }); ev.fx.push({ k: 'built', t: A.id, name: card.name, wonder: u > 0 }); }
  } else if (!card.age && !S.virtual) A.discard.push(card);
  delete ev.pick;
  log(S, 'play', { pid, card: card.name, target: ev.target });
  checkWinner(S);
  return ev;
}
function marketCost(S, P, card) {
  if (!card) return 99;
  return Math.max(1, card.cost - (S.mod.fair ? 1 : 0) - (P.relic === 'seal' ? 1 : 0));
}
function buy(S, pid, idx) {
  const P = S.players[pid], card = S.market[idx];
  if (S.turn !== pid || S.flags.bought || !card || S.winner != null) return false;
  const cost = marketCost(S, P, card);
  if (P.gold < cost) return false;
  P.gold -= cost; S.flags.bought = true; P.stats.bought++;
  P.hand.push(card);
  S.market[idx] = S.mercs.pop() || null;
  log(S, 'buy', { pid, card: card.name, cost });
  return true;
}
function checkWinner(S) {
  const alive = S.players.filter(p => p.alive);
  if (alive.length === 1) S.winner = alive[0].id;
  else if (!alive.length) S.winner = -1;
}
function beginTurn(S, first) {
  const P = cur(S);
  P.traps.trap = 0; P.traps.storm = false;   /* Traps and Storm last until their owner's next turn */
  S.plays = 1; S.flags = {};
  for (const st of P.structs.slice()) if (st.wonder) { st.cd--; if (st.cd <= 0) { S.winner = P.id; S.wonderWin = true; log(S, 'wonder', { pid: P.id, name: st.card.name }); return; } }
  if (P.relic === 'mint') P.gold++;
  if (!first) draw(S, P, P.hand.length ? 1 : 2);
  if (P.relic === 'compass' && P.hand.length <= 1) draw(S, P, 1);
  P.turns++;
  if (!P.ageGiven && P.turns >= RULES.ageTurn) { P.ageGiven = true; P.hand.push(makeAgeCard(S, P)); log(S, 'agecard', { pid: P.id }); }
  checkWinner(S);
}
function endTurn(S) {
  if (S.winner != null) return;
  const n = S.players.length;
  let i = S.turn, wrapped = false;
  do { i = (i + 1) % n; if (i === 0) wrapped = true; } while (!S.players[i].alive);
  S.turn = i;
  if (wrapped) { S.round++; startRound(S); if (S.winner != null) return; }
  if (S.round > RULES.maxRound) { const alive = S.players.filter(p => p.alive).sort((a, b) => b.hp - a.hp); S.winner = alive[0].id; S.timeUp = true; return; }
  if (!S.players[S.turn].alive) { endTurn(S); return; }
  beginTurn(S, false);
}
function startRound(S) {
  S.mod = {}; S.moves = [];   /* cards the round's event moved, for the table to show */
  S.event = S.eventNext; S.eventNext = drawEvent(S);
  const alive = S.players.filter(p => p.alive), ev = { k: 'event', fx: [] };
  if (S.round >= RULES.attritionRound) { for (const P of alive) loseHP(S, P, 1, ev, null); log(S, 'attrition', {}); checkWinner(S); if (S.winner != null) return; }
  switch (S.event) {
    case 'plague': for (const P of alive) loseHP(S, P, 1, ev, null); break;
    case 'harvest': for (const P of alive) heal(S, P, 1); break;
    case 'silkroad': for (const P of alive) P.gold++; break;
    case 'winter': for (const P of alive) for (const w of walls(P)) { w.dur--; if (w.dur <= 0) destroyStruct(S, P, w, ev); } break;
    case 'fair': for (let k = 0; k < 3; k++) { if (S.market[k]) S.mercs.unshift(S.market[k]); S.market[k] = S.mercs.pop() || null; } S.mod.fair = true; break;
    case 'feast': for (const P of alive) draw(S, P, 1); break;
    case 'revolt': { const top = Math.max(...alive.map(p => p.hp)); for (const P of alive) if (P.hp === top) loseHP(S, P, 1, ev, null); break; }
    case 'crusade': S.mod.crusade = true; break;
    case 'monsoon': S.mod.monsoon = true; break;
    case 'flood': for (const P of alive) { const c = takeRandom(S, P); if (c) { P.discard.push(c); S.moves.push({ k: 'discard', t: P.id, card: c }); } } break;
    case 'eclipse': { const gifts = alive.map(P => takeRandom(S, P)); alive.forEach((P, k) => { const g = gifts[(k - 1 + alive.length) % alive.length]; if (g) P.hand.push(g); if (gifts[k]) S.moves.push({ k: 'pass', t: P.id, to: alive[(k + 1) % alive.length].id, card: gifts[k] }); }); break; }
    case 'bells': { const low = Math.min(...alive.map(p => p.hp)); for (const P of alive) if (P.hp === low) heal(S, P, 2); break; }
  }
  log(S, 'event', { id: S.event });
  checkWinner(S);
}

/* ── the Imperial Age: one card at the start of your RULES.ageTurn-th turn. Playing it uses your play: your Imperial units are
   shuffled into your deck and the card's own symbols resolve. It can't be stolen, discarded or passed. ── */
function ageText(civ) { const C = CIVS[civ], n = imperialSize(civ); return `Advance to the Imperial Age: ${n} Imperial cards join your deck. ${iconText(C.ageIcons)}`.trim(); }
function makeAgeCard(S, P) { return makeCard(S, { name: 'Imperial Age', icons: CIVS[P.civ].ageIcons, civ: P.civ, age: true, bound: true }); }
function ageUp(S, A, ev) {
  if (A.aged) return;
  A.aged = true; A.agedRound = S.round;
  const cards = imperialCards(S, A.civ);
  if (S.virtual) A.deck = A.deck.concat(cards);
  else for (const c of cards) A.deck.splice(Math.floor(rnd(S) * (A.deck.length + 1)), 0, c);
  ev.fx.push({ k: 'age', t: A.id });
  log(S, 'aged', { pid: A.id });
}

/* ── a light copy for the AI and the previews: cards are shared, everything that can change is copied ── */
function liteCopy(S) {
  const C = Object.assign({}, S);
  C.players = S.players.map(P => ({ ...P, hand: P.hand.slice(), deck: P.deck.slice(), discard: P.discard.slice(), structs: P.structs.map(st => ({ ...st })), guards: { ...P.guards }, traps: { ...P.traps }, stats: { ...P.stats }, vdraw: 0, vgain: 0, vlost: 0, vpick: 0 }));
  C.flags = { ...S.flags }; C.mod = { ...S.mod }; C.market = S.market.slice(); C.log = []; C.moves = []; C.quiet = true; C.virtual = true;
  return C;
}
/* what playing a card would change for each player (cards drawn or stolen are counted, never shown) */
function previewPlay(S, pid, uid, tid) {
  const C = liteCopy(S);
  const snap = p => ({ hp: p.hp, walls: wallTotal(p), wonder: (wonderOf(p) || { dur: 0 }).dur, gold: p.gold, hand: p.hand.length + (p.vgain || 0) - (p.vlost || 0) + (p.vdraw || 0), guards: guardCount(p), traps: p.traps.trap + (p.traps.storm ? 1 : 0), alive: p.alive });
  const before = C.players.map(snap);
  const ev = playCard(C, pid, uid, tid);
  if (!ev) return null;
  return { target: ev.target, players: C.players.map((p, i) => { const a = snap(p), b = before[i]; return { hp: a.hp - b.hp, walls: a.walls - b.walls, wonder: a.wonder - b.wonder, gold: a.gold - b.gold, hand: a.hand - b.hand, guards: a.guards - b.guards, traps: a.traps - b.traps, dies: b.alive && !a.alive }; }) };
}
