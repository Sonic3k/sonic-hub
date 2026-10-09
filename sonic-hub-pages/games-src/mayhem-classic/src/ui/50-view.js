/* ── View: cards, seats and the table, drawn from the state ── */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const UI = { screen: 'menu', sel: null, aim: null, busy: false, last: null, view: null, drawer: false, n: 2, hero: 'barbarian', known: null, lastSetup: {} };
const ICON = {
  menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  scroll: '<svg viewBox="0 0 24 24"><path d="M6 4h11a3 3 0 0 1 0 6h-1v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 4a3 3 0 0 0-3 3v3M8 9h4M8 13h5M8 16h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 11v6M12 7.6v.2" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M12 6.6C10 5.1 7.5 4.6 4 4.9v13c3.5-.3 6 .2 8 1.7 2-1.5 4.5-2 8-1.7v-13c-3.5-.3-6 .2-8 1.7zM12 6.6v13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
};
/* a region is rewritten only when its markup changes, so nothing under the pointer is rebuilt for nothing */
function put(el, html) { if (typeof el === 'string') el = $(el); if (!el || el._html === html) return false; el.innerHTML = html; el._html = html; return true; }
function forget(el) { if (el) el._html = null; }
const isMyTurn = () => S && S.turn === 0 && S.winner == null && !UI.busy && S.players[0].alive;
const humanPending = () => S && S.pending && S.pending.pid === 0 ? S.pending : null;
/* the card the player is about to play: the one chosen in hand, or a stolen card that must be played now */
function selCard() { if (!S) return null; const pd = humanPending(); if (pd) return pd.card; return UI.sel != null ? S.players[0].hand.find(c => c.uid === UI.sel) || null : null; }
const nameOf = pid => (pid === 0 ? 'You' : HEROES[S.players[pid].hero].name);
const objOf = pid => (pid === 0 ? 'you' : HEROES[S.players[pid].hero].name);

/* ── card text: built from the symbols, so it always says what the card does ── */
const kwS = (ch, t) => `<b class="kw k-${ch}">${t}</b>`;
function symbolText(sym) {
  const n = ch => count(sym, ch), out = [];
  if (n('A')) out.push(`Deal ${kwS('A', `${n('A')} damage`)}.`);
  if (n('S')) out.push(`${kwS('S', `Shield ${n('S')}`)}: stays in front of you.`);
  if (n('H')) out.push(`${kwS('H', `Heal ${n('H')}`)}.`);
  if (n('D')) out.push(`${kwS('D', n('D') === 1 ? 'Draw a card' : `Draw ${n('D')} cards`)}.`);
  if (n('P')) out.push(`${kwS('P', n('P') === 1 ? 'Play another card' : `Play ${n('P')} more cards`)}.`);
  return out;
}
function cardTextHTML(card, full) {
  const parts = [];
  if (card.power) parts.push(esc(full ? POWERS[card.power].text : POWERS[card.power].short));
  return parts.concat(symbolText(card.sym)).join(' ');
}
function cardHTML(card, o = {}) {
  const syms = (card.power ? ['M'] : []).concat([...card.sym].sort((a, b) => SYM_ORDER.indexOf(a) - SYM_ORDER.indexOf(b))).map(ch => symSVG(ch, 30)).join('');
  const many = card.sym.length + (card.power ? 1 : 0) > 4;
  return `<div class="card h-${card.hero} ${o.size || ''}${card.power ? ' mighty' : ''}${many ? ' many' : ''} ${o.cls || ''}" data-uid="${card.uid || ''}" ${o.attrs || ''} style="${o.style || ''}"><div class="cf"><div class="cb"><div class="cn"><span>${esc(card.name)}</span></div><div class="cart">${artSVG(artKey(card))}</div><div class="ct"><span>${cardTextHTML(card)}</span></div></div></div><div class="csy">${syms}</div>${card.power ? `<span class="ckind">Mighty</span>` : ''}</div>`;
}
/* a card from a deck list (no uid): for menus, the codex and the hero sheet */
function staticCard(hero, d) { return { uid: 0, hero, id: d.id, name: d.name, sym: d.sym || '', power: d.power || null, art: d.art || null }; }

/* ── seats ── */
function shieldChipHTML(sh, holder) {
  const max = shieldMax(sh), left = shieldLeft(sh), lent = sh.owner !== holder.id;
  const pips = Array.from({ length: max }, (_, i) => symSVG('S', 17, i < left ? '' : 'used')).join('');
  const tip = `${sh.card.name}: shield ${left} of ${max} left.${lent ? ` Taken from ${objOf(sh.owner)}; it goes back to their discard pile when it breaks.` : ''}`;
  return `<button class="shc h-${sh.card.hero}" data-sh="${sh.card.uid}" data-pid="${holder.id}" data-tip="${esc(tip)}" aria-label="${esc(tip)}"><span class="shc-art">${artSVG(artKey(sh.card), 'a')}</span><span class="shc-pips">${pips}</span>${lent ? `<i class="lent h-${S.players[sh.owner].hero}" style="background:var(--h)"></i>` : ''}</button>`;
}
function dispHP(P) { return UI.view && UI.view[P.id] != null ? UI.view[P.id] : P.hp; }
function hpParts(P, hp) {
  const low = hp <= 3 && P.alive ? ' low' : '';
  return {
    heart: `<span class="hpheart${low}" data-tip="${hp} of ${P.maxHP} HP. At 0 they are knocked out.">${heartSVG()}<b>${hp}</b></span>`,
    track: `<div class="hptrack" aria-hidden="true">${Array.from({ length: P.maxHP }, (_, i) => `<i${i < hp ? ' class="on"' : ''}></i>`).join('')}</div>`,
  };
}
function seatHTML(P, mine, mini) {
  const H = HEROES[P.hero], hp = Math.max(0, dispHP(P)), acting = S.turn === P.id && S.winner == null, { heart, track } = hpParts(P, hp);
  const shields = P.shields.length ? P.shields.map(sh => shieldChipHTML(sh, P)).join('') : `<span class="none">${mini ? 'No shield' : 'No shields'}</span>`;
  const stash = mine
    ? `<span class="piles"><button class="pile" data-act="deck" data-tip="Cards left to draw">Deck ${P.deck.length}</button><button class="pile" data-act="discard" data-tip="Cards already used">Discard ${P.discard.length}</button></span>`
    : `<span class="backs" data-tip="${P.hand.length} cards in hand">${`<i class="cback h-${P.hero}"></i>`.repeat(Math.min(P.hand.length, mini ? 3 : 5))}<b>${P.hand.length}</b></span>${mini ? '' : `<span class="piles"><span class="pile static" data-tip="Cards left in their deck">Deck ${P.deck.length}</span><span class="pile static" data-tip="Cards in their discard pile">Discard ${P.discard.length}</span></span>`}`;
  const flags = (acting && !mine ? '<span class="flag">playing</span>' : '') + (P.disguised ? `<span class="flag vanish" data-tip="Vanished: until ${mine ? 'your' : 'their'} next turn no opponent's card can touch ${mine ? 'you' : 'them'} or ${mine ? 'your' : 'their'} shields.">vanished</span>` : '') + (P.alive ? '' : '<span class="flag out">knocked out</span>');
  return `<section class="seat h-${P.hero}${mine ? ' mine' : ''}${mini ? ' mini' : ''}${acting ? ' turn' : ''}${P.alive ? '' : ' out'}${P.disguised ? ' vanished' : ''}" id="seat-${P.id}" data-pid="${P.id}" aria-label="${esc(nameOf(P.id))}, the ${H.cls}: ${hp} of ${P.maxHP} HP">
<header class="seat-banner"><span class="emb">${emblemSVG(P.hero)}</span><span class="sname"><b>${esc(mine ? `You · ${H.name}` : mini ? H.name : `${H.name} ${H.title}`)}</b><small>${H.cls}</small></span>${flags}${heart}</header>${track}
<div class="seat-body"><div class="shields">${shields}</div><div class="stash">${stash}</div></div>
<div class="chips"></div><div class="floats"></div></section>`;
}

/* ── the top bar ── */
function renderTopbar() {
  const who = S.winner != null ? '' : S.turn === 0 ? 'Your turn' : `${nameOf(S.turn)} is playing`;
  const owed = S.turn === 0 && S.winner == null ? S.plays + (humanPending() ? 1 : 0) : 0;
  put('#topbar', `<button class="icon-btn" data-act="pause" aria-label="Menu" data-tip="Menu (Esc)">${ICON.menu}</button>
<div class="tb-mid"><span class="pill">Round ${S.round}</span>${who ? `<span class="pill ${S.turn === 0 ? 'you' : ''}">${esc(who)}</span>` : ''}${owed > 0 ? `<span class="pips" data-tip="Cards you still have to play this turn">${Array.from({ length: Math.min(owed, 6) }, () => symSVG('P', 20, 'pip')).join('')}${owed > 6 ? `+${owed - 6}` : ''}</span>` : ''}</div>
<div class="tb-right"><button class="speed desk-only" data-act="speed" data-tip="Animation speed (S)">${SPEEDS[SET.speed].label}</button><button class="icon-btn" data-act="codex" aria-label="Heroes and rules" data-tip="Heroes and rules (H)">${ICON.book}</button><button class="icon-btn" data-act="chronicle" aria-label="Battle log" data-tip="Battle log (L)">${ICON.scroll}</button></div>`);
}

/* ── the hand: one straight row; rebuilt only when its cards change, so a scrolled hand stays put ── */
function renderHand() {
  const me = S.players[0], mine = isMyTurn() && !humanPending(), hand = $('#hand');
  const key = `${S.seed}|${innerWidth}x${innerHeight}|${mine ? 1 : 0}|${me.hand.map(c => c.uid).join(',')}`;
  if (hand.dataset.key !== key) {
    const keep = hand.scrollLeft, known = UI.known || new Set();
    hand.innerHTML = me.hand.map((c, i) => cardHTML(c, { cls: (mine ? 'playable' : 'dim') + (known.size && !known.has(c.uid) ? ' fresh' : ''), attrs: `data-i="${i}" tabindex="0" role="button" aria-label="${esc(c.name)}"` })).join('') || '<div class="hand-empty">No cards in hand</div>';
    UI.known = new Set(me.hand.map(c => c.uid));
    hand.dataset.key = key; hand.scrollLeft = keep;
    markHand(); handNav(); return;
  }
  markHand();
}
function markHand() { for (const el of $('#hand').children) if (el.dataset.uid) el.classList.toggle('sel', +el.dataset.uid === UI.sel && !humanPending()); }
let LATER = null;
function later(fn) { if (LATER) { LATER.fn = fn; return; } LATER = { fn }; requestAnimationFrame(() => setTimeout(() => { const f = LATER.fn; LATER = null; f(); }, 0)); }
function handNav() {
  const h = $('#hand'), z = $('#handzone');
  if (mobile()) { z.classList.remove('over'); return; }
  const max = h.scrollWidth - h.clientWidth, over = max > 2;
  z.classList.toggle('over', over);
  if (!over) return;
  z.querySelector('.hand-nav.prev').disabled = h.scrollLeft <= 2;
  z.querySelector('.hand-nav.next').disabled = h.scrollLeft >= max - 2;
}
function handStep(dir) { const h = $('#hand'), c = h.querySelector('.card'); if (c) h.scrollBy({ left: dir * (c.offsetWidth + 18), behavior: 'smooth' }); }

/* ── aiming: which seats and shields the chosen card can be played on ── */
function aimChoices(c) { const pd = humanPending(); if (!c) return [null]; return choicesFor(S, S.players[0], c); }
/* the board is aimed at for attacks, shields and opponents; a card from the discard pile is chosen on a sheet */
function boardAim(c) { const k = c && aimOf(c); return !!k && k !== 'discard' && aimChoices(c)[0] !== null; }
/* the target the player has picked, or the only one there is */
function chosenAim(c) {
  if (!boardAim(c)) return null;
  if (UI.aim) return UI.aim;
  const all = aimChoices(c);
  return all.length === 1 && !(aimOf(c) === 'attack' && S.players[all[0].t].shields.length > 1) ? all[0] : null;
}
function aimable(c) {
  /* seat ids and shield uids that can be aimed at */
  const seats = new Set(), shields = new Set();
  if (!boardAim(c)) return { seats, shields };
  const k = aimOf(c), all = aimChoices(c);
  for (const ch of all) {
    if (k === 'shield') shields.add(ch.sh);
    else { seats.add(ch.t); if (k === 'attack') for (const sh of S.players[ch.t].shields) shields.add(sh.card.uid); }
  }
  return { seats, shields };
}
function aimLabel(ch) { if (!ch) return ''; if (ch.sh != null) { const f = findShield(S, ch.sh); return f ? `${f.sh.card.name}` : ''; } return objOf(ch.t); }
function syncTargets() {
  const c = (isMyTurn() || humanPending()) ? selCard() : null, A = aimable(c), cur = c && chosenAim(c);
  for (const el of $$('#opps .seat, #me .seat')) { const pid = +el.dataset.pid, t = A.seats.has(pid); el.classList.toggle('targetable', t); el.classList.toggle('hot', t && cur && cur.t === pid && cur.sh == null); }
  for (const el of $$('.shc')) { const u = +el.dataset.sh, t = A.shields.has(u); el.classList.toggle('targetable', t); el.classList.toggle('hot', t && cur && cur.sh === u); }
}

/* ── the stage, the action bar and the result tags ── */
function renderStage() {
  const c = selCard(), L = UI.last, sc = $('#stage-card');
  let html = '', cap = '', pop = false;
  if (c && (isMyTurn() || humanPending())) {
    html = `<div class="stage-fit">${cardHTML(c, { size: 'lg' })}</div>`;
    const t = chosenAim(c), k = aimOf(c);
    cap = humanPending() ? `Stolen from ${objOf(S.pending.from)}: ${boardAim(c) && !t ? (k === 'shield' ? 'choose a shield' : 'choose a target') : 'play it now'}`
      : boardAim(c) && !t ? (k === 'shield' ? 'Choose a shield in front of an opponent' : k === 'attack' ? 'Choose an opponent, or one of their shields' : 'Choose an opponent')
      : t ? `On ${aimLabel(t)}` : 'Press Play to use it';
  } else if (L) {
    html = `<div class="stage-fit">${cardHTML(L.card, { size: 'lg' })}</div>`;
    cap = `${nameOf(L.pid)} ${L.pid === 0 ? 'played' : 'plays'} ${L.card.name}${L.stolen ? ` (stolen from ${objOf(L.from)})` : ''}${L.t ? ' on ' + aimLabel(L.t) : ''}`;
    pop = L.fresh; L.fresh = false;
  }
  const changed = put(sc, html), h = $('#stage').clientHeight;
  if (changed || +sc.dataset.h !== h) { fitStage(); sc.dataset.h = h; }
  if (changed && pop && sc.querySelector('.card')) sc.querySelector('.card').classList.add('pop');
  const ce = $('#stage-caption'); if (ce.textContent !== cap) ce.textContent = cap;
}
function stageScale() { const st = $('#stage'); const h = mobile() ? (document.documentElement.classList.contains('land') ? 166 : 212) : 302; return Math.max(0.42, Math.min(1, (st.clientHeight - 40) / h)); }
function fitStage() { const f = $('#stage-card .stage-fit'), sc = $('#stage-card'); if (!f) { sc.style.height = ''; return; } const s = stageScale(); f.style.transform = `scale(${s})`; sc.style.height = Math.round(f.firstElementChild.offsetHeight * s) + 'px'; }
function renderAction() { put('#prompt', actionHTML()); }
function actionHTML() {
  if (S.winner != null) return '';
  if (S.turn !== 0) return `<span class="hint">${esc(nameOf(S.turn))} is playing…</span>`;
  if (UI.busy) return '';
  const pd = humanPending(), c = selCard();
  if (DRAG.on) return `<span class="hint">${boardAim(c) ? 'Drop it on a target' : 'Drop it in the ring to play it'}</span>`;
  if (!c) return `<span class="hint">${S.plays > 1 ? `Your turn: play ${S.plays} cards` : mobile() ? 'Your turn: tap a card to choose it' : 'Your turn: click a card, or drag it into the ring'}</span>`;
  const land = document.documentElement.classList.contains('land'), t = chosenAim(c), need = boardAim(c) && !t;
  const label = need ? (land ? 'Pick a target' : 'Choose a target') : t ? `${land ? 'On' : 'Play on'} ${aimLabel(t)}` : land ? 'Play' : `Play ${c.name}`;
  return `<button class="icon-btn info" data-act="card-info" aria-label="Card details" data-tip="Card details (I)">${ICON.info}</button>${pd ? '' : '<button class="btn ghost small" data-act="cancel-sel">Cancel</button>'}<button class="btn" data-act="play-sel"${need ? ' disabled' : ''}>${esc(label)}</button>`;
}
function renderPreview() {
  const want = {}, c = selCard();
  if (c && (isMyTurn() || humanPending())) {
    const t = chosenAim(c), pd = humanPending();
    const ch = boardAim(c) ? t : aimOf(c) === 'discard' ? null : null;
    const pv = boardAim(c) && !t ? null : aimOf(c) === 'discard' && S.players[0].discard.length ? null : previewPlay(S, 0, c.uid, ch, !!pd);
    if (pv) pv.players.forEach((d, i) => {
      const out = [];
      if (d.dies) out.push(['ko', 'Knocked out']);
      if (d.hp) out.push([d.hp < 0 ? 'dmg' : 'heal', `${d.hp > 0 ? '+' : ''}${d.hp} HP`]);
      if (d.shield) out.push(['shield', `shield ${d.shield > 0 ? '+' : '−'}${Math.abs(d.shield)}`]);
      if (d.lost) out.push(['shield', `${d.lost} shield${d.lost > 1 ? 's' : ''} gone`]);
      if (d.vanish) out.push(['info', 'Vanished']);
      if (d.steal) out.push(['info', 'Steals a card']);
      const hand = i === 0 && !pd ? d.hand + 1 : d.hand;
      if (hand) out.push(['cards', `${hand > 0 ? '+' : ''}${hand} card${Math.abs(hand) > 1 ? 's' : ''}`]);
      want[i] = out.map(([k, txt]) => `<span class="chip ${k}">${txt}</span>`).join('');
    });
  }
  for (const el of $$('.seat .chips')) put(el, want[el.parentElement.dataset.pid] || '');
}
function renderChronicle() {
  put('#chronicle', `<h3>Battle log</h3><ul class="log">${S.log.slice(-80).reverse().map(e => { const t = logLine(e); return t ? `<li class="${e.k === 'turn' && e.pid === 0 ? 'r' : ''}">${t}</li>` : ''; }).join('')}</ul>`);
}
function logLine(e) {
  switch (e.k) {
    case 'play': return `${esc(nameOf(e.pid))} played <b>${esc(e.card)}</b>${e.from != null ? ` (stolen from ${esc(objOf(e.from))})` : ''}${e.t != null ? ' on ' + esc(objOf(e.t)) : ''}`;
    case 'out': return `<b>${esc(nameOf(e.pid))}</b> ${e.pid === 0 ? 'were' : 'was'} knocked out${e.by != null && e.by !== e.pid ? ` by ${esc(objOf(e.by))}` : ''}`;
    case 'reshuffle': return `${esc(nameOf(e.pid))} shuffled ${e.pid === 0 ? 'your' : 'their'} discard pile into a new deck`;
    case 'turn': return e.pid === 0 ? `Round ${e.round}: your turn` : '';
  }
  return '';
}
function renderMatch() {
  if (!S) return;
  renderTopbar();
  const opps = S.players.slice(1), o = $('#opps'), cls = 'n' + opps.length;
  if (o.className !== cls) o.className = cls;
  const mini = mobile() && (opps.length > 1 || document.documentElement.classList.contains('land'));
  put(o, opps.map(P => seatHTML(P, false, mini)).join(''));
  put('#me', seatHTML(S.players[0], true, false));
  renderSelection();
  if (UI.drawer) renderChronicle();
}
function renderSelection() { if (!S) return; renderHand(); renderStage(); renderAction(); renderPreview(); syncTargets(); }

/* ── tooltips: with a mouse after a short rest on the same thing; on touch a press-and-hold ── */
const TIP = { el: null, timer: null, over: null, press: null };
function showTip(el) {
  if (DRAG.on || !el.isConnected) return;
  const t = $('#tip'); t.innerHTML = esc(el.dataset.tip); t.classList.remove('hidden');
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
  if (el && !el.closest('#hand')) { TIP.press = { x: e.clientX, y: e.clientY }; TIP.timer = setTimeout(() => showTip(el), 450); }
});
document.addEventListener('pointermove', e => { if (TIP.press && Math.hypot(e.clientX - TIP.press.x, e.clientY - TIP.press.y) > 10) { clearTimeout(TIP.timer); TIP.press = null; } }, { passive: true });
document.addEventListener('pointerup', () => { clearTimeout(TIP.timer); TIP.press = null; if (TIP.el && !FINE.matches) setTimeout(hideTip, 1600); });
document.addEventListener('pointercancel', () => { clearTimeout(TIP.timer); TIP.press = null; });
document.addEventListener('scroll', hideTip, true);
