/* ── Rendering ── */
const $ = s => document.querySelector(s);
const civName = pid => (pid === 0 ? 'You' : CIVS[S.players[pid].civ].name);
const civObj = pid => (pid === 0 ? 'you' : CIVS[S.players[pid].civ].name);
/* keyword colours: the same colour as the symbol for that resource, so a long game can be read at a glance */
const KW_RE = /\b(?:(over the walls)|([Ee]very opponent|[Ee]veryone)|([Pp]lay another card|[Pp]lay \d+ more cards)|(\d+ (?:extra |less )?damage|damage)|(\d+ (?:extra )?HP|max HP|HP|[Hh]eals?)|(\d+ (?:extra |less )?gold|gold)|(\d+ (?:random |extra )?cards?|another card|a random card|a card|cards?)|(\d+ (?:extra )?durability|durability|walls?|structures?|[Ww]onders?)|([Ss]teal|stolen)|([Dd]estroy|destroyed))\b/g;
const KW_CLS = ['pierce', 'aoe', 'play', 'dmg', 'hp', 'gold', 'card', 'wall', 'steal', 'raze'];
function kw(text) { return esc(text).replace(KW_RE, (...m) => `<b class="kw k-${KW_CLS[m.slice(1, 11).findIndex(x => x !== undefined)]}">${m[0]}</b>`); }
function cardHTML(card, o = {}) {
  const civ = card.civ === 'merc' ? null : CIVS[card.civ];
  const cls = ['card', card.unique ? 'unique' : '', card.imperial ? 'imperial' : '', card.age ? 'agecard' : '', card.civ === 'merc' ? 'merc' : '', o.cls || ''].join(' ');
  const syms = card.age ? crownSVG(o.small ? 34 : 44) : [...card.icons].map(ch => symBadge(ch, o.small ? 22 : 28)).join('');
  return `<div class="${cls}" data-uid="${card.uid || ''}" ${o.attrs || ''} style="--civ:${civ ? civ.color : '#6b5a3a'}">
    <div class="c-head">${civ ? crest(card.civ, 18) : mercCrest(18)}<span class="c-name">${esc(card.name)}</span></div>
    <div class="c-syms">${syms}</div>
    <div class="c-text">${kw(cardText(card))}</div>
    ${o.cost != null ? `<div class="c-cost${o.afford ? ' ok' : ''}">${o.cost} gold</div>` : ''}${card.unique ? '<div class="c-star" title="Signature card of this civilization">★</div>' : ''}${card.imperial ? '<div class="c-imp" title="Imperial Age card">Imperial</div>' : ''}
  </div>`;
}
function structHTML(st) {
  if (st.kind === 'wonder') return `<div class="st wonder" title="${esc(cardText(st.card))}"><b>${st.dur}</b><span>${esc(st.card.name)}</span><i>${Math.max(0, 3 - st.age)} turns to win</i></div>`;
  const tag = { regen: 'regrows', sacred: 'heals', thorns: 'spiked', fortress: 'giant stones' }[st.kind] || '';
  return `<div class="st" title="${esc(st.card.name)}${tag ? ' (' + tag + ')' : ''}">${symBadge('W', 16)}<b>${st.dur}</b><span>${esc(st.card.name)}</span>${tag ? `<i>${tag}</i>` : ''}</div>`;
}
function tokensHTML(P) {
  const t = [];
  if (P.tokens.camel) t.push(`<span class="tok" title="The next cavalry attack against this player is cancelled">${symBadge('L', 16)} camel guard${P.tokens.camel > 1 ? ' ×' + P.tokens.camel : ''}</span>`);
  if (P.tokens.immune) t.push('<span class="tok hot" title="Every attack is cancelled until their next turn">Divine Wind</span>');
  if (P.tokens.trap) t.push('<span class="tok hot" title="The first opponent to deal damage takes 2 damage">Bạch Đằng stakes</span>');
  return t.join('');
}
function seatHTML(P, me) {
  const C = CIVS[P.civ], turn = S.turn === P.id && S.winner == null;
  const tgt = UI.targeting && !me && P.alive ? ' targetable' : '';
  const hpPct = Math.max(0, P.hp / P.maxHP * 100);
  const backs = me ? '' : `<span class="backs" title="${P.hand.length} cards in hand">${'<i></i>'.repeat(Math.min(P.hand.length, 8))}<em>${P.hand.length}</em></span>`;
  return `<div class="seat${me ? ' me' : ''}${turn ? ' turn' : ''}${P.alive ? '' : ' out'}${tgt}" id="seat-${P.id}" data-pid="${P.id}" style="--civ:${C.color}">
    <div class="s-top">${crest(P.civ, me ? 46 : 40)}
      <div class="s-id"><div class="s-name">${me ? 'You · ' : ''}${esc(C.name)}${P.aged ? ` <span class="imp-tag" title="Imperial Age">${crownSVG(16)}</span>` : ''}</div><div class="s-sub">${P.relic ? esc(RELICS[P.relic].name) : ''}</div></div>
      <div class="s-hp" title="HP"><b>${P.hp}</b><small>/${P.maxHP}<span class="hp-u"> HP</span></small><div class="hpbar"><div style="width:${hpPct}%"></div></div></div>
    </div>
    <div class="s-row"><span class="gold" title="Gold">${symBadge('G', 18)}<b>${P.gold}</b></span>${backs}${!P.ageGiven ? `<span class="tok" title="The Imperial Age card arrives at the start of turn ${RULES.ageTurn}">${crownSVG(14)} in ${Math.max(1, RULES.ageTurn - P.turns)}</span>` : !P.aged ? '<span class="tok hot imp" title="Holds the Imperial Age card">Imperial ready</span>' : ''}${tokensHTML(P)}${turn ? '<span class="turn-tag">acting</span>' : ''}${P.alive ? '' : '<span class="out-tag">defeated</span>'}</div>
    <div class="s-structs">${P.structs.map(structHTML).join('') || '<span class="none">No structures</span>'}</div>
    <div class="floats"></div>
  </div>`;
}
function renderGame() {
  const me = S.players[0], myTurn = S.turn === 0 && S.winner == null && !UI.busy;
  const opps = S.players.slice(1);
  $('#opps').className = 'opps n' + opps.length;
  $('#opps').innerHTML = opps.map(P => seatHTML(P, false)).join('');
  $('#mine').innerHTML = seatHTML(me, true);
  const E = S.event ? EVENT_BY[S.event] : null, N = EVENT_BY[S.eventNext];
  $('#events').innerHTML = `<div class="ev-now"><small>Event · round ${S.round}</small><b>${E ? esc(E.name) : 'Peace'}</b><p>${E ? kw(E.text) : 'No event yet.'}</p></div>
    <div class="ev-next"><small>Next round</small><b>${esc(N.name)}</b><p>${kw(N.text)}</p></div>${S.round >= 14 ? `<div class="ev-warn">${S.round >= 16 ? 'The war drags on: everyone loses 1 HP each round' : 'From round 16 everyone loses 1 HP each round'}</div>` : ''}`;
  const lp = UI.last;
  $('#arena').innerHTML = lp ? `<div class="played-by">${esc(civName(lp.pid))}${lp.target != null ? ' ▸ ' + esc(civObj(lp.target)) : ''}</div>${cardHTML(lp.card, { cls: 'big pop' })}` : `<div class="arena-hint">${S.turn === 0 ? 'Pick a card from your hand' : ''}</div>`;
  $('#market').innerHTML = `<h3>Mercenary Market</h3><div class="m-cards">${S.market.map((c, i) => { if (!c) return '<div class="card empty">Sold out</div>'; const cost = marketCost(S, me, c), ok = myTurn && !S.flags.bought && me.gold >= cost; return cardHTML(c, { small: 1, cost, afford: ok, attrs: `data-mi="${i}"`, cls: ok ? 'buyable' : '' }); }).join('')}</div>
    <p class="m-note">${S.flags.bought && S.turn === 0 ? 'Already hired this turn' : 'Hire 1 card per turn with <b class="kw k-gold">gold</b>; it goes straight to your hand'}${S.mod.fair ? ' · Great Fair: 1 cheaper' : ''}${S.flags.buyFree && S.turn === 0 ? ' · this hire is free' : ''}</p>`;
  $('#hand').innerHTML = me.hand.map(c => cardHTML(c, { cls: myTurn ? 'playable' + (UI.targeting === c.uid ? ' chosen' : '') : '' })).join('') || '<div class="hand-empty">No cards in hand</div>';
  const mini = `<span class="me-mini"><b class="kw k-hp">${me.hp}/${me.maxHP} HP</b> · <b class="kw k-gold">${me.gold} gold</b>${walls(me).length ? ` · <b class="kw k-wall">${wallTotal(me)} walls</b>` : ''}</span>`;
  $('#status').innerHTML = mini + (S.winner != null ? '' : UI.targeting ? 'Choose an opponent to target <button class="btn ghost" id="cancelTarget">Cancel</button>' : myTurn ? `Your turn${S.plays > 1 ? ` · ${S.plays} plays left` : ''}` : `${esc(civName(S.turn))} is playing…`);
  $('#chron').innerHTML = S.log.slice(-9).reverse().map(e => `<li>${logLine(e)}</li>`).join('');
}
function logLine(e) {
  switch (e.k) {
    case 'play': return `${esc(civName(e.pid))} ▸ <b>${esc(e.card)}</b>${e.target != null ? ' → ' + esc(civObj(e.target)) : ''}`;
    case 'buy': return `${esc(civName(e.pid))} hired <b>${esc(e.card)}</b> for <b class="kw k-gold">${e.cost} gold</b>`;
    case 'event': return `Round ${e.round}: <b>${esc(EVENT_BY[e.id].name)}</b>`;
    case 'out': return `<b>${esc(civName(e.pid))}</b> ${e.pid === 0 ? 'were' : 'is'} defeated`;
    case 'hich': return `${esc(civName(e.pid))} in danger: drew 2 extra cards`;
    case 'banner': return `The Holy Banner raised ${esc(civObj(e.pid))} again`;
    case 'fatigue': return `${esc(civName(e.pid))} reshuffled the deck: exhausted, −1 HP`;
    case 'wonder': return `<b>${esc(civName(e.pid))}</b> completed ${esc(e.name)}`;
    case 'attrition': return 'The war drags on: everyone −1 HP';
    case 'agecard': return e.pid === 0 ? 'The <b>Imperial Age</b> card is in your hand' : `${esc(civName(e.pid))} can now reach the Imperial Age`;
    case 'aged': return `<b>${esc(civName(e.pid))}</b> ${e.pid === 0 ? 'advance' : 'advances'} to the Imperial Age`;
  }
  return '';
}
const FX_TEXT = {
  hp: f => (f.n < 0 ? ['−' + -f.n, 'dmg'] : ['+' + f.n, 'heal']), wall: f => [`−${f.n} wall`, 'wall'], razed: f => [`${f.name} falls`, 'wall'],
  camel: () => ['Camels block!', 'info'], immune: () => ['Divine Wind!', 'info'], shroud: () => ['Mantle −1', 'info'], trap: () => ['Stakes!', 'dmg'],
  thorns: () => ['Spikes!', 'dmg'], steal: () => ['Card stolen', 'info'], convert: f => [`Lost ${f.name}`, 'info'], gold: f => [`+${f.n} gold`, 'gold'],
  out: () => ['Defeated!', 'dmg big'], hich: () => ['In danger: +2 cards', 'heal'], banner: () => ['Holy Banner!', 'heal'], wonderhit: f => [`Wonder ${f.left}`, 'wall'],
  discard: () => ['−1 card', 'info'], rained: () => ['Monsoon: no building', 'info'], age: () => ['Imperial Age!', 'gold big'], tribute: () => ['−1 gold', 'gold'],
};
function floatText(pid, text, cls, delay) {
  setTimeout(() => {
    const box = document.querySelector(`#seat-${pid} .floats`); if (!box) return;
    const d = document.createElement('div'); d.className = 'float ' + cls; d.textContent = text; box.appendChild(d);
    setTimeout(() => d.remove(), 1700);
  }, delay);
}
function showFx(fx) {
  let t = 0; const snd = new Set();
  for (const f of fx) {
    const m = FX_TEXT[f.k]; if (!m) continue;
    const [text, cls] = m(f);
    floatText(f.t, text, cls, t); t += 140;
    if (f.k === 'hp') snd.add(f.n < 0 ? 'hit' : 'heal'); else if (f.k === 'wall' || f.k === 'razed' || f.k === 'wonderhit') snd.add('wall');
    if (f.k === 'hp' && f.n < 0) { const el = document.querySelector(`#seat-${f.t}`); if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); } }
  }
  [...snd].forEach((s, i) => setTimeout(() => SFX.play(s), 120 + i * 90));
}
function banner(text, sub) {
  const b = $('#banner'); b.innerHTML = `<div class="bt">${esc(text)}</div>${sub ? `<span>${kw(sub)}</span>` : ''}`;
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
}
