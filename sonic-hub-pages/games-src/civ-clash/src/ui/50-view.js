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
const KW_RE = /\b(?:(over the walls)|([Ee]very opponent|[Ee]very other opponent|[Ee]veryone)|([Pp]lay another card|[Pp]lay \d+ more cards)|(\d+ (?:extra |less )?damage|damage)|(\d+ (?:extra )?HP|max HP|HP|[Hh]eals?)|(\d+ (?:extra |less )?gold|gold)|(\d+ (?:random |extra )?cards?|another card|a random card|a card|cards?)|(\d+ (?:extra )?durability|durability|walls?|structures?|[Ww]onders?)|([Ss]teal|stolen)|([Dd]estroy|destroyed))\b/g;
const KW_CLS = ['pierce', 'aoe', 'play', 'dmg', 'hp', 'gold', 'card', 'wall', 'steal', 'raze'];
function kw(text) { return esc(text).replace(KW_RE, (...m) => `<b class="kw k-${KW_CLS[m.slice(1, 11).findIndex(x => x !== undefined)]}">${m[0]}</b>`); }

const isMyTurn = () => S && S.turn === 0 && S.winner == null && !UI.busy;
const selCard = () => (S && UI.sel != null ? S.players[0].hand.find(c => c.uid === UI.sel) : null);
const civNameOf = pid => (pid === 0 ? 'You' : CIVS[S.players[pid].civ].name);
const civObjOf = pid => (pid === 0 ? 'you' : CIVS[S.players[pid].civ].name);
const typeOf = c => (c.age ? 'Imperial Age' : c.imperial ? 'Imperial' : c.unique ? 'Signature' : c.civ === 'merc' ? 'Mercenary' : 'Common');
function cardHTML(card, o = {}) {
  const merc = card.civ === 'merc', type = card.age ? 'age' : card.imperial ? 'imp' : card.unique ? 'sig' : merc ? 'merc' : 'com';
  const size = o.size || '';
  const syms = card.age ? crownSVG(size === 'lg' ? 66 : size === 'sm' ? 36 : 50) : [...card.icons].map(ch => symBadge(ch, 30)).join('');
  const seal = type === 'sig' ? `<i class="seal" title="Signature card">${crest(card.civ, 22)}</i>` : type === 'imp' || type === 'age' ? `<i class="seal crown" title="Imperial card">${crownSVG(24)}</i>` : type === 'merc' && o.cost == null ? `<i class="seal coin" title="Mercenary">${card.cost}</i>` : '';
  return `<div class="card ${size} t-${type} fam-${merc ? 'merc' : CIV_FAMILY[card.civ] || 'plain'} civ-${merc ? 'merc' : card.civ} ${o.cls || ''}" data-uid="${card.uid || ''}" ${o.attrs || ''} style="${o.style || ''}"><div class="cf"><div class="cb"><div class="cn"><span>${esc(card.name)}</span></div><div class="ca">${syms}</div><div class="ct"><span>${kw(cardText(card))}</span></div></div></div><i class="corner c1"></i><i class="corner c2"></i>${seal}${o.cost != null ? `<div class="cost${o.afford ? ' ok' : ''}">${o.cost} gold</div>` : ''}</div>`;
}
function workHTML(st) { return buildHTML(st); }
function dispHP(P) { return UI.view && UI.view[P.id] != null ? UI.view[P.id] : P.hp; }
function campHTML(P, mine) {
  const C = CIVS[P.civ], hp = Math.max(0, dispHP(P)), acting = S.turn === P.id && S.winner == null;
  const tgt = !mine && P.alive && UI.sel != null && isMyTurn() && needsTarget(selCard() || { steps: [] }) && opponents(S, S.players[0]).length > 1;
  const info = [];
  info.push(`<span class="coin" data-tip="Gold hires mercenaries at the market.">${symBadge('G', 20)}<b>${P.gold}</b></span>`);
  if (!mine) info.push(`<span class="backs" data-tip="${P.hand.length} cards in hand">${'<i class="cback"></i>'.repeat(Math.min(P.hand.length, 5))}<b>${P.hand.length}</b></span>`);
  if (!P.aged) info.push(!P.ageGiven ? `<span class="agem" data-tip="The Imperial Age card arrives at the start of turn ${RULES.ageTurn}.">${crownSVG(16)}in ${Math.max(1, RULES.ageTurn - P.turns)}</span>`
    : `<span class="agem hot" data-tip="Holds the Imperial Age card.">${crownSVG(16)}ready</span>`);
  if (P.relic) info.push(`<span class="relic" data-tip="${esc(RELICS[P.relic].name)}: ${esc(RELICS[P.relic].text)}">${esc(RELICS[P.relic].name)}</span>`);
  if (mine) info.push(`<span class="piles"><button class="pile" data-act="deck" data-tip="Cards left to draw">Deck ${P.deck.length}</button><button class="pile" data-act="discard" data-tip="Cards already played or lost">Discard ${P.discard.length}</button></span>`);
  return `<section class="camp fam-${CIV_FAMILY[P.civ]} civ-${P.civ}${mine ? ' mine' : ''}${acting ? ' turn' : ''}${P.alive ? '' : ' out'}${tgt ? ' targetable' : ''}${tgt && UI.hoverT === P.id ? ' hot' : ''}" id="camp-${P.id}" data-pid="${P.id}" aria-label="${mine ? 'You, ' : ''}${esc(C.name)}: ${hp} of ${P.maxHP} HP">
<header class="camp-banner">${crest(P.civ, mine ? 32 : 28)}<span class="cname">${esc(C.name)}</span>${mine ? '<span class="you">you</span>' : ''}${acting && !mine ? '<span class="flag">acting</span>' : ''}${P.alive ? '' : '<span class="flag out">defeated</span>'}<span class="medals">${medalsOf(P)}</span>${hpTag(P, hp)}</header>${hpBar(P, hp)}
<div class="camp-info"><div class="defs"><span class="lbl">Defenses</span>${P.structs.map(buildHTML).join('') || '<span class="none">none</span>'}</div><div class="stash">${info.join('')}</div></div>
<div class="chips"></div><div class="floats"></div></section>`;
}
function renderTopbar() {
  const me = isMyTurn(), E = S.event ? EVENT_BY[S.event] : null, who = S.winner != null ? '' : S.turn === 0 ? 'Your turn' : `${CIVS[cur(S).civ].name} to play`;
  $('#topbar').innerHTML = `<button class="icon-btn" data-act="pause" aria-label="Menu" data-tip="Menu (Esc)">${ICON.menu}</button>
<div class="tb-mid"><button class="evchip mob-only" data-act="events" aria-label="Events"><small>Round ${S.round}</small><b>${E ? esc(E.name) : 'Peace'}</b>${UI.eventSeen !== S.round && S.event ? '<i class="badge"></i>' : ''}</button><span class="pill desk-only">Round ${S.round}</span>${who ? `<span class="pill desk-only ${S.turn === 0 ? 'you' : ''}">${who}</span>` : ''}${me && S.plays > 0 ? `<span class="pips" data-tip="Plays left this turn">${'<i class="pip"></i>'.repeat(S.plays)}</span>` : ''}</div>
<div class="tb-right"><button class="icon-btn mob-only" data-act="market" aria-label="Mercenary Market" data-tip="Mercenary Market">${ICON.market}${canHire() ? `<i class="badge">${canHire()}</i>` : ''}</button>
<button class="speed desk-only" data-act="speed" data-tip="Animation speed (S)">${SPEEDS[SET.speed].label}</button><button class="icon-btn" data-act="codex" aria-label="Codex" data-tip="Codex: civilizations, cards, symbols and rules (C)">${ICON.book}</button><button class="icon-btn" data-act="chronicle" aria-label="Chronicle" data-tip="Chronicle (L)">${ICON.scroll}</button></div>`;
}
function eventsHTML() {
  const E = S.event ? EVENT_BY[S.event] : null, N = EVENT_BY[S.eventNext];
  return `<div class="ev now${UI.flipEvent ? ' flip' : ''}"><div class="when">This round</div><h4>${E ? esc(E.name) : 'Peace'}</h4><p>${E ? kw(E.text) : 'No event yet. Events start in round 2.'}</p></div>
<div class="ev next"><div class="when">Next round</div><h4>${esc(N.name)}</h4><p>${kw(N.text)}</p></div>${S.round >= 14 ? `<div class="ev-warn">${S.round >= 16 ? 'The war drags on: everyone loses 1 HP each round.' : 'From round 16 everyone loses 1 HP each round.'}</div>` : ''}`;
}
function marketHTML() {
  const me = S.players[0], mine = isMyTurn() && !S.flags.bought;
  return `<h3>Mercenary Market</h3><div class="mk-row">${S.market.map((c, i) => { if (!c) return '<div class="card sm civ-merc"><div class="cb"><div class="ct">Sold out</div></div></div>'; const cost = marketCost(S, me, c), ok = mine && me.gold >= cost; return `<button class="mk-item${ok ? ' can' : ''}" data-mi="${i}" ${ok ? '' : 'tabindex="-1"'} aria-label="Hire ${esc(c.name)} for ${cost} gold">${cardHTML(c, { size: 'sm', cost, afford: ok })}</button>`; }).join('')}</div>
<p class="mk-note">${S.turn === 0 && S.flags.bought ? 'You already hired this turn.' : `Hire 1 card per turn with <b class="kw k-gold">gold</b>; it goes straight to your hand.`}${S.mod.fair ? ' Great Fair: 1 cheaper this round.' : ''}${S.turn === 0 && S.flags.buyFree ? ' Your next hire is free.' : ''}</p>`;
}
function renderHand() {
  /* the hand is rebuilt only when its cards change, so a scrolled hand stays where the player left it */
  const me = S.players[0], n = me.hand.length, mid = (n - 1) / 2, mine = isMyTurn(), compact = mobile(), hand = $('#hand');
  const key = `${S.seed}|${compact ? 'c' : 'd' + hand.clientWidth}|${mine ? 1 : 0}|${me.hand.map(c => c.uid).join(',')}`;
  if (hand.dataset.key === key) {
    for (const el of hand.children) if (el.dataset.uid) { const on = +el.dataset.uid === UI.sel; el.classList.toggle('sel', on); if (!compact) el.style.zIndex = on ? 50 : +el.dataset.i + 1; }
    return;
  }
  const w = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cw')) || 150, keep = hand.scrollLeft;
  let gap = 0, spread = 0;
  if (!compact) { const W = hand.clientWidth - 40; gap = -14; if (n > 1 && n * w + (n - 1) * gap > W) gap = Math.max(-(w - 64), (W - n * w) / (n - 1)); spread = Math.min(4.2, 30 / Math.max(1, n)); hand.style.justifyContent = 'center'; }
  else hand.style.justifyContent = '';
  hand.innerHTML = me.hand.map((c, i) => cardHTML(c, { cls: (mine ? 'playable' : 'dim') + (UI.sel === c.uid ? ' sel' : ''), attrs: `data-i="${i}" tabindex="0" role="button" aria-label="${esc(c.name)}: ${esc(cardText(c))}"`, style: compact ? '' : `--rot:${((i - mid) * spread).toFixed(2)}deg;--y:${(Math.abs(i - mid) ** 2 * 2.4).toFixed(1)}px;z-index:${UI.sel === c.uid ? 50 : i + 1};margin-left:${i ? gap.toFixed(1) : 0}px` })).join('') || '<div class="hand-empty">No cards in hand</div>';
  hand.dataset.key = key;
  if (compact) hand.scrollLeft = keep;
}
function renderStage() {
  const c = selCard();
  if (c && isMyTurn()) {
    const multi = needsTarget(c) && opponents(S, S.players[0]).length > 1;
    $('#stage-card').innerHTML = `<div class="stage-fit">${cardHTML(c, { size: 'lg' })}</div>`; fitStage();
    $('#stage-caption').textContent = multi && UI.hoverT == null ? 'Choose an enemy camp' : multi ? `Aim at ${CIVS[S.players[UI.hoverT].civ].name}` : 'Press Play to confirm';
    return;
  }
  const L = UI.last;
  $('#stage-card').innerHTML = L ? `<div class="stage-fit">${cardHTML(L.card, { size: 'lg', cls: L.fresh ? 'pop' : '' })}</div>` : ''; fitStage();
  if (L) L.fresh = false;
  $('#stage-caption').textContent = L ? `${civNameOf(L.pid)} ${L.pid === 0 ? 'played' : 'plays'} ${L.card.name}${L.target != null ? ' on ' + civObjOf(L.target) : ''}` : '';
}
function stageScale() { const st = $('#stage'); const h = mobile() ? 212 : 302; return Math.max(0.45, Math.min(1, (st.clientHeight - 44) / h)); }
function fitStage() { const f = $('#stage-card .stage-fit'), sc = $('#stage-card'); if (!f) { sc.style.height = ''; return; } const s = stageScale(); f.style.transform = `scale(${s})`; sc.style.height = Math.round(f.firstElementChild.offsetHeight * s) + 'px'; }
function selTarget(c) { const opps = opponents(S, S.players[0]); return !needsTarget(c) ? null : opps.length === 1 ? opps[0].id : UI.hoverT; }
function renderAction() {
  const el = $('#prompt');
  if (S.winner != null) { el.innerHTML = ''; return; }
  if (S.turn !== 0) { el.innerHTML = `<span class="hint">${esc(CIVS[cur(S).civ].name)} is playing…</span>`; return; }
  if (UI.busy) { el.innerHTML = ''; return; }
  const c = selCard();
  if (!c) { el.innerHTML = `<span class="hint">${S.plays > 1 ? `Your turn: play ${S.plays} cards` : mobile() ? 'Your turn: tap a card to choose it' : 'Your turn: click a card, or drag it onto the chart'}</span>`; return; }
  const land = document.documentElement.classList.contains('land'), t = selTarget(c);
  const label = !needsTarget(c) ? (land ? 'Play' : `Play ${c.name}`) : t != null ? `${land ? 'On' : 'Play on'} ${CIVS[S.players[t].civ].name}` : (land ? 'Pick a camp' : 'Tap an enemy camp');
  el.innerHTML = `<button class="icon-btn info" data-act="card-info" aria-label="Card details" data-tip="Card details (I)">${ICON.info}</button><button class="btn ghost small" data-act="cancel-sel">Cancel</button><button class="btn" data-act="play-sel"${needsTarget(c) && t == null ? ' disabled' : ''}>${esc(label)}</button>`;
}
function renderChronicle() {
  $('#chronicle').innerHTML = `<h3>Chronicle</h3><ul class="log">${S.log.slice(-60).reverse().map(e => { const t = logLine(e); return t ? `<li class="${e.k === 'event' ? 'r' : ''}">${t}</li>` : ''; }).join('')}</ul>`;
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
  $$('.camp .chips').forEach(el => (el.innerHTML = ''));
  const c = selCard(); if (!c || !isMyTurn()) return;
  const opps = opponents(S, S.players[0]);
  const tid = needsTarget(c) ? (UI.hoverT != null ? UI.hoverT : opps.length === 1 ? opps[0].id : null) : null;
  if (needsTarget(c) && tid == null) return;
  const pv = previewPlay(S, 0, c.uid, tid); if (!pv) return;
  pv.players.forEach((d, i) => {
    const out = [], hand = i === 0 ? d.hand + 1 : d.hand;
    if (d.dies) out.push(['ko', 'Defeated']);
    if (d.hp) out.push([d.hp < 0 ? 'dmg' : 'heal', `${d.hp > 0 ? '+' : ''}${d.hp} HP`]);
    if (d.wonder) out.push(['wall', `wonder ${d.wonder}`]);
    if (d.walls) out.push(['wall', `${d.walls > 0 ? '+' : ''}${d.walls} wall`]);
    if (d.gold) out.push(['gold', `${d.gold > 0 ? '+' : ''}${d.gold} gold`]);
    if (hand) out.push(['card', `${hand > 0 ? '+' : ''}${hand} card${Math.abs(hand) > 1 ? 's' : ''}`]);
    const el = document.querySelector(`#camp-${i} .chips`); if (el) el.innerHTML = out.map(([k, t]) => `<span class="chip ${k}">${t}</span>`).join('');
  });
}
function renderMatch() {
  if (!S) return;
  renderTopbar();
  const opps = S.players.slice(1);
  $('#opps').className = 'n' + opps.length;
  const mini = mobile() && (opps.length > 1 || document.documentElement.classList.contains('land'));
  $('#opps').innerHTML = opps.map(P => (mini ? campMiniHTML(P) : campHTML(P, false))).join('');
  $('#me').innerHTML = campHTML(S.players[0], true);
  $('#events').innerHTML = eventsHTML(); UI.flipEvent = false;
  $('#market').innerHTML = marketHTML();
  renderHand(); renderStage(); renderAction(); renderPreview();
  if (UI.drawer) renderChronicle();
}

/* tooltips: hover on desktop, press-and-hold on touch */
const TIP = { el: null, timer: null };
function showTip(el) {
  if (document.documentElement.classList.contains('dragging')) return;
  const t = $('#tip'); t.innerHTML = kw(el.dataset.tip); t.classList.remove('hidden');
  const r = el.getBoundingClientRect(), w = t.offsetWidth, h = t.offsetHeight;
  let x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8), y = r.top - h - 8;
  if (y < 8) y = r.bottom + 8;
  t.style.left = x + 'px'; t.style.top = y + 'px'; TIP.el = el;
}
function hideTip() { $('#tip').classList.add('hidden'); TIP.el = null; }
const FINE = matchMedia('(hover: hover) and (pointer: fine)');
document.addEventListener('pointerover', e => { if (e.pointerType === 'touch' || !FINE.matches) return; const el = e.target.closest('[data-tip]'); if (el) showTip(el); else if (TIP.el) hideTip(); });
document.addEventListener('pointerdown', e => { clearTimeout(TIP.timer); if (e.pointerType !== 'touch') return; const el = e.target.closest('[data-tip]'); if (el) TIP.timer = setTimeout(() => showTip(el), 420); });
document.addEventListener('pointerup', () => { clearTimeout(TIP.timer); if (TIP.el && matchMedia('(pointer: coarse)').matches) setTimeout(hideTip, 1600); });
document.addEventListener('scroll', hideTip, true);

/* small cards (market, civ select) open at full size on hover or press-and-hold */
function showZoom(c) {
  let z = $('#zoom'); if (!z) { z = document.createElement('div'); z.id = 'zoom'; document.body.appendChild(z); }
  z.innerHTML = c.outerHTML.replace(/class="card sm /, 'class="card lg ').replace(/<div class="cost[^"]*">[^<]*<\/div>/, '');
  const r = c.getBoundingClientRect(), w = 214, h = 302;
  let x = r.left - w - 14; if (x < 8) x = r.right + 14; if (x + w > innerWidth - 8) x = Math.max(8, innerWidth / 2 - w / 2);
  z.style.left = x + 'px'; z.style.top = Math.min(Math.max(8, r.top + r.height / 2 - h / 2), innerHeight - h - 8) + 'px'; z.classList.remove('hidden');
}
function hideZoom() { const z = $('#zoom'); if (z) z.classList.add('hidden'); }
document.addEventListener('pointerover', e => { if (e.pointerType === 'touch' || !FINE.matches) return; const c = e.target.closest('.card.sm'); if (c) showZoom(c); else hideZoom(); });
document.addEventListener('pointerup', () => { clearTimeout(TIP.zoomTimer); setTimeout(hideZoom, 1400); });

function canHire() { if (!isMyTurn() || S.flags.bought) return 0; const me = S.players[0]; return S.market.filter(c => c && me.gold >= marketCost(S, me, c)).length; }
function ageMini(P) { return !P.ageGiven ? `<span class="agem" data-tip="Imperial Age card in ${Math.max(1, RULES.ageTurn - P.turns)} turn(s)">${crownSVG(15)}${Math.max(1, RULES.ageTurn - P.turns)}</span>` : !P.aged ? `<span class="agem hot" data-tip="Holds the Imperial Age card">${crownSVG(15)}!</span>` : `<span class="agem imp" data-tip="In the Imperial Age">${crownSVG(15)}</span>`; }
function campMiniHTML(P) {
  const C = CIVS[P.civ], hp = Math.max(0, dispHP(P)), acting = S.turn === P.id && S.winner == null, W = wonderOf(P);
  const tgt = P.alive && UI.sel != null && isMyTurn() && needsTarget(selCard() || { steps: [] }) && opponents(S, S.players[0]).length > 1;
  const wall = `<svg class="bi" viewBox="0 0 24 24" aria-hidden="true">${BUILD.castle}</svg>`, medals = medalsOf(P);
  return `<section class="camp mini fam-${CIV_FAMILY[P.civ]} civ-${P.civ}${acting ? ' turn' : ''}${P.alive ? '' : ' out'}${tgt ? ' targetable' : ''}${tgt && UI.hoverT === P.id ? ' hot' : ''}" id="camp-${P.id}" data-pid="${P.id}" aria-label="${esc(C.name)}: ${hp} of ${P.maxHP} HP">
<header class="camp-banner">${crest(P.civ, 20)}<span class="cname">${esc(C.name)}</span></header>${hpBar(P, hp)}
<div class="mini-body">${hpTag(P, hp, true)}${medals ? `<span class="mmedals">${medals}</span>` : ''}<div class="mini-stats"><span data-tip="Defenses: total durability">${wall}${wallTotal(P)}${W ? ` +${W.dur}` : ''}</span><span>${symBadge('G', 15)}${P.gold}</span><span><i class="cback"></i>${P.hand.length}</span>${P.aged ? '' : ageMini(P)}</div></div>
<div class="chips"></div><div class="floats"></div></section>`;
}
