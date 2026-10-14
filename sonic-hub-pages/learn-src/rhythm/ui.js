/* ───────────── Nhịp — screens ───────────── */
const appEl = document.getElementById('app');
const navEl = document.getElementById('nav');
const I = {
  next: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.8v14.4a1 1 0 0 0 1.5.86l12-7.2a1 1 0 0 0 0-1.72l-12-7.2A1 1 0 0 0 7 4.8z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path d="M13.5 2 4 14h7l-1.5 8L19 10h-7z"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9.5l5 5M22 9.5l-5 5"/></svg>',
  expand: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  shrink: '<svg viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>',
  today: '<svg viewBox="0 0 24 24"><path d="M3 12h3.5l2.5-7 4.5 14 3-9 1.5 2H21"/></svg>',
  quiz: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17.2v.1"/></svg>',
  cards: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="14" height="13" rx="3"/><path d="M7 7V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"/></svg>',
  exam: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>',
};
const SPEAK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke-linecap="round"/></svg>';
let timer = null;
let keyHandler = null;
let ringId = 0;

// ───────────── sound + haptics: short synth blips, pitch climbs with the combo
const Sfx = {
  on: (() => {
    try {
      return localStorage.getItem('nhip.sound') !== 'off';
    } catch {
      return true;
    }
  })(),
  ctx: null,
  ac() {
    if (!this.on) return null;
    try {
      this.ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  },
  tone(freq, { at = 0, dur = 0.12, type = 'sine', vol = 0.06 } = {}) {
    const ctx = this.ac();
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.03);
  },
  hit(combo = 1) {
    const f = 659.25 * Math.pow(2, Math.min(Math.max(combo, 1) - 1, 7) / 12);
    this.tone(f, { dur: 0.1, type: 'triangle', vol: 0.07 });
    this.tone(f * 1.5, { at: 0.06, dur: 0.16, vol: 0.045 });
  },
  miss() {
    this.tone(220, { dur: 0.18, type: 'triangle', vol: 0.07 });
    this.tone(165, { at: 0.07, dur: 0.22, vol: 0.05 });
  },
  gold() {
    [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, { at: i * 0.05, dur: 0.15, type: 'triangle', vol: 0.045 }));
  },
  tick() {
    this.tone(1046, { dur: 0.05, vol: 0.03 });
  },
  rating(r, combo) {
    if (r === 1) this.miss();
    else if (r === 2) this.tick();
    else if (r === 4) this.gold();
    else this.hit(combo);
  },
  toggle() {
    this.on = !this.on;
    try {
      localStorage.setItem('nhip.sound', this.on ? 'on' : 'off');
    } catch {}
    return this.on;
  },
};
const buzz = (pattern) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
};

function setKeys(fn) {
  if (keyHandler) removeEventListener('keydown', keyHandler);
  keyHandler = fn;
  if (fn) addEventListener('keydown', fn);
}

function screen(html, { focus = false, tab = null } = {}) {
  clearInterval(timer);
  setKeys(null);
  $$('body > .sheet, body > .toast').forEach((x) => x.remove());
  document.body.style.overflow = '';
  appEl.innerHTML = `<div class="screen${focus ? ' focus' : ''}">${html}</div>`;
  navEl.hidden = focus;
  $$('a[data-tab]', navEl).forEach((a) => a.classList.toggle('on', a.dataset.tab === tab));
  scrollTo(0, 0);
  return appEl.firstElementChild;
}

const subColor = (subject) => (subject === 'aws' ? 'var(--aws)' : 'var(--en)');
const glyph = (subject) => esc(Content.subject(subject).prefix.toUpperCase());
const courseTitle = (key) => CONTENT.courses[key].title;

/** Segmented ring: one segment per card, colored per card. */
function ring(colors, center, { cls = '' } = {}) {
  const r = 84;
  const sw = 15;
  const C = 2 * Math.PI * r;
  const n = Math.max(colors.length, 1);
  const per = C / n;
  const round = per > 30;
  const seg = round ? per - 7 - sw : Math.max(per - 3, 1);
  const id = `glow${++ringId}`;
  return `<div class="ring ${cls}"><svg viewBox="0 0 200 200" aria-hidden="true">
    <defs><filter id="${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <circle class="track" cx="100" cy="100" r="${r}"/>
    <g filter="url(#${id})">${colors
      .map((c, i) => `<circle class="seg" cx="100" cy="100" r="${r}" style="--i:${i};stroke:${c};stroke-linecap:${round ? 'round' : 'butt'}" stroke-dasharray="${seg.toFixed(2)} ${(C - seg).toFixed(2)}" stroke-dashoffset="${(-(i * per) - (round ? 3.5 + sw / 2 : 1.5)).toFixed(2)}"/>`)
      .join('')}</g></svg><div class="ring-c">${center}</div></div>`;
}

function sourceLine(c) {
  const s = c.source;
  const bits = [`<span class="chip">${SOURCE_LABEL[s.type]}</span>`];
  if (s.name) bits.push(`<span class="chip">${esc(s.name)}</span>`);
  if (s.publisher) bits.push(`<span class="chip">${esc(s.publisher)}</span>`);
  if (s.url) bits.push(`<a class="chip" href="${esc(s.url)}" target="_blank" rel="noopener">Trang nguồn</a>`);
  return bits.join('');
}

function track(key) {
  const c = CONTENT.courses[key];
  const p = LEARNER.courses[key];
  const N = 24;
  const random = rng([...key].reduce((s, ch) => s * 31 + ch.charCodeAt(0), 7));
  const on = Math.round((p.learned / p.total) * N);
  const bars = Array.from({ length: N }, (_, i) => `<i class="${i < on ? 'on' : ''}" style="--h:${(0.3 + random() * 0.7).toFixed(2)}"></i>`).join('');
  return `<a class="panel track subject-${c.subject}" href="#/course/${key}">
    <span class="glyph">${glyph(c.subject)}</span>
    <span><b class="t-title">${esc(c.title)}</b><span class="t-sub">${p.learned}/${p.total} thẻ đã thuộc${p.enrolled ? '' : ', chưa bắt đầu'}</span><span class="eq" aria-hidden="true">${bars}</span></span>
    <span class="due${p.due ? '' : ' zero'}" title="Đến hạn hôm nay">${p.due}</span>
  </a>`;
}

function courseOfItem(itemKey) {
  return Object.values(CONTENT.courses).find((c) => !c.include && c.items.includes(itemKey)).key;
}

// ───────────── home
function home() {
  const counts = dailyCounts();
  const byCourse = {};
  DAILY.forEach((d) => (byCourse[d.course] = (byCourse[d.course] || 0) + 1));
  const lesson = CONTENT.lessons[LEARNER.continueLesson];
  const lc = CONTENT.courses[lesson.course];
  const days = heatDays();
  const max = Math.max(...days.map((d) => d.n), 1);
  screen(
    `<header class="top">
      <div><p>Chào buổi tối, ${esc(LEARNER.name)}</p><h1 class="display">${todayLabel()}</h1></div>
      <span class="streak" title="Chuỗi ngày học liên tiếp">${I.bolt}<b>${LEARNER.streak}</b>ngày</span>
    </header>
    <div class="home">
      <div class="col">
        <section class="hero" aria-label="Ôn hôm nay">
          ${ring(DAILY.map((d) => subColor(Content.subjectOf(d.course))), `<b>${counts.total}</b><span>thẻ hôm nay</span>`)}
          <div class="mix"><span class="chip"><b>${counts.reviews}</b> ôn lại</span><span class="chip"><b>${counts.fresh}</b> mới</span><span class="chip">khoảng ${counts.minutes} phút</span></div>
          <a class="btn play" href="#/learn/daily">${I.play}Bắt đầu</a>
          <div class="panel legend">${Object.entries(byCourse)
            .map(([k, n]) => `<div><span class="dot ${CONTENT.courses[k].subject}"></span>${esc(courseTitle(k))}<b>${n}</b></div>`)
            .join('')}</div>
        </section>
      </div>
      <div class="col">
        <section class="sec">
          <div class="sec-head"><h2 class="h2">Đọc tiếp</h2></div>
          <a class="panel continue subject-${lc.subject}" href="#/lesson/${encodeURIComponent(lesson.id)}">
            <span class="glyph">${glyph(lc.subject)}</span>
            <span><span class="c-course">${esc(Content.courseShort(lesson.course))}</span><span class="c-title">${esc(lesson.title)}</span></span>
            <span class="go">${I.next}</span>
            <span class="bar"><i style="width:${LEARNER.continueProgress * 100}%"></i></span>
          </a>
        </section>
        <section class="sec">
          <div class="sec-head"><h2 class="h2">Đang học</h2><a class="link small" href="#/courses">Tất cả khóa học</a></div>
          <div class="tracks">${Object.keys(LEARNER.courses).filter((k) => LEARNER.courses[k].enrolled).map(track).join('')}</div>
        </section>
        <section class="sec">
          <div class="sec-head"><h2 class="h2">Hay quên</h2></div>
          <div class="panel weak"><ul>${LEARNER.weak
            .map((w) => `<li><span class="dot ${Content.subjectOf(courseOfItem(w.item))}"></span><div><div class="w-term">${esc(Content.label(w.item))}</div><div class="w-facet">${FACET_LABEL[w.facet]}</div></div><span class="w-count">sai ${w.again} lần</span></li>`)
            .join('')}</ul><a class="btn ghost wide" href="#/learn/weak">Ôn riêng mấy thẻ này</a></div>
        </section>
        <section class="sec">
          <div class="sec-head"><h2 class="h2">30 ngày qua</h2></div>
          <div class="panel heat">
            <div class="eq30">${days.map((d, i) => `<i class="${d.n ? '' : 'zero'}${i === days.length - 1 ? ' today' : ''}" style="--h:${(d.n / max).toFixed(2)}" title="${d.label}: ${d.n} thẻ"></i>`).join('')}</div>
            <div class="eq30-axis"><span>${days[0].label}</span><span>Hôm nay</span></div>
            <div class="stats"><div><b>${LEARNER.streak} ngày</b><span>học liên tiếp</span></div><div><b>${LEARNER.best} ngày</b><span>chuỗi dài nhất</span></div></div>
          </div>
        </section>
      </div>
    </div>`,
    { tab: 'home' },
  );
}

// ───────────── courses
function courses() {
  screen(
    `<header class="top"><h1 class="display h1">Khóa học</h1></header>
    ${CONTENT.subjects
      .map((s) => `<section class="subject-block subject-${s.key}"><h2 class="h2"><span class="dot ${s.key}"></span>${esc(s.title)}</h2><div class="tracks">${s.courses.map(track).join('')}</div></section>`)
      .join('')}`,
    { tab: 'courses' },
  );
}

function course(key) {
  const c = CONTENT.courses[key];
  const p = LEARNER.courses[key];
  const first = c.chapters[0]?.lessons[0];
  const el = screen(
    `<a class="back" href="#/courses">${I.back}Khóa học</a>
    <div class="course-wrap subject-${c.subject}">
      <div>
        <section class="panel course-head">
          <div class="k"><span class="glyph">${glyph(c.subject)}</span>${esc(Content.subject(c.subject).title)}</div>
          <h1 class="display h1">${esc(c.title).replace(/\(([^)]+)\)/, '<span class="nowrap">($1)</span>')}</h1>
          ${c.description ? `<p class="desc">${esc(c.description)}</p>` : ''}
          <div class="source">${sourceLine(c)}</div>
          <div class="switch-row"><div><strong>Đang học khóa này</strong><div class="muted small">${p.learned}/${p.total} thẻ đã thuộc, ${p.due} thẻ đến hạn hôm nay</div></div><button class="switch" role="switch" aria-checked="${p.enrolled}" aria-label="Đang học khóa này"></button></div>
          ${c.include ? `<p class="muted small" style="margin:14px 0 0">Khóa gom: lấy thẻ từ ${c.include.flatMap((r) => r.courses).map((k) => esc(courseTitle(k))).join(' và ')}. Trả lời ở đây cũng được tính cho khóa gốc.</p>` : ''}
        </section>
      </div>
      <div>
        <div class="pads">
          <a class="pad" href="#/learn/daily">${I.today}<div><b>Ôn hôm nay</b><span>${p.due} đến hạn, ${Math.min(p.fresh, c.policy?.new_per_day ?? 10)} mới</span></div></a>
          ${first ? `<a class="pad" href="#/learn/lesson/${encodeURIComponent(first)}">${I.quiz}<div><b>Quiz</b><span>Hỏi ngẫu nhiên, không cần học trước</span></div></a>` : ''}
          <a class="pad" href="#/flash/${key}">${I.cards}<div><b>Thẻ</b><span>Lật và vuốt</span></div></a>
          ${c.exam ? `<a class="pad" href="#/exam/${key}">${I.exam}<div><b>Thi thử</b><span>${c.exam.questions} câu, ${c.exam.minutes} phút</span></div></a>` : ''}
        </div>
        ${c.chapters
          .map(
            (ch) => `<section class="chapter"><h2 class="h2">${esc(ch.title)}</h2>${ch.description ? `<p>${esc(ch.description)}</p>` : ''}
            ${ch.lessons
              .map((id) => {
                const l = CONTENT.lessons[id];
                const what = [l.body && 'Bài đọc', l.slides && 'Slide', `${l.items.length} thẻ`].filter(Boolean);
                return `<a class="panel lesson-row" href="#/lesson/${encodeURIComponent(id)}"><div><h4>${esc(l.title)}</h4><div class="tags">${what.map((w) => `<span>${w}</span>`).join('')}</div></div><span class="go">${I.next}</span></a>`;
              })
              .join('')}</section>`,
          )
          .join('')}
        ${!c.chapters.length ? `<p class="muted">Khóa gom không có bài học riêng — học bằng Thẻ hoặc Ôn hôm nay.</p>` : ''}
      </div>
    </div>`,
    { tab: 'courses' },
  );
  const sw = $('.switch', el);
  sw.addEventListener('click', () => {
    p.enrolled = !p.enrolled;
    sw.setAttribute('aria-checked', p.enrolled);
    if (p.enrolled) Sfx.hit(1);
  });
}

// ───────────── lesson
function lessonView(id) {
  const l = CONTENT.lessons[id];
  const c = CONTENT.courses[l.course];
  const tabs = [l.body && ['read', 'Bài đọc'], l.slides && ['slides', 'Slide'], ['cards', `Thẻ (${l.items.length})`]].filter(Boolean);
  const quizHref = `#/learn/lesson/${encodeURIComponent(id)}`;
  const el = screen(
    `<a class="back" href="#/course/${l.course}">${I.back}${esc(Content.courseShort(l.course))}</a>
    <header class="lesson-head subject-${c.subject}">
      <span class="k"><span class="dot ${c.subject}"></span>${esc(l.chapter)}</span>
      <h1 class="display">${esc(l.title)}</h1>
      ${l.summary ? `<p>${esc(l.summary)}</p>` : ''}
    </header>
    <div class="lesson-wrap subject-${c.subject}">
      <div>
        <div class="tabs" role="tablist">${tabs.map(([k, t], i) => `<button role="tab" data-tab="${k}" aria-selected="${i === 0}">${t}</button>`).join('')}</div>
        <div id="panel"></div>
        <div class="sticky-cta mobile-only"><a class="btn" href="${quizHref}">${I.play}Quiz phần này</a></div>
      </div>
      <aside class="lesson-side desktop-only">
        <div class="panel" style="padding:20px"><h2 class="h2">Quiz phần này</h2><p class="muted small">Câu hỏi về ${l.items.length} thẻ trong bài. Không cần đọc hết trước.</p><a class="btn wide" href="${quizHref}">${I.play}Bắt đầu quiz</a></div>
        <div class="panel" style="padding:16px 18px"><h2 class="h2" style="margin-bottom:6px">Trong bài</h2>${l.items.map((k) => `<div style="padding:8px 0;border-bottom:1px solid var(--line);font-size:14.5px">${esc(Content.label(k))}</div>`).join('')}</div>
      </aside>
    </div>`,
    { tab: 'courses' },
  );
  const panel = $('#panel', el);
  const show = (k) => {
    $$('.tabs button', el).forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === k));
    setKeys(null);
    document.body.style.overflow = '';
    if (k === 'read') panel.innerHTML = `<article class="panel reading-panel"><div class="reading">${l.body}</div></article>`;
    if (k === 'slides') {
      panel.innerHTML = `<div class="story"><div class="story-bars" aria-hidden="true"></div><div class="story-host"></div>
          <button class="story-zone prev" aria-label="Lùi"></button><button class="story-zone next" aria-label="Tiếp"></button>
          <button class="story-full" aria-label="Toàn màn hình">${I.expand}</button></div>
        <p class="story-hint">Chạm bên phải để xem tiếp, bên trái để lùi.</p>`;
      const story = $('.story', panel);
      const bars = $('.story-bars', panel);
      const deck = mountSlides($('.story-host', panel), l, {
        extraCss: 'section { padding-top: 46px; }',
        onChange: (s) => {
          if (bars.childElementCount !== s.count) bars.innerHTML = '<i><b></b></i>'.repeat(s.count);
          [...bars.children].forEach((b, i) => b.firstChild.style.setProperty('--p', i < s.index ? 1 : i > s.index ? 0 : (s.step + 1) / (s.steps + 1)));
        },
      });
      const full = $('.story-full', panel);
      const setFull = (on) => {
        story.classList.toggle('is-full', on);
        full.innerHTML = on ? I.shrink : I.expand;
        full.setAttribute('aria-label', on ? 'Thu nhỏ' : 'Toàn màn hình');
        document.body.style.overflow = on ? 'hidden' : '';
      };
      $('.story-zone.next', panel).addEventListener('click', () => deck.next());
      $('.story-zone.prev', panel).addEventListener('click', () => deck.prev());
      full.addEventListener('click', () => setFull(!story.classList.contains('is-full')));
      setKeys((e) => {
        if (e.key === 'ArrowRight' || e.key === ' ') (e.preventDefault(), deck.next());
        if (e.key === 'ArrowLeft') deck.prev();
        if (e.key === 'Escape') setFull(false);
      });
    }
    if (k === 'cards') {
      panel.innerHTML = `<p class="muted small" style="margin:0 0 12px">Xem lướt: các thẻ đã xem sẽ được đưa vào Hôm nay trước.</p><div class="skim">${l.items
        .map((key) => {
          const it = CONTENT.items[key];
          const note = it.notes?.[l.course];
          const noteHtml = note ? `<div class="note">${note}</div>` : '';
          return it.kind === 'vocab'
            ? `<div class="panel subject-${c.subject}"><span class="bar-top"></span><p class="t" lang="en">${esc(it.term)}</p><p class="m">${esc(it.meaning)}</p>${noteHtml}</div>`
            : `<div class="panel subject-${c.subject}"><span class="bar-top"></span><p class="t concept">${it.front}</p>${noteHtml}</div>`;
        })
        .join('')}</div>`;
    }
  };
  $$('.tabs button', el).forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
  show(tabs[0][0]);
}

// ───────────── study session (daily / lesson quiz / weak)
function learn(kind, arg) {
  let session;
  if (kind === 'lesson') session = lessonQuiz(arg);
  else if (kind === 'weak') session = weakSession();
  else session = dailySession();
  const back = kind === 'lesson' ? `#/lesson/${encodeURIComponent(arg)}` : '#/';
  const el = screen(
    `<div class="stage">
      <div class="s-top"><a class="icon-btn" href="${back}" aria-label="Thoát">${I.close}</a><div class="beats" role="img"></div><span class="combo" title="Đúng liên tiếp">×0</span><button class="icon-btn sound" aria-pressed="${Sfx.on}" aria-label="Âm thanh">${Sfx.on ? I.sound : I.mute}</button></div>
      <p class="q-label"></p>
      <section class="panel qpanel" aria-live="polite"><div class="qbody"></div></section>
    </div>`,
    { focus: true },
  );
  const beatsEl = $('.beats', el);
  const comboEl = $('.combo', el);
  const label = $('.q-label', el);
  const qpanel = $('.qpanel', el);
  const qbody = $('.qbody', el);
  const sheet = h('<div class="sheet" role="region" aria-label="Kết quả"><div class="sheet-in"></div></div>');
  document.body.append(sheet);
  const soundBtn = $('.sound', el);
  soundBtn.addEventListener('click', () => {
    const on = Sfx.toggle();
    soundBtn.setAttribute('aria-pressed', on);
    soundBtn.innerHTML = on ? I.sound : I.mute;
    if (on) Sfx.tick();
  });

  const paintBeats = () => {
    const answered = session.cards.filter((c) => session.results.has(c.id)).length;
    const goldFrom = answered - session.combo;
    let ai = 0;
    beatsEl.innerHTML = session.cards
      .map((c, i) => {
        const r = session.results.get(c.id);
        let cls = '';
        if (r) {
          cls = r.correct ? 'hit' : 'miss';
          if (r.correct && session.combo >= 3 && ai >= goldFrom) cls += ' gold';
          ai++;
        } else if (i === session.index) cls = 'now';
        return `<i class="${cls}"></i>`;
      })
      .join('');
    beatsEl.setAttribute('aria-label', `Câu ${Math.min(session.index + 1, session.cards.length)} trên ${session.cards.length}`);
  };
  const paintCombo = (hit) => {
    comboEl.textContent = `×${session.combo}`;
    comboEl.classList.toggle('live', session.combo >= 2);
    if (hit && session.combo >= 2) {
      comboEl.classList.remove('bump');
      void comboEl.offsetWidth;
      comboEl.classList.add('bump');
    }
    if (hit && [3, 5, 10, 15].includes(session.combo)) {
      const pop = h(`<span class="combo-pop">Combo ×${session.combo}</span>`);
      comboEl.append(pop);
      setTimeout(() => pop.remove(), 1200);
      setTimeout(() => Sfx.gold(), 140);
    }
  };
  const fx = (correct) => {
    paintBeats();
    paintCombo(correct);
    qpanel.classList.remove('flash-hit', 'flash-miss');
    void qpanel.offsetWidth;
    qpanel.classList.add(correct ? 'flash-hit' : 'flash-miss');
    buzz(correct ? 12 : [24, 40, 24]);
  };
  const closeSheet = () => {
    sheet.classList.remove('open');
    el.style.paddingBottom = '';
  };
  const showCard = () => {
    const card = session.current;
    if (!card) return finish();
    closeSheet();
    qpanel.className = `panel qpanel subject-${card.subject}`;
    label.innerHTML = `<span class="dot ${card.subject}"></span>${FACET_LABEL[card.facet]}, ${esc(Content.courseShort(card.course))}${card.isNew ? '<span class="tag new">Mới</span>' : ''}${card.isRequeue ? '<span class="tag again">Hỏi lại</span>' : ''}`;
    paintBeats();
    const ctl = mountQuestion(qbody, card, {
      onCommit: (input) => {
        const res = session.answer(input);
        if (card.key.kind === 'flashcard') {
          Sfx.rating(input.rating, session.combo);
          fx(res.correct);
          toast(`<span>${RATING_LABEL[input.rating]}</span>, ôn lại sau ${res.next}`, ['var(--miss)', '#B9A9FF', 'var(--hit)', 'var(--gold)'][input.rating - 1]);
          setTimeout(() => (session.next(), showCard()), 720);
          return;
        }
        ctl.reveal(res, input);
        res.correct ? Sfx.hit(session.combo) : Sfx.miss();
        fx(res.correct);
        openSheet(card, res);
      },
    });
    if (session.index > 0) scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
    setKeys((e) => {
      if (e.target.matches('input')) return;
      const n = Number(e.key);
      const opts = $$('.q-opt:not(:disabled)', qpanel);
      if (n >= 1 && n <= opts.length && card.view.type === 'single') opts[n - 1].click();
      if (e.key === ' ' && card.view.type === 'flashcard') (e.preventDefault(), ctl.flip());
    });
  };
  const openSheet = (card, res) => {
    const inner = $('.sheet-in', sheet);
    inner.className = `sheet-in subject-${card.subject}${res.correct ? '' : ' miss'}`;
    const verdict = res.correct ? (res.typo ? 'Gần chuẩn' : 'Chuẩn!') : 'Chưa đúng';
    const sub = `${res.typo ? 'Sai chính tả chút xíu. ' : ''}Ôn lại sau ${res.next}`;
    const expl = card.feedback.explanation;
    inner.innerHTML = `<div class="verdict"><span class="v-ico" aria-hidden="true">${res.correct ? '✓' : '✕'}</span><div><b>${verdict}</b><small>${sub}</small></div></div>
      ${expl ? `<p class="expl">${expl}</p>` : ''}
      <details${expl ? '' : ' open'}><summary>Xem thẻ: ${esc(Content.label(card.itemKey))}</summary><div class="sum-body">${card.feedback.summary}</div></details>
      ${res.requeuedAt ? '<p class="requeue">Thẻ này sẽ quay lại sau vài câu nữa.</p>' : ''}
      <button class="next" type="button">Tiếp</button>`;
    inner.scrollTop = 0;
    sheet.classList.add('open');
    const btn = $('.next', inner);
    btn.addEventListener('click', () => (session.next(), showCard()));
    btn.focus({ preventScroll: true });
    setKeys((e) => e.key === 'Enter' && (e.preventDefault(), btn.click()));
    // keep the answer visible above the sheet
    requestAnimationFrame(() => {
      const hgt = inner.offsetHeight;
      el.style.paddingBottom = `${hgt + 24}px`;
      const targets = $$('.q-opt.is-correct, .q-opt.is-wrong, .q-input, .q-cloze, .q-order, .q-match', qpanel);
      if (!targets.length) return;
      const bottom = Math.max(...targets.map((t) => t.getBoundingClientRect().bottom));
      const overlap = bottom - (innerHeight - hgt - 16);
      if (overlap > 0) scrollBy({ top: overlap, behavior: reduceMotion() ? 'auto' : 'smooth' });
    });
  };
  const finish = () => {
    sheet.remove();
    const s = session.summary();
    const first = session.cards.filter((c) => !c.isRequeue);
    screen(
      `<div class="done">
        ${ring(first.map((c) => (session.results.get(c.id)?.correct ? 'var(--hit)' : 'var(--miss)')), `<b>${s.correct}<small>/${s.total}</small></b><span>đúng ngay lần đầu</span>`)}
        <h1 class="display h1">${kind === 'lesson' ? 'Xong quiz' : 'Xong phần hôm nay'}</h1>
        <div class="replay" aria-hidden="true">${s.beats.map((b) => `<i class="${b ? '' : 'miss'}"></i>`).join('')}</div>
        <div class="stats">
          <div><b>${s.maxCombo}</b><span>đúng liền một mạch</span></div>
          <div><b>${s.fresh}</b><span>thẻ mới đã học</span></div>
          <div><b>${s.again}</b><span>lần hỏi lại trong buổi</span></div>
          <div><b>${LEARNER.tomorrow}</b><span>thẻ cần ôn ngày mai</span></div>
        </div>
        <a class="btn wide" href="#/">Về trang chính</a>
      </div>`,
      { focus: true },
    );
    if (s.percent >= 80) Sfx.gold();
  };
  showCard();
}

function toast(html, color) {
  $$('body > .toast').forEach((t) => t.remove());
  const t = h(`<div class="toast" style="--tc:${color}" role="status">${html}</div>`);
  document.body.append(t);
  setTimeout(() => t.remove(), 1100);
}

// ───────────── flashcards
function flash(courseKey = 'english-all-flashcards') {
  const deck = new Deck(courseKey);
  const el = screen(
    `<header class="deck-head"><h1 class="display h1">Thẻ</h1><p>Chạm để lật. Vuốt phải là nhớ, trái là quên, lên là dễ.</p></header>
    <div class="deck-chips">${Content.coursesInOrder()
      .map((c) => `<button aria-pressed="${c.key === courseKey}" data-course="${c.key}"><span class="dot ${c.subject}"></span>${esc(Content.courseShort(c.key))}</button>`)
      .join('')}</div>
    <div class="deck-area"></div>
    <div class="deck-actions"><p class="deck-left"></p><div class="q-rate">${[1, 2, 3, 4].map((r) => `<button class="q-rate-btn" data-rating="${r}"><span class="q-rate-label">${RATING_LABEL[r]}</span><span class="q-rate-next">${DEFAULT_NEXT.review[r]}</span></button>`).join('')}</div></div>`,
    { tab: 'flash' },
  );
  $$('.deck-chips button', el).forEach((b) => b.addEventListener('click', () => Router.go(`/flash/${b.dataset.course}`)));
  $('.deck-chips [aria-pressed="true"]', el)?.scrollIntoView({ inline: 'center', block: 'nearest' });
  const area = $('.deck-area', el);
  const left = $('.deck-left', el);
  let streak = 0;
  // create the audio context inside the gesture so the fling's sound can play afterwards
  area.addEventListener('pointerup', () => Sfx.ac());
  const faces = (card) => {
    const it = card.item;
    const tag = `<span class="sub-tag"><span class="dot ${card.subject}"></span>${esc(Content.courseShort(card.course))}</span>`;
    const front =
      it.kind === 'vocab'
        ? `<p class="fc-term" lang="en">${esc(it.term)}</p>${it.pronunciation ? `<p class="fc-pron">${esc(it.pronunciation)}</p>` : ''}<button class="q-speak" aria-label="Nghe">${SPEAK}</button>`
        : `<p class="fc-front">${it.front}</p>`;
    return `<div class="inner"><div class="face front">${tag}${front}<span class="hint">Chạm để lật</span></div><div class="face back">${card.feedback.summary}</div></div>
      <span class="edge left"><span>Quên</span></span><span class="edge right"><span>Nhớ</span></span><span class="edge up"><span>Dễ</span></span>`;
  };
  const render = () => {
    area.innerHTML = '';
    if (deck.done) {
      area.innerHTML = `<div class="panel" style="position:absolute;inset:0;display:grid;align-content:center;gap:14px;padding:24px;text-align:center"><h2 class="display" style="font-size:24px">Hết bộ thẻ</h2>
        <div class="stats">${[1, 2, 3, 4].map((r) => `<div><b>${deck.counts[r]}</b><span>${RATING_LABEL[r]}</span></div>`).join('')}</div><a class="btn wide" href="#/flash/${courseKey}">Học lại bộ này</a></div>`;
      $('.q-rate', el).hidden = true;
      left.textContent = '';
      return;
    }
    left.textContent = `Còn ${deck.cards.length - deck.index} thẻ`;
    const cards = deck.peek(3);
    cards
      .slice()
      .reverse()
      .forEach((card, ri) => {
        const depth = cards.length - 1 - ri;
        const f = h(`<div class="fcard subject-${card.subject}${depth ? ` under-${depth}` : ''}">${faces(card)}</div>`);
        area.append(f);
        if (depth) return;
        const edges = { left: $('.edge.left', f), right: $('.edge.right', f), up: $('.edge.up', f) };
        $('.q-speak', f)?.addEventListener('click', (e) => (e.stopPropagation(), Speech.say(card.item.term, card.lang)));
        const sw = makeSwipeable(f, {
          onTap: () => (f.classList.toggle('flipped'), Sfx.tick()),
          onDrag: (dx, dy, p) => {
            const up = dy < -20 && Math.abs(dy) > Math.abs(dx);
            edges.right.style.opacity = !up && dx > 0 ? p : 0;
            edges.left.style.opacity = !up && dx < 0 ? p : 0;
            edges.up.style.opacity = up ? Math.min(1, -dy / 160) : 0;
          },
          onSwipe: (dir) => rate(dir === 'right' ? 3 : dir === 'left' ? 1 : 4),
        });
        f._fling = sw.fling;
      });
  };
  const rate = (r) => {
    streak = r > 1 ? streak + 1 : 0;
    Sfx.rating(r, streak);
    buzz(r > 1 ? 10 : [20, 30, 20]);
    deck.rate(r);
    render();
  };
  $$('.q-rate-btn', el).forEach((b) =>
    b.addEventListener('click', () => {
      const top = area.lastElementChild;
      const r = Number(b.dataset.rating);
      if (!top?._fling) return rate(r);
      const dir = r === 1 ? 'left' : r === 4 ? 'up' : 'right';
      const edge = $(`.edge.${dir}`, top);
      if (edge) edge.style.opacity = 1;
      top._fling(dir, () => rate(r));
    }),
  );
  setKeys((e) => {
    const top = area.lastElementChild;
    if (e.key === ' ' && top) (e.preventDefault(), top.classList.toggle('flipped'));
    if (['1', '2', '3', '4'].includes(e.key)) $(`.q-rate-btn[data-rating="${e.key}"]`, el)?.click();
  });
  render();
}

// ───────────── exam
function exam(courseKey) {
  const session = examSession(courseKey);
  const c = CONTENT.courses[courseKey];
  const total = session.deadline - Date.now();
  const short = Content.courseShort(courseKey);
  const C = 2 * Math.PI * 12;
  const el = screen(
    `<div class="stage">
      <div class="s-top" style="grid-template-columns:auto 1fr auto"><a class="icon-btn" href="#/course/${courseKey}" aria-label="Thoát">${I.close}</a><span class="ex-title">Thi thử ${esc(short)}</span>
        <span class="clock"><svg viewBox="0 0 30 30" aria-hidden="true"><circle class="c-bg" cx="15" cy="15" r="12"/><circle class="c-fg" cx="15" cy="15" r="12" stroke-dasharray="${C.toFixed(2)}"/></svg><span class="t"></span></span></div>
      <div class="navq"></div>
      <section class="panel qpanel subject-${c.subject}"><p class="q-label"></p><div class="qbody"></div><p class="saved-note" hidden>Đã lưu đáp án. Có thể đổi trước khi nộp.</p>
        <div class="exam-foot"><button class="btn ghost" data-act="prev">Câu trước</button><button class="btn" data-act="next">Câu sau</button></div></section>
    </div>`,
    { focus: true },
  );
  const navq = $('.navq', el);
  const clock = $('.clock', el);
  const tick = () => {
    const left = Math.max(0, session.deadline - Date.now());
    const m = Math.floor(left / 60000);
    const s = Math.floor((left % 60000) / 1000);
    $('.t', clock).textContent = `${m}:${String(s).padStart(2, '0')}`;
    $('.c-fg', clock).style.strokeDashoffset = (C * (1 - left / total)).toFixed(2);
    clock.classList.toggle('low', left < 120000);
    if (!left) submit();
  };
  tick();
  timer = setInterval(tick, 1000);
  const paintNav = () => {
    navq.innerHTML = session.cards.map((cd, i) => `<button class="${session.results.has(cd.id) ? 'saved' : ''} ${i === session.index ? 'now' : ''}" data-i="${i}" aria-label="Câu ${i + 1}">${i + 1}</button>`).join('');
    $$('button', navq).forEach((b) => b.addEventListener('click', () => (session.goto(Number(b.dataset.i)), show())));
  };
  const show = () => {
    const card = session.current;
    $('.q-label', el).innerHTML = `Câu ${session.index + 1} trên ${session.cards.length}`;
    $('.saved-note', el).hidden = !session.results.has(card.id);
    mountQuestion($('.qbody', el), card, {
      blind: true,
      onCommit: (input) => {
        session.answer(input);
        $('.saved-note', el).hidden = false;
        Sfx.tick();
        paintNav();
      },
    });
    const prior = session.results.get(card.id);
    if (prior?.input?.optionIds) prior.input.optionIds.forEach((id) => $(`.q-opt[data-id="${id}"]`, el)?.classList.add('is-picked'));
    if (prior?.input && 'value' in prior.input) $(`.q-opt[data-value="${prior.input.value}"]`, el)?.classList.add('is-picked');
    const last = session.index === session.cards.length - 1;
    $('[data-act=next]', el).textContent = last ? 'Nộp bài' : 'Câu sau';
    $('[data-act=prev]', el).disabled = session.index === 0;
    paintNav();
  };
  $('[data-act=prev]', el).addEventListener('click', () => (session.goto(session.index - 1), show()));
  $('[data-act=next]', el).addEventListener('click', () => (session.index === session.cards.length - 1 ? submit() : (session.goto(session.index + 1), show())));
  const submit = () => {
    clearInterval(timer);
    const r = session.submit();
    const out = screen(
      `<div class="done" style="max-width:720px">
        <a class="back" href="#/course/${courseKey}" style="justify-self:start">${I.back}${esc(short)}</a>
        ${ring(
          session.cards.map((cd) => {
            const res = session.results.get(cd.id);
            return res ? (res.correct ? 'var(--hit)' : 'var(--miss)') : 'rgba(243,241,255,.16)';
          }),
          `<b>${r.percent}<small>%</small></b><span>${r.correct}/${r.total} câu đúng</span>`,
        )}
        <span class="pass ${r.passed ? 'ok' : 'no'}">${r.passed ? 'Đạt' : 'Chưa đạt'}, cần ${r.pass}%</span>
        <div class="panel" style="padding:18px;width:100%"><div class="dom">${r.domains
          .filter((d) => d.total)
          .map((d) => `<div><span>${esc(d.title)}</span><b>${d.correct}/${d.total}</b><span class="bars">${Array.from({ length: d.total }, (_, i) => `<i class="${i < d.correct ? 'on' : ''}"></i>`).join('')}</span></div>`)
          .join('')}</div></div>
        <a class="btn wide" href="#/exam/${courseKey}">Thi lại</a>
        <h2 class="h2" style="justify-self:start;margin-top:12px">Xem lại từng câu</h2>
        <div class="review"></div>
      </div>`,
      { focus: true },
    );
    r.passed ? Sfx.gold() : Sfx.miss();
    const list = $('.review', out);
    session.cards.forEach((card, i) => {
      const res = session.results.get(card.id);
      const box = h(`<section class="panel qpanel subject-${card.subject}"><p class="q-label">Câu ${i + 1}${res ? '' : ', bỏ trống'}</p><div class="qbody"></div></section>`);
      list.append(box);
      const ctl = mountQuestion($('.qbody', box), card, {});
      ctl.reveal(res || { correct: false }, res?.input || {});
      if (card.feedback.explanation) box.append(h(`<p class="expl">${card.feedback.explanation}</p>`));
    });
  };
  show();
}

// ───────────── routes
Router.on(([page, a, b]) => {
  if (!page) return home();
  if (page === 'courses') return courses();
  if (page === 'course') return course(a);
  if (page === 'lesson') return lessonView(decodeURIComponent(a));
  if (page === 'learn') return learn(a, b ? decodeURIComponent(b) : null);
  if (page === 'flash') return flash(a);
  if (page === 'exam') return exam(a);
  home();
});
Router.start();
