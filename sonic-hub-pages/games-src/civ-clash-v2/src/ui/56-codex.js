/* ── Codex: every civilization, unit, symbol and rule, readable in and out of a match.
   Also the card sheet: the full story of one card (what it does, each symbol, who fields it). ── */
const CODEX = { open: false, tab: 'civs', civ: null, q: '', filter: 'all' };

/* symbol icons as CSS sprites, so long lists stay light */
function symSVG(ch) {
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='12' r='11.4' fill='${SYM_PIG[ch]}' stroke='#24180c' stroke-opacity='.8' stroke-width='.9'/><circle cx='12' cy='12' r='10.15' fill='none' stroke='#d2ad57' stroke-width='1.15'/>${SYM_STYLE[ch][1].replace(/#fff/g, '#f6ebcf').replace(/"/g, "'")}</svg>`;
}
function installSymbolSprites() {
  let css = '';
  for (const ch of SYM_ORDER) css += `.sy-${ch}{background-image:${svgURL(symSVG(ch))}}\n`;
  css += `.sy-crown{background-image:${svgURL(crownSVG(24).replace('<svg ', "<svg xmlns='http://www.w3.org/2000/svg' "))}}\n`;
  const el = document.createElement('style'); el.id = 'symbol-sprites'; el.textContent = css; document.head.appendChild(el);
}
const symIcons = icons => [...icons].map(ch => `<i class="sy sy-${ch}" title="${SYM[ch].name}"></i>`).join('');

/* any card outside a live hand is rebuilt from a short reference: u:civ:unit (civ 'neutral' for a shared unit shown on its own),
   merc:unit, age:civ, mk:index (a market slot) */
function staticCard(ref) {
  const [kind, a, b] = ref.split(':');
  if (kind === 'u') { const U = UNITS[b]; return { uid: 0, ref, unit: b, name: U.name, icons: U.icons, civ: a, crest: crestOf(b) }; }
  if (kind === 'merc') { const M = MERCS.find(m => m.unit === a), U = UNITS[a]; return { uid: 0, ref, unit: a, name: U.name, icons: U.icons, civ: 'merc', merc: a, cost: M.cost }; }
  if (kind === 'age') return { uid: 0, ref, name: 'Imperial Age', icons: CIVS[a].ageIcons, civ: a, age: true, bound: true };
  if (kind === 'mk') return S && S.market[+a];
  return null;
}
/* how many copies of each unit each civilization fields (starting deck and Imperial cards together) */
let UNIT_IN = null;
function unitIn() {
  if (UNIT_IN) return UNIT_IN;
  UNIT_IN = {};
  for (const civ of CIV_ORDER) for (const list of [CIVS[civ].deck, CIVS[civ].imperial]) for (const [id, n] of Object.entries(list)) { const o = UNIT_IN[id] || (UNIT_IN[id] = {}); o[civ] = (o[civ] || 0) + n; }
  return UNIT_IN;
}
const MIX = {};
const mixOf = civ => MIX[civ] || (MIX[civ] = Object.fromEntries(deckMix(civ)));
const symbolUsers = ch => CIV_ORDER.map(civ => [civ, mixOf(civ)[ch] || 0]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
const cardKind = c => (c.age ? 'age' : c.civ === 'merc' ? 'merc' : c.crest ? 'own' : 'unit');
const KIND_TAG = { age: ['imp', 'Imperial Age'], merc: ['merc', 'Mercenary'], own: ['sig', 'Civilization unit'], unit: ['com', 'Shared unit'] };
function civChip(civ, n) { return `<button class="civchip civ-${civ}" data-act="codex-civ" data-civ="${civ}">${crest(civ, 18)}<span>${esc(CIVS[civ].name)}</span>${n ? `<em>×${n}</em>` : ''}</button>`; }
function symGroups(icons) { const g = []; for (const ch of icons) { const last = g[g.length - 1]; if (last && last[0] === ch) last[1]++; else g.push([ch, 1]); } return g; }

/* ── the card sheet ── */
function cardSheet(card, ctx = {}) {
  if (!card) return;
  hideZoom(); hideTip();
  const k = cardKind(card), [tagCls, tagText] = KIND_TAG[k], users = card.unit ? Object.entries(unitIn()[card.unit] || {}).sort((a, b) => b[1] - a[1]) : [];
  const who = k === 'age' ? `Arrives at the start of turn ${RULES.ageTurn}. It can't be stolen, discarded or passed, and leaves play once used.`
    : k === 'merc' ? `Hired at the Mercenary Market for ${card.cost} gold. Anyone can hire it.`
    : k === 'own' ? `Only the ${CIVS[card.crest].name} field this unit.`
    : `Fielded by ${users.length} of the ${CIV_ORDER.length} civilizations.`;
  const notes = [], icons = card.icons || '', w = count(icons, 'W'), u = count(icons, 'U');
  if (u) notes.push(`A wonder stands behind every other structure, so hits reach it only once those are gone (a Catapult aims at the biggest structure). At the start of each of your turns it loses one countdown; when the last goes while it still stands, you win.`);
  else if (w) notes.push('A structure stands in your Defenses and takes hits before your HP: each hit that reaches it takes 1 durability and stops there. Direct damage flies over it.');
  if (needsTarget(card)) notes.push('With several opponents you choose which camp it aims at.');
  if (icons.includes('C')) notes.push('When you play it you see the target\'s hand and pick the card to take.');
  const groups = symGroups(card.age ? '' : icons);
  const found = card.unit && k !== 'merc' ? (users.length > 12 ? `<p class="muted">In ${users.length} of ${CIV_ORDER.length} decks.</p>` : `<div class="cx-users">${users.map(([c, n]) => civChip(c, n)).join('')}</div>`) : k === 'age' ? `<div class="cx-users">${civChip(card.civ)}</div>` : '';
  const mine = ctx.hand && S && isMyTurn() && S.players[0].hand.some(c => c.uid === card.uid);
  const multi = mine && needsTarget(card) && opponents(S, S.players[0]).length > 1;
  const btns = [];
  if (mine) btns.push(`<button class="btn" data-act="play-card" data-uid="${card.uid}">${multi ? 'Choose a target' : 'Play ' + esc(card.name)}</button>`);
  if (ctx.hire != null && S) { const cost = marketCost(S, S.players[0], card), ok = isMyTurn() && !S.flags.bought && S.players[0].gold >= cost; btns.push(`<button class="btn${ok ? '' : ' ghost'}" data-hire="${ctx.hire}"${ok ? '' : ' disabled'}>Hire for ${cost} gold</button>`); }
  btns.push('<button class="btn ghost" data-act="close">Close</button>');
  const lore = card.unit && UNITS[card.unit].lore;
  openSheet(`<div class="card-sheet"><div class="cs-card">${cardHTML(card, { size: 'lg' })}</div><div class="cs-body">
<div class="cs-kind"><span class="cx-tag ${tagCls}">${tagText}</span><span>${esc(who)}</span></div>
<h3>What it does</h3><p class="cs-eff">${kw(cardText(card))}</p>${notes.map(n => `<p class="cs-note">${kw(n)}</p>`).join('')}${lore ? `<p class="cs-note"><i>${esc(lore)}</i></p>` : ''}
${groups.length ? `<h3>Symbols, left to right</h3><div class="cs-syms">${groups.map(([ch, n]) => `<div>${symBadge(ch, 30)}<b>${esc(SYM[ch].name)}${n > 1 ? ' ×' + n : ''}</b><span>${kw(SYM[ch].desc)}</span></div>`).join('')}</div>` : ''}
${found ? `<h3>Found in</h3>${found}` : ''}
<div class="row">${btns.join('')}</div></div></div>`);
}

/* ── one civilization, used by the codex and the civilization select ── */
function deckRows(civ) {
  const rows = Object.entries(CIVS[civ].deck).map(([id, n]) => [`u:${civ}:${id}`, n, crestOf(id) === civ]);
  return [...rows.filter(r => r[2]), ...rows.filter(r => !r[2])];
}
function cardRow(card, extra) {
  const k = cardKind(card), tag = k === 'own' || k === 'merc' || k === 'age' ? `<span class="cx-tag ${KIND_TAG[k][0]}">${k === 'own' ? esc(CIVS[card.crest].name) : KIND_TAG[k][1]}</span>` : '';
  return `<button class="cx-row" data-cref="${card.ref}"><span class="cx-syms">${k === 'age' ? '<i class="sy sy-crown"></i>' : symIcons(card.icons)}</span><span class="cx-main"><b>${esc(card.name)}${tag}</b><em>${kw(cardText(card))}</em></span>${extra ? `<span class="cx-x">${extra}</span>` : ''}</button>`;
}
function civDetailHTML(civ, mode) {
  const C = CIVS[civ], rec = SET.stats[civ], P0 = S && UI.screen === 'match' ? S.players[0] : null;
  const live = mode === 'match' && P0 && P0.civ === civ ? `<div class="cx-live"><span>In this match</span><button class="pile" data-act="deck">Deck ${P0.deck.length}</button><span class="pile">Hand ${P0.hand.length}</span><button class="pile" data-act="discard">Discard ${P0.discard.length}</button></div>` : '';
  const small = c => cardHTML(c, { size: 'sm', attrs: `data-cref="${c.ref}" role="button" tabindex="0" aria-label="${esc(c.name)}: details"` });
  const own = ownUnits(civ);
  return `<div class="sd-hero">${crest(civ, 72)}<div><h2>${esc(C.name)}</h2><p>${esc(C.style)}</p></div></div>
<div class="sd-body"><div class="sd-stats"><span><b class="kw k-hp">${C.hp2}</b> HP in a duel</span><span><b class="kw k-hp">${C.hp4}</b> HP at a bigger table</span>${rec ? `<span>You won <b>${rec[0]}</b> of ${rec[1]}</span>` : ''}</div>${live}
${own.length ? `<h3>Their own units <span class="cx-sub">only the ${esc(C.name)} field these</span></h3><div class="sd-cards">${own.map(small).join('')}</div>` : ''}
<h3>Imperial Age</h3><p>At the start of turn ${RULES.ageTurn} the Imperial Age card arrives. ${kw(ageText(civ))}</p><div class="sd-cards">${impCards(civ).map(small).join('')}</div>
<h3>Full deck <span class="cx-sub">${deckSize(civ)} cards · tap one for details</span></h3><div class="cx-list">${deckRows(civ).map(([ref, n]) => cardRow(staticCard(ref), '×' + n)).join('')}</div>
<h3>Symbols in this deck</h3><div class="mix">${deckMix(civ).map(([ch, n]) => `<span data-tip="${esc(SYM[ch].name)}: ${esc(SYM[ch].desc)}">${symBadge(ch, 22)}${n}</span>`).join('')}</div>
<p class="muted">Cards and camp styled after ${FAMILY_NAMES[CIV_FAMILY[civ]]}, with ${MOTIF_NAMES[CIV_MOTIF[civ]]}.</p>
${mode === 'codex' ? `<div class="row"><button class="btn" data-act="codex-play" data-civ="${civ}">Play this civilization</button></div>` : ''}</div>`;
}

/* ── the codex overlay ── */
function openCodex(tab = 'civs', o = {}) {
  Object.assign(CODEX, { open: true, tab, civ: o.civ !== undefined ? o.civ : CODEX.civ });
  hideTip(); hideZoom(); clearAim();
  $('#codex').classList.remove('hidden'); renderCodex();
}
function closeCodex() { CODEX.open = false; $('#codex').classList.add('hidden'); $('#codex').innerHTML = ''; }
function renderCodex(keepScroll) {
  const T = CODEX, el = $('#codex'), old = el.querySelector('.cx-body'), y = keepScroll && old ? old.scrollTop : 0;
  const tabs = [['civs', 'Civilizations'], ['cards', 'Units'], ['symbols', 'Symbols'], ['rules', 'Rules']];
  const inCiv = T.tab === 'civs' && T.civ;
  const body = T.tab === 'civs' ? (inCiv ? `<div class="cx-civ civ-${T.civ} fam-${CIV_FAMILY[T.civ]}">${civDetailHTML(T.civ, UI.screen === 'match' ? 'match' : 'codex')}</div>` : codexCivList())
    : T.tab === 'cards' ? codexCards() : T.tab === 'symbols' ? codexSymbols() : codexRules();
  el.innerHTML = `<header class="cx-top"><button class="icon-btn" data-act="codex-back" aria-label="${inCiv ? 'All civilizations' : 'Close the codex'}">${inCiv ? ICON.back : ICON.close}</button><h2>${inCiv ? esc(CIVS[T.civ].name) : 'Codex'}</h2></header>
<nav class="cx-tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" class="${T.tab === k ? 'on' : ''}" aria-selected="${T.tab === k}" data-act="codex-tab" data-tab="${k}">${l}</button>`).join('')}</nav>
<div class="cx-body">${body}</div>`;
  el.querySelector('.cx-body').scrollTop = y;
}
function codexCivList() {
  const mine = S && UI.screen === 'match' ? S.players.map(p => p.civ) : [];
  return `<p class="cx-lead">${civCountWord()} civilizations from ${GROUPS.length} regions. Each brings a deck of ${deckSize(CIV_ORDER[0])} units, some shared with others and some its very own, and a few more when it reaches the Imperial Age. Tap one to see everything it fields.</p>` +
    GROUPS.map(g => `<div class="region"><h3>${esc(g)}</h3><div class="civ-grid">${CIV_ORDER.filter(c => CIVS[c].group === g).map(c => `<button class="civ-tile fam-${CIV_FAMILY[c]} civ-${c}" data-act="codex-civ" data-civ="${c}">${crest(c, 36)}<span class="nm">${esc(CIVS[c].name)}</span>${mine.includes(c) ? `<span class="hp">${c === mine[0] ? 'You' : 'Rival'}</span>` : ''}</button>`).join('')}</div></div>`).join('');
}
function allCards() {
  if (allCards.cache) return allCards.cache;
  const out = [];
  for (const id of Object.keys(UNITS)) { if (MERC_UNITS.has(id) || !unitIn()[id]) continue; const owner = crestOf(id) || 'neutral'; out.push(staticCard(`u:${owner}:${id}`)); }
  for (const M of MERCS) out.push(staticCard('merc:' + M.unit));
  return (allCards.cache = out);
}
const cardOwner = c => (cardKind(c) === 'unit' ? `${Object.keys(unitIn()[c.unit] || {}).length} decks` : cardKind(c) === 'merc' ? `${c.cost} gold` : CIVS[c.crest || c.civ].name);
function codexCards() {
  const kinds = [['all', 'All'], ['unit', 'Shared'], ['own', 'Civilization'], ['merc', 'Mercenary']];
  return `<div class="cx-search"><input id="cx-q" type="search" placeholder="Search a unit, a symbol or a civilization" value="${esc(CODEX.q)}" autocomplete="off" enterkeyhint="search" aria-label="Search units"><div class="chipf" role="group" aria-label="Unit type">${kinds.map(([k, l]) => `<button class="${CODEX.filter === k ? 'on' : ''}" data-act="cx-filter" data-f="${k}">${l}</button>`).join('')}</div></div><div id="cx-results">${codexCardResults()}</div>`;
}
function codexCardResults() {
  const q = CODEX.q.trim().toLowerCase(), f = CODEX.filter;
  const words = c => [c.name, cardText(c), cardOwner(c), ...[...(c.icons || '')].map(ch => SYM[ch].name)].join(' ').toLowerCase();
  const groups = [['unit', 'Shared units', 'Fielded by several civilizations; the same unit works the same for everyone.'], ['own', 'Civilization units', 'Fielded by one civilization only: they carry its crest.'], ['merc', 'Mercenaries', 'Hired at the market with gold; anyone can buy them.']];
  let total = 0;
  const html = groups.filter(([k]) => f === 'all' || f === k).map(([k, title, note]) => {
    const score = c => (!q ? 1 : c.name.toLowerCase().includes(q) ? 3 : [...(c.icons || '')].some(ch => SYM[ch].name.toLowerCase().includes(q)) ? 2 : words(c).includes(q) ? 1 : 0);
    const list = allCards().filter(c => cardKind(c) === k).map((c, i) => [c, score(c), i]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1] || a[2] - b[2]).map(x => x[0]);
    total += list.length;
    return list.length ? `<h3>${title} <span class="cx-sub">${list.length}</span></h3><p class="cx-note">${note}</p><div class="cx-list">${list.map(c => cardRow(c, esc(cardOwner(c)))).join('')}</div>` : '';
  }).join('');
  return total ? html : `<p class="cx-empty">No unit matches “${esc(CODEX.q)}”.</p>`;
}
const SYM_GROUPS = [['Hits', 'AXYBOKLEFN', 'Each of these is one hit. Damage goes into the target\'s structures first: the front one loses 1 durability and the hit stops there. Only a target with no structure loses HP.'],
  ['Siege', 'RPZ', 'These break structures or guards and never touch HP.'], ['Taking', 'JSC', ''], ['Guards, Traps and Storm', 'QITV', 'Guards wait in your Defenses until they are used. Traps and Storm last until your next turn.'],
  ['Everything else', 'HDGM', ''], ['Buildings', 'WU', '']];
function codexSymbols() {
  const legend = [['dmg', 'damage'], ['pierce', 'direct damage'], ['hp', 'HP'], ['gold', 'gold'], ['card', 'cards'], ['wall', 'structures'], ['guard', 'guards and Traps'], ['play', 'play another card'], ['aoe', 'every opponent'], ['steal', 'steal'], ['raze', 'kill']].map(([k, t]) => `<b class="kw k-${k}">${t}</b>`).join(', ');
  return `<p class="cx-lead">Every card is a unit built from these symbols, resolved left to right. Nothing else on a card does anything. Coloured words on cards follow the same colours: ${legend}.</p>` + SYM_GROUPS.map(([title, codes, note]) => `<h3>${title}</h3>${note ? `<p class="cx-note">${kw(note)}</p>` : ''}<div class="cx-list">${[...codes].map(ch => {
    const users = symbolUsers(ch);
    const elsewhere = () => { const imp = CIV_ORDER.filter(c => Object.keys(CIVS[c].imperial).some(id => UNITS[id].icons.includes(ch))), merc = MERCS.filter(m => UNITS[m.unit].icons.includes(ch)).map(m => UNITS[m.unit].name);
      return imp.length || merc.length ? `<span class="muted">${[imp.length ? `Imperial cards of ${imp.map(c => CIVS[c].name).join(', ')}` : '', merc.length ? `mercenaries (${merc.join(', ')})` : ''].filter(Boolean).join('; ')}.</span>` : '<span class="muted">Not in any deck yet: kept for the civilizations still to come.</span>'; };
    const who = !users.length ? elsewhere() : users.length === CIV_ORDER.length ? '<span class="muted">Every civilization uses it.</span>' : users.map(([c, n]) => civChip(c, n)).join('');
    return `<div class="cx-sym">${symBadge(ch, 40)}<div><b>${esc(SYM[ch].name)}</b><p>${kw(SYM[ch].desc)}</p><div class="cx-users">${who}</div></div></div>`;
  }).join('')}</div>`).join('');
}
function codexRules() {
  const bld = [['wall', 'Wall'], ['palisade', 'Palisade'], ['tower', 'Tower'], ['castle', 'Castle'], ['church', 'Temple'], ['stall', 'Caravanserai'], ['wonder', 'Wonder']];
  return `<h3>The basics</h3><p>Each player brings their civilization's own deck of ${deckSize(CIV_ORDER[0])} units. On your turn you <b>draw 1 card and play 1</b>; with an empty hand you draw 2. A card does what its symbols say, from left to right, against the camp you aim it at. Bring every rival to 0 HP to win.</p>
<h3>Hits and damage</h3><p>Every attack symbol is one <b>hit</b>. Damage goes into the target's <b class="kw k-wall">structures</b> first: the structure in front loses 1 <b class="kw k-wall">durability</b> and that hit stops there, however strong it was. Only a camp with no structure loses <b class="kw k-hp">HP</b>. <b class="kw k-pierce">Direct damage</b> (Long Ranged) flies over structures straight to HP. Hits reach the weakest structure first; a wonder always stands at the back. <b>Siege</b> (Ram, Catapult) takes 2 durability and never touches HP.</p>
<h3>Guards, Traps and Storm</h3><p><b class="kw k-guard">Guards</b> wait in your Defenses until they are used, one hit each: a Bodyguard blocks a Strike or Eagle hit, a Camel guard a Cavalry hit, a Mantlet a direct damage hit. Elephants kill a guard; a Snipe kills a guard or disarms a Trap. A <b class="kw k-guard">Trap</b> lasts until your next turn and deals 1 direct damage back to the next attacker who hits you. <b class="kw k-guard">Storm</b> cancels every attack on you until your next turn.</p>
<h3>Around the table</h3><p><b>Events</b> hit everyone each round from round 2, and the next one is always shown. The <b>Mercenary Market</b> sells one card per turn for <b class="kw k-gold">gold</b>; it goes straight to your hand. Raids and gold symbols pay for it. Your <b>relic</b> is a small bonus picked before each match.</p>
<h3>Imperial Age, wonders and the long war</h3><p>At the start of your ${RULES.ageTurn}th turn the <b>Imperial Age</b> card arrives. Playing it uses your play for the turn: your civilization's Imperial cards are shuffled into your deck and the card's own symbols resolve. A <b>wonder</b> wins the game if it still stands when its countdown runs out. The first time you drop to 3 HP or less you draw 2 cards. From round ${RULES.attritionRound} everyone loses 1 HP each round.</p>
<h3>Controls</h3><p>Tap a card to choose it: it shows large on the chart, the tags above each camp show the result, and <b>Play</b> confirms. Tap the chosen card again, or ⓘ, to read it in full. <b>Drag</b> a card to play it straight away: hold it for a moment or pull it up, then drop it on the chart, or on an enemy camp to aim it; let go anywhere else and it goes back to your hand. Swipe the hand sideways to see the rest. Tap any camp to inspect it, and tap the card on the chart to read it.</p><p class="muted">Keys: 1–9 choose a card, Enter play, I details, Tab switch target, Esc cancel, C codex, L chronicle, S speed, H rules.</p>
<h3>Buildings <span class="cx-sub">the number on each is its durability</span></h3><div class="cx-list">${bld.map(([k, n]) => `<div class="cx-ev"><span class="bld"><svg viewBox="0 0 24 24" aria-hidden="true">${BUILD[k]}</svg></span><div><b>${n}</b><p>${k === 'wonder' ? 'Stands behind every other structure; the small number is its countdown.' : 'Takes hits before HP, 1 durability per hit.'}</p></div></div>`).join('')}</div>
<h3>Markers in the Defenses row</h3><div class="cx-list">${['crown', 'bodyguard', 'camel', 'mantlet', 'trap', 'storm'].map(m => `<div class="cx-ev"><span class="medal">${medalSVG(m)}</span><div><p>${kw(MEDAL_TIP[m])}</p></div></div>`).join('')}</div>
<h3>Reading events and relics <span class="cx-sub">their glyphs use the card symbols</span></h3><div class="gl-legend">${GLYPH_LEGEND.map(([g, t]) => `<div>${glyphRow(g, 24)}<span>${kw(t)}</span></div>`).join('')}</div>
<h3>Events <span class="cx-sub">${EVENTS.length} in the deck</span></h3><div class="cx-list">${EVENTS.map(E => `<div class="cx-ev"><svg class="evart" viewBox="0 0 48 48" aria-hidden="true">${EVENT_ART[E.id]}</svg><div><b>${esc(E.name)}</b>${eventGlyphs(E.id, 22)}<p>${kw(E.text)}</p></div></div>`).join('')}</div>
<h3>Relics <span class="cx-sub">pick 1 of 3 before each match</span></h3><div class="cx-list">${RELIC_IDS.map(id => `<div class="cx-relic">${relicGlyphs(id, 22)}<b>${esc(RELICS[id].name)}</b><p>${kw(RELICS[id].text)}</p></div>`).join('')}</div>`;
}
document.addEventListener('input', e => { if (e.target.id === 'cx-q') { CODEX.q = e.target.value; $('#cx-results').innerHTML = codexCardResults(); } });
async function holdForOverlay() { while (CODEX.open) await wait(250); }
