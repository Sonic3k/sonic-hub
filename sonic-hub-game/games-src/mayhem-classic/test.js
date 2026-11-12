// node test.js — rule scenarios: each sets up a table by hand and checks what the engine does.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const CORE = path.join(__dirname, 'src', 'core');
for (const f of fs.readdirSync(CORE).filter(f => f.endsWith('.js')).sort()) vm.runInThisContext(fs.readFileSync(path.join(CORE, f), 'utf8'), { filename: f });
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { console.log('FAIL', name, '\n ', e.message); process.exitCode = 1; } }
/* a table where player 0 is to play, with chosen cards in hand */
function table(heroes, opts = {}) {
  const S = newGame({ seed: opts.seed || 7, heroes, ai: heroes.map(() => false), first: 0 });
  S.quiet = true; startGame(S);
  return S;
}
function give(S, pid, hero, id) { const d = HEROES[hero].cards.find(c => c.id === id); const c = makeCard(S, hero, d); S.players[pid].hand.push(c); return c; }
function shield(S, pid, hero, id, dmg = 0, owner = pid) { const d = HEROES[hero].cards.find(c => c.id === id); const c = makeCard(S, hero, d); S.players[pid].shields.push({ card: c, dmg, owner, seq: S.seq++ }); return c; }

test('an attack goes into shields, weakest first, then HP', () => {
  const S = table(['barbarian', 'paladin']);
  shield(S, 1, 'paladin', 'bramble');            // 2 shields
  shield(S, 1, 'paladin', 'aegis', 1);           // 3 shields, 1 used: 2 left
  const c = give(S, 0, 'barbarian', 'rampage');  // 4 attacks
  const ev = playCard(S, 0, c.uid, { t: 1 });
  assert(ev, 'played');
  assert.strictEqual(S.players[1].shields.length, 0, 'both shields broke');
  assert.strictEqual(S.players[1].hp, 10, 'no damage reached HP');
  assert.strictEqual(S.players[1].discard.filter(x => x.id === 'bramble' || x.id === 'aegis').length, 2, 'broken shields go to the discard');
});
test('damage left over after the last shield reaches HP', () => {
  const S = table(['barbarian', 'paladin']);
  shield(S, 1, 'paladin', 'bramble');
  const c = give(S, 0, 'barbarian', 'rampage');
  playCard(S, 0, c.uid, { t: 1 });
  assert.strictEqual(S.players[1].hp, 8);
});
test('an attack can name a shield to hit first', () => {
  const S = table(['barbarian', 'paladin']);
  const big = shield(S, 1, 'paladin', 'aegis');   // 3
  const small = shield(S, 1, 'paladin', 'bramble'); // 2
  const c = give(S, 0, 'barbarian', 'cleave');     // 3
  playCard(S, 0, c.uid, { t: 1, sh: big.uid });
  assert.deepStrictEqual(S.players[1].shields.map(s => s.card.id), ['bramble'], 'the named shield broke');
  assert.strictEqual(S.players[1].shields[0].dmg, 0, 'the other one is untouched');
  assert(small);
});
test('an attack needs a target when there is one', () => {
  const S = table(['barbarian', 'paladin']);
  const c = give(S, 0, 'barbarian', 'cleave');
  assert.strictEqual(playCard(S, 0, c.uid, null), null);
  assert(playCard(S, 0, c.uid, { t: 1 }));
});
test('play again: a lightning means one more card; the turn ends when none is owed', () => {
  const S = table(['rogue', 'paladin']);
  const a = give(S, 0, 'rogue', 'flick'), b = give(S, 0, 'rogue', 'paired');
  playCard(S, 0, a.uid, { t: 1 });
  assert.strictEqual(S.plays, 1);
  assert(!turnOver(S));
  playCard(S, 0, b.uid, { t: 1 });
  assert.strictEqual(S.plays, 0);
  assert(turnOver(S));
  assert.strictEqual(S.players[1].hp, 7);
});
test('an empty hand draws 2 at once', () => {
  const S = table(['rogue', 'paladin']);
  S.players[0].hand = [];
  const a = give(S, 0, 'rogue', 'paired');
  playCard(S, 0, a.uid, { t: 1 });
  assert.strictEqual(S.players[0].hand.length, 2);
});
test('an empty deck is made again from the shuffled discard pile', () => {
  const S = table(['wizard', 'paladin']);
  const P = S.players[0];
  P.discard = P.deck.splice(0); P.hand = [];
  const t = give(S, 0, 'wizard', 'tome');   // draw 3
  playCard(S, 0, t.uid, null);
  assert.strictEqual(P.hand.length, 3);
  assert(P.deck.length > 0 && P.discard.length === 0 || P.discard.length === 1, 'reshuffled');
});
test('healing never goes above 10', () => {
  const S = table(['paladin', 'barbarian']);
  S.players[0].hp = 9;
  const c = give(S, 0, 'paladin', 'smite');
  playCard(S, 0, c.uid, { t: 1 });
  assert.strictEqual(S.players[0].hp, 10);
  assert.strictEqual(S.players[1].hp, 7);
});
test('Whirlwind: heal 1 per opponent, then 1 damage to each', () => {
  const S = table(['barbarian', 'wizard', 'paladin', 'rogue']);
  S.players[0].hp = 5;
  shield(S, 2, 'paladin', 'bramble');
  const c = give(S, 0, 'barbarian', 'whirlwind');
  playCard(S, 0, c.uid, null);
  assert.strictEqual(S.players[0].hp, 8);
  assert.deepStrictEqual(S.players.slice(1).map(p => p.hp), [9, 10, 9]);
  assert.strictEqual(S.players[2].shields[0].dmg, 1, 'the shield took it');
});
test('Battle Cry: every hand is discarded and refilled to 3, then play again', () => {
  const S = table(['barbarian', 'wizard', 'paladin']);
  S.players[1].hand.push(...S.players[1].deck.splice(0, 4));
  const c = give(S, 0, 'barbarian', 'howl');
  const before = S.players[1].discard.length, h1 = S.players[1].hand.length;
  playCard(S, 0, c.uid, null);
  for (const P of S.players) assert.strictEqual(P.hand.length, 3, P.hero);
  assert.strictEqual(S.players[1].discard.length, before + h1);
  assert.strictEqual(S.plays, 1);
});
test('Toss Aside breaks a shield and draws; Cheap Shot breaks one and plays again', () => {
  const S = table(['barbarian', 'paladin']);
  const sh = shield(S, 1, 'paladin', 'aegis');
  const c = give(S, 0, 'barbarian', 'tossaside');
  const h = S.players[0].hand.length;
  playCard(S, 0, c.uid, { t: 1, sh: sh.uid });
  assert.strictEqual(S.players[1].shields.length, 0);
  assert.strictEqual(S.players[0].hand.length, h);   // -1 played, +1 drawn
  const R = table(['rogue', 'paladin']);
  const s2 = shield(R, 1, 'paladin', 'bramble');
  const c2 = give(R, 0, 'rogue', 'cheapshot');
  playCard(R, 0, c2.uid, { t: 1, sh: s2.uid });
  assert.strictEqual(R.players[1].shields.length, 0);
  assert.strictEqual(R.plays, 1);
});
test('a power that aims at a shield can still be played when there is none (its other symbols only)', () => {
  const S = table(['barbarian', 'paladin']);
  const c = give(S, 0, 'barbarian', 'tossaside');
  assert.deepStrictEqual(choicesFor(S, S.players[0], c), [null]);
  assert(playCard(S, 0, c.uid, null));
});
test('Firestorm: 3 damage to everyone, shields first; everyone falling at once is a tie', () => {
  const S = table(['wizard', 'paladin', 'barbarian']);
  shield(S, 1, 'paladin', 'aegis');
  const c = give(S, 0, 'wizard', 'firestorm');
  playCard(S, 0, c.uid, null);
  assert.deepStrictEqual(S.players.map(p => p.hp), [7, 10, 7]);
  const T = table(['wizard', 'paladin']);
  T.players[0].hp = 2; T.players[1].hp = 3;
  const f = give(T, 0, 'wizard', 'firestorm');
  playCard(T, 0, f.uid, null);
  assert.strictEqual(T.winner, -1);
  const U = table(['wizard', 'paladin']);
  U.players[0].hp = 2; U.players[1].hp = 4;
  const g = give(U, 0, 'wizard', 'firestorm');
  playCard(U, 0, g.uid, null);
  assert.strictEqual(U.winner, 1, 'the caster can lose to their own fire');
});
test('Soul Siphon swaps HP', () => {
  const S = table(['wizard', 'barbarian']);
  S.players[0].hp = 2; S.players[1].hp = 9;
  const c = give(S, 0, 'wizard', 'siphon');
  playCard(S, 0, c.uid, { t: 1 });
  assert.deepStrictEqual(S.players.map(p => p.hp), [9, 2]);
});
test('Beguile takes a shield with its damage; when it breaks it goes back to its owner\'s discard', () => {
  const S = table(['wizard', 'paladin', 'barbarian']);
  const sh = shield(S, 1, 'paladin', 'aegis', 1);
  const c = give(S, 0, 'wizard', 'beguile');
  playCard(S, 0, c.uid, { t: 1, sh: sh.uid });
  assert.strictEqual(S.players[1].shields.length, 0);
  assert.strictEqual(S.players[0].shields.length, 1);
  assert.strictEqual(S.players[0].shields[0].dmg, 1);
  /* the barbarian hits the wizard: the borrowed shield takes 2 and breaks, 1 goes through */
  S.turn = 2; S.plays = 1;
  const a = give(S, 2, 'barbarian', 'cleave');
  playCard(S, 2, a.uid, { t: 0 });
  assert.strictEqual(S.players[0].shields.length, 0);
  assert.strictEqual(S.players[0].hp, 9);
  assert(S.players[1].discard.some(x => x.uid === sh.uid), 'back in the paladin\'s discard pile');
});
test('Vanishing Act: nothing an opponent plays touches you or your shields until your next turn', () => {
  const S = table(['rogue', 'barbarian', 'paladin']);
  shield(S, 0, 'rogue', 'muscle');
  const v = give(S, 0, 'rogue', 'vanish');
  playCard(S, 0, v.uid, null);
  endTurn(S);
  const P = S.players[1];
  const c = give(S, 1, 'barbarian', 'cleave');
  assert(!choicesFor(S, P, c).some(ch => ch && ch.t === 0), 'cannot be attacked');
  assert.strictEqual(playCard(S, 1, c.uid, { t: 0 }), null);
  const w = give(S, 1, 'barbarian', 'whirlwind');
  playCard(S, 1, w.uid, null);
  assert.strictEqual(S.players[0].hp, 10, 'no whirlwind damage');
  assert.strictEqual(S.players[1].hp, 10, 'healed 2 for 2 opponents (from full: stays 10)');
  endTurn(S);   // paladin
  const pl = give(S, 2, 'paladin', 'purging');
  playCard(S, 2, pl.uid, null);
  assert.strictEqual(S.players[0].shields.length, 1, 'Purging Light skips the vanished rogue');
  S.plays = 0; endTurn(S);   // back to the rogue: it ends
  assert.strictEqual(S.players[0].disguised, false);
});
test('Answered Prayer: a card from your discard pile to your hand, then heal 2', () => {
  const S = table(['paladin', 'barbarian']);
  const P = S.players[0]; P.hp = 5;
  const old = makeCard(S, 'paladin', HEROES.paladin.cards.find(c => c.id === 'smite')); P.discard.push(old);
  const c = give(S, 0, 'paladin', 'prayer');
  playCard(S, 0, c.uid, { pick: old.uid });
  assert(P.hand.some(x => x.uid === old.uid));
  assert.strictEqual(P.hp, 7);
  assert(P.discard.some(x => x.uid === c.uid) && !P.discard.some(x => x.uid === old.uid));
});
test('Light Fingers: the top card of an opponent\'s deck is played by the thief, then goes to its owner\'s discard', () => {
  const S = table(['rogue', 'wizard']);
  const W = S.players[1];
  const top = makeCard(S, 'wizard', HEROES.wizard.cards.find(c => c.id === 'dart')); W.deck.push(top);
  const c = give(S, 0, 'rogue', 'fingers');
  playCard(S, 0, c.uid, { t: 1 });
  assert(S.pending && S.pending.card.uid === top.uid);
  assert(!turnOver(S), 'the turn waits for the stolen card');
  const ev = resolvePending(S, { t: 1 });
  assert(ev && ev.stolen);
  assert.strictEqual(W.hp, 9);
  assert.strictEqual(S.plays, 1, 'its lightning gives the thief another play');
  assert(W.discard.some(x => x.uid === top.uid));
});
test('a stolen shield protects the thief and returns to its owner when it breaks', () => {
  const S = table(['rogue', 'wizard', 'barbarian']);
  const W = S.players[1];
  const top = makeCard(S, 'wizard', HEROES.wizard.cards.find(c => c.id === 'granite')); W.deck.push(top);
  const c = give(S, 0, 'rogue', 'fingers');
  playCard(S, 0, c.uid, { t: 1 });
  resolvePending(S, null);
  assert.strictEqual(S.players[0].shields.length, 1);
  assert.strictEqual(S.players[0].shields[0].owner, 1);
  S.turn = 2; S.plays = 1;
  const a = give(S, 2, 'barbarian', 'knuckles');
  playCard(S, 2, a.uid, { t: 0 });
  assert(W.discard.some(x => x.uid === top.uid));
});
test('a knocked-out player\'s borrowed shields go back to their owners', () => {
  const S = table(['wizard', 'paladin', 'barbarian']);
  const sh = shield(S, 0, 'paladin', 'aegis', 2, 1);   // the wizard holds the paladin's shield, 1 left
  S.players[0].hp = 1;
  S.turn = 2; S.plays = 1;
  const a = give(S, 2, 'barbarian', 'cleave');
  playCard(S, 2, a.uid, { t: 0 });
  assert(!S.players[0].alive);
  assert(S.players[1].discard.some(x => x.uid === sh.uid));
});
test('the turn skips knocked-out players; the round counts when it comes back round', () => {
  const S = table(['wizard', 'paladin', 'barbarian']);
  S.players[1].alive = false;
  S.plays = 0; endTurn(S);
  assert.strictEqual(S.turn, 2);
  assert.strictEqual(S.round, 1);
  S.plays = 0; endTurn(S);
  assert.strictEqual(S.turn, 0);
  assert.strictEqual(S.round, 2);
});
test('every deck has 28 cards', () => { for (const h of HERO_ORDER) assert.strictEqual(deckSize(h), 28, h); });
test('previews never change the real table', () => {
  const S = table(['rogue', 'wizard']);
  const snap = JSON.stringify(S.players.map(p => [p.hp, p.hand.length, p.deck.length, p.discard.length]));
  const c = give(S, 0, 'rogue', 'fingers');
  previewPlay(S, 0, c.uid, { t: 1 });
  const d = give(S, 0, 'rogue', 'flurry');
  previewPlay(S, 0, d.uid, { t: 1 });
  assert.strictEqual(JSON.stringify(S.players.map(p => [p.hp, p.hand.length - (p.id === 0 ? 2 : 0), p.deck.length, p.discard.length])), snap);
});
console.log(`${passed} rule tests passed`);
