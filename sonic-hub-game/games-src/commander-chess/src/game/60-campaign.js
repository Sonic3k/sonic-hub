/* ── The campaign: where the journey goes, who waits there, what they say, and what is kept ──
   The Meridian League keeps its officers sharp on the sand table: every spring the Grand Maneuvers go round the
   coast from garrison to garrison. The player is a new lieutenant working along it.

   Every place has the whole range of players, from someone who learned the game last month to its own master
   (Ngọc Anh's rule: no place is "the beginners' place"). Points are won and lost by rating, the way chess clubs
   count them; reaching a number of points opens the next opponent, and the next place.

   Pictures of the women come from outside (ART.base, set when there is a place to load them from): until then each
   has a drawn stand-in. Each has three cards to win. */
const ART = { base: '' };                                     // e.g. 'https://cdn.example/commander-chess/' → <base><id>/portrait.webp, card-1.webp …
const START_RATING = 600, K_FACTOR = 32;
const CARD_WINS = [1, 3, 5];                                  // wins against her that earn her first, second and third card

const PLACES = [
  { id: 'halcyon', name: 'Port Halcyon', room: 'The Harbour Mess', open: 0, built: true,
    blurb: 'The fleet’s home port. After the evening gun the officers’ mess above the docks clears a table, and nobody goes to bed until the last Commander has fallen.',
    house: 'The standard line-up, and a game of battles: it ends with a Commander, or with a side’s last ship, its last plane, or the last of its infantry, tanks and artillery. The Commandant alone plays total war.' },
  { id: 'kestrel', name: 'Kestrel Field', room: 'The Ready Room', open: 760, built: false,
    blurb: 'The air station on the northern cliffs. The pilots play fast, between scrambles, and they do not believe in holding anything back.',
    house: 'Battles, from the pilots’ own line-up: their planes start well forward.' },
  { id: 'ironwood', name: 'Ironwood Depot', room: 'The Motor Pool', open: 900, built: false,
    blurb: 'The armoured brigade’s workshops in the pine hills. Games are played on an engine crate, and settled on the bridges.',
    house: 'Battles, from the brigade’s line-up: armour massed on the fords.' },
  { id: 'meridian', name: 'Fort Meridian', room: 'The Gun Deck', open: 1050, built: false,
    blurb: 'The old fortress over the strait. Its gunners have had two hundred years to learn patience.',
    house: 'Battles, and you set out your own line-up before the first move, as the fortress does.' },
  { id: 'admiralty', name: 'The Admiralty', room: 'The Long Table', open: 1250, built: false,
    blurb: 'The capital. The staff who write the Maneuvers play here, under the portraits of everyone who ever beat them.',
    house: 'Total war over two games, one moving first and one moving second, each side with its own line-up.' },
];

/* rating: the order is measured by letting the five play each other (tools/sim.js; the scores are in the README), the
   spacing is set narrower than those scores say. needs: points that open her. */
const WOMEN = [
  { id: 'pia', place: 'halcyon', name: 'Pia Lindqvist', rank: 'Ensign', job: 'Signals officer, first posting', level: 'Easiest', rating: 500, needs: 0,
    hair: 'bob', tone: ['#f6c56a', '#e98a5b', '#fff3d6'],
    style: 'Moves first and thinks afterwards. Loves her planes, forgets everything else.',
    cards: [['On watch', 'Three flags up, two of them right.'], ['Off watch', 'She learned the rules last month and the ukulele last week.'], ['Shore leave', 'First one down the gangway, last one back.']],
    say: {
      intro: ['Oh! You’re the new lieutenant. I’m Pia. I do signals, so if a flag is upside down today, that was me.', 'They said I should practise on someone. No offence. I mean, I’m sure you’re very good.', 'I’ve nearly got the hang of the planes. The rest is… around here somewhere.'],
      rematch: ['You came back! Nobody comes back. Sit, sit.', 'I’ve been practising. Against myself. I lost, but it was close.'],
      start: ['Red goes first, that’s you. Unless it’s me. No, it’s you.', 'Go easy on me? Actually, don’t. Actually, do.'],
      sheTakes: ['I got one! Did you see that? I got one!', 'Wait, that was allowed? I’m keeping it.', 'Mine now. Sorry. Not sorry. A little sorry.'],
      youTake: ['Oh. I was using that.', 'Hey! …No, fair. That’s fair.', 'I liked that one. It had a little flag.'],
      sheLosesPlane: ['My plane! They cost so much!', 'Nobody told me that gun was there. You should have told me.'],
      youLosePlane: ['Ha! Out of the sky! Was that me? That was me!'],
      check: ['Is that check? I think that’s check. Check!', 'Your Commander looks nervous. I would be.'],
      checked: ['Oh no. Oh no no no.', 'Don’t look at my Commander like that.'],
      hero: ['She’s a hero now! I’m going to give her a medal. A real one. I have ribbon.'],
      lastYours: ['That’s your last one, isn’t it? I counted. Twice.', 'One more and it’s over! …Did I say that out loud?'],
      lastHers: ['I only have one left. Nobody look at it.', 'Um. That was not supposed to be my last one.'],
      ahead: ['Am I winning? Don’t tell me. I’ll get nervous.'],
      behind: ['It’s fine. It’s fine! I have a plan. I’m about to have a plan.'],
      idle: ['Do you think the pieces mind being carried? I’d like being carried.', 'Take your time. I’ll just be here. Winning. Possibly.'],
      win: ['I won? I WON! I have to tell everyone. Don’t move, I’ll be right back.', 'That’s one for signals! Same time tomorrow?'],
      lose: ['Well. That was educational. For me, mostly.', 'You’re good. I’m going to say I let you win. I didn’t, but I’m going to say it.'],
      draw: ['A draw! That’s basically winning. For me it is.'],
    } },
  { id: 'sol', place: 'halcyon', name: 'Marisol Ortega', rank: 'Chief', job: 'Deck chief of the Corvina', level: 'Easy', rating: 950, needs: 610,
    hair: 'curls', tone: ['#ff8c5a', '#c8324b', '#ffe9c9'],
    style: 'Takes whatever is on the table and laughs about it. Rarely asks what it costs.',
    cards: [['Deck chief', 'Twelve years at sea and she has never paid for her own drink.'], ['Dockside', 'The Corvina sails at six. Sol sails when she is ready.'], ['Fiesta', 'Port Halcyon has one dance floor. It is wherever she is standing.']],
    say: {
      intro: ['So you’re the one who beat our ensign. Congratulations, you can beat a signal flag.', 'Marisol. Everybody says Sol. I run the deck on the Corvina and I run this table after dark.', 'House rule: loser buys. I hope they pay lieutenants well.'],
      rematch: ['Back for more? I like that in a customer.', 'Sit down, Lieutenant. My glass is empty and that’s your problem.'],
      start: ['Put something where I can reach it. Go on.', 'I don’t do plans. I do appetite.'],
      sheTakes: ['Thank you very much.', 'You left it lying about. What’s a woman to do?', 'Mm. I’ll have that.', 'That’s another round you owe me.'],
      youTake: ['Hey, hey. Hands.', 'All right. I had that coming.', 'Enjoy it. I’m taking two back.'],
      sheLosesPlane: ['Planes. I never trusted anything that can’t float.'],
      youLosePlane: ['Down she comes! Somebody get the lieutenant a towel.'],
      check: ['Knock knock, Commander.', 'Check. Don’t sweat on my board.'],
      checked: ['Cheeky. I’m almost impressed.', 'Careful where you point that.'],
      hero: ['Hero! Drinks for the hero. On you.'],
      lastYours: ['One left, Lieutenant. I’d keep it somewhere I can’t see.', 'Down to your last. This is the fun part.'],
      lastHers: ['One left. Good. I was carrying too many anyway.', 'Touch my last one and we are going to have words.'],
      ahead: ['You’re running out of things for me to take, Lieutenant.'],
      behind: ['Quiet, you. I’m thinking. It happens.'],
      idle: ['You always take this long? No wonder you’re still a lieutenant.', 'The board won’t bite. I might.'],
      win: ['And that’s the table. Mine’s a rum, the good one.', 'Don’t look so sad. You lose very prettily.'],
      lose: ['Well, damn. All right, what are you drinking?', 'You got me. Don’t let it go to your head, it’s small enough.'],
      draw: ['Nobody buys? Worst possible result.'],
    } },
  { id: 'hana', place: 'halcyon', name: 'Hana Sorel', rank: 'Lieutenant', job: 'Gunnery officer, shore batteries', level: 'Moderate', rating: 1350, needs: 640,
    hair: 'long', tone: ['#5fb4c9', '#1f5d8c', '#e9f6ff'],
    style: 'Guns and ships, set up with care. She does not give pieces away, and she shells anything that stands still.',
    cards: [['Fire control', 'She corrects the tables in ink.'], ['Range day', 'Ear defenders on, one eyebrow up.'], ['Evening gun', 'Sunset, the battery wall, and for once nothing to correct.']],
    say: {
      intro: ['Lieutenant. Hana Sorel, shore batteries. I’ve read your games against the Chief.', 'You win when people hand you things. I don’t hand people things.', 'Shall we find out what you do then?'],
      rematch: ['Again? Good. I made notes on the last one.', 'I thought you might be back. I kept the pieces set.'],
      start: ['Take your time. Range is a matter of patience.', 'Everything on this board is in reach of something. Work out what.'],
      sheTakes: ['On target.', 'That piece was standing still. I don’t know what you expected.', 'Corrected.', 'You measured that badly.'],
      youTake: ['Noted.', 'Hm. I allowed for that. Mostly.', 'A fair shot. You won’t get the same one twice.'],
      sheLosesPlane: ['An acceptable loss. I never rely on aircraft.'],
      youLosePlane: ['My gunners thank you for the practice.'],
      check: ['Check. I’d move, if I were you. Precisely.', 'Your Commander is bracketed.'],
      checked: ['Bold. Let’s see if it was sound.', 'You have my attention.'],
      hero: ['Promoted in the field. She earned it.'],
      lastYours: ['You have one left of those. I have its range.', 'One more loss there and the battle is mine. I’m only telling you once.'],
      lastHers: ['My last. It will not be standing where you expect.', 'Noted. That one is now under orders to be careful.'],
      ahead: ['The arithmetic is not on your side. It rarely argues.'],
      behind: ['I’ve made an error somewhere. I will find it. Then I’ll find you.'],
      idle: ['Silence is fine. I like to hear people think.', 'There is a good move here. I wonder if you’ll see it.'],
      win: ['Thank you for the game. Your third move was the mistake, if you’d like to know.', 'That’s that. You’re better than your record, for what it’s worth.'],
      lose: ['Well played. I mean that, and I don’t say it often.', 'I’ll want that one back, Lieutenant. Not tonight. I need to think.'],
      draw: ['Level. I can live with level. I don’t have to like it.'],
    } },
  { id: 'nadia', place: 'halcyon', name: 'Nadia Rahimi', rank: 'Commander', job: 'Captain of the destroyer Simurgh', level: 'Hard', rating: 1700, needs: 670,
    hair: 'wave', tone: ['#ffb238', '#b3273a', '#fff0d0'],
    style: 'Attacks from the first move and goes straight for your Commander. She will trade anything for speed.',
    cards: [['Simurgh', 'Fastest ship in the flotilla. She says it is the paint.'], ['Night run', 'Lights out, thirty knots, and that smile.'], ['The wager', 'She only bets on herself. So far it has paid.']],
    say: {
      intro: ['So this is the lieutenant Hana keeps frowning about. Come here, let me look at you.', 'Nadia Rahimi. I drive the Simurgh. I don’t sit behind rivers and I don’t wait to be asked.', 'I’m coming for your Commander, darling. You can hide it, or you can come and get mine first.'],
      rematch: ['There you are. I was getting bored of winning against the others.', 'Back already? Careful, Lieutenant. I could get used to you.'],
      start: ['First one across the river buys nothing and wins everything.', 'Don’t build me a wall. Walls are so dull.'],
      sheTakes: ['Mine.', 'You were always going to lose that one. I just hurried it up.', 'Lovely. What else have you got?', 'Keep them coming.'],
      youTake: ['Ooh. You bite.', 'Take it. I’ve got more, and I’m already past you.', 'Good. I hate an easy evening.'],
      sheLosesPlane: ['Worth it. Look where I am now.'],
      youLosePlane: ['Did you need that? Too late.'],
      check: ['Check, darling.', 'Run along, Commander. I’ll be right behind you.'],
      checked: ['Oh, I like you.', 'Close. Very close. Now watch.'],
      hero: ['A hero. She gets it from me.'],
      lastYours: ['Your last one, darling. I’ll be gentle. No, I won’t.', 'One left. Hide it well; I do love looking.'],
      lastHers: ['My last one? Then I’ll just have to finish sooner.', 'Careful. I’m more dangerous with less to lose.'],
      ahead: ['You’re bleeding, Lieutenant. I can smell it from here.'],
      behind: ['Now it gets interesting. I’m at my best when I’m behind.'],
      idle: ['Tick, tock. The Simurgh would be in the next port by now.', 'Thinking? Don’t. Just come at me.'],
      win: ['And that’s the port taken. You were fun. Come back when you’re faster.', 'Don’t pout. You lasted longer than the Admiral’s aide.'],
      lose: ['Well. Well, well. Nobody’s done that to me in a while. Say you’ll play me again.', 'You beat me to it. I may have to keep you, Lieutenant.'],
      draw: ['A draw. How unsatisfying. We’ll have to do it again, properly.'],
    } },
  { id: 'isolde', place: 'halcyon', name: 'Isolde Varga', rank: 'Captain', job: 'Commandant of Port Halcyon', level: 'Hardest', rating: 2000, needs: 700, game: 'total',
    hair: 'updo', tone: ['#c9a4ff', '#3b2a78', '#f4ecff'],
    style: 'Total war: only the Commander counts. She gives you nothing and waits; by the time you see what she wanted, she has had it for five moves.',
    cards: [['The Commandant', 'Port Halcyon runs on her signature.'], ['The long table', 'She has not lost at this table since the old Admiral retired.'], ['After hours', 'Her door is open after ten. Bring the board.']],
    say: {
      intro: ['Lieutenant. Do sit. I am Captain Varga; this is my port, and for the moment this is my table.', 'They tell me you beat Commander Rahimi. She will have enjoyed that more than she lets on.', 'I should say that I do not attack, and I do not hurry. I simply wait for you to tell me how you would like to lose.', 'One thing more. Downstairs they stop when the last ship goes down. At my table we play total war: nothing ends it but a Commander.'],
      rematch: ['Good evening, Lieutenant. I wondered how long your pride would need.', 'You again. I’m glad. Most people only try me once.'],
      start: ['Whenever you’re ready. I have all night, and the keys to the building.', 'Show me something I have not seen. I’ve been here a long time.'],
      sheTakes: ['Thank you.', 'I’m afraid that was decided some moves ago.', 'Yes. That one.', 'You saw it too, just now. A little late.'],
      youTake: ['Yes, you may have that.', 'Interesting. I had not priced that in. Well done.', 'Enjoy it. It was the cheap part of the bargain.'],
      sheLosesPlane: ['It had done what I needed.'],
      youLosePlane: ['The sky over Halcyon is mine, Lieutenant. It’s in the regulations.'],
      check: ['Check.', 'Your Commander has fewer places to go than you think. Count them.'],
      checked: ['Ah. Good. Now we’re playing.', 'Brave. Let us see whether it was also correct.'],
      hero: ['Promoted. I do like to reward good work.'],
      lastYours: ['One remains, Lieutenant. Look after it better than you did its sister.', 'Your last. I shall take my time over it.'],
      lastHers: ['My last. You will find it better guarded than the first.', 'So. You have my attention, and my last one.'],
      ahead: ['You are playing well. It will not be enough, but I wanted you to know.'],
      behind: ['You have me under some pressure. I had forgotten how that feels. Thank you.'],
      idle: ['No hurry. The tide comes in whether we watch it or not.', 'You’re looking for a way through. There is one. I left it for you.'],
      win: ['Thank you, Lieutenant. You held on longer than you had any right to.', 'A good evening. Come back when you have understood why you lost. I will explain it if you ask nicely.'],
      lose: ['…Well. I shall have to have a new portrait made for the wall. Yours, Lieutenant.', 'Beaten at my own table. Come and see me tomorrow. I think the League has plans for you, and so do I.'],
      draw: ['Level. Do you know how few people leave this table level? Be pleased with yourself.'],
    } },
];
const womanById = id => WOMEN.find(w => w.id === id), placeById = id => PLACES.find(p => p.id === id);
const RANKS = [[0, 'Lieutenant'], [760, 'Lieutenant Commander'], [1000, 'Commander'], [1300, 'Captain'], [1600, 'Commodore'], [1900, 'Admiral']];
const rankFor = r => RANKS.filter(x => r >= x[0]).pop()[1];

/* ── points ── */
const expected = (mine, hers) => 1 / (1 + Math.pow(10, (hers - mine) / 400));
/** points for a result against her: result 1 win, 0.5 draw, 0 loss */
const pointsFor = (mine, hers, result) => { const p = Math.round(K_FACTOR * (result - expected(mine, hers))); return result === 1 ? Math.max(1, p) : p; };   // a win is never worth nothing

/* ── what is kept between visits ── */
const STORE = 'commander-chess.v1';
const RULES = 2;                                              // 2: the author's own rules. A game begun under other rules is not gone back to.
const freshSave = () => ({ rating: START_RATING, peak: START_RATING, record: {}, met: {}, seen: {}, sound: true, side: 0, all: false, match: null, rules: RULES });
let SAVE = freshSave();
function loadSave() {
  try { const d = JSON.parse(localStorage.getItem(STORE) || 'null'); if (d && typeof d.rating === 'number') { if (d.rules !== RULES) { d.match = null; d.rules = RULES; } SAVE = Object.assign(freshSave(), d); } } catch (e) { /* nothing kept: start fresh */ }
  return SAVE;
}
function keep() { try { localStorage.setItem(STORE, JSON.stringify(SAVE)); } catch (e) { /* a browser that keeps nothing: the game still plays */ } }
const recordOf = id => SAVE.record[id] || { w: 0, l: 0, d: 0 };
const isOpen = w => SAVE.all || SAVE.peak >= w.needs;
const placeOpen = p => p.built && (SAVE.all || SAVE.peak >= p.open);
/** the cards of hers that have been won: [true, false, false] */
const cardsWon = w => CARD_WINS.map(n => recordOf(w.id).w >= n);
const cardCount = () => WOMEN.reduce((n, w) => n + cardsWon(w).filter(Boolean).length, 0);

/** Writes a finished rated game into the save. Returns what changed, for the result screen. */
function scoreGame(w, result) {
  const before = SAVE.rating, delta = pointsFor(before, w.rating, result), had = cardsWon(w), openBefore = WOMEN.filter(isOpen).map(x => x.id), placesBefore = PLACES.filter(p => SAVE.peak >= p.open).map(p => p.id);
  const r = SAVE.record[w.id] = recordOf(w.id);
  if (result === 1) r.w++; else if (result === 0) r.l++; else r.d++;
  SAVE.rating = Math.max(100, before + delta); SAVE.peak = Math.max(SAVE.peak, SAVE.rating); SAVE.match = null;
  keep();
  const now = cardsWon(w);
  return { before, after: SAVE.rating, delta, newCards: now.map((v, i) => (v && !had[i] ? i : -1)).filter(i => i >= 0),
    newWomen: WOMEN.filter(x => isOpen(x) && !openBefore.includes(x.id)), newPlaces: PLACES.filter(p => SAVE.peak >= p.open && !placesBefore.includes(p.id)) };
}
const pick = list => list[Math.floor(Math.random() * list.length)];
