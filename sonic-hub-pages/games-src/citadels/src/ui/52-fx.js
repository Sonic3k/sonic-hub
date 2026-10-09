/* ── Motion: every event is played on the table, one at a time, with gold, cards and the crown travelling between seats ── */
const SPEEDS = { slow: { label: '½×', f: 1.6 }, normal: { label: '1×', f: 1 }, fast: { label: '2×', f: 0.5 }, instant: { label: 'Max', f: 0.08 } };
const SPEED_ORDER = ['normal', 'fast', 'instant', 'slow'];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const D = ms => Math.round(ms * SPEEDS[SET.speed].f * (REDUCED ? 0.25 : 1));
const wait = ms => new Promise(r => setTimeout(r, ms));
const mobile = () => document.documentElement.classList.contains('compact');
function updateMode() { const h = document.documentElement, compact = innerWidth <= 820 || innerHeight <= 520; h.classList.toggle('compact', compact); h.classList.toggle('land', compact && innerWidth > innerHeight); }
const buzz = ms => { if (SET.haptics && navigator.vibrate) navigator.vibrate(ms); };

/* ── where things are ── */
const seatEl = pid => document.getElementById('seat-' + pid);
const rectOf = el => (el ? el.getBoundingClientRect() : null);
const seatRect = pid => rectOf(seatEl(pid));
function statRect(pid, k) { const el = seatEl(pid); return rectOf((el && el.querySelector('.stats .' + k)) || el); }
function cityRect(pid) { return pid === 0 ? rectOf($('#me .mycity')) || seatRect(0) : rectOf(seatEl(pid) && seatEl(pid).querySelector('.city-mini')) || seatRect(pid); }
const medRect = c => rectOf(document.querySelector(`#track .med[data-char="${c}"] .disc`));
function stageRect() { const r = $('#stage').getBoundingClientRect(); return { left: r.left + r.width / 2 - 30, top: r.top + r.height / 2 - 40, width: 60, height: 80 }; }
function handRect(pid) { return pid === 0 ? rectOf($('#hand')) : statRect(pid, 'h'); }
function tileRect(pid, uid) { const el = pid === 0 ? document.querySelector(`#me [data-city="${uid}"]`) : document.querySelector(`#seat-${pid} .mt[data-uid="${uid}"]`); return rectOf(el) || cityRect(pid); }

/* ── small things that travel: coins, card backs, the crown, a purse ── */
async function flyTokens(kind, from, to, n = 1, o = {}) {
  if (!from || !to || n <= 0 || D(400) < 60) return;
  const k = Math.min(n, o.max || 6), layer = $('#fx-layer'), els = [];
  const w = kind === 'back' ? 26 : o.big ? 52 : 28, h = kind === 'back' ? 36 : w;
  for (let i = 0; i < k; i++) {
    const el = document.createElement('div');
    el.className = 'token' + (kind === 'back' ? ' back' : '') + (o.big ? ' big' : '');
    el.innerHTML = kind === 'back' ? backHTML() : ICONS[kind];
    layer.appendChild(el); els.push(el);
  }
  const runs = els.map((el, i) => {
    const x0 = from.left + from.width / 2 - w / 2 + (i - (k - 1) / 2) * 7, y0 = from.top + from.height / 2 - h / 2;
    const x1 = to.left + to.width / 2 - w / 2, y1 = to.top + to.height / 2 - h / 2;
    const mx = (x0 + x1) / 2 + (i % 2 ? 18 : -18), my = Math.min(y0, y1) - 36 - (i % 3) * 10;
    return el.animate([
      { transform: `translate(${x0}px,${y0}px) scale(.55)`, opacity: 0 },
      { transform: `translate(${mx}px,${my}px) scale(1.12)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${x1}px,${y1}px) scale(.8)`, opacity: 0.85 }],
      { duration: D(o.dur || 560), delay: i * D(70), easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'both' }).finished.catch(() => {});
  });
  await Promise.all(runs);
  for (const el of els) el.remove();
}
/* a card shown face up: it comes from where it was, stops in the middle of the square with a tag, then goes where it ends */
async function showCard(html, from, to, tag, kind, hold = 620) {
  if (D(500) < 120) return;
  const box = document.createElement('div'); box.className = 'mv';
  box.innerHTML = html + (tag ? `<span class="mv-tag ${kind || ''}">${tag}</span>` : '');
  Object.assign(box.style, { position: 'fixed', left: '0', top: '0' });
  $('#fx-layer').appendChild(box);
  const w = box.offsetWidth, h = box.offsetHeight, st = $('#stage').getBoundingClientRect();
  const showW = mobile() ? 116 : 150, s1 = showW / w;
  const cx = st.left + st.width / 2, cy = Math.min(Math.max(st.top + st.height / 2, h * s1 / 2 + 40), innerHeight - h * s1 / 2 - 8);
  const at = (x, y, s, r = 0) => `translate(${(x - w / 2).toFixed(1)}px,${(y - h / 2).toFixed(1)}px) scale(${s.toFixed(3)}) rotate(${r}deg)`;
  const f = from || { left: cx - 10, top: cy - 10, width: 20, height: 20 }, fx = f.left + f.width / 2, fy = f.top + f.height / 2, s0 = Math.max(0.12, Math.min(f.width / w, f.height / h));
  SFX.play('whoosh');
  await box.animate([{ transform: at(fx, fy, s0, -5), opacity: 0.3 }, { transform: at(cx, cy, s1), opacity: 1 }], { duration: D(300), easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }).finished.catch(() => {});
  await wait(D(hold));
  const end = to ? at(to.left + to.width / 2, to.top + to.height / 2, Math.max(0.1, Math.min(to.width / w, to.height / h, 0.5))) : at(cx, cy + 30, s1 * 0.8, 4);
  await box.animate([{ transform: at(cx, cy, s1), opacity: 1 }, { transform: end, opacity: to ? 0.9 : 0 }], { duration: D(360), easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).finished.catch(() => {});
  box.remove();
}
function floatAt(pid, html, cls) {
  const box = document.querySelector(`#seat-${pid} .floats`); if (!box || D(300) < 60) return;
  const d = document.createElement('div'); d.className = 'float ' + (cls || ''); d.innerHTML = html; box.appendChild(d);
  setTimeout(() => d.remove(), 1600);
}
function shake(pid) { const el = seatEl(pid); if (el) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); } }
function pingMed(c) { const el = document.querySelector(`#track .med[data-char="${c}"]`); if (el) { el.classList.remove('ping'); void el.offsetWidth; el.classList.add('ping'); } }
function bump(pid, k) { const el = seatEl(pid) && seatEl(pid).querySelector('.stats .' + k); if (el) { el.classList.remove('chg'); void el.offsetWidth; el.classList.add('chg'); } }
function freshTile(pid, uid) {
  const el = pid === 0 ? document.querySelector(`#me [data-city="${uid}"]`) : document.querySelector(`#seat-${pid} .mt[data-uid="${uid}"]`);
  if (el) { el.classList.remove('fresh'); void el.offsetWidth; el.classList.add('fresh'); }
}
function banner(title, sub, dur = 1900) {
  const b = $('#banner'); b.innerHTML = `<div class="ribbon"><div class="bt">${esc(title)}</div>${sub ? `<div class="bs">${sub}</div>` : ''}</div>`;
  b.style.setProperty('--bdur', Math.max(900, D(dur)) + 'ms'); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
}
function openSheet(html, o = {}) {
  const s = $('#sheet');
  s.innerHTML = `<div class="sheet-panel" role="dialog" aria-modal="true">${o.close === false ? '' : `<button class="icon-btn x-close" data-act="${o.closeAct || 'close'}" aria-label="${o.closeAct === 'hide-need' ? 'Look at the table' : 'Close'}" data-tip="${o.closeAct === 'hide-need' ? 'Look at the table first' : 'Close'}">${o.closeAct === 'hide-need' ? ICON.eye : ICON.close}</button>`}${html}</div>`;
  s.classList.remove('hidden'); s.dataset.lock = o.lock ? '1' : ''; s.dataset.kind = o.kind || ''; hideTip();
}
/* rewrite an open sheet, keeping where it was scrolled */
function refreshSheet(html, o = {}) {
  const p = $('#sheet .sheet-panel'); if (!p || $('#sheet').classList.contains('hidden')) return openSheet(html, o);
  const y = p.scrollTop; openSheet(html, o); const q = $('#sheet .sheet-panel'); if (q) q.scrollTop = y;
}
function closeSheet() { const s = $('#sheet'); s.classList.add('hidden'); s.innerHTML = ''; s.dataset.lock = ''; s.dataset.kind = ''; UI.form = null; }
const sheetOpen = () => !$('#sheet').classList.contains('hidden');

/* ── playing a batch of events: each one moves things on the table, then the table shows its snapshot ── */
function renderTable() { renderTopbar(); renderTrack(); const v = V(); put('#opps', S.players.slice(1).map(P => seatHTML(P.id, v, false)).join('')); if (mobile() && S.n <= 3) for (const el of $('#opps').children) el.classList.add('wide'); renderMe(); renderStage(); renderAction(); }
async function play(ev, ctx = {}) {
  const G = UI.game;
  UI.busy = true; UI.ctx = ctx;
  renderAction();
  for (const e of ev.fx) {
    if (UI.game !== G) return;
    let done = false;
    const commit = () => { if (done) return; done = true; if (e.v) UI.view = e.v; renderTable(); };
    const h = FX[e.k];
    if (h && (e.only == null || e.only === 0 || e.k === 'pick')) { try { await h(e, commit); } catch (err) { console.error(err); } }
    commit();
    if (UI.game !== G) return;
    await wait(D(110));
  }
  for (const e of ev.fx) delete e.v;
  UI.view = null; UI.calling = null; UI.flash = null; UI.ctx = null; UI.hint = '';
  renderMatch();
}
const hintOf = pid => `${esc(nameOf(pid))} ${vb(pid, 'are', 'is')} playing…`;
const coinsTo = (pid, n, from) => flyTokens('gold', from || stageRect(), statRect(pid, 'g'), n);
const cardsTo = (pid, n, from) => flyTokens('back', from || stageRect(), pid === 0 ? handRect(0) : statRect(pid, 'h'), n, { max: 4 });
const CALL_PITCH = [0, 523, 587, 659, 698, 784, 880, 988, 1046, 1175];
const FX = {
  async round(e, commit) {
    UI.killedWas = null; UI.calling = null; commit();
    SFX.play('round');
    banner(`Round ${e.round}`, `${esc(nameOf(e.crown))} ${vb(e.crown, 'have', 'has')} the crown${e.faceUp.length ? ` · face up: ${e.faceUp.map(c => esc(CHAR[c].name)).join(', ')}` : ''}`, 1700);
    for (const c of e.faceUp) pingMed(c);
    await wait(D(1250));
  },
  async pick(e, commit) {
    UI.hint = hintOf(e.pid);
    if (e.only === 0 && e.pid === 0) await showCard(charHTML(e.char, { size: 'lg' }), stageRect(), seatRect(0), 'Your character', '', 360);
    else await flyTokens('back', stageRect(), seatRect(e.pid), 1, { dur: 480 });
    SFX.play('card'); commit();
  },
  async down(e) { await flyTokens('back', seatRect(e.pid), stageRect(), 1, { dur: 420 }); SFX.play('card'); },
  async theater(e, commit) {
    SFX.play('swap');
    await Promise.all([flyTokens('back', seatRect(e.pid), seatRect(e.target), 1), flyTokens('back', seatRect(e.target), seatRect(e.pid), 1)]);
    commit(); banner('The Theater', `${esc(nameOf(e.pid))} ${vb(e.pid, 'swap', 'swaps')} characters with ${esc(objOf(e.target))}`, 1500); await wait(D(900));
  },
  async theaterGot(e) { if (e.pid === 0) { banner('Your new character', esc(CHAR[e.char].name), 1500); await wait(D(900)); } },
  async call(e, commit) {
    UI.calling = e.char; UI.hint = e.pid != null ? hintOf(e.pid) : '';
    commit(); pingMed(e.char);
    SFX.play('bell', CALL_PITCH[CHAR[e.char].rank]);
    if (e.pid === 0) { SFX.play('turn'); buzz(20); banner('Your turn', `You are ${esc(theC(e.char))}`, 1400); await wait(D(1000)); }
    else await wait(D(e.pid == null ? 620 : 820));
  },
  async witchLost(e) { floatAt(e.pid, 'spell lost', 'info'); await wait(D(500)); },
  async rob(e, commit) {
    await showCard(charHTML('thief', { size: 'lg' }), medRect('thief'), null, `Robbed: ${plural(e.n, 'gold', 'gold')}`, 'bad', 420);
    SFX.play('steal'); floatAt(e.pid, `−${e.n}${ic('gold')}`, 'loss'); shake(e.pid);
    await flyTokens('gold', statRect(e.pid, 'g'), statRect(e.by, 'g'), e.n);
    commit(); floatAt(e.by, `+${e.n}${ic('gold')}`, 'gold'); bump(e.by, 'g');
  },
  async gold(e, commit) {
    if (!e.n) return;
    const from = e.why === 'tax' ? medRect('tax-collector') : stageRect();
    await coinsTo(e.pid, e.n, from); SFX.play('coins', e.n);
    commit(); floatAt(e.pid, `+${e.n}${ic('gold')}`, 'gold'); bump(e.pid, 'g');
  },
  async cards(e, commit) {
    if (!e.n) return;
    await cardsTo(e.pid, e.n); SFX.play('draw');
    commit(); floatAt(e.pid, `+${e.n}${ic('card')}`, 'cards'); bump(e.pid, 'h');
  },
  async crown(e, commit) {
    const old = rectOf(document.querySelector('.crownmark')), to = seatRect(e.pid);
    await flyTokens('crown', old || stageRect(), to && { left: to.left, top: to.top, width: Math.min(to.width, 120), height: 30 }, 1, { big: true, dur: 700 });
    SFX.play('crown'); commit();
  },
  async discard(e) { floatAt(e.pid, `−${e.n}${ic('card')}`, 'cards'); await flyTokens('back', statRect(e.pid, 'h'), stageRect(), e.n, { max: 4 }); },
  async cardinal(e, commit) {
    await Promise.all([flyTokens('gold', statRect(e.from, 'g'), statRect(e.pid, 'g'), e.n), flyTokens('back', statRect(e.pid, 'h'), statRect(e.from, 'h'), e.n, { max: 4 })]);
    SFX.play('coins', e.n); commit();
  },
  async paidBuild(e, commit) {
    const from = e.pid === 0 ? rectOf(document.querySelector(`#hand .card[data-uid="${e.card.uid}"]`)) || handRect(0) : statRect(e.pid, 'h');
    if (!(UI.ctx && UI.ctx.landed === e.card.uid)) await showCard(districtHTML(e.card, { size: 'lg' }), from, null, `${esc(nameOf(e.pid))} ${vb(e.pid, 'pay', 'pays')} for it…`, '', 360);
    SFX.play('pay', 2); commit();
  },
  async confiscate(e, commit) {
    await showCard(districtHTML(e.card, { size: 'lg' }), stageRect(), cityRect(e.pid), 'Confiscated!', 'bad', 640);
    SFX.play('seal'); commit();
    if (e.refund) { await coinsTo(e.from, e.refund); floatAt(e.from, `+${e.refund}${ic('gold')}`, 'gold'); }
  },
  async build(e, commit) {
    if (e.how === 'confiscated') { commit(); freshTile(e.pid, e.card.uid); return; }
    const landed = UI.ctx && UI.ctx.landed === e.card.uid;
    const from = UI.buildFrom != null ? statRect(UI.buildFrom, 'h') : e.pid === 0 ? rectOf(document.querySelector(`#hand .card[data-uid="${e.card.uid}"]`)) || stageRect() : statRect(e.pid, 'h');
    UI.buildFrom = null;
    if (landed) dropGhost();
    await showCard(districtHTML(e.card, { size: 'lg' }), landed ? stageRect() : from, cityRect(e.pid), `${esc(nameOf(e.pid))} ${vb(e.pid, 'build', 'builds')}`, 'good', e.pid === 0 ? 260 : 620);
    SFX.play('build'); commit(); freshTile(e.pid, e.card.uid); bump(e.pid, 'g');
  },
  async tax(e, commit) { await flyTokens('gold', statRect(e.pid, 'g'), medRect('tax-collector'), 1, { dur: 420 }); SFX.play('coin'); commit(); },
  async complete(e, commit) {
    commit(); SFX.play('crown');
    banner(e.pid === 0 ? 'Your city is complete!' : `${S.players[e.pid].name} completes a city`, e.first ? 'The game ends at the end of this round' : 'Completed city: +2 points', 2000);
    await wait(D(1500));
  },
  async destroy(e, commit) {
    if (e.why === 'framework' || e.why === 'necropolis') { SFX.play('destroy'); commit(); return; }
    const r = tileRect(e.pid, e.card.uid);
    if (e.why === 'armory' && e.by == null) { SFX.play('destroy'); commit(); return; }
    if (e.paid) { await flyTokens('gold', statRect(e.by, 'g'), stageRect(), e.paid, { dur: 420 }); }
    shake(e.pid); SFX.play('destroy');
    await showCard(districtHTML(e.card, { size: 'lg' }), r, null, `Destroyed by ${esc(objOf(e.by))}`, 'bad', 560);
    commit();
  },
  async bribe(e, commit) { await flyTokens('gold', statRect(e.pid, 'g'), statRect(e.by, 'g'), e.n); SFX.play('pay', e.n); commit(); floatAt(e.pid, e.n ? `paid ${e.n}${ic('gold')}` : 'paid', 'loss'); },
  async refuse(e) { floatAt(e.pid, 'refuses to pay', 'info'); SFX.play('seal'); await wait(D(600)); },
  async threat(e, commit) {
    if (e.real) { SFX.play('steal'); shake(e.pid); floatAt(e.pid, `real threat! −${e.n}${ic('gold')}`, 'loss'); await flyTokens('gold', statRect(e.pid, 'g'), statRect(e.by, 'g'), e.n); }
    else { floatAt(e.pid, 'an empty threat', 'info'); SFX.play('bad'); await wait(D(600)); }
    commit();
  },
  async spare(e) { floatAt(e.pid, 'threat stays hidden', 'info'); await wait(D(500)); },
  async bewitch(e, commit) { commit(); pingMed(e.char); SFX.play('magic'); await wait(D(700)); },
  async bewitchedEnd(e) { floatAt(e.pid, 'bewitched', 'info'); await wait(D(500)); },
  async resume(e, commit) { commit(); pingMed(e.char); SFX.play('magic'); if (e.pid === 0) { banner('Your turn', `As ${esc(theC(e.char))}, by the Witch’s spell`, 1500); SFX.play('turn'); } await wait(D(900)); },
  async witchIdle(e) { floatAt(e.pid, 'no spell', 'info'); await wait(D(300)); },
  async kill(e, commit) { commit(); pingMed(e.char); SFX.play('kill'); if (S.players[0].chars.includes(e.char)) { banner('You are killed', `${esc(CHAR[e.char].name)} skips the turn`, 1600); buzz(60); } await wait(D(800)); },
  async warrants(e, commit) { commit(); for (const c of e.chars) pingMed(c); SFX.play('seal'); await wait(D(700)); },
  async robNamed(e, commit) { commit(); pingMed(e.char); SFX.play('seal'); await wait(D(700)); },
  async threats(e, commit) { commit(); for (const c of e.chars) pingMed(c); SFX.play('seal'); await wait(D(700)); },
  async spy(e, commit) {
    floatAt(e.target, `${e.n} ${TYPES[e.type].name.toLowerCase()}`, 'info');
    await Promise.all([flyTokens('gold', statRect(e.target, 'g'), statRect(e.pid, 'g'), e.gold), cardsTo(e.pid, e.cards)]);
    if (e.gold || e.cards) SFX.play('steal');
    commit(); await wait(D(400));
  },
  async peek(e) { UI.post.push({ kind: 'peek', target: e.target, hand: e.hand }); },
  async swapHands(e, commit) {
    SFX.play('swap');
    await Promise.all([flyTokens('back', statRect(e.pid, 'h'), statRect(e.target, 'h'), e.gave, { max: 4 }), flyTokens('back', statRect(e.target, 'h'), statRect(e.pid, 'h'), e.got, { max: 4 })]);
    commit(); bump(e.pid, 'h'); bump(e.target, 'h');
  },
  async redraw(e, commit) { await flyTokens('back', statRect(e.pid, 'h'), stageRect(), e.n, { max: 4, dur: 400 }); await cardsTo(e.pid, e.n); SFX.play('magic'); commit(); },
  async wizardEmpty(e) { floatAt(e.target, 'empty hand', 'info'); await wait(D(500)); },
  async wizardLook(e) { floatAt(e.target, 'hand looked at', 'info'); SFX.play('magic'); await wait(D(500)); },
  async wizardTake(e, commit) {
    if (e.build) { UI.buildFrom = e.from; return; }
    await flyTokens('back', statRect(e.from, 'h'), statRect(e.pid, 'h'), 1); SFX.play('steal'); commit();
  },
  async seer(e, commit) { SFX.play('magic'); await Promise.all(e.from.map(x => flyTokens('back', statRect(x, 'h'), statRect(e.pid, 'h'), 1))); commit(); },
  async seerGave(e, commit) { await Promise.all(e.to.map(x => flyTokens('back', statRect(e.pid, 'h'), statRect(x, 'h'), 1))); SFX.play('card'); commit(); },
  async tribute(e, commit) { if (e.took) { await flyTokens(e.took === 'gold' ? 'gold' : 'back', statRect(e.from, e.took === 'gold' ? 'g' : 'h'), statRect(e.pid, e.took === 'gold' ? 'g' : 'h'), 1); SFX.play(e.took === 'gold' ? 'coin' : 'draw'); } commit(); },
  async alms(e, commit) { await flyTokens('gold', statRect(e.from, 'g'), statRect(e.pid, 'g'), 1); SFX.play('coin'); commit(); floatAt(e.pid, `+1${ic('gold')}`, 'gold'); },
  async scholar(e) { await cardsTo(e.pid, Math.min(e.n, 4)); SFX.play('draw'); },
  async seize(e, commit) {
    await showCard(districtHTML(e.card, { size: 'lg' }), tileRect(e.from, e.card.uid), cityRect(e.pid), `Seized for ${plural(e.paid, 'gold', 'gold')}`, 'bad', 520);
    await flyTokens('gold', statRect(e.pid, 'g'), statRect(e.from, 'g'), e.paid);
    SFX.play('steal'); commit(); freshTile(e.pid, e.card.uid);
  },
  async exchange(e, commit) {
    SFX.play('swap');
    await Promise.all([showCard(districtHTML(e.got, { size: 'lg' }), tileRect(e.with, e.got.uid), cityRect(e.pid), 'Exchanged', 'magic', 520), flyTokens('gold', statRect(e.pid, 'g'), statRect(e.with, 'g'), e.paid)]);
    commit(); freshTile(e.pid, e.got.uid); freshTile(e.with, e.gave.uid);
  },
  async beautify(e, commit) { await flyTokens('gold', statRect(e.pid, 'g'), cityRect(e.pid), e.cards.length); SFX.play('coins', 2); commit(); for (const c of e.cards) freshTile(e.pid, c.uid); },
  async museum(e, commit) { await flyTokens('back', statRect(e.pid, 'h'), cityRect(e.pid), 1); SFX.play('card'); commit(); },
  async end(e, commit) { commit(); await wait(D(200)); },
  async killedWas(e, commit) {
    UI.killedWas = { char: e.char, pid: e.pid }; commit(); pingMed(e.char); SFX.play('kill');
    floatAt(e.pid, `was ${esc(theC(e.char))}`, 'info'); await wait(D(900));
  },
  async roundEnd(e, commit) { UI.calling = null; commit(); await wait(D(500)); },
};
