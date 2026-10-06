/* ── Motion: every action travels across the table, from cause to effect ── */
const SPEEDS = { slow: { label: '½×', f: 1.6 }, normal: { label: '1×', f: 1 }, fast: { label: '2×', f: 0.5 }, instant: { label: 'Max', f: 0.08 } };
const SPEED_ORDER = ['normal', 'fast', 'instant', 'slow'];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const D = ms => Math.round(ms * SPEEDS[SET.speed].f * (REDUCED ? 0.25 : 1));
const wait = ms => new Promise(r => setTimeout(r, ms));
const mobile = () => document.documentElement.classList.contains('compact');
function updateMode() { const h = document.documentElement, compact = innerWidth <= 820 || innerHeight <= 520; h.classList.toggle('compact', compact); h.classList.toggle('land', compact && innerWidth > innerHeight); }
const buzz = ms => { if (SET.haptics && navigator.vibrate) navigator.vibrate(ms); };
function stageRect() {
  const s = $('#stage').getBoundingClientRect(), k = stageScale(), w = (mobile() ? 150 : 214) * k, h = (mobile() ? 212 : 302) * k;
  return { left: s.left + s.width / 2 - w / 2, top: s.top + s.height / 2 - h / 2 - 14, width: w, height: h };
}
async function flyCard(card, from, to, dur) {
  if (!from || !to || dur < 40) return;
  const box = document.createElement('div'); box.innerHTML = cardHTML(card, { size: 'lg' });
  const el = box.firstElementChild; Object.assign(el.style, { position: 'fixed', left: '0', top: '0', margin: '0' });
  $('#fx-layer').appendChild(el);
  const w = el.offsetWidth, h = el.offsetHeight, s0 = Math.max(0.25, Math.min(from.width / w, from.height / h)), s1 = Math.min(1, to.width / w, to.height / h);
  const p0 = `translate(${from.left + from.width / 2 - w / 2}px,${from.top + from.height / 2 - h / 2}px) scale(${s0}) rotate(-5deg)`;
  const p1 = `translate(${to.left + to.width / 2 - w / 2}px,${to.top + to.height / 2 - h / 2}px) scale(${s1}) rotate(0deg)`;
  SFX.play('whoosh');
  await el.animate([{ transform: p0, opacity: 0.85 }, { transform: p1, opacity: 1 }], { duration: dur, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }).finished.catch(() => {});
  el.remove();
}
function arrow(from, to, kind, dur) {
  if (!from || !to || dur < 40) return;
  const svg = $('#fx-arrows'), x1 = from.left + from.width / 2, y1 = from.top + from.height / 2, x2 = to.left + to.width / 2, y2 = to.top + to.height / 2;
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', `M${x1} ${y1} Q${(x1 + x2) / 2 + (x2 > x1 ? -40 : 40)} ${Math.min(y1, y2) - 70} ${x2} ${y2}`);
  p.setAttribute('class', 'arrow ' + kind); svg.appendChild(p);
  const len = p.getTotalLength(); p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
  p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: dur, easing: 'ease-out', fill: 'forwards' });
  setTimeout(() => p.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).finished.then(() => p.remove()), dur + D(450));
}
let aimPath = null;
function aim(from, x, y) {
  if (!from) return clearAim();
  if (!aimPath) { aimPath = document.createElementNS('http://www.w3.org/2000/svg', 'path'); aimPath.setAttribute('class', 'arrow aim'); $('#fx-arrows').appendChild(aimPath); }
  const x1 = from.left + from.width / 2, y1 = from.top + 10;
  aimPath.setAttribute('d', `M${x1} ${y1} Q${(x1 + x) / 2} ${Math.min(y1, y) - 80} ${x} ${y}`);
}
function clearAim() { if (aimPath) { aimPath.remove(); aimPath = null; } }
const FX_TEXT = {
  hp: f => (f.n < 0 ? ['−' + -f.n, 'dmg'] : ['+' + f.n, 'heal']), wall: f => [`−${f.n} wall`, 'wall'], razed: f => [`${f.name} falls`, 'wall'],
  camel: () => ['Camels block!', 'info'], immune: () => ['Divine Wind!', 'info'], shroud: () => ['Mantle −1', 'info'], trap: () => ['Stakes!', 'dmg'],
  thorns: () => ['Spikes!', 'dmg'], steal: () => ['Card stolen', 'info'], convert: f => [`Lost ${f.name}`, 'info'], gold: f => [`+${f.n} gold`, 'gold'],
  out: () => ['Defeated', 'dmg big'], hich: () => ['In danger: +2 cards', 'heal'], banner: () => ['Holy Banner!', 'heal'], wonderhit: f => [`Wonder ${f.left}`, 'wall'],
  discard: () => ['−1 card', 'info'], rained: () => ['Monsoon: no building', 'info'], age: () => ['Imperial Age!', 'gold big'], tribute: () => ['−1 gold', 'gold'],
};
function floatAt(pid, text, cls) {
  const box = document.querySelector(`#camp-${pid} .floats`); if (!box) return;
  const d = document.createElement('div'); d.className = 'float ' + cls; d.textContent = text; box.appendChild(d);
  setTimeout(() => d.remove(), 1600);
}
function setShownHP(pid) {
  const camp = document.getElementById('camp-' + pid); if (!camp || !UI.view) return;
  forget(camp.parentElement);
  const P = S.players[pid], hp = Math.max(0, UI.view[pid]), tag = camp.querySelector('.hptag'), bar = camp.querySelector('.hpbar i');
  if (tag) { tag.querySelector('b').textContent = hp; tag.classList.toggle('low', hp <= 3); }
  if (bar) bar.style.width = Math.max(0, Math.round(hp / P.maxHP * 100)) + '%';
}
function shake(pid) { const el = document.getElementById('camp-' + pid); if (el) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); } }
async function animatePlay(ev, pid, from, landed) {
  /* landed: the player dropped the card and it already glided onto the chart, so it does not fly again */
  if (!landed) await flyCard(ev.card, from, stageRect(), D(430));
  UI.last = { card: ev.card, pid, target: ev.target, fresh: !landed }; UI.sel = null; UI.hoverT = null;
  renderMatch(); if (landed) dropGhost();
  if (ev.card.wonder) banner(`${civNameOf(pid)} ${pid === 0 ? 'begin' : 'begins'} ${ev.card.name}`, pid === 0 ? 'Keep it standing for 3 turns to win' : 'Bring it down within 3 turns or they win', 2200);
  await wait(D(300));
  const src = $('#stage-card .card') ? $('#stage-card .card').getBoundingClientRect() : stageRect(), hit = new Set();
  for (const f of ev.fx) {
    const t = f.t, camp = document.getElementById('camp-' + t);
    if (camp && t !== pid && !hit.has(t) && ['hp', 'wall', 'razed', 'wonderhit', 'steal', 'discard', 'convert', 'camel', 'immune', 'shroud', 'tribute'].includes(f.k)) {
      hit.add(t); arrow(src, camp.getBoundingClientRect(), ['steal', 'discard', 'convert', 'tribute'].includes(f.k) ? 'steal' : ['razed', 'wonderhit'].includes(f.k) ? 'raze' : 'dmg', D(320)); await wait(D(260));
    }
    if (f.k === 'hp' && UI.view) { UI.view[t] = (UI.view[t] != null ? UI.view[t] : S.players[t].hp) + f.n; setShownHP(t); }
    const m = FX_TEXT[f.k]; if (m) { const [txt, cls] = m(f); floatAt(t, txt, cls); }
    if (f.k === 'hp') { SFX.play(f.n < 0 ? 'hit' : 'heal'); if (f.n < 0) { shake(t); if (t === 0) buzz(35); } }
    else if (['wall', 'razed', 'wonderhit'].includes(f.k)) SFX.play('wall');
    if (f.k === 'age') { SFX.play('crown'); banner(`${civNameOf(t)} ${t === 0 ? 'advance' : 'advances'} to the Imperial Age`, IMPERIAL[S.players[t].civ].bonus.text, 2300); }
    await wait(D(190));
  }
  UI.view = null; await wait(D(260));
  renderMatch();
}
async function animateBuy(card, pid, from) {
  const to = pid === 0 ? $('#hand').getBoundingClientRect() : document.getElementById('camp-' + pid)?.getBoundingClientRect();
  const dest = to && pid === 0 ? { left: to.left + to.width / 2 - 60, top: to.top + 30, width: 120, height: 170 } : to;
  await flyCard(card, from, dest, D(520));
  floatAt(pid, 'Hired ' + card.name, 'gold');
}
function banner(title, sub, dur = 1900) {
  const b = $('#banner'); b.innerHTML = `<div class="ribbon"><div class="bt">${esc(title)}</div>${sub ? `<div class="bs">${kw(sub)}</div>` : ''}</div>`;
  b.style.setProperty('--bdur', Math.max(900, D(dur)) + 'ms'); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
}
function openSheet(html, lock) { const s = $('#sheet'); s.innerHTML = `<div class="sheet-panel" role="dialog" aria-modal="true">${html}</div>`; s.classList.remove('hidden'); s.dataset.lock = lock ? '1' : ''; hideTip(); const f = s.querySelector('button'); if (f) f.focus({ preventScroll: true }); }
function closeSheet() { const s = $('#sheet'); s.classList.add('hidden'); s.innerHTML = ''; s.dataset.lock = ''; }

/* the herald: every new round stops the table and reads out its event before anything else happens */
function herald(round, eventId, nextId, note) {
  return new Promise(resolve => {
    const E = eventId ? EVENT_BY[eventId] : null, N = nextId ? EVENT_BY[nextId] : null;
    const el = document.createElement('div'); el.className = 'herald'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `Round ${round}`);
    el.innerHTML = `<div class="hscroll"><div class="hround">Round ${round}</div><svg class="hart" viewBox="0 0 48 48" aria-hidden="true">${EVENT_ART[E ? E.id : 'peace']}</svg>
<h2>${E ? esc(E.name) : 'A quiet start'}</h2><p class="heff">${E ? kw(E.text) : 'No event this round. Events begin next round.'}</p>${note ? `<p class="hnote">${kw(note)}</p>` : ''}
${N ? `<div class="hnext"><span>Next round</span><b>${esc(N.name)}</b><em>${kw(N.text)}</em></div>` : ''}<div class="htap">Tap to continue</div></div>`;
    document.getElementById('app').appendChild(el);
    SFX.play('quill');
    let done = false;
    const close = () => { if (done) return; done = true; el.classList.add('out'); setTimeout(() => { el.remove(); resolve(); }, 260); };
    el.addEventListener('click', close);
    setTimeout(close, Math.max(1400, D(2600)));
  });
}
