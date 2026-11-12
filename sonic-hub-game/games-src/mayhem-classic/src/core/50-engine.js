/* ── Engine: draw 1, play 1, and play again for every lightning ──
   A turn: draw a card, then play cards until you owe no more plays (you owe 1, plus 1 for every Play again symbol you use).
   Shield cards stay in front of whoever played them; everything else goes to its owner's discard pile once it has been used.
   Whenever a hand is empty its owner draws 2 at once; an empty deck is made again from the shuffled discard pile.
   S.virtual marks a light copy the AI and the previews play cards on: no card is drawn or stolen there (they are only counted),
   so nothing hidden is revealed. */
function makeCard(S, hero, d) { return { uid: S.nextUid++, hero, id: d.id, name: d.name, sym: d.sym || '', power: d.power || null, art: d.art || null }; }
function buildDeck(S, hero) { const out = []; for (const d of HEROES[hero].cards) for (let k = 0; k < d.n; k++) out.push(makeCard(S, hero, d)); return out; }
function newPlayer(S, hero, id, ai) {
  return { id, hero, ai: !!ai, skill: 'normal', hp: RULES.hp, maxHP: RULES.maxHP, deck: shuffled(S, buildDeck(S, hero)), hand: [], discard: [], shields: [],
    alive: true, disguised: false, turns: 0, stats: { dmg: 0, healed: 0, broke: 0, played: 0, kos: 0 } };
}
function newGame(o) {
  const S = { seed: o.seed >>> 0, rs: o.seed >>> 0, nextUid: 1, seq: 1, players: [], turn: 0, round: 1, turnNo: 0, plays: 0, pending: null, log: [], winner: null, started: false };
  S.players = o.heroes.map((h, i) => newPlayer(S, h, i, o.ai ? o.ai[i] : i > 0));
  for (const P of S.players) draw(S, P, RULES.startHand);
  S.first = o.first != null ? o.first : Math.floor(rnd(S) * S.players.length);
  return S;
}
function startGame(S) { S.started = true; S.turn = S.first; beginTurn(S); }

/* ── the table ── */
const cur = S => S.players[S.turn];
const opponents = (S, P) => S.players.filter(X => X.alive && X.id !== P.id);
/* Vanish: until its owner's next turn, nothing an opponent plays can touch them or their shields */
const immune = (S, P, X) => X.disguised && X.id !== P.id;
const shieldMax = sh => count(sh.card.sym, 'S');
const shieldLeft = sh => shieldMax(sh) - sh.dmg;
const shieldTotal = X => X.shields.reduce((a, sh) => a + shieldLeft(sh), 0);
function findShield(S, uid) { for (const X of S.players) { const sh = X.shields.find(s => s.card.uid === uid); if (sh) return { X, sh }; } return null; }
function log(S, k, x) { if (S.quiet || S.virtual) return; S.log.push({ k, round: S.round, ...x }); if (S.log.length > 400) S.log.splice(0, 100); }
function draw(S, P, n) {
  if (S.virtual) { P.vdraw = (P.vdraw || 0) + n; return n; }
  let got = 0;
  for (let k = 0; k < n; k++) {
    if (!P.deck.length) { if (!P.discard.length) break; P.deck = shuffled(S, P.discard); P.discard = []; log(S, 'reshuffle', { pid: P.id }); }
    P.hand.push(P.deck.pop()); got++;
  }
  return got;
}
const handCount = P => P.hand.length + (P.vdraw || 0);
function toDiscard(S, owner, card) { S.players[owner].discard.push(card); }
function heal(S, X, n, ev) {
  if (n <= 0 || !X.alive) return 0;
  const before = X.hp; X.hp = Math.min(X.maxHP, X.hp + n);
  const got = X.hp - before; X.stats.healed += got;
  ev.fx.push({ k: 'heal', t: X.id, n: got });
  return got;
}
function loseHP(S, X, n, ev, A) {
  if (n <= 0 || !X.alive) return;
  const before = X.hp; X.hp -= n;
  ev.fx.push({ k: 'hp', t: X.id, n: -n, by: A ? A.id : null });
  if (A && A !== X) A.stats.dmg += Math.min(n, before);
  if (X.hp <= 0) knockOut(S, X, ev, A);
}
function knockOut(S, X, ev, A) {
  X.alive = false; X.hp = 0; X.disguised = false;
  for (const sh of X.shields) toDiscard(S, sh.owner, sh.card);   /* a shield taken from someone goes back to its owner */
  X.shields = [];
  if (A && A !== X) A.stats.kos++;
  ev.fx.push({ k: 'out', t: X.id });
  log(S, 'out', { pid: X.id, by: A ? A.id : null });
}
function breakShield(S, X, sh, ev, A) {
  const i = X.shields.indexOf(sh); if (i < 0) return;
  X.shields.splice(i, 1);
  toDiscard(S, sh.owner, sh.card);
  if (A && A !== X) A.stats.broke++;
  ev.fx.push({ k: 'broken', t: X.id, uid: sh.card.uid, name: sh.card.name });
}
function hurtShield(S, X, sh, n, ev, A) {
  const take = Math.min(n, shieldLeft(sh));
  sh.dmg += take;
  ev.fx.push({ k: 'shield', t: X.id, uid: sh.card.uid, n: take, left: shieldLeft(sh), name: sh.card.name });
  if (shieldLeft(sh) <= 0) breakShield(S, X, sh, ev, A);
  return n - take;
}
/* damage: into the chosen shield first, then the other shields (the weakest first, so as many break as possible), then HP */
function damage(S, A, X, n, ev, firstShield) {
  if (n <= 0 || !X.alive) return;
  let left = n;
  if (firstShield != null) { const sh = X.shields.find(s => s.card.uid === firstShield); if (sh) left = hurtShield(S, X, sh, left, ev, A); }
  while (left > 0 && X.shields.length) {
    const sh = X.shields.slice().sort((a, b) => shieldLeft(a) - shieldLeft(b) || a.seq - b.seq)[0];
    left = hurtShield(S, X, sh, left, ev, A);
  }
  if (left > 0) loseHP(S, X, left, ev, A);
}
function discardHand(S, X) { for (const c of X.hand) X.discard.push(c); X.hand = []; X.vdraw = 0; }

/* ── choices: what a card asks for when it is played ── */
function aimOf(card) { return count(card.sym, 'A') ? 'attack' : card.power ? POWERS[card.power].aim : null; }
function choicesFor(S, P, card) {
  const aim = aimOf(card), opps = opponents(S, P).filter(X => !immune(S, P, X)), out = [];
  if (aim === 'attack') for (const X of opps) { out.push({ t: X.id }); if (X.shields.length > 1) for (const sh of X.shields) out.push({ t: X.id, sh: sh.card.uid }); }
  else if (aim === 'shield') { for (const X of opps) for (const sh of X.shields) out.push({ t: X.id, sh: sh.card.uid }); }
  else if (aim === 'opp') for (const X of opps) out.push({ t: X.id });
  else if (aim === 'oppDeck') { for (const X of opps) if (X.deck.length + X.discard.length > 0) out.push({ t: X.id }); }
  else if (aim === 'discard') for (const c of P.discard) out.push({ pick: c.uid });
  return out.length ? out : [null];
}
const sameChoice = (a, b) => (!a && !b) || (a && b && a.t === b.t && a.sh === b.sh && a.pick === b.pick);
function validChoice(S, P, card, ch) {
  const all = choicesFor(S, P, card);
  if (all[0] === null) return true;   /* nothing to aim at: the card is played for its other symbols */
  if (!ch) return false;
  /* an attack may name any shield of its target, even when that target has only one */
  if (aimOf(card) === 'attack' && ch.sh != null) { const f = findShield(S, ch.sh); return !!f && f.X.id === ch.t && all.some(c => c.t === ch.t); }
  return all.some(c => sameChoice(c, ch));
}

/* ── playing a card ── */
function beginTurn(S) {
  const P = cur(S);
  P.disguised = false; P.turns++; S.turnNo++; S.plays = 1;
  draw(S, P, 1);
  log(S, 'turn', { pid: P.id });
}
function playCard(S, pid, uid, ch) {
  if (S.winner != null || S.turn !== pid || S.pending || S.plays <= 0) return null;
  const P = S.players[pid]; if (!P.alive) return null;
  const i = P.hand.findIndex(c => c.uid === uid); if (i < 0) return null;
  const card = P.hand[i];
  if (!validChoice(S, P, card, ch)) return null;
  P.hand.splice(i, 1);
  S.plays--; P.stats.played++;
  const ev = { pid, card, ch: ch || null, fx: [] };
  log(S, 'play', { pid, card: card.name, t: ch && ch.t != null ? ch.t : null });
  resolveCard(S, P, card, ch || {}, ev, null);
  afterPlay(S, ev);
  return ev;
}
/* a card taken with Light Fingers is played at once by the thief, with a target of its own */
function resolvePending(S, ch) {
  const pd = S.pending; if (!pd || S.winner != null) return null;
  const P = S.players[pd.pid];
  if (!validChoice(S, P, pd.card, ch)) return null;
  S.pending = null;
  const ev = { pid: P.id, card: pd.card, ch: ch || null, fx: [], stolen: true, from: pd.from };
  log(S, 'play', { pid: P.id, card: pd.card.name, t: ch && ch.t != null ? ch.t : null, from: pd.from });
  resolveCard(S, P, pd.card, ch || {}, ev, pd.from);
  afterPlay(S, ev);
  return ev;
}
function afterPlay(S, ev) {
  /* an empty hand draws 2 at once (during anyone's turn) */
  for (const X of S.players) if (X.alive && handCount(X) === 0) { const n = draw(S, X, RULES.emptyDraw); if (n) ev.fx.push({ k: 'refill', t: X.id, n }); }
  const alive = S.players.filter(X => X.alive);
  if (alive.length <= 1) { S.winner = alive.length ? alive[0].id : -1; S.pending = null; log(S, 'end', { winner: S.winner }); }
}
/* the Mighty Power first, then the symbols top to bottom; then the card goes where it goes */
function resolveCard(S, P, card, ch, ev, owner) {
  const own = owner != null ? owner : P.id;
  if (card.power) power(S, P, card, ch, ev);
  const a = count(card.sym, 'A');
  if (a && P.alive) {
    const X = ch.t != null ? S.players[ch.t] : null;
    if (X && X.alive && X.id !== P.id && !immune(S, P, X)) { ev.fx.push({ k: 'attack', by: P.id, t: X.id, n: a }); damage(S, P, X, a, ev, ch.sh); }
    else ev.fx.push({ k: 'miss', t: P.id, why: 'target' });
  }
  const s = count(card.sym, 'S');
  if (s && P.alive) { P.shields.push({ card, dmg: 0, owner: own, seq: S.seq++ }); ev.fx.push({ k: 'raise', t: P.id, uid: card.uid, n: s, name: card.name }); }
  const h = count(card.sym, 'H'); if (h && P.alive) heal(S, P, h, ev);
  const d = count(card.sym, 'D'); if (d && P.alive) { const got = draw(S, P, d); ev.fx.push({ k: 'draw', t: P.id, n: got }); }
  const p = count(card.sym, 'P'); if (p && P.alive) { S.plays += p; ev.fx.push({ k: 'again', t: P.id, n: p }); }
  if (!(s && P.alive)) toDiscard(S, own, card);
}
function power(S, P, card, ch, ev) {
  switch (card.power) {
    case 'whirl': {
      const opps = opponents(S, P);
      heal(S, P, opps.length, ev);
      for (const X of opps) if (!immune(S, P, X)) damage(S, P, X, 1, ev); else ev.fx.push({ k: 'immune', t: X.id });
      break;
    }
    case 'roar':
      for (const X of S.players) {
        if (!X.alive) continue;
        if (immune(S, P, X)) { ev.fx.push({ k: 'immune', t: X.id }); continue; }
        const had = handCount(X); discardHand(S, X); draw(S, X, 3); ev.fx.push({ k: 'roar', t: X.id, had });
      }
      break;
    case 'destroy': case 'charm': {
      const f = ch.sh != null ? findShield(S, ch.sh) : null;
      if (!f || f.X === P || immune(S, P, f.X)) { ev.fx.push({ k: 'miss', t: P.id, why: 'shield' }); break; }
      if (card.power === 'destroy') breakShield(S, f.X, f.sh, ev, P);
      else { f.X.shields.splice(f.X.shields.indexOf(f.sh), 1); P.shields.push(f.sh); ev.fx.push({ k: 'charm', t: f.X.id, by: P.id, uid: f.sh.card.uid, name: f.sh.card.name }); }
      break;
    }
    case 'fireball':
      ev.fx.push({ k: 'blast', by: P.id });
      for (const X of S.players) if (X.alive) { if (immune(S, P, X)) ev.fx.push({ k: 'immune', t: X.id }); else damage(S, P, X, 3, ev); }
      break;
    case 'swap': {
      const X = ch.t != null ? S.players[ch.t] : null;
      if (!X || !X.alive || X === P || immune(S, P, X)) { ev.fx.push({ k: 'miss', t: P.id, why: 'target' }); break; }
      const a = P.hp, b = X.hp; P.hp = b; X.hp = a;
      ev.fx.push({ k: 'swap', t: X.id, by: P.id, from: a, to: b });
      break;
    }
    case 'recall': {
      const i = ch.pick != null ? P.discard.findIndex(c => c.uid === ch.pick) : -1;
      if (i < 0) { ev.fx.push({ k: 'miss', t: P.id, why: 'discard' }); break; }
      const c = P.discard.splice(i, 1)[0]; P.hand.push(c);
      ev.fx.push({ k: 'recall', t: P.id, card: c });
      break;
    }
    case 'purge':
      for (const X of S.players) {
        if (!X.alive || !X.shields.length) continue;
        if (immune(S, P, X)) { ev.fx.push({ k: 'immune', t: X.id }); continue; }
        for (const sh of X.shields.slice()) breakShield(S, X, sh, ev, P);
      }
      break;
    case 'disguise': P.disguised = true; ev.fx.push({ k: 'vanish', t: P.id }); break;
    case 'steal': {
      const X = ch.t != null ? S.players[ch.t] : null;
      if (!X || !X.alive || X === P || immune(S, P, X)) { ev.fx.push({ k: 'miss', t: P.id, why: 'target' }); break; }
      if (S.virtual) { P.vsteal = (P.vsteal || 0) + 1; break; }
      if (!X.deck.length && X.discard.length) { X.deck = shuffled(S, X.discard); X.discard = []; log(S, 'reshuffle', { pid: X.id }); }
      if (!X.deck.length) { ev.fx.push({ k: 'miss', t: X.id, why: 'deck' }); break; }
      const c = X.deck.pop();
      S.pending = { pid: P.id, card: c, from: X.id };
      ev.fx.push({ k: 'steal', t: X.id, by: P.id, card: c });
      break;
    }
  }
}
/* the turn passes to the left (the next seat); a new round starts when it comes back round to the first player */
function endTurn(S) {
  if (S.winner != null) return;
  S.pending = null;
  const n = S.players.length;
  let i = S.turn, wrapped = false;
  for (let k = 0; k < n; k++) { i = (i + 1) % n; if (i === S.first) wrapped = true; if (S.players[i].alive) break; }
  if (wrapped) S.round++;
  S.turn = i;
  beginTurn(S);
}
/* the active player's turn is over when they owe no plays (or cannot play: no card anywhere, or knocked out) */
function turnOver(S) { const P = cur(S); return S.winner != null || (!S.pending && (S.plays <= 0 || !P.alive || !P.hand.length)); }

/* ── light copies for the AI and the previews ── */
function liteCopy(S) {
  const C = { ...S, virtual: true, quiet: true, log: [] };
  C.players = S.players.map(P => ({ ...P, hand: P.hand.slice(), discard: P.discard.slice(), shields: P.shields.map(sh => ({ ...sh })), stats: { ...P.stats }, vdraw: P.vdraw || 0, vsteal: P.vsteal || 0 }));
  if (S.pending) C.pending = { ...S.pending };
  return C;
}
/* what a play would change at every seat, for the tags shown above them before you commit */
function previewPlay(S, pid, uid, ch, pending) {
  const C = liteCopy(S), before = C.players.map(X => ({ hp: X.hp, sh: shieldTotal(X), uids: X.shields.map(sh => sh.card.uid), hand: handCount(X), alive: X.alive, dis: X.disguised, steal: X.vsteal || 0 }));
  const ev = pending ? resolvePending(C, ch) : playCard(C, pid, uid, ch);
  if (!ev) return null;
  return {
    ev, winner: C.winner, plays: C.plays,
    players: C.players.map((X, i) => {
      const b = before[i], lost = b.uids.filter(u => !X.shields.some(sh => sh.card.uid === u)).length;
      return { hp: X.hp - b.hp, shield: shieldTotal(X) - b.sh, lost, hand: handCount(X) - b.hand, dies: b.alive && !X.alive, vanish: !b.dis && X.disguised, steal: (X.vsteal || 0) - b.steal };
    }),
  };
}
