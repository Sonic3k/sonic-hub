/* ── Codex: every civilization, card, symbol and rule, readable in and out of a match.
   Also the card sheet: the full story of one card (what it does, each symbol, who owns it). ── */
const CODEX = { open: false, tab: 'civs', civ: null, q: '', filter: 'all' };

/* symbol icons as CSS sprites, so long lists stay light */
function symSVG(ch) {
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='12' r='11.4' fill='${SYM_PIG[ch]}' stroke='#24180c' stroke-opacity='.8' stroke-width='.9'/><circle cx='12' cy='12' r='10.15' fill='none' stroke='#d2ad57' stroke-width='1.15'/>${SYM_STYLE[ch][1].replace(/#fff/g, '#f6ebcf')}</svg>`;
}
function installSymbolSprites() {
  let css = '';
  for (const ch of SYM_ORDER) css += `.sy-${ch}{background-image:${svgURL(symSVG(ch))}}\n`;
  css += `.sy-crown{background-image:${svgURL(crownSVG(24).replace('<svg ', "<svg xmlns='http://www.w3.org/2000/svg' "))}}\n`;
  const el = document.createElement('style'); el.id = 'symbol-sprites'; el.textContent = css; document.head.appendChild(el);
}
const symIcons = icons => [...icons].map(ch => `<i class="sy sy-${ch}" title="${SYM[ch].name}"></i>`).join('');

/* any card outside a live hand is rebuilt from a short reference: com:civ:icons, sig:civ:id, imp:civ:index, merc:id, age:civ */
function staticCard(ref) {
  const [kind, a, b] = ref.split(':');
  if (kind === 'com') { const c = cardFromIcons(b); return { uid: 0, ref, name: COMMON_NAMES[b] || SYM[b[0]].name, icons: b, civ: a, steps: c.steps, wall: c.wall }; }
  if (kind === 'sig') { const U = UNIQUE[b]; return { uid: 0, ref, name: U.name, icons: U.icons, text: U.text, civ: a, unique: b, steps: (U.steps || []).map(s => ({ ...s })), wall: U.wall || 0, kind: U.kind || (U.wonder ? 'wonder' : null), wonder: !!U.wonder }; }
  if (kind === 'imp') { const d = IMPERIAL[a].cards[+b], c = d.steps ? { steps: d.steps.map(s => ({ ...s })), wall: d.wall || 0 } : cardFromIcons(d.icons); return { uid: 0, ref, name: d.name, icons: d.icons, text: d.text, civ: a, imperial: true, steps: c.steps, wall: d.wall != null ? d.wall : c.wall, kind: d.kind || null }; }
  if (kind === 'merc') { const M = MERCS.find(m => m.id === a), c = M.steps ? { steps: M.steps.map(s => ({ ...s })), wall: (M.icons.match(/W/g) || []).length } : cardFromIcons(M.icons); return { uid: 0, ref, name: M.name, icons: M.icons, text: M.text, civ: 'merc', merc: a, cost: M.cost, steps: c.steps, wall: c.wall }; }
  if (kind === 'age') return { uid: 0, ref, name: 'Imperial Age', icons: '', civ: a, age: true, bound: true, steps: [{ ageup: 1 }], wall: 0, text: ageText(a) };
  if (kind === 'mk') return S && S.market[+a];
  return null;
}
let COMMON_IN = null;
function commonIn() {
  if (COMMON_IN) return COMMON_IN;
  COMMON_IN = {};
  for (const civ of CIV_ORDER) for (const tok of CIVS[civ].deck.split(/\s+/)) {
    if (tok[0] === '+') continue;
    const m = tok.match(/^([A-Z]+)(\d+)$/), o = COMMON_IN[m[1]] || (COMMON_IN[m[1]] = {});
    o[civ] = (o[civ] || 0) + +m[2];
  }
  return COMMON_IN;
}
const MIX = {};
const mixOf = civ => MIX[civ] || (MIX[civ] = Object.fromEntries(deckMix(civ)));
const symbolUsers = ch => CIV_ORDER.map(civ => [civ, mixOf(civ)[ch] || 0]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
const cardKind = c => (c.age ? 'age' : c.imperial ? 'imp' : c.unique ? 'sig' : c.civ === 'merc' ? 'merc' : 'com');
const KIND_TAG = { age: ['imp', 'Imperial Age'], imp: ['imp', 'Imperial'], sig: ['sig', 'Signature'], merc: ['merc', 'Mercenary'], com: ['com', 'Common'] };
const KIND_NOTE = { regen: 'It regains 1 durability on each of your turns.', sacred: 'While it stands you heal 1 HP on each of your turns.', thorns: 'Whoever hits it takes 1 damage.', fortress: 'Razing removes only 1 durability from it.', income: 'While it stands you gain 1 gold on each of your turns.' };
function civChip(civ, n) { return `<button class="civchip civ-${civ}" data-act="codex-civ" data-civ="${civ}">${crest(civ, 18)}<span>${esc(CIVS[civ].name)}</span>${n ? `<em>×${n}</em>` : ''}</button>`; }
function symGroups(icons) { const g = []; for (const ch of icons) { const last = g[g.length - 1]; if (last && last[0] === ch) last[1]++; else g.push([ch, 1]); } return g; }

/* ── the card sheet ── */
function cardSheet(card, ctx = {}) {
  if (!card) return;
  hideZoom(); hideTip();
  const k = cardKind(card), [tagCls, tagText] = KIND_TAG[k];
  const who = k === 'age' ? `Arrives at the start of turn ${RULES.ageTurn}. It can't be stolen, discarded or passed, and leaves play once used.`
    : k === 'imp' ? `Imperial card of the ${CIVS[card.civ].name}. It joins their deck when they reach the Imperial Age.`
    : k === 'sig' ? `Signature card of the ${CIVS[card.civ].name}. Only their deck has it.`
    : k === 'merc' ? `Hired at the Mercenary Market for ${card.cost} gold. Anyone can hire it.`
    : `Shared by ${Object.keys(commonIn()[card.icons] || {}).length} of the ${CIV_ORDER.length} civilizations.`;
  const notes = [];
  if (card.wonder) notes.push('A wonder has 3 durability plus 1 per opponent and takes hits before your walls. If it still stands at the start of your third turn after building it, you win. Raze, elephants and bombards remove 2 durability from it.');
  else if (card.wall > 0) notes.push(`Structures stand in front of your camp and take damage before your HP.${card.kind && KIND_NOTE[card.kind] && !card.text ? ' ' + KIND_NOTE[card.kind] : ''}`);
  if (needsTarget(card)) notes.push('With several opponents you choose which camp it hits.');
  const groups = symGroups(card.icons || '');
  let found = '';
  if (k === 'com') { const users = Object.entries(commonIn()[card.icons] || {}).sort((a, b) => b[1] - a[1]); found = users.length > 12 ? `<p class="muted">In ${users.length} of ${CIV_ORDER.length} decks.</p>` : `<div class="cx-users">${users.map(([c, n]) => civChip(c, n)).join('')}</div>`; }
  else if (k === 'sig' || k === 'imp' || k === 'age') found = `<div class="cx-users">${civChip(card.civ)}</div>`;
  const mine = ctx.hand && S && isMyTurn() && S.players[0].hand.some(c => c.uid === card.uid);
  const multi = mine && needsTarget(card) && opponents(S, S.players[0]).length > 1;
  const btns = [];
  if (mine) btns.push(`<button class="btn" data-act="play-card" data-uid="${card.uid}">${multi ? 'Choose a target' : 'Play ' + esc(card.name)}</button>`);
  if (ctx.hire != null && S) { const cost = marketCost(S, S.players[0], card), ok = isMyTurn() && !S.flags.bought && S.players[0].gold >= cost; btns.push(`<button class="btn${ok ? '' : ' ghost'}" data-hire="${ctx.hire}"${ok ? '' : ' disabled'}>Hire for ${cost} gold</button>`); }
  btns.push('<button class="btn ghost" data-act="close">Close</button>');
  openSheet(`<div class="card-sheet"><div class="cs-card">${cardHTML(card, { size: 'lg' })}</div><div class="cs-body">
<div class="cs-kind"><span class="cx-tag ${tagCls}">${tagText}</span><span>${esc(who)}</span></div>
<h3>What it does</h3><p class="cs-eff">${kw(cardText(card))}</p>${notes.map(n => `<p class="cs-note">${kw(n)}</p>`).join('')}
${groups.length ? `<h3>Symbols, left to right</h3><div class="cs-syms">${groups.map(([ch, n]) => `<div>${symBadge(ch, 30)}<b>${esc(SYM[ch].name)}${n > 1 ? ' ×' + n : ''}</b><span>${kw(SYM[ch].desc)}</span></div>`).join('')}</div>` : ''}
${found ? `<h3>Found in</h3>${found}` : ''}
<div class="row">${btns.join('')}</div></div></div>`);
}

/* ── one civilization, used by the codex and the civilization select ── */
function deckRows(civ) {
  const map = new Map();
  for (const tok of CIVS[civ].deck.split(/\s+/)) {
    if (tok[0] === '+') { map.set(`sig:${civ}:${tok.slice(1)}`, 1); continue; }
    const m = tok.match(/^([A-Z]+)(\d+)$/), ref = `com:${civ}:${m[1]}`;
    map.set(ref, (map.get(ref) || 0) + +m[2]);
  }
  const all = [...map];
  return [...all.filter(([r]) => r.startsWith('sig:')), ...all.filter(([r]) => r.startsWith('com:'))];
}
function cardRow(card, extra) {
  const k = cardKind(card), tag = k === 'com' ? '' : `<span class="cx-tag ${KIND_TAG[k][0]}">${KIND_TAG[k][1]}</span>`;
  return `<button class="cx-row" data-cref="${card.ref}"><span class="cx-syms">${k === 'age' ? '<i class="sy sy-crown"></i>' : symIcons(card.icons)}</span><span class="cx-main"><b>${esc(card.name)}${tag}</b><em>${kw(cardText(card))}</em></span>${extra ? `<span class="cx-x">${extra}</span>` : ''}</button>`;
}
function civDetailHTML(civ, mode) {
  const C = CIVS[civ], rec = SET.stats[civ], I = IMPERIAL[civ], P0 = S && UI.screen === 'match' ? S.players[0] : null;
  const live = mode === 'match' && P0 && P0.civ === civ ? `<div class="cx-live"><span>In this match</span><button class="pile" data-act="deck">Deck ${P0.deck.length}</button><span class="pile">Hand ${P0.hand.length}</span><button class="pile" data-act="discard">Discard ${P0.discard.length}</button></div>` : '';
  const small = c => cardHTML(c, { size: 'sm', attrs: `data-cref="${c.ref}" role="button" tabindex="0" aria-label="${esc(c.name)}: details"` });
  return `<div class="sd-hero">${crest(civ, 72)}<div><h2>${esc(C.name)}</h2><p>${esc(C.style)}</p></div></div>
<div class="sd-body"><div class="sd-stats"><span><b class="kw k-hp">${C.hp2}</b> HP in a duel</span><span><b class="kw k-hp">${C.hp4}</b> HP at a bigger table</span>${rec ? `<span>You won <b>${rec[0]}</b> of ${rec[1]}</span>` : ''}</div>${live}
<h3>Signature cards</h3><div class="sd-cards">${sigCards(civ).map(small).join('')}</div>
<h3>Imperial Age</h3><p>At the start of turn ${RULES.ageTurn} the Imperial Age card arrives. Playing it adds these three cards to the deck. ${kw(I.bonus.text)}</p><div class="sd-cards">${impCards(civ).map(small).join('')}</div>
<h3>Full deck <span class="cx-sub">24 cards · tap one for details</span></h3><div class="cx-list">${deckRows(civ).map(([ref, n]) => cardRow(staticCard(ref), '×' + n)).join('')}</div>
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
  const tabs = [['civs', 'Civilizations'], ['cards', 'Cards'], ['symbols', 'Symbols'], ['rules', 'Rules']];
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
  return `<p class="cx-lead">Thirty-five civilizations, each with its own 24-card deck, two signature cards and three Imperial cards. Tap one to see everything it plays.</p>` +
    GROUPS.map(g => `<div class="region"><h3>${esc(g)}</h3><div class="civ-grid">${CIV_ORDER.filter(c => CIVS[c].group === g).map(c => `<button class="civ-tile fam-${CIV_FAMILY[c]} civ-${c}" data-act="codex-civ" data-civ="${c}">${crest(c, 36)}<span class="nm">${esc(CIVS[c].name)}</span>${mine.includes(c) ? `<span class="hp">${c === mine[0] ? 'You' : 'Rival'}</span>` : ''}</button>`).join('')}</div></div>`).join('');
}
function allCards() {
  if (allCards.cache) return allCards.cache;
  const out = [];
  for (const key of Object.keys(COMMON_NAMES)) if (commonIn()[key]) out.push(staticCard(`com:neutral:${key}`));
  for (const civ of CIV_ORDER) out.push(...sigCards(civ));
  for (const civ of CIV_ORDER) out.push(...impCards(civ));
  for (const M of MERCS) out.push(staticCard('merc:' + M.id));
  return (allCards.cache = out);
}
const cardOwner = c => (cardKind(c) === 'com' ? `${Object.keys(commonIn()[c.icons]).length} decks` : cardKind(c) === 'merc' ? `${c.cost} gold` : CIVS[c.civ].name);
function codexCards() {
  const kinds = [['all', 'All'], ['com', 'Common'], ['sig', 'Signature'], ['imp', 'Imperial'], ['merc', 'Mercenary']];
  return `<div class="cx-search"><input id="cx-q" type="search" placeholder="Search a card, an effect or a civilization" value="${esc(CODEX.q)}" autocomplete="off" enterkeyhint="search" aria-label="Search cards"><div class="chipf" role="group" aria-label="Card type">${kinds.map(([k, l]) => `<button class="${CODEX.filter === k ? 'on' : ''}" data-act="cx-filter" data-f="${k}">${l}</button>`).join('')}</div></div><div id="cx-results">${codexCardResults()}</div>`;
}
function codexCardResults() {
  const q = CODEX.q.trim().toLowerCase(), f = CODEX.filter;
  const words = c => [c.name, cardText(c), cardOwner(c), KIND_TAG[cardKind(c)][1], ...[...(c.icons || '')].map(ch => SYM[ch].name)].join(' ').toLowerCase();
  const groups = [['com', 'Common cards', 'Shared by many decks; the same card works the same for everyone.'], ['sig', 'Signature cards', 'Two per civilization, found only in its deck.'], ['imp', 'Imperial cards', 'Three per civilization, added when it reaches the Imperial Age.'], ['merc', 'Mercenaries', 'Hired at the market with gold; anyone can buy them.']];
  let total = 0;
  const html = groups.filter(([k]) => f === 'all' || f === k).map(([k, title, note]) => {
    const score = c => (!q ? 1 : c.name.toLowerCase().includes(q) ? 3 : [...(c.icons || '')].some(ch => SYM[ch].name.toLowerCase().includes(q)) ? 2 : words(c).includes(q) ? 1 : 0);
    const list = allCards().filter(c => cardKind(c) === k).map((c, i) => [c, score(c), i]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1] || a[2] - b[2]).map(x => x[0]);
    total += list.length;
    return list.length ? `<h3>${title} <span class="cx-sub">${list.length}</span></h3><p class="cx-note">${note}</p><div class="cx-list">${list.map(c => cardRow(c, esc(cardOwner(c)))).join('')}</div>` : '';
  }).join('');
  return total ? html : `<p class="cx-empty">No card matches “${esc(CODEX.q)}”.</p>`;
}
function codexSymbols() {
  const legend = [['dmg', 'damage'], ['hp', 'HP'], ['gold', 'gold'], ['card', 'cards'], ['wall', 'walls'], ['play', 'play another card'], ['aoe', 'every opponent'], ['pierce', 'over the walls'], ['steal', 'steal'], ['raze', 'destroy']].map(([k, t]) => `<b class="kw k-${k}">${t}</b>`).join(', ');
  return `<p class="cx-lead">Every card is built from these symbols and resolves them from left to right. Coloured words on cards follow the same colours: ${legend}.</p><div class="cx-list">${SYM_ORDER.split('').map(ch => {
    const users = symbolUsers(ch);
    const who = users.length === CIV_ORDER.length ? '<span class="muted">Every civilization uses it.</span>' : users.length > 18 ? `<span class="muted">Used by ${users.length} civilizations.</span>` : users.map(([c, n]) => civChip(c, n)).join('');
    return `<div class="cx-sym">${symBadge(ch, 40)}<div><b>${esc(SYM[ch].name)}</b><p>${kw(SYM[ch].desc)}</p><div class="cx-users">${who}</div></div></div>`;
  }).join('')}</div>`;
}
function codexRules() {
  const bld = [['wall', 'Wall', 'absorbs damage before HP'], ['palisade', 'Palisade or wagon fort', 'a light wall'], ['tower', 'Tower', 'a wall'], ['castle', 'Castle or fortress', 'a heavy wall'], ['spikes', 'Spiked wall', 'whoever hits it takes 1 damage'], ['church', 'Church', 'heals its owner 1 HP each turn'], ['regen', 'Self-repairing wall', 'regains 1 durability each turn'], ['stall', 'Trading post', 'gives its owner 1 gold each turn'], ['wonder', 'Wonder', 'wins the game if it survives three turns']];
  return `<h3>The basics</h3><p>Each player brings their civilization's own 24-card deck. On your turn you <b>draw 1 card and play 1</b>; with an empty hand you draw 2. A card does what its symbols say, from left to right. Bring every rival to 0 HP to win.</p>
<h3>Around the table</h3><p><b>Defenses</b> stand in front of a camp and take damage before its HP; ranged attacks shoot over them. <b>Events</b> hit everyone each round from round 2, and the next one is always shown. The <b>Mercenary Market</b> sells one card per turn for gold; it goes straight to your hand. Your <b>relic</b> is a small bonus picked before each match.</p>
<h3>Imperial Age, wonders and the long war</h3><p>At the start of your ${RULES.ageTurn}th turn the <b>Imperial Age</b> card arrives. Playing it uses your play for the turn: your civilization's three Imperial cards join your deck and its bonus fires. A <b>wonder</b> wins the game if it still stands at the start of your third turn after building it. The first time you drop to 3 HP or less you draw 2 cards. From round 16 everyone loses 1 HP each round.</p>
<h3>Controls</h3><p>Tap a card to choose it: it shows large on the chart, the tags above each camp show the result, and <b>Play</b> confirms. Tap the chosen card again, or ⓘ, to read it in full. <b>Drag</b> a card to play it straight away: hold it for a moment or pull it up, then drop it on the chart, or on an enemy camp to aim it; let go anywhere else and it goes back to your hand. Swipe the hand sideways to see the rest. Tap any camp to inspect it, and tap the card on the chart to read it.</p><p class="muted">Keys: 1–9 choose a card, Enter play, I details, Tab switch target, Esc cancel, C codex, L chronicle, S speed, H rules.</p>
<h3>Defenses <span class="cx-sub">the number on each is how much more damage it can absorb</span></h3><div class="cx-list">${bld.map(([k, n, t]) => `<div class="cx-ev"><span class="bld"><svg viewBox="0 0 24 24" aria-hidden="true">${BUILD[k]}</svg></span><div><b>${n}</b><p>${kw(t[0].toUpperCase() + t.slice(1))}.</p></div></div>`).join('')}</div>
<h3>Status markers <span class="cx-sub">the crown beside HP; guards stand in the Defenses row</span></h3><div class="cx-list">${['crown', 'camel', 'wind', 'stakes'].map(m => `<div class="cx-ev"><span class="medal">${medalSVG(m)}</span><div><p>${kw(MEDAL_TIP[m])}</p></div></div>`).join('')}</div>
<h3>Reading events and relics <span class="cx-sub">their glyphs use the card symbols</span></h3><div class="gl-legend">${GLYPH_LEGEND.map(([g, t]) => `<div>${glyphRow(g, 24)}<span>${kw(t)}</span></div>`).join('')}</div>
<h3>Events <span class="cx-sub">${EVENTS.length} in the deck</span></h3><div class="cx-list">${EVENTS.map(E => `<div class="cx-ev"><svg class="evart" viewBox="0 0 48 48" aria-hidden="true">${EVENT_ART[E.id]}</svg><div><b>${esc(E.name)}</b>${eventGlyphs(E.id, 22)}<p>${kw(E.text)}</p></div></div>`).join('')}</div>
<h3>Relics <span class="cx-sub">pick 1 of 3 before each match</span></h3><div class="cx-list">${RELIC_IDS.map(id => `<div class="cx-relic">${relicGlyphs(id, 22)}<b>${esc(RELICS[id].name)}</b><p>${kw(RELICS[id].text)}</p></div>`).join('')}</div>`;
}
document.addEventListener('input', e => { if (e.target.id === 'cx-q') { CODEX.q = e.target.value; $('#cx-results').innerHTML = codexCardResults(); } });
async function holdForOverlay() { while (CODEX.open) await wait(250); }
