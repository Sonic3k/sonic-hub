/* ── Screens and sheets: menu, civilization select, relics, settings, help, deck, results ── */
/* the units only this civilization fields (they carry its crest), its Imperial cards, and the symbols in its deck */
function ownUnits(civ) { const ids = [...new Set([...Object.keys(CIVS[civ].deck), ...Object.keys(CIVS[civ].imperial)])].filter(id => crestOf(id) === civ); return ids.map(id => staticCard(`u:${civ}:${id}`)); }
function impCards(civ) { return Object.keys(CIVS[civ].imperial).map(id => staticCard(`u:${civ}:${id}`)); }
function deckMix(civ) { const n = {}; for (const [id, k] of Object.entries(CIVS[civ].deck)) for (const ch of UNITS[id].icons) n[ch] = (n[ch] || 0) + k; return Object.entries(n).sort((a, b) => b[1] - a[1]); }
const NUM_WORD = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
const civCountWord = () => NUM_WORD[CIV_ORDER.length] || String(CIV_ORDER.length);
function statsLine() { const all = Object.values(SET.stats); const g = all.reduce((a, r) => a + r[1], 0), w = all.reduce((a, r) => a + r[0], 0); return g ? `You have won ${w} of ${g} matches.` : 'New here? Learn to play takes about five minutes.'; }
function renderMenu() {
  const count = mobile() ? 3 : 5, mid = (count - 1) / 2, picks = shuffled({ rs: (Date.now() & 0xffffff) >>> 0 }, CIV_ORDER).slice(0, count);
  const fan = picks.map((c, i) => { const k = i - mid; return cardHTML(ownUnits(c)[0], { style: `--x:${k * (mobile() ? 84 : 112)}px;--y:${Math.abs(k) * 16}px;--rot:${k * 7}deg;--d:${120 + i * 90}ms` }); }).join('');
  $('#screen-menu').innerHTML = `<div class="menu"><h1 class="menu-title">Medieval Mayhem II</h1><div class="menu-rule" aria-hidden="true"></div><p class="menu-sub">${civCountWord()} civilizations from ${GROUPS.length} regions, each a deck of its own units. Every effect is in the symbols. Draw a card, play a card, outlast every rival.</p>
<div class="menu-fan" aria-hidden="true">${fan}</div>
<div class="menu-actions">${SET.tutorialDone ? '' : '<button class="btn" data-act="tutorial">Learn to play</button>'}<button class="btn${SET.tutorialDone ? '' : ' ghost'}" data-act="quick">Quick match</button><button class="btn ghost" data-act="choose">Choose a civilization</button>${SET.tutorialDone ? '<button class="btn ghost" data-act="tutorial">Replay the tutorial</button>' : ''}<div class="menu-row"><button class="btn ghost" data-act="codex">Codex</button><button class="btn ghost" data-act="settings">Settings</button></div></div>
<p class="menu-foot">${statsLine()}</p></div>`;
}
function renderSelect() {
  /* phones: the list, then a full page for the chosen civilization; wider screens: both side by side */
  const civ = UI.civ, hpOf = c => (UI.n === 2 ? CIVS[c].hp2 : CIVS[c].hp4), detail = mobile() && UI.selView === 'detail', scr = $('#screen-select');
  const list = GROUPS.map(g => `<div class="region"><h3>${esc(g)}</h3><div class="civ-grid">${CIV_ORDER.filter(c => CIVS[c].group === g).map(c => `<button class="civ-tile fam-${CIV_FAMILY[c]} civ-${c}${c === civ ? ' on' : ''}" data-civ="${c}" aria-pressed="${c === civ}">${crest(c, 36)}<span class="nm">${esc(CIVS[c].name)}</span><span class="hp" data-tip="Starting HP ${UI.n === 2 ? 'in a duel' : 'at a 3–4 player table'}">${hpOf(c)}</span></button>`).join('')}</div></div>`).join('');
  scr.classList.toggle('detail', detail);
  scr.innerHTML = `<div class="sel-top"><button class="icon-btn" data-act="${detail ? 'sel-list' : 'menu'}" aria-label="${detail ? 'All civilizations' : 'Back to the menu'}">${ICON.back}</button><h2>${detail ? 'Your civilization' : 'Choose your civilization'}</h2><button class="btn ghost small" data-act="random-civ">Random</button></div>
<div class="sel-list">${list}</div>
<div class="sel-detail fam-${CIV_FAMILY[civ]} civ-${civ}">${civDetailHTML(civ, 'select')}
<div class="sd-foot"><div class="seg" role="group" aria-label="Players">${[2, 3, 4].map(n => `<button class="${UI.n === n ? 'on' : ''}" data-n="${n}">${n === 2 ? 'Duel' : n + ' players'}</button>`).join('')}</div><div class="seg" role="group" aria-label="Difficulty">${['easy', 'normal', 'hard'].map(d => `<button class="${SET.difficulty === d ? 'on' : ''}" data-diff="${d}">${d[0].toUpperCase() + d.slice(1)}</button>`).join('')}</div><button class="btn" data-act="start">To battle</button></div></div>`;
}
function relicSheet() {
  const P = S.players[0];
  openSheet(`<h2>Choose a relic</h2><p class="muted">It stays with you all match. Three are drawn at random every time.</p><div class="relics">${P.relicOffer.map(id => `<button class="relic-pick" data-relic="${id}">${relicGlyphs(id, 30, 'rgl')}<b>${esc(RELICS[id].name)}</b><span>${kw(RELICS[id].text)}</span></button>`).join('')}</div>
<p class="muted">Facing ${S.players.slice(1).map(o => `<b>${esc(nameOf(o.id))}</b> (${esc(CIVS[o.civ].name)}, ${relicGlyphs(o.relic, 16)} ${esc(RELICS[o.relic].name)})`).join(', ')}.</p>`, true);
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
  openSheet(`<h2>Paused</h2><div class="row"><button class="btn" data-act="close">Resume</button><button class="btn ghost mob-only" data-act="deck">Your deck</button><button class="btn ghost" data-act="codex">Codex and rules</button><button class="btn ghost" data-act="settings">Settings</button><button class="btn ghost" data-act="concede">Leave match</button></div>`);
}
function helpSheet() { closeSheet(); openCodex('rules'); }
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
<h2>${win ? 'Victory' : me.alive ? 'Defeat' : 'You were defeated'}</h2><p>${W ? `${W.id === 0 ? 'You win' : `${esc(nameOf(W.id))} of the ${esc(CIVS[W.civ].name)} wins`} ${why}.` : `Still standing: ${S.players.filter(p => p.alive).map(p => esc(nameOf(p.id))).join(', ')}.`}</p>
<div class="sd-stats" style="justify-content:center"><span>Damage dealt <b>${me.stats.dmg}</b></span><span>Cards played <b>${me.stats.played}</b></span><span>Mercenaries <b>${me.stats.bought}</b></span><span>Rounds <b>${S.round}</b></span></div>
<div class="row center"><button class="btn" data-act="again">Play again</button><button class="btn ghost" data-act="choose">Choose another civilization</button><button class="btn ghost" data-act="menu">Main menu</button></div></div>`, true);
}
function mobileSheet(which) {
  if (which === 'events') { UI.eventSeen = S.round; renderTopbar(); return openSheet(`<h2>Events</h2>${eventsHTML()}<div class="row"><button class="btn" data-act="close">Close</button></div>`); }
  const me = S.players[0], mine = isMyTurn() && !S.flags.bought;
  openSheet(`<div class="market-sheet"><h2>Mercenary Market</h2><p class="muted">You have <b class="kw k-gold">${me.gold} gold</b>. ${S.turn !== 0 ? 'You can hire on your turn.' : S.flags.bought ? 'You already hired this turn.' : 'Hire 1 card per turn; it goes straight to your hand.'}</p>
<div class="mk-big">${S.market.map((c, i) => { if (!c) return ''; const cost = marketCost(S, me, c), ok = mine && me.gold >= cost; return `<div class="mk-col">${cardHTML(c, { attrs: `data-cref="mk:${i}" role="button" tabindex="0"` })}<button class="btn small${ok ? '' : ' ghost'}" data-hire="${i}"${ok ? '' : ' disabled'}>Hire for ${cost} gold</button></div>`; }).join('')}</div>
<div class="row center"><button class="btn ghost" data-act="close">Close</button></div></div>`);
}
function campSheet(pid) {
  const P = S.players[pid], C = CIVS[P.civ];
  const plays = S.log.filter(e => e.k === 'play' && e.pid === pid).slice(-5).reverse();
  const toks = tokensOf(P);
  openSheet(`<div class="camp-sheet fam-${CIV_FAMILY[P.civ]} civ-${P.civ}"><div class="hdr">${crest(P.civ, 56)}<div><h2>${esc(nameOf(pid))}</h2><p class="civline">${esc(C.name)}</p><p>${esc(C.style)}</p></div></div>
<div class="sd-stats"><span><b class="kw k-hp">${Math.max(0, P.hp)}</b> of ${P.maxHP} HP</span><span><b class="kw k-gold">${P.gold}</b> gold</span><span><b class="kw k-card">${P.hand.length}</b> cards in hand</span><span><b>${P.deck.length}</b> in deck</span></div>
${P.relic ? `<p>${relicGlyphs(P.relic, 20)} <b>${esc(RELICS[P.relic].name)}</b>: ${kw(RELICS[P.relic].text)}</p>` : ''}
<h3>Defenses <span class="cx-sub">in the order hits reach them</span></h3>${P.structs.length ? `<div class="ws">${frontOrder(P).map(st => `<div>${buildHTML(st)}<span>${esc(st.card.name)}: ${st.wonder ? `a wonder; wins in ${st.cd} of its builder's turns unless destroyed` : `${st.dur} durability`}</span></div>`).join('')}</div>` : '<p class="muted">No structure standing: every hit goes to HP.</p>'}
${toks.length ? `<h3>Guards and Traps</h3><div class="cx-list">${toks.map(([t, n]) => `<div class="cx-ev"><span class="medal">${medalSVG(t)}</span><div><p>${n > 1 ? `<b>×${n}</b> ` : ''}${kw(MEDAL_TIP[t])}</p></div></div>`).join('')}</div>` : ''}
<h3>Imperial Age</h3><p>${!P.ageGiven ? `The card arrives in round ${RULES.ageTurn}, the same round for every player.` : !P.aged ? 'Holds the Imperial Age card.' : 'In the Imperial Age.'} ${kw(ageText(P.civ))}</p>
<div class="sd-cards">${impCards(P.civ).map(c => cardHTML(c, { size: 'sm', attrs: `data-cref="${c.ref}" role="button" tabindex="0"` })).join('')}</div>
<h3>Last cards played</h3>${plays.length ? `<ul>${plays.map(e => `<li>Round ${e.round}: <b>${esc(e.card)}</b>${e.target != null ? ' on ' + esc(civObjOf(e.target)) : ''}</li>`).join('')}</ul>` : '<p class="muted">Nothing yet.</p>'}
<div class="row"><button class="btn" data-act="close">Close</button><button class="btn ghost" data-act="codex-civ" data-civ="${P.civ}">Full deck and details</button></div></div>`);
}
/* a Monk looks at the target's hand: the player picks the card to take */
function monkPick(T, cards) {
  return new Promise(resolve => {
    UI.pickResolve = uid => { UI.pickResolve = null; closeSheet(); resolve(uid); };
    openSheet(`<div class="pick-sheet"><h2>Choose a card to take</h2><p class="muted">Your Monk looks at ${esc(nameOf(T.id))}'s hand. The card you choose joins yours.</p>
<div class="pick-grid">${cards.map(c => `<button class="pick" data-pick="${c.uid}" aria-label="Take ${esc(c.name)}">${cardHTML(c, { size: 'sm' })}</button>`).join('')}</div></div>`, true);
  });
}

