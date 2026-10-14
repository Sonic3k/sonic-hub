/* ───────────── Kính — screens ───────────── */
const appEl = document.getElementById('app');
const navEl = document.getElementById('nav');
const I = {
  next: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.8v14.4a1 1 0 0 0 1.5.86l12-7.2a1 1 0 0 0 0-1.72l-12-7.2A1 1 0 0 0 7 4.8z"/></svg>',
  today: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></svg>',
  quiz: '<svg viewBox="0 0 24 24"><path d="M9.2 9.2a2.8 2.8 0 1 1 4 2.5c-.7.4-1.2.9-1.2 1.7v.6M12 17.4v.1"/></svg>',
  cards: '<svg viewBox="0 0 24 24"><rect x="4" y="7.5" width="12" height="12" rx="2.5"/><path d="M8 7.5V6.5A2 2 0 0 1 10 4.5h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2"/></svg>',
  exam: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="7"/><path d="M12 9.5V13l2.2 2.2M9.5 3h5"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2.5h6"/></svg>',
};
const SPEAK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke-linecap="round"/></svg>';
let timer = null;
let keyHandler = null;

function setKeys(fn) {
  if (keyHandler) removeEventListener('keydown', keyHandler);
  keyHandler = fn;
  if (fn) addEventListener('keydown', fn);
}
/** The sky warms up while an AWS card or course is on screen. */
const setSky = (subject) => (document.body.dataset.sky = subject || '');

function screen(html, { focus = false, tab = null, sky = null } = {}) {
  clearInterval(timer);
  setKeys(null);
  setSky(sky);
  appEl.innerHTML = `<div class="screen${focus ? ' focus' : ''}">${html}</div>`;
  navEl.hidden = focus;
  $$('a[data-tab]', navEl).forEach((a) => a.classList.toggle('on', a.dataset.tab === tab));
  scrollTo(0, 0);
  return appEl.firstElementChild;
}

const glyph = (subject) => esc(Content.subject(subject).prefix.toUpperCase());
const courseTitle = (key) => CONTENT.courses[key].title;
const nowrapCode = (t) => esc(t).replace(/\(([^)]+)\)/, '<span class="nowrap">($1)</span>');
/** Bubbles rising inside an orb. */
const fizz = () =>
  [
    [16, 5, 7.6, 0],
    [31, 3, 9.4, 2.4],
    [47, 7, 6.8, 1.2],
    [62, 4, 8.4, 3.6],
    [76, 6, 7.2, 0.5],
    [40, 3, 10.5, 4.8],
    [86, 3, 9, 2.9],
  ]
    .map(([x, s, d, w]) => `<i class="fizz" style="--x:${x}%;--s:${s * 2}px;--d:${d}s;--w:${w}s"></i>`)
    .join('');

function sourceLine(c) {
  const s = c.source;
  const bits = [`<span class="chip">${SOURCE_LABEL[s.type]}</span>`];
  if (s.name) bits.push(`<span class="chip">${esc(s.name)}</span>`);
  if (s.publisher) bits.push(`<span class="chip">${esc(s.publisher)}</span>`);
  if (s.url) bits.push(`<a class="chip" href="${esc(s.url)}" target="_blank" rel="noopener">Trang nguồn</a>`);
  return bits.join('');
}

function tile(key) {
  const c = CONTENT.courses[key];
  const p = LEARNER.courses[key];
  return `<a class="glass tile subject-${c.subject}" href="#/course/${key}">
    <span class="sphere">${glyph(c.subject)}</span>
    <span><b class="t-title">${esc(c.title)}</b><span class="t-sub">${p.learned}/${p.total} thẻ đã thuộc${p.enrolled ? '' : ', chưa bắt đầu'}</span></span>
    <span class="badge${p.due ? '' : ' zero'}" title="Đến hạn hôm nay">${p.due}</span>
    <span class="tube" aria-hidden="true"><i style="width:${Math.round((p.learned / p.total) * 100)}%"></i></span>
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
      <div><p>Chào buổi tối, ${esc(LEARNER.name)}</p><h1 class="display h1 on-sky">${todayLabel()}</h1></div>
      <span class="streak" title="Chuỗi ngày học liên tiếp"><span class="sphere amber">${LEARNER.streak}</span>ngày liên tiếp</span>
    </header>
    <div class="home">
      <div class="col">
        <section class="hero" aria-label="Ôn hôm nay">
          <div class="orb">${fizz()}<b>${counts.total}</b><span>thẻ hôm nay</span></div>
          <div class="mix"><span class="chip"><b>${counts.reviews}</b> ôn lại</span><span class="chip"><b>${counts.fresh}</b> mới</span><span class="chip">khoảng ${counts.minutes} phút</span></div>
          <a class="btn" href="#/learn/daily">${I.play}Bắt đầu học</a>
          <div class="glass split">${Object.entries(byCourse)
            .map(([k, n]) => `<div><span class="dot ${CONTENT.courses[k].subject}"></span>${esc(courseTitle(k))}<b>${n}</b></div>`)
            .join('')}</div>
        </section>
      </div>
      <div class="col">
        <section class="sec">
          <div class="sec-head"><h2 class="h2">Đọc tiếp</h2></div>
          <a class="glass continue subject-${lc.subject}" href="#/lesson/${encodeURIComponent(lesson.id)}">
            <span class="sphere">${glyph(lc.subject)}</span>
            <span><span class="c-course">${esc(Content.courseShort(lesson.course))}</span><span class="c-title">${esc(lesson.title)}</span></span>
            <span class="round">${I.next}</span>
            <span class="tube" aria-hidden="true"><i style="width:${LEARNER.continueProgress * 100}%"></i></span>
          </a>
        </section>
        <section class="sec">
          <div class="sec-head"><h2 class="h2">Đang học</h2><a class="link small" href="#/courses">Tất cả khóa học</a></div>
          <div class="tiles">${Object.keys(LEARNER.courses).filter((k) => LEARNER.courses[k].enrolled).map(tile).join('')}</div>
        </section>
      </div>
      <div class="col">
        <section class="sec">
          <div class="sec-head"><h2 class="h2">Hay quên</h2></div>
          <div class="glass weak"><ul>${LEARNER.weak
            .map((w) => `<li><span class="dot ${Content.subjectOf(courseOfItem(w.item))}"></span><div><div class="w-term">${esc(Content.label(w.item))}</div><div class="w-facet">${FACET_LABEL[w.facet]}</div></div><span class="w-count">sai ${w.again} lần</span></li>`)
            .join('')}</ul><a class="btn clear wide" href="#/learn/weak">Ôn riêng mấy thẻ này</a></div>
        </section>
        <section class="sec">
          <div class="sec-head"><h2 class="h2">30 ngày qua</h2></div>
          <div class="glass fizzfield">
            <div class="days">${days.map((d, i) => `<span class="${i === days.length - 1 ? 'today' : ''}" title="${d.label}: ${d.n} thẻ"><i class="${d.n ? '' : 'zero'}" style="--k:${Math.sqrt(d.n / max).toFixed(2)}"></i></span>`).join('')}</div>
            <div class="legend"><span>${days[0].label}</span><span>Bóng to là ngày ôn nhiều</span><span>Hôm nay</span></div>
            <div class="pair"><div><b>${LEARNER.streak} ngày</b><span>học liên tiếp</span></div><div><b>${LEARNER.best} ngày</b><span>chuỗi dài nhất</span></div></div>
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
    `<header class="top"><h1 class="display h1 on-sky">Khóa học</h1></header>
    ${CONTENT.subjects
      .map((s) => `<section class="subject-block subject-${s.key}"><h2 class="h2"><span class="dot ${s.key}"></span>${esc(s.title)}</h2><div class="tiles">${s.courses.map(tile).join('')}</div></section>`)
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
        <section class="glass course-head">
          <div class="k"><span class="sphere">${glyph(c.subject)}</span>${esc(Content.subject(c.subject).title)}</div>
          <h1 class="display">${nowrapCode(c.title)}</h1>
          ${c.description ? `<p class="desc">${esc(c.description)}</p>` : ''}
          <div class="source">${sourceLine(c)}</div>
          <div class="switch-row"><div><strong>Đang học khóa này</strong><div class="muted small">${p.learned}/${p.total} thẻ đã thuộc, ${p.due} thẻ đến hạn hôm nay</div></div><button class="switch" role="switch" aria-checked="${p.enrolled}" aria-label="Đang học khóa này"></button></div>
          ${c.include ? `<p class="muted small" style="margin:14px 0 0">Khóa gom: lấy thẻ từ ${c.include.flatMap((r) => r.courses).map((k) => esc(courseTitle(k))).join(' và ')}. Trả lời ở đây cũng được tính cho khóa gốc.</p>` : ''}
        </section>
      </div>
      <div>
        <div class="modes">
          <a class="glass mode" href="#/learn/daily"><span class="sphere grass">${I.today}</span><div><b>Ôn hôm nay</b><span>${p.due} đến hạn, ${Math.min(p.fresh, c.policy?.new_per_day ?? 10)} mới</span></div></a>
          ${first ? `<a class="glass mode" href="#/learn/lesson/${encodeURIComponent(first)}"><span class="sphere aqua">${I.quiz}</span><div><b>Quiz</b><span>Hỏi ngẫu nhiên, không cần học trước</span></div></a>` : ''}
          <a class="glass mode" href="#/flash/${key}"><span class="sphere sky">${I.cards}</span><div><b>Thẻ</b><span>Lật và vuốt</span></div></a>
          ${c.exam ? `<a class="glass mode" href="#/exam/${key}"><span class="sphere amber">${I.exam}</span><div><b>Thi thử</b><span>${c.exam.questions} câu, ${c.exam.minutes} phút</span></div></a>` : ''}
        </div>
        ${c.chapters
          .map(
            (ch) => `<section class="chapter"><h2 class="h2">${esc(ch.title)}</h2>${ch.description ? `<p>${esc(ch.description)}</p>` : ''}
            ${ch.lessons
              .map((id) => {
                const l = CONTENT.lessons[id];
                const what = [l.body && 'Bài đọc', l.slides && 'Slide', `${l.items.length} thẻ`].filter(Boolean);
                return `<a class="glass lesson-row" href="#/lesson/${encodeURIComponent(id)}"><div><h4>${esc(l.title)}</h4><div class="tags">${what.map((w) => `<span>${w}</span>`).join('')}</div></div><span class="round">${I.next}</span></a>`;
              })
              .join('')}</section>`,
          )
          .join('')}
        ${!c.chapters.length ? `<p class="glass" style="padding:16px 18px;margin:0">Khóa gom không có bài học riêng — học bằng Thẻ hoặc Ôn hôm nay.</p>` : ''}
      </div>
    </div>`,
    { tab: 'courses', sky: c.subject },
  );
  const sw = $('.switch', el);
  sw.addEventListener('click', () => {
    p.enrolled = !p.enrolled;
    sw.setAttribute('aria-checked', p.enrolled);
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
      <h1 class="display on-sky">${esc(l.title)}</h1>
      ${l.summary ? `<p>${esc(l.summary)}</p>` : ''}
    </header>
    <div class="lesson-wrap subject-${c.subject}">
      <div>
        <div class="tabs" role="tablist">${tabs.map(([k, t], i) => `<button role="tab" data-tab="${k}" aria-selected="${i === 0}">${t}</button>`).join('')}</div>
        <div id="panel"></div>
        <div class="sticky-cta mobile-only"><a class="btn" href="${quizHref}">${I.play}Quiz phần này</a></div>
      </div>
      <aside class="lesson-side desktop-only">
        <div class="glass" style="padding:20px"><h2 class="h2">Quiz phần này</h2><p class="muted small">Câu hỏi về ${l.items.length} thẻ trong bài. Không cần đọc hết trước.</p><a class="btn wide" href="${quizHref}">${I.play}Bắt đầu quiz</a></div>
        <div class="glass" style="padding:16px 18px"><h2 class="h2" style="margin-bottom:6px">Trong bài</h2>${l.items.map((k) => `<div style="padding:8px 0;border-bottom:1px solid var(--line);font-size:14.5px;font-weight:700">${esc(Content.label(k))}</div>`).join('')}</div>
      </aside>
    </div>`,
    { tab: 'courses', sky: c.subject },
  );
  const panel = $('#panel', el);
  const show = (k) => {
    $$('.tabs button', el).forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === k));
    setKeys(null);
    if (k === 'read') panel.innerHTML = `<article class="glass sheet"><div class="reading">${l.body}</div></article>`;
    if (k === 'slides') {
      panel.innerHTML = `<div class="glass slides-frame"><div class="slides-host" tabindex="0" aria-label="Slide, chạm để xem tiếp"></div>
        <div class="slides-bar"><button class="round" data-act="prev" aria-label="Lùi">${I.prev}</button><div class="pager"></div><button class="round" data-act="next" aria-label="Tiếp">${I.next}</button></div></div>`;
      const host = $('.slides-host', panel);
      const pager = $('.pager', panel);
      const deck = mountSlides(host, l, {
        onChange: (s) => (pager.innerHTML = Array.from({ length: s.count }, (_, i) => `<i class="${i === s.index ? 'on' : ''}"></i>`).join('')),
      });
      host.addEventListener('click', () => deck.next());
      $('[data-act=next]', panel).addEventListener('click', () => deck.next());
      $('[data-act=prev]', panel).addEventListener('click', () => deck.prev());
      setKeys((e) => {
        if (e.key === 'ArrowRight' || e.key === ' ') (e.preventDefault(), deck.next());
        if (e.key === 'ArrowLeft') deck.prev();
      });
    }
    if (k === 'cards') {
      panel.innerHTML = `<p class="skim-note">Xem lướt: các thẻ đã xem sẽ được đưa vào Hôm nay trước.</p><div class="skim">${l.items
        .map((key) => {
          const it = CONTENT.items[key];
          const note = it.notes?.[l.course];
          const noteHtml = note ? `<div class="note">${note}</div>` : '';
          return it.kind === 'vocab'
            ? `<div class="glass subject-${c.subject}"><p class="t" lang="en"><span class="dot ${c.subject}"></span>${esc(it.term)}</p><p class="m">${esc(it.meaning)}</p>${noteHtml}</div>`
            : `<div class="glass subject-${c.subject}"><p class="t concept">${it.front}</p>${noteHtml}</div>`;
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
      <div class="s-top"><a class="round" href="${back}" aria-label="Thoát">${I.close}</a><div class="bubbles" role="img"></div><span class="s-count"></span></div>
      <section class="glass qcard" aria-live="polite"><p class="q-label"></p><div class="qbody"></div></section>
      <div class="fbslot"></div>
    </div>`,
    { focus: true },
  );
  const bubbles = $('.bubbles', el);
  const count = $('.s-count', el);
  const qcard = $('.qcard', el);
  const label = $('.q-label', el);
  const slot = $('.fbslot', el);
  const paint = (popIndex = -1) => {
    bubbles.innerHTML = session.cards
      .map((c, i) => {
        const r = session.results.get(c.id);
        const cls = r ? (r.correct ? 'hit' : 'miss') : i === session.index ? 'now' : '';
        return `<i class="${cls}${i === popIndex ? ' pop' : ''}"></i>`;
      })
      .join('');
    const n = Math.min(session.index + 1, session.cards.length);
    count.textContent = `${n}/${session.cards.length}`;
    bubbles.setAttribute('aria-label', `Câu ${n} trên ${session.cards.length}`);
  };
  const showCard = () => {
    const card = session.current;
    if (!card) return finish();
    slot.innerHTML = '';
    setSky(card.subject);
    qcard.className = `glass qcard subject-${card.subject}`;
    label.innerHTML = `<span class="dot ${card.subject}"></span>${FACET_LABEL[card.facet]}, ${esc(Content.courseShort(card.course))}${card.isNew ? '<span class="tag new">Mới</span>' : ''}${card.isRequeue ? '<span class="tag again">Hỏi lại</span>' : ''}`;
    paint();
    const ctl = mountQuestion($('.qbody', qcard), card, {
      onCommit: (input) => {
        const at = session.index;
        const res = session.answer(input);
        paint(at);
        if (card.key.kind === 'flashcard') {
          setTimeout(() => (session.next(), showCard()), 650);
          return;
        }
        ctl.reveal(res, input);
        if (!res.correct) {
          qcard.classList.remove('nudge');
          void qcard.offsetWidth;
          qcard.classList.add('nudge');
        }
        feedback(card, res);
      },
    });
    if (session.index > 0) scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
    setKeys((e) => {
      if (e.target.matches('input')) return;
      const n = Number(e.key);
      const opts = $$('.q-opt:not(:disabled)', qcard);
      if (n >= 1 && n <= opts.length && card.view.type === 'single') opts[n - 1].click();
      if (e.key === ' ' && card.view.type === 'flashcard') (e.preventDefault(), ctl.flip());
    });
  };
  const feedback = (card, res) => {
    const verdict = res.correct ? (res.typo ? 'Gần đúng' : 'Chính xác') : 'Chưa đúng';
    slot.innerHTML = `<section class="glass fb ${res.correct ? 'ok' : 'no'} subject-${card.subject}">
      <header class="fb-band"><span class="fb-ico" aria-hidden="true">${res.correct ? '✓' : '✕'}</span><b>${verdict}</b><span class="fb-next">Ôn lại sau ${res.next}</span></header>
      <div class="fb-body">
        ${card.feedback.explanation ? `<p class="expl">${card.feedback.explanation}</p>` : ''}
        <div class="summary">${card.feedback.summary}</div>
        ${res.requeuedAt ? '<p class="requeue">Thẻ này sẽ quay lại sau vài câu nữa.</p>' : ''}
        <button class="btn wide" type="button">Tiếp</button>
      </div>
    </section>`;
    const fb = $('.fb', slot);
    const btn = $('.btn', fb);
    btn.addEventListener('click', () => (session.next(), showCard()));
    btn.focus({ preventScroll: true });
    setKeys((e) => e.key === 'Enter' && (e.preventDefault(), btn.click()));
    // show as much of the feedback as fits, keeping the end of the question in view
    requestAnimationFrame(() => {
      const r = fb.getBoundingClientRect();
      const want = Math.min(r.height + 16, innerHeight * 0.78);
      const delta = r.top - (innerHeight - want);
      if (delta > 0) scrollBy({ top: delta, behavior: reduceMotion() ? 'auto' : 'smooth' });
    });
  };
  const finish = () => {
    const s = session.summary();
    screen(
      `<div class="done">
        <div class="orb">${fizz()}<b>${s.correct}<small>/${s.total}</small></b><span>đúng ngay lần đầu</span></div>
        <h1 class="display h1">${kind === 'lesson' ? 'Xong quiz' : 'Xong phần hôm nay'}</h1>
        <div class="glass bubbles" aria-hidden="true">${s.beats.map((b) => `<i class="${b ? 'hit' : 'miss'}"></i>`).join('')}</div>
        <div class="pair">
          <div><b>${s.maxCombo} câu</b><span>đúng liền một mạch</span></div>
          <div><b>${s.fresh} thẻ</b><span>mới đã học</span></div>
          <div><b>${s.again} lần</b><span>hỏi lại trong buổi</span></div>
          <div><b>${LEARNER.tomorrow} thẻ</b><span>cần ôn ngày mai</span></div>
        </div>
        <a class="btn wide" href="#/">Về trang chính</a>
      </div>`,
      { focus: true },
    );
  };
  showCard();
}

// ───────────── flashcards
function flash(courseKey = 'english-all-flashcards') {
  const deck = new Deck(courseKey);
  const el = screen(
    `<header class="deck-head"><h1 class="display h1 on-sky">Thẻ</h1><p>Chạm để lật. Vuốt phải là nhớ, trái là quên, lên là dễ.</p></header>
    <div class="deck-chips">${Content.coursesInOrder()
      .map((c) => `<button aria-pressed="${c.key === courseKey}" data-course="${c.key}"><span class="dot ${c.subject}"></span>${esc(Content.courseShort(c.key))}</button>`)
      .join('')}</div>
    <div class="deck-area"></div>
    <div class="deck-actions"><p class="deck-left"></p><div class="q-rate">${[1, 2, 3, 4].map((r) => `<button class="q-rate-btn" data-rating="${r}"><span class="q-rate-label">${RATING_LABEL[r]}</span><span class="q-rate-next">${DEFAULT_NEXT.review[r]}</span></button>`).join('')}</div></div>`,
    { tab: 'flash', sky: CONTENT.courses[courseKey].subject },
  );
  $$('.deck-chips button', el).forEach((b) => b.addEventListener('click', () => Router.go(`/flash/${b.dataset.course}`)));
  $('.deck-chips [aria-pressed="true"]', el)?.scrollIntoView({ inline: 'center', block: 'nearest' });
  const area = $('.deck-area', el);
  const left = $('.deck-left', el);
  const faces = (card) => {
    const it = card.item;
    const tag = `<span class="sub-tag"><span class="dot ${card.subject}"></span>${esc(Content.courseShort(card.course))}</span>`;
    const front =
      it.kind === 'vocab'
        ? `<p class="fc-term" lang="en">${esc(it.term)}</p>${it.pronunciation ? `<p class="fc-pron">${esc(it.pronunciation)}</p>` : ''}<button class="q-speak" aria-label="Nghe">${SPEAK}</button>`
        : `<p class="fc-front">${it.front}</p>`;
    return `<div class="inner"><div class="face front">${tag}${front}<span class="hint">Chạm để lật</span></div><div class="face back">${card.feedback.summary}</div></div>
      <span class="gbadge left">Quên</span><span class="gbadge right">Nhớ</span><span class="gbadge up">Dễ</span>`;
  };
  const render = () => {
    area.innerHTML = '';
    if (deck.done) {
      area.innerHTML = `<div class="glass" style="position:absolute;inset:0;display:grid;align-content:center;gap:14px;padding:24px;text-align:center"><h2 class="display" style="font-size:26px">Hết bộ thẻ</h2>
        <div class="pair">${[1, 2, 3, 4].map((r) => `<div><b>${deck.counts[r]}</b><span>${RATING_LABEL[r]}</span></div>`).join('')}</div><a class="btn wide" href="#/flash/${courseKey}">Học lại bộ này</a></div>`;
      $('.q-rate', el).hidden = true;
      left.textContent = '';
      return;
    }
    left.textContent = `Còn ${deck.cards.length - deck.index} thẻ`;
    const cards = deck.peek(3);
    setSky(cards[0].subject);
    cards
      .slice()
      .reverse()
      .forEach((card, ri) => {
        const depth = cards.length - 1 - ri;
        const f = h(`<div class="fcard subject-${card.subject}${depth ? ` under-${depth}` : ''}">${faces(card)}</div>`);
        area.append(f);
        if (depth) return;
        const badges = { left: $('.gbadge.left', f), right: $('.gbadge.right', f), up: $('.gbadge.up', f) };
        $('.q-speak', f)?.addEventListener('click', (e) => (e.stopPropagation(), Speech.say(card.item.term, card.lang)));
        const sw = makeSwipeable(f, {
          onTap: () => f.classList.toggle('flipped'),
          onDrag: (dx, dy, p) => {
            const up = dy < -20 && Math.abs(dy) > Math.abs(dx);
            badges.right.style.opacity = !up && dx > 0 ? p : 0;
            badges.left.style.opacity = !up && dx < 0 ? p : 0;
            badges.up.style.opacity = up ? Math.min(1, -dy / 160) : 0;
            // the glare slides across the glass as the card tilts
            f.style.setProperty('--hx', `${(32 + (dx / (f.offsetWidth || 300)) * 70).toFixed(1)}%`);
            f.style.setProperty('--hy', `${Math.max(-20, Math.min(40, (dy / (f.offsetHeight || 400)) * 60)).toFixed(1)}%`);
          },
          onSwipe: (dir) => rate(dir === 'right' ? 3 : dir === 'left' ? 1 : 4),
        });
        f._fling = sw.fling;
      });
  };
  const rate = (r) => {
    deck.rate(r);
    render();
  };
  $$('.q-rate-btn', el).forEach((b) =>
    b.addEventListener('click', () => {
      const top = area.lastElementChild;
      const r = Number(b.dataset.rating);
      if (!top?._fling) return rate(r);
      const dir = r === 1 ? 'left' : r === 4 ? 'up' : 'right';
      const badge = $(`.gbadge.${dir}`, top);
      if (badge) badge.style.opacity = 1;
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
  const short = Content.courseShort(courseKey);
  const el = screen(
    `<div class="stage">
      <div class="s-top"><a class="round" href="#/course/${courseKey}" aria-label="Thoát">${I.close}</a><span class="ex-title">Thi thử ${esc(short)}</span><span class="timer">${I.clock}<span class="t"></span></span></div>
      <div class="navq"></div>
      <section class="glass qcard subject-${c.subject}"><p class="q-label"></p><div class="qbody"></div><p class="saved-note" hidden>Đã lưu đáp án. Có thể đổi trước khi nộp.</p>
        <div class="exam-foot"><button class="btn clear" data-act="prev">Câu trước</button><button class="btn" data-act="next">Câu sau</button></div></section>
    </div>`,
    { focus: true, sky: c.subject },
  );
  const navq = $('.navq', el);
  const timerEl = $('.timer', el);
  const tick = () => {
    const left = Math.max(0, session.deadline - Date.now());
    const m = Math.floor(left / 60000);
    const s = Math.floor((left % 60000) / 1000);
    $('.t', timerEl).textContent = `${m}:${String(s).padStart(2, '0')}`;
    timerEl.classList.toggle('low', left < 120000);
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
        <div class="orb ${r.passed ? 'pass' : 'fail'}">${fizz()}<b>${r.percent}<small>%</small></b><span>${r.correct}/${r.total} câu đúng</span></div>
        <span class="pass ${r.passed ? 'ok' : 'no'}">${r.passed ? 'Đạt' : 'Chưa đạt'}, cần ${r.pass}%</span>
        <div class="glass" style="padding:18px;width:100%"><div class="dom">${r.domains
          .filter((d) => d.total)
          .map((d) => `<div><span>${esc(d.title)}</span><b>${d.correct}/${d.total}</b><span class="tube grass"><i style="width:${(d.correct / d.total) * 100}%"></i></span></div>`)
          .join('')}</div></div>
        <a class="btn wide" href="#/exam/${courseKey}">Thi lại</a>
        <h2 class="h2 sky-label" style="justify-self:start;margin-top:10px">Xem lại từng câu</h2>
        <div class="review"></div>
      </div>`,
      { focus: true, sky: c.subject },
    );
    const list = $('.review', out);
    session.cards.forEach((card, i) => {
      const res = session.results.get(card.id);
      const box = h(`<section class="glass qcard subject-${card.subject}"><p class="q-label">Câu ${i + 1}${res ? '' : ', bỏ trống'}</p><div class="qbody"></div></section>`);
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
