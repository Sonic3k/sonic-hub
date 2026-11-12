/* ── View: the table drawn from the state, or from the snapshot of the event being shown ── */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const UI = { screen: 'menu', sel: null, busy: false, view: null, calling: null, killedWas: null, flash: null, hint: '', drawer: false, known: null, cards: new Map(), hideNeed: false, form: null, post: [] };
/* each seat has its own colour, shown on its badge */
const PC = ['#3d63b8', '#b8452f', '#3f8a5c', '#8a55b5', '#c0861a', '#2b8a96', '#b5476f', '#76683a'];
const ICON = {
  menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  scroll: '<svg viewBox="0 0 24 24"><path d="M6 4h11a3 3 0 0 1 0 6h-1v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 4a3 3 0 0 0-3 3v3M8 9h4M8 13h5M8 16h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 11v6M12 7.6v.2" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M12 6.6C10 5.1 7.5 4.6 4 4.9v13c3.5-.3 6 .2 8 1.7 2-1.5 4.5-2 8-1.7v-13c-3.5-.3-6 .2-8 1.7zM12 6.6v13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12c3-5.5 17-5.5 20 0-3 5.5-17 5.5-20 0z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
};
/* a region is rewritten only when its markup changes, so nothing under the pointer is rebuilt for nothing */
function put(el, html) { if (typeof el === 'string') el = $(el); if (!el || el._html === html) return false; el.innerHTML = html; el._html = html; return true; }
function forget(el) { if (el) el._html = null; }
/* what the table shows: the snapshot of the event being played, or the state itself */
const V = () => UI.view || publicView(S);

/* ── names ── */
const nameOf = pid => (pid === 0 ? 'You' : S.players[pid].name);
const objOf = pid => (pid === 0 ? 'you' : S.players[pid].name);
const possOf = pid => (pid === 0 ? 'your' : S.players[pid].name + '’s');
const vb = (pid, you, they) => (pid === 0 ? you : they);
const theC = c => 'the ' + CHAR[c].name;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + 's'}`;
function badge(pid) { return `<span class="badge" style="--pc:${PC[pid % PC.length]}">${pid === 0 ? '★' : esc(S.players[pid].name[0])}</span>`; }
const toneOf = c => { const g = CHAR[c] && CHAR[c].gain; return g ? 't-' + g.type : 't-none'; };

/* ── keywords: the words that carry the rules print bold in their own colour, with the number that goes with them, as in the
   Mayhem games: gold, cards, points, building, harm (kill, rob, destroy, bewitch…), the crown, and the five district types
   (these also wear their gem, the one on the cards). Times ("at the end of the game") and characters are bold. Texts may mark
   words as {gold}, {cards}, {noble}…; the rest is found by its wording. ── */
const KW_NAMES = CHARACTERS.map(c => c.name).sort((a, b) => b.length - a.length).join('|');
const KW_RE = new RegExp([
  '([+]?\\d+ (?:extra )?points?\\b|\\bpoints?\\b|\\bscores? \\d+ more\\b|\\b[Bb]eautif(?:y|ies|ied)\\b)',
  "([+]?\\d+ (?:extra |more )?gold(?: less| more)?\\b|\\b\\d+ of (?:their |your |its )?gold\\b|\\ball (?:of )?(?:the |its |their |your |its player['’]s )?gold\\b|\\bhalf (?:of )?(?:their |your )?gold\\b|\\b[Gg]old\\b(?! Mine))",
  '(\\b[Dd]raws? \\d+(?: (?:extra )?cards?)?\\b|[+]?\\d+ (?:extra |random |more |district )?cards?\\b|\\ba (?:random )?card\\b|\\b[Cc]ards?\\b)',
  '\\b(noble|religious|trade|military|unique)\\b',
  '\\b(crown)\\b',
  '(\\b(?:[Kk]ill(?:s|ed)?|[Rr]ob(?:s|bed)?|[Dd]estroy(?:s|ed|ing)?|[Bb]ewitch(?:es|ed)?|[Cc]onfiscat(?:e|es|ed)|[Ss]eiz(?:e|es|ed)|[Ee]xchang(?:e|es|ed)|[Ww]arrants?|[Tt]hreats?)\\b)',
  '(\\b(?:[Bb]uild(?:s|ing)?|[Bb]uilt)\\b(?: (?:up to )?\\d+(?: districts?)?\\b| limit\\b)?)',
  '(\\b(?:[Aa]t the end of (?:the game|your turn|the round|this round|each selection phase)|[Oo]nce (?:per|a|in your) turn|[Dd]uring your turn)\\b)',
  `(\\b(?:the rank \\d character|[Rr]ank \\d|${KW_NAMES})\\b)`,
].join('|'), 'g');
const KW_CLASS = ['pts', 'gold', 'card', 'type', 'crown', 'harm', 'build', 'when', 'who'];
const gemIc = t => typeGem(t, 14).replace('class="gem"', 'class="ic gem"').replace(/aria-label="[^"]*"/, 'aria-hidden="true"');
const kwB = (cls, html) => `<b class="kw k-${cls}">${html}</b>`;
function kw(text) {
  const raw = String(text).replace(/\{(\w+)\}/g, (m, k) => (TYPES[k] ? TYPES[k].name.toLowerCase() : k));
  let out = '', last = 0;
  for (const m of raw.matchAll(KW_RE)) {
    const cls = KW_CLASS[m.slice(1).findIndex(x => x !== undefined)], word = m[0];
    out += esc(raw.slice(last, m.index)) + (cls === 'type' ? kwB(word, gemIc(word) + esc(word)) : kwB(cls, esc(word)));
    last = m.index + word.length;
  }
  return out + esc(raw.slice(last));
}
/* the short texts printed on unique district cards (the full text is in the card's sheet and in the codex) */
const UNIQUE_SHORT = {
  armory: 'Destroy it to destroy any 1 district.', basilica: '+1 point per district with an odd cost.', capitol: '+3 points with 3 districts of one type.',
  'dragon-gate': 'Scores 2 extra points.', factory: 'Other {unique} districts cost 1 {gold} less.', framework: 'Destroy it to build a district for free.',
  'gold-mine': 'Take 1 more {gold} when you gather gold.', 'great-wall': 'Rank 8 pays 1 more {gold} to touch your other districts.', 'haunted-quarter': 'Counts as any type at the end.',
  'imperial-treasury': '+1 point per {gold} at the end.', 'ivory-tower': '+5 points if it is your only {unique} district.', keep: 'Rank 8 cannot touch it.',
  laboratory: 'Once a turn: discard 1 {card} for 2 {gold}.', library: 'Drawing {cards}: keep them all.', 'map-room': '+1 point per {card} in your hand.',
  monument: 'Counts as 2 districts. Not with 5 or more.', museum: 'Once a turn: 1 {card} under it, +1 point each.', necropolis: 'Build it by destroying a district of yours.',
  observatory: 'Drawing {cards}: draw 3 instead of 2.', park: 'Empty hand at the end of your turn: +2 {cards}.', 'poor-house': 'No {gold} at the end of your turn: +1 {gold}.',
  quarry: 'You may build districts you already have.', 'school-of-magic': 'Counts as any type for your character’s gains.', 'secret-vault': 'Cannot be built. +3 points in your hand.',
  smithy: 'Once a turn: pay 2 {gold} for 3 {cards}.', stables: 'Does not count toward your building limit.', statue: '+5 points if you hold the {crown}.',
  theater: 'After the selection, swap characters with a rival.', 'thieves-den': 'Pay for it with {cards} as well as {gold}.', 'wishing-well': '+1 point per {unique} district.',
};

/* ── cards ── */
const staticDistrict = id => ({ uid: 0, id, name: DISTRICT[id].name, type: DISTRICT[id].type, cost: DISTRICT[id].cost });
function districtHTML(card, o = {}) {
  const d = DISTRICT[card.id], cost = o.cost != null ? o.cost : card.cost;
  const text = d.type === 'unique' ? kw(UNIQUE_SHORT[card.id] || d.text) : `<span class="kind">${TYPES[d.type].name}</span>`;
  return `<div class="card dc t-${d.type} ${o.size || ''} ${o.cls || ''}" data-uid="${card.uid || ''}" data-id="${card.id}" ${o.attrs || ''}><div class="cf"><div class="cb"><div class="cn"><span>${esc(d.name)}</span></div><div class="cart">${artSVG(card.id)}</div><div class="ct"><span>${text}</span></div></div></div>`
    + `<span class="cost${cost == null ? ' free' : ''}">${cost == null ? '–' : cost}</span><span class="tgem">${typeGem(d.type)}</span>${o.beau ? '<span class="beau">+1</span>' : ''}${o.mus ? `<span class="mus">+${o.mus}</span>` : ''}</div>`;
}
function charHTML(c, o = {}) {
  const C = CHAR[c];
  return `<div class="card cc ${toneOf(c)} ${o.size || ''} ${o.cls || ''}" data-char="${c}" ${o.attrs || ''}><div class="cf"><div class="cb"><div class="cn"><span>${esc(C.name)}</span></div><div class="cart">${artSVG(c)}</div><div class="ct"><span>${kw(C.short)}</span></div></div></div><span class="rank">${C.rank}</span>${C.gain ? `<span class="tgem">${typeGem(C.gain.type)}</span>` : ''}</div>`;
}
const backHTML = (o = {}) => `<div class="cback ${o.cls || ''}" style="${o.style || ''}">${artSVG('mask', '')}</div>`;
const worthOf = e => (e.card.cost || 0) + (e.beau ? 1 : 0);

/* ── the city of a player as the table shows it ── */
function cityOf(v, pid) { return v.p[pid].city.map(([uid, beau, mus]) => ({ card: UI.cards.get(uid), beau, mus })).filter(e => e.card); }
const cityPts = city => sum(city, worthOf);
const cityCnt = city => city.length + (city.some(e => e.card.id === 'monument') ? 1 : 0);

/* ── seats ── */
function chipHTML(c, o = {}) {
  const C = CHAR[c], tip = `${C.rank} · ${C.name}${o.dead ? ' (killed)' : ''}: ${C.short}`;
  return `<span class="chip ${toneOf(c)}${o.dead ? ' dead' : ''}" data-char="${c}" data-tip="${esc(tip)}"><span class="cd">${artSVG(c, '')}</span><span class="t">${esc(C.name)}</span>${o.dead ? `<span class="x">${ic('skull')}</span>` : ''}</span>`;
}
const hiddenChip = mine => `<span class="chip hid" data-tip="${mine ? 'Your character' : 'A character not called yet'}">${artSVG('mask', '')}<span class="t">?</span></span>`;
/* what the table knows of a player's characters this round: the ones called (and a killed one, once turned up); the rest face down */
function charChips(pid, v) {
  if (v.phase === 'setup') return '';
  if (pid === 0) return S.players[0].chars.map(c => chipHTML(c, { dead: v.killed === c && (v.phase !== 'select') })).join('');
  const known = Object.keys(v.revealed).filter(c => v.revealed[c] === pid);
  const kw2 = UI.killedWas && UI.killedWas.pid === pid && !known.includes(UI.killedWas.char) ? UI.killedWas.char : null;
  const n = Math.max(v.p[pid].chars, known.length + (kw2 ? 1 : 0));
  return known.map(c => chipHTML(c)).join('') + (kw2 ? chipHTML(kw2, { dead: true }) : '') + Array.from({ length: n - known.length - (kw2 ? 1 : 0) }, () => hiddenChip(false)).join('');
}
function miniTile(e) { const d = DISTRICT[e.card.id]; return `<i class="mt t-${d.type}${e.beau ? ' b' : ''}" data-uid="${e.card.uid}" data-tip="${esc(d.name)}: ${TYPES[d.type].name.toLowerCase()}, ${worthOf(e)} point${worthOf(e) === 1 ? '' : 's'}${e.beau ? ' (beautified)' : ''}${e.mus ? `, ${e.mus} under it` : ''}">${worthOf(e)}</i>`; }
function statsHTML(pid, pv, city) {
  return `<div class="stats"><span class="g" data-tip="Gold">${ic('gold')}<b>${pv.gold}</b></span><span class="h" data-tip="Cards in hand">${ic('card')}<b>${pv.hand}</b></span><span class="p" data-tip="Points from districts so far (bonuses are added at the end)">${ic('points')}<b>${cityPts(city)}</b></span><span class="dist" data-tip="Districts built, of the ${S.size} that complete a city">${cityCnt(city)}/${S.size}</span></div>`;
}
function seatHTML(pid, v, mine) {
  const P = S.players[pid], pv = v.p[pid], city = cityOf(v, pid), crown = v.crown === pid, turn = v.phase === 'turns' && v.cur && v.cur.pid === pid;
  /* on a phone a rival's characters and the crown sit at the start of the city row, so the name keeps the head */
  const small = mobile() && !mine;
  const flags = (pv.done ? `<span class="flag done" data-tip="${S.firstDone === pid ? 'Completed a city first: +4 points' : 'Completed a city: +2 points'}">${S.firstDone === pid ? 'first' : 'done'}</span>` : '') + (turn && !mine && !small ? '<span class="flag">turn</span>' : '');
  const crownH = crown ? `<span class="crownmark" data-tip="${esc(nameOf(pid))} ${vb(pid, 'have', 'has')} the crown: calls the characters and chooses first">${ic('crown')}</span>` : '';
  const chips = charChips(pid, v), chars = `<span class="chars${(chips.match(/class="chip/g) || []).length > 1 ? ' duo' : ''}">${chips}</span>`;
  const label = `${mine ? 'You' : P.name}: ${pv.gold} gold, ${pv.hand} cards, ${cityCnt(city)} districts`;
  return `<section class="seat${turn ? ' turn' : ''}${mine ? ' mine' : ''}" id="seat-${pid}" data-pid="${pid}" role="button" tabindex="0" aria-label="${esc(label)}">
<header class="seat-head">${badge(pid)}<b>${esc(mine ? 'You' : P.name)}</b>${small ? '' : chars + crownH}${flags}</header>
<div class="seat-row">${statsHTML(pid, pv, city)}</div><div class="city-mini">${small ? chars + crownH : ''}${city.map(miniTile).join('')}</div><div class="floats"></div></section>`;
}

/* ── the calling track ── */
function medHTML(c, v) {
  const C = CHAR[c], up = v.faceUp.includes(c), turns = v.phase === 'turns' || v.phase === 'roundEnd' || v.phase === 'over';
  const now = turns && (UI.calling ? UI.calling === c : !!(v.cur && v.cur.char === c));
  const past = turns && !now && (v.phase !== 'turns' || C.rank <= v.rank);
  const who = v.revealed[c], killed = v.killed === c, mine = !up && S.players[0].chars.includes(c);
  const kwho = UI.killedWas && UI.killedWas.char === c ? UI.killedWas.pid : null;
  let whoH = '', tip = `${C.rank} · ${C.name}. `;
  if (up) { whoH = '<span>face up</span>'; tip += 'Face up: not in play this round.'; }
  else if (who != null) { whoH = `${badge(who)}<span class="t">${esc(nameOf(who))}</span>`; tip += `${nameOf(who)} ${vb(who, 'are', 'is')} ${theC(c)}.`; }
  else if (kwho != null) { whoH = `${badge(kwho)}<span class="t">killed</span>`; tip += `Killed: it was ${objOf(kwho)}.`; }
  else if (killed && past) { whoH = '<span>killed</span>'; tip += 'Killed: its player stayed silent.'; }
  else if (past) { whoH = '<span>nobody</span>'; tip += 'Nobody had it.'; }
  else if (mine) { whoH = '<span>you</span>'; tip += 'Yours this round.'; }
  else tip += turns ? 'Not called yet.' : 'Could be anyone’s, or face down.';
  const marks = [];
  if (killed) marks.push(`<span data-tip="Killed by the Assassin">${ic('skull')}</span>`);
  if (v.robbed === c) marks.push(`<span data-tip="The Thief will rob it">${ic('purse')}</span>`);
  if (v.bewitched === c) marks.push(`<span data-tip="Bewitched: the Witch takes its turn">${artSVG('witch', 'ic')}</span>`);
  const W = v.warrants;
  if (W && W.chars.includes(c)) {
    const real = W.shown ? W.signed === c : W.by === 0 && S.warrants && S.warrants.signed === c;
    if (!W.shown || W.signed === c) marks.push(`<span data-tip="${real ? 'The signed warrant' : 'A warrant (signed or not)'}">${ic('warrant').replace('class="ic', `class="ic${real ? ' real' : ''}`)}</span>`);
  }
  for (const t of v.threats || []) if (t.on && t.char === c) {
    const real = t.by === 0 && S.threats && S.threats.some(x => x.char === c && x.real);
    marks.push(`<span data-tip="${real ? 'Your real threat' : 'A threat (real or not)'}">${ic('threat').replace('class="ic', `class="ic${real ? ' real' : ''}`)}</span>`);
  }
  const cls = `med ${toneOf(c)}${up ? ' up' : ''}${now ? ' now' : ''}${past ? ' past' : ''}${past && (who != null || kwho != null) ? ' had' : ''}${past && who == null && kwho == null && !killed ? ' nobody' : ''}${killed ? ' killed' : ''}${mine ? ' mine' : ''}`;
  return `<button class="${cls}" data-char="${c}" data-tip="${esc(tip)}" aria-label="${esc(tip)}"><span class="disc">${artSVG(c, '')}</span><span class="rk">${C.rank}</span>${marks.length ? `<span class="marks">${marks.join('')}</span>` : ''}${c === 'tax-collector' && v.tax > 0 ? `<span class="taxpot" data-tip="Tax waiting for the Tax Collector">${v.tax}</span>` : ''}<span class="nm">${esc(C.name)}</span><span class="who">${whoH}</span></button>`;
}
function renderTrack() { const v = V(); put('#track', S.chars.map(c => medHTML(c, v)).join('')); }

/* ── the top bar ── */
function phaseText(v) {
  if (S.over && !UI.view) return 'Game over';
  if (v.phase === 'select') return S.need && S.need.pid === 0 && S.need.kind === 'pick' && !UI.view ? 'Choose a character' : 'Choosing characters';
  if (v.phase === 'turns' && v.cur) return v.cur.pid === 0 ? `Your turn · ${CHAR[v.cur.char].name}` : `${CHAR[v.cur.char].rank} · ${CHAR[v.cur.char].name}`;
  if (v.phase === 'turns' && UI.calling) return `${CHAR[UI.calling].rank} · ${CHAR[UI.calling].name}`;
  return v.phase === 'roundEnd' ? 'End of the round' : '';
}
function renderTopbar() {
  const v = V(), ph = phaseText(v), you = v.phase === 'turns' && v.cur && v.cur.pid === 0;
  put('#topbar', `<button class="icon-btn" data-act="pause" aria-label="Menu" data-tip="Menu (Esc)">${ICON.menu}</button>
<div class="tb-mid"><span class="pill">Round ${v.round || 1}</span>${ph ? `<span class="pill${you ? ' you' : ''}">${esc(ph)}</span>` : ''}${S.ending ? `<span class="pill desk-only" data-tip="A city is complete: the game ends after this round">Last round</span>` : ''}</div>
<div class="tb-right"><button class="speed desk-only" data-act="speed" data-tip="Animation speed (S)">${SPEEDS[SET.speed].label}</button><button class="icon-btn" data-act="codex" aria-label="Rules and cards" data-tip="Rules and cards (H)">${ICON.book}</button><button class="icon-btn" data-act="chronicle" aria-label="Chronicle" data-tip="Chronicle (L)">${ICON.scroll}</button></div>`);
}

/* ── your plaque, your city ── */
function renderMe() {
  const v = V(), city = cityOf(v, 0), useable = myDistrictUses();
  const cards = city.map(e => districtHTML(e.card, { size: 'xs', beau: e.beau, mus: e.mus, cls: (useable.has(e.card.id) ? 'use' : '') + (UI.fresh && UI.fresh.has(e.card.uid) ? ' fresh' : ''), attrs: `data-city="${e.card.uid}" role="button" tabindex="0" aria-label="${esc(e.card.name)}"` })).join('');
  const lots = Math.max(0, S.size - cityCnt(city));
  put('#me', seatHTML(0, v, true) + `<div class="mycity" aria-label="Your city">${cards || (mobile() ? '<span class="empty">No districts yet</span>' : '')}${mobile() ? '' : '<i class="lot"></i>'.repeat(lots)}</div>`);
}
/* districts in your city you can use right now (they glow) */
function myDistrictUses() {
  const out = new Set();
  if (!myTurnOpen()) return out;
  const t = S.cur, P = S.players[0];
  if (has(P, 'laboratory') && !t.used.lab && P.hand.length) out.add('laboratory');
  if (has(P, 'smithy') && !t.used.smithy && P.gold >= 2) out.add('smithy');
  if (has(P, 'museum') && !t.used.museum && P.hand.length) out.add('museum');
  if (has(P, 'armory') && armoryTargets(S, 0).some(o => !(o.target === 0 && entry(P, o.uid).card.id === 'armory'))) out.add('armory');
  return out;
}

/* ── whose decision it is ── */
const needMine = () => !!(S && !S.over && S.need && S.need.pid === 0);
const myTurnOpen = () => !!(S && !S.over && !UI.busy && S.need && S.need.kind === 'turn' && S.need.pid === 0 && districtOK(S, 0));
function selCard() { if (!S || UI.sel == null) return null; return S.players[0].hand.find(c => c.uid === UI.sel) || null; }
/* why a card in your hand cannot be built right now, or null */
function buildReason(card) {
  const P = S.players[0], t = S.cur;
  if (!needMine() || S.need.kind !== 'turn' || !t) return 'Not your turn';
  const block = buildBlock(S, 0, card);
  if (block) return t.mode === 'witch' ? 'The Witch only gathers and bewitches' : !t.gathered && t.mode !== 'resumed' && block === 'Not now' ? 'Gather first' : block;
  if (!payOptions(S, 0, card).length) return `Not enough gold (${buildCost(P, card)} needed)`;
  return null;
}

/* ── the hand: one straight row; rebuilt only when its cards change, so a scrolled hand stays put ── */
function renderHand() {
  const me = S.players[0], hand = $('#hand'), open = myTurnOpen() && S.cur.gathered;
  const can = new Set(open ? me.hand.filter(c => payOptions(S, 0, c).length).map(c => c.uid) : []);
  const key = `${S.seed}|${innerWidth}x${innerHeight}|${open ? 1 : 0}|${[...can].join(',')}|${me.hand.map(c => c.uid).join(',')}|${has(me, 'factory') ? 1 : 0}`;
  if (hand.dataset.key !== key) {
    const keep = hand.scrollLeft, known = UI.known || new Set();
    hand.innerHTML = me.hand.map(c => districtHTML(c, { cost: c.cost == null ? null : buildCost(me, c), cls: (can.has(c.uid) ? 'can' : open ? 'dim' : '') + (known.size && !known.has(c.uid) ? ' fresh' : ''), attrs: `tabindex="0" role="button" aria-label="${esc(c.name)}, cost ${c.cost == null ? 'none' : buildCost(me, c)}"` })).join('') || '<div class="hand-empty">No cards in hand</div>';
    UI.known = new Set(me.hand.map(c => c.uid));
    hand.dataset.key = key; hand.scrollLeft = keep;
    markHand(); handNav(); return;
  }
  markHand();
}
function markHand() { for (const el of $('#hand').children) if (el.dataset.uid) el.classList.toggle('sel', +el.dataset.uid === UI.sel); }
let LATER = null;
function later(fn) { if (LATER) { LATER.fn = fn; return; } LATER = { fn }; requestAnimationFrame(() => setTimeout(() => { const f = LATER.fn; LATER = null; f(); }, 0)); }
function handNav() {
  const h = $('#hand'), z = $('#handzone');
  if (mobile()) { z.classList.remove('over'); return; }
  const max = h.scrollWidth - h.clientWidth, over = max > 2;
  z.classList.toggle('over', over);
  if (!over) return;
  z.querySelector('.hand-nav.prev').disabled = h.scrollLeft <= 2;
  z.querySelector('.hand-nav.next').disabled = h.scrollLeft >= max - 2;
}
function handStep(dir) { const h = $('#hand'), c = h.querySelector('.card'); if (c) h.scrollBy({ left: dir * (c.offsetWidth + 14), behavior: 'smooth' }); }

/* ── the middle of the square ── */
function stageState() {
  const v = V();
  if (UI.flash) return UI.flash;
  const sel = selCard();
  if (sel && needMine() && S.need.kind === 'turn' && !UI.busy) {
    const why = buildReason(sel), cost = buildCost(S.players[0], sel);
    const opts = why ? [] : payOptions(S, 0, sel), other = { cards: 'Pay for it with cards and gold', framework: 'Take down the Framework to build it', necropolis: 'Build it by destroying one of your districts', cardinal: 'Take the gold you lack from a player (Cardinal)' };
    const cap = kw(why ? why : opts.some(o => o.pay === 'gold') ? `Build it for ${plural(cost, 'gold', 'gold')}${opts.length > 1 ? ', or pay another way' : ''}` : other[opts[0].pay]);
    return { html: districtHTML(sel, { size: 'lg', cost: sel.cost == null ? null : cost }), cap, key: 'sel' + sel.uid };
  }
  if (S.over && !UI.view) {
    const W = S.players[S.winner];
    return { html: `<div class="deckpile">${backHTML()}</div>`, cap: kw(`${nameOf(W.id)} ${vb(W.id, 'win', 'wins')} with ${S.scores[W.id].total} points`), key: 'over' };
  }
  if (v.phase === 'select' && S.sel) {
    const nd = S.need, n = nd && nd.kind === 'pick' ? nd.options.length : S.sel.pass.length;
    const who = nd && nd.kind === 'pick' ? nd.pid : null;
    const cap = who == null ? 'The characters are dealt' : who === 0 ? (nd.op === 'down' ? 'Put one character face down' : 'Choose your character') : `${esc(nameOf(who))} ${nd.op === 'down' ? 'puts a character face down' : 'chooses a character'}…`;
    return { html: `<div class="deckpile">${backHTML({ style: 'transform:translate(-6px,4px) rotate(-5deg)' })}${backHTML({ style: 'transform:translate(-3px,2px) rotate(-2deg)' })}${backHTML()}<span class="n">${n}</span></div>`, cap, key: 'sel' + n + '|' + who };
  }
  const c = v.cur ? v.cur.char : UI.calling;
  if (c && (v.phase === 'turns')) {
    const pid = v.cur ? v.cur.pid : v.revealed[c] != null ? v.revealed[c] : null, mode = v.cur ? v.cur.mode : null;
    let cap = kw(pid == null ? (v.killed === c ? `${CHAR[c].name}: killed, silent` : `Nobody is ${theC(c)}`) : `${nameOf(pid)} ${vb(pid, 'are', 'is')} ${theC(c)}`);
    if (mode === 'bewitched') cap += ` <small>${kw(`Bewitched: ${pid === 0 ? 'you only gather' : 'only gathers'}; the Witch takes the rest of the turn`)}</small>`;
    else if (mode === 'resumed') cap = `${kw(`${nameOf(pid)} ${vb(pid, 'play', 'plays')} as ${theC(c)}`)} <small>${kw('The Witch takes over the bewitched turn')}</small>`;
    else if (pid === 0) cap += `<small>${kw(turnTip())}</small>`;
    return { html: charHTML(c, { size: 'lg', cls: pid == null ? 'ghost' : '' }), cap, key: 'char' + c + pid + mode };
  }
  return { html: '', cap: '', key: 'none' };
}
function turnTip() {
  const t = S.cur; if (!t || UI.busy || !needMine() || S.need.kind !== 'turn') return '';
  if (t.mode === 'witch') return t.gathered ? 'Name a character to bewitch' : 'Gather, then bewitch a character';
  if (!t.gathered && t.mode !== 'resumed') return 'Gather first: take 2 gold, or draw cards';
  return S.players[0].hand.some(c => payOptions(S, 0, c).length) ? 'Choose a district to build, or end your turn' : 'End your turn when you are done';
}
function renderStage() {
  const st = stageState(), sc = $('#stage-card');
  const html = st.html ? `<div class="stage-fit">${st.html}</div>` : '';
  const capChanged = put('#stage-caption', st.cap || '');
  const changed = put(sc, html), h = $('#stage').clientHeight + ':' + $('#stage').clientWidth;
  if (changed || capChanged || sc.dataset.h !== h) { fitStage(); sc.dataset.h = h; }
  const first = sc.firstElementChild && sc.firstElementChild.firstElementChild;
  if (changed && st.key !== UI.stageKey && first) first.classList.add('pop');
  UI.stageKey = st.key;
}
function stageScale() { const st = $('#stage'), f = $('#stage-card .stage-fit'); if (!f) return 1; const h = f.scrollHeight || 1, below = mobile() ? ($('#stage-caption').offsetHeight || 0) + 12 : 16; return Math.max(0.4, Math.min(1, (st.clientHeight - below) / h)); }
function fitStage() { const f = $('#stage-card .stage-fit'), sc = $('#stage-card'); if (!f) { sc.style.height = ''; return; } f.style.transform = ''; const s = stageScale(); f.style.transform = `scale(${s})`; sc.style.height = Math.round(f.offsetHeight * s) + 'px'; }

/* ── the action bar ── */
const ABILITY_LABEL = { assassin: 'Kill…', witch: 'Bewitch…', magistrate: 'Warrants…', thief: 'Rob…', spy: 'Spy…', blackmailer: 'Threaten…', magician: 'Magic…', wizard: 'Take a card…', seer: 'Foresee…', emperor: 'Give the crown…', abbot: 'Alms', navigator: 'Navigate…', scholar: 'Study…', warlord: 'Destroy…', diplomat: 'Exchange…', marshal: 'Seize…', artist: 'Beautify…' };
/* can the ability be used now (and if not, why) */
function abilityState() {
  const t = S.cur, P = S.players[0], c = t.char;
  if (!ABILITY_LABEL[c]) return null;
  if (t.used.ability) return { ok: false, why: 'Already used this turn' };
  if (!abilityFree(S, 0)) return { ok: false, why: t.mode === 'witch' && !t.gathered ? 'Gather first' : 'Not now' };
  const opps = S.players.filter(X => X !== P);
  switch (c) {
    case 'witch': case 'wizard': if (!t.gathered) return { ok: false, why: 'Gather first' }; break;
    case 'emperor': if (!crownTargets(S, 0).length) return { ok: false, why: 'Nobody to give the crown to' }; break;
    case 'abbot': if (!richest(S, 0).length) return { ok: false, why: 'You are the richest (or nobody has gold)' }; break;
    case 'artist': if (!P.city.some(e => !e.beau) || P.gold < 1) return { ok: false, why: P.gold < 1 ? 'No gold' : 'No district to beautify' }; break;
    case 'warlord': if (!warlordTargets(S, 0).length) return { ok: false, why: 'No district can be destroyed' }; break;
    case 'marshal': if (!marshalTargets(S, 0).length) return { ok: false, why: 'No district can be seized' }; break;
    case 'diplomat': if (!diplomatTargets(S, 0).length) return { ok: false, why: 'No exchange is possible' }; break;
    case 'seer': if (!opps.some(X => X.hand.length)) return { ok: false, why: 'Nobody has cards' }; break;
    case 'magistrate': if (namable(S, c).length < 3) return { ok: false, why: 'Not enough characters' }; break;
    case 'blackmailer': if (namable(S, c).length < 2) return { ok: false, why: 'Not enough characters' }; break;
  }
  return { ok: true };
}
function gainState() {
  const t = S.cur, g = CHAR[t.char].gain;
  if (!g || t.gainDone || !turnOpen(S, 0) || t.mode === 'witch') return null;
  return { n: gainCount(S, S.players[0], t.char), res: g.res, type: g.type };
}
function turnBar() {
  const t = S.cur, P = S.players[0], out = [];
  const sel = selCard();
  if (sel) {
    const why = buildReason(sel), cost = buildCost(P, sel), opts = why ? [] : payOptions(S, 0, sel);
    const label = why ? 'Build' : opts.length === 1 && opts[0].pay === 'gold' ? `Build · ${cost}` : 'Build…';
    return `<button class="icon-btn info" data-act="card-info" aria-label="Card details" data-tip="Card details (I)">${ICON.info}</button><button class="btn ghost small" data-act="cancel-sel">Cancel</button><button class="btn" data-act="build-sel"${why ? ' disabled' : ''}>${ic('hammer')}${esc(label)}${!why && opts.length === 1 && opts[0].pay === 'gold' ? ic('gold') : ''}</button>`;
  }
  if (t.mode === 'bewitched') {
    out.push(`<span class="hint">${kw('Bewitched: gather, the Witch does the rest')}</span>`);
  }
  if (canGather(S, 0)) {
    const g = 2 + (has(P, 'gold-mine') ? 1 : 0), d = has(P, 'observatory') ? 3 : 2, keepAll = has(P, 'library');
    out.push(`<button class="btn blue" data-act="gather-gold" data-tip="Gather: take ${g} gold">${ic('gold')}Take ${g}</button><button class="btn blue" data-act="gather-cards" data-tip="Gather: draw ${d} cards, keep ${keepAll ? 'them all' : '1'}">${ic('card')}Draw ${d}${keepAll ? '' : ', keep 1'}</button>`);
  }
  if (t.mode === 'bewitched') return out.join('');
  const ab = abilityState();
  if (ab) out.push(`<button class="btn" data-act="ability"${ab.ok ? '' : ` disabled data-tip="${esc(ab.why)}"`}>${esc(ABILITY_LABEL[t.char])}</button>`);
  const g = gainState();
  if (g && g.n > 0) out.push(`<button class="btn" data-act="gain" data-tip="${CHAR[t.char].name}: 1 ${g.res === 'either' ? 'gold or card' : g.res === 'gold' ? 'gold' : 'card'} for each ${g.type} district">${g.res === 'cards' ? ic('card') : ic('gold')}+${g.n}${g.res === 'either' ? '…' : ''}</button>`);
  const uses = myDistrictUses();
  for (const [id, label] of [['laboratory', 'Laboratory'], ['smithy', 'Smithy'], ['museum', 'Museum'], ['armory', 'Armory']]) if (uses.has(id)) out.push(`<button class="btn ghost small" data-act="use-${id}" data-tip="${esc(DISTRICT[id].text.replace(/\{(\w+)\}/g, '$1'))}">${esc(label)}</button>`);
  if (t.gathered || t.mode === 'resumed') {
    const end = canEnd(S, 0);
    const why = t.char === 'emperor' && t.mode !== 'witch' && !t.crownGiven ? 'Give the crown away first' : '';
    out.push(`<button class="btn ghost" data-act="end"${end ? '' : ` disabled data-tip="${esc(why || 'Not yet')}"`}>${t.mode === 'witch' ? 'Bewitch nobody' : 'End turn'}</button>`);
  }
  return out.join('');
}
const NEED_LABEL = { pick: 'Choose a character', theater: 'The Theater', keep: 'Choose a card', bribe: 'The threat', reveal: 'The threat', confiscate: 'Confiscate?', wizard: 'Take a card', seer: 'Give cards back', heir: 'Give the crown' };
function actionHTML() {
  if (!S || S.over) return '';
  if (UI.busy) return UI.hint ? `<span class="hint">${UI.hint}</span>` : '';
  const nd = S.need; if (!nd) return '';
  if (nd.pid !== 0) return `<span class="hint">${esc(nameOf(nd.pid))} ${nd.kind === 'pick' ? 'is choosing' : 'is thinking'}…</span>`;
  if (nd.kind !== 'turn') return `<button class="btn" data-act="need">${esc(NEED_LABEL[nd.kind] || 'Decide')}</button>`;
  return turnBar();
}
function renderAction() { put('#prompt', actionHTML()); }

/* ── the chronicle ── */
function renderChronicle() {
  const lines = [];
  for (const e of S.log.slice(-160)) { const t = logLine(e); if (t) lines.push(`<li class="${e.k === 'round' ? 'r' : e.pid === 0 && e.k !== 'gameEnd' ? 'me' : ''}">${t}</li>`); }
  put('#chronicle', `<h3>Chronicle</h3><ul class="log">${lines.reverse().join('')}</ul>`);
}
const WHY_GOLD = { gather: '', gain: ' for districts', merchant: ' (Merchant)', queen: ' (Queen)', tax: ' from the tax', laboratory: ' (Laboratory)', 'poor-house': ' (Poor House)', alchemist: ' back (Alchemist)', navigator: ' (Navigator)' };
const WHY_CARDS = { gather: '', gain: ' for districts', architect: ' (Architect)', scholar: ' (Scholar)', smithy: ' (Smithy)', park: ' (Park)', navigator: ' (Navigator)' };
function logLine(e) {
  if (e.only != null && e.only !== 0) return '';
  /* names in bold; gold, cards, points, building and harm in their keyword colours; districts in their type's colour with its gem */
  const N = p => `${badge(p)}<b>${esc(nameOf(p))}</b>`, o = p => esc(objOf(p)), c = x => `<b>${esc(theC(x))}</b>`;
  const d = card => kwB(card.type, gemIc(card.type) + esc(card.name)), G = n => kwB('gold', plural(n, 'gold', 'gold')), Cd = n => kwB('card', plural(n, 'card'));
  const H = t => kwB('harm', t), B = t => kwB('build', t), crown = `the ${kwB('crown', 'crown')}`;
  switch (e.k) {
    case 'round': return `Round ${e.round} · ${esc(nameOf(e.crown))} ${vb(e.crown, 'have', 'has')} ${crown}${e.faceUp.length ? ` · face up: ${e.faceUp.map(x => esc(CHAR[x].name)).join(', ')}` : ''}`;
    case 'pick': return `${N(0)} chose ${c(e.char)}`;
    case 'down': return `${N(e.pid)} put a character face down`;
    case 'theater': return `${N(e.pid)} used the Theater to swap characters with ${o(e.target)}`;
    case 'theaterGot': return `${N(0)} now have ${c(e.char)}`;
    case 'theaterPass': return `${N(e.pid)} kept ${vb(e.pid, 'your', 'their')} character (Theater)`;
    case 'call': return e.pid == null ? (e.killed ? `<b>The ${esc(CHAR[e.char].name)}</b> was ${H('killed')} and stays silent` : `Nobody is ${c(e.char)}`) : `${N(e.pid)} ${vb(e.pid, 'are', 'is')} ${c(e.char)}`;
    case 'witchLost': return `The Witch’s spell falls on nobody: nobody is ${c(e.char)}`;
    case 'rob': return `${N(e.by)} (Thief) ${H(vb(e.by, 'rob', 'robs'))} ${o(e.pid)} of ${G(e.n)}`;
    case 'gold': return e.n ? `${N(e.pid)} ${vb(e.pid, e.why === 'gather' ? 'take' : 'gain', e.why === 'gather' ? 'takes' : 'gains')} ${G(e.n)}${WHY_GOLD[e.why] || ''}` : '';
    case 'cards': return e.n ? `${N(e.pid)} ${vb(e.pid, 'gain', 'gains')} ${Cd(e.n)}${WHY_CARDS[e.why] || ''}` : '';
    case 'crown': return e.why === 'emperor' ? `${N(e.by)} (Emperor) ${vb(e.by, 'give', 'gives')} ${crown} to ${o(e.pid)}` : e.why === 'advisor' ? `${N(e.by)} ${vb(e.by, 'give', 'gives')} ${crown} to ${o(e.pid)} (the killed Emperor)` : e.why === 'heir' ? `${N(e.pid)} ${vb(e.pid, 'take', 'takes')} ${crown} (the killed character’s due)` : `${N(e.pid)} ${vb(e.pid, 'take', 'takes')} ${crown}`;
    case 'discard': return `${N(e.pid)} ${vb(e.pid, 'pay', 'pays')} with ${Cd(e.n)} (Thieves’ Den)`;
    case 'cardinal': return `${N(e.pid)} (Cardinal) ${vb(e.pid, 'take', 'takes')} ${G(e.n)} from ${o(e.from)} for ${Cd(e.n)}`;
    case 'confiscate': return `${N(e.pid)} (Magistrate) ${H(vb(e.pid, 'confiscate', 'confiscates'))} ${possOf(e.from)} ${d(e.card)}${e.refund ? `; ${o(e.from)} ${vb(e.from, 'get', 'gets')} ${G(e.refund)} back` : ''}`;
    case 'build': return e.how === 'confiscated' ? '' : `${N(e.pid)} ${B(vb(e.pid, 'build', 'builds'))} the ${d(e.card)}`;
    case 'tax': return `${N(e.pid)} ${vb(e.pid, 'pay', 'pays')} ${G(1)} of tax`;
    case 'complete': return `${N(e.pid)} ${vb(e.pid, 'complete', 'completes')} a city${e.first ? ` first: ${kwB('pts', '+4 points')}. The game ends after this round` : `: ${kwB('pts', '+2 points')}`}`;
    case 'destroy': return e.why === 'warlord' ? `${N(e.by)} (Warlord) ${H(vb(e.by, 'destroy', 'destroys'))} ${possOf(e.pid)} ${d(e.card)}${e.paid ? ` for ${G(e.paid)}` : ''}` : e.why === 'armory' ? (e.by != null ? `${N(e.by)} ${H(vb(e.by, 'destroy', 'destroys'))} ${possOf(e.pid)} ${d(e.card)} with the Armory` : '') : e.why === 'framework' ? `${N(e.pid)} ${vb(e.pid, 'take', 'takes')} down the Framework to ${B('build')} for free` : e.why === 'necropolis' ? `${N(e.pid)} ${vb(e.pid, 'give', 'gives')} up the ${d(e.card)} for the Necropolis` : `${possOf(e.pid)} ${d(e.card)} is ${H('destroyed')}`;
    case 'bribe': return `${N(e.pid)} ${vb(e.pid, 'pay', 'pays')} the Blackmailer ${G(e.n)}`;
    case 'refuse': return `${N(e.pid)} ${vb(e.pid, 'refuse', 'refuses')} to pay the Blackmailer`;
    case 'threat': return e.real ? `${N(e.by)} ${vb(e.by, 'turn', 'turns')} up the ${H('threat')}: it is real! ${o(e.pid)} ${vb(e.pid, 'lose', 'loses')} ${G(e.n)}` : `${N(e.by)} ${vb(e.by, 'turn', 'turns')} up the ${H('threat')}: an empty one`;
    case 'spare': return `${N(e.by)} ${vb(e.by, 'leave', 'leaves')} the ${H('threat')} face down`;
    case 'bewitch': return `${N(e.pid)} (Witch) ${H(vb(e.pid, 'bewitch', 'bewitches'))} ${c(e.char)}`;
    case 'bewitchedEnd': return `${N(e.pid)} ${vb(e.pid, 'were', 'was')} ${H('bewitched')} and only ${vb(e.pid, 'gather', 'gathers')}`;
    case 'resume': return `${N(e.pid)} (Witch) ${vb(e.pid, 'take', 'takes')} over as ${c(e.char)}`;
    case 'witchIdle': return `${N(e.pid)} (Witch) ${H(vb(e.pid, 'bewitch', 'bewitches'))} nobody`;
    case 'kill': return `${N(e.pid)} (Assassin) ${H(vb(e.pid, 'kill', 'kills'))} ${c(e.char)}`;
    case 'warrants': return `${N(e.pid)} (Magistrate) ${vb(e.pid, 'put', 'puts')} ${H('warrants')} on ${e.chars.map(x => esc(CHAR[x].name)).join(', ')}`;
    case 'signed': return `Your signed ${H('warrant')} is on ${c(e.char)}`;
    case 'robNamed': return `${N(e.pid)} (Thief) will ${H('rob')} ${c(e.char)}`;
    case 'threats': return `${N(e.pid)} (Blackmailer) ${vb(e.pid, 'put', 'puts')} ${H('threats')} on ${e.chars.map(x => esc(CHAR[x].name)).join(' and ')}`;
    case 'real': return `Your real ${H('threat')} is on ${c(e.char)}`;
    case 'spy': return `${N(e.pid)} (Spy) ${vb(e.pid, 'name', 'names')} ${kwB(e.type, gemIc(e.type) + esc(TYPES[e.type].name.toLowerCase()))} and ${vb(e.pid, 'look', 'looks')} at ${possOf(e.target)} hand: ${e.n} match${e.n === 1 ? '' : 'es'}, ${G(e.gold)} and ${Cd(e.cards)} taken`;
    case 'peek': return `${N(0)} saw ${possOf(e.target)} hand: ${e.hand.length ? e.hand.map(d).join(', ') : 'empty'}`;
    case 'swapHands': return `${N(e.pid)} (Magician) ${vb(e.pid, 'swap', 'swaps')} hands with ${o(e.target)}`;
    case 'redraw': return `${N(e.pid)} (Magician) ${vb(e.pid, 'trade', 'trades')} ${Cd(e.n)} with the deck`;
    case 'wizardEmpty': return `${N(e.pid)} (Wizard) ${vb(e.pid, 'find', 'finds')} ${possOf(e.target)} hand empty`;
    case 'wizardLook': return `${N(e.pid)} (Wizard) ${vb(e.pid, 'look', 'looks')} at ${possOf(e.target)} hand`;
    case 'wizardTake': return e.build ? `${N(e.pid)} (Wizard) ${vb(e.pid, 'take', 'takes')} the ${d(e.card)} from ${o(e.from)} and ${B(vb(e.pid, 'build', 'builds'))} it` : `${N(e.pid)} (Wizard) ${vb(e.pid, 'take', 'takes')} ${kwB('card', 'a card')} from ${o(e.from)}`;
    case 'wizardCard': return `${N(0)} took the ${d(e.card)}`;
    case 'seerTook': return `${N(0)} took the ${d(e.card)} from ${o(e.target)}`;
    case 'seer': return `${N(e.pid)} (Seer) ${vb(e.pid, 'take', 'takes')} ${kwB('card', 'a random card')} from ${e.from.length ? e.from.map(o).join(', ') : 'nobody'}`;
    case 'seerGave': return `${N(e.pid)} ${vb(e.pid, 'give', 'gives')} ${kwB('card', 'a card')} back to ${e.to.map(o).join(', ')}`;
    case 'tribute': return `${N(e.pid)} (Emperor) ${vb(e.pid, 'take', 'takes')} ${e.took === 'gold' ? G(1) : e.took === 'card' ? kwB('card', 'a card') : 'nothing'} from ${o(e.from)}`;
    case 'alms': return `${N(e.pid)} (Abbot) ${vb(e.pid, 'take', 'takes')} ${G(1)} from ${o(e.from)}, the richest`;
    case 'scholar': return `${N(e.pid)} (Scholar) ${vb(e.pid, 'draw', 'draws')} ${Cd(e.n)} to keep 1`;
    case 'seize': return `${N(e.pid)} (Marshal) ${H(vb(e.pid, 'seize', 'seizes'))} ${possOf(e.from)} ${d(e.card)} for ${G(e.paid)}`;
    case 'exchange': return `${N(e.pid)} (Diplomat) ${vb(e.pid, 'exchange', 'exchanges')} ${vb(e.pid, 'your', 'their')} ${d(e.gave)} for ${possOf(e.with)} ${d(e.got)}${e.paid ? `, paying ${G(e.paid)}` : ''}`;
    case 'beautify': return `${N(e.pid)} (Artist) ${vb(e.pid, 'beautify', 'beautifies')} ${e.cards.map(d).join(' and ')}: ${kwB('pts', `+1 point${e.cards.length > 1 ? ' each' : ''}`)}`;
    case 'museum': return `${N(e.pid)} ${vb(e.pid, 'put', 'puts')} ${kwB('card', 'a card')} under the Museum`;
    case 'killedWas': return `The ${H('killed')} ${esc(CHAR[e.char].name)} was ${o(e.pid)}`;
    case 'gameEnd': return `The game is over: ${esc(nameOf(e.winner))} ${vb(e.winner, 'win', 'wins')} with ${kwB('pts', plural(e.scores[e.winner], 'point'))}`;
  }
  return '';
}

function renderMatch() {
  if (!S) return;
  renderTopbar(); renderTrack();
  const v = V(), opps = S.players.slice(1), o = $('#opps');
  const cls = 'n' + opps.length; if (o.className !== cls) o.className = cls;
  put(o, opps.map(P => seatHTML(P.id, v, false)).join(''));
  if (mobile() && opps.length <= 2) for (const el of o.children) el.classList.add('wide');
  renderMe(); renderSelection();
  if (UI.drawer) renderChronicle();
}
function renderSelection() { if (!S) return; renderHand(); renderStage(); renderAction(); }

/* ── tooltips: with a mouse after a short rest on the same thing; on touch a press-and-hold ── */
const TIP = { el: null, timer: null, over: null, press: null };
function showTip(el) {
  if (DRAG.on || !el.isConnected) return;
  const t = $('#tip'); t.innerHTML = kw(el.dataset.tip); t.classList.remove('hidden');
  const r = el.getBoundingClientRect(), w = t.offsetWidth, h = t.offsetHeight;
  let x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8), y = r.top - h - 8;
  if (y < 8) y = r.bottom + 8;
  t.style.left = x + 'px'; t.style.top = y + 'px'; TIP.el = el;
}
function hideTip() { clearTimeout(TIP.timer); if (TIP.el) $('#tip').classList.add('hidden'); TIP.el = null; }
const FINE = matchMedia('(hover: hover) and (pointer: fine)');
document.addEventListener('pointerover', e => {
  if (e.pointerType === 'touch' || !FINE.matches) return;
  const el = e.target.closest('[data-tip]');
  if (el === TIP.over) return;
  TIP.over = el; hideTip();
  if (el && !e.buttons) TIP.timer = setTimeout(() => { if (TIP.over === el) showTip(el); }, 450);
});
document.addEventListener('pointerout', e => { if (e.pointerType !== 'touch' && !e.relatedTarget) { TIP.over = null; hideTip(); } });
document.addEventListener('pointerdown', e => {
  hideTip(); TIP.press = null;
  if (e.pointerType !== 'touch') return;
  const el = e.target.closest('[data-tip]');
  if (el && !el.closest('#hand')) { TIP.press = { x: e.clientX, y: e.clientY }; TIP.timer = setTimeout(() => { TIP.long = true; showTip(el); }, 450); }
});
document.addEventListener('pointermove', e => { if (TIP.press && Math.hypot(e.clientX - TIP.press.x, e.clientY - TIP.press.y) > 10) { clearTimeout(TIP.timer); TIP.press = null; } }, { passive: true });
document.addEventListener('pointerup', () => { clearTimeout(TIP.timer); TIP.press = null; if (TIP.el && !FINE.matches) setTimeout(hideTip, 1600); });
document.addEventListener('pointercancel', () => { clearTimeout(TIP.timer); TIP.press = null; });
document.addEventListener('scroll', hideTip, true);
