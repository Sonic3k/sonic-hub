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
};
const svgURL = svg => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
function installTableArt() {
  const L = [], c = 1000;
  for (let i = 0; i < 32; i++) { const a = i * Math.PI / 16, main = i % 4 === 0; L.push(`<path d='M${c} ${c}L${(c + Math.cos(a) * 1400).toFixed(0)} ${(c + Math.sin(a) * 1400).toFixed(0)}' stroke='rgba(246,217,137,${main ? .22 : .1})' stroke-width='${main ? 1.6 : 1}'/>`); }
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8, x = c + Math.cos(a) * 660, y = c + Math.sin(a) * 660; for (let i = 0; i < 16; i++) { const b = i * Math.PI / 8; L.push(`<path d='M${x.toFixed(0)} ${y.toFixed(0)}l${(Math.cos(b) * 900).toFixed(0)} ${(Math.sin(b) * 900).toFixed(0)}' stroke='rgba(246,217,137,.05)'/>`); } }
  const rhumb = `<svg xmlns='http://www.w3.org/2000/svg' width='2000' height='2000' viewBox='0 0 2000 2000'>${L.join('')}<circle cx='1000' cy='1000' r='660' fill='none' stroke='rgba(246,217,137,.09)' stroke-width='1.5'/></svg>`;
  const star = (n, r1, r2, rot) => Array.from({ length: n * 2 }, (_, i) => { const r = i % 2 ? r2 : r1, a = i * Math.PI / n + rot - Math.PI / 2; return `${(100 + Math.cos(a) * r).toFixed(1)},${(100 + Math.sin(a) * r).toFixed(1)}`; }).join(' ');
  const rose = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><circle cx='100' cy='100' r='94' fill='none' stroke='rgba(246,217,137,.5)' stroke-width='1.2'/><circle cx='100' cy='100' r='86' fill='none' stroke='rgba(246,217,137,.3)' stroke-dasharray='2 4'/><polygon points='${star(8, 72, 12, Math.PI / 8)}' fill='rgba(246,217,137,.16)'/><polygon points='${star(4, 94, 15, 0)}' fill='rgba(246,217,137,.36)' stroke='rgba(246,217,137,.7)' stroke-width='.8'/><circle cx='100' cy='100' r='6' fill='rgba(246,217,137,.8)'/></svg>`;
  document.documentElement.style.setProperty('--rhumb', svgURL(rhumb));
  document.documentElement.style.setProperty('--rose', svgURL(rose));
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
  const kind = card.age ? 'age' : card.imperial ? 'imp' : card.unique ? 'sig' : card.civ === 'merc' ? 'merc' : '';
  const size = o.size || '';
  const syms = card.age ? crownSVG(size === 'lg' ? 70 : size === 'sm' ? 36 : 50) : [...card.icons].map(ch => symBadge(ch, 28)).join('');
  const seal = card.age || card.imperial ? `<i class="seal">${crownSVG(18)}</i>` : card.unique ? '<i class="seal">★</i>' : card.civ === 'merc' ? `<i class="seal">${card.cost}</i>` : '';
  const merc = card.civ === 'merc';
  return `<div class="card ${size} ${kind} ${merc ? 'civ-merc' : 'civ-' + card.civ} ${o.cls || ''}" data-uid="${card.uid || ''}" ${o.attrs || ''} style="${o.style || ''}">
<div class="cb"><div class="cn">${merc ? mercCrest(17) : crest(card.civ, 17)}<span>${esc(card.name)}</span>${seal}</div><div class="ca">${syms}</div><div class="ct"><span>${kw(cardText(card))}</span></div><div class="cf"><span>${typeOf(card)}</span><span>${merc ? '' : esc(CIVS[card.civ].name)}</span></div></div>${o.cost != null ? `<div class="cost${o.afford ? ' ok' : ''}">${o.cost} gold</div>` : ''}</div>`;
}
function workHTML(st) {
  if (st.kind === 'wonder') return `<span class="work wonder" data-tip="${esc(st.card.name)}: ${st.dur} durability. Its builder wins if it still stands in ${Math.max(0, 3 - st.age)} turn(s).">${symBadge('W', 16)}<b>${st.dur}</b><em>${Math.max(0, 3 - st.age)}</em></span>`;
  const note = { regen: 'regains 1 durability each turn', sacred: 'heals its owner 1 HP each turn', thorns: 'whoever hits it takes 1 damage', fortress: 'raze removes only 1 durability', income: 'gives its owner 1 gold each turn' }[st.kind];
  return `<span class="work ${st.kind || ''}" data-tip="${esc(st.card.name)}: ${st.dur} durability${note ? '; ' + note : ''}.">${st.dur}</span>`;
}
function dispHP(P) { return UI.view && UI.view[P.id] != null ? UI.view[P.id] : P.hp; }
function campHTML(P, mine) {
  const C = CIVS[P.civ], hp = Math.max(0, dispHP(P)), acting = S.turn === P.id && S.winner == null;
  const tgt = !mine && P.alive && UI.sel != null && isMyTurn() && needsTarget(selCard() || { steps: [] }) && opponents(S, S.players[0]).length > 1;
  const age = !P.ageGiven ? `<span class="tag" data-tip="The Imperial Age card arrives at the start of turn ${RULES.ageTurn}.">${crownSVG(16)} in ${Math.max(1, RULES.ageTurn - P.turns)}</span>`
    : !P.aged ? `<span class="tag hot" data-tip="Holds the Imperial Age card.">${crownSVG(16)} ready</span>` : `<span class="tag imp" data-tip="In the Imperial Age.">${crownSVG(16)} Imperial</span>`;
  const toks = [];
  if (P.tokens.camel) toks.push(`<span class="token camel" data-tip="Camel guard: the next cavalry attack against this camp is cancelled.">Camel guard${P.tokens.camel > 1 ? ' ×' + P.tokens.camel : ''}</span>`);
  if (P.tokens.immune) toks.push('<span class="token" data-tip="Divine Wind: every attack against this camp is cancelled until its next turn.">Divine Wind</span>');
  if (P.tokens.trap) toks.push('<span class="token" data-tip="Bạch Đằng stakes: the first opponent to deal damage here takes 2 damage.">Stakes set</span>');
  const piles = `<div class="piles"><button class="pile" data-act="deck" data-tip="Cards left to draw">Deck ${P.deck.length}</button><button class="pile" data-act="discard" data-tip="Cards already played or lost">Discard ${P.discard.length}</button></div>`;
  const right = mine ? '' : `<span class="backs" data-tip="${P.hand.length} cards in hand">${'<i class="cback"></i>'.repeat(Math.min(P.hand.length, 6))}<b>${P.hand.length}</b></span>`;
  return `<section class="camp civ-${P.civ}${mine ? ' mine' : ''}${acting ? ' turn' : ''}${P.alive ? '' : ' out'}${tgt ? ' targetable' : ''}${tgt && UI.hoverT === P.id ? ' hot' : ''}" id="camp-${P.id}" data-pid="${P.id}">
<header class="camp-banner">${crest(P.civ, mine ? 30 : 27)}<span class="cname">${mine ? 'You' : esc(C.name)}</span>${mine ? `<span class="csub">${esc(C.name)}</span>` : ''}${acting ? '<span class="flag">acting</span>' : ''}${P.alive ? '' : '<span class="flag out">defeated</span>'}${P.relic && !mine ? `<span class="relic" data-tip="${esc(RELICS[P.relic].name)}: ${esc(RELICS[P.relic].text)}">${esc(RELICS[P.relic].name)}</span>` : ''}</header>
<div class="camp-body"><div class="hpgem" style="--p:${Math.round(hp / P.maxHP * 100)}" data-tip="${hp} of ${P.maxHP} HP"><b>${hp}</b><small>/${P.maxHP}</small></div>
<div class="works">${P.structs.map(workHTML).join('') || '<span class="none">No walls</span>'}</div>
<div class="stash"><span class="coin" data-tip="Gold hires mercenaries at the market.">${symBadge('G', 20)}<b>${P.gold}</b></span>${right}${age}${mine && P.relic ? `<span class="relic mine-relic" data-tip="${esc(RELICS[P.relic].name)}: ${esc(RELICS[P.relic].text)}">${esc(RELICS[P.relic].name)}</span>` : ''}</div></div>
${mine ? piles : ''}${toks.length ? `<div class="tokens">${toks.join('')}</div>` : ''}<div class="chips"></div><div class="floats"></div></section>`;
}
function renderTopbar() {
  const me = isMyTurn(), who = S.winner != null ? '' : S.turn === 0 ? 'Your turn' : `${CIVS[cur(S).civ].name} to play`;
  $('#topbar').innerHTML = `<button class="icon-btn" data-act="pause" aria-label="Menu" data-tip="Menu (Esc)">${ICON.menu}</button>
<div class="tb-mid"><span class="pill">Round ${S.round}</span>${who ? `<span class="pill ${S.turn === 0 ? 'gold' : ''}">${who}</span>` : ''}${me && S.plays > 0 ? `<span class="pips" data-tip="Plays left this turn">${'<i class="pip"></i>'.repeat(S.plays)}</span>` : ''}</div>
<div class="tb-right"><button class="icon-btn mob-only" data-act="events" aria-label="Events" data-tip="Events">${ICON.event}</button><button class="icon-btn mob-only" data-act="market" aria-label="Market" data-tip="Mercenary Market">${ICON.market}</button>
<button class="speed" data-act="speed" data-tip="Animation speed (S)">${SPEEDS[SET.speed].label}</button><button class="icon-btn" data-act="chronicle" aria-label="Chronicle" data-tip="Chronicle (L)">${ICON.scroll}</button><button class="icon-btn desk-only" data-act="help" aria-label="How to play" data-tip="How to play (H)">${ICON.help}</button></div>`;
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
  const me = S.players[0], n = me.hand.length, mid = (n - 1) / 2, mine = isMyTurn();
  const spread = Math.min(4.2, 30 / Math.max(1, n));
  $('#hand').innerHTML = me.hand.map((c, i) => cardHTML(c, { cls: (mine ? 'playable' : 'dim') + (UI.sel === c.uid ? ' sel' : ''), attrs: `tabindex="${mine ? 0 : -1}" role="button" aria-label="${esc(c.name)}: ${esc(cardText(c))}"`, style: `--rot:${((i - mid) * spread).toFixed(2)}deg;--y:${(Math.abs(i - mid) ** 2 * 2.4).toFixed(1)}px;z-index:${i + 1}` })).join('') || '<div class="hand-empty">No cards in hand</div>';
}
function renderStage() {
  const c = selCard();
  if (c && isMyTurn()) {
    const multi = needsTarget(c) && opponents(S, S.players[0]).length > 1;
    $('#stage-card').innerHTML = `<div class="stage-fit">${cardHTML(c, { size: 'lg' })}</div>`; fitStage();
    $('#stage-caption').textContent = multi ? (UI.hoverT != null ? `Aim at ${CIVS[S.players[UI.hoverT].civ].name}` : 'Choose an enemy camp') : 'Click the card again to play it';
    return;
  }
  const L = UI.last;
  $('#stage-card').innerHTML = L ? `<div class="stage-fit">${cardHTML(L.card, { size: 'lg', cls: L.fresh ? 'pop' : '' })}</div>` : ''; fitStage();
  if (L) L.fresh = false;
  $('#stage-caption').textContent = L ? `${civNameOf(L.pid)} ${L.pid === 0 ? 'played' : 'plays'} ${L.card.name}${L.target != null ? ' on ' + civObjOf(L.target) : ''}` : '';
}
function stageScale() { const st = $('#stage'); const h = mobile() ? 212 : 302; return Math.max(0.45, Math.min(1, (st.clientHeight - 44) / h)); }
function fitStage() { const f = $('#stage-card .stage-fit'), sc = $('#stage-card'); if (!f) { sc.style.height = ''; return; } const s = stageScale(); f.style.transform = `scale(${s})`; sc.style.height = Math.round(f.firstElementChild.offsetHeight * s) + 'px'; }
function renderPrompt() {
  let t = '';
  if (S.winner == null) {
    if (S.turn !== 0) t = `${CIVS[cur(S).civ].name} is playing…`;
    else if (UI.busy) t = '';
    else if (UI.sel != null) t = '';
    else if (UI.sel != null) { const c = selCard(); t = c && needsTarget(c) && opponents(S, S.players[0]).length > 1 ? 'Click an enemy camp to aim it, or click the card again to cancel' : 'Click the card again to play it'; }
    else t = S.plays > 1 ? `Your turn: play ${S.plays} cards` : 'Your turn: pick a card';
  }
  $('#prompt').textContent = t;
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
  $('#opps').innerHTML = opps.map(P => campHTML(P, false)).join('');
  $('#me').innerHTML = campHTML(S.players[0], true);
  $('#events').innerHTML = eventsHTML(); UI.flipEvent = false;
  $('#market').innerHTML = marketHTML();
  renderHand(); renderStage(); renderPrompt(); renderPreview();
  if (UI.drawer) renderChronicle();
}

/* tooltips: hover on desktop, press-and-hold on touch */
const TIP = { el: null, timer: null };
function showTip(el) {
  const t = $('#tip'); t.innerHTML = kw(el.dataset.tip); t.classList.remove('hidden');
  const r = el.getBoundingClientRect(), w = t.offsetWidth, h = t.offsetHeight;
  let x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8), y = r.top - h - 8;
  if (y < 8) y = r.bottom + 8;
  t.style.left = x + 'px'; t.style.top = y + 'px'; TIP.el = el;
}
function hideTip() { $('#tip').classList.add('hidden'); TIP.el = null; }
document.addEventListener('pointerover', e => { if (e.pointerType === 'touch') return; const el = e.target.closest('[data-tip]'); if (el) showTip(el); else if (TIP.el) hideTip(); });
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
document.addEventListener('pointerover', e => { if (e.pointerType === 'touch') return; const c = e.target.closest('.card.sm'); if (c) showZoom(c); else hideZoom(); });
document.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch') return; const c = e.target.closest('.card.sm'); if (c) TIP.zoomTimer = setTimeout(() => showZoom(c), 420); });
document.addEventListener('pointerup', () => { clearTimeout(TIP.zoomTimer); setTimeout(hideZoom, 1400); });
