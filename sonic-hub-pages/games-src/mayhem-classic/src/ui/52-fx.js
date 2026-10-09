/* ── Motion: every play travels from the card to what it touches ── */
const SPEEDS = { slow: { label: '½×', f: 1.6 }, normal: { label: '1×', f: 1 }, fast: { label: '2×', f: 0.5 }, instant: { label: 'Max', f: 0.08 } };
const SPEED_ORDER = ['normal', 'fast', 'instant', 'slow'];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const D = ms => Math.round(ms * SPEEDS[SET.speed].f * (REDUCED ? 0.25 : 1));
const wait = ms => new Promise(r => setTimeout(r, ms));
const mobile = () => document.documentElement.classList.contains('compact');
function updateMode() { const h = document.documentElement, compact = innerWidth <= 820 || innerHeight <= 520; h.classList.toggle('compact', compact); h.classList.toggle('land', compact && innerWidth > innerHeight); }
const buzz = ms => { if (SET.haptics && navigator.vibrate) navigator.vibrate(ms); };
function stageRect() {
  const s = $('#stage').getBoundingClientRect(), k = stageScale(), land = document.documentElement.classList.contains('land');
  const w = (mobile() ? (land ? 118 : 150) : 214) * k, h = (mobile() ? (land ? 166 : 212) : 302) * k;
  return { left: s.left + s.width / 2 - w / 2, top: s.top + s.height / 2 - h / 2 - 14, width: w, height: h };
}
const seatEl = pid => document.getElementById('seat-' + pid);
function seatRect(pid, sel) { const el = seatEl(pid); if (!el) return null; const sub = sel && el.querySelector(sel); return (sub || el).getBoundingClientRect(); }
async function flyCard(card, from, to, dur) {
  if (!from || !to || dur < 40) return;
  const box = document.createElement('div'); box.innerHTML = cardHTML(card, { size: 'lg' });
  const el = box.firstElementChild; Object.assign(el.style, { position: 'fixed', left: '0', top: '0', margin: '0' });
  $('#fx-layer').appendChild(el);
  const w = el.offsetWidth, h = el.offsetHeight, s0 = Math.max(0.2, Math.min(from.width / w, from.height / h)), s1 = Math.min(1, to.width / w, to.height / h);
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
  setTimeout(() => p.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).finished.then(() => p.remove()), dur + D(420));
}
let aimPath = null;
function aimLine(from, x, y) {
  if (!from) return clearAim();
  if (!aimPath) { aimPath = document.createElementNS('http://www.w3.org/2000/svg', 'path'); aimPath.setAttribute('class', 'arrow aim'); $('#fx-arrows').appendChild(aimPath); }
  const x1 = from.left + from.width / 2, y1 = from.top + 10;
  aimPath.setAttribute('d', `M${x1} ${y1} Q${(x1 + x) / 2} ${Math.min(y1, y) - 80} ${x} ${y}`);
}
function clearAim() { if (aimPath) { aimPath.remove(); aimPath = null; } }
function floatAt(pid, text, cls) {
  const box = document.querySelector(`#seat-${pid} .floats`); if (!box) return;
  const d = document.createElement('div'); d.className = 'float ' + cls; d.textContent = text; box.appendChild(d);
  setTimeout(() => d.remove(), 1600);
}
/* HP shown during an animation counts down hit by hit, written straight into the seat (the next full render takes over) */
function setShownHP(pid) {
  const el = seatEl(pid); if (!el || !UI.view) return;
  forget(el.parentElement);
  const P = S.players[pid], hp = Math.max(0, UI.view[pid]), heart = el.querySelector('.hpheart');
  if (heart) { heart.querySelector('b').textContent = hp; heart.classList.toggle('low', hp <= 3 && P.alive); }
  el.querySelectorAll('.hptrack i').forEach((i, k) => i.classList.toggle('on', k < hp));
}
function shake(pid) { const el = seatEl(pid); if (el) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); } }
function chipEl(uid) { return document.querySelector(`.shc[data-sh="${uid}"]`); }
function crackChip(uid, left) {
  const el = chipEl(uid); if (!el) return;
  const pips = el.querySelectorAll('.shc-pips svg'); pips.forEach((p, i) => p.classList.toggle('used', i >= left));
  el.classList.remove('cracked'); void el.offsetWidth; el.classList.add('cracked');
}
function breakChip(uid) { const el = chipEl(uid); if (el) el.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(10px) rotate(14deg) scale(.7)', opacity: 0 }], { duration: D(360), fill: 'forwards' }); }
function blastFx(rect) {
  const d = document.createElement('div'); d.className = 'blastfx';
  if (rect) { d.style.setProperty('--x', (rect.left + rect.width / 2) + 'px'); d.style.setProperty('--y', (rect.top + rect.height / 2) + 'px'); }
  $('#fx-layer').appendChild(d); setTimeout(() => d.remove(), 800);
}
/* a card changing hands shows face up with a tag saying what happened, then travels to where it goes */
async function moveScene(card, from, to, tag, kind) {
  if (D(500) < 120 || !from) return;
  const box = document.createElement('div'); box.className = 'mv';
  box.innerHTML = cardHTML(card, { size: 'lg' }) + `<span class="mv-tag ${kind || ''}">${esc(tag)}</span>`;
  Object.assign(box.style, { position: 'fixed', left: '0', top: '0' });
  $('#fx-layer').appendChild(box);
  const w = box.offsetWidth, h = box.offsetHeight, st = $('#stage').getBoundingClientRect();
  const showW = mobile() ? 118 : 150, s1 = showW / w;
  const fx = from.left + from.width / 2, fy = from.top + from.height / 2;
  let cx = fx + (st.left + st.width / 2 - fx) * 0.45, cy = fy + (st.top + st.height / 2 - fy) * 0.45;
  cx = Math.min(Math.max(cx, w * s1 / 2 + 8), innerWidth - w * s1 / 2 - 8); cy = Math.min(Math.max(cy, h * s1 / 2 + 30), innerHeight - h * s1 / 2 - 8);
  const at = (x, y, s, r = 0) => `translate(${(x - w / 2).toFixed(1)}px,${(y - h / 2).toFixed(1)}px) scale(${s.toFixed(3)}) rotate(${r}deg)`;
  const s0 = Math.max(0.15, Math.min(from.width / w, from.height / h));
  SFX.play('whoosh');
  await box.animate([{ transform: at(fx, fy, s0, -6), opacity: 0.3 }, { transform: at(cx, cy, s1), opacity: 1 }], { duration: D(280), easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }).finished.catch(() => {});
  await wait(D(560));
  const end = to ? at(to.left + to.width / 2, to.top + to.height / 2, Math.max(0.15, Math.min(to.width / w, to.height / h))) : at(cx, cy + 40, s1 * 0.8, 4);
  await box.animate([{ transform: at(cx, cy, s1), opacity: 1 }, { transform: end, opacity: to ? 0.95 : 0 }], { duration: D(380), easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).finished.catch(() => {});
  box.remove();
}
const MISS_TEXT = { target: 'No target', shield: 'No shield to hit', discard: 'Nothing to take back', deck: 'No card to steal' };
async function animatePlay(ev, pid, from, landed) {
  /* landed: the player dropped the card and it already glided into the ring */
  if (!landed) await flyCard(ev.card, from, ev.stolen ? null : stageRect(), D(420));
  const shieldsBefore = new Set($$('.shc').map(el => +el.dataset.sh));
  UI.last = { card: ev.card, pid, t: ev.ch && (ev.ch.t != null || ev.ch.sh != null) ? ev.ch : null, stolen: ev.stolen, from: ev.from, fresh: !landed };
  UI.sel = null; UI.aim = null;
  /* the seats stay as they were while the effects play on them; the hand, the ring and the bar update now */
  renderTopbar(); renderHand(); renderStage(); renderAction(); renderPreview(); syncTargets();
  if (landed) dropGhost();
  SFX.play(ev.card.power ? 'magic' : 'card');
  await wait(D(260));
  const src = () => ($('#stage-card .card') ? $('#stage-card .card').getBoundingClientRect() : stageRect());
  for (const f of ev.fx) {
    const t = f.t;
    switch (f.k) {
      case 'attack': { const ch = ev.ch, c = ch && ch.sh != null && chipEl(ch.sh); arrow(src(), c ? c.getBoundingClientRect() : seatRect(t), 'dmg', D(300)); await wait(D(240)); break; }
      case 'shield': crackChip(f.uid, f.left); floatAt(t, `shield −${f.n}`, 'shield'); SFX.play('shield'); break;
      case 'broken': breakChip(f.uid); floatAt(t, `${f.name} breaks`, 'shield'); SFX.play('break'); await wait(D(160)); break;
      case 'hp': if (UI.view) { UI.view[t] = (UI.view[t] != null ? UI.view[t] : S.players[t].hp) + f.n; setShownHP(t); } floatAt(t, '−' + -f.n, 'dmg'); shake(t); SFX.play('hit'); if (t === 0) buzz(35); break;
      case 'heal': if (UI.view) { UI.view[t] = Math.min(10, (UI.view[t] != null ? UI.view[t] : S.players[t].hp) + f.n); setShownHP(t); } floatAt(t, f.n ? '+' + f.n : 'full', 'heal'); if (f.n) SFX.play('heal'); break;
      case 'raise': SFX.play('raise'); break;
      case 'draw': if (f.n) { floatAt(t, `+${f.n} card${f.n > 1 ? 's' : ''}`, 'cards'); SFX.play('draw'); } break;
      case 'again': floatAt(t, f.n > 1 ? `play ${f.n} more` : 'play again', 'info'); break;
      case 'refill': floatAt(t, 'empty hand: +2', 'cards'); SFX.play('draw'); break;
      case 'roar': floatAt(t, 'new hand of 3', 'cards'); if (t === pid) SFX.play('roar'); await wait(D(120)); break;
      case 'blast': blastFx(src()); SFX.play('fire'); await wait(D(260)); break;
      case 'immune': floatAt(t, 'vanished: untouched', 'info'); break;
      case 'swap': {
        arrow(seatRect(f.by), seatRect(t), 'magic', D(320)); arrow(seatRect(t), seatRect(f.by), 'magic', D(320)); SFX.play('swap'); await wait(D(300));
        if (UI.view) { UI.view[f.by] = f.to; UI.view[t] = f.from; setShownHP(f.by); setShownHP(t); }
        floatAt(f.by, 'HP swapped', 'info'); floatAt(t, 'HP swapped', 'info'); break;
      }
      case 'charm': { const r = chipEl(f.uid) ? chipEl(f.uid).getBoundingClientRect() : seatRect(t); arrow(r, seatRect(f.by), 'magic', D(320)); breakChip(f.uid); floatAt(t, 'shield taken', 'info'); SFX.play('magic'); await wait(D(300)); break; }
      case 'recall': await moveScene(f.card, seatRect(t, '.pile:last-child, .stash'), t === 0 ? $('#hand').getBoundingClientRect() : seatRect(t, '.backs'), 'Back to hand', 'recall'); break;
      case 'vanish': floatAt(t, 'Vanished!', 'info big'); SFX.play('vanish'); break;
      case 'steal': SFX.play('steal'); await moveScene(f.card, seatRect(t, '.stash'), stageRect(), `Stolen from ${objOf(t)}`, ''); break;
      case 'miss': floatAt(t, MISS_TEXT[f.why] || 'No effect', 'info'); SFX.play('bad'); break;
      case 'out': floatAt(t, 'Knocked out!', 'dmg big'); await wait(D(300)); banner(t === 0 ? 'You are knocked out' : `${nameOf(t)} is knocked out`, '', 1500); break;
    }
    await wait(D(170));
  }
  UI.view = null; await wait(D(220));
  renderMatch();
  for (const el of $$('.shc')) if (!shieldsBefore.has(+el.dataset.sh)) { el.classList.remove('fresh'); void el.offsetWidth; el.classList.add('fresh'); }
}
function banner(title, sub, dur = 1900) {
  const b = $('#banner'); b.innerHTML = `<div class="ribbon"><div class="bt">${esc(title)}</div>${sub ? `<div class="bs">${sub}</div>` : ''}</div>`;
  b.style.setProperty('--bdur', Math.max(900, D(dur)) + 'ms'); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
}
function openSheet(html, lock) { const s = $('#sheet'); s.innerHTML = `<div class="sheet-panel" role="dialog" aria-modal="true">${html}</div>`; s.classList.remove('hidden'); s.dataset.lock = lock ? '1' : ''; hideTip(); const f = s.querySelector('button'); if (f) f.focus({ preventScroll: true }); }
function closeSheet() { const s = $('#sheet'); s.classList.add('hidden'); s.innerHTML = ''; s.dataset.lock = ''; }
