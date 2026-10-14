/* ───────────── Ôn thi — screens ─────────────
   The app stays the app: same screens, features, names and flows as the real one. Only the skin is the 2007 study forum. */
const appEl = document.getElementById('app');
const navEl = document.getElementById('nav');

const pad = (n) => String(n).padStart(2, '0');
function greeting() {
  const hr = new Date().getHours();
  return hr < 11 ? 'Chào buổi sáng' : hr < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
}

// ───────────── icons (glossy 2007 set, drawn here)
const I = {
  folder: `<svg class="ic" viewBox="0 0 22 18" aria-hidden="true"><path d="M1.5 3.3c0-.8.6-1.4 1.4-1.4h5.2l1.9 1.9h9.1c.8 0 1.4.6 1.4 1.4v10.3c0 .8-.6 1.4-1.4 1.4H2.9c-.8 0-1.4-.6-1.4-1.4z" fill="#D9790F" stroke="#8F4A04" stroke-width=".7"/><rect x="3.6" y="4.4" width="14.8" height="7.4" fill="#E9F6FF" stroke="#7FB2DA" stroke-width=".6"/><path d="M1.5 7.6h19v7.4c0 .8-.6 1.4-1.4 1.4H2.9c-.8 0-1.4-.6-1.4-1.4z" fill="#F59A2A" stroke="#8F4A04" stroke-width=".7"/><path d="M1.9 8.1h18.2v3.1H1.9z" fill="#FFC57A" opacity=".75"/></svg>`,
  house: `<svg class="ic" viewBox="0 0 22 20" aria-hidden="true"><path d="M11 2.2 2.4 9.6h2.2v8.6h12.8V9.6h2.2z" fill="#fff" stroke="#0D4A7C" stroke-width=".9" stroke-linejoin="round"/><path d="M11 1.6 1.6 9.6l1.5 1.3L11 4.2l7.9 6.7 1.5-1.3z" fill="#D9452A" stroke="#7E1E08" stroke-width=".7" stroke-linejoin="round"/><rect x="9.1" y="12.2" width="3.8" height="6" fill="#F59A2A" stroke="#8F4A04" stroke-width=".6"/><rect x="5.8" y="11.6" width="2.4" height="2.4" fill="#BFE3FF" stroke="#0D4A7C" stroke-width=".5"/></svg>`,
  quiz: `<svg class="ic" viewBox="0 0 22 20" aria-hidden="true"><path d="M11 1.6c-5 0-8.8 3.1-8.8 7.1 0 2.3 1.3 4.4 3.4 5.6l-.9 4.1 4.3-2.8c.7.1 1.3.2 2 .2 5 0 8.8-3.1 8.8-7.1S16 1.6 11 1.6z" fill="#4CB43E" stroke="#22661A" stroke-width=".8"/><path d="M8.6 7.1c0-1.3 1-2.2 2.3-2.2s2.3.8 2.3 2c0 1.7-2.2 1.7-2.2 3.4" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><circle cx="11" cy="12.9" r="1" fill="#fff"/></svg>`,
  x: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.2" fill="#2E8BCF" stroke="#fff" stroke-width="1.4"/><circle cx="12" cy="12" r="7.6" fill="#EAF6FF"/><path d="M12 7v5.2l3.2 2" fill="none" stroke="#0D4A7C" stroke-width="1.8" stroke-linecap="round"/><path d="M5 8.2a8 8 0 0 1 6-4.4" stroke="#fff" stroke-width="1.2" fill="none" opacity=".7"/></svg>`,
  check: `<svg class="ic" viewBox="0 0 22 18" aria-hidden="true"><circle cx="11" cy="9" r="7.6" fill="#fff" opacity=".22"/><path d="M6.6 9.2l3 3 6-6.2" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  cross: `<svg class="ic" viewBox="0 0 22 18" aria-hidden="true"><circle cx="11" cy="9" r="7.6" fill="#fff" opacity=".22"/><path d="M7.8 5.8l6.4 6.4M14.2 5.8l-6.4 6.4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  mCal: `<svg class="ico" viewBox="0 0 34 34" aria-hidden="true"><rect x="4" y="6" width="26" height="24" rx="3" fill="#fff" stroke="#5A6B78"/><path d="M4 9a3 3 0 0 1 3-3h20a3 3 0 0 1 3 3v4H4z" fill="#D9452A" stroke="#7E1E08" stroke-width=".8"/><path d="M5 9.5a2.5 2.5 0 0 1 2.5-2.5h19A2.5 2.5 0 0 1 29 9.5v1H5z" fill="#F08A6E" opacity=".8"/><rect x="9.5" y="3" width="3" height="7" rx="1.2" fill="#C8CDD3" stroke="#6E747A" stroke-width=".7"/><rect x="21.5" y="3" width="3" height="7" rx="1.2" fill="#C8CDD3" stroke="#6E747A" stroke-width=".7"/><path d="M10.5 21l4 4 9-9" fill="none" stroke="#3F9A16" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  mQuiz: `<svg class="ico" viewBox="0 0 34 34" aria-hidden="true"><path d="M17 3.5c-7.7 0-13.5 4.9-13.5 11 0 3.6 2 6.7 5.2 8.7l-1.4 6.3 6.6-4.3c1 .2 2.1.3 3.1.3 7.7 0 13.5-4.9 13.5-11S24.7 3.5 17 3.5z" fill="#4CB43E" stroke="#22661A" stroke-width=".9"/><path d="M6.5 11.5c1.8-3.8 5.6-5.6 10.5-5.6" stroke="#B9F0A8" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/><path d="M13.6 11.6c0-2 1.6-3.4 3.6-3.4s3.6 1.3 3.6 3.1c0 2.6-3.4 2.6-3.4 5.2" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="17.4" cy="20.6" r="1.6" fill="#fff"/></svg>`,
  mCards: `<svg class="ico" viewBox="0 0 34 34" aria-hidden="true"><rect x="9.5" y="4" width="20" height="15" rx="2.2" fill="#BFE3FF" stroke="#2C6EA5" transform="rotate(8 19.5 11.5)"/><rect x="4" y="10.5" width="21" height="17" rx="2.2" fill="#FFE14D" stroke="#9C7400"/><path d="M5 11.8h19v4H5z" fill="#FFF3A6" opacity=".9"/><path d="M8.5 19h12M8.5 23h8" stroke="#9C7400" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  mClock: `<svg class="ico" viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="18" r="13" fill="#2E8BCF" stroke="#0D4A7C"/><circle cx="17" cy="18" r="10" fill="#EAF6FF"/><path d="M17 11.5V18l4.2 2.6" fill="none" stroke="#0D4A7C" stroke-width="2.2" stroke-linecap="round"/><rect x="14.5" y="1.8" width="5" height="3.6" rx="1" fill="#D9452A" stroke="#7E1E08" stroke-width=".7"/><path d="M8.5 12.5a10 10 0 0 1 6.5-4.4" stroke="#fff" stroke-width="1.6" fill="none" opacity=".8" stroke-linecap="round"/></svg>`,
  speak: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke-linecap="round"/></svg>',
};

let timer = null;
let keyHandler = null;
function setKeys(fn) {
  if (keyHandler) removeEventListener('keydown', keyHandler);
  keyHandler = fn;
  if (fn) addEventListener('keydown', fn);
}

function screen(html, { tab = null, focus = false } = {}) {
  clearInterval(timer);
  setKeys(null);
  document.body.classList.toggle('focus-on', focus);
  appEl.innerHTML = `<div class="screen${focus ? ' s-focus' : ''}">${html}</div>`;
  $$('a', navEl).forEach((a) => a.classList.toggle('on', a.dataset.tab === tab));
  scrollTo(0, 0);
  return appEl.firstElementChild;
}

const subOf = (courseKey) => (CONTENT.courses[courseKey].subject === 'aws' ? 'aws' : 'en');
const sb = (courseKey) => `<span class="sb${subOf(courseKey) === 'aws' ? ' aws' : ''}">${subOf(courseKey) === 'aws' ? 'AWS' : 'EN'}</span>`;
const courseTitle = (key) => CONTENT.courses[key].title;
const bar = (title, right = '', icon = I.folder, extra = '') => `<h2 class="bar${extra}">${icon}<span>${title}</span>${right}</h2>`;
function courseOfItem(itemKey) {
  return (Object.values(CONTENT.courses).find((c) => !c.include && c.items.includes(itemKey)) || Object.values(CONTENT.courses)[0]).key;
}
const pctOf = (p) => Math.round((p.learned / p.total) * 100);

function quickPanel() {
  const counts = dailyCounts();
  return `<aside class="quick" aria-label="Truy cập nhanh">${bar('Truy cập nhanh', '', I.house)}
    <ul class="dlist">
      <li><a href="#/learn/daily">Ôn hôm nay<span class="n">(${counts.total})</span></a></li>
      <li><a href="#/learn/weak">Hay quên<span class="n">(${LEARNER.weak.length})</span></a></li>
      <li><a href="#/flash">Thẻ</a></li>
      <li class="sep">Khóa học</li>
      ${Content.coursesInOrder()
        .map((c) => `<li><a href="#/course/${c.key}">${esc(Content.courseShort(c.key))}<span class="n">${LEARNER.courses[c.key].enrolled ? `(${LEARNER.courses[c.key].due})` : ''}</span></a></li>`)
        .join('')}
    </ul></aside>`;
}
const withQuick = (inner) => `<div class="wrap has-quick">${quickPanel()}<div class="wrap-main">${inner}</div></div>`;

// ───────────── home
function home() {
  const counts = dailyCounts();
  const byCourse = {};
  DAILY.forEach((d) => (byCourse[d.course] = (byCourse[d.course] || 0) + 1));
  const lesson = CONTENT.lessons[LEARNER.continueLesson];
  const enrolled = Object.keys(LEARNER.courses).filter((k) => LEARNER.courses[k].enrolled);
  const days = heatDays();
  const week = days.slice(-7);
  const offset = (days[0].day.getDay() + 6) % 7;
  const lvl = (n) => (n === 0 ? '' : n < 8 ? 'l1' : n < 13 ? 'l2' : n < 18 ? 'l3' : 'l4');
  const weakN = LEARNER.weak.length;
  screen(
    withQuick(`
    <header class="top">
      <div><p class="hello">${greeting()}, ${esc(LEARNER.name)}</p><h1 class="h1">${todayLabel()}</h1></div>
      <div class="pages week" title="7 ngày qua">${week.map((d, i) => `<span class="${i === week.length - 1 ? 'now' : d.n ? 'ok' : ''}" title="${d.label}">${d.n ? '✓' : d.day.getDate()}</span>`).join('')}</div>
    </header>
    <div class="home">
      <div class="c-today">
        <section class="box today" aria-label="Ôn hôm nay">${bar('Ôn hôm nay')}
          <div class="body">
            <p class="tot">${counts.total} thẻ cần ôn hôm nay (${counts.reviews} ôn lại, ${counts.fresh} mới)</p>
            <div class="lines">${Object.entries(byCourse)
              .map(([k, n]) => `<div>${sb(k)}<span>${esc(courseTitle(k))}</span><b>${n}</b></div>`)
              .join('')}</div>
            <div class="act"><a class="btn" href="#/learn/daily"><span class="go"></span>Bắt đầu học</a><span class="meta">khoảng ${counts.minutes} phút</span></div>
          </div>
        </section>
      </div>
      <div class="c-main col">
        <section class="box continue">${bar('Đọc tiếp')}
          <div class="body">
            <a class="t" href="#/lesson/${encodeURIComponent(lesson.id)}">${esc(lesson.title)}</a>
            <p class="from">${sb(lesson.course)} ${esc(courseTitle(lesson.course))}</p>
            <div class="prog"><div class="xpbar"><i style="width:${LEARNER.continueProgress * 100}%"></i></div><span>Đã đọc ${Math.round(LEARNER.continueProgress * 100)}%</span></div>
          </div>
        </section>
        <section class="box course-rows">${bar('Đang học', '<a class="r" href="#/courses">Tất cả khóa học</a>')}
          <div class="body"><ul class="topics">${enrolled
            .map((k) => {
              const p = LEARNER.courses[k];
              return `<li><a href="#/course/${k}"><span class="t">${esc(courseTitle(k))}</span><span class="due${p.due ? '' : ' zero'}" title="Đến hạn hôm nay">${p.due ? `${p.due} đến hạn` : 'Không có thẻ đến hạn'}</span>
                <span class="meter"><span class="xpbar thin"><i style="width:${pctOf(p)}%"></i></span><span>${p.learned}/${p.total} thẻ đã thuộc</span></span></a></li>`;
            })
            .join('')}</ul></div>
        </section>
      </div>
      <div class="c-side col">
        <section class="box weak">${bar('Hay quên')}
          <div class="body">
            <ul class="dlist">${LEARNER.weak
              .slice(0, 3)
              .map((w) => `<li><div class="row weak-li"><span class="w-term">${esc(Content.label(w.item))}</span><span class="w-facet">${FACET_LABEL[w.facet]}</span><span class="w-count">sai ${w.again} lần</span></div></li>`)
              .join('')}</ul>
            <a class="xp wide" href="#/learn/weak">Ôn riêng ${weakN > 3 ? `${weakN} thẻ` : 'mấy thẻ'} này</a>
          </div>
        </section>
        <section class="box cal">${bar('30 ngày qua')}
          <div class="body">
            <div class="cal-grid">${['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => `<b>${d}</b>`).join('')}${'<i class="blank"></i>'.repeat(offset)}${days
              .map((d, i) => `<i class="${lvl(d.n)}${i === days.length - 1 ? ' today' : ''}" title="${d.label}: ${d.n} thẻ">${d.day.getDate()}</i>`)
              .join('')}</div>
            <p class="cal-note">Mỗi ô là một ngày, đậm hơn là ôn nhiều thẻ hơn.</p>
            <p class="cal-foot"><span>${LEARNER.streak} ngày liên tiếp</span><span>Kỷ lục ${LEARNER.best} ngày</span></p>
          </div>
        </section>
      </div>
    </div>`),
    { tab: 'home' },
  );
}

// ───────────── courses
function courses() {
  const all = Content.coursesInOrder();
  screen(
    withQuick(`
    <div class="page-head"><h1 class="h1">Khóa học</h1><p class="tot">${all.length} khóa học, ${all.filter((c) => LEARNER.courses[c.key].enrolled).length} khóa đang học</p></div>
    ${CONTENT.subjects
      .map(
        (s) => `<section class="box">${bar(esc(s.title), `<span class="r">${s.courses.length} khóa</span>`)}
        <div class="body"><div class="cols-head"><span>Khóa học</span><span>Đã thuộc</span><span>Đến hạn</span></div>
          <ul class="topics clist">${s.courses
            .map((k) => {
              const c = CONTENT.courses[k];
              const p = LEARNER.courses[k];
              return `<li><a class="row-a" href="#/course/${k}"><span class="t">${esc(c.title)}</span>${c.description ? `<span class="d">${esc(c.description)}</span>` : ''}
                <span class="facts"><span class="learned"><span>${p.learned}/${p.total} thẻ</span><span class="xpbar thin"><i style="width:${pctOf(p)}%"></i></span></span>${p.enrolled ? `<span class="due">${p.due} thẻ</span>` : '<span class="off">Chưa bắt đầu</span>'}</span></a></li>`;
            })
            .join('')}</ul></div></section>`,
      )
      .join('')}`),
    { tab: 'courses' },
  );
}

function sourceBits(c) {
  const s = c.source;
  const bits = [SOURCE_LABEL[s.type]];
  if (s.name) bits.push(esc(s.name));
  if (s.author) bits.push(esc(s.author));
  if (s.publisher) bits.push(esc(s.publisher));
  if (s.edition) bits.push(esc(s.edition));
  if (s.url) bits.push(`<a href="${esc(s.url)}" target="_blank" rel="noopener">Trang nguồn</a>`);
  return bits.join('<span class="sep">|</span>');
}

function course(key) {
  const c = CONTENT.courses[key];
  const p = LEARNER.courses[key];
  const s = Content.subject(c.subject);
  const first = c.chapters[0]?.lessons[0];
  const fresh = Math.min(p.fresh, c.policy?.new_per_day ?? 10);
  const el = screen(
    withQuick(`
    <nav class="crumbs" aria-label="Đường dẫn"><a href="#/courses">Khóa học</a><span class="gt">>></span><span class="here">${esc(Content.courseShort(key))}</span></nav>
    <div class="course-wrap sub-${subOf(key)}">
      <div>
        <section class="panel course-info">
          <p class="small muted" style="margin:0">${esc(s.title)}</p>
          <h1 class="h1">${esc(c.title)}</h1>
          ${c.description ? `<p class="desc">${esc(c.description)}</p>` : ''}
          <div class="src"><span class="k">Nguồn:</span>${sourceBits(c)}</div>
          <div class="onoff-row">
            <div><b id="enr-l">Đang học khóa này</b><div class="small muted">${p.learned}/${p.total} thẻ đã thuộc, ${p.due} thẻ đến hạn hôm nay</div><div class="xpbar thin" style="margin-top:6px"><i style="width:${pctOf(p)}%"></i></div></div>
            <div class="onoff" role="radiogroup" aria-labelledby="enr-l"><button type="button" role="radio" aria-checked="${p.enrolled}" data-v="1">On</button><button type="button" class="off" role="radio" aria-checked="${!p.enrolled}" data-v="0">Off</button></div>
          </div>
          ${c.include ? `<p class="small muted" style="margin:0">Khóa gom: thẻ lấy từ các khóa khác. Trả lời ở đây cũng được tính cho khóa gốc.</p>` : ''}
        </section>
      </div>
      <div>
        <div class="modes">
          <a class="mode" href="#/learn/daily">${I.mCal}<b>Ôn hôm nay</b><span class="m-sub">${p.enrolled ? `${p.due} đến hạn, ${fresh} mới` : 'Bật “Đang học” để vào phần ôn'}</span></a>
          ${first ? `<a class="mode" href="#/learn/lesson/${encodeURIComponent(first)}">${I.mQuiz}<b>Quiz</b><span>Hỏi ngẫu nhiên, không cần học trước</span></a>` : ''}
          <a class="mode" href="#/flash/${key}">${I.mCards}<b>Thẻ</b><span>Lật và vuốt</span></a>
          ${c.exam ? `<a class="mode" href="#/exam/${key}">${I.mClock}<b>Thi thử</b><span>${c.exam.questions} câu, ${c.exam.minutes} phút</span></a>` : ''}
        </div>
        ${c.chapters
          .map(
            (ch) => `<section class="box chapter">${bar(esc(ch.title))}
            <div class="body">${ch.description ? `<p>${esc(ch.description)}</p>` : ''}<ul class="topics lessons">${ch.lessons
              .map((id) => {
                const l = CONTENT.lessons[id];
                const what = [l.body && 'Bài đọc', l.slides && 'Slide', `${l.items.length} thẻ`].filter(Boolean).join(', ');
                return `<li><a href="#/lesson/${encodeURIComponent(id)}"><span class="t">${esc(l.title)}</span><span class="n">${what}</span></a></li>`;
              })
              .join('')}</ul></div></section>`,
          )
          .join('')}
        ${!c.chapters.length ? `<p class="muted">Khóa gom không có bài học riêng — học bằng Thẻ, Quiz hoặc Ôn hôm nay.</p>` : ''}
      </div>
    </div>`),
    { tab: 'courses' },
  );
  $$('.onoff button', el).forEach((b) =>
    b.addEventListener('click', () => {
      p.enrolled = b.dataset.v === '1';
      $$('.onoff button', el).forEach((x) => x.setAttribute('aria-checked', String((x.dataset.v === '1') === p.enrolled)));
      $('.m-sub', el).textContent = p.enrolled ? `${p.due} đến hạn, ${fresh} mới` : 'Bật “Đang học” để vào phần ôn';
    }),
  );
}

// ───────────── lesson
function lessonView(id) {
  const l = CONTENT.lessons[id];
  const tabs = [l.body && ['read', 'Bài đọc'], l.slides && ['slides', 'Slide'], ['cards', `Thẻ (${l.items.length})`]].filter(Boolean);
  const el = screen(
    withQuick(`
    <nav class="crumbs" aria-label="Đường dẫn"><a href="#/courses">Khóa học</a><span class="gt">>></span><a href="#/course/${l.course}">${esc(Content.courseShort(l.course))}</a></nav>
    <div class="lesson-wrap sub-${subOf(l.course)}">
      <div>
        <header class="lesson-head"><p class="chap">${sb(l.course)} ${esc(l.chapter)}</p><h1 class="h1">${esc(l.title)}</h1>${l.summary ? `<p>${esc(l.summary)}</p>` : ''}</header>
        <div class="strip-tabs" role="tablist">${tabs.map(([k, t], i) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${i === 0}">${t}</button>`).join('')}</div>
        <div id="panel"></div>
        <div class="sticky-cta mobile-only"><a class="btn" href="#/learn/lesson/${encodeURIComponent(id)}"><span class="go"></span>Quiz phần này</a></div>
      </div>
      <aside class="lesson-side">
        <section class="box gold side-quiz">${bar('Quiz phần này', '', I.quiz, ' gold')}<div class="body"><p>Câu hỏi về ${l.items.length} thẻ trong bài. Không cần đọc hết trước.</p><a class="btn wide" href="#/learn/lesson/${encodeURIComponent(id)}"><span class="go"></span>Bắt đầu quiz</a></div></section>
        <section class="box">${bar('Trong bài')}<div class="body"><ul class="dlist">${l.items.map((k) => `<li><span class="row">${esc(Content.label(k))}</span></li>`).join('')}</ul></div></section>
      </aside>
    </div>`),
    { tab: 'courses' },
  );
  const panel = $('#panel', el);
  const show = (k) => {
    $$('.strip-tabs button', el).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === k)));
    setKeys(null);
    if (k === 'read') panel.innerHTML = `<article class="sheet"><div class="reading">${l.body}</div></article>`;
    if (k === 'slides') {
      panel.innerHTML = `<section class="box slides-box">${bar('<span class="st"></span>', '<span class="r sn"></span>')}<div class="body"><div class="slides-host" tabindex="0" aria-label="Slide, chạm để xem tiếp"></div>
        <div class="slides-ctl"><button class="xp" type="button" data-act="prev" aria-label="Lùi">‹ Lùi</button><div class="pages"></div><button class="xp" type="button" data-act="next" aria-label="Tiếp">Tiếp ›</button></div></div></section>`;
      const host = $('.slides-host', panel);
      const pages = $('.pages', panel);
      const deck = mountSlides(host, l, {
        onChange: (s) => {
          $('.st', panel).textContent = s.title || `Slide ${s.index + 1}`;
          $('.sn', panel).textContent = `${s.index + 1}/${s.count}`;
          pages.innerHTML = Array.from({ length: s.count }, (_, i) => `<button type="button" class="${i === s.index ? 'now' : ''}" data-i="${i}" aria-label="Slide ${i + 1}">${i + 1}</button>`).join('');
        },
        extraCss: 'section { font-family: Verdana, "DejaVu Sans", Geneva, sans-serif; }',
      });
      host.addEventListener('click', () => deck.next());
      pages.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (b) deck.goto(Number(b.dataset.i));
      });
      $('[data-act=next]', panel).addEventListener('click', () => deck.next());
      $('[data-act=prev]', panel).addEventListener('click', () => deck.prev());
      setKeys((e) => {
        if (e.key === 'ArrowRight' || e.key === ' ') (e.preventDefault(), deck.next());
        if (e.key === 'ArrowLeft') deck.prev();
      });
    }
    if (k === 'cards') {
      panel.innerHTML = `<p class="muted small" style="margin:0 0 10px">Xem lướt: các thẻ đã xem sẽ được đưa vào Hôm nay trước.</p><div class="skim">${l.items
        .map((key) => {
          const it = CONTENT.items[key];
          const note = it.notes?.[l.course];
          return `<div class="cell">${it.kind === 'vocab' ? `<p class="t" lang="en">${esc(it.term)}</p><p class="m">${esc(it.meaning)}</p>` : `<p class="t concept">${it.front}</p>`}${note ? `<div class="note">${note}</div>` : ''}</div>`;
        })
        .join('')}</div>`;
    }
  };
  $$('.strip-tabs button', el).forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
  show(tabs[0][0]);
}

// ───────────── study session (daily / lesson quiz / weak)
const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'];
function learn(kind, arg) {
  let session;
  if (kind === 'lesson') session = lessonQuiz(arg);
  else if (kind === 'weak') session = weakSession();
  else session = dailySession();
  const back = kind === 'lesson' ? `#/lesson/${encodeURIComponent(arg)}` : '#/';
  const title = kind === 'lesson' ? `Quiz: ${CONTENT.lessons[arg].title}` : kind === 'weak' ? 'Hay quên' : 'Ôn hôm nay';
  const el = screen(
    `<div class="s-head"><a class="xclose" href="${back}" aria-label="Thoát">${I.x}</a><span class="ttl">${esc(title)}</span><span class="cnt"></span></div>
    <div class="s-pages"><div class="pages" aria-hidden="true"></div></div>
    <div class="s-layout"><section class="box qpost" aria-live="polite"><h2 class="bar"></h2><div class="body"><div class="qbody"></div></div></section><div class="side"></div></div>`,
    { focus: true },
  );
  const pages = $('.pages', el);
  const count = $('.cnt', el);
  const qpost = $('.qpost', el);
  const side = $('.side', el);
  const paintPages = () => {
    pages.innerHTML = session.cards
      .map((c, i) => {
        const r = session.results.get(c.id);
        return `<i class="${i === session.index ? 'now' : r ? (r.correct ? 'ok' : 'no') : ''}">${r ? (r.correct ? '✓' : '✗') : i + 1}</i>`;
      })
      .join('');
    count.textContent = `${Math.min(session.index + 1, session.cards.length)}/${session.cards.length}`;
  };
  const next = () => (session.next(), showCard());
  const showCard = () => {
    const card = session.current;
    if (!card) return finish();
    side.innerHTML = '';
    qpost.className = `box qpost sub-${subOf(card.course)}`;
    $('.bar', qpost).innerHTML = `${I.folder}<span>${FACET_LABEL[card.facet]}</span>${card.isNew ? '<span class="tag new">thẻ mới</span>' : ''}${card.isRequeue ? '<span class="tag again">hỏi lại</span>' : ''}<span class="r">${sb(card.course)} ${esc(Content.courseShort(card.course))}</span>`;
    paintPages();
    const ctl = mountQuestion($('.qbody', qpost), card, {
      onCommit: (input) => {
        const res = session.answer(input);
        if (card.key.kind === 'flashcard') {
          paintPages();
          side.innerHTML = `<section class="box reply">${bar(RATING_LABEL[input.rating], '', res.correct ? I.check : I.cross, res.correct ? ' ok' : ' no')}<div class="body"><div class="foot2"><span class="due-tag"><span>Ôn lại sau</span><b>${res.next}</b></span></div></div></section>`;
          setTimeout(next, 700);
          return;
        }
        ctl.reveal(res, input);
        paintPages();
        note(card, res);
      },
    });
    setKeys((e) => {
      if (e.target.matches('input')) return;
      const opts = $$('.q-options .q-opt:not(:disabled)', qpost);
      let n = Number(e.key);
      if (!n && LETTERS.includes(e.key.toLowerCase())) n = LETTERS.indexOf(e.key.toLowerCase()) + 1;
      if (n >= 1 && n <= opts.length && card.view.type === 'single') opts[n - 1].click();
      if (e.key === ' ' && card.view.type === 'flashcard') (e.preventDefault(), ctl.flip());
    });
  };
  const note = (card, res) => {
    const verdict = res.correct ? (res.typo ? 'Đúng rồi, chỉ sai chính tả chút xíu' : 'Đúng rồi') : 'Chưa đúng';
    side.innerHTML = `<section class="box reply sub-${subOf(card.course)}">${bar(verdict, '', res.correct ? I.check : I.cross, res.correct ? ' ok' : ' no')}
      <div class="body">
        ${card.feedback.explanation ? `<p class="expl">${card.feedback.explanation}</p>` : ''}
        <div class="summary">${card.feedback.summary}</div>
        ${res.requeuedAt ? '<p class="again-note">Thẻ này sẽ quay lại sau vài câu nữa.</p>' : ''}
        <div class="foot2"><span class="due-tag"><span>Ôn lại sau</span><b>${res.next}</b></span><button class="btn" type="button" id="next">Tiếp<span class="go"></span></button></div>
      </div></section>`;
    const btn = $('#next', side);
    btn.addEventListener('click', next);
    btn.focus({ preventScroll: true });
    if (innerWidth < 960) side.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
    setKeys((e) => e.key === 'Enter' && (e.preventDefault(), btn.click()));
  };
  const finish = () => {
    const s = session.summary();
    const done = kind === 'daily' ? 'Xong phần hôm nay' : 'Xong quiz';
    const home = kind === 'lesson' ? ['Về bài học', back] : ['Về trang chính', '#/'];
    screen(
      `<div class="s-head"><a class="xclose" href="${back}" aria-label="Đóng">${I.x}</a><span class="ttl">${esc(title)}</span><span class="cnt"></span></div>
      <div class="s-layout solo"><section class="box done">${bar(done)}
        <div class="body">
          <p class="big">${s.correct}<small>/${s.total}</small></p><p class="muted" style="margin:0">đúng ngay lần đầu</p>
          <table class="kv">
            <tr><td>Thẻ mới đã học</td><td>${s.fresh}</td></tr>
            <tr><td>Hỏi lại trong buổi</td><td>${s.again}</td></tr>
            <tr><td>Đúng liền một mạch</td><td>${s.maxCombo} câu</td></tr>
            <tr><td>Ngày mai cần ôn</td><td>${LEARNER.tomorrow} thẻ</td></tr>
          </table>
          <div class="acts"><a class="btn" href="${home[1]}"><span class="go"></span>${home[0]}</a>${kind === 'daily' ? '<a class="xp" href="#/flash">Lật thẻ thêm</a>' : ''}</div>
        </div></section></div>`,
      { focus: true },
    );
  };
  showCard();
}

// ───────────── flashcards
function flash(courseKey = 'english-all-flashcards') {
  const deck = new Deck(courseKey);
  const el = screen(
    withQuick(`<div class="page-head"><h1 class="h1">Thẻ</h1><p class="muted small" style="margin:4px 0 0">Chạm để lật. Vuốt phải là nhớ, trái là quên, lên là dễ.</p></div>
    <div class="sortbar" role="group" aria-label="Chọn bộ thẻ"><span class="k">Bộ thẻ:</span>${Content.coursesInOrder()
      .map((c) => `<button type="button" aria-pressed="${c.key === courseKey}" data-course="${c.key}"><span>${esc(Content.courseShort(c.key))}</span></button>`)
      .join('')}</div>
    <div class="deck-area"></div>
    <div class="deck-actions"><p class="deck-left"></p><div class="q-rate">${[1, 2, 3, 4].map((r) => `<button type="button" class="q-rate-btn" data-rating="${r}"><span class="q-rate-label">${RATING_LABEL[r]}</span><span class="q-rate-next">${DEFAULT_NEXT.review[r]}</span></button>`).join('')}</div></div>`),
    { tab: 'flash' },
  );
  $$('.sortbar button', el).forEach((b) => b.addEventListener('click', () => Router.go(`/flash/${b.dataset.course}`)));
  $('.sortbar [aria-pressed="true"]', el)?.scrollIntoView({ inline: 'center', block: 'nearest' });
  const area = $('.deck-area', el);
  const left = $('.deck-left', el);
  const faces = (card) => {
    const it = card.item;
    const front =
      it.kind === 'vocab'
        ? `<p class="fc-term" lang="en">${esc(it.term)}</p>${it.pronunciation ? `<p class="fc-pron">${esc(it.pronunciation)}</p>` : ''}<button type="button" class="q-speak" aria-label="Nghe">${I.speak}</button>`
        : `<p class="fc-front">${it.front}</p>`;
    const head = `<div class="fbar">${sb(card.course)}<span>${esc(Content.courseShort(card.course))}</span></div>`;
    return `<div class="inner"><div class="face front">${head}<div class="fbody">${front}</div><span class="hint">Chạm để lật</span></div><div class="face back">${head}<div class="fbody">${card.feedback.summary}</div></div></div>
      <span class="fstamp left">Quên</span><span class="fstamp right">Nhớ</span><span class="fstamp up">Dễ</span>`;
  };
  const render = () => {
    area.innerHTML = '';
    if (deck.done) {
      area.innerHTML = `<section class="box done" style="position:absolute;inset:0;overflow:auto">${bar('Hết bộ thẻ')}<div class="body">
        <table class="tbl"><tbody>${[1, 2, 3, 4].map((r) => `<tr><td>${RATING_LABEL[r]}</td><td class="num">${deck.counts[r]}</td></tr>`).join('')}</tbody></table>
        <a class="btn wide" style="margin-top:14px" href="#/flash/${courseKey}"><span class="go"></span>Học lại bộ này</a></div></section>`;
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
        const f = h(`<div class="fcard sub-${subOf(card.course)}${depth ? ` under-${depth}` : ''}">${faces(card)}</div>`);
        area.append(f);
        if (depth) return;
        const stamps = { left: $('.fstamp.left', f), right: $('.fstamp.right', f), up: $('.fstamp.up', f) };
        $('.q-speak', f)?.addEventListener('click', (e) => (e.stopPropagation(), Speech.say(card.item.term, card.lang)));
        const sw = makeSwipeable(f, {
          onTap: () => f.classList.toggle('flipped'),
          onDrag: (dx, dy, p) => {
            const up = dy < -20 && Math.abs(dy) > Math.abs(dx);
            stamps.right.style.opacity = !up && dx > 0 ? p : 0;
            stamps.left.style.opacity = !up && dx < 0 ? p : 0;
            stamps.up.style.opacity = up ? Math.min(1, -dy / 160) : 0;
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
    if (e.key === ' ' && top?._fling) (e.preventDefault(), top.classList.toggle('flipped'));
    if (['1', '2', '3', '4'].includes(e.key)) $(`.q-rate-btn[data-rating="${e.key}"]`, el)?.click();
  });
  render();
}

// ───────────── exam
function exam(courseKey) {
  const session = examSession(courseKey);
  const short = Content.courseShort(courseKey);
  const el = screen(
    `<div class="s-head"><a class="xclose" href="#/course/${courseKey}" aria-label="Thoát">${I.x}</a><span class="ttl">Thi thử ${esc(short)}</span><span class="clock" aria-live="off">${I.clock}<span class="t"></span></span></div>
    <div class="s-pages"><div class="pages navq"></div></div>
    <div class="s-layout solo"><section class="box qpost sub-${subOf(courseKey)}"><h2 class="bar"></h2><div class="body"><div class="qbody"></div><p class="saved-note" hidden>Đã lưu đáp án. Có thể đổi trước khi nộp.</p><div class="exam-foot"></div></div></section></div>`,
    { focus: true },
  );
  const navq = $('.navq', el);
  const clockEl = $('.clock', el);
  const foot = $('.exam-foot', el);
  let confirming = false;
  const tick = () => {
    const leftMs = Math.max(0, session.deadline - Date.now());
    const m = Math.floor(leftMs / 60000);
    const s = Math.floor((leftMs % 60000) / 1000);
    $('.t', clockEl).textContent = `${m}:${pad(s)}`;
    clockEl.classList.toggle('low', leftMs < 120000);
    if (!leftMs) submit();
  };
  tick();
  timer = setInterval(tick, 1000);
  const paintNav = () => {
    navq.innerHTML = session.cards.map((cd, i) => `<button type="button" class="${i === session.index ? 'now' : session.results.has(cd.id) ? 'saved' : ''}" data-i="${i}" aria-label="Câu ${i + 1}">${i + 1}</button>`).join('');
  };
  navq.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) (session.goto(Number(b.dataset.i)), show());
  });
  const paintFoot = () => {
    const last = session.index === session.cards.length - 1;
    const empty = session.cards.length - session.results.size;
    foot.innerHTML = confirming
      ? `<span class="muted">Còn ${empty} câu bỏ trống.</span><span style="display:flex;gap:10px"><button type="button" class="xp" data-act="back">Làm tiếp</button><button type="button" class="btn" data-act="submit">Nộp luôn</button></span>`
      : `<button type="button" class="xp" data-act="prev"${session.index === 0 ? ' disabled' : ''}>Câu trước</button><button type="button" class="btn" data-act="next">${last ? 'Nộp bài' : 'Câu sau'}</button>`;
  };
  foot.addEventListener('click', (e) => {
    const act = e.target.closest('button')?.dataset.act;
    const last = session.index === session.cards.length - 1;
    if (act === 'prev') (session.goto(session.index - 1), show());
    if (act === 'next') {
      if (!last) return (session.goto(session.index + 1), show());
      if (session.results.size < session.cards.length) return ((confirming = true), paintFoot());
      submit();
    }
    if (act === 'back') ((confirming = false), paintFoot());
    if (act === 'submit') submit();
  });
  const show = () => {
    confirming = false;
    const card = session.current;
    $('.bar', el).innerHTML = `${I.folder}<span>Câu ${session.index + 1} trên ${session.cards.length}</span><span class="r">${sb(courseKey)} ${esc(short)}</span>`;
    $('.saved-note', el).hidden = !session.results.has(card.id);
    mountQuestion($('.qbody', el), card, {
      blind: true,
      onCommit: (input) => {
        session.answer(input);
        $('.saved-note', el).hidden = false;
        paintNav();
        paintFoot();
      },
    });
    const prior = session.results.get(card.id);
    if (prior?.input?.optionIds) prior.input.optionIds.forEach((id) => $(`.q-opt[data-id="${id}"]`, el)?.classList.add('is-picked'));
    if (prior?.input && 'value' in prior.input) $(`.q-opt[data-value="${prior.input.value}"]`, el)?.classList.add('is-picked');
    paintNav();
    paintFoot();
    setKeys((e) => {
      if (e.target.matches('input')) return;
      const opts = $$('.q-options .q-opt', el);
      let n = Number(e.key);
      if (!n && LETTERS.includes(e.key.toLowerCase())) n = LETTERS.indexOf(e.key.toLowerCase()) + 1;
      if (n >= 1 && n <= opts.length && card.view.type === 'single') opts[n - 1].click();
    });
  };
  const submit = () => {
    clearInterval(timer);
    const r = session.submit();
    const out = screen(
      `<div class="s-head"><a class="xclose" href="#/course/${courseKey}" aria-label="Đóng">${I.x}</a><span class="ttl">Thi thử ${esc(short)}</span><span class="cnt"></span></div>
      <div class="s-layout solo"><div>
        <section class="box done">${bar('Kết quả thi thử')}
          <div class="body">
            <p class="big">${r.percent}<small>%</small></p>
            <p class="muted" style="margin:0">${r.correct}/${r.total} câu đúng, cần ${r.pass}% để đạt</p>
            <span class="stamp-pass ${r.passed ? 'ok' : 'no'}">${r.passed ? 'Đạt' : 'Chưa đạt'}</span>
            <table class="tbl dom-tbl"><thead><tr><th>STT</th><th>Lĩnh vực</th><th style="text-align:right">Đúng</th></tr></thead><tbody>${r.domains
              .filter((d) => d.total)
              .map((d, i) => `<tr><td class="num" style="text-align:left">${i + 1}</td><td>${esc(d.title)}<div class="xpbar thin" style="margin-top:6px"><i style="width:${(d.correct / d.total) * 100}%"></i></div></td><td class="num">${d.correct}/${d.total}</td></tr>`)
              .join('')}</tbody></table>
            <div class="acts"><a class="btn" href="#/exam/${courseKey}"><span class="go"></span>Thi lại</a><a class="xp" href="#/course/${courseKey}">Về khóa học</a></div>
          </div>
        </section>
        <h2 class="h1" style="font-size:19px;margin:24px 0 0">Xem lại từng câu</h2>
        <div class="review"></div>
      </div></div>`,
      { focus: true },
    );
    const list = $('.review', out);
    session.cards.forEach((card, i) => {
      const res = session.results.get(card.id) || { correct: false };
      const state = !session.results.has(card.id) ? 'skip' : res.correct ? 'ok' : 'no';
      const box = h(`<section class="box qpost sub-${subOf(card.course)}">${bar(`Câu ${i + 1}`, `<span class="r"><span class="res ${state}">${state === 'ok' ? 'Đúng' : state === 'no' ? 'Sai' : 'Bỏ trống'}</span></span>`)}<div class="body"><div class="qbody"></div><div class="rv"></div></div></section>`);
      list.append(box);
      const ctl = mountQuestion($('.qbody', box), card, {});
      ctl.reveal(res, res.input || {});
      if (card.feedback.explanation) $('.rv', box).innerHTML = `<p class="expl">${card.feedback.explanation}</p>`;
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
