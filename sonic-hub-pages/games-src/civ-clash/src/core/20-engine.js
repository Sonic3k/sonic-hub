/* ── Engine: draw 1, play 1; symbols do the rest ── */
function cardFromIcons(icons) {
  const steps = []; let wall = 0;
  for (const ch of icons) { if (ch === 'W') wall++; else for (const s of SYM[ch].steps) steps.push({ ...s }); }
  return { steps, wall };
}
function makeCard(S, base) { return { uid: S.nextUid++, ...base }; }
function buildDeck(S, civ) {
  const C = CIVS[civ], out = [];
  for (const tok of C.deck.split(/\s+/)) {
    if (tok[0] === '+') {
      const id = tok.slice(1), U = UNIQUE[id];
      const fromIcons = U.steps ? { steps: U.steps.map(s => ({ ...s })), wall: U.wall || 0 } : { steps: [], wall: U.wall || 0 };
      out.push(makeCard(S, { name: U.name, icons: U.icons, text: U.text, civ, unique: id, steps: fromIcons.steps, wall: fromIcons.wall, kind: U.kind || (U.wonder ? 'wonder' : null), wonder: !!U.wonder }));
    } else {
      const m = tok.match(/^([A-Z]+)(\d+)$/);
      for (let k = 0; k < +m[2]; k++) { const c = cardFromIcons(m[1]); out.push(makeCard(S, { name: COMMON_NAMES[m[1]] || SYM[m[1][0]].name, icons: m[1], civ, steps: c.steps, wall: c.wall })); }
    }
  }
  return out;
}
function buildMercs(S) {
  const out = [];
  for (const M of MERCS) for (let k = 0; k < M.n; k++) {
    const c = M.steps ? { steps: M.steps.map(s => ({ ...s })), wall: (M.icons.match(/W/g) || []).length } : cardFromIcons(M.icons);
    out.push(makeCard(S, { name: M.name, icons: M.icons, text: M.text, civ: 'merc', merc: M.id, cost: M.cost, steps: c.steps, wall: c.wall }));
  }
  return shuffled(S, out);
}
function newPlayer(S, civ, id, ai) {
  const hp = S.duel ? CIVS[civ].hp2 : CIVS[civ].hp4;
  return { id, civ, ai: !!ai, hp, maxHP: hp, deck: shuffled(S, buildDeck(S, civ)), hand: [], discard: [], structs: [], gold: 0, relic: null, relicOffer: null,
    tokens: { camel: 0, immune: false, trap: false }, alive: true, turns: 0, aged: false, ageGiven: false, hich: false, bannerUsed: false, shroudRound: 0, stats: { dmg: 0, played: 0, bought: 0, kills: 0 } };
}
function newGame(o) {
  const S = { v: 1, seed: o.seed >>> 0, rs: o.seed >>> 0, nextUid: 1, players: [], turn: 0, round: 1, plays: 0, flags: {}, mod: {}, event: null, eventNext: null, eventDeck: [], mercs: [], market: [], log: [], winner: null, started: false };
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
const EVENT_BY = Object.fromEntries(EVENTS.map(e => [e.id, e]));
function chooseRelic(S, pid, id) {
  const P = S.players[pid];
  if (P.relic || !P.relicOffer.includes(id)) return false;
  P.relic = id;
  if (id === 'jade') { P.maxHP += 2; P.hp += 2; }
  if (id === 'seal') P.gold += 1;
  return true;
}
function startGame(S) { S.started = true; S.turn = 0; beginTurn(S, true); }

/* ── helpers ── */
const cur = S => S.players[S.turn];
const opponents = (S, P) => S.players.filter(X => X.alive && X.id !== P.id);
const walls = X => X.structs.filter(s => s.kind !== 'wonder');
const wallTotal = X => walls(X).reduce((a, s) => a + s.dur, 0);
const hasWalls = X => walls(X).length > 0;
const wonderOf = X => X.structs.find(s => s.kind === 'wonder');
function log(S, k, x) { if (S.quiet) return; S.log.push({ k, round: S.round, ...x }); if (S.log.length > 400) S.log.splice(0, 100); }
function draw(S, P, n, quiet) {
  let got = 0;
  for (let k = 0; k < n; k++) {
    if (!P.deck.length) {
      if (!P.discard.length) break;
      P.deck = shuffled(S, P.discard); P.discard = [];
      if (!quiet) { log(S, 'fatigue', { pid: P.id }); loseHP(S, P, 1, null, null, true); if (!P.alive) return got; }
    }
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
    else { X.alive = false; X.hp = 0; for (const st of X.structs) X.discard.push(st.card); X.structs = []; if (by && by !== X) by.stats.kills++; log(S, 'out', { pid: X.id, by: by ? by.id : null }); if (ev) ev.fx.push({ k: 'out', t: X.id }); }
  }
  if (X.alive && X.hp <= 3 && !X.hich) { X.hich = true; draw(S, X, 2, true); log(S, 'hich', { pid: X.id }); if (ev) ev.fx.push({ k: 'hich', t: X.id }); }
}
function destroyStruct(S, X, st, ev) {
  X.structs = X.structs.filter(s => s !== st);
  X.discard.push(st.card);
  if (ev) ev.fx.push({ k: 'razed', t: X.id, name: st.card.name });
}
function dealDamage(S, A, X, n, opt, ev) {
  if (!X || !X.alive || n <= 0) return;
  if (X.tokens.immune) { ev.fx.push({ k: 'immune', t: X.id }); return; }
  if (opt.cav && X.tokens.camel > 0) { X.tokens.camel--; ev.fx.push({ k: 'camel', t: X.id }); return; }
  if (X.relic === 'shroud' && X.shroudRound !== S.round) { X.shroudRound = S.round; n -= 1; ev.fx.push({ k: 'shroud', t: X.id }); if (n <= 0) return; }
  const trap = X.tokens.trap; if (trap) X.tokens.trap = false;
  let left = n, thorns = false;
  const W = wonderOf(X);
  if (!opt.pierce && W) { const hit = Math.min(W.dur, left); W.dur -= hit; left -= hit; ev.fx.push({ k: 'wonderhit', t: X.id, left: W.dur }); if (W.dur <= 0) destroyStruct(S, X, W, ev); }
  if (!opt.pierce) {
    while (left > 0) {
      const ws = walls(X).sort((a, b) => a.dur - b.dur);
      if (!ws.length) break;
      const w = ws[0], hit = Math.min(w.dur, left);
      w.dur -= hit; left -= hit;
      if (w.kind === 'thorns') thorns = true;
      ev.fx.push({ k: 'wall', t: X.id, n: hit });
      if (w.dur <= 0) destroyStruct(S, X, w, ev);
    }
  }
  if (left > 0) loseHP(S, X, left, ev, A);
  if (thorns && A.alive) { ev.fx.push({ k: 'thorns', t: A.id }); loseHP(S, A, 1, ev, X); }
  if (trap && A.alive) { ev.fx.push({ k: 'trap', t: A.id }); loseHP(S, A, 2, ev, X); }
}
function razeOne(S, A, T, ev) {
  if (!T || !T.alive) return;
  const W = wonderOf(T);
  if (W) { W.dur -= 2; ev.fx.push({ k: 'wonderhit', t: T.id, left: Math.max(0, W.dur) }); if (W.dur <= 0) destroyStruct(S, T, W, ev); return; }
  const ws = walls(T).sort((a, b) => b.dur - a.dur);
  if (!ws.length) return;
  const w = ws[0];
  if (w.kind === 'fortress' && w.dur > 1) { w.dur--; ev.fx.push({ k: 'wall', t: T.id, n: 1 }); return; }
  destroyStruct(S, T, w, ev);
}

/* ── playing ── */
const stepNeedsTarget = s => (s.dmg && !s.all) || s.raze || (s.steal && !s.all) || s.convert;
const needsTarget = card => card.steps.some(stepNeedsTarget);
function resolveStep(S, A, s, T, ev) {
  if (!A.alive) return;
  if (s.dmg) {
    const xs = s.all ? opponents(S, A) : s.others ? opponents(S, A).filter(X => X !== T) : (T && T.alive ? [T] : []);
    for (const X of xs) {
      let n = s.dmg;
      if (s.basic && S.mod.crusade) n++;
      if ((s.samurai || s.eagle) && !hasWalls(X)) n++;
      if (A.relic === 'joyeuse' && !S.flags.joy) { n++; S.flags.joy = true; }
      if (A.relic === 'horn' && A.hp <= 4) n++;
      dealDamage(S, A, X, n, { pierce: !!s.pierce, cav: !!s.cav }, ev);
    }
  }
  if (s.heal) { let n = s.heal; if (A.relic === 'grail' && !S.flags.grail) { n++; S.flags.grail = true; } const h = heal(S, A, n); if (h) ev.fx.push({ k: 'hp', t: A.id, n: h }); }
  if (s.plays) S.plays += s.plays;
  if (s.draw) draw(S, A, s.draw);
  if (s.gold) { A.gold += s.gold; ev.fx.push({ k: 'gold', t: A.id, n: s.gold }); }
  if (s.raze) for (let k = 0; k < s.raze; k++) { if (!T || (!T.structs.length)) break; razeOne(S, A, T, ev); }
  if (s.steal) for (const X of (s.all ? opponents(S, A) : T ? [T] : [])) for (let k = 0; k < s.steal; k++) { const c = takeRandom(S, X); if (!c) break; A.hand.push(c); ev.fx.push({ k: 'steal', t: X.id, by: A.id }); }
  if (s.convert && T) { const ws = walls(T).sort((a, b) => b.dur - a.dur); if (ws.length) { const w = ws[0]; T.structs = T.structs.filter(x => x !== w); A.structs.push(w); ev.fx.push({ k: 'convert', t: T.id, by: A.id, name: w.card.name }); } }
  if (s.token === 'camel') A.tokens.camel++;
  if (s.token === 'immune') A.tokens.immune = true;
  if (s.token === 'trap') A.tokens.trap = true;
  if (s.self) loseHP(S, A, s.self, ev, null);
  if (s.discard) for (const X of opponents(S, A)) { const c = takeRandom(S, X); if (c) { X.discard.push(c); ev.fx.push({ k: 'discard', t: X.id }); } }
  if (s.tribute) for (const X of opponents(S, A)) if (X.gold > 0) { X.gold--; A.gold++; ev.fx.push({ k: 'gold', t: A.id, n: 1 }); ev.fx.push({ k: 'tribute', t: X.id }); }
  if (s.ageup) ageUp(S, A, ev);
  if (s.buyFree) S.flags.buyFree = true;
  if (s.fortify) for (const w of walls(A)) w.dur += s.fortify;
}
function playCard(S, pid, uid, tid) {
  if (S.winner != null || S.turn !== pid || S.plays <= 0) return null;
  const A = S.players[pid], i = A.hand.findIndex(c => c.uid === uid);
  if (i < 0) return null;
  const card = A.hand.splice(i, 1)[0];
  let T = tid != null ? S.players[tid] : null;
  if (needsTarget(card) && (!T || !T.alive || T === A)) { const o = opponents(S, A); T = o.length ? o[0] : null; }
  S.plays--; A.stats.played++;
  const ev = { k: 'play', pid, card, target: T ? T.id : null, fx: [] };
  for (const s of card.steps) resolveStep(S, A, s, T, ev);
  if (A.alive && (card.wall > 0 || card.wonder)) {
    if (S.mod.monsoon) { A.discard.push(card); ev.fx.push({ k: 'rained', t: A.id }); }
    else if (card.wonder) { const dur = 3 + opponents(S, A).length; A.structs.push({ card, kind: 'wonder', dur, cap: dur, age: 0 }); }
    else { const dur = card.wall + (A.relic === 'scone' ? 1 : 0); A.structs.push({ card, kind: card.kind || 'wall', dur, cap: dur + 1 }); }
  } else if (!card.age) A.discard.push(card);
  log(S, 'play', { pid, card: card.name, target: ev.target, fx: ev.fx.slice(0, 12) });
  checkWinner(S);
  return ev;
}
function marketCost(S, P, card) {
  if (!card) return 99;
  if (S.flags.buyFree) return 0;
  let c = card.cost - (S.mod.fair ? 1 : 0) - (P.relic === 'seal' ? 1 : 0);
  return Math.max(1, c);
}
function buy(S, pid, idx) {
  const P = S.players[pid], card = S.market[idx];
  if (S.turn !== pid || S.flags.bought || !card || S.winner != null) return false;
  const cost = marketCost(S, P, card);
  if (P.gold < cost) return false;
  P.gold -= cost; S.flags.bought = true; S.flags.buyFree = false; P.stats.bought++;
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
  P.tokens.immune = false; P.tokens.trap = false;
  S.plays = 1; S.flags = {};
  for (const st of P.structs.slice()) {
    if (st.kind === 'wonder') { st.age++; if (st.age >= 3) { S.winner = P.id; S.wonderWin = true; log(S, 'wonder', { pid: P.id, name: st.card.name }); return; } }
    if (st.kind === 'regen' && st.dur < st.cap) st.dur++;
    if (st.kind === 'sacred') heal(S, P, 1);
    if (st.kind === 'income') P.gold++;
  }
  if (P.relic === 'mint') P.gold++;
  if (!first) draw(S, P, P.hand.length ? 1 : 2);
  if (P.relic === 'compass' && P.hand.length <= 1) draw(S, P, 1);
  P.turns++;
  if (!P.ageGiven && P.turns >= RULES.ageTurn && IMPERIAL[P.civ]) { P.ageGiven = true; P.hand.push(makeAgeCard(S, P)); log(S, 'agecard', { pid: P.id }); }
  checkWinner(S);
}
function endTurn(S) {
  if (S.winner != null) return;
  const n = S.players.length;
  let i = S.turn, wrapped = false;
  do { i = (i + 1) % n; if (i === 0) wrapped = true; } while (!S.players[i].alive);
  S.turn = i;
  if (wrapped) { S.round++; startRound(S); if (S.winner != null) return; }
  if (S.round > 40) { const alive = S.players.filter(p => p.alive).sort((a, b) => b.hp - a.hp); S.winner = alive[0].id; S.timeUp = true; return; }
  if (!S.players[S.turn].alive) { endTurn(S); return; }
  beginTurn(S, false);
}
function startRound(S) {
  S.mod = {};
  S.event = S.eventNext; S.eventNext = drawEvent(S);
  const alive = S.players.filter(p => p.alive), ev = { k: 'event', fx: [] };
  if (S.round >= 16) { for (const P of alive) loseHP(S, P, 1, ev, null); log(S, 'attrition', {}); checkWinner(S); if (S.winner != null) return; }
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
    case 'flood': for (const P of alive) { const c = takeRandom(S, P); if (c) P.discard.push(c); } break;
    case 'eclipse': { const gifts = alive.map(P => takeRandom(S, P)); alive.forEach((P, k) => { const g = gifts[(k - 1 + alive.length) % alive.length]; if (g) P.hand.push(g); }); break; }
    case 'bells': { const low = Math.min(...alive.map(p => p.hp)); for (const P of alive) if (P.hp === low) heal(S, P, 2); break; }
  }
  log(S, 'event', { id: S.event, fx: ev.fx });
  checkWinner(S);
}
/* readable text for any card */
const SYM_TXT = {
  A: n => `Deal ${n} damage.`, H: n => `Heal ${n} HP.`, M: n => (n === 1 ? 'Play another card.' : `Play ${n} more cards.`), D: n => (n === 1 ? 'Draw 1 card.' : `Draw ${n} cards.`), G: n => `Gain ${n} gold.`,
  R: n => (n === 1 ? "Destroy the opponent's biggest structure." : `Destroy ${n} of the opponent's structures.`), S: n => (n === 1 ? 'Steal 1 random card from an opponent.' : `Steal ${n} random cards from an opponent.`),
  C: () => "Convert the opponent's biggest structure to your side.", K: n => `Cavalry: deal ${2 * n} damage (camels block it).`,
  E: n => (n === 1 ? 'Elephant: destroy a structure, then deal 1 damage.' : `Elephants: destroy ${n} structures and deal ${n} damage.`),
  L: n => `Deal ${n} damage and set up a camel guard: the next cavalry attack on you is cancelled.`, B: n => `Deal ${n} damage over the walls.`,
  F: n => (n === 1 ? 'Deal 1 damage to every opponent.' : `Deal 1 damage to every opponent, ${n} times.`),
  Y: n => (n === 1 ? 'Deal 1 damage, or 2 damage if the opponent has no walls.' : `Deal ${n} damage, 1 extra damage per hit if the opponent has no walls.`),
  N: n => `Raid: steal ${n} card${n > 1 ? 's' : ''}, then deal ${n} damage.`,
};
function cardText(card) {
  if (card.text) return card.text;
  const cnt = {};
  for (const ch of card.icons) cnt[ch] = (cnt[ch] || 0) + 1;
  const parts = Object.keys(cnt).filter(ch => ch !== 'W').map(ch => SYM_TXT[ch](cnt[ch]));
  if (cnt.W) parts.push(`Stays in play as a structure with ${cnt.W} durability.`);
  return parts.join(' ');
}

/* ── Imperial Age ── */
function takeRandom(S, X) { const loose = X.hand.filter(c => !c.bound); if (!loose.length) return null; const c = loose[Math.floor(rnd(S) * loose.length)]; X.hand.splice(X.hand.indexOf(c), 1); return c; }
function imperialCards(S, civ) {
  return IMPERIAL[civ].cards.map(d => {
    const c = d.steps ? { steps: d.steps.map(s => ({ ...s })), wall: d.wall || 0 } : cardFromIcons(d.icons);
    return makeCard(S, { name: d.name, icons: d.icons, text: d.text, civ, imperial: true, steps: c.steps, wall: d.wall != null ? d.wall : c.wall, kind: d.kind || null });
  });
}
function ageText(civ) { const I = IMPERIAL[civ]; return `Advance to the Imperial Age: your ${I.cards.length} Imperial cards join your deck. ${I.bonus.text}`; }
function makeAgeCard(S, P) { return makeCard(S, { name: 'Imperial Age', icons: '', civ: P.civ, age: true, bound: true, steps: [{ ageup: 1 }], wall: 0, text: ageText(P.civ) }); }
function ageUp(S, A, ev) {
  if (A.aged) return;
  A.aged = true; A.agedRound = S.round;
  const I = IMPERIAL[A.civ];
  imperialCards(S, A.civ).forEach((c, i) => { if (I.bonus.fetch === i) A.hand.push(c); else A.deck.splice(Math.floor(rnd(S) * (A.deck.length + 1)), 0, c); });
  ev.fx.push({ k: 'age', t: A.id });
  for (const s of I.bonus.steps || []) resolveStep(S, A, { ...s }, null, ev);
  log(S, 'aged', { pid: A.id });
}

/* ── Preview: play the card on a copy of the match and report what would change for each player ── */
function previewPlay(S, pid, uid, tid) {
  const C = structuredClone(S); C.quiet = true;
  const snap = p => ({ hp: p.hp, walls: wallTotal(p), wonder: (wonderOf(p) || { dur: 0 }).dur, gold: p.gold, hand: p.hand.length, alive: p.alive, structs: p.structs.length });
  const before = C.players.map(snap);
  const ev = playCard(C, pid, uid, tid);
  if (!ev) return null;
  return { target: ev.target, players: C.players.map((p, i) => { const a = snap(p), b = before[i]; return { hp: a.hp - b.hp, walls: a.walls - b.walls, wonder: a.wonder - b.wonder, gold: a.gold - b.gold, hand: a.hand - b.hand, structs: a.structs - b.structs, dies: b.alive && !a.alive }; }) };
}
