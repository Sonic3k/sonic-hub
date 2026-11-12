/* ── View: table art, components and rendering for the new UI ── */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const UI = { screen: 'menu', sel: null, hoverT: null, busy: false, last: null, view: null, round: 1, drawer: false, n: 2, civ: null, opps: 'random', tutorial: null };
const ICON = {
  menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  scroll: '<svg viewBox="0 0 24 24"><path d="M6 4h11a3 3 0 0 1 0 6h-1v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 4a3 3 0 0 0-3 3v3M8 9h4M8 13h5M8 16h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 1-1 1.7M12 16.8v.2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
  event: '<svg viewBox="0 0 24 24"><path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  market: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 8v8M9.5 10h4M9.5 14h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M12 6.6C10 5.1 7.5 4.6 4 4.9v13c3.5-.3 6 .2 8 1.7 2-1.5 4.5-2 8-1.7v-13c-3.5-.3-6 .2-8 1.7zM12 6.6v13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 11v6M12 7.6v.2" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/></svg>',
};
const svgURL = svg => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
function installTableArt() {
  /* a portolan chart in iron-gall ink and vermilion, drawn once */
  const L = [], c = 1000;
  for (let i = 0; i < 32; i++) { const a = i * Math.PI / 16, main = i % 4 === 0, red = i % 8 === 4; L.push(`<path d='M${c} ${c}L${(c + Math.cos(a) * 1400).toFixed(0)} ${(c + Math.sin(a) * 1400).toFixed(0)}' stroke='${red ? 'rgba(160,45,25,.42)' : main ? 'rgba(70,45,20,.42)' : 'rgba(70,45,20,.2)'}' stroke-width='${main ? 1.5 : 1}'/>`); }
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8, x = c + Math.cos(a) * 640, y = c + Math.sin(a) * 640; for (let i = 0; i < 16; i++) { const b = i * Math.PI / 8; L.push(`<path d='M${x.toFixed(0)} ${y.toFixed(0)}l${(Math.cos(b) * 900).toFixed(0)} ${(Math.sin(b) * 900).toFixed(0)}' stroke='rgba(70,45,20,.1)'/>`); } }
  const rhumb = `<svg xmlns='http://www.w3.org/2000/svg' width='2000' height='2000' viewBox='0 0 2000 2000'>${L.join('')}<circle cx='1000' cy='1000' r='640' fill='none' stroke='rgba(70,45,20,.18)' stroke-width='1.5'/></svg>`;
  const star = (n, r1, r2, rot) => Array.from({ length: n * 2 }, (_, i) => { const r = i % 2 ? r2 : r1, a = i * Math.PI / n + rot - Math.PI / 2; return `${(100 + Math.cos(a) * r).toFixed(1)},${(100 + Math.sin(a) * r).toFixed(1)}`; }).join(' ');
  const rose = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><circle cx='100' cy='100' r='94' fill='none' stroke='rgba(70,45,20,.55)' stroke-width='1.4'/><circle cx='100' cy='100' r='88' fill='none' stroke='rgba(160,45,25,.5)' stroke-width='1' stroke-dasharray='3 3'/><polygon points='${star(8, 70, 11, Math.PI / 8)}' fill='rgba(70,45,20,.18)' stroke='rgba(70,45,20,.45)' stroke-width='.6'/><polygon points='${star(4, 92, 14, 0)}' fill='rgba(160,45,25,.32)' stroke='rgba(90,30,15,.7)' stroke-width='.9'/><path d='M100 6l-6 16h12z' fill='rgba(160,45,25,.7)'/><circle cx='100' cy='100' r='6' fill='rgba(201,162,74,.9)' stroke='rgba(70,45,20,.7)'/></svg>`;
  const rule = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 14'><path d='M0 7h185M235 7h185' stroke='rgba(236,209,139,.7)' stroke-width='1.2'/><path d='M210 1l7 6-7 6-7-6z' fill='rgba(236,209,139,.9)'/><circle cx='193' cy='7' r='2' fill='rgba(236,209,139,.8)'/><circle cx='227' cy='7' r='2' fill='rgba(236,209,139,.8)'/></svg>`;
  for (const [k, v] of [['--rhumb', rhumb], ['--rose', rose], ['--rhumb-rule', rule]]) document.documentElement.style.setProperty(k, svgURL(v));
}

/* keywords share the colour of the symbol for that resource */
const KW_RE = /\b(?:(\d+ direct damage|direct damage)|([Ee]very opponent|[Ee]veryone)|([Pp]lay another card|[Pp]lay \d+ more cards)|(\d+ (?:extra |less )?damage|damage)|(\d+ (?:extra )?HP|max HP|HP|[Hh]eals?)|(\d+ (?:extra |less )?gold|gold)|(\d+ (?:random |extra )?cards?|another card|a random card|a card|cards?)|(\d+ (?:extra )?durability|durability|structures?|[Ww]onders?)|([Ss]teal|stolen|take a card|take \d+ cards)|([Kk]ills? (?:a|\d+) (?:random )?guards?|destroyed)|(Bodyguards?|Camel guards?|Mantlets?|guards?|Traps?|Storm))\b/g;
const KW_CLS = ['pierce', 'aoe', 'play', 'dmg', 'hp', 'gold', 'card', 'wall', 'steal', 'raze', 'guard'];
function kw(text) { return esc(text).replace(KW_RE, (...m) => `<b class="kw k-${KW_CLS[m.slice(1, 12).findIndex(x => x !== undefined)]}">${m[0]}</b>`); }

/* a region of the table is rewritten only when its markup changes, so nothing under the pointer is rebuilt for nothing
   (anything that edits a region in place, like the HP count-down, calls forget() so the next render rewrites it) */
function put(el, html) { if (typeof el === 'string') el = $(el); if (!el || el._html === html) return false; el.innerHTML = html; el._html = html; return true; }
function forget(el) { if (el) el._html = null; }
const isMyTurn = () => S && S.turn === 0 && S.winner == null && !UI.busy;
const selCard = () => (S && UI.sel != null ? S.players[0].hand.find(c => c.uid === UI.sel) : null);
const civNameOf = pid => nameOf(pid);
const civObjOf = pid => (pid === 0 ? 'you' : nameOf(pid));
const typeOf = c => (c.age ? 'Imperial Age' : c.civ === 'merc' ? 'Mercenary' : 'Unit');
/* one frame for every unit; a unit only one civilization fields carries its crest, a mercenary its price, the Imperial Age card a crown */
function cardHTML(card, o = {}) {
  const merc = card.civ === 'merc', type = card.age ? 'age' : merc ? 'merc' : 'com';
  const size = o.size || '', civ = merc ? 'merc' : CIVS[card.civ] ? card.civ : 'neutral', icons = card.icons || '';
  const syms = card.age ? crownSVG(size === 'lg' ? 66 : size === 'sm' ? 36 : 50) : [...icons].filter(ch => SYM_STYLE[ch]).map(ch => symBadge(ch, 30)).join('');
  const seal = card.crest ? `<i class="seal" title="${esc(CIVS[card.crest].name)}">${crest(card.crest, 22)}</i>` : type === 'age' ? `<i class="seal crown" title="Imperial Age">${crownSVG(24)}</i>` : merc && o.cost == null ? `<i class="seal coin" title="Mercenary">${card.cost}</i>` : '';
  return `<div class="card ${size} t-${type}${!card.age && icons.length > 3 ? ' many' : ''} fam-${merc ? 'merc' : CIV_FAMILY[card.civ] || 'plain'} civ-${civ} ${o.cls || ''}" data-uid="${card.uid || ''}" ${o.attrs || ''} style="${o.style || ''}"><div class="cf"><div class="cb"><div class="cn"><span>${esc(card.name)}</span></div><div class="ca">${syms}</div><div class="ct"><span>${kw(cardText(card))}</span></div></div></div><i class="corner c1"></i><i class="corner c2"></i>${seal}${o.cost != null ? `<div class="cost${o.afford ? ' ok' : ''}">${o.cost} gold</div>` : ''}</div>`;
}
function workHTML(st) { return buildHTML(st); }
function dispHP(P) { return UI.view && UI.view[P.id] != null ? UI.view[P.id] : P.hp; }
function campHTML(P, mine) {
  const C = CIVS[P.civ], hp = Math.max(0, dispHP(P)), acting = S.turn === P.id && S.winner == null;
  const info = [];
  info.push(`<span class="coin" data-tip="Gold hires mercenaries at the market.">${symBadge('G', 20)}<b>${P.gold}</b></span>`);
  if (!mine) info.push(`<span class="backs" data-tip="${P.hand.length} cards in hand">${'<i class="cback"></i>'.repeat(Math.min(P.hand.length, 5))}<b>${P.hand.length}</b></span>`);
  if (P.ageGiven && !P.aged) info.push(`<span class="agem hot" data-tip="Holds the Imperial Age card.">${crownSVG(16)}ready</span>`);
  if (P.relic) info.push(`<span class="relic" data-tip="${esc(RELICS[P.relic].name)}: ${esc(RELICS[P.relic].text)}">${relicGlyphs(P.relic, 19)}<span class="rn">${esc(RELICS[P.relic].name)}</span></span>`);
  if (mine) info.push(`<span class="piles"><button class="pile" data-act="deck" data-tip="Cards left to draw">Deck ${P.deck.length}</button><button class="pile" data-act="discard" data-tip="Cards already played or lost">Discard ${P.discard.length}</button></span>`);
  return `<section class="camp fam-${CIV_FAMILY[P.civ]} civ-${P.civ}${mine ? ' mine' : ''}${acting ? ' turn' : ''}${P.alive ? '' : ' out'}" id="camp-${P.id}" data-pid="${P.id}" aria-label="${esc(nameOf(P.id))}, ${esc(C.name)}: ${hp} of ${P.maxHP} HP">
<header class="camp-banner">${crest(P.civ, mine ? 32 : 28)}<span class="cname" data-tip="${esc(C.name)}">${esc(nameOf(P.id))}</span>${acting && !mine ? '<span class="flag">acting</span>' : ''}${P.alive ? '' : '<span class="flag out">defeated</span>'}<span class="medals">${medalsOf(P)}</span>${hpTag(P, hp)}</header>${hpBar(P, hp)}
<div class="camp-info">${defsHTML(P)}<div class="stash">${info.join('')}</div></div>
<div class="chips"></div><div class="floats"></div></section>`;
}
/* the Defenses row: buildings, then the round guard tokens; on a phone the label gives way once a token is there */
function defsHTML(P) {
  const b = frontOrder(P).map(buildHTML).join(''), g = guardsOf(P);   /* in the order hits reach them */
  return `<div class="defs${g ? ' has-guard' : ''}"><span class="lbl">Defenses</span>${b}${g}${b || g ? '' : '<span class="none">none</span>'}</div>`;
}
/* the Imperial Age card comes to every player in the same round, so one clock in the header says when */
function ageClock() {
  const n = RULES.ageTurn - S.round;
  if (S.winner != null || n < 0) return '';
  const tip = n > 0 ? `Every player's Imperial Age card arrives in round ${RULES.ageTurn}, ${n} round${n > 1 ? 's' : ''} from now.` : "Every player's Imperial Age card arrives this round.";
  return `<span class="agecount" data-tip="${tip}" aria-label="${tip}">${crownSVG(22)}${n > 0 ? `<span class="desk-only">Imperial Age</span><b>in ${n}</b><span class="desk-only">round${n > 1 ? 's' : ''}</span>` : `<b class="mob-only">now</b><span class="desk-only">Imperial Age this round</span>`}</span>`;
}
function renderTopbar() {
  const me = isMyTurn(), E = S.event ? EVENT_BY[S.event] : null, who = S.winner != null ? '' : S.turn === 0 ? 'Your turn' : `${nameOf(S.turn)} to play`;
  put('#topbar', `<button class="icon-btn" data-act="pause" aria-label="Menu" data-tip="Menu (Esc)">${ICON.menu}</button>
<div class="tb-mid"><button class="evchip mob-only" data-act="events" aria-label="Events"><span class="evt"><small>Round ${S.round}${E ? eventGlyphs(E.id, 17) : ''}</small><b>${E ? esc(E.name) : 'Peace'}</b></span>${UI.eventSeen !== S.round && S.event ? '<i class="badge"></i>' : ''}</button><span class="pill desk-only round"${E ? ` data-tip="${esc(E.name)}: ${esc(E.text)}"` : ''}>Round ${S.round}${E ? eventGlyphs(E.id, 22) : ''}</span>${who ? `<span class="pill desk-only ${S.turn === 0 ? 'you' : ''}">${who}</span>` : ''}${me && S.plays > 0 ? `<span class="pips" data-tip="Plays left this turn">${'<i class="pip"></i>'.repeat(S.plays)}</span>` : ''}${ageClock()}</div>
<div class="tb-right"><button class="icon-btn mob-only" data-act="market" aria-label="Mercenary Market" data-tip="Mercenary Market">${ICON.market}${canHire() ? `<i class="badge">${canHire()}</i>` : ''}</button>
<button class="speed desk-only" data-act="speed" data-tip="Animation speed (S)">${SPEEDS[SET.speed].label}</button><button class="icon-btn" data-act="chronicle" aria-label="Chronicle" data-tip="Chronicle (L)">${ICON.scroll}</button></div>`);
}
function eventsHTML() {
  const E = S.event ? EVENT_BY[S.event] : null, N = EVENT_BY[S.eventNext];
  return `<div class="ev now${UI.flipEvent ? ' flip' : ''}"><div class="when">This round</div><h4>${E ? esc(E.name) : 'Peace'}${E ? eventGlyphs(E.id, 25) : ''}</h4><p>${E ? kw(E.text) : 'No event yet. Events start in round 2.'}</p></div>
<div class="ev next"><div class="when">Next round</div><h4>${esc(N.name)}${eventGlyphs(N.id, 25)}</h4><p>${kw(N.text)}</p></div>${S.round >= 14 ? `<div class="ev-warn">${eventGlyphs('attrition', 18)}${S.round >= 16 ? 'The war drags on: everyone loses 1 HP each round.' : 'From round 16 everyone loses 1 HP each round.'}</div>` : ''}`;
}
function marketHTML() {
  const me = S.players[0], mine = isMyTurn() && !S.flags.bought;
  return `<h3>Mercenary Market</h3><div class="mk-row">${S.market.map((c, i) => { if (!c) return '<div class="card sm civ-merc"><div class="cb"><div class="ct">Sold out</div></div></div>'; const cost = marketCost(S, me, c), ok = mine && me.gold >= cost; return `<button class="mk-item${ok ? ' can' : ''}" data-mi="${i}" ${ok ? '' : 'tabindex="-1"'} aria-label="Hire ${esc(c.name)} for ${cost} gold">${cardHTML(c, { size: 'sm', cost, afford: ok })}</button>`; }).join('')}</div>
<p class="mk-note">${S.turn === 0 && S.flags.bought ? 'You already hired this turn.' : `Hire 1 card per turn with <b class="kw k-gold">gold</b>; it goes straight to your hand.`}${S.mod.fair ? ' Great Fair: 1 cheaper this round.' : ''}${S.turn === 0 && S.flags.buyFree ? ' Your next hire is free.' : ''}</p>`;
}
function renderHand() {
  /* one straight row on every screen, like Photo Studio's hand. It is rebuilt only when its cards change, so a scrolled hand
     stays where the player left it; choosing a card only moves a class */
  const me = S.players[0], mine = isMyTurn(), hand = $('#hand');
  const key = `${S.seed}|${innerWidth}x${innerHeight}|${mine ? 1 : 0}|${me.hand.map(c => c.uid).join(',')}`;
  if (hand.dataset.key !== key) {
    const keep = hand.scrollLeft;
    hand.innerHTML = me.hand.map((c, i) => cardHTML(c, { cls: mine ? 'playable' : 'dim', attrs: `data-i="${i}" tabindex="0" role="button" aria-label="${esc(c.name)}: ${esc(cardText(c))}"` })).join('') || '<div class="hand-empty">No cards in hand</div>';
    hand.dataset.key = key;
    if (mobile()) fitHandText(hand);
    hand.scrollLeft = keep;
    markHand(); handNav(); return;
  }
  markHand();
}
function markHand() { for (const el of $('#hand').children) if (el.dataset.uid) el.classList.toggle('sel', +el.dataset.uid === UI.sel); }
/* heavier redraws wait until the frame that shows the touch has been painted */
let LATER = null;
function later(fn) { if (LATER) { LATER.fn = fn; return; } LATER = { fn }; requestAnimationFrame(() => setTimeout(() => { const f = LATER.fn; LATER = null; f(); }, 0)); }
/* desktop: when the row is wider than its space, arrows at its ends move it one card at a time */
function handNav() {
  const h = $('#hand'), z = $('#handzone');
  if (mobile()) { z.classList.remove('over'); return; }
  const max = h.scrollWidth - h.clientWidth, over = max > 2;
  z.classList.toggle('over', over);
  if (!over) return;
  z.querySelector('.hand-nav.prev').disabled = h.scrollLeft <= 2;
  z.querySelector('.hand-nav.next').disabled = h.scrollLeft >= max - 2;
}
function handStep(dir) { const h = $('#hand'), c = h.querySelector('.card'); if (c) h.scrollBy({ left: dir * (c.offsetWidth + 20), behavior: 'smooth' }); }
/* phone hand cards show as many lines of text as fit (a long name or a seal leaves less room); the rest ends in an ellipsis */
function fitHandText(hand) {
  for (const ct of hand.querySelectorAll('.card .ct')) {
    const sp = ct.firstElementChild; if (!sp) continue;
    const cs = getComputedStyle(ct), lh = parseFloat(getComputedStyle(sp).lineHeight) || parseFloat(cs.fontSize) * 1.2;
    const sealed = !!ct.closest('.card').querySelector('.seal');
    const room = ct.clientHeight - parseFloat(cs.paddingTop) - (sealed ? parseFloat(cs.paddingBottom) : 3);
    sp.style.webkitLineClamp = Math.max(1, Math.floor((room + 1) / lh));
  }
}
function renderStage() {
  /* the card is rewritten only when it is a different card; a fresh play by someone else pops in */
  const c = selCard(), L = UI.last, sc = $('#stage-card');
  let html = '', cap = '', pop = false;
  if (c && isMyTurn()) {
    const multi = needsTarget(c) && opponents(S, S.players[0]).length > 1;
    html = `<div class="stage-fit">${cardHTML(c, { size: 'lg' })}</div>`;
    cap = multi && UI.hoverT == null ? 'Choose an enemy camp' : multi ? `Aim at ${nameOf(UI.hoverT)}` : 'Press Play to confirm';
  } else if (L) {
    html = `<div class="stage-fit">${cardHTML(L.card, { size: 'lg' })}</div>`;
    cap = `${civNameOf(L.pid)} ${L.pid === 0 ? 'played' : 'plays'} ${L.card.name}${L.target != null ? ' on ' + civObjOf(L.target) : ''}`;
    pop = L.fresh; L.fresh = false;
  }
  const changed = put(sc, html), h = $('#stage').clientHeight;
  if (changed || +sc.dataset.h !== h) { fitStage(); sc.dataset.h = h; }
  if (changed && pop && sc.querySelector('.card')) sc.querySelector('.card').classList.add('pop');
  const ce = $('#stage-caption'); if (ce.textContent !== cap) ce.textContent = cap;
}
function stageScale() { const st = $('#stage'); const h = mobile() ? 212 : 302; return Math.max(0.45, Math.min(1, (st.clientHeight - 44) / h)); }
function fitStage() { const f = $('#stage-card .stage-fit'), sc = $('#stage-card'); if (!f) { sc.style.height = ''; return; } const s = stageScale(); f.style.transform = `scale(${s})`; sc.style.height = Math.round(f.firstElementChild.offsetHeight * s) + 'px'; }
function selTarget(c) { const opps = opponents(S, S.players[0]); return !needsTarget(c) ? null : opps.length === 1 ? opps[0].id : UI.hoverT; }
function renderAction() { put('#prompt', actionHTML()); }
function actionHTML() {
  if (S.winner != null) return '';
  if (S.turn !== 0) return `<span class="hint">${esc(nameOf(S.turn))} is playing…</span>`;
  if (UI.busy) return '';
  if (DRAG.on) return `<span class="hint">${DRAG.zone && DRAG.zone.camps ? 'Drop it on an enemy camp' : 'Drop it on the chart to play it'}</span>`;
  const c = selCard();
  if (!c) return `<span class="hint">${S.plays > 1 ? `Your turn: play ${S.plays} cards` : mobile() ? 'Your turn: tap a card to choose it' : 'Your turn: click a card, or drag it onto the chart'}</span>`;
  const land = document.documentElement.classList.contains('land'), t = selTarget(c);
  const label = !needsTarget(c) ? (land ? 'Play' : `Play ${c.name}`) : t != null ? `${land ? 'On' : 'Play on'} ${nameOf(t)}` : (land ? 'Pick a camp' : 'Tap an enemy camp');
  return `<button class="icon-btn info" data-act="card-info" aria-label="Card details" data-tip="Card details (I)">${ICON.info}</button><button class="btn ghost small" data-act="cancel-sel">Cancel</button><button class="btn" data-act="play-sel"${needsTarget(c) && t == null ? ' disabled' : ''}>${esc(label)}</button>`;
}
function renderChronicle() {
  put('#chronicle', `<h3>Chronicle</h3><ul class="log">${S.log.slice(-60).reverse().map(e => { const t = logLine(e); return t ? `<li class="${e.k === 'event' ? 'r' : ''}">${t}</li>` : ''; }).join('')}</ul>`);
}
function logLine(e) {
  switch (e.k) {
    case 'play': return `${esc(civNameOf(e.pid))} played <b>${esc(e.card)}</b>${e.target != null ? ' on ' + esc(civObjOf(e.target)) : ''}`;
    case 'buy': return `${esc(civNameOf(e.pid))} hired <b>${esc(e.card)}</b> for <b class="kw k-gold">${e.cost} gold</b>`;
    case 'event': return `Round ${e.round}: ${esc(EVENT_BY[e.id].name)}`;
    case 'out': return `<b>${esc(civNameOf(e.pid))}</b> ${e.pid === 0 ? 'were' : 'was'} defeated`;
    case 'hich': return `${esc(civNameOf(e.pid))} ${e.pid === 0 ? 'are' : 'is'} in danger and drew 2 extra cards`;
    case 'banner': return `The Holy Banner raised ${esc(civObjOf(e.pid))} again`;
    case 'fatigue': return `${esc(civNameOf(e.pid))} reshuffled the deck and lost 1 HP to exhaustion`;
    case 'wonder': return `<b>${esc(civNameOf(e.pid))}</b> completed ${esc(e.name)}`;
    case 'attrition': return 'The war drags on: everyone lost 1 HP';
    case 'agecard': return e.pid === 0 ? 'Your Imperial Age card arrived' : `${esc(civNameOf(e.pid))} can now reach the Imperial Age`;
    case 'aged': return `<b>${esc(civNameOf(e.pid))}</b> ${e.pid === 0 ? 'advanced' : 'advanced'} to the Imperial Age`;
  }
  return '';
}
function renderPreview() {
  /* the result tags above each camp for the chosen card (and target) */
  const want = {}, c = selCard();
  if (c && isMyTurn()) {
    const opps = opponents(S, S.players[0]);
    const tid = needsTarget(c) ? (UI.hoverT != null ? UI.hoverT : opps.length === 1 ? opps[0].id : null) : null;
    const pv = needsTarget(c) && tid == null ? null : previewPlay(S, 0, c.uid, tid);
    if (pv) pv.players.forEach((d, i) => {
      const out = [], hand = i === 0 ? d.hand + 1 : d.hand;
      if (d.dies) out.push(['ko', 'Defeated']);
      if (d.hp) out.push([d.hp < 0 ? 'dmg' : 'heal', `${d.hp > 0 ? '+' : ''}${d.hp} HP`]);
      if (d.wonder) out.push(['wall', `wonder ${d.wonder > 0 ? '+' : ''}${d.wonder}`]);
      if (d.walls) out.push(['wall', `${d.walls > 0 ? '+' : ''}${d.walls} durability`]);
      if (d.guards) out.push(['guard', `${d.guards > 0 ? '+' : ''}${d.guards} guard${Math.abs(d.guards) > 1 ? 's' : ''}`]);
      if (d.traps > 0) out.push(['guard', 'Trap set']);
      if (d.gold) out.push(['gold', `${d.gold > 0 ? '+' : ''}${d.gold} gold`]);
      if (hand) out.push(['cards', `${hand > 0 ? '+' : ''}${hand} card${Math.abs(hand) > 1 ? 's' : ''}`]);   /* not 'card': that class is a whole card */
      want[i] = out.map(([k, t]) => `<span class="chip ${k}">${t}</span>`).join('');
    });
  }
  for (const el of $$('.camp .chips')) put(el, want[el.parentElement.dataset.pid] || '');
}
/* aiming marks are classes on the camps, so choosing a card or a target never rebuilds a camp */
function syncCampMarks() {
  const on = aiming();
  for (const el of $$('#opps .camp')) { const pid = +el.dataset.pid, t = on && S.players[pid].alive; el.classList.toggle('targetable', t); el.classList.toggle('hot', t && UI.hoverT === pid); }
}
function renderMatch() {
  if (!S) return;
  renderTopbar();
  const opps = S.players.slice(1), o = $('#opps'), cls = 'n' + opps.length;
  if (o.className !== cls) o.className = cls;
  const mini = mobile() && (opps.length > 1 || document.documentElement.classList.contains('land'));
  put(o, opps.map(P => (mini ? campMiniHTML(P) : campHTML(P, false))).join(''));
  put('#me', campHTML(S.players[0], true));
  put('#events', eventsHTML()); UI.flipEvent = false;
  put('#market', marketHTML());
  renderSelection();
  if (UI.drawer) renderChronicle();
}
/* what a choice changes: the hand's marks, the chart, the action bar, the result tags, the aiming marks */
function renderSelection() { if (!S) return; renderHand(); renderStage(); renderAction(); renderPreview(); syncCampMarks(); }

/* tooltips: with a mouse, only once the pointer has rested on the same thing for half a second, and gone the moment it leaves;
   on touch, a press-and-hold that a scroll or a drag cancels. Nothing else pops up on hover */
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
  if (el && !e.buttons) TIP.timer = setTimeout(() => { if (TIP.over === el) showTip(el); }, 500);
});
document.addEventListener('pointerout', e => { if (e.pointerType !== 'touch' && !e.relatedTarget) { TIP.over = null; hideTip(); } });
document.addEventListener('pointerdown', e => {
  hideTip(); TIP.press = null;
  if (e.pointerType !== 'touch') return;
  const el = e.target.closest('[data-tip]');
  if (el) { TIP.press = { x: e.clientX, y: e.clientY }; TIP.timer = setTimeout(() => showTip(el), 450); }
});
document.addEventListener('pointermove', e => { if (TIP.press && Math.hypot(e.clientX - TIP.press.x, e.clientY - TIP.press.y) > 10) { clearTimeout(TIP.timer); TIP.press = null; } }, { passive: true });
document.addEventListener('pointerup', () => { clearTimeout(TIP.timer); TIP.press = null; if (TIP.el && !FINE.matches) setTimeout(hideTip, 1600); });
document.addEventListener('pointercancel', () => { clearTimeout(TIP.timer); TIP.press = null; });
document.addEventListener('scroll', hideTip, true);
function hideZoom() { const z = $('#zoom'); if (z) z.classList.add('hidden'); }

function canHire() { if (!isMyTurn() || S.flags.bought) return 0; const me = S.players[0]; return S.market.filter(c => c && me.gold >= marketCost(S, me, c)).length; }
function ageMini(P) { return !P.ageGiven ? '' : !P.aged ? `<span class="agem hot" data-tip="Holds the Imperial Age card">${crownSVG(15)}!</span>` : `<span class="agem imp" data-tip="In the Imperial Age">${crownSVG(15)}</span>`; }
function campMiniHTML(P) {
  const C = CIVS[P.civ], hp = Math.max(0, dispHP(P)), acting = S.turn === P.id && S.winner == null, W = wonderOf(P);
  const wall = `<svg class="bi" viewBox="0 0 24 24" aria-hidden="true">${BUILD.castle}</svg>`, medals = medalsOf(P);
  return `<section class="camp mini fam-${CIV_FAMILY[P.civ]} civ-${P.civ}${acting ? ' turn' : ''}${P.alive ? '' : ' out'}" id="camp-${P.id}" data-pid="${P.id}" aria-label="${esc(nameOf(P.id))}, ${esc(C.name)}: ${hp} of ${P.maxHP} HP">
<header class="camp-banner">${crest(P.civ, 20)}<span class="cname" data-tip="${esc(C.name)}">${esc(nameOf(P.id))}</span></header>${hpBar(P, hp)}
<div class="mini-body">${hpTag(P, hp, true)}${medals ? `<span class="mmedals">${medals}</span>` : ''}<div class="mini-stats"><span data-tip="Defenses: total durability${W ? ' (+ the wonder behind)' : ''}">${wall}${wallTotal(P)}${W ? ` +${W.dur}` : ''}${guardsOf(P)}</span><span>${symBadge('G', 15)}${P.gold}</span><span><i class="cback"></i>${P.hand.length}</span>${P.aged ? '' : ageMini(P)}</div></div>
<div class="chips"></div><div class="floats"></div></section>`;
}
