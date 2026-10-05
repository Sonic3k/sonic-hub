/* ── Rendering ── */
const $ = s => document.querySelector(s);
const civName = pid => (pid === 0 ? 'Bạn' : CIVS[S.players[pid].civ].name);
const civObj = pid => (pid === 0 ? 'bạn' : CIVS[S.players[pid].civ].name);
function cardHTML(card, o = {}) {
  const civ = card.civ === 'merc' ? null : CIVS[card.civ];
  const cls = ['card', card.unique ? 'unique' : '', card.civ === 'merc' ? 'merc' : '', o.cls || ''].join(' ');
  const syms = [...card.icons].map(ch => symBadge(ch, o.small ? 22 : 28)).join('');
  return `<div class="${cls}" data-uid="${card.uid || ''}" ${o.attrs || ''} style="--civ:${civ ? civ.color : '#6b5a3a'}">
    <div class="c-head">${civ ? crest(card.civ, 18) : mercCrest(18)}<span class="c-name">${esc(card.name)}</span></div>
    <div class="c-syms">${syms}</div>
    <div class="c-text">${esc(cardText(card))}</div>
    ${o.cost != null ? `<div class="c-cost${o.afford ? ' ok' : ''}">${o.cost} vàng</div>` : ''}${card.unique ? '<div class="c-star" title="Lá riêng của văn minh">★</div>' : ''}
  </div>`;
}
function structHTML(st) {
  if (st.kind === 'wonder') return `<div class="st wonder" title="${esc(cardText(st.card))}"><b>${st.dur}</b><span>${esc(st.card.name.replace('Kỳ quan ', ''))}</span><i>còn ${Math.max(0, 3 - st.age)} lượt</i></div>`;
  const tag = { regen: 'tự hồi', sacred: 'hồi máu', thorns: 'có gai', fortress: 'đá khổng lồ' }[st.kind] || '';
  return `<div class="st" title="${esc(st.card.name)}${tag ? ' (' + tag + ')' : ''}">${symBadge('W', 16)}<b>${st.dur}</b><span>${esc(st.card.name)}</span>${tag ? `<i>${tag}</i>` : ''}</div>`;
}
function tokensHTML(P) {
  const t = [];
  if (P.tokens.camel) t.push(`<span class="tok" title="Đòn kỵ binh kế tiếp nhắm vào đây bị hủy">${symBadge('L', 16)} chốt lạc đà${P.tokens.camel > 1 ? ' ×' + P.tokens.camel : ''}</span>`);
  if (P.tokens.immune) t.push('<span class="tok hot" title="Mọi đòn vô hiệu tới lượt sau">Bão thần</span>');
  if (P.tokens.trap) t.push('<span class="tok hot" title="Kẻ đầu tiên gây sát thương mất 2 máu">Cọc Bạch Đằng</span>');
  return t.join('');
}
function seatHTML(P, me) {
  const C = CIVS[P.civ], turn = S.turn === P.id && S.winner == null;
  const tgt = UI.targeting && !me && P.alive ? ' targetable' : '';
  const hpPct = Math.max(0, P.hp / P.maxHP * 100);
  const backs = me ? '' : `<span class="backs" title="${P.hand.length} lá trên tay">${'<i></i>'.repeat(Math.min(P.hand.length, 8))}<em>${P.hand.length}</em></span>`;
  return `<div class="seat${me ? ' me' : ''}${turn ? ' turn' : ''}${P.alive ? '' : ' out'}${tgt}" id="seat-${P.id}" data-pid="${P.id}" style="--civ:${C.color}">
    <div class="s-top">${crest(P.civ, me ? 46 : 40)}
      <div class="s-id"><div class="s-name">${me ? 'Bạn · ' : ''}${esc(C.name)}</div><div class="s-sub">${P.relic ? esc(RELICS[P.relic].name) : ''}</div></div>
      <div class="s-hp" title="Máu"><b>${P.hp}</b><small>/${P.maxHP}</small><div class="hpbar"><div style="width:${hpPct}%"></div></div></div>
    </div>
    <div class="s-row"><span class="gold" title="Vàng">${symBadge('G', 18)}<b>${P.gold}</b></span>${backs}${tokensHTML(P)}${turn ? '<span class="turn-tag">đang đi</span>' : ''}${P.alive ? '' : '<span class="out-tag">bại trận</span>'}</div>
    <div class="s-structs">${P.structs.map(structHTML).join('') || '<span class="none">Chưa có công trình</span>'}</div>
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
  $('#events').innerHTML = `<div class="ev-now"><small>Thời cuộc · vòng ${S.round}</small><b>${E ? esc(E.name) : 'Thái bình'}</b><p>${E ? esc(E.text) : 'Chưa có biến cố nào.'}</p></div>
    <div class="ev-next"><small>Vòng sau</small><b>${esc(N.name)}</b><p>${esc(N.text)}</p></div>${S.round >= 14 ? `<div class="ev-warn">${S.round >= 16 ? 'Chiến tranh kéo dài: mỗi vòng mọi người mất 1 máu' : 'Từ vòng 16, mỗi vòng mọi người mất 1 máu'}</div>` : ''}`;
  const lp = UI.last;
  $('#arena').innerHTML = lp ? `<div class="played-by">${esc(civName(lp.pid))} ${lp.target != null ? '▸ ' + esc(civObj(lp.target)) : ''}</div>${cardHTML(lp.card, { cls: 'big pop' })}` : `<div class="arena-hint">${S.turn === 0 ? 'Chọn một lá trên tay để đánh' : ''}</div>`;
  $('#market').innerHTML = `<h3>Chợ đánh thuê</h3><div class="m-cards">${S.market.map((c, i) => c ? cardHTML(c, { small: 1, cost: marketCost(S, me, c), afford: myTurn && !S.flags.bought && me.gold >= marketCost(S, me, c), attrs: `data-mi="${i}"`, cls: myTurn && !S.flags.bought && me.gold >= marketCost(S, me, c) ? 'buyable' : '' }) : '<div class="card empty">Hết lính</div>').join('')}</div>
    <p class="m-note">${S.flags.bought && S.turn === 0 ? 'Đã thuê lính lượt này' : 'Mỗi lượt thuê 1 lá, vào thẳng tay bạn'}${S.mod.fair ? ' · Hội chợ: rẻ hơn 1' : ''}${S.flags.buyFree && S.turn === 0 ? ' · Lần thuê này miễn phí' : ''}</p>`;
  $('#hand').innerHTML = me.hand.map(c => cardHTML(c, { cls: myTurn ? 'playable' + (UI.targeting === c.uid ? ' chosen' : '') : '' })).join('') || '<div class="hand-empty">Hết bài trên tay</div>';
  const mini = `<span class="me-mini">Máu ${me.hp}/${me.maxHP} · ${me.gold} vàng${walls(me).length ? ' · tường ' + wallTotal(me) : ''}</span>`;
  $('#status').innerHTML = mini + (S.winner != null ? '' : UI.targeting ? 'Chọn đối thủ để nhắm <button class="btn ghost" id="cancelTarget">Hủy</button>' : myTurn ? `Lượt của bạn${S.plays > 1 ? ` · còn ${S.plays} lượt đánh` : ''}` : `Lượt của ${esc(civName(S.turn))}…`);
  $('#chron').innerHTML = S.log.slice(-9).reverse().map(e => `<li>${logLine(e)}</li>`).join('');
}
function logLine(e) {
  switch (e.k) {
    case 'play': return `${esc(civName(e.pid))} đánh <b>${esc(e.card)}</b>${e.target != null ? ' vào ' + esc(civObj(e.target)) : ''}`;
    case 'buy': return `${esc(civName(e.pid))} thuê <b>${esc(e.card)}</b> (${e.cost} vàng)`;
    case 'event': return `Vòng ${e.round}: <b>${esc(EVENT_BY[e.id].name)}</b>`;
    case 'out': return `<b>${esc(civName(e.pid))}</b> bại trận`;
    case 'hich': return `${esc(civName(e.pid))} lâm nguy, rút thêm 2 lá`;
    case 'banner': return `Cờ thánh giúp ${esc(civObj(e.pid))} đứng dậy`;
    case 'fatigue': return `${esc(civName(e.pid))} xáo lại bộ bài, kiệt sức mất 1 máu`;
    case 'wonder': return `<b>${esc(civName(e.pid))}</b> hoàn thành ${esc(e.name)}`;
    case 'attrition': return 'Chiến tranh kéo dài, mọi người mất 1 máu';
  }
  return '';
}
const FX_TEXT = {
  hp: f => (f.n < 0 ? ['−' + -f.n, 'dmg'] : ['+' + f.n, 'heal']), wall: f => [`−${f.n} tường`, 'wall'], razed: f => [`Sập ${f.name}`, 'wall'],
  camel: () => ['Lạc đà chặn!', 'info'], immune: () => ['Bão thần chặn!', 'info'], shroud: () => ['Áo choàng −1', 'info'], trap: () => ['Trúng cọc!', 'dmg'],
  thorns: () => ['Gai đâm!', 'dmg'], steal: () => ['Bị cướp 1 lá', 'info'], convert: f => [`Mất ${f.name}`, 'info'], gold: f => [`+${f.n} vàng`, 'gold'],
  out: () => ['Bại trận!', 'dmg big'], hich: () => ['Lâm nguy: +2 lá', 'heal'], banner: () => ['Cờ thánh!', 'heal'], wonderhit: f => [`Kỳ quan còn ${f.left}`, 'wall'],
  discard: () => ['Mất 1 lá', 'info'], rained: () => ['Mưa: không dựng được', 'info'],
};
function floatText(pid, text, cls, delay) {
  setTimeout(() => {
    const box = document.querySelector(`#seat-${pid} .floats`); if (!box) return;
    const d = document.createElement('div'); d.className = 'float ' + cls; d.textContent = text; box.appendChild(d);
    setTimeout(() => d.remove(), 1700);
  }, delay);
}
function showFx(fx) {
  let t = 0, snd = new Set();
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
  const b = $('#banner'); b.innerHTML = `<b>${esc(text)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}`;
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
}
