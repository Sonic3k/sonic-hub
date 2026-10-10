/* ── Screens and sheets: menu, setup, the decisions of a turn, cards and seats, results, the codex ── */
function statsLine() { const r = SET.record; return r.played ? `You have won ${r.won} of ${r.played} games${r.best ? `; your best score is ${r.best}` : ''}.` : 'Choose a character in secret, gather, build. The finest city wins.'; }
function renderMenu() {
  const picks = ['assassin', 'king', 'architect', 'warlord', 'merchant'], list = mobile() ? ['assassin', 'king', 'warlord'] : picks, mid = (list.length - 1) / 2;
  const fan = list.map((c, i) => { const k = i - mid; return charHTML(c, { attrs: `style="--x:${k * (mobile() ? 78 : 108)}px;--y:${Math.abs(k) * 14}px;--rot:${k * 7}deg;--d:${120 + i * 90}ms"` }); }).join('');
  $('#screen-menu').innerHTML = `<div class="menu"><div class="menu-kicker">The Citadels rules · 2016 edition</div><h1 class="menu-title">Masks &amp; Mortar</h1><div class="menu-rule" aria-hidden="true"></div><p class="menu-sub">Take a character in secret, gather gold, build your districts. When a city is complete, the finest city wins.</p>
<div class="menu-fan" aria-hidden="true">${fan}</div>
<div class="menu-actions"><button class="btn" data-act="quick">Play</button><button class="btn ghost" data-act="setup">New game…</button><div class="menu-row"><button class="btn ghost" data-act="rules">How to play</button><button class="btn ghost" data-act="settings">Settings</button></div></div>
<p class="menu-foot">${statsLine()} ${UI.setup.n} players · ${esc(setName(UI.setup.set))} · ${SET.difficulty}</p></div>`;
}
const setName = id => (id === 'random' ? 'Random set' : (PRESETS.find(p => p.id === id) || PRESETS[0]).name);

/* ── setup: players, the character set, the rank 9 character, difficulty ── */
function ninthMode(n) { return n === 2 ? 'never' : n === 3 || n === 8 ? 'always' : 'choice'; }
function setupChars() { const su = UI.setup, set = PRESETS.find(p => p.id === su.set); return set ? charsFor(set, su.n, su.ninth) : null; }
function renderSetup() {
  const su = UI.setup, set = PRESETS.find(p => p.id === su.set), chars = setupChars(), mode = ninthMode(su.n);
  const tile = p => `<button class="set-tile${su.set === p.id ? ' on' : ''}" data-set-id="${p.id}" aria-pressed="${su.set === p.id}"><b>${esc(p.name)}</b><span>${esc(p.blurb)}</span><span class="dots">${p.chars.concat(p.ninth ? [p.ninth] : []).map(c => `<i class="${toneOf(c)}">${artSVG(c, '')}</i>`).join('')}</span></button>`;
  const rnd = `<button class="set-tile${su.set === 'random' ? ' on' : ''}" data-set-id="random" aria-pressed="${su.set === 'random'}"><b>Random</b><span>One character per rank and 14 unique districts, drawn when the game starts.</span><span class="dots">${Array.from({ length: 8 }, () => `<i class="t-none">${artSVG('mask', '')}</i>`).join('')}</span></button>`;
  const ninthNote = mode === 'never' ? 'With 2 players there is no rank 9 character.' : mode === 'always' ? `With ${su.n} players the rank 9 character always plays${set && !set.ninth ? ' (here the ' + CHAR[chars.find(c => CHAR[c].rank === 9)].name + ')' : ''}.` : set && !set.ninth ? 'This set has no rank 9 character for 4 to 7 players.' : '';
  const ninthOn = mode === 'always' || (mode === 'choice' && su.ninth && (!set || set.ninth));
  const ninthSeg = `<div class="seg" role="group" aria-label="Rank 9 character"><button class="${ninthOn ? 'on' : ''}" data-ninth="1"${mode === 'choice' && (!set || set.ninth) ? '' : ' disabled'}>With</button><button class="${ninthOn ? '' : 'on'}" data-ninth="0"${mode === 'choice' && (!set || set.ninth) ? '' : ' disabled'}>Without</button></div>`;
  const ninthRow = ninthNote ? `<p class="muted">${ninthNote}</p>` : '';
  const detail = set ? `<div class="sd-head"><h2>${esc(set.name)}</h2><p>${esc(set.blurb)}</p></div>
<div class="sd-body"><h3>${chars.length} characters</h3><div class="sd-cards">${chars.map(c => charHTML(c, { size: 'sm', attrs: 'role="button" tabindex="0"' })).join('')}</div>${ninthRow}
<h3>14 unique districts</h3><div class="sd-cards">${set.uniques.map(id => districtHTML(staticDistrict(id), { size: 'sm', attrs: 'role="button" tabindex="0"' })).join('')}</div>
<p class="muted">With the 54 basic districts: ${TYPE_ORDER.slice(0, 4).map(t => `${BASIC.filter(d => d.type === t).reduce((a, d) => a + d.n, 0)} ${TYPES[t].name.toLowerCase()}`).join(', ')}.</p></div>`
    : `<div class="sd-head"><h2>Random</h2><p>Every game a new mix: one of the three characters of each rank, and 14 of the 30 unique districts.</p></div><div class="sd-body">${ninthRow}<p class="muted">You will see the characters on the calling track, and the unique districts in the codex, once the game starts.</p></div>`;
  $('#screen-setup').innerHTML = `<div class="su-top"><button class="icon-btn" data-act="menu" aria-label="Back to the menu">${ICON.back}</button><h2>New game</h2></div>
<div class="su-list"><div class="su-seg"><div><label>Players</label><br><div class="seg" role="group" aria-label="Players">${[2, 3, 4, 5, 6, 7, 8].map(n => `<button class="${su.n === n ? 'on' : ''}" data-n="${n}">${n}</button>`).join('')}</div></div>
<div><label>Computer players</label><br><div class="seg" role="group" aria-label="Difficulty">${['easy', 'normal', 'hard'].map(d => `<button class="${SET.difficulty === d ? 'on' : ''}" data-diff="${d}">${d[0].toUpperCase() + d.slice(1)}</button>`).join('')}</div></div>
<div><label>Rank 9 character</label><br>${ninthSeg}</div></div>
<p class="su-note">You play against ${plural(su.n - 1, 'computer player')}. A city is complete at ${citySize(su.n)} districts.</p>
<h3>Characters and districts</h3><div class="set-grid">${PRESETS.map(tile).join('')}${rnd}</div>
<p class="su-note">The sets are the ones suggested by the rulebook; “First game” is the classic eight. Every set uses all 54 basic districts and 14 unique ones.</p></div>
<div class="su-detail">${detail}<div class="sd-foot desk-only"><button class="btn" data-act="start">Start the game</button></div></div><div class="su-go"><button class="btn" data-act="start">Start the game</button></div>`;
}

/* ── forms: a sheet with a small state of its own; taps on [data-f] change it and redraw it ── */
const FORMS = {};
function form(kind, init = {}) { UI.form = { kind, ...init }; drawForm(true); }
function drawForm(first) {
  const f = UI.form; if (!f) return;
  const F = FORMS[f.kind], html = F.html(f), o = { closeAct: F.need ? 'hide-need' : 'close', kind: f.kind };
  if (first) openSheet(html, o); else refreshSheet(html, o);
  UI.form = f;
}
function formTap(key, val) { const f = UI.form; if (!f) return; const r = FORMS[f.kind].tap(f, key, val); if (r === 'ok') return formOK(); SFX.play('click'); drawForm(); }
function formOK(alt) { const f = UI.form; if (!f) return; const a = FORMS[f.kind][alt ? 'alt' : 'ok'](f, alt); if (a) humanAct(a); }
const pickBtn = (key, val, inner, o = {}) => `<button class="pick${o.on ? ' on' : ''}" data-f="${key}" data-v="${val}"${o.off ? ' disabled' : ''} aria-pressed="${!!o.on}">${inner}${o.tag ? `<span class="tag${o.red ? ' red' : ''}">${o.tag}</span>` : ''}${o.why ? `<span class="why">${esc(o.why)}</span>` : ''}${o.price != null ? `<span class="price">${o.price}${ic('gold')}</span>` : ''}</button>`;
function playerRow(pid, key, o = {}) {
  const P = S.players[pid], v = publicView(S), city = cityOf(v, pid);
  return `<button class="prow${o.on ? ' on' : ''}" data-f="${key}" data-v="${pid}"${o.off ? ' disabled' : ''}>${badge(pid)}<b>${esc(nameOf(pid))}</b>${S.crown === pid ? ic('crown') : ''}${o.note ? `<span class="note">${esc(o.note)}</span>` : ''}<span class="stats">${ic('gold')}${P.gold} ${ic('card')}${P.hand.length} ${ic('points')}${cityPts(city)}</span></button>`;
}
const okBtn = (label, on, cls = '') => `<button class="btn ${cls}" data-act="form-ok"${on ? '' : ' disabled'}>${label}</button>`;
const altBtn = (label, val = 1) => `<button class="btn ghost" data-act="form-alt" data-v="${val}">${label}</button>`;
const charSort = list => list.slice().sort((a, b) => CHAR[a].rank - CHAR[b].rank);

/* the selection: choose a character (or, with two players, put one face down) */
FORMS.pick = {
  need: true,
  html(f) {
    const nd = S.need, P = S.players[0], down = nd.op === 'down', two = S.n <= 3;
    const opts = charSort(nd.options);
    const sub = down ? 'It leaves play face down; your rival chooses from the rest.' : two ? `With ${S.n} players you take two characters a round${P.chars.length ? `; you already have ${theC(P.chars[0])}` : ''}.` : nd.op === 'keepPlus' ? 'You are the last to choose: the face-down card is in the pile too.' : `${plural(opts.length, 'character')} left. The rest go on to ${S.n > 3 ? 'the next player' : 'your rival'}.`;
    return `<h2>${down ? 'Put a character face down' : 'Choose your character'}</h2><p class="muted">${sub}</p>
<div class="pick-grid">${opts.map(c => pickBtn('char', c, charHTML(c, { size: 'md' }), { on: f.char === c })).join('')}</div>
${S.sel.faceUp.length ? `<div class="out-row">Face up, out this round: ${S.sel.faceUp.map(c => chipHTML(c)).join('')}</div>` : ''}${P.chars.length ? `<div class="out-row">Yours: ${P.chars.map(c => chipHTML(c)).join('')}</div>` : ''}
<div class="row end">${okBtn(f.char ? `${down ? 'Put down' : 'Take'} ${esc(theC(f.char))}` : 'Choose one', !!f.char)}</div>`;
  },
  tap(f, k, v) { if (f.char === v) return 'ok'; f.char = v; },
  ok: f => f.char && { t: 'pick', char: f.char },
};
FORMS.theater = {
  need: true,
  html(f) {
    const P = S.players[0], opps = S.players.filter(X => X !== P && X.chars.length);
    return `<h2>The Theater</h2><p>You may swap ${P.chars.length > 1 ? 'one of your characters' : 'your character'} with a rival’s, without looking at theirs first.</p>
${P.chars.length > 1 ? `<h3>Give</h3><div class="pick-grid">${P.chars.map(c => pickBtn('give', c, charHTML(c, { size: 'sm' }), { on: f.give === c })).join('')}</div>` : `<div class="out-row">Yours: ${chipHTML(P.chars[0])}</div>`}
<h3>Swap with</h3><div class="plist">${opps.map(X => playerRow(X.id, 'target', { on: f.target === X.id, note: X.chars.length > 1 ? 'a random one of their two' : '' })).join('')}</div>
<div class="row end">${altBtn('Keep mine')}${okBtn(f.target != null ? `Swap with ${esc(objOf(f.target))}` : 'Swap', f.target != null && (P.chars.length < 2 || f.give))}</div>`;
  },
  tap(f, k, v) { if (k === 'give') f.give = v; else f.target = +v; },
  ok: f => ({ t: 'theater', target: f.target, give: f.give || S.players[0].chars[0] }),
  alt: () => ({ t: 'theater', target: null }),
};
FORMS.keep = {
  need: true,
  html(f) {
    const nd = S.need, sch = nd.why === 'scholar';
    return `<h2>${sch ? 'The Scholar: keep one card' : 'Keep one card'}</h2><p class="muted">${sch ? 'The others are shuffled back into the deck.' : 'The other goes to the bottom of the deck.'}</p>
<div class="pick-grid">${nd.cards.map(c => pickBtn('uid', c.uid, districtHTML(c, { size: 'md', cost: c.cost == null ? null : buildCost(S.players[0], c) }), { on: f.uid === c.uid, tag: has(S.players[0], c.id) && !has(S.players[0], 'quarry') ? 'in your city' : '' })).join('')}</div>
<div class="row end">${okBtn(f.uid ? `Keep the ${esc(nd.cards.find(c => c.uid === f.uid).name)}` : 'Choose one', !!f.uid)}</div>`;
  },
  tap(f, k, v) { if (f.uid === +v) return 'ok'; f.uid = +v; },
  ok: f => f.uid && { t: 'keep', uids: [f.uid] },
};
FORMS.bribe = {
  need: true,
  html() {
    const th = S.threats.find(x => x.char === S.cur.char && x.on), B = th.by, P = S.players[0], half = Math.floor(P.gold / 2);
    return `<h2>A threat from the Blackmailer</h2><p>${esc(nameOf(B))} put a threat on ${esc(theC(S.cur.char))}. Pay half your gold, <b>${plural(half, 'gold', 'gold')}</b>, to have it removed; or refuse. If you refuse, ${esc(objOf(B))} may turn it up: if it is the real threat, you lose all <b>${plural(P.gold, 'gold', 'gold')}</b>. Only one of the two threats is real.</p>
<div class="row end">${altBtn('Refuse')}${okBtn(`Pay ${half}${ic('gold')}`, true)}</div>`;
  },
  tap() { }, ok: () => ({ t: 'bribe', pay: true }), alt: () => ({ t: 'bribe', pay: false }),
};
FORMS.reveal = {
  need: true,
  html() {
    const X = S.need.target, th = S.threats.find(x => x.char === S.cur.char && x.on);
    return `<h2>${esc(nameOf(X))} refuses to pay</h2><p>Your threat on ${esc(theC(S.cur.char))} is <b>${th.real ? 'the real one' : 'an empty one'}</b>. ${th.real ? `Turn it up and take all ${possOf(X)} gold (${plural(S.players[X].gold, 'gold', 'gold')}).` : 'Turning it up only shows it was empty.'}</p>
<div class="row end">${altBtn('Leave it face down')}${okBtn('Turn it up', true)}</div>`;
  },
  tap() { }, ok: () => ({ t: 'reveal', reveal: true }), alt: () => ({ t: 'reveal', reveal: false }),
};
FORMS.confiscate = {
  need: true,
  html() {
    const nd = S.need;
    return `<h2>Confiscate the ${esc(nd.card.name)}?</h2><div class="peek">${districtHTML(nd.card, { size: 'md' })}</div><p>${esc(nameOf(nd.builder))} ${vb(nd.builder, 'are', 'is')} ${theC(S.cur.char)}, on your signed warrant, and just paid ${plural(nd.goldPaid, 'gold', 'gold')} for it. Reveal the warrant to take the district into your city for free; ${esc(objOf(nd.builder))} ${vb(nd.builder, 'get', 'gets')} the gold back.</p>
<div class="row end">${altBtn('Let it be')}${okBtn('Confiscate', true)}</div>`;
  },
  tap() { }, ok: () => ({ t: 'confiscate', take: true }), alt: () => ({ t: 'confiscate', take: false }),
};
FORMS.wizard = {
  need: true,
  html(f) {
    const nd = S.need, P = S.players[0], card = f.uid && nd.cards.find(c => c.uid === f.uid);
    const cost = card ? buildCost(P, card) : 0;
    const why = !card ? '' : card.id === 'secret-vault' ? 'cannot be built' : card.id === 'monument' && cityCount(P) >= 5 ? 'not with 5 districts' : P.gold < cost ? `needs ${cost} gold` : '';
    return `<h2>${esc(possOf(nd.from)[0].toUpperCase() + possOf(nd.from).slice(1))} hand</h2><p class="muted">Take one card. Build it at once (it does not count toward your limit), or keep it.</p>
<div class="pick-grid">${nd.cards.map(c => pickBtn('uid', c.uid, districtHTML(c, { size: 'md', cost: c.cost == null ? null : buildCost(P, c) }), { on: f.uid === c.uid })).join('')}</div>
<div class="row end">${altBtn('Keep it', 'keep').replace('<button', `<button${card ? '' : ' disabled'}`)}${okBtn(card ? (why ? `Build (${why})` : `Build it · ${cost}${ic('gold')}`) : 'Build it', !!card && !why)}</div>`;
  },
  tap(f, k, v) { f.uid = +v; },
  ok: f => f.uid && { t: 'wizard', uid: f.uid, build: true },
  alt: f => f.uid && { t: 'wizard', uid: f.uid, build: false },
};
FORMS.seer = {
  need: true,
  html(f) {
    const nd = S.need, P = S.players[0], to = nd.to, cur = to[f.i] != null ? to[f.i] : null, given = new Set(Object.values(f.gives));
    return `<h2>Give a card back</h2><p class="muted">One card from your hand to each player you took from.</p>
<div class="plist">${to.map((x, i) => { const u = f.gives[x], c = u && P.hand.find(h => h.uid === u); return `<button class="prow${i === f.i ? ' on' : ''}" data-f="i" data-v="${i}">${badge(x)}<b>${esc(nameOf(x))}</b><span class="note">${c ? esc(c.name) : i === f.i ? 'choose a card below' : '—'}</span></button>`; }).join('')}</div>
<div class="pick-grid">${P.hand.map(c => pickBtn('uid', c.uid, districtHTML(c, { size: 'sm' }), { on: cur != null && f.gives[cur] === c.uid, off: given.has(c.uid) && f.gives[cur] !== c.uid, tag: given.has(c.uid) ? esc(nameOf(to.find(x => f.gives[x] === c.uid))) : '' })).join('')}</div>
<div class="row end">${okBtn('Give them', to.every(x => f.gives[x]))}</div>`;
  },
  tap(f, k, v) {
    if (k === 'i') { f.i = +v; return; }
    const to = S.need.to; if (f.i == null || f.i >= to.length) f.i = to.findIndex(x => !f.gives[x]);
    if (f.i < 0) return;
    f.gives[to[f.i]] = +v;
    const next = to.findIndex(x => !f.gives[x]); f.i = next < 0 ? to.length : next;
  },
  ok: f => ({ t: 'seer', gives: f.gives }),
};
FORMS.heir = {
  need: true,
  html(f) {
    return `<h2>Give the crown away</h2><p class="muted">Your Emperor was killed, but still gives the crown to another player (taking nothing).</p><div class="plist">${crownTargets(S, 0).map(x => playerRow(x, 'target', { on: f.target === x })).join('')}</div><div class="row end">${okBtn(f.target != null ? `Give it to ${esc(objOf(f.target))}` : 'Give the crown', f.target != null)}</div>`;
  },
  tap(f, k, v) { f.target = +v; }, ok: f => ({ t: 'heir', target: f.target }),
};

/* ── abilities ── */
const NAME_TITLE = { assassin: 'Name a character to kill', thief: 'Name a character to rob', witch: 'Name a character to bewitch' };
const NAME_VERB = { assassin: 'Kill', thief: 'Rob', witch: 'Bewitch' };
function nameWhy(who, c) {
  if (S.sel.faceUp.includes(c)) return 'face up';
  if (S.players[0].chars.includes(c)) return 'yours';
  if (!namable(S, who).includes(c)) return c === who ? '' : S.killed === c ? 'killed' : S.bewitched === c ? 'bewitched' : 'not allowed';
  return '';
}
FORMS.name = {
  html(f) {
    const who = S.cur.char, list = S.chars.filter(c => CHAR[c].rank > 1 && c !== who);
    const help = { assassin: 'Its player stays silent and skips the whole turn.', thief: 'When it is called, you take all its player’s gold.', witch: 'Its player only gathers; you finish the turn as that character, with your own gold, hand and city.' }[who];
    return `<h2>${NAME_TITLE[who]}</h2><p class="muted">${help}</p><div class="pick-grid">${list.map(c => { const why = nameWhy(who, c); return pickBtn('char', c, charHTML(c, { size: 'sm' }), { on: f.char === c, off: !!why, why }); }).join('')}</div>
<div class="row end">${okBtn(f.char ? `${NAME_VERB[who]} ${esc(theC(f.char))}` : NAME_VERB[who], !!f.char)}</div>`;
  },
  tap(f, k, v) { if (f.char === v) return 'ok'; f.char = v; },
  ok: f => f.char && { t: 'ability', char: f.char },
};
FORMS.marks = {
  html(f) {
    const who = S.cur.char, k = who === 'magistrate' ? 3 : 2, list = S.chars.filter(c => CHAR[c].rank > 1 && c !== who);
    const word = who === 'magistrate' ? ['warrant', 'signed'] : ['threat', 'real'];
    return `<h2>${who === 'magistrate' ? 'Put 3 warrants' : 'Put 2 threats'}</h2><p class="muted">${who === 'magistrate' ? 'Only one is signed: when its player pays to build their first district, you may confiscate it.' : 'Only one is real. A threatened player may pay you half their gold; if they refuse, you may turn the threat up and, if it is real, take all their gold.'}</p>
<div class="pick-grid">${list.map(c => { const why = nameWhy(who, c), on = f.chars.includes(c); return pickBtn('char', c, charHTML(c, { size: 'sm' }), { on, off: !!why || (!on && f.chars.length >= k), why, tag: on && f.real === c ? word[1] : on ? word[0] : '', red: on && f.real === c }); }).join('')}</div>
${f.chars.length === k ? `<h3>Which ${word[0]} is ${word[1]}?</h3><div class="typepick">${f.chars.map(c => `<button class="${f.real === c ? 'on' : ''}" data-f="real" data-v="${c}">${artSVG(c, 'ic')}${esc(CHAR[c].name)}</button>`).join('')}</div>` : `<p class="muted">Choose ${k - f.chars.length} more.</p>`}
<div class="row end">${okBtn(who === 'magistrate' ? 'Put the warrants' : 'Put the threats', f.chars.length === k && !!f.real)}</div>`;
  },
  tap(f, k, v) {
    if (k === 'real') { f.real = v; return; }
    const i = f.chars.indexOf(v);
    if (i >= 0) { f.chars.splice(i, 1); if (f.real === v) f.real = null; } else f.chars.push(v);
    if (f.chars.length === (S.cur.char === 'magistrate' ? 3 : 2) && !f.real) f.real = f.chars[0];
  },
  ok: f => (S.cur.char === 'magistrate' ? { t: 'ability', chars: f.chars, signed: f.real } : { t: 'ability', chars: f.chars, real: f.real }),
};
FORMS.spy = {
  html(f) {
    const opps = S.players.filter(X => X.id !== 0);
    return `<h2>The Spy</h2><p class="muted">Name a district type and look at a player’s hand: for each card of that type, take 1 of their gold (while they have any) and draw 1 card.</p>
<h3>District type</h3><div class="typepick">${TYPE_ORDER.map(t => `<button class="${f.type === t ? 'on' : ''}" data-f="type" data-v="${t}">${typeGem(t, 20)}${TYPES[t].name}</button>`).join('')}</div>
<h3>Whose hand</h3><div class="plist">${opps.map(X => playerRow(X.id, 'target', { on: f.target === X.id })).join('')}</div>
<div class="row end">${okBtn(f.target != null ? `Spy on ${esc(objOf(f.target))}` : 'Spy', f.target != null && !!f.type)}</div>`;
  },
  tap(f, k, v) { if (k === 'type') f.type = v; else f.target = +v; },
  ok: f => ({ t: 'ability', target: f.target, type: f.type }),
};
FORMS.magician = {
  html(f) {
    const P = S.players[0], opps = S.players.filter(X => X.id !== 0);
    return `<h2>The Magician</h2><div class="seg" role="group"><button class="${f.mode === 'swap' ? 'on' : ''}" data-f="mode" data-v="swap">Swap hands</button><button class="${f.mode === 'redraw' ? 'on' : ''}" data-f="mode" data-v="redraw">Redraw cards</button></div>
${f.mode === 'swap' ? `<p class="muted">Swap your whole hand (${plural(P.hand.length, 'card')}) with another player’s.</p><div class="plist">${opps.map(X => playerRow(X.id, 'target', { on: f.target === X.id })).join('')}</div>`
      : `<p class="muted">Put any of your cards at the bottom of the deck and draw as many.</p><div class="pick-grid">${P.hand.map(c => pickBtn('uid', c.uid, districtHTML(c, { size: 'sm' }), { on: f.uids.includes(c.uid) })).join('') || '<p class="muted">Your hand is empty.</p>'}</div>`}
<div class="row end">${f.mode === 'swap' ? okBtn(f.target != null ? `Swap with ${esc(objOf(f.target))}` : 'Swap', f.target != null) : okBtn(`Redraw ${plural(f.uids.length, 'card')}`, f.uids.length > 0)}</div>`;
  },
  tap(f, k, v) { if (k === 'mode') f.mode = v; else if (k === 'target') f.target = +v; else { const u = +v, i = f.uids.indexOf(u); if (i >= 0) f.uids.splice(i, 1); else f.uids.push(u); } },
  ok: f => (f.mode === 'swap' ? { t: 'ability', mode: 'swap', target: f.target } : { t: 'ability', mode: 'redraw', uids: f.uids }),
};
FORMS.players = {
  /* the abilities that only need a player: the Wizard, the Emperor (plus gold or a card), the Abbot */
  html(f) {
    const c = S.cur.char, ids = f.ids;
    const T = { wizard: ['The Wizard', 'Look at a player’s hand and take one card: build it at once or keep it. This turn you may also build districts you already have.'], emperor: ['Give the crown', 'Give the crown to another player, and take 1 gold or 1 random card from them.'], abbot: ['Alms', 'The richest player gives you 1 gold.'] }[c];
    return `<h2>${T[0]}</h2><p class="muted">${T[1]}</p><div class="plist">${ids.map(x => playerRow(x, 'target', { on: f.target === x, off: c === 'wizard' && !S.players[x].hand.length, note: c === 'wizard' && !S.players[x].hand.length ? 'no cards' : '' })).join('')}</div>
${c === 'emperor' ? `<div class="toggle"><span>Take</span><div class="seg"><button class="${f.take === 'gold' ? 'on' : ''}" data-f="take" data-v="gold">1 gold</button><button class="${f.take === 'card' ? 'on' : ''}" data-f="take" data-v="card">1 card</button></div></div>` : ''}
<div class="row end">${okBtn(f.target != null ? { wizard: `Look at ${possOf(f.target)} hand`, emperor: `Crown ${objOf(f.target)}`, abbot: `Take 1 gold from ${objOf(f.target)}` }[c] : 'Choose a player', f.target != null)}</div>`;
  },
  tap(f, k, v) { if (k === 'take') f.take = v; else f.target = +v; },
  ok: f => (S.cur.char === 'wizard' ? { t: 'ability', target: f.target } : S.cur.char === 'emperor' ? { t: 'ability', target: f.target, take: f.take } : { t: 'ability', from: f.target }),
};
FORMS.confirm = {
  /* one-step abilities and districts: the Seer, the Scholar, the Navigator, the Smithy */
  html(f) { return `<h2>${f.title}</h2><p>${f.text}</p><div class="row end">${f.alt ? altBtn(f.alt) : ''}${okBtn(f.label, true)}</div>`; },
  tap() { }, ok: f => f.a, alt: f => f.altA,
};
/* rank 8 and the Armory: choose a district in a city */
function cityTargets(kind) {
  const P = S.players[0], out = new Map();
  const list = kind === 'warlord' ? warlordTargets(S, 0) : kind === 'marshal' ? marshalTargets(S, 0) : armoryTargets(S, 0).map(o => ({ ...o, cost: null }));
  for (const o of list) out.set(o.uid, o);
  return out;
}
function cityWhy(kind, X, e) {
  const P = S.players[0];
  if (kind === 'armory' && X.id === 0 && e.card.id === 'armory') return 'the Armory itself';
  if (isComplete(S, X) && (kind !== 'warlord' || X.id !== 0)) return 'completed city';
  if (kind !== 'armory' && e.card.id === 'keep') return 'the Keep';
  if (kind !== 'armory' && protectedCity(S, X.id)) return 'the Bishop';
  if (kind === 'marshal' && worthOf(e) > 3) return 'costs over 3';
  if (kind === 'marshal' && has(P, e.card.id)) return 'you have one';
  return '';
}
FORMS.city = {
  html(f) {
    const P = S.players[0], T = cityTargets(f.what), sel = f.uid != null && T.get(f.uid);
    const title = { warlord: 'Destroy a district', marshal: 'Seize a district', armory: 'The Armory' }[f.what];
    const text = { warlord: 'Pay 1 gold less than its cost. Not in a completed city (except your own).', marshal: 'Take a district costing 3 or less from another city (not a completed one), paying its owner its cost.', armory: 'Destroy the Armory to destroy any district (not in a completed city).' }[f.what];
    const players = S.players.filter(X => f.what !== 'marshal' || X.id !== 0);
    const blocks = players.filter(X => X.city.length).map(X => `<div class="cityblock"><h4>${badge(X.id)}${esc(X.id === 0 ? 'Your city' : X.name)}<span class="note">${isComplete(S, X) ? 'completed' : protectedCity(S, X.id) && f.what !== 'armory' ? 'protected by the Bishop' : ''}</span></h4><div class="pick-grid">${X.city.map(e => {
      const o = T.get(e.card.uid), why = o ? (o.cost != null && o.cost > P.gold ? `need ${o.cost} gold` : '') : cityWhy(f.what, X, e) || 'not allowed';
      return pickBtn('uid', e.card.uid, districtHTML(e.card, { size: 'sm', beau: e.beau, mus: e.museum.length }), { on: f.uid === e.card.uid, off: !!why, why, price: o && o.cost != null ? o.cost : null });
    }).join('')}</div></div>`).join('');
    const label = sel ? `${{ warlord: 'Destroy', marshal: 'Seize', armory: 'Destroy' }[f.what]} ${sel.target === 0 ? 'your' : possOf(sel.target)} ${esc(entry(S.players[sel.target], sel.uid).card.name)}${sel.cost != null ? ` · ${sel.cost}${ic('gold')}` : ''}` : 'Choose a district';
    return `<h2>${title}</h2><p class="muted">${text} You have ${plural(P.gold, 'gold', 'gold')}.</p>${blocks || '<p class="muted">No city has a district yet.</p>'}<div class="row end">${okBtn(label, !!sel)}</div>`;
  },
  tap(f, k, v) { if (f.uid === +v) return 'ok'; f.uid = +v; },
  ok(f) { const o = cityTargets(f.what).get(f.uid); if (!o) return null; return f.what === 'armory' ? { t: 'armory', target: o.target, uid: o.uid } : { t: 'ability', target: o.target, uid: o.uid }; },
};
FORMS.diplomat = {
  html(f) {
    const P = S.players[0], all = diplomatTargets(S, 0), mineOK = new Set(all.map(o => o.mine));
    const opts = f.mine ? all.filter(o => o.mine === f.mine) : [];
    const sel = f.uid != null && opts.find(o => o.uid === f.uid);
    const theirs = S.players.filter(X => X.id !== 0 && X.city.length).map(X => `<div class="cityblock"><h4>${badge(X.id)}${esc(X.name)}<span class="note">${isComplete(S, X) ? 'completed' : protectedCity(S, X.id) ? 'protected by the Bishop' : ''}</span></h4><div class="pick-grid">${X.city.map(e => {
      const o = opts.find(x => x.uid === e.card.uid), why = !f.mine ? '' : !o ? (isComplete(S, X) ? 'completed city' : e.card.id === 'keep' ? 'the Keep' : protectedCity(S, X.id) ? 'the Bishop' : 'not allowed') : o.cost > P.gold ? `need ${o.cost} gold` : '';
      return pickBtn('uid', e.card.uid, districtHTML(e.card, { size: 'sm', beau: e.beau }), { on: f.uid === e.card.uid, off: !f.mine || !!why, why, price: o ? o.cost : null });
    }).join('')}</div></div>`).join('');
    return `<h2>The Diplomat</h2><p class="muted">Exchange one of your districts with one in another city (not a completed one). If theirs is worth more, pay its owner the difference.</p>
<h3>Yours</h3><div class="pick-grid">${P.city.map(e => pickBtn('mine', e.card.uid, districtHTML(e.card, { size: 'sm', beau: e.beau }), { on: f.mine === e.card.uid, off: !mineOK.has(e.card.uid), why: mineOK.has(e.card.uid) ? '' : e.card.id === 'keep' ? 'the Keep' : 'no exchange' })).join('')}</div>
<h3>Theirs${f.mine ? '' : ' <span class="muted" style="font-family:var(--f-text);font-size:15px">(choose yours first)</span>'}</h3>${theirs}
<div class="row end">${okBtn(sel ? `Exchange${sel.cost ? ` · ${sel.cost}${ic('gold')}` : ''}` : 'Choose two districts', !!sel)}</div>`;
  },
  tap(f, k, v) { if (k === 'mine') { f.mine = +v; f.uid = null; } else f.uid = +v; },
  ok(f) { const o = diplomatTargets(S, 0).find(x => x.mine === f.mine && x.uid === f.uid); return o && { t: 'ability', mine: o.mine, target: o.target, uid: o.uid }; },
};
FORMS.artist = {
  html(f) {
    const P = S.players[0], max = Math.min(2, P.gold);
    return `<h2>The Artist</h2><p class="muted">Put 1 of your gold on up to 2 districts: each costs and scores 1 more for the rest of the game. A district is beautified only once. You have ${plural(P.gold, 'gold', 'gold')}.</p>
<div class="pick-grid">${P.city.map(e => pickBtn('uid', e.card.uid, districtHTML(e.card, { size: 'sm', beau: e.beau }), { on: f.uids.includes(e.card.uid), off: !!e.beau || (!f.uids.includes(e.card.uid) && f.uids.length >= max), why: e.beau ? 'beautified' : '' })).join('')}</div>
<div class="row end">${okBtn(`Beautify ${plural(f.uids.length, 'district')} · ${f.uids.length}${ic('gold')}`, f.uids.length > 0)}</div>`;
  },
  tap(f, k, v) { const u = +v, i = f.uids.indexOf(u); if (i >= 0) f.uids.splice(i, 1); else f.uids.push(u); },
  ok: f => ({ t: 'ability', uids: f.uids }),
};
FORMS.handpick = {
  /* the Laboratory and the Museum: one card from your hand */
  html(f) {
    const P = S.players[0], lab = f.kind2 === 'lab';
    return `<h2>${lab ? 'The Laboratory' : 'The Museum'}</h2><p class="muted">${lab ? 'Discard one card from your hand to gain 2 gold.' : 'Put one card from your hand face down under the Museum: 1 extra point at the end for each.'}</p>
<div class="pick-grid">${P.hand.map(c => pickBtn('uid', c.uid, districtHTML(c, { size: 'sm' }), { on: f.uid === c.uid })).join('')}</div>
<div class="row end">${okBtn(f.uid ? (lab ? `Discard it for 2${ic('gold')}` : 'Put it under the Museum') : 'Choose a card', !!f.uid)}</div>`;
  },
  tap(f, k, v) { f.uid = +v; },
  ok: f => ({ t: f.kind2, uid: f.uid }),
};
FORMS.gain = {
  /* the Abbot collects gold and cards in any mix */
  html(f) {
    const n = f.n;
    return `<h2>Collect for your religious districts</h2><p class="muted">1 gold or 1 card for each of your ${n} religious districts, in any mix.</p>
<div class="typepick">${Array.from({ length: n + 1 }, (_, g) => `<button class="${f.gold === g ? 'on' : ''}" data-f="gold" data-v="${g}">${g}${ic('gold')} + ${n - g}${ic('card')}</button>`).join('')}</div>
<div class="row end">${okBtn('Collect', true)}</div>`;
  },
  tap(f, k, v) { f.gold = +v; }, ok: f => ({ t: 'gain', gold: f.gold }),
};
/* building with something other than plain gold: the Thieves' Den, the Framework, the Necropolis, the Cardinal */
FORMS.pay = {
  html(f) {
    const P = S.players[0], card = P.hand.find(c => c.uid === f.uid); if (!card) return '<p>That card is gone.</p>';
    const opts = payOptions(S, 0, card), cost = buildCost(P, card), others = P.hand.filter(c => c.uid !== card.uid);
    const lbl = { gold: `Pay ${cost} gold`, cards: 'Pay with cards', framework: 'Take down the Framework', necropolis: 'Destroy one of your districts', cardinal: 'Take the gold you lack' };
    let sub = '';
    if (f.mode === 'cards') { const need = Math.max(1, cost - P.gold); sub = `<p class="muted">Each card pays 1 gold. Choose ${need === Math.min(cost, others.length) ? need : `${need} to ${Math.min(cost, others.length)}`}: you pay ${cost - f.uids.length} gold.</p><div class="pick-grid">${others.map(c => pickBtn('uid', c.uid, districtHTML(c, { size: 'sm' }), { on: f.uids.includes(c.uid) })).join('')}</div>`; }
    if (f.mode === 'necropolis') sub = `<div class="pick-grid">${P.city.map(e => pickBtn('sac', e.card.uid, districtHTML(e.card, { size: 'sm', beau: e.beau }), { on: f.sac === e.card.uid })).join('')}</div>`;
    if (f.mode === 'cardinal') { const o = opts.find(x => x.pay === 'cardinal'); sub = `<p class="muted">You lack ${plural(o.short, 'gold', 'gold')}: take it from one player and give them ${plural(o.short, 'card')} from your hand.</p><div class="plist">${S.players.filter(X => X.id !== 0 && X.gold >= o.short).map(X => playerRow(X.id, 'from', { on: f.from === X.id })).join('')}</div><div class="pick-grid">${others.map(c => pickBtn('uid', c.uid, districtHTML(c, { size: 'sm' }), { on: f.uids.includes(c.uid), off: !f.uids.includes(c.uid) && f.uids.length >= o.short })).join('')}</div>`; }
    return `<h2>Build the ${esc(card.name)}</h2><div class="typepick">${opts.map(o => `<button class="${f.mode === o.pay ? 'on' : ''}" data-f="mode" data-v="${o.pay}">${lbl[o.pay]}</button>`).join('')}</div>${sub}
<div class="row end">${okBtn('Build', payReady(f, card, opts))}</div>`;
  },
  tap(f, k, v) {
    if (k === 'mode') { f.mode = v; f.uids = []; f.sac = null; f.from = null; return; }
    if (k === 'sac') { f.sac = +v; return; }
    if (k === 'from') { f.from = +v; return; }
    const u = +v, i = f.uids.indexOf(u);
    if (i >= 0) f.uids.splice(i, 1); else f.uids.push(u);
  },
  ok(f) {
    const a = { t: 'build', uid: f.uid, pay: f.mode };
    if (f.mode === 'cards') a.cards = f.uids.slice();
    if (f.mode === 'necropolis') a.sacrifice = f.sac;
    if (f.mode === 'cardinal') { a.from = f.from; a.give = f.uids.slice(); }
    return a;
  },
};
function payReady(f, card, opts) {
  const P = S.players[0], cost = buildCost(P, card), o = opts.find(x => x.pay === f.mode); if (!o) return false;
  if (f.mode === 'cards') return f.uids.length >= 1 && f.uids.length <= cost && cost - f.uids.length <= P.gold;
  if (f.mode === 'necropolis') return f.sac != null;
  if (f.mode === 'cardinal') return f.from != null && f.uids.length === o.short;
  return true;
}

/* open the sheet for a decision the engine is waiting on */
function openNeed() {
  if (!needMine()) return;
  const nd = S.need; UI.hideNeed = false;
  switch (nd.kind) {
    case 'pick': return form('pick', { char: null });
    case 'theater': return form('theater', { target: null, give: S.players[0].chars.length > 1 ? null : S.players[0].chars[0] });
    case 'keep': return form('keep', { uid: null });
    case 'bribe': case 'reveal': case 'confiscate': return form(nd.kind);
    case 'wizard': return form('wizard', { uid: null });
    case 'seer': return form('seer', { i: 0, gives: {} });
    case 'heir': return form('heir', { target: null });
  }
}
/* the ability button */
function openAbility() {
  const t = S.cur, c = t.char, P = S.players[0], ab = abilityState();
  if (!ab || !ab.ok) return;
  switch (c) {
    case 'assassin': case 'thief': case 'witch': return form('name', { char: null });
    case 'magistrate': case 'blackmailer': return form('marks', { chars: [], real: null });
    case 'spy': return form('spy', { target: null, type: null });
    case 'magician': return form('magician', { mode: P.hand.length ? 'redraw' : 'swap', target: null, uids: [] });
    case 'wizard': return form('players', { ids: S.players.filter(X => X.id !== 0).map(X => X.id), target: null });
    case 'emperor': return form('players', { ids: crownTargets(S, 0), target: null, take: 'gold' });
    case 'abbot': { const top = richest(S, 0); if (top.length === 1) return humanAct({ t: 'ability', from: top[0] }); return form('players', { ids: top, target: null }); }
    case 'seer': return form('confirm', { title: 'The Seer', text: `Take 1 random card from each other player’s hand (${S.players.filter(X => X.id !== 0 && X.hand.length).length} of them), then give each of them 1 card from your hand. You may build up to 2 districts this turn.`, label: 'Take the cards', a: { t: 'ability' } });
    case 'scholar': return form('confirm', { title: 'The Scholar', text: `Draw ${Math.min(7, S.deck.length)} cards, keep 1 and shuffle the rest back into the deck. You may build up to 2 districts this turn.`, label: 'Draw 7', a: { t: 'ability' } });
    case 'navigator': return form('confirm', { title: 'The Navigator', text: 'Gain 4 extra gold or 4 extra cards. You cannot build any district this turn.', label: `4${ic('gold')}`, a: { t: 'ability', take: 'gold' }, alt: `4 cards`, altA: { t: 'ability', take: 'cards' } });
    case 'warlord': case 'marshal': return form('city', { what: c, uid: null });
    case 'diplomat': return form('diplomat', { mine: null, uid: null });
    case 'artist': return form('artist', { uids: [] });
  }
}

/* ── sheets about things on the table ── */
function districtSheet(card, o = {}) {
  const d = DISTRICT[card.id], P = S && S.players[0], inHand = o.hand && P && P.hand.some(c => c.uid === card.uid);
  const why = inHand ? buildReason(card) : null, uses = o.city && S ? myDistrictUses() : new Set();
  const use = o.city && uses.has(card.id) ? { laboratory: 'use-laboratory', smithy: 'use-smithy', museum: 'use-museum', armory: 'use-armory' }[card.id] : null;
  openSheet(`<div class="char-sheet"><div class="cs-card">${districtHTML(card, { size: 'lg', beau: o.beau, mus: o.mus, cost: inHand && card.cost != null ? buildCost(P, card) : card.cost })}</div><div><div class="cs-kind">${TYPES[d.type].name} district · cost ${d.cost == null ? 'none' : d.cost}${d.type !== 'unique' ? ` · ${d.n} in the deck` : ''}</div><h2>${esc(d.name)}</h2>
<p class="cs-eff">${d.type === 'unique' ? kw(d.text, true) : `A ${TYPES[d.type].name.toLowerCase()} district: it scores its cost at the end of the game. Characters who collect for ${TYPES[d.type].name.toLowerCase()} districts gain 1 for it each turn.`}</p>
${o.beau ? '<p><span class="status">Beautified: +1 point</span></p>' : ''}${o.mus ? `<p><span class="status">${plural(o.mus, 'card')} under it</span></p>` : ''}
${inHand && why ? `<p><span class="status gray">${esc(why)}</span></p>` : ''}
<div class="row">${inHand && !why ? `<button class="btn" data-act="build-uid" data-uid="${card.uid}">${ic('hammer')}Build it</button>` : ''}${use ? `<button class="btn" data-act="${use}">Use it</button>` : ''}<button class="btn ghost" data-act="close">Close</button></div></div></div>`);
}
function charStatus(c) {
  if (!S || !S.chars.includes(c)) return '<span class="status gray">Not in this game</span>';
  const v = publicView(S), who = v.revealed[c];
  if (v.faceUp.includes(c)) return '<span class="status gray">Face up: out this round</span>';
  if (who != null) return `<span class="status">${esc(nameOf(who))} ${vb(who, 'are', 'is')} ${esc(theC(c))} this round</span>`;
  if (UI.killedWas && UI.killedWas.char === c) return `<span class="status bad">Killed; it was ${esc(objOf(UI.killedWas.pid))}</span>`;
  if (S.players[0].chars.includes(c)) return `<span class="status good">Yours this round${v.killed === c ? ', and killed' : ''}</span>`;
  if (v.killed === c) return '<span class="status bad">Killed by the Assassin</span>';
  return '<span class="status gray">In this game</span>';
}
function charSheet(c) {
  const C = CHAR[c];
  openSheet(`<div class="char-sheet"><div class="cs-card">${charHTML(c, { size: 'lg' })}</div><div><div class="cs-kind">Rank ${C.rank}${C.gain ? ` · collects for ${TYPES[C.gain.type].name.toLowerCase()} districts` : ''}</div><h2>The ${esc(C.name)}</h2><p class="cs-eff">${kw(C.text, true)}</p>
<p>${charStatus(c)}</p><p class="muted">The other rank ${C.rank} characters: ${CHARACTERS.filter(x => x.rank === C.rank && x.id !== c).map(x => esc(x.name)).join(' and ')}.</p>
<div class="row"><button class="btn ghost" data-act="close">Close</button></div></div></div>`);
}
function seatSheet(pid) {
  const P = S.players[pid], v = publicView(S), city = cityOf(v, pid), miss = TYPE_ORDER.filter(t => !P.city.some(e => e.card.type === t));
  const chars = charChips(pid, v);
  openSheet(`<h2>${badge(pid)} ${esc(pid === 0 ? 'You' : P.name)}${S.crown === pid ? ' ' + ic('crown') : ''}</h2>
<div class="stats" style="justify-content:flex-start;margin:8px 0">${statsHTML(pid, v.p[pid], city).replace(/^<div class="stats">|<\/div>$/g, '')}</div>
${chars ? `<div class="out-row">This round: ${chars}</div>` : ''}
<h3>${pid === 0 ? 'Your city' : 'City'} · ${cityCnt(city)} of ${S.size}${P.done ? ' · complete' : ''}</h3>
${P.city.length ? `<div class="pick-grid" style="justify-content:flex-start">${P.city.map(e => `<div class="pick" data-cref="${e.card.uid}" data-pid="${pid}" role="button" tabindex="0">${districtHTML(e.card, { size: 'sm', beau: e.beau, mus: e.museum.length })}</div>`).join('')}</div>` : '<p class="muted">No districts yet.</p>'}
<p class="muted">${miss.length ? `Missing for the five-type bonus: ${miss.map(t => TYPES[t].name.toLowerCase()).join(', ')}.` : 'Has all five types: +3 points at the end.'}${protectedCity(S, pid) ? ' Protected by the Bishop this round.' : ''}</p>
<div class="row"><button class="btn ghost" data-act="close">Close</button></div>`);
}
function peekSheet(p) {
  openSheet(`<h2>${esc(possOf(p.target)[0].toUpperCase() + possOf(p.target).slice(1))} hand</h2><p class="muted">What your Spy saw.</p><div class="peek">${p.hand.map(c => districtHTML(c, { size: 'sm' })).join('') || '<p class="muted">Empty.</p>'}</div><div class="row end"><button class="btn" data-act="close">Done</button></div>`);
}
function settingsSheet() {
  const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${SET[key] === v ? 'on' : ''}" data-set="${key}" data-val="${v}">${l}</button>`).join('')}</div>`;
  openSheet(`<h2>Settings</h2>
<div class="set-row"><div><b>Difficulty</b><span>How sharply the computer plays. From the next game.</span></div>${seg('difficulty', [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']])}</div>
<div class="set-row"><div><b>Animation speed</b><span>Max skips almost all motion.</span></div>${seg('speed', [['slow', '½×'], ['normal', '1×'], ['fast', '2×'], ['instant', 'Max']])}</div>
<div class="set-row"><div><b>Sound</b><span>Coins, cards, bells.</span></div>${seg('sound', [[true, 'On'], [false, 'Off']])}</div>
${navigator.vibrate ? `<div class="set-row"><div><b>Vibration</b><span>A short buzz when your turn starts.</span></div>${seg('haptics', [[true, 'On'], [false, 'Off']])}</div>` : ''}
<div class="row"><button class="btn" data-act="close">Done</button></div>`);
}
function pauseSheet() { openSheet(`<h2>Paused</h2><div class="row"><button class="btn" data-act="close">Resume</button><button class="btn ghost" data-act="codex">Rules and cards</button><button class="btn ghost" data-act="settings">Settings</button><button class="btn ghost" data-act="concede">Leave the game</button></div>`); }
function resultsSheet() {
  const win = S.winner === 0, place = S.standings.indexOf(0) + 1, my = S.scores[0].total;
  const rows = S.standings.map((pid, i) => {
    const sc = S.scores[pid], P = S.players[pid];
    const lines = [`Districts ${sc.base}`].concat(sc.lines.map(l => `${l.why} +${l.pts}`)).join(' · ') + (sc.hqAs ? ` · the Haunted Quarter counts as ${TYPES[sc.hqAs].name.toLowerCase()}` : '');
    return `<tr class="${pid === S.winner ? 'win' : ''}"><td class="num">${i + 1}</td><td><div class="who">${badge(pid)}${esc(nameOf(pid))}${S.crown === pid ? ic('crown') : ''}</div><div class="lines">${esc(lines)}</div><div class="city-mini" style="padding:4px 0 0">${P.city.map(e => miniTile({ card: e.card, beau: e.beau, mus: e.museum.length })).join('')}</div></td><td class="num">${sc.total}</td></tr>`;
  }).join('');
  openSheet(`<div style="text-align:center"><h2 style="padding:0">${win ? 'Your city is the finest!' : `${esc(S.players[S.winner].name)}’s city wins`}</h2><p>${win ? `You win with ${my} points after ${plural(S.round, 'round')}.` : `You scored ${my} points: ${place === 2 ? 'second' : place === 3 ? 'third' : place + 'th'} of ${S.n}.`}</p></div>
<table class="score-table"><tr><th></th><th>Player</th><th style="text-align:right">Points</th></tr>${rows}</table>
<p class="muted">Ties go to whoever had the highest-ranked character in the last round.</p>
<div class="row center"><button class="btn" data-act="again">Play again</button><button class="btn ghost" data-act="setup">New game…</button><button class="btn ghost" data-act="menu">Main menu</button></div>`, { lock: true, close: false });
}

/* ── the codex: how to play, the characters, the districts, the sets ── */
const CODEX = { open: false, tab: 'rules' };
function openCodex(tab) { CODEX.open = true; CODEX.tab = tab || 'rules'; $('#codex').classList.remove('hidden'); renderCodex(); hideTip(); }
function closeCodex() { CODEX.open = false; $('#codex').classList.add('hidden'); }
function renderCodex() {
  const tabs = [['rules', 'How to play'], ['chars', 'Characters'], ['districts', 'Districts'], ['sets', 'Sets']];
  const inGame = c => S && UI.screen === 'match' && S.chars.includes(c), uInGame = id => S && UI.screen === 'match' && S.uniques.includes(id);
  let body = '';
  if (CODEX.tab === 'rules') body = rulesHTML();
  else if (CODEX.tab === 'chars') body = `<p class="cx-lead">Three characters share each rank; a game uses one of each.${S && UI.screen === 'match' ? ' The ones in this game are marked.' : ''}</p>` + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(r => `<h3>Rank ${r}</h3><div class="cx-rank">${CHARACTERS.filter(c => c.rank === r).map(c => `<div class="cx-item ${toneOf(c.id)}" data-char="${c.id}" role="button" tabindex="0"><span class="disc">${artSVG(c.id, '')}</span><div><b>${esc(c.name)}</b>${inGame(c.id) ? '<span class="in">in play</span>' : ''}<p>${kw(c.text, true)}</p></div></div>`).join('')}</div>`).join('');
  else if (CODEX.tab === 'districts') body = `<p class="cx-lead">54 basic districts in four types, and 30 unique ones, 14 of which join each game.</p><h3>Basic districts</h3><div class="cx-basic">${BASIC.map(d => `<div>${typeGem(d.type, 18)}<b>${esc(d.name)}</b><span>cost ${d.cost} · ×${d.n}</span></div>`).join('')}</div>
<h3>Unique districts</h3><div class="cx-rank">${UNIQUE.slice().sort((a, b) => (a.cost == null ? 0 : a.cost) - (b.cost == null ? 0 : b.cost) || a.name.localeCompare(b.name)).map(d => `<div class="cx-item dist t-unique" data-dist="${d.id}" role="button" tabindex="0"><span class="disc">${artSVG(d.id, '')}</span><div><b>${esc(d.name)}</b> <span class="muted">· ${d.cost == null ? 'no cost' : 'cost ' + d.cost}</span>${uInGame(d.id) ? '<span class="in">in play</span>' : ''}<p>${kw(d.text, true)}</p></div></div>`).join('')}</div>`;
  else if (CODEX.tab === 'sets') body = `<p class="cx-lead">The rulebook suggests these sets of characters and unique districts. “First game” uses the eight classic characters.</p>` + PRESETS.map(p => `<div class="cx-set"><b>${esc(p.name)}</b><p>${esc(p.blurb)}</p><p><b style="font-family:var(--f-text);font-size:15px;color:var(--ink)">Characters:</b> ${p.chars.map(c => esc(CHAR[c].name)).join(', ')}${p.ninth ? `; rank 9: ${esc(CHAR[p.ninth].name)}` : ''}.</p><p><b style="font-family:var(--f-text);font-size:15px;color:var(--ink)">Districts:</b> ${p.uniques.map(id => esc(DISTRICT[id].name)).join(', ')}.</p></div>`).join('');
  $('#codex').innerHTML = `<div class="cx-top"><button class="icon-btn" data-act="codex-back" aria-label="Back">${ICON.back}</button><h2>Rules and cards</h2></div>
<div class="cx-tabs" role="tablist">${tabs.map(([k, l]) => `<button class="${CODEX.tab === k ? 'on' : ''}" data-act="codex-tab" data-tab="${k}" role="tab" aria-selected="${CODEX.tab === k}">${l}</button>`).join('')}</div><div class="cx-body">${body}</div>`;
}
function rulesHTML() {
  return `<p class="cx-lead">Every round each player secretly takes a character. The characters are called in rank order, and on its turn each one gathers gold or cards, builds districts and uses its ability. When someone completes a city of <b>7 districts</b> (<b>8</b> with two or three players), the game ends at the end of that round, and the finest city wins.</p>
<h3>Setting up</h3><ol><li>Everyone starts with <b>2 gold</b> and <b>4 district cards</b>.</li><li>One player takes the ${kw('{crown}', true)}.</li></ol>
<h3>1 · Choosing characters</h3><p>The characters are shuffled. With 4 or more players some are put aside <b>face up</b> (they are out this round; the rank 4 character never is), and one is put aside <b>face down</b>. Starting with the crown and going round the table, each player keeps one character in secret and passes the rest on.</p>
<ul><li><b>2 players:</b> each takes two characters, and from the second pass on, also puts one face down.</li><li><b>3 players:</b> each takes two characters; after the first pass one more card goes face down at random.</li><li><b>7 players with 8 characters, or 8 players with 9:</b> the last player may also take the face-down card.</li></ul>
<h3>2 · Calling the characters</h3><p>The crown calls the characters from rank 1 up. Whoever has the called character reveals it and takes a turn; if nobody answers, the next one is called.</p>
<ol><li><b>Gather</b>: take 2 ${kw('{gold}', true)}, or draw 2 ${kw('{cards}', true)}, keep 1 and put the other at the bottom of the deck.</li><li><b>Build</b>: put a district from your hand into your city by paying its cost. Usually one per turn, and never one you already have.</li><li><b>Use the ability</b> of your character, once, at any time in your turn. Characters with a type (${kw('{noble}', true)}, ${kw('{religious}', true)}, ${kw('{trade}', true)}, ${kw('{military}', true)}) gain 1 for each district of that type in your city.</li></ol>
<h3>Killed, robbed, bewitched</h3><p>A <b>killed</b> character stays silent and skips its whole turn. A <b>robbed</b> one gives all its gold to the Thief as soon as it is called. A <b>bewitched</b> one only gathers, and the Witch plays the rest of its turn.</p>
<h3>3 · The end of the game</h3><p>When a city is complete, the round is played to its end. Then each player scores:</p>
<ul><li>the cost of every district in their city (+1 for each beautified one);</li><li><b>3 points</b> for a district of each of the five types;</li><li><b>4 points</b> for the first to complete a city, <b>2 points</b> for anyone else who completed one;</li><li>the bonuses of their unique districts.</li></ul><p>A tie goes to whoever had the highest-ranked character in the last round.</p>
<h3>Playing here</h3><ul><li>The track at the top shows the characters in calling order: who turned out to have which, the face-up ones, the killed, robbed and bewitched, warrants and threats.</li><li>Tap a rival’s plaque to see their whole city. Tap a card for its full text.</li><li>On your turn: gather with the two buttons, then tap a card in your hand (or drag it up) to build it.</li><li>Keys: <b>1–9</b> choose a card, <b>Enter</b> builds it, <b>E</b> ends the turn, <b>L</b> the chronicle, <b>H</b> this codex, <b>S</b> the speed.</li></ul>
<h3>About this version</h3><p>The rules are those of Citadels (2016 edition), against computer players. The game’s title, its pictures and its texts are our own.</p>`;
}
