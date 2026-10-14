/* ───────────── Bàn học — screens ───────────── */
const appEl = document.getElementById('app');
const navEl = document.getElementById('nav');
const I = {
  next: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  today: '<svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="13" rx="2"/><path d="M8 3v5M16 3v5M4 11h16"/></svg>',
  quiz: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17.2v.1"/></svg>',
  cards: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="14" height="12" rx="2"/><path d="M7 7V5.5A1.5 1.5 0 0 1 8.5 4h11A1.5 1.5 0 0 1 21 5.5v10a1.5 1.5 0 0 1-1.5 1.5H17"/></svg>',
  exam: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>',
};
let timer = null;
let keyHandler = null;

function setKeys(fn) {
  if (keyHandler) removeEventListener('keydown', keyHandler);
  keyHandler = fn;
  if (fn) addEventListener('keydown', fn);
}

function screen(html, { focus = false, tab = null } = {}) {
  clearInterval(timer);
  setKeys(null);
  appEl.innerHTML = `<div class="screen${focus ? ' focus' : ''}">${html}</div>`;
  navEl.hidden = focus;
  $$('a', navEl).forEach((a) => a.classList.toggle('on', a.dataset.tab === tab));
  scrollTo(0, 0);
  return appEl.firstElementChild;
}

const subjectTitle = (key) => Content.subject(key).title;
const courseTitle = (key) => CONTENT.courses[key].title;
function strip(parts) {
  const total = parts.reduce((s, p) => s + p.n, 0) || 1;
  return `<span class="strip">${parts.map((p) => `<i style="width:${(p.n / total) * 100}%;background:var(--${p.subject === 'aws' ? 'aws' : 'en'})"></i>`).join('')}</span>`;
}
function sourceLine(c) {
  const s = c.source;
  const bits = [`<span class="pill">${SOURCE_LABEL[s.type]}</span>`];
  if (s.name) bits.push(`<span class="pill">${esc(s.name)}</span>`);
  if (s.publisher) bits.push(`<span class="pill">${esc(s.publisher)}</span>`);
  if (s.url) bits.push(`<a class="pill" href="${esc(s.url)}" target="_blank" rel="noopener">Trang nguồn</a>`);
  return bits.join('');
}

function binder(key) {
  const c = CONTENT.courses[key];
  const p = LEARNER.courses[key];
  const segs = 12;
  const on = Math.round((p.learned / p.total) * segs);
  return `<a class="card binder subject-${c.subject}" href="#/course/${key}">
    <span class="tab-color"></span>
    <div><h3>${esc(c.title)}</h3><p>${p.learned}/${p.total} thẻ đã thuộc${p.enrolled ? '' : ', chưa bắt đầu'}</p>
      <div class="meter">${Array.from({ length: segs }, (_, i) => `<i class="${i < on ? 'on' : ''}"></i>`).join('')}</div></div>
    <span class="due${p.due ? '' : ' zero'}" title="Đến hạn hôm nay">${p.due}</span>
  </a>`;
}

// ───────────── home
function home() {
  const counts = dailyCounts();
  const bySubject = ['english', 'aws'].map((s) => ({ subject: s, n: DAILY.filter((d) => Content.subjectOf(d.course) === s).length }));
  const byCourse = {};
  DAILY.forEach((d) => (byCourse[d.course] = (byCourse[d.course] || 0) + 1));
  const days = heatDays();
  const week = days.slice(-7);
  const lesson = CONTENT.lessons[LEARNER.continueLesson];
  const lvl = (n) => (n === 0 ? '' : n < 8 ? 'l1' : n < 13 ? 'l2' : n < 18 ? 'l3' : 'l4');
  screen(
    `<header class="top">
      <div><p class="muted small" style="margin:0">Chào buổi tối, ${esc(LEARNER.name)}</p><h1 class="display h1">${todayLabel()}</h1></div>
      <div class="week" title="7 ngày qua">${week.map((d, i) => `<span class="${d.n ? '' : 'off'}${i === 6 ? ' today' : ''}" title="${d.label}">${d.n ? '✓' : d.day.getDate()}</span>`).join('')}</div>
    </header>
    <div class="home">
      <div class="col">
        <section class="stack" aria-label="Ôn hôm nay">
          <div class="card">${strip(bySubject)}
            <div class="count"><b>${counts.total}</b><span>thẻ cần ôn hôm nay</span></div>
            <div class="mix"><span class="pill"><b>${counts.reviews}</b> ôn lại</span><span class="pill"><b>${counts.fresh}</b> mới</span><span class="pill">khoảng ${counts.minutes} phút</span></div>
            <div class="subjects">${Object.entries(byCourse).map(([k, n]) => `<div><span class="dot ${CONTENT.courses[k].subject}"></span>${esc(courseTitle(k))}<b>${n}</b></div>`).join('')}</div>
            <a class="btn wide" href="#/learn/daily">Bắt đầu học</a>
          </div>
        </section>
        <section class="sec">
          <div class="sec-head"><h2 class="h2">Đọc tiếp</h2></div>
          <a class="card continue subject-aws" href="#/lesson/${encodeURIComponent(lesson.id)}">
            <div><p class="muted small" style="margin:0">${esc(courseTitle(lesson.course))}</p><strong style="font-size:16.5px">${esc(lesson.title)}</strong></div>
            <span class="go">${I.next}</span>
            <span class="bar"><i style="width:${LEARNER.continueProgress * 100}%"></i></span>
          </a>
        </section>
        <section class="sec">
          <div class="sec-head"><h2 class="h2">Đang học</h2><a class="link small" href="#/courses">Tất cả khóa học</a></div>
          <div class="binders">${Object.keys(LEARNER.courses).filter((k) => LEARNER.courses[k].enrolled).map(binder).join('')}</div>
        </section>
      </div>
      <div class="col">
        <section class="sec">
          <div class="sec-head"><h2 class="h2">Hay quên</h2></div>
          <div class="card weak"><ul>${LEARNER.weak
            .map((w) => `<li><span class="dot ${Content.subjectOf(courseOfItem(w.item))}"></span><div><div class="w-term">${esc(Content.label(w.item))}</div><div class="w-facet">${FACET_LABEL[w.facet]}</div></div><span class="w-count">sai ${w.again} lần</span></li>`)
            .join('')}</ul><a class="btn ghost wide" href="#/learn/weak">Ôn riêng mấy thẻ này</a></div>
        </section>
        <section class="sec">
          <div class="sec-head"><h2 class="h2">30 ngày qua</h2></div>
          <div class="card heat"><p class="muted small" style="margin:0">Mỗi ô là một ngày, đậm hơn là ôn nhiều thẻ hơn.</p>
            <div class="heat-grid">${days.map((d, i) => `<i class="${lvl(d.n)}${i === days.length - 1 ? ' today' : ''}" title="${d.label}: ${d.n} thẻ"></i>`).join('')}</div>
            <div class="heat-foot"><span>${LEARNER.streak} ngày liên tiếp</span><span>Kỷ lục ${LEARNER.best} ngày</span></div>
          </div>
        </section>
      </div>
    </div>`,
    { tab: 'home' },
  );
}

function courseOfItem(itemKey) {
  return Object.values(CONTENT.courses).find((c) => !c.include && c.items.includes(itemKey)).key;
}

// ───────────── courses
function courses() {
  screen(
    `<header class="top"><h1 class="display h1">Khóa học</h1></header>
    ${CONTENT.subjects
      .map((s) => `<section class="subject-block"><h2 class="h2">${esc(s.title)}</h2><div class="binders">${s.courses.map(binder).join('')}</div></section>`)
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
        <section class="card course-head">${strip([{ subject: c.subject, n: 1 }])}
          <p class="muted small" style="margin:0">${esc(subjectTitle(c.subject))}</p>
          <h1 class="display h1" style="margin-top:4px">${esc(c.title)}</h1>
          ${c.description ? `<p class="desc">${esc(c.description)}</p>` : ''}
          <div class="source">${sourceLine(c)}</div>
          <div class="switch-row"><div><strong>Đang học khóa này</strong><div class="muted small">${p.learned}/${p.total} thẻ đã thuộc, ${p.due} thẻ đến hạn hôm nay</div></div><button class="switch" role="switch" aria-checked="${p.enrolled}" aria-label="Đang học khóa này"></button></div>
          ${c.include ? `<p class="muted small" style="margin:14px 0 0">Khóa gom: lấy thẻ từ ${c.include.flatMap((r) => r.courses).map((k) => esc(courseTitle(k))).join(' và ')}. Trả lời ở đây cũng được tính cho khóa gốc.</p>` : ''}
        </section>
      </div>
      <div>
        <div class="modes">
          <a class="card mode" href="#/learn/daily">${I.today}<b>Ôn hôm nay</b><span>${p.due + p.fresh > 0 ? `${p.due} đến hạn, ${Math.min(p.fresh, c.policy?.new_per_day ?? 10)} mới` : 'Đã xong'}</span></a>
          ${first ? `<a class="card mode" href="#/learn/lesson/${encodeURIComponent(first)}">${I.quiz}<b>Quiz</b><span>Hỏi ngẫu nhiên, không cần học trước</span></a>` : ''}
          <a class="card mode" href="#/flash/${key}">${I.cards}<b>Thẻ</b><span>Lật và vuốt</span></a>
          ${c.exam ? `<a class="card mode" href="#/exam/${key}">${I.exam}<b>Thi thử</b><span>${c.exam.questions} câu, ${c.exam.minutes} phút</span></a>` : ''}
        </div>
        ${c.chapters
          .map(
            (ch) => `<section class="chapter"><h2 class="h2">${esc(ch.title)}</h2>${ch.description ? `<p>${esc(ch.description)}</p>` : ''}
            ${ch.lessons
              .map((id) => {
                const l = CONTENT.lessons[id];
                const what = [l.body && 'Bài đọc', l.slides && 'Slide', `${l.items.length} thẻ`].filter(Boolean);
                return `<a class="card lesson-row" href="#/lesson/${encodeURIComponent(id)}"><div><h4>${esc(l.title)}</h4><div class="what">${what.map((w) => `<span>${w}</span>`).join('')}</div></div><span class="row-go">${I.next}</span></a>`;
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
  });
}

// ───────────── lesson
function lessonView(id) {
  const l = CONTENT.lessons[id];
  const c = CONTENT.courses[l.course];
  const tabs = [l.body && ['read', 'Bài đọc'], l.slides && ['slides', 'Slide'], ['cards', `Thẻ (${l.items.length})`]].filter(Boolean);
  const el = screen(
    `<a class="back" href="#/course/${l.course}">${I.back}${esc(Content.courseShort(l.course))}</a>
    <header class="lesson-head subject-${c.subject}">
      <span class="course-name"><span class="dot ${c.subject}"></span>${esc(l.chapter)}</span>
      <h1 class="display h1">${esc(l.title)}</h1>
      ${l.summary ? `<p>${esc(l.summary)}</p>` : ''}
    </header>
    <div class="lesson-wrap subject-${c.subject}">
      <div>
        <div class="seg" role="tablist">${tabs.map(([k, t], i) => `<button role="tab" data-tab="${k}" aria-selected="${i === 0}">${t}</button>`).join('')}</div>
        <div id="panel"></div>
        <div class="sticky-cta mobile-only"><a class="btn" href="#/learn/lesson/${encodeURIComponent(id)}">Quiz phần này</a></div>
      </div>
      <aside class="lesson-side desktop-only">
        <div class="card" style="padding:20px"><h2 class="h2">Quiz phần này</h2><p class="muted small">Câu hỏi về ${l.items.length} thẻ trong bài. Không cần đọc hết trước.</p><a class="btn wide" href="#/learn/lesson/${encodeURIComponent(id)}">Bắt đầu quiz</a></div>
        <div class="card" style="padding:16px 18px"><h2 class="h2" style="font-size:18px;margin-bottom:6px">Trong bài</h2>${l.items.map((k) => `<div style="padding:7px 0;border-bottom:1px solid var(--rule);font-size:14.5px">${esc(Content.label(k))}</div>`).join('')}</div>
      </aside>
    </div>`,
    { tab: 'courses' },
  );
  const style = document.createElement('style');
  style.textContent = `@media (min-width: 960px) { .mobile-only { display: none !important; } } @media (max-width: 959px) { .desktop-only { display: none !important; } }`;
  el.append(style);
  const panel = $('#panel', el);
  const show = (k) => {
    $$('.seg button', el).forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === k));
    setKeys(null);
    if (k === 'read') panel.innerHTML = `<article class="card sheet"><div class="reading">${l.body}</div></article>`;
    if (k === 'slides') {
      panel.innerHTML = `<div class="card slides-frame"><div class="slides-host" tabindex="0" aria-label="Slide, chạm để xem tiếp"></div>
        <div class="slides-bar"><button class="round" data-act="prev" aria-label="Lùi">${I.prev}</button><div class="dots"></div><button class="round" data-act="next" aria-label="Tiếp">${I.next}</button></div></div>`;
      const host = $('.slides-host', panel);
      const dots = $('.dots', panel);
      const deck = mountSlides(host, l, {
        onChange: (s) => (dots.innerHTML = Array.from({ length: s.count }, (_, i) => `<i class="${i === s.index ? 'on' : ''}"></i>`).join('')),
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
      panel.innerHTML = `<p class="muted small" style="margin:0 0 12px">Xem lướt: các thẻ đã xem sẽ được đưa vào Hôm nay trước.</p><div class="skim">${l.items
        .map((key) => {
          const it = CONTENT.items[key];
          const note = it.notes?.[l.course];
          const sub = CONTENT.courses[l.course].subject;
          return it.kind === 'vocab'
            ? `<div class="card subject-${sub}">${strip([{ subject: sub, n: 1 }])}<p class="t">${esc(it.term)}</p><p class="m">${esc(it.meaning)}</p>${note ? `<p class="note">${note}</p>` : ''}</div>`
            : `<div class="card subject-${sub}">${strip([{ subject: sub, n: 1 }])}<p class="t concept">${it.front}</p>${note ? `<p class="note">${note}</p>` : ''}</div>`;
        })
        .join('')}</div>`;
    }
  };
  $$('.seg button', el).forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
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
    `<div class="s-top"><a class="round" href="${back}" aria-label="Thoát">${I.close}</a><div class="ticks" aria-hidden="true"></div><span class="s-count"></span></div>
    <div class="s-layout"><section class="card qcard" aria-live="polite"><span class="strip"></span><p class="q-label"></p><div class="qbody"></div></section><div class="side"></div></div>`,
    { focus: true },
  );
  const ticks = $('.ticks', el);
  const count = $('.s-count', el);
  const qcard = $('.qcard', el);
  const side = $('.side', el);
  const paintTicks = () => {
    ticks.innerHTML = session.cards
      .map((c, i) => {
        const r = session.results.get(c.id);
        return `<i class="${i === session.index ? 'now' : ''} ${r ? (r.correct ? 'ok' : 'no') : ''}">${r ? (r.correct ? '✓' : '✗') : ''}</i>`;
      })
      .join('');
    count.textContent = `${Math.min(session.index + 1, session.cards.length)}/${session.cards.length}`;
  };
  const showCard = () => {
    const card = session.current;
    if (!card) return finish();
    side.innerHTML = '';
    qcard.className = `card qcard subject-${card.subject}`;
    $('.strip', qcard).outerHTML = strip([{ subject: card.subject, n: 1 }]);
    $('.q-label', qcard).innerHTML = `<span class="dot ${card.subject}"></span>${FACET_LABEL[card.facet]}, ${esc(Content.courseShort(card.course))}${card.isNew ? ' <span class="new">thẻ mới</span>' : ''}${card.isRequeue ? ' <span class="again">hỏi lại</span>' : ''}`;
    paintTicks();
    const ctl = mountQuestion($('.qbody', qcard), card, {
      onCommit: (input) => {
        const res = session.answer(input);
        if (card.key.kind === 'flashcard') {
          paintTicks();
          side.innerHTML = `<div class="card note"><span class="stamp"><span>${RATING_LABEL[input.rating]}</span><b>${res.next}</b></span></div>`;
          setTimeout(() => (session.next(), showCard()), 650);
          return;
        }
        ctl.reveal(res, input);
        paintTicks();
        note(card, res);
      },
    });
    setKeys((e) => {
      if (e.target.matches('input')) return;
      const n = Number(e.key);
      const opts = $$('.q-opt:not(:disabled)', qcard);
      if (n >= 1 && n <= opts.length && card.view.type === 'single') opts[n - 1].click();
      if (e.key === ' ' && card.view.type === 'flashcard') (e.preventDefault(), ctl.flip());
    });
  };
  const note = (card, res) => {
    const verdict = res.correct ? (res.typo ? 'Đúng rồi, chỉ sai chính tả chút xíu' : 'Đúng rồi') : 'Chưa đúng';
    side.innerHTML = `<div class="card note subject-${card.subject}">
      <p class="verdict ${res.correct ? 'ok' : 'no'}">${verdict}</p>
      ${card.feedback.explanation ? `<p class="expl">${card.feedback.explanation}</p>` : ''}
      <div class="summary">${card.feedback.summary}</div>
      ${res.requeuedAt ? `<p class="requeue">Thẻ này sẽ quay lại sau vài câu nữa.</p>` : ''}
      <div class="foot"><span class="stamp"><span>Ôn lại sau</span><b>${res.next}</b></span><button class="btn" id="next">Tiếp</button></div>
    </div>`;
    const btn = $('#next', side);
    btn.addEventListener('click', () => (session.next(), showCard()));
    btn.focus({ preventScroll: true });
    if (innerWidth < 960) side.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
    setKeys((e) => e.key === 'Enter' && (e.preventDefault(), btn.click()));
  };
  const finish = () => {
    const s = session.summary();
    screen(
      `<div class="card done-card" style="max-width:560px;margin:4vh auto 0">${strip([{ subject: 'english', n: 2 }, { subject: 'aws', n: 1 }])}
        <h1 class="display h1">${kind === 'lesson' ? 'Xong quiz' : 'Xong phần hôm nay'}</h1>
        <p class="score">${s.correct}<small>/${s.total}</small></p><p class="muted" style="margin:0">đúng ngay lần đầu</p>
        <div class="lines">
          <div><span>Thẻ mới đã học</span><b>${s.fresh}</b></div>
          <div><span>Hỏi lại trong buổi</span><b>${s.again}</b></div>
          <div><span>Đúng liền một mạch</span><b>${s.maxCombo} câu</b></div>
          <div><span>Ngày mai cần ôn</span><b>${LEARNER.tomorrow} thẻ</b></div>
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
    `<header class="top"><div><h1 class="display h1">Thẻ</h1><p class="muted small" style="margin:4px 0 0">Chạm để lật. Vuốt phải là nhớ, trái là quên, lên là dễ.</p></div></header>
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
  const faces = (card) => {
    const it = card.item;
    const front =
      it.kind === 'vocab'
        ? `<p class="fc-term" lang="en">${esc(it.term)}</p>${it.pronunciation ? `<p class="fc-pron">${esc(it.pronunciation)}</p>` : ''}<button class="q-speak" aria-label="Nghe">${'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke-linecap="round"/></svg>'}</button>`
        : `<p class="fc-front">${it.front}</p>`;
    return `<div class="inner"><div class="face front">${front}<span class="hint">Chạm để lật</span></div><div class="face back">${card.feedback.summary}</div></div>
      <span class="fstamp left">Quên</span><span class="fstamp right">Nhớ</span><span class="fstamp up">Dễ</span>`;
  };
  const render = () => {
    area.innerHTML = '';
    if (deck.done) {
      area.innerHTML = `<div class="card done-card" style="position:absolute;inset:0">${strip([{ subject: CONTENT.courses[courseKey].subject, n: 1 }])}<h2 class="display" style="font-size:28px">Hết bộ thẻ</h2>
        <div class="lines">${[1, 2, 3, 4].map((r) => `<div><span>${RATING_LABEL[r]}</span><b>${deck.counts[r]}</b></div>`).join('')}</div><a class="btn wide" href="#/flash/${courseKey}">Học lại bộ này</a></div>`;
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
        const stamps = { left: $('.fstamp.left', f), right: $('.fstamp.right', f), up: $('.fstamp.up', f) };
        $('.q-speak', f)?.addEventListener('click', (e) => (e.stopPropagation(), Speech.say(card.item.term, card.lang)));
        const sw = makeSwipeable(f, {
          onTap: () => f.classList.toggle('flipped'),
          onDrag: (dx, dy, p) => {
            stamps.right.style.opacity = dx > 0 ? p : 0;
            stamps.left.style.opacity = dx < 0 ? p : 0;
            stamps.up.style.opacity = dy < -20 && Math.abs(dy) > Math.abs(dx) ? Math.min(1, -dy / 160) : 0;
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
      const stamp = $(`.fstamp.${dir}`, top);
      if (stamp) stamp.style.opacity = 1;
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
  const el = screen(
    `<div class="s-top"><a class="round" href="#/course/${courseKey}" aria-label="Thoát">${I.close}</a><strong>Thi thử ${esc(c.title.split('(')[1]?.replace(')', '') || '')}</strong><span class="timer" aria-live="off"></span></div>
    <div class="navq"></div>
    <div class="s-layout"><section class="card qcard subject-${c.subject}"><span class="strip"></span><p class="q-label"></p><div class="qbody"></div><p class="saved-note" hidden>Đã lưu đáp án. Có thể đổi trước khi nộp.</p>
      <div class="exam-foot"><button class="btn ghost" data-act="prev">Câu trước</button><button class="btn" data-act="next">Câu sau</button></div></section><div></div></div>`,
    { focus: true },
  );
  $('.strip', el).outerHTML = strip([{ subject: c.subject, n: 1 }]);
  const navq = $('.navq', el);
  const timerEl = $('.timer', el);
  const tick = () => {
    const left = Math.max(0, session.deadline - Date.now());
    const m = Math.floor(left / 60000);
    const s = Math.floor((left % 60000) / 1000);
    timerEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
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
      `<div style="max-width:720px;margin:0 auto"><a class="back" href="#/course/${courseKey}">${I.back}${esc(Content.courseShort(courseKey))}</a>
      <div class="card done-card">${strip([{ subject: c.subject, n: 1 }])}
        <h1 class="display h1">Kết quả thi thử</h1>
        <p class="score">${r.percent}<small>%</small></p>
        <p class="muted" style="margin:0">${r.correct}/${r.total} câu đúng, cần ${r.pass}% để đạt</p>
        <span class="pass-stamp ${r.passed ? 'ok' : 'no'}">${r.passed ? 'Đạt' : 'Chưa đạt'}</span>
        <div class="dom">${r.domains
          .filter((d) => d.total)
          .map((d) => `<div><span>${esc(d.title)}</span><b>${d.correct}/${d.total}</b><span class="bar"><i style="width:${(d.correct / d.total) * 100}%"></i></span></div>`)
          .join('')}</div>
        <a class="btn wide" href="#/exam/${courseKey}">Thi lại</a>
      </div>
      <h2 class="h2" style="margin:28px 0 12px">Xem lại từng câu</h2><div class="review" style="display:grid;gap:14px"></div></div>`,
      { focus: true },
    );
    const list = $('.review', out);
    session.cards.forEach((card, i) => {
      const box = h(`<section class="card qcard subject-${card.subject}" style="min-height:0"><p class="q-label">Câu ${i + 1}</p><div class="qbody"></div><div class="rv"></div></section>`);
      list.append(box);
      const ctl = mountQuestion($('.qbody', box), card, {});
      const res = session.results.get(card.id) || { correct: false };
      ctl.reveal(res, res.input || {});
      if (card.feedback.explanation) $('.rv', box).innerHTML = `<p class="expl" style="margin:14px 0 0">${card.feedback.explanation}</p>`;
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
