// node test.js — rule scenarios: each sets up a table by hand and checks what the engine does.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const CORE = path.join(__dirname, 'src', 'core');
for (const f of fs.readdirSync(CORE).filter(f => f.endsWith('.js')).sort()) vm.runInThisContext(fs.readFileSync(path.join(CORE, f), 'utf8'), { filename: f });
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { console.log('FAIL', name, '\n ', e.stack.split('\n').slice(0, 3).join('\n  ')); process.exitCode = 1; } }

const ALL8 = ['assassin', 'thief', 'magician', 'king', 'bishop', 'merchant', 'architect', 'warlord'];
/* a table of n players with the chosen characters; nobody has cards or gold unless the test gives them */
function game(n, chars = ALL8, o = {}) {
  const S = newGame({ seed: o.seed || 11, names: Array.from({ length: n }, (_, i) => 'P' + i), ai: Array(n).fill(false), chars, uniques: o.uniques || PRESETS[0].uniques, crown: o.crown != null ? o.crown : 0 });
  S.quiet = true;
  for (const P of S.players) { if (!o.keepHands) { S.deck.push(...P.hand); P.hand = []; } P.gold = o.gold != null ? o.gold : 0; }
  return S;
}
/* skip the selection: give each player their characters and start calling ranks */
function round(S, holds) {
  S.round = (S.round || 0) + 1; S.phase = 'turns';
  Object.assign(S, { holder: {}, revealed: {}, killed: null, robbed: null, bewitched: null, witch: null, warrants: null, threats: null, rank: 0, cur: null, queenWait: null });
  S.sel = { faceUp: [], faceDown: [], pass: [], steps: [], i: 0 };
  for (const P of S.players) { P.chars = []; P.revealed = []; }
  for (const [pid, cs] of Object.entries(holds)) for (const c of cs) { S.players[pid].chars.push(c); S.holder[c] = +pid; }
  const ev = { fx: [] }; callNext(S, ev); return ev;
}
const give = (S, pid, id) => { const c = makeCard(S, id); S.players[pid].hand.push(c); return c; };
const put = (S, pid, id) => { const c = makeCard(S, id); S.players[pid].city.push({ card: c, beau: 0, museum: [] }); return c; };
const ids = P => P.city.map(e => e.card.id).sort();
function go(S, pid, a) { const ev = act(S, pid, a); assert(ev, `refused ${JSON.stringify(a)} for P${pid} at ${S.need && S.need.kind} (${S.cur && S.cur.char})`); return ev; }
const no = (S, pid, a) => assert.strictEqual(act(S, pid, a), null, `should refuse ${JSON.stringify(a)}`);
const turnOf = S => (S.need && S.need.kind === 'turn' ? S.cur.char : null);
const end = (S, pid) => go(S, pid, { t: 'end' });
const gold = (S, pid) => go(S, pid, { t: 'gather', take: 'gold' });

/* ── selection ── */
test('4 players, 8 characters: 2 face up, 1 face down, the rank 4 never face up; everyone takes one', () => {
  for (let s = 1; s < 60; s++) {
    const S = game(4, ALL8, { seed: s }); startGame(S);
    assert.strictEqual(S.sel.faceUp.length, 2); assert.strictEqual(S.sel.faceDown.length, 1);
    assert(!S.sel.faceUp.includes('king'));
    while (S.need.kind === 'pick') go(S, S.need.pid, { t: 'pick', char: S.need.options[0] });
    assert(S.players.every(P => P.chars.length === 1));
    assert.strictEqual(S.sel.faceDown.length, 2, 'the last card goes face down');
  }
});
test('the crown picks first, then to the left', () => {
  const S = game(5, ALL8.concat('artist'), { crown: 3 }); startGame(S);
  const order = [];
  while (S.need.kind === 'pick') { order.push(S.need.pid); go(S, S.need.pid, { t: 'pick', char: S.need.options[0] }); }
  assert.deepStrictEqual(order, [3, 4, 0, 1, 2]);
  assert.strictEqual(S.sel.faceUp.length, 2, '5 players, 9 characters: 2 face up');
});
test('7 players: the last player also takes the first face-down card and keeps one of the two', () => {
  const S = game(7); startGame(S);
  for (let k = 0; k < 6; k++) go(S, S.need.pid, { t: 'pick', char: S.need.options[0] });
  assert.strictEqual(S.need.op, 'keepPlus'); assert.strictEqual(S.need.options.length, 2);
  const firstDown = S.sel.faceDown[0], [a, b] = S.need.options;
  assert(S.need.options.includes(firstDown));
  go(S, S.need.pid, { t: 'pick', char: firstDown });
  assert(S.players[S.need ? 6 : 6].chars.includes(firstDown));
  assert(S.sel.faceDown.includes(a === firstDown ? b : a), 'the other one goes face down');
});
test('2 players: each takes two characters and chooses the discards; 3 players: two each, one random discard', () => {
  const S = game(2); startGame(S);
  const ops = [];
  while (S.phase === 'select') { ops.push(S.need.op); go(S, S.need.pid, { t: 'pick', char: S.need.options[0] }); }
  assert.deepStrictEqual(ops, ['keep', 'keep', 'down', 'keep', 'down', 'keep', 'down']);
  assert(S.players.every(P => P.chars.length === 2));
  const T = game(3, ALL8.concat('artist')); startGame(T);
  while (T.phase === 'select') go(T, T.need.pid, { t: 'pick', char: T.need.options[0] });
  assert(T.players.every(P => P.chars.length === 2)); assert.strictEqual(T.sel.faceDown.length, 3);
});
test('the Theater swaps characters after selection', () => {
  const S = game(4); put(S, 2, 'theater'); startGame(S);
  while (S.need.kind === 'pick') go(S, S.need.pid, { t: 'pick', char: S.need.options[0] });
  assert.strictEqual(S.need.kind, 'theater'); assert.strictEqual(S.need.pid, 2);
  const mine = S.players[2].chars[0], theirs = S.players[0].chars[0];
  go(S, 2, { t: 'theater', target: 0 });
  assert.strictEqual(S.players[2].chars[0], theirs); assert.strictEqual(S.players[0].chars[0], mine);
  assert.strictEqual(S.holder[theirs], 2);
});

/* ── gathering and building ── */
test('gather: 2 gold, or draw 2 keep 1 (the other under the deck); Gold Mine, Observatory, Library', () => {
  const S = game(4); round(S, { 0: ['merchant'], 1: ['architect'] });
  go(S, 0, { t: 'gather', take: 'gold' }); assert.strictEqual(S.players[0].gold, 3, '2 + the Merchant\'s extra gold');
  end(S, 0);
  const bottom = S.deck[0];
  go(S, 1, { t: 'gather', take: 'cards' }); assert.strictEqual(S.need.kind, 'keep'); assert.strictEqual(S.need.cards.length, 2);
  const [k, d] = S.need.cards; go(S, 1, { t: 'keep', uids: [k.uid] });
  assert.strictEqual(S.deck[0], d, 'the other card goes under the deck'); assert(bottom);
  assert.strictEqual(S.players[1].hand.length, 3, '1 kept + 2 from the Architect');
  const T = game(4); put(T, 0, 'gold-mine'); put(T, 1, 'observatory'); put(T, 1, 'library'); round(T, { 0: ['magician'], 1: ['bishop'] });
  gold(T, 0); assert.strictEqual(T.players[0].gold, 3); end(T, 0);
  go(T, 1, { t: 'gather', take: 'cards' }); assert.strictEqual(T.players[1].hand.length, 3, 'Observatory + Library: draw 3, keep all');
});
test('build: pay the cost, one district a turn, no two of the same name (the Quarry allows it)', () => {
  const S = game(4, ALL8, { gold: 10 }); const a = give(S, 0, 'manor'), b = give(S, 0, 'castle'); put(S, 0, 'temple'); const t2 = give(S, 0, 'temple');
  round(S, { 0: ['magician'] }); gold(S, 0);
  no(S, 0, { t: 'build', uid: t2.uid });
  go(S, 0, { t: 'build', uid: a.uid }); assert.strictEqual(S.players[0].gold, 9);
  no(S, 0, { t: 'build', uid: b.uid });
  const Q = game(4, ALL8, { gold: 10 }); put(Q, 0, 'quarry'); put(Q, 0, 'temple'); const t3 = give(Q, 0, 'temple');
  round(Q, { 0: ['magician'] }); gold(Q, 0); go(Q, 0, { t: 'build', uid: t3.uid });
  assert.strictEqual(Q.players[0].city.filter(e => e.card.id === 'temple').length, 2);
});
test('no building before gathering; gathering is needed to end the turn', () => {
  const S = game(4, ALL8, { gold: 5 }); const m = give(S, 0, 'manor'); round(S, { 0: ['magician'] });
  no(S, 0, { t: 'build', uid: m.uid }); no(S, 0, { t: 'end' });
});
test('a 7th district completes the city: the game ends after the round; +4 first, +2 others, +3 all five types', () => {
  const S = game(4, ALL8, { gold: 20 });
  for (const id of ['manor', 'temple', 'tavern', 'watchtower', 'keep', 'castle']) put(S, 0, id);
  for (const id of ['manor', 'temple', 'tavern', 'watchtower', 'castle', 'palace']) put(S, 1, id);
  const p0 = give(S, 0, 'palace'), p1 = give(S, 1, 'harbor');
  round(S, { 0: ['magician'], 1: ['bishop'], 2: ['merchant'], 3: ['warlord'] });
  gold(S, 0); go(S, 0, { t: 'build', uid: p0.uid }); assert(S.ending); assert.strictEqual(S.firstDone, 0);
  end(S, 0); gold(S, 1); go(S, 1, { t: 'build', uid: p1.uid }); end(S, 1);
  gold(S, 2); end(S, 2);
  assert.strictEqual(turnOf(S), 'warlord');
  no(S, 3, { t: 'ability', target: 0, uid: S.players[0].city[0].card.uid });
  gold(S, 3); end(S, 3);
  assert(S.over, 'the game ends with the round');
  const s0 = S.scores[0], s1 = S.scores[1];
  assert.strictEqual(s0.base, 3 + 1 + 1 + 1 + 3 + 4 + 5);
  assert(s0.lines.find(l => l.id === 'complete' && l.pts === 4)); assert(s0.lines.find(l => l.id === 'types' && l.pts === 3));
  assert(s1.lines.find(l => l.id === 'complete' && l.pts === 2)); assert(!s1.lines.find(l => l.id === 'types'));
  assert.strictEqual(S.winner, 0);
});

/* ── the characters ── */
test('Assassin: the killed character skips its turn; a killed King still takes the crown at the end of the round', () => {
  const S = game(4, ALL8, { crown: 2 }); round(S, { 0: ['assassin'], 1: ['king'], 2: ['merchant'] });
  no(S, 0, { t: 'ability', char: 'assassin' });
  go(S, 0, { t: 'ability', char: 'king' }); gold(S, 0); end(S, 0);
  assert.strictEqual(turnOf(S), 'merchant', 'the King is skipped');
  gold(S, 2); end(S, 2);
  assert.strictEqual(S.crown, 1, 'the heir takes the crown');
  assert.strictEqual(S.phase, 'select');
});
test('Thief: takes all the gold when the robbed character is turned up; cannot rob rank 1 or the killed', () => {
  const S = game(4, ALL8); round(S, { 0: ['assassin'], 1: ['thief'], 2: ['merchant'], 3: ['bishop'] });
  S.players[2].gold = 5; S.players[3].gold = 4;
  go(S, 0, { t: 'ability', char: 'bishop' }); gold(S, 0); end(S, 0);
  no(S, 1, { t: 'ability', char: 'assassin' }); no(S, 1, { t: 'ability', char: 'bishop' });
  go(S, 1, { t: 'ability', char: 'merchant' }); gold(S, 1); end(S, 1);
  assert.strictEqual(S.players[1].gold, 2 + 5); assert.strictEqual(S.players[2].gold, 0);
});
test('Witch: the bewitched player only gathers; the Witch finishes the turn as that character with her own city', () => {
  const chars = ['witch', 'thief', 'magician', 'king', 'bishop', 'merchant', 'architect', 'warlord'];
  const S = game(4, chars, { crown: 3 }); put(S, 0, 'manor'); put(S, 0, 'castle'); put(S, 1, 'palace');
  round(S, { 0: ['witch'], 1: ['king'], 2: ['merchant'] });
  no(S, 0, { t: 'ability', char: 'king' });
  gold(S, 0); go(S, 0, { t: 'ability', char: 'king' });
  assert.strictEqual(turnOf(S), 'king'); assert.strictEqual(S.cur.pid, 1); assert.strictEqual(S.cur.mode, 'bewitched');
  no(S, 1, { t: 'gain' });
  gold(S, 1);
  assert.strictEqual(S.cur.pid, 0, 'the Witch resumes'); assert.strictEqual(S.cur.char, 'king');
  assert.strictEqual(S.crown, 0, 'she takes the crown as the King');
  go(S, 0, { t: 'gain' }); assert.strictEqual(S.players[0].gold, 2 + 2, 'gold for her own 2 nobles');
  assert.strictEqual(S.players[1].gold, 2);
  end(S, 0); assert.strictEqual(turnOf(S), 'merchant');
});
test('Witch: if nobody has the bewitched character, her turn is simply over', () => {
  const chars = ['witch', 'thief', 'magician', 'king', 'bishop', 'merchant', 'architect', 'warlord'];
  const S = game(4, chars); round(S, { 0: ['witch'], 1: ['merchant'] });
  gold(S, 0); go(S, 0, { t: 'ability', char: 'warlord' });
  gold(S, 1); end(S, 1);
  assert.strictEqual(S.phase, 'select');
});
test('Magistrate: confiscates the first district the signed character pays for; the builder gets the gold back', () => {
  const chars = ['magistrate', 'thief', 'magician', 'king', 'bishop', 'merchant', 'architect', 'warlord'];
  const S = game(4, chars); const pal = give(S, 2, 'palace'), cas = give(S, 2, 'castle'); S.players[2].gold = 3;
  round(S, { 0: ['magistrate'], 2: ['architect'] });
  go(S, 0, { t: 'ability', chars: ['king', 'merchant', 'architect'], signed: 'architect' }); gold(S, 0); end(S, 0);
  gold(S, 2); go(S, 2, { t: 'build', uid: pal.uid });
  assert.strictEqual(S.need.kind, 'confiscate'); assert.strictEqual(S.need.pid, 0);
  go(S, 0, { t: 'confiscate', take: true });
  assert.deepStrictEqual(ids(S.players[0]), ['palace']); assert.strictEqual(S.players[2].gold, 5, 'gold back');
  assert.strictEqual(S.cur.built, 1, 'it still counts toward the limit');
  go(S, 2, { t: 'build', uid: cas.uid }); assert.strictEqual(S.need.kind, 'turn', 'only the first paid district');
  assert.deepStrictEqual(ids(S.players[2]), ['castle']);
});
test('Magistrate: a district built with the Framework cannot be confiscated', () => {
  const chars = ['magistrate', 'thief', 'magician', 'king', 'bishop', 'merchant', 'architect', 'warlord'];
  const S = game(4, chars); put(S, 2, 'framework'); const pal = give(S, 2, 'palace');
  round(S, { 0: ['magistrate'], 2: ['merchant'] });
  go(S, 0, { t: 'ability', chars: ['king', 'merchant', 'architect'], signed: 'merchant' }); gold(S, 0); end(S, 0);
  gold(S, 2); go(S, 2, { t: 'build', uid: pal.uid, pay: 'framework' });
  assert.strictEqual(S.need.kind, 'turn'); assert.deepStrictEqual(ids(S.players[2]), ['palace']);
});
test('Spy: 1 gold and 1 card for each card of the named type in the hand', () => {
  const chars = ['assassin', 'spy', 'magician', 'king', 'bishop', 'merchant', 'architect', 'warlord'];
  const S = game(4, chars); give(S, 1, 'manor'); give(S, 1, 'castle'); give(S, 1, 'temple'); S.players[1].gold = 1;
  round(S, { 0: ['spy'] });
  go(S, 0, { t: 'ability', target: 1, type: 'noble' });
  assert.strictEqual(S.players[0].gold, 1); assert.strictEqual(S.players[1].gold, 0); assert.strictEqual(S.players[0].hand.length, 2);
});
test('Blackmailer: pay half to remove a threat; refuse and a real threat costs all the gold', () => {
  const chars = ['assassin', 'blackmailer', 'magician', 'king', 'bishop', 'merchant', 'architect', 'warlord'];
  const S = game(4, chars); S.players[2].gold = 5; S.players[3].gold = 6;
  round(S, { 0: ['blackmailer'], 2: ['merchant'], 3: ['architect'] });
  no(S, 0, { t: 'ability', chars: ['assassin', 'merchant'], real: 'merchant' });
  go(S, 0, { t: 'ability', chars: ['merchant', 'architect'], real: 'architect' }); gold(S, 0); end(S, 0);
  gold(S, 2); assert.strictEqual(S.need.kind, 'bribe');
  no(S, 2, { t: 'build', uid: 1 });
  go(S, 2, { t: 'bribe', pay: true });
  assert.strictEqual(S.players[2].gold, 5 + 2 + 1 - 4); assert.strictEqual(S.players[0].gold, 2 + 4);
  end(S, 2);
  gold(S, 3); go(S, 3, { t: 'bribe', pay: false });
  assert.strictEqual(S.need.kind, 'reveal'); go(S, 0, { t: 'reveal', reveal: true });
  assert.strictEqual(S.players[3].gold, 0); assert.strictEqual(S.players[0].gold, 6 + 8);
});
test('Magician: swap hands, or redraw', () => {
  const S = game(4); give(S, 0, 'manor'); give(S, 1, 'temple'); give(S, 1, 'church');
  round(S, { 0: ['magician'] });
  go(S, 0, { t: 'ability', mode: 'swap', target: 1 });
  assert.deepStrictEqual(S.players[0].hand.map(c => c.id), ['temple', 'church']); assert.deepStrictEqual(S.players[1].hand.map(c => c.id), ['manor']);
  const T = game(4); const a = give(T, 0, 'manor'); give(T, 0, 'temple'); round(T, { 0: ['magician'] });
  go(T, 0, { t: 'ability', mode: 'redraw', uids: [a.uid] });
  assert.strictEqual(T.players[0].hand.length, 2); assert.strictEqual(T.deck[0], a);
});
test('Wizard: takes a card and builds it at once (not counting toward the limit); identical districts allowed', () => {
  const chars = ['assassin', 'thief', 'wizard', 'king', 'bishop', 'merchant', 'architect', 'warlord'];
  const S = game(4, chars, { gold: 10 }); const pal = give(S, 1, 'palace'); put(S, 0, 'manor'); const m = give(S, 0, 'manor');
  round(S, { 0: ['wizard'] }); gold(S, 0);
  go(S, 0, { t: 'ability', target: 1 }); assert.strictEqual(S.need.kind, 'wizard');
  go(S, 0, { t: 'wizard', uid: pal.uid, build: true });
  assert(ids(S.players[0]).includes('palace')); assert.strictEqual(S.players[1].hand.length, 0);
  go(S, 0, { t: 'build', uid: m.uid }); assert.strictEqual(S.players[0].city.filter(e => e.card.id === 'manor').length, 2);
});
test('Seer: one random card from each hand, one back to each; builds up to 2', () => {
  const chars = ['assassin', 'thief', 'seer', 'king', 'bishop', 'merchant', 'architect', 'warlord'];
  const S = game(4, chars, { gold: 10 }); give(S, 1, 'temple'); give(S, 2, 'church'); give(S, 0, 'manor'); give(S, 0, 'castle');
  round(S, { 0: ['seer'] });
  go(S, 0, { t: 'ability' }); assert.deepStrictEqual(S.need.to, [1, 2]); assert.strictEqual(S.players[0].hand.length, 4);
  const h = S.players[0].hand;
  go(S, 0, { t: 'seer', gives: { 1: h.find(c => c.id === 'church').uid, 2: h.find(c => c.id === 'temple').uid } });
  assert.deepStrictEqual(S.players[1].hand.map(c => c.id), ['church']);
  gold(S, 0);
  const [a, b] = S.players[0].hand; go(S, 0, { t: 'build', uid: a.uid }); go(S, 0, { t: 'build', uid: b.uid });
  assert.strictEqual(S.players[0].city.length, 2);
});
test('King and Patrician: the crown, and gold or cards for noble districts (School of Magic counts too)', () => {
  const S = game(4, ALL8, { crown: 2 }); put(S, 1, 'manor'); put(S, 1, 'palace'); put(S, 1, 'school-of-magic');
  round(S, { 1: ['king'] });
  assert.strictEqual(S.crown, 1); gold(S, 1); go(S, 1, { t: 'gain' }); assert.strictEqual(S.players[1].gold, 2 + 3);
  no(S, 1, { t: 'gain' });
  const chars = ['assassin', 'thief', 'magician', 'patrician', 'bishop', 'merchant', 'architect', 'warlord'];
  const T = game(4, chars, { crown: 2 }); put(T, 1, 'manor'); round(T, { 1: ['patrician'] });
  gold(T, 1); end(T, 1); assert.strictEqual(T.players[1].hand.length, 1, 'an unused gain is taken at the end of the turn'); assert.strictEqual(T.crown, 1);
});
test('Emperor: gives the crown to someone else and takes a gold or a card; a killed Emperor still gives it away', () => {
  const chars = ['assassin', 'thief', 'magician', 'emperor', 'bishop', 'merchant', 'architect', 'warlord'];
  const S = game(4, chars, { crown: 2 }); S.players[3].gold = 3;
  round(S, { 1: ['emperor'] }); gold(S, 1);
  no(S, 1, { t: 'end' }); no(S, 1, { t: 'ability', target: 2, take: 'gold' }); no(S, 1, { t: 'ability', target: 1, take: 'gold' });
  go(S, 1, { t: 'ability', target: 3, take: 'gold' }); assert.strictEqual(S.crown, 3); assert.strictEqual(S.players[1].gold, 3);
  end(S, 1);
  const K = game(4, chars, { crown: 2 }); round(K, { 0: ['assassin'], 1: ['emperor'] });
  go(K, 0, { t: 'ability', char: 'emperor' }); gold(K, 0); end(K, 0);
  assert.strictEqual(K.need.kind, 'heir'); assert.strictEqual(K.need.pid, 1);
  go(K, 1, { t: 'heir', target: 0 }); assert.strictEqual(K.crown, 0);
});
test('Bishop: the rank 8 character cannot touch his districts, unless he is killed', () => {
  const S = game(4, ALL8, { gold: 5 }); const tmp = put(S, 1, 'temple'); round(S, { 1: ['bishop'], 3: ['warlord'] });
  gold(S, 1); end(S, 1); gold(S, 3);
  no(S, 3, { t: 'ability', target: 1, uid: tmp.uid });
  const K = game(4, ALL8, { gold: 5 }); const t2 = put(K, 1, 'temple'); round(K, { 0: ['assassin'], 1: ['bishop'], 3: ['warlord'] });
  go(K, 0, { t: 'ability', char: 'bishop' }); gold(K, 0); end(K, 0); gold(K, 3);
  go(K, 3, { t: 'ability', target: 1, uid: t2.uid }); assert.strictEqual(K.players[1].city.length, 0); assert.strictEqual(K.players[3].gold, 7, 'a 1-cost district is free');
});
test('Abbot: gold and cards in any mix; the richest player gives him 1 gold', () => {
  const chars = ['assassin', 'thief', 'magician', 'king', 'abbot', 'merchant', 'architect', 'warlord'];
  const S = game(4, chars); put(S, 0, 'temple'); put(S, 0, 'church'); S.players[2].gold = 6; S.players[3].gold = 6;
  round(S, { 0: ['abbot'] }); gold(S, 0);
  go(S, 0, { t: 'gain', gold: 1 }); assert.strictEqual(S.players[0].gold, 3); assert.strictEqual(S.players[0].hand.length, 1);
  go(S, 0, { t: 'ability', from: 3 }); assert.strictEqual(S.players[3].gold, 5); assert.strictEqual(S.players[0].gold, 4);
  const R = game(4, chars); R.players[0].gold = 9; R.players[1].gold = 9; round(R, { 0: ['abbot'] }); gold(R, 0);
  no(R, 0, { t: 'ability', from: 1 });
});
test('Cardinal: short of gold, takes it from a player and gives a card for each gold', () => {
  const chars = ['assassin', 'thief', 'magician', 'king', 'cardinal', 'merchant', 'architect', 'warlord'];
  const S = game(4, chars); const pal = give(S, 0, 'palace'); const x = give(S, 0, 'temple'); S.players[2].gold = 4; S.players[0].gold = 2;
  round(S, { 0: ['cardinal'] }); gold(S, 0);
  go(S, 0, { t: 'build', uid: pal.uid, pay: 'cardinal', from: 2, give: [x.uid] });
  assert.deepStrictEqual(ids(S.players[0]), ['palace']); assert.strictEqual(S.players[0].gold, 0);
  assert.strictEqual(S.players[2].gold, 3); assert.deepStrictEqual(S.players[2].hand.map(c => c.id), ['temple']);
});
test('Alchemist: gold paid to build comes back at the end of the turn; the Poor House first', () => {
  const chars = ['assassin', 'thief', 'magician', 'king', 'bishop', 'alchemist', 'architect', 'warlord'];
  const S = game(4, chars); put(S, 0, 'poor-house'); const m = give(S, 0, 'tavern'); S.players[0].gold = 0;
  round(S, { 0: ['alchemist'] });
  go(S, 0, { t: 'gather', take: 'cards' }); go(S, 0, { t: 'keep', uids: [S.need.cards[0].uid] });
  S.players[0].gold = 1; go(S, 0, { t: 'build', uid: m.uid }); assert.strictEqual(S.players[0].gold, 0);
  end(S, 0); assert.strictEqual(S.players[0].gold, 1 + 1, 'Poor House 1, then the 1 gold back');
});
test('Trader builds any number of trade districts; Architect builds 3 and gains 2 cards; Navigator cannot build', () => {
  const chars = ['assassin', 'thief', 'magician', 'king', 'bishop', 'trader', 'architect', 'warlord'];
  const S = game(4, chars, { gold: 20 }); const ts = ['tavern', 'market', 'docks'].map(id => give(S, 0, id)); const pal = give(S, 0, 'palace');
  round(S, { 0: ['trader'] }); gold(S, 0);
  for (const c of ts) go(S, 0, { t: 'build', uid: c.uid });
  go(S, 0, { t: 'build', uid: pal.uid }); assert.strictEqual(S.players[0].city.length, 4);
  const A = game(4, ALL8, { gold: 20 }); const cs = ['manor', 'castle', 'palace', 'temple'].map(id => give(A, 0, id));
  round(A, { 0: ['architect'] }); gold(A, 0); assert.strictEqual(A.players[0].hand.length, 6);
  for (const c of cs.slice(0, 3)) go(A, 0, { t: 'build', uid: c.uid });
  no(A, 0, { t: 'build', uid: cs[3].uid });
  const chN = ['assassin', 'thief', 'magician', 'king', 'bishop', 'merchant', 'navigator', 'warlord'];
  const N = game(4, chN, { gold: 20 }); const n1 = give(N, 0, 'manor'); round(N, { 0: ['navigator'] }); gold(N, 0);
  no(N, 0, { t: 'build', uid: n1.uid }); go(N, 0, { t: 'ability', take: 'gold' }); assert.strictEqual(N.players[0].gold, 26);
});
test('Scholar: draws 7, keeps 1, the rest shuffled back; builds up to 2', () => {
  const chars = ['assassin', 'thief', 'magician', 'king', 'bishop', 'merchant', 'scholar', 'warlord'];
  const S = game(4, chars); const deck = S.deck.length; round(S, { 0: ['scholar'] }); gold(S, 0);
  go(S, 0, { t: 'ability' }); assert.strictEqual(S.need.cards.length, 7);
  go(S, 0, { t: 'keep', uids: [S.need.cards[3].uid] });
  assert.strictEqual(S.players[0].hand.length, 1); assert.strictEqual(S.deck.length, deck - 1);
  assert.strictEqual(S.cur.limit, 2);
});
test('Warlord: destroys for its cost less 1; not the Keep, not in a completed city; Great Wall costs 1 more', () => {
  const S = game(4, ALL8); const pal = put(S, 1, 'palace'); const k = put(S, 1, 'keep'); put(S, 2, 'great-wall'); const c2 = put(S, 2, 'castle');
  for (const id of ['manor', 'temple', 'tavern', 'watchtower', 'castle', 'palace', 'harbor']) put(S, 0, id);
  S.players[3].gold = 10; round(S, { 3: ['warlord'] }); gold(S, 3);
  no(S, 3, { t: 'ability', target: 1, uid: k.uid }); no(S, 3, { t: 'ability', target: 0, uid: S.players[0].city[0].card.uid });
  assert.strictEqual(warlordTargets(S, 3).find(o => o.uid === c2.uid).cost, 4);
  go(S, 3, { t: 'ability', target: 1, uid: pal.uid }); assert.strictEqual(S.players[3].gold, 12 - 4); assert.deepStrictEqual(ids(S.players[1]), ['keep']);
  assert.strictEqual(S.deck[0], pal, 'destroyed districts go under the deck');
});
test('Diplomat: exchanges districts, paying the difference; Marshal: seizes one costing 3 or less, paying its owner', () => {
  const chars = ['assassin', 'thief', 'magician', 'king', 'bishop', 'merchant', 'architect', 'diplomat'];
  const S = game(4, chars, { gold: 5 }); const mine = put(S, 0, 'temple'); const th = put(S, 1, 'palace');
  round(S, { 0: ['diplomat'] }); gold(S, 0);
  go(S, 0, { t: 'ability', mine: mine.uid, target: 1, uid: th.uid });
  assert.deepStrictEqual(ids(S.players[0]), ['palace']); assert.deepStrictEqual(ids(S.players[1]), ['temple']);
  assert.strictEqual(S.players[0].gold, 7 - 4); assert.strictEqual(S.players[1].gold, 5 + 4);
  const chM = ['assassin', 'thief', 'magician', 'king', 'bishop', 'merchant', 'architect', 'marshal'];
  const M = game(4, chM, { gold: 5 }); const big = put(M, 1, 'palace'); const sm = put(M, 1, 'monastery');
  round(M, { 0: ['marshal'] }); gold(M, 0);
  no(M, 0, { t: 'ability', target: 1, uid: big.uid });
  go(M, 0, { t: 'ability', target: 1, uid: sm.uid }); assert.deepStrictEqual(ids(M.players[0]), ['monastery']); assert.strictEqual(M.players[1].gold, 8);
});
test('Queen: 3 gold next to the rank 4 character; when it was killed, at the end of the round', () => {
  const chars = ALL8.concat('queen');
  const S = game(5, chars, { crown: 3 }); round(S, { 1: ['king'], 0: ['queen'] });
  gold(S, 1); end(S, 1); assert.strictEqual(turnOf(S), 'queen'); assert.strictEqual(S.players[0].gold, 3);
  const K = game(5, chars, { crown: 3 }); round(K, { 2: ['assassin'], 1: ['king'], 0: ['queen'] });
  go(K, 2, { t: 'ability', char: 'king' }); gold(K, 2); end(K, 2); gold(K, 0); assert.strictEqual(K.players[0].gold, 2); end(K, 0);
  assert.strictEqual(K.players[0].gold, 5, '+3 when the killed King is turned up'); assert.strictEqual(K.crown, 1);
});
test('Artist: beautified districts cost and score 1 more', () => {
  const chars = ALL8.concat('artist');
  const S = game(4, chars, { gold: 5 }); const m = put(S, 0, 'manor'); round(S, { 0: ['artist'] }); gold(S, 0);
  go(S, 0, { t: 'ability', uids: [m.uid] }); assert.strictEqual(S.players[0].gold, 6); assert.strictEqual(cityPoints(S.players[0]), 4);
});
test('Tax Collector: every builder pays 1 onto the token, he takes it on his turn and pays no tax himself', () => {
  const chars = ALL8.concat('tax-collector');
  const S = game(4, chars, { gold: 5 }); const a = give(S, 0, 'tavern'), b = give(S, 1, 'temple');
  round(S, { 0: ['magician'], 1: ['tax-collector'] });
  gold(S, 0); go(S, 0, { t: 'build', uid: a.uid }); assert.strictEqual(S.players[0].gold, 5 + 2 - 1 - 1); assert.strictEqual(S.tax, 1);
  end(S, 0); assert.strictEqual(S.players[1].gold, 6, 'he takes the token at the start of his turn');
  gold(S, 1); go(S, 1, { t: 'build', uid: b.uid }); assert.strictEqual(S.tax, 0); assert.strictEqual(S.players[1].gold, 7);
});

/* ── the unique districts ── */
test('Necropolis: built by destroying one of your districts', () => {
  const S = game(4); const t = put(S, 0, 'temple'); const n = give(S, 0, 'necropolis'); round(S, { 0: ['magician'] }); gold(S, 0);
  go(S, 0, { t: 'build', uid: n.uid, pay: 'necropolis', sacrifice: t.uid }); assert.deepStrictEqual(ids(S.players[0]), ['necropolis']);
});
test('Thieves\' Den: paid with cards; Factory: other unique districts cost 1 less', () => {
  const S = game(4); S.players[0].gold = 0; const td = give(S, 0, 'thieves-den'); const cs = [1, 2, 3, 4].map(() => give(S, 0, 'tavern'));
  round(S, { 0: ['magician'] }); gold(S, 0);
  go(S, 0, { t: 'build', uid: td.uid, pay: 'cards', cards: cs.map(c => c.uid) }); assert.strictEqual(S.players[0].gold, 0); assert.strictEqual(S.players[0].hand.length, 0);
  const F = game(4); put(F, 0, 'factory'); const lib = give(F, 0, 'library'); round(F, { 0: ['magician'] }); F.players[0].gold = 3; gold(F, 0);
  go(F, 0, { t: 'build', uid: lib.uid }); assert.strictEqual(F.players[0].gold, 0);
});
test('Stables do not count toward the limit; Monument counts as 2 and not with 5 districts; Secret Vault is never built', () => {
  const S = game(4, ALL8, { gold: 10 }); const st = give(S, 0, 'stables'), m = give(S, 0, 'manor'); round(S, { 0: ['magician'] }); gold(S, 0);
  go(S, 0, { t: 'build', uid: m.uid }); go(S, 0, { t: 'build', uid: st.uid }); assert.strictEqual(S.players[0].city.length, 2);
  const M = game(4, ALL8, { gold: 10 }); for (const id of ['manor', 'temple', 'tavern', 'watchtower']) put(M, 0, id); const mo = give(M, 0, 'monument'); const sv = give(M, 0, 'secret-vault');
  round(M, { 0: ['magician'] }); gold(M, 0); no(M, 0, { t: 'build', uid: sv.uid }); go(M, 0, { t: 'build', uid: mo.uid }); assert.strictEqual(cityCount(M.players[0]), 6);
  const X = game(4, ALL8, { gold: 10 }); for (const id of ['manor', 'temple', 'tavern', 'watchtower', 'castle']) put(X, 0, id); const mo2 = give(X, 0, 'monument');
  round(X, { 0: ['magician'] }); gold(X, 0); no(X, 0, { t: 'build', uid: mo2.uid });
});
test('Laboratory, Smithy, Museum: once per turn each', () => {
  const S = game(4, ALL8, { gold: 4 }); put(S, 0, 'laboratory'); put(S, 0, 'smithy'); put(S, 0, 'museum'); const a = give(S, 0, 'manor'), b = give(S, 0, 'temple'); give(S, 0, 'church');
  round(S, { 0: ['magician'] }); gold(S, 0);
  go(S, 0, { t: 'lab', uid: a.uid }); assert.strictEqual(S.players[0].gold, 8); no(S, 0, { t: 'lab', uid: b.uid });
  go(S, 0, { t: 'smithy' }); assert.strictEqual(S.players[0].gold, 6); assert.strictEqual(S.players[0].hand.length, 5);
  go(S, 0, { t: 'museum', uid: b.uid }); assert.strictEqual(S.players[0].city.find(e => e.card.id === 'museum').museum.length, 1);
});
test('Armory: destroyed to destroy any district not in a completed city; Park and Poor House at the end of the turn', () => {
  const S = game(4); put(S, 0, 'armory'); const pal = put(S, 1, 'palace'); put(S, 0, 'park'); put(S, 0, 'poor-house');
  round(S, { 0: ['magician'] }); go(S, 0, { t: 'gather', take: 'cards' }); go(S, 0, { t: 'keep', uids: [S.need.cards[0].uid] });
  go(S, 0, { t: 'armory', target: 1, uid: pal.uid }); assert.strictEqual(S.players[1].city.length, 0); assert(!has(S.players[0], 'armory'));
  S.deck.push(...S.players[0].hand); S.players[0].hand = []; end(S, 0);
  assert.strictEqual(S.players[0].hand.length, 2, 'Park'); assert.strictEqual(S.players[0].gold, 1, 'Poor House');
});
test('end-of-game districts: Haunted Quarter fills a type, Wishing Well, Ivory Tower, Map Room, Treasury, Statue, Secret Vault, Basilica, Capitol, Dragon Gate', () => {
  const S = game(4);
  const P = S.players[0];
  for (const id of ['manor', 'temple', 'tavern', 'haunted-quarter', 'dragon-gate']) put(S, 0, id);
  let s = scoreOf(S, P);
  assert(s.lines.find(l => l.id === 'types'), 'the Haunted Quarter as military completes the five types');
  assert.strictEqual(s.hqAs, 'military');
  for (const id of ['wishing-well', 'map-room', 'imperial-treasury', 'statue', 'basilica', 'capitol']) put(S, 0, id);
  P.gold = 4; give(S, 0, 'secret-vault'); give(S, 0, 'tavern'); S.crown = 0;
  s = scoreOf(S, P);
  const pts = id => (s.lines.find(l => l.id === id) || { pts: 0 }).pts;
  assert.strictEqual(pts('dragon-gate'), 2); assert.strictEqual(pts('map-room'), 2); assert.strictEqual(pts('imperial-treasury'), 4);
  assert.strictEqual(pts('statue'), 5); assert.strictEqual(pts('secret-vault'), 3); assert.strictEqual(pts('capitol'), 3);
  assert.strictEqual(pts('basilica'), P.city.filter(e => e.card.cost % 2).length);
  const I = game(4); for (const id of ['manor', 'ivory-tower']) put(I, 0, id); assert.strictEqual((scoreOf(I, I.players[0]).lines.find(l => l.id === 'ivory-tower') || {}).pts, 5);
});

/* ── whole games with random moves never break the rules' bookkeeping ── */
test('random games at every table size end', () => {
  for (let g = 0; g < 70; g++) {
    const n = 2 + (g % 7), set = PRESETS[g % PRESETS.length];
    const S = newGame({ seed: g * 31 + 5, names: Array.from({ length: n }, (_, i) => 'P' + i), ai: Array(n).fill(true), chars: charsFor(set, n, true), uniques: set.uniques });
    S.quiet = true; startGame(S);
    const R = { rs: g + 1 };
    for (let k = 0; k < 5000 && !S.over; k++) { const ms = legalMoves(S, S.need.pid); assert(ms.length); assert(act(S, S.need.pid, ms[Math.floor(rnd(R) * ms.length)])); }
    assert(S.over);
  }
});
console.log(`${passed} rule tests passed`);
