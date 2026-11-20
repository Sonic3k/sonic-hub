/* ── what is read and pressed: the numbers beside the board, the sheets, the words in two languages ── */
const ui = (() => {
  const overlay = $('overlay'), sheetEl = $('sheet'), toastEl = $('toast');
  const el = { score: $('score'), best: $('best'), next: $('next'), track: $('track'), hud: $('hud'), clock: $('clock'), back: $('back'), fresh: $('new'), say: $('say') };
  let shownScore = 0, shownBest = 0, target = 0, counting = false, nextBalls = [], closeFn = null, toastTimer = 0, lastFocus = null;
  const stars = n => [0, 1, 2].map(i => ICON.star.replace('<svg', `<svg style="--i:${i}" class="${i < n ? 'on' : ''}"`)).join('');

  /* ── the words ── */
  function words() {
    const w = W();
    document.documentElement.lang = LANG;
    for (const n of document.querySelectorAll('[data-t]')) n.textContent = w[n.dataset.t];
    for (const n of document.querySelectorAll('[data-act="sound"]')) { n.innerHTML = kept.sound ? ICON.sound : ICON.mute; n.setAttribute('aria-label', w.sound + ': ' + (kept.sound ? w.on : w.off)); n.setAttribute('aria-pressed', String(kept.sound)); }
    for (const n of document.querySelectorAll('.chip.round[data-act="menu"]')) { n.innerHTML = ICON.gear; n.setAttribute('aria-label', w.settings); }
    for (const n of document.querySelectorAll('.chip.round[data-act="help"]')) { n.innerHTML = ICON.help; n.setAttribute('aria-label', w.how); }
    $('to-map').innerHTML = ICON.map + `<span>${w.map}</span>`;
    el.back.innerHTML = ICON.back + `<span>${w.back}</span>`;
    el.fresh.innerHTML = ICON.fresh + `<span>${w.fresh}</span>`;
    $('boardbox').setAttribute('aria-label', w.boardLabel);
    nextLabel();
  }

  /* ── beside the board ── */
  function track(score, best) {
    const top = STARS[STARS.length - 1];
    if (!el.track.querySelector('svg')) el.track.insertAdjacentHTML('beforeend', STARS.map(s => ICON.star.replace('<svg', `<svg style="left:${s / top * 100}%"`)).join(''));
    el.track.style.setProperty('--at', String(Math.min(1, score / top)));
    el.track.querySelectorAll('svg').forEach((n, i) => { const was = n.classList.contains('on'); n.classList.toggle('on', score >= STARS[i]); n.style.opacity = score >= STARS[i] || best >= STARS[i] ? '1' : '.55'; if (!was && score >= STARS[i] && counting) audio.starUp(i); });
  }
  /* The house's numbers are made of seven bars each, as its program's were: five figures, the ones in front of the
     number shown too but dim. Which bars a figure lights: top, upper right, lower right, bottom, lower left, upper left, middle. */
  const BARS = ['1111110', '0110000', '1101101', '1111001', '0110011', '1011011', '1011111', '1110000', '1111111', '1111011'];
  const BAR = ['M2.2 1 L9.8 1 L8.6 2.6 L3.4 2.6Z', 'M11 2 L11 9.2 L9.4 8.2 L9.4 3.6Z', 'M11 10.8 L11 18 L9.4 16.4 L9.4 11.8Z', 'M2.2 19 L9.8 19 L8.6 17.4 L3.4 17.4Z', 'M1 10.8 L1 18 L2.6 16.4 L2.6 11.8Z', 'M1 2 L1 9.2 L2.6 8.2 L2.6 3.6Z', 'M2.4 10 L3.6 9.1 L8.4 9.1 L9.6 10 L8.4 10.9 L3.6 10.9Z'];
  function lamps(n) {
    const text = String(Math.max(0, Math.min(99999, n))), lead = 5 - text.length;
    let out = `<svg class="led" viewBox="0 0 ${5 * 13.4 - 1.4} 20" role="img" aria-label="${n}">`;
    for (let i = 0; i < 5; i++) { const d = i < lead ? 0 : Number(text[i - lead]); out += `<g transform="translate(${i * 13.4} 0)"${i < lead ? ' class="lead"' : ''}>` + BAR.map((path, k) => `<path d="${path}"${BARS[d][k] === '1' ? ' class="on"' : ''}/>`).join('') + '</g>'; }
    return out + '</svg>';
  }
  let led = false;
  function show(node, n) { if (led) node.innerHTML = lamps(n); else node.textContent = String(n); }
  function put() { show(el.score, Math.round(shownScore)); show(el.best, Math.max(shownBest, Math.round(shownScore))); }
  /** the numbers as they stand, with no counting up (lit: the place shows them in lamps) */
  function set(score, best, lit) { if (lit != null) led = !!lit; shownScore = target = score; shownBest = best; counting = false; put(); track(score, best); }
  /** points just won: the number counts up to them */
  function gain(points) {
    const from = shownScore; target += points; counting = true;
    const to = target;
    el.score.classList.remove('bump'); void el.score.offsetWidth; el.score.classList.add('bump');
    anim.run(Math.min(700, 220 + points * 14), u => { if (target !== to) return; shownScore = lerp(from, to, u); put(); track(Math.round(shownScore), shownBest); }, { ease: ease.out3 }).then(() => { if (target === to) { shownScore = to; put(); track(to, shownBest); } });
  }
  /** the three to come, at the top */
  function next(list, place) {
    nextBalls = list.map(b => b.c);
    el.hud.classList.toggle('no-next', kept.show === 'field' || kept.show === 'none');
    const [c, w, h] = fit(el.next);
    c.clearRect(0, 0, w, h);
    const d = Math.min(h, w / 3) * .96, r = d * place.ballR * 1.16;
    nextBalls.forEach((colour, i) => {
      const x = w / 2 + (i - 1) * (w / 3), y = h / 2;
      c.save(); c.translate(x, y);
      if (place.glow) glowAt(c, 0, 0, Math.min(h / 2, w / 6), place.inks[colour], place.glow.a * .8);
      else if (place.shadow) { c.fillStyle = 'rgba(0,0,0,.22)'; oval(c, 0, r * .92, r * .8, r * .2, 0); c.fill(); }
      c.save(); place.ball(c, colour, r); c.restore();           // a place may turn or stretch the sheet as it paints
      if (kept.marks) mark(c, colour, r);
      c.restore();
    });
    nextLabel();
  }
  function nextLabel() { el.next.setAttribute('aria-label', W().nextLabel(nextBalls.map(c => W().colours[c]).join(', '))); }
  function clock(seconds) {
    const s = Math.floor(seconds), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, two = v => (v < 10 ? '0' : '') + v;
    const text = (h ? h + ':' + two(m) : String(m)) + ':' + two(s % 60);
    if (el.clock.textContent !== text) el.clock.textContent = text;
  }
  const say = text => { el.say.textContent = text; };

  /* ── sheets ── */
  function open(html, o) {
    o = o || {};
    lastFocus = document.activeElement;
    sheetEl.className = 'sheet' + (o.cls ? ' ' + o.cls : '');
    sheetEl.innerHTML = (o.noX ? '' : `<button type="button" class="x" data-act="close" aria-label="${W().close}">×</button>`) + html;
    overlay.hidden = false; closeFn = o.onClose || null;
    const first = sheetEl.querySelector('.btn.main') || sheetEl.querySelector('button');
    if (first) first.focus({ preventScroll: true });
    if (o.after) o.after(sheetEl);
  }
  function close(silent) {
    if (overlay.hidden) return;
    overlay.hidden = true; sheetEl.innerHTML = '';
    const fn = closeFn; closeFn = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    if (fn && !silent) fn();
  }
  overlay.addEventListener('pointerdown', e => { if (e.target === overlay) close(); });

  /** the rules, each with a small picture painted with the balls of the place the player is at */
  function help(place) {
    const w = W();
    open(`<h2>${w.how}</h2><p class="lead">${w.rulesLead}</p>
      <div class="rules">${[1, 2, 3, 4].map(i => `<div class="rule"><canvas data-rule="${i}"></canvas><p>${w['r' + i]}</p></div>`).join('')}</div>
      <p style="margin:12px 0 0"><b>${w.pointsLine}</b></p>
      <ul class="points">${[5, 6, 7, 8, 9].map(n => `<li>${w.ballsN(n)} · ${Lines.points(n)}</li>`).join('')}</ul>
      <p class="fine">${w.fine}</p>`, { after: root => root.querySelectorAll('canvas[data-rule]').forEach(cv => rulePicture(cv, Number(cv.dataset.rule), place)) });
  }
  function rulePicture(cv, which, place) {
    const [c, w] = fit(cv), n = which === 2 ? 5 : 4, m = w * .06, cell = (w - m * 2) / n, r = cell * .42;
    c.fillStyle = linear(c, 0, 0, w, w, [[0, '#fbf6ea'], [1, '#ecdfc4']]); c.fillRect(0, 0, w, w);
    c.strokeStyle = 'rgba(42,36,64,.2)'; c.lineWidth = 1;
    for (let i = 0; i <= n; i++) { c.beginPath(); c.moveTo(m + i * cell, m); c.lineTo(m + i * cell, w - m); c.moveTo(m, m + i * cell); c.lineTo(w - m, m + i * cell); c.stroke(); }
    const X = x => m + (x + .5) * cell, ball = (x, y, colour, k, a) => { c.save(); c.globalAlpha = a == null ? 1 : a; c.translate(X(x), X(y)); c.scale(k || 1, k || 1); c.fillStyle = 'rgba(42,36,64,.18)'; oval(c, 0, r * .9, r * .8, r * .2, 0); c.fill(); place.ball(c, colour, r); c.restore(); };
    const pen = '#c8442d';
    if (which === 1) {
      ball(1, 1, 4); ball(2, 2, 2); ball(0, 3, 0, 1.08);
      c.fillStyle = pen; for (const [x, y] of [[0, 2], [0, 1], [0, 0], [1, 0], [2, 0]]) { disc(c, X(x), X(y), cell * .07); c.fill(); }
      c.strokeStyle = pen; c.lineWidth = 2; disc(c, X(3), X(0), cell * .26); c.stroke();
    } else if (which === 2) {
      for (let i = 0; i < 5; i++) ball(i, 4 - i, 3);
      c.strokeStyle = alpha(pen, .85); c.lineWidth = 2.5; c.lineCap = 'round'; c.setLineDash([1, 6]); c.beginPath(); c.moveTo(X(0) - cell * .3, X(4) + cell * .3); c.lineTo(X(4) + cell * .3, X(0) - cell * .3); c.stroke(); c.setLineDash([]);
      ball(0, 0, 0, .7, .5); ball(3, 3, 5, .7, .5);
    } else if (which === 3) {
      ball(0, 0, 1); ball(2, 1, 6); ball(1, 3, 4);
      for (const [x, y, colour] of [[3, 0, 2], [1, 1, 0], [3, 2, 3]]) { ball(x, y, colour, .4); c.strokeStyle = pen; c.lineWidth = 1.6; c.setLineDash([2, 3]); disc(c, X(x), X(y), cell * .34); c.stroke(); c.setLineDash([]); }
    } else {
      const fill = [0, 3, 1, 5, 4, 6, 2, 0, 2, 1, 5, 3, 6, 4, 0, 1];
      fill.forEach((colour, i) => ball(i % 4, Math.floor(i / 4), colour, .92, i === 5 ? 1 : .92));
      c.fillStyle = 'rgba(246,238,219,.45)'; c.fillRect(0, 0, w, w);
    }
  }

  function menu(apply) {
    const w = W(), seg = (key, options) => `<span class="seg" data-key="${key}">${options.map(([v, label]) => `<button type="button" data-set="${key}" data-v="${v}" aria-pressed="${String(v) === String(key === 'lang' ? LANG : kept[key])}">${label}</button>`).join('')}</span>`;
    open(`<h2>${w.settings}</h2>
      <div class="rows">
        <div class="row"><span>${w.lang}</span>${seg('lang', [['vi', 'Tiếng Việt'], ['en', 'English']])}</div>
        <div class="row"><span>${w.sound}<small>${w.soundSub}</small></span>${seg('sound', [[true, w.on], [false, w.off]])}</div>
        <div class="row"><span>${w.show}<small>${w.showSub}</small></span>${seg('show', [['both', w.showBoth], ['field', w.showField], ['top', w.showTop], ['none', w.showNone]])}</div>
        <div class="row"><span>${w.marks}<small>${w.marksSub}</small></span>${seg('marks', [[true, w.on], [false, w.off]])}</div>
      </div>`, { after: root => root.addEventListener('click', e => {
      const b = e.target.closest('[data-set]'); if (!b) return;
      const key = b.dataset.set, v = b.dataset.v === 'true' ? true : b.dataset.v === 'false' ? false : b.dataset.v;
      if (key === 'lang') { LANG = v; kept.lang = v; } else kept[key] = v;
      keep(); apply(key);
      if (key === 'lang') { close(true); menu(apply); return; }
      root.querySelectorAll(`[data-set="${key}"]`).forEach(n => n.setAttribute('aria-pressed', String(n === b)));
    }) });
  }

  /** the end of a game */
  function over(r, place, act) {
    const w = W(), nextStar = STARS.find(s => r.score < s);
    open(`<h2>${w.overTitle}</h2><p class="lead">${w.overLead(tr(place.name))}</p>
      <p class="big" id="end-score">0</p><div><span class="stars">${stars(starsFor(r.score))}</span></div>
      ${r.newBest ? `<span class="ribbon">${w.newBest}</span>` : `<p style="margin:6px 0 0;color:var(--pen-soft)">${w.best}: <b>${r.best}</b></p>`}
      <p class="fine" style="margin-top:10px!important">${r.lit ? w.lit(tr(place.name)) : nextStar ? w.toNext(nextStar - r.score, STARS.indexOf(nextStar) + 1) : w.allStars}</p>
      <div class="btns"><button type="button" class="btn" data-act="to-map">${w.toMap}</button><button type="button" class="btn main" data-act="again">${w.again}</button></div>`,
    { cls: 'end', noX: true, onClose: null, after: root => { const n = root.querySelector('#end-score'); anim.run(Math.min(1100, 300 + r.score * 4), u => { n.textContent = String(Math.round(r.score * u)); }, { ease: ease.out3, keep: true }); } });
  }
  function askNew(score, yes) {
    const w = W();
    open(`<h2>${w.quit}</h2><p class="lead">${w.quitLead(score)}</p><div class="btns"><button type="button" class="btn main" data-act="close">${w.keepOn}</button><button type="button" class="btn" data-act="yes-new">${w.yesNew}</button></div>`, { noX: true, after: root => root.querySelector('[data-act="yes-new"]').addEventListener('click', () => { close(true); yes(); }) });
  }
  function toast(text, ms) {
    toastEl.textContent = text; toastEl.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('on'), ms || 2200);
  }

  return { words, set, gain, next, clock, say, open, close, help, menu, over, askNew, toast, stars, isOpen: () => !overlay.hidden, backBtn: el.back };
})();
