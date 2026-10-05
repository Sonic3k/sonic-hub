/* ── Screens and sheets: menu, civilization select, relics, settings, help, deck, results ── */
function sigCards(civ) { return CIVS[civ].deck.split(/\s+/).filter(t => t[0] === '+').map(t => { const id = t.slice(1), U = UNIQUE[id]; return { uid: 0, name: U.name, icons: U.icons, text: U.text, civ, unique: id, steps: [] }; }); }
function impCards(civ) { return IMPERIAL[civ].cards.map(d => ({ uid: 0, name: d.name, icons: d.icons, text: d.text, civ, imperial: true, steps: [] })); }
function deckMix(civ) { const n = {}; for (const c of buildDeck({ nextUid: 1 }, civ)) for (const ch of c.icons) n[ch] = (n[ch] || 0) + 1; return Object.entries(n).sort((a, b) => b[1] - a[1]); }
function statsLine() { const all = Object.values(SET.stats); const g = all.reduce((a, r) => a + r[1], 0), w = all.reduce((a, r) => a + r[0], 0); return g ? `You have won ${w} of ${g} matches.` : 'New here? Learn to play takes about five minutes.'; }
function renderMenu() {
  const count = mobile() ? 3 : 5, mid = (count - 1) / 2, picks = shuffled({ rs: (Date.now() & 0xffffff) >>> 0 }, CIV_ORDER).slice(0, count);
  const fan = picks.map((c, i) => { const k = i - mid; return cardHTML(sigCards(c)[0], { style: `--x:${k * (mobile() ? 84 : 112)}px;--y:${Math.abs(k) * 16}px;--rot:${k * 7}deg;--d:${120 + i * 90}ms` }); }).join('');
  $('#screen-menu').innerHTML = `<div class="menu"><h1 class="menu-title">Medieval Mayhem</h1><p class="menu-sub">Thirty-five civilizations, one deck each. Draw a card, play a card, outlast every rival.</p>
<div class="menu-fan" aria-hidden="true">${fan}</div>
<div class="menu-actions">${SET.tutorialDone ? '' : '<button class="btn" data-act="tutorial">Learn to play</button>'}<button class="btn${SET.tutorialDone ? '' : ' ghost'}" data-act="quick">Quick match</button><button class="btn ghost" data-act="choose">Choose a civilization</button>${SET.tutorialDone ? '<button class="btn ghost" data-act="tutorial">Replay the tutorial</button>' : ''}<button class="btn ghost" data-act="settings">Settings</button></div>
<p class="menu-foot">${statsLine()}</p></div>`;
}
function renderSelect() {
  const civ = UI.civ, C = CIVS[civ], hpOf = c => (UI.n === 2 ? CIVS[c].hp2 : CIVS[c].hp4), rec = SET.stats[civ];
  const list = GROUPS.map(g => `<div class="region"><h3>${esc(g)}</h3><div class="civ-grid">${CIV_ORDER.filter(c => CIVS[c].group === g).map(c => `<button class="civ-tile civ-${c}${c === civ ? ' on' : ''}" data-civ="${c}" aria-pressed="${c === civ}">${crest(c, 36)}<span class="nm">${esc(CIVS[c].name)}</span><span class="hp" data-tip="Starting HP ${UI.n === 2 ? 'in a duel' : 'at a 3–4 player table'}">${hpOf(c)}</span></button>`).join('')}</div></div>`).join('');
  $('#screen-select').innerHTML = `<div class="sel-top"><button class="icon-btn" data-act="menu" aria-label="Back to the menu">${ICON.back}</button><h2>Choose your civilization</h2><button class="btn ghost small" data-act="random-civ">Random</button></div>
<div class="sel-list">${list}</div>
<div class="sel-detail civ-${civ}"><div class="sd-hero">${crest(civ, 72)}<div><h2>${esc(C.name)}</h2><p>${esc(C.style)}</p></div></div>
<div class="sd-body"><div class="sd-stats"><span><b class="kw k-hp">${C.hp2}</b> HP in a duel</span><span><b class="kw k-hp">${C.hp4}</b> HP at a bigger table</span>${rec ? `<span>Won <b>${rec[0]}</b> of ${rec[1]}</span>` : ''}</div>
<h3>Signature cards</h3><div class="sd-cards">${sigCards(civ).map(c => cardHTML(c, { size: 'sm' })).join('')}</div>
<h3>Imperial Age</h3><p>${kw(IMPERIAL[civ].bonus.text)}</p><div class="sd-cards">${impCards(civ).map(c => cardHTML(c, { size: 'sm' })).join('')}</div>
<h3>The 24-card deck</h3><div class="mix">${deckMix(civ).map(([ch, k]) => `<span data-tip="${esc(SYM[ch].name)}: ${esc(SYM[ch].desc)}">${symBadge(ch, 22)}${k}</span>`).join('')}</div>
<p class="muted">Card frames use ${MOTIF_NAMES[CIV_MOTIF[civ]]}.</p></div>
<div class="sd-foot"><div class="seg" role="group" aria-label="Players">${[2, 3, 4].map(n => `<button class="${UI.n === n ? 'on' : ''}" data-n="${n}">${n === 2 ? 'Duel' : n + ' players'}</button>`).join('')}</div><div class="seg" role="group" aria-label="Difficulty">${['easy', 'normal', 'hard'].map(d => `<button class="${SET.difficulty === d ? 'on' : ''}" data-diff="${d}">${d[0].toUpperCase() + d.slice(1)}</button>`).join('')}</div><button class="btn" data-act="start">To battle</button></div></div>`;
}
function relicSheet() {
  const P = S.players[0];
  openSheet(`<h2>Choose a relic</h2><p class="muted">It stays with you all match. Three are drawn at random every time.</p><div class="relics">${P.relicOffer.map(id => `<button class="relic-pick" data-relic="${id}"><b>${esc(RELICS[id].name)}</b><span>${kw(RELICS[id].text)}</span></button>`).join('')}</div>
<p class="muted">Facing ${S.players.slice(1).map(o => `${esc(CIVS[o.civ].name)} (${esc(RELICS[o.relic].name)})`).join(', ')}.</p>`, true);
}
function settingsSheet() {
  const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${SET[key] === v ? 'on' : ''}" data-set="${key}" data-val="${v}">${l}</button>`).join('')}</div>`;
  openSheet(`<h2>Settings</h2>
<div class="set-row"><div><b>Difficulty</b><span>How sharp the computer plays. Applies from the next match.</span></div>${seg('difficulty', [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']])}</div>
<div class="set-row"><div><b>Animation speed</b><span>Max skips almost all motion.</span></div>${seg('speed', [['slow', '½×'], ['normal', '1×'], ['fast', '2×'], ['instant', 'Max']])}</div>
<div class="set-row"><div><b>Sound</b><span>Card, hit and fanfare effects.</span></div>${seg('sound', [[true, 'On'], [false, 'Off']])}</div>
${navigator.vibrate ? `<div class="set-row"><div><b>Vibration</b><span>A short buzz when your turn starts or you are hit.</span></div>${seg('haptics', [[true, 'On'], [false, 'Off']])}</div>` : ''}
<div class="set-row"><div><b>Tutorial</b><span>Show the guided first match again.</span></div><button class="btn ghost small" data-act="tutorial-reset">Reset</button></div>
<div class="row"><button class="btn" data-act="close">Done</button></div>`);
}
function pauseSheet() {
  openSheet(`<h2>Paused</h2><div class="row"><button class="btn" data-act="close">Resume</button><button class="btn ghost mob-only" data-act="deck">Your deck</button><button class="btn ghost" data-act="help">How to play</button><button class="btn ghost" data-act="settings">Settings</button><button class="btn ghost" data-act="concede">Leave match</button></div>`);
}
function helpSheet() {
  openSheet(`<h2>How to play</h2>
<p>Each player brings their civilization's own deck. On your turn you <b>draw 1 card and play 1</b>; with an empty hand you draw 2. A card does what its symbols say, from left to right. The last realm with HP left wins.</p>
<p>Coloured words show the kind of effect: <b class="kw k-dmg">damage</b>, <b class="kw k-hp">HP</b>, <b class="kw k-gold">gold</b>, <b class="kw k-card">cards</b>, <b class="kw k-wall">walls</b>, <b class="kw k-play">play another card</b>, <b class="kw k-aoe">every opponent</b>, <b class="kw k-pierce">over the walls</b>, <b class="kw k-steal">steal</b>, <b class="kw k-raze">destroy</b>.</p>
<div class="legend">${SYM_ORDER.split('').map(ch => `<div>${symBadge(ch, 28)}<b>${esc(SYM[ch].name)}</b><span>${kw(SYM[ch].desc)}</span></div>`).join('')}</div>
<h3>Around the table</h3>
<p><b>Walls</b> stand in front of your camp and take damage first. <b>Events</b> hit everyone each round, and the next one is always shown. The <b>Mercenary Market</b> sells one card per turn for gold; it joins your deck. Your <b>relic</b> is a small bonus picked at the start.</p>
<p><b>Imperial Age</b>: at the start of your ${RULES.ageTurn}th turn a card arrives that adds your civilization's three Imperial cards to your deck, plus its own bonus. <b>Wonders</b> win the game if they survive three turns. The first time you fall to 3 HP or less you draw 2 cards, and from round 16 everyone loses 1 HP each round.</p>
<h3>Controls</h3><p>Tap or click a card to see it large with its result on every camp, then press <b>Play</b>. For a card that needs a target, tap an enemy camp first. Tap any camp at other times to inspect it. Small cards open at full size when you hover or press and hold them.</p><p>Keys: <b>1–9</b> pick a card, <b>Enter</b> play, <b>Tab</b> switch target, <b>Esc</b> cancel, <b>L</b> chronicle, <b>S</b> speed, <b>H</b> help.</p>
<div class="row"><button class="btn" data-act="close">Close</button></div>`);
}
function deckSheet(which) {
  const P = S.players[0], list = which === 'deck' ? P.deck : P.discard, n = {};
  for (const c of list) { const k = c.name + '|' + typeOf(c); n[k] = (n[k] || 0) + 1; }
  const rows = Object.entries(n).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k, v]) => { const [name, type] = k.split('|'); return `<div><span>${esc(name)}${type !== 'Common' ? ` <span class="muted">(${type})</span>` : ''}</span><b>${v}</b></div>`; }).join('');
  openSheet(`<h2>${which === 'deck' ? 'Your deck' : 'Your discard pile'}</h2><p class="muted">${which === 'deck' ? `${P.deck.length} cards left to draw, shown by name, not in draw order. When it runs out your discard pile is shuffled back in and you lose 1 HP.` : `${P.discard.length} cards played or lost so far.`}</p><div class="decklist">${rows || '<p class="muted">Empty.</p>'}</div><div class="row"><button class="btn" data-act="close">Close</button></div>`);
}
function resultsSheet() {
  const me = S.players[0], W = S.winner != null && S.winner >= 0 ? S.players[S.winner] : null, win = S.winner === 0;
  const why = S.wonderWin ? 'by completing a wonder' : S.timeUp ? 'with the most HP after 40 rounds' : 'as the last realm standing';
  openSheet(`<div class="civ-${(W || me).civ}" style="text-align:center"><div style="display:flex;justify-content:center">${crest((W || me).civ, 84)}</div>
<h2>${win ? 'Victory' : me.alive ? 'Defeat' : 'You were defeated'}</h2><p>${W ? `${W.id === 0 ? 'You win' : esc(CIVS[W.civ].name) + ' win'} ${why}.` : `Still standing: ${S.players.filter(p => p.alive).map(p => esc(CIVS[p.civ].name)).join(', ')}.`}</p>
<div class="sd-stats" style="justify-content:center"><span>Damage dealt <b>${me.stats.dmg}</b></span><span>Cards played <b>${me.stats.played}</b></span><span>Mercenaries <b>${me.stats.bought}</b></span><span>Rounds <b>${S.round}</b></span></div>
<div class="row center"><button class="btn" data-act="again">Play again</button><button class="btn ghost" data-act="choose">Choose another civilization</button><button class="btn ghost" data-act="menu">Main menu</button></div></div>`, true);
}
function mobileSheet(which) {
  if (which === 'events') { UI.eventSeen = S.round; renderTopbar(); return openSheet(`<h2>Events</h2>${eventsHTML()}<div class="row"><button class="btn" data-act="close">Close</button></div>`); }
  const me = S.players[0], mine = isMyTurn() && !S.flags.bought;
  openSheet(`<div class="market-sheet"><h2>Mercenary Market</h2><p class="muted">You have <b class="kw k-gold">${me.gold} gold</b>. ${S.turn !== 0 ? 'You can hire on your turn.' : S.flags.bought ? 'You already hired this turn.' : 'Hire 1 card per turn; it goes straight to your hand.'}</p>
<div class="mk-big">${S.market.map((c, i) => { if (!c) return ''; const cost = marketCost(S, me, c), ok = mine && me.gold >= cost; return `<div class="mk-col">${cardHTML(c)}<button class="btn small${ok ? '' : ' ghost'}" data-hire="${i}"${ok ? '' : ' disabled'}>Hire for ${cost} gold</button></div>`; }).join('')}</div>
<div class="row center"><button class="btn ghost" data-act="close">Close</button></div></div>`);
}
function campSheet(pid) {
  const P = S.players[pid], C = CIVS[P.civ], W = wonderOf(P), I = IMPERIAL[P.civ];
  const note = { regen: 'regains 1 durability each turn', sacred: 'heals its owner 1 HP each turn', thorns: 'whoever hits it takes 1 damage', fortress: 'raze removes only 1 durability', income: 'gives its owner 1 gold each turn' };
  const plays = S.log.filter(e => e.k === 'play' && e.pid === pid).slice(-5).reverse();
  const toks = [P.tokens.camel ? 'Camel guard: the next cavalry attack against this camp is cancelled.' : '', P.tokens.immune ? 'Divine Wind: every attack against this camp is cancelled until its next turn.' : '', P.tokens.trap ? 'Bạch Đằng stakes: the first opponent to deal damage here takes 2 damage.' : ''].filter(Boolean);
  openSheet(`<div class="camp-sheet civ-${P.civ}"><div class="hdr">${crest(P.civ, 56)}<div><h2>${pid === 0 ? 'You' : esc(C.name)}</h2><p>${esc(C.style)}</p></div></div>
<div class="sd-stats"><span><b class="kw k-hp">${Math.max(0, P.hp)}</b> of ${P.maxHP} HP</span><span><b class="kw k-gold">${P.gold}</b> gold</span><span><b class="kw k-card">${P.hand.length}</b> cards in hand</span><span><b>${P.deck.length}</b> in deck</span></div>
${P.relic ? `<p><b>${esc(RELICS[P.relic].name)}</b>: ${kw(RELICS[P.relic].text)}</p>` : ''}
<h3>Walls and buildings</h3>${P.structs.length ? `<div class="ws">${P.structs.map(st => `<div>${workHTML(st)}<span>${esc(st.card.name)}${st.kind === 'wonder' ? `: wins in ${Math.max(0, 3 - st.age)} turn(s) unless destroyed` : note[st.kind] ? ': ' + note[st.kind] : ''}</span></div>`).join('')}</div>` : '<p class="muted">None standing.</p>'}
${toks.length ? `<h3>Effects</h3><ul>${toks.map(t => `<li>${kw(t)}</li>`).join('')}</ul>` : ''}
<h3>Imperial Age</h3><p>${!P.ageGiven ? `The card arrives in ${Math.max(1, RULES.ageTurn - P.turns)} turn(s).` : !P.aged ? 'Holds the Imperial Age card.' : 'In the Imperial Age.'} ${kw(I.bonus.text)}</p>
<div class="sd-cards">${impCards(P.civ).map(c => cardHTML(c, { size: 'sm' })).join('')}</div>
<h3>Last cards played</h3>${plays.length ? `<ul>${plays.map(e => `<li>Round ${e.round}: <b>${esc(e.card)}</b>${e.target != null ? ' on ' + esc(civObjOf(e.target)) : ''}</li>`).join('')}</ul>` : '<p class="muted">Nothing yet.</p>'}
<div class="row"><button class="btn" data-act="close">Close</button></div></div>`);
}
