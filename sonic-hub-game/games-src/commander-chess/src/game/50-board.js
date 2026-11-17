/* ── The board on the page: laying it out, moving the counters, showing where they may go ── */
const $ = s => document.querySelector(s), sleep = ms => new Promise(r => setTimeout(r, ms));
const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/** flip: the sheet is turned so that Blue sits at the bottom. pcs: the counter (or stack) standing on each point. */
const V = { flip: false, L: {}, pcs: new Map() };
const xy = s => { const f = fileOf(s), r = rankOf(s); return V.flip ? [PAD + (10 - f) * U, PAD + (r - 1) * U] : [PAD + f * U, PAD + (12 - r) * U]; };
const setAt = (el, p, extra = '') => el.setAttribute('transform', `translate(${f1(p[0])} ${f1(p[1])})${extra}`);

function buildBoard(flip) {
  V.flip = !!flip; V.pcs.clear();
  const b = $('#board'); b.setAttribute('viewBox', `0 0 ${BW} ${BH}`); b.replaceChildren();
  for (const name of ['sheet', 'trace', 'zones', 'under', 'pieces', 'over', 'fx']) b.appendChild(V.L[name] = svgEl('g', { class: 'l-' + name }));
  V.L.sheet.innerHTML = boardSheet(xy, V.flip);
}
const stackOf = (S, ids) => ids.map(p => [S.kind[p], S.hero[p]]);
function makeStack(S, ids) {
  const el = svgEl('g', { class: 'pc s' + S.own[ids[0]] }, stackArt(stackOf(S, ids), S.own[ids[0]]));
  el.ids = ids.slice(); return el;
}
/** pieces lower on the screen lie over the ones above them */
function restack() { [...V.pcs.entries()].sort((a, b) => xy(a[0])[1] - xy(b[0])[1]).forEach(([, el]) => V.L.pieces.appendChild(el)); }
function drawPoint(S, s) {
  const old = V.pcs.get(s); if (old) { old.remove(); V.pcs.delete(s); }
  const ids = members(S, s); if (!ids.length) return null;
  const el = makeStack(S, ids); setAt(el, xy(s)); V.pcs.set(s, el); V.L.pieces.appendChild(el);
  return el;
}
/** the board as position S has it, with nothing moving */
function placeAll(S) {
  V.pcs.clear(); V.L.pieces.replaceChildren(); V.L.fx.replaceChildren();
  for (let s = 0; s < NSQ; s++) if (S.top[s] >= 0) drawPoint(S, s);
  restack();
}
/** where the last move went from and to */
function trace(from, to) {
  if (from < 0) { V.L.trace.replaceChildren(); return; }
  const a = xy(from), b = xy(to);
  V.L.trace.innerHTML = `<circle class="tr" cx="${a[0]}" cy="${a[1]}" r="27"/>` + (to !== from ? `<circle class="tr to" cx="${b[0]}" cy="${b[1]}" r="30"/>` : '');
}

/* ── movement ── */
const easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
function tween(ms, step) {
  if (REDUCED) { step(1); return Promise.resolve(); }
  return new Promise(res => { const t0 = performance.now(); const frame = now => { const t = Math.min(1, Math.max(0, (now - t0) / ms)); step(t); if (t < 1) requestAnimationFrame(frame); else res(); }; requestAnimationFrame(frame); });
}
function burst(p, big) {
  if (REDUCED) return;
  const g = svgEl('g', { class: 'burst' + (big ? ' big' : '') });
  g.innerHTML = `<circle cx="${p[0]}" cy="${p[1]}" r="14"/>` + [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i * Math.PI / 4 + 0.3; return `<path d="M${f1(p[0] + Math.cos(a) * 12)} ${f1(p[1] + Math.sin(a) * 12)}L${f1(p[0] + Math.cos(a) * 34)} ${f1(p[1] + Math.sin(a) * 34)}"/>`; }).join('');
  V.L.fx.appendChild(g); setTimeout(() => g.remove(), 620);
}
/** Shows what a move did. S is the position after it; log is what the rules wrote down while playing it. */
async function showLog(S, log) {
  for (const ev of log) {
    if (ev.what === 'move') {
      const a = xy(ev.from), b = xy(ev.to), old = V.pcs.get(ev.from), victim = V.pcs.get(ev.to);
      const stays = ev.mode === STAY, air = S.kind[ev.actor] === AIR, dist = Math.hypot(b[0] - a[0], b[1] - a[1]) / U;
      if (stays) {                                            // a shot: something goes from the piece to its target
        SFX.play(air ? 'strike' : 'gun');
        const shot = svgEl('circle', { class: 'shot', r: 5 }); V.L.fx.appendChild(shot);
        await tween(140 + dist * 40, t => { const p = mix(a, b, t); shot.setAttribute('cx', p[0]); shot.setAttribute('cy', p[1]); });
        shot.remove(); burst(b, true); SFX.play('boom'); if (victim) { victim.remove(); V.pcs.delete(ev.to); }
        await sleep(REDUCED ? 0 : 220);
        continue;
      }
      if (old) { old.remove(); V.pcs.delete(ev.from); }
      drawPoint(S, ev.from);                                  // whoever stays behind
      const mover = makeStack(S, ev.group); mover.classList.add('moving'); setAt(mover, a); V.L.fx.appendChild(mover);
      const end = ev.mode === INTERCEPT && ev.hit >= 0 ? xy(ev.hit) : b, lost = ev.mode === SUICIDE || ev.mode === INTERCEPT;
      SFX.play(air ? 'fly' : S.kind[ev.actor] === NAVY ? 'sail' : 'step');
      await tween(170 + dist * (air ? 55 : 80), t => { const k = easeIO(t), lift = air ? 1 + Math.sin(Math.PI * k) * 0.16 : 1; setAt(mover, mix(a, end, k), lift !== 1 ? ` scale(${f1(lift * 100) / 100})` : ''); });
      mover.remove();
      if (ev.mode === CAPTURE || ev.mode === SUICIDE) { burst(b, true); SFX.play('boom'); if (victim) { victim.remove(); V.pcs.delete(ev.to); } }
      if (ev.mode === INTERCEPT) { burst(end, true); SFX.play('boom'); }
      if (ev.mode === COMBINE) SFX.play('mount');
      if (!lost || ev.mode === SUICIDE) drawPoint(S, ev.to);
      restack(); trace(ev.from, ev.to);
      if (ev.mode !== MOVE) await sleep(REDUCED ? 0 : 160);
    } else if (ev.what === 'hero') {
      const s = S.at[ev.piece]; if (s >= 0) { const el = drawPoint(S, s); if (el) el.classList.add('risen'); restack(); SFX.play('hero'); await sleep(REDUCED ? 0 : 420); }
    }
  }
}

/* ── where a piece may go ── */
/** Marks the points the chosen pieces can reach. byTo: point → the moves that end there. */
function showTargets(S, from, byTo) {
  let under = '', over = '';
  const p0 = xy(from); under += `<circle class="t-sel" cx="${p0[0]}" cy="${p0[1]}" r="31"/>`;
  for (const [to, list] of byTo) {
    const [x, y] = xy(to), modes = list.map(mMode), open = `<g class="tg" data-to="${to}">`;
    if (modes.includes(MOVE)) under += `${open}<circle class="t-hit" cx="${x}" cy="${y}" r="30"/><circle class="t-dot" cx="${x}" cy="${y}" r="8"/></g>`;
    else if (modes.includes(COMBINE)) over += `${open}<circle class="t-hit" cx="${x}" cy="${y}" r="30"/><circle class="t-join" cx="${x}" cy="${y}" r="31"/><path class="t-plus" d="M${x + 16} ${y - 28}h12M${x + 22} ${y - 34}v12"/></g>`;
    else if (modes.includes(CAPTURE) || modes.includes(STAY)) over += `${open}<circle class="t-hit" cx="${x}" cy="${y}" r="30"/><circle class="t-take" cx="${x}" cy="${y}" r="31"/>` +
      (modes.includes(STAY) ? `<path class="t-cross" d="M${x - 40} ${y}h13M${x + 27} ${y}h13M${x} ${y - 40}v13M${x} ${y + 27}v13"/>` : '') + '</g>';
    else if (modes.includes(SUICIDE)) over += `${open}<circle class="t-hit" cx="${x}" cy="${y}" r="30"/><circle class="t-take trade" cx="${x}" cy="${y}" r="31"/><path class="t-x" d="M${x + 15} ${y - 33}l12 12m0 -12l-12 12"/></g>`;
    else over += `${open}<circle class="t-hit" cx="${x}" cy="${y}" r="30"/><circle class="t-doomed" cx="${x}" cy="${y}" r="31"/></g>`;
  }
  V.L.under.innerHTML = under; V.L.over.innerHTML = over;
  for (const [s, el] of V.pcs) el.classList.toggle('sel', s === from);
}
function clearTargets() { V.L.under.replaceChildren(); V.L.over.replaceChildren(); V.L.zones.replaceChildren(); for (const el of V.pcs.values()) el.classList.remove('sel'); }
/** the reach of the other side's air defence, shown while a plane is being moved */
function showZones(S, side) {
  let g = '';
  for (let p = 0; p < S.n; p++) if (S.own[p] === side && S.at[p] >= 0 && S.car[p] < 0 && AD_R[S.kind[p]]) { const [x, y] = xy(S.at[p]); g += `<circle class="zone" cx="${x}" cy="${y}" r="${(AD_R[S.kind[p]] + S.hero[p]) * U + 14}"/>`; }
  V.L.zones.innerHTML = g;
}
function setHot(to) { for (const g of document.querySelectorAll('#board .tg')) g.classList.toggle('hot', +g.dataset.to === to); }
function boardPoint(ev) { const r = $('#board').getBoundingClientRect(); return [(ev.clientX - r.left) / r.width * BW, (ev.clientY - r.top) / r.height * BH]; }
/** the point under a pointer, or −1 */
function pointAt(ev) {
  const [x, y] = boardPoint(ev), c = Math.round((x - PAD) / U), r = Math.round((y - PAD) / U);
  if (c < 0 || c > 10 || r < 0 || r > 11 || Math.hypot(x - PAD - c * U, y - PAD - r * U) > U * 0.52) return -1;
  return V.flip ? sqOf(10 - c, r + 1) : sqOf(c, 12 - r);
}
function nudge(s) { const el = V.pcs.get(s); SFX.play('no'); if (!el || REDUCED) return; el.classList.remove('no'); el.getBoundingClientRect(); el.classList.add('no'); setTimeout(() => el.classList.remove('no'), 320); }
