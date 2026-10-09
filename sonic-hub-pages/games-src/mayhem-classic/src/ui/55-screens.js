/* ── Screens and sheets: menu, hero select, card and seat sheets, pickers, settings, results, codex ── */
function statsLine() { const all = Object.values(SET.stats); const g = all.reduce((a, r) => a + r[1], 0), w = all.reduce((a, r) => a + r[0], 0); return g ? `You have won ${w} of ${g} brawls.` : 'Draw a card, play a card, be the last hero standing.'; }
function renderMenu() {
  const picks = [['barbarian', 'cleave'], ['wizard', 'firestorm'], ['paladin', 'aegis'], ['rogue', 'fingers'], ['barbarian', 'gnasher']];
  const list = mobile() ? picks.slice(0, 3) : picks, mid = (list.length - 1) / 2;
  const fan = list.map(([h, id], i) => { const k = i - mid; return cardHTML(staticCard(h, HEROES[h].cards.find(c => c.id === id)), { style: `--x:${k * (mobile() ? 82 : 112)}px;--y:${Math.abs(k) * 16}px;--rot:${k * 7}deg;--d:${120 + i * 90}ms` }); }).join('');
  $('#screen-menu').innerHTML = `<div class="menu"><div class="menu-kicker">The original Dungeon Mayhem rules</div><h1 class="menu-title">Mayhem Classic</h1><div class="menu-rule" aria-hidden="true"></div><p class="menu-sub">Four heroes, 28 cards each, 10 HP. Draw one, play one, chain the lightning. The last hero standing wins.</p>
<div class="menu-fan" aria-hidden="true">${fan}</div>
<div class="menu-actions"><button class="btn" data-act="quick">Quick brawl</button><button class="btn ghost" data-act="choose">Choose a hero</button><div class="menu-row"><button class="btn ghost" data-act="rules">How to play</button><button class="btn ghost" data-act="settings">Settings</button></div></div>
<p class="menu-foot">${statsLine()}</p></div>`;
}
function heroDetailHTML(h, mode) {
  const H = HEROES[h], mix = deckMix(h), r = SET.stats[h];
  const order = ['A', 'S', 'H', 'D', 'P', 'M'], names = { A: 'damage', S: 'shield', H: 'heal', D: 'draw', P: 'play again', M: 'Mighty Power cards' };
  const cards = H.cards.map(d => `<div class="cx" data-cref="${h}:${d.id}" role="button" tabindex="0" aria-label="${esc(d.name)}, ${d.n} in the deck">${cardHTML(staticCard(h, d), { size: 'sm' })}<em>×${d.n}</em></div>`).join('');
  return `<div class="sd-hero h-${h}"><span class="emb">${emblemSVG(h)}</span><div><div class="cls">${H.cls}</div><h2>${esc(H.name)} ${esc(H.title)}</h2><p>${esc(H.blurb)}</p></div></div>
<div class="sd-body"><h3>In the deck</h3><div class="mix">${order.filter(k => mix[k]).map(k => `<span data-tip="${mix[k]} ${names[k]} symbol${mix[k] > 1 ? 's' : ''} across the 28 cards">${symSVG(k, 24)}${mix[k]}</span>`).join('')}</div>
<h3>Mighty Powers</h3>${H.cards.filter(d => d.power).map(d => `<p><b>${esc(d.name)}</b> ×${d.n}: ${esc(POWERS[d.power].text)}${d.sym ? ' ' + symbolText(d.sym).join(' ') : ''}</p>`).join('')}
<h3>The 28 cards</h3><div class="sd-cards">${cards}</div>${mode === 'select' && r ? `<p class="muted">Your record with ${esc(H.name)}: ${r[0]} won of ${r[1]}.</p>` : ''}</div>`;
}
function renderSelect() {
  const h = UI.hero, detail = mobile() && UI.selView === 'detail', scr = $('#screen-select');
  const tiles = HERO_ORDER.map(id => { const H = HEROES[id], r = SET.stats[id]; return `<button class="hero-tile h-${id}${id === h ? ' on' : ''}" data-hero="${id}" aria-pressed="${id === h}">${r ? `<span class="rec">${r[0]}/${r[1]}</span>` : ''}<span class="big">${emblemSVG(id)}</span><span class="cl">${H.cls}</span><span class="nm">${esc(H.name)}<br>${esc(H.title)}</span></button>`; }).join('');
  scr.classList.toggle('detail', detail);
  scr.innerHTML = `<div class="sel-top"><button class="icon-btn" data-act="${detail ? 'sel-list' : 'menu'}" aria-label="${detail ? 'All heroes' : 'Back to the menu'}">${ICON.back}</button><h2>${detail ? 'Your hero' : 'Choose your hero'}</h2><button class="btn ghost small" data-act="random-hero">Random</button></div>
<div class="sel-list"><h3>The original four</h3><div class="hero-grid">${tiles}</div><p class="sel-note">Every hero is a fixed deck of 28 cards. The heroes, card names and pictures are our own; each deck is rebuilt after its class in the original game, and the exact card counts are still being checked against the official lists. The two expansions (Battle for Baldur's Gate and Monster Madness) join once their card lists are checked.</p></div>
<div class="sel-detail h-${h}">${heroDetailHTML(h, 'select')}
<div class="sd-foot"><div class="seg" role="group" aria-label="Players">${[2, 3, 4].map(n => `<button class="${UI.n === n ? 'on' : ''}" data-n="${n}">${n === 2 ? 'Duel' : n + ' players'}</button>`).join('')}</div><div class="seg" role="group" aria-label="Difficulty">${['easy', 'normal', 'hard'].map(d => `<button class="${SET.difficulty === d ? 'on' : ''}" data-diff="${d}">${d[0].toUpperCase() + d.slice(1)}</button>`).join('')}</div><button class="btn" data-act="start">To the brawl</button></div></div>`;
}
function settingsSheet() {
  const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${SET[key] === v ? 'on' : ''}" data-set="${key}" data-val="${v}">${l}</button>`).join('')}</div>`;
  openSheet(`<h2>Settings</h2>
<div class="set-row"><div><b>Difficulty</b><span>How sharply the computer plays. From the next brawl.</span></div>${seg('difficulty', [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']])}</div>
<div class="set-row"><div><b>Animation speed</b><span>Max skips almost all motion.</span></div>${seg('speed', [['slow', '½×'], ['normal', '1×'], ['fast', '2×'], ['instant', 'Max']])}</div>
<div class="set-row"><div><b>Sound</b><span>Steel, shields and spells.</span></div>${seg('sound', [[true, 'On'], [false, 'Off']])}</div>
${navigator.vibrate ? `<div class="set-row"><div><b>Vibration</b><span>A short buzz when your turn starts or you are hit.</span></div>${seg('haptics', [[true, 'On'], [false, 'Off']])}</div>` : ''}
<div class="row"><button class="btn" data-act="close">Done</button></div>`);
}
function pauseSheet() { openSheet(`<h2>Paused</h2><div class="row"><button class="btn" data-act="close">Resume</button><button class="btn ghost mob-only" data-act="deck">Your deck</button><button class="btn ghost" data-act="codex">Heroes and rules</button><button class="btn ghost" data-act="settings">Settings</button><button class="btn ghost" data-act="concede">Leave the brawl</button></div>`); }
function deckSheet(which) {
  const P = S.players[0], list = which === 'deck' ? P.deck : P.discard, n = {};
  for (const c of list) n[c.name] = (n[c.name] || 0) + 1;
  const rows = Object.entries(n).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k, v]) => `<div><span>${esc(k)}</span><b>${v}</b></div>`).join('');
  openSheet(`<h2>${which === 'deck' ? 'Your deck' : 'Your discard pile'}</h2><p class="muted">${which === 'deck' ? `${P.deck.length} cards left to draw, by name, not in draw order. When it runs out, your discard pile is shuffled into a new deck.` : `${P.discard.length} cards used so far.`}</p><div class="decklist">${rows || '<p class="muted">Empty.</p>'}</div><div class="row"><button class="btn" data-act="close">Close</button></div>`);
}
function resultsSheet() {
  const me = S.players[0], W = S.winner != null && S.winner >= 0 ? S.players[S.winner] : null, win = S.winner === 0, out = S.winner == null && !me.alive;
  const standing = S.players.filter(p => p.alive).map(p => esc(heroName(p.hero))).join(', ');
  const line = out ? `You were knocked out. Still standing: ${standing}.` : W ? (W.id === 0 ? `You and ${esc(HEROES[me.hero].name)} are the last hero standing.` : `${esc(heroName(W.hero))} is the last hero standing.`) : 'Everyone left fell at once: it is a tie.';
  openSheet(`<div style="text-align:center"><div class="sd-hero h-${(W || me).hero}" style="justify-content:center;margin:-22px -24px 12px"><span class="emb">${emblemSVG((W || me).hero)}</span></div>
<h2>${win ? 'Victory!' : S.winner === -1 ? 'A tie' : out ? 'Knocked out' : 'Defeat'}</h2><p>${line}</p>
<div class="sd-stats" style="justify-content:center"><span>Damage dealt <b>${me.stats.dmg}</b></span><span>Healed <b>${me.stats.healed}</b></span><span>Shields broken <b>${me.stats.broke}</b></span><span>Cards played <b>${me.stats.played}</b></span><span>Rounds <b>${S.round}</b></span></div>
<div class="row center"><button class="btn" data-act="again">Play again</button><button class="btn ghost" data-act="choose">Another hero</button><button class="btn ghost" data-act="menu">Main menu</button></div></div>`, true);
}
function seatSheet(pid) {
  const P = S.players[pid], H = HEROES[P.hero];
  const plays = S.log.filter(e => e.k === 'play' && e.pid === pid).slice(-6).reverse();
  openSheet(`<div class="seat-sheet h-${P.hero}"><div class="hdr"><span class="emb">${emblemSVG(P.hero)}</span><div><h2>${pid === 0 ? 'You · ' : ''}${esc(heroName(P.hero))}</h2><p>${esc(H.cls)} · ${esc(H.blurb)}</p></div></div>
<div class="sd-stats"><span><b class="kw k-H">${Math.max(0, P.hp)}</b> of ${P.maxHP} HP</span><span><b class="kw k-S">${shieldTotal(P)}</b> shield</span><span><b class="kw k-D">${P.hand.length}</b> cards in hand</span><span><b>${P.deck.length}</b> in deck</span><span><b>${P.discard.length}</b> discarded</span></div>
${P.disguised ? `<p><b>Vanished</b>: until ${pid === 0 ? 'your' : 'their'} next turn no opponent's card can touch ${pid === 0 ? 'you' : 'them'}.</p>` : ''}
<h3>Shields in play</h3>${P.shields.length ? `<div class="sd-cards">${P.shields.map(sh => `<div class="cx" data-cuid="${sh.card.uid}" role="button" tabindex="0">${cardHTML(sh.card, { size: 'sm' })}<em>${shieldLeft(sh)}/${shieldMax(sh)}</em></div>`).join('')}</div>` : '<p class="muted">None: every attack goes straight to HP.</p>'}
<h3>Last cards played</h3>${plays.length ? `<ul>${plays.map(e => `<li>Round ${e.round}: <b>${esc(e.card)}</b>${e.from != null ? ` (stolen from ${esc(objOf(e.from))})` : ''}${e.t != null ? ' on ' + esc(objOf(e.t)) : ''}</li>`).join('')}</ul>` : '<p class="muted">Nothing yet.</p>'}
<div class="row"><button class="btn" data-act="close">Close</button><button class="btn ghost" data-act="codex-hero" data-hero="${P.hero}">Full deck</button></div></div>`);
}
function cardSheet(card, o = {}) {
  const H = HEROES[card.hero], syms = (card.power ? ['M'] : []).concat([...card.sym].sort((a, b) => SYM_ORDER.indexOf(a) - SYM_ORDER.indexOf(b)));
  const n = H.cards.find(d => d.id === card.id), canPlay = o.hand && isMyTurn() && card.uid && S.players[0].hand.some(c => c.uid === card.uid);
  openSheet(`<div class="card-sheet"><div class="cs-card">${cardHTML(card, { size: 'lg' })}</div><div><div class="cs-kind">${esc(H.cls)} · ${esc(H.name)}${n ? ` · ${n.n} in the deck` : ''}${card.power ? ' · Mighty Power' : ''}</div><h2>${esc(card.name)}</h2>
<p class="cs-eff">${cardTextHTML(card, true)}</p>
<div class="cs-syms">${[...new Set(syms)].map(ch => `<div>${symSVG(ch, 32)}<b>${SYM[ch].name}${count(syms.join(''), ch) > 1 ? ` ×${count(syms.join(''), ch)}` : ''}</b><span>${esc(SYM[ch].desc)}</span></div>`).join('')}</div>
<div class="row">${canPlay ? `<button class="btn" data-act="play-card" data-uid="${card.uid}">Choose it</button>` : ''}<button class="btn ghost" data-act="close">Close</button></div></div></div>`);
}
/* Answered Prayer (and a stolen one): pick the card to bring back */
function discardPick(cards) {
  return new Promise(resolve => {
    UI.pickResolve = uid => { UI.pickResolve = null; closeSheet(); resolve(uid); };
    openSheet(`<h2>Bring a card back</h2><p class="muted">Choose a card from your discard pile. It goes into your hand.</p><div class="pick-grid">${cards.map(c => `<button class="pick" data-pick="${c.uid}" aria-label="Take ${esc(c.name)}">${cardHTML(c, { size: 'sm' })}</button>`).join('')}</div>`, true);
  });
}

/* ── codex: the heroes, the rules, the symbols ── */
const CODEX = { open: false, tab: 'rules', hero: null };
function openCodex(tab, o = {}) { CODEX.open = true; CODEX.tab = tab || 'rules'; CODEX.hero = o.hero || null; $('#codex').classList.remove('hidden'); renderCodex(); hideTip(); }
function closeCodex() { CODEX.open = false; $('#codex').classList.add('hidden'); }
function renderCodex() {
  const tabs = [['rules', 'How to play'], ['heroes', 'Heroes'], ['symbols', 'Symbols']];
  let body = '';
  if (CODEX.tab === 'rules') body = rulesHTML();
  else if (CODEX.tab === 'symbols') body = `<p class="cx-lead">Every card is a stack of symbols, used from the top down. A Mighty Power card does what it says first, then its symbols.</p>${['A', 'S', 'H', 'D', 'P', 'M'].map(ch => `<div class="cx-sym">${symSVG(ch, 42)}<div><b>${SYM[ch].name}</b><p>${esc(SYM[ch].desc)}</p></div></div>`).join('')}<h3>The Mighty Powers</h3>${Object.entries(POWERS).map(([k, p]) => { const who = HERO_ORDER.filter(h => HEROES[h].cards.some(d => d.power === k)); return `<div class="cx-power"><b>${esc(p.name)}</b> <span class="muted">· ${who.map(h => HEROES[h].cls).join(', ')}</span><p>${esc(p.text)}</p></div>`; }).join('')}`;
  else if (CODEX.tab === 'heroes') body = CODEX.hero ? `<div class="cx-hero">${heroDetailHTML(CODEX.hero, 'codex')}</div><div class="row"><button class="btn ghost" data-act="codex-heroes">All heroes</button><button class="btn" data-act="codex-play" data-hero="${CODEX.hero}">Play ${esc(HEROES[CODEX.hero].name)}</button></div>`
    : `<p class="cx-lead">The original four. Each deck is 28 cards; tap a hero for the whole deck.</p><div class="cx-heroes">${HERO_ORDER.map(id => `<button class="hero-tile h-${id}" data-act="codex-hero" data-hero="${id}"><span class="big">${emblemSVG(id)}</span><span class="cl">${HEROES[id].cls}</span><span class="nm">${esc(HEROES[id].name)}<br>${esc(HEROES[id].title)}</span></button>`).join('')}</div>`;
  $('#codex').innerHTML = `<div class="cx-top"><button class="icon-btn" data-act="codex-back" aria-label="Back">${ICON.back}</button><h2>Heroes and rules</h2></div>
<div class="cx-tabs" role="tablist">${tabs.map(([k, l]) => `<button class="${CODEX.tab === k ? 'on' : ''}" data-act="codex-tab" data-tab="${k}" role="tab" aria-selected="${CODEX.tab === k}">${l}</button>`).join('')}</div><div class="cx-body">${body}</div>`;
}
function rulesHTML() {
  return `<p class="cx-lead">Two to four heroes brawl in a dungeon. Everyone starts with <b>10 HP</b> and a deck of 28 cards. Knock everyone else out to win.</p>
<h3>Setting up</h3><ol><li>Each player takes a hero and shuffles its deck.</li><li>Everyone draws <b>3 cards</b>.</li><li>A random player goes first; play passes to the next seat.</li></ol>
<h3>Your turn</h3><ol><li><b>Draw 1 card.</b></li><li><b>Play 1 card</b> and use every symbol on it, top to bottom.</li><li>Each ${symSVG('P', 18)} <b>Play again</b> means one more card this turn. You must play it, even if you would rather not.</li><li>When you owe no more plays, the turn passes on.</li></ol>
<h3>Shields</h3><p>A card with ${symSVG('S', 18)} shield symbols stays in front of you. Each shield symbol stops 1 damage. While you have a shield, attacks cannot reach your HP: an attack goes into the shield you aim at (or the weakest), damage left over moves on to the next shield, then to you. A broken shield goes to its owner's discard pile.</p>
<h3>Attacking</h3><p>All the ${symSVG('A', 18)} attacks on a card go to one target: an opponent, or one of their shields.</p>
<h3>Running out</h3><p>Whenever your hand is empty you draw 2 cards at once, even in the middle of a turn. When your deck is empty, shuffle your discard pile to make a new one. HP never goes above 10.</p>
<h3>Knocked out</h3><p>At 0 HP a hero is out. The last hero standing wins. If a card knocks out everyone left at once, it is a tie.</p>
<h3>About this version</h3><p>The rules are the original Dungeon Mayhem rules. The heroes, card names and pictures are our own; each deck is rebuilt after its class in the original game (Barbarian, Wizard, Paladin, Rogue), and the exact card counts are still being checked against the official lists.</p>`;
}
