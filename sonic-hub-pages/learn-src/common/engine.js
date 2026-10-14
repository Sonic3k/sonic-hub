/* Learn portal demo engine — shared by the three vibe demos.
   Behaviour lives here (content, grading, sessions, speech, gestures); each demo only draws. */

// ---------------------------------------------------------------- learner state (mock)
const LEARNER = {
  name: 'Ngọc Anh',
  streak: 5,
  best: 12,
  // reviews per learning day, oldest first (30 days)
  heat: [0, 6, 14, 9, 0, 0, 11, 18, 7, 12, 0, 21, 15, 9, 0, 4, 13, 17, 0, 0, 8, 19, 11, 16, 6, 0, 12, 22, 14, 0],
  tomorrow: 15,
  courses: {
    'workplace-english': { enrolled: true, learned: 21, total: 48, due: 5, fresh: 10 },
    'ielts-6-essentials': { enrolled: true, learned: 4, total: 16, due: 2, fresh: 12 },
    'english-all-flashcards': { enrolled: false, learned: 12, total: 30, due: 0, fresh: 18 },
    'saa-c03': { enrolled: true, learned: 7, total: 20, due: 4, fresh: 9, lastExam: 64 },
  },
  continueLesson: 'saa-c03/01-storage-s3/01-storage-classes',
  continueProgress: 0.45,
  weak: [
    { item: 'en.put-off', facet: 'recall', again: 4 },
    { item: 'aws.s3.replication', facet: 'apply', again: 3 },
    { item: 'en.minutes', facet: 'listen', again: 3 },
  ],
};

// Today's Daily, as the API would hand it out: reviews and new cards from every enrolled course, interleaved.
const DAILY = [
  { item: 'en.deadline', facet: 'recognize', gen: 'vocab-recognize', course: 'workplace-english' },
  { item: 'aws.s3.storage-classes', facet: 'recall', gen: 'flashcard', course: 'saa-c03' },
  { item: 'en.postpone', facet: 'recall', gen: 'vocab-recall', course: 'workplace-english' },
  { q: 'aws.s3.storage-classes#audit-logs', course: 'saa-c03' },
  { item: 'en.put-off', facet: 'use', gen: 'vocab-use', course: 'workplace-english', isNew: true },
  { item: 'en.on-track', facet: 'listen', gen: 'vocab-listen', course: 'workplace-english' },
  { q: 'aws.s3.versioning#turn-off', course: 'saa-c03' },
  { q: 'en.grammar.polite-requests#word-order', course: 'workplace-english' },
  { item: 'en.workload', facet: 'recognize', gen: 'vocab-recognize', course: 'ielts-6-essentials', isNew: true },
  { q: 'aws.s3.encryption#match-requirements', course: 'saa-c03' },
  { q: 'en.deadline#ielts-collocation', course: 'ielts-6-essentials' },
  { q: 'aws.s3.storage-classes#one-zone', course: 'saa-c03', isNew: true },
];

const EXAM_SET = [
  'aws.s3.storage-classes#audit-logs',
  'aws.s3.block-public-access#public-site-images',
  'aws.s3.versioning#accidental-delete',
  'aws.ec2.placement-groups#hpc',
  'aws.s3.replication#prerequisite',
  'aws.ec2.purchasing-options#nightly-batch',
  'aws.s3.encryption#kms-throttling',
  'aws.ec2.auto-scaling#survive-az',
];

const FACET_LABEL = { recognize: 'Nhận diện', recall: 'Nhớ lại', use: 'Dùng trong câu', listen: 'Nghe', apply: 'Vận dụng' };
const RATING_LABEL = { 1: 'Quên', 2: 'Khó', 3: 'Nhớ', 4: 'Dễ' };
const SOURCE_LABEL = { self: 'Tự soạn', book: 'Sách', website: 'Website', 'online-course': 'Khóa online' };

// ---------------------------------------------------------------- small helpers
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(list, random = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Text matching (same rules as the API): case, spacing, quotes; one typo allowed from 5 letters.
function normalize(s) {
  return String(s).normalize('NFKC').replace(/[‘’]/g, "'").toLowerCase().replace(/\s+/g, ' ').trim().replace(/^[\s"'.,!?;:()]+|[\s"'.,!?;:()]+$/g, '');
}
function levenshtein(a, b) {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
function matchTyped(input, accepted) {
  const g = normalize(input);
  if (!g) return 'wrong';
  let best = 'wrong';
  for (const a of accepted) {
    const t = normalize(a);
    if (g === t) return 'exact';
    const allowed = t.length >= 10 ? 2 : t.length >= 5 ? 1 : 0;
    if (allowed && levenshtein(g, t) <= allowed) best = 'typo';
  }
  return best;
}
function parseCloze(text) {
  const re = /\{\{c(\d+)::(.*?)(?:::(.*?))?\}\}/g;
  const segs = [];
  const blanks = {};
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) segs.push({ text: text.slice(last, m.index) });
    const answers = m[2].split('|').map((s) => s.trim());
    segs.push({ blank: Number(m[1]), hint: m[3] || null });
    blanks[m[1]] ??= answers;
    last = m.index + m[0].length;
  }
  if (last < text.length) segs.push({ text: text.slice(last) });
  return { segs, blanks };
}
const boldCloze = (t) => esc(t).replace(/\{\{c\d+::(.*?)(?:::.*?)?\}\}/g, (_, a) => `<strong>${a.split('|')[0]}</strong>`);
const plainCloze = (t) => t.replace(/\{\{c\d+::(.*?)(?:::.*?)?\}\}/g, (_, a) => a.split('|')[0]);

// ---------------------------------------------------------------- content access
const Content = {
  item: (key) => CONTENT.items[key],
  course: (key) => CONTENT.courses[key],
  lesson: (id) => CONTENT.lessons[id],
  question: (key) => CONTENT.questions[key],
  subjectOf: (courseKey) => CONTENT.courses[courseKey].subject,
  subject: (key) => CONTENT.subjects.find((s) => s.key === key),
  /** "AWS Solutions Architect – Associate (SAA-C03)" → "SAA-C03"; short titles stay as they are. */
  courseShort(key) {
    const t = CONTENT.courses[key].title;
    const m = t.match(/\(([^)]+)\)\s*$/);
    return t.length > 28 && m ? m[1] : t;
  },
  /** Every course in subject order. */
  coursesInOrder() {
    return CONTENT.subjects.flatMap((s) => s.courses.map((k) => CONTENT.courses[k]));
  },
  lessonsOf(courseKey) {
    return CONTENT.courses[courseKey].chapters.flatMap((ch) => ch.lessons.map((id) => CONTENT.lessons[id]));
  },
  examples(itemKey, courseKey) {
    const ex = CONTENT.items[itemKey].examples || [];
    return [...ex.filter((e) => e.course === courseKey), ...ex.filter((e) => e.course !== courseKey)];
  },
  /** A short name for an item: the term, or a concept's question cut to its subject. */
  label(itemKey) {
    const it = CONTENT.items[itemKey];
    if (it.kind === 'vocab') return it.term;
    const text = it.front.replace(/<[^>]+>/g, '');
    const cut = text.split(/\s[—–]\s|:\s/)[0].replace(/\?$/, '');
    return cut.length <= 60 ? cut : cut.slice(0, 57).replace(/\s+\S*$/, '') + '…';
  },
  /** The item at a glance: shown after answering and on the back of flashcards. */
  summary(itemKey, courseKey) {
    const it = CONTENT.items[itemKey];
    const ex = Content.examples(itemKey, courseKey)[0];
    const exHtml = ex ? `<blockquote>${boldCloze(ex.text)}${ex.tr ? `<br><em>${esc(ex.tr)}</em>` : ''}</blockquote>` : '';
    if (it.kind === 'vocab') {
      return `<p class="sum-head"><strong class="sum-term">${esc(it.term)}</strong>${it.pronunciation ? ` <span class="sum-pron">${esc(it.pronunciation)}</span>` : ''}${it.pos ? ` <em class="sum-pos">${esc(it.pos)}</em>` : ''}</p><p class="sum-meaning">${esc(it.meaning)}</p>${it.definition ? `<p class="sum-def">${esc(it.definition)}</p>` : ''}${exHtml}`;
    }
    return `<p class="sum-head"><strong>${it.front}</strong></p>${it.back}${it.pattern ? `<p class="sum-pattern"><code>${esc(it.pattern)}</code></p>` : ''}${exHtml}`;
  },
};

// ---------------------------------------------------------------- speech (browser voice)
const Speech = {
  supported: typeof speechSynthesis !== 'undefined',
  voice(lang) {
    if (!this.supported) return null;
    const voices = speechSynthesis.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
    const rank = (v) =>
      (/natural|neural|online/i.test(v.name) ? 0 : 10) +
      (/google us english|samantha|aria|jenny|ava|zoe|daniel/i.test(v.name) ? 0 : 3) +
      (v.lang.toLowerCase() === lang.toLowerCase() ? 0 : 1);
    return voices.sort((a, b) => rank(a) - rank(b))[0] || null;
  },
  say(text, lang = 'en-US', rate = 0.95) {
    if (!this.supported) return false;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    const v = this.voice(lang);
    if (v) u.voice = v;
    speechSynthesis.speak(u);
    return true;
  },
};
if (Speech.supported) speechSynthesis.onvoiceschanged = () => {};

// ---------------------------------------------------------------- question building (mirrors the API)
let uid = 0;
const DEFAULT_NEXT = { review: { 1: '10 phút', 2: '2 ngày', 3: '6 ngày', 4: '13 ngày' }, fresh: { 1: '1 phút', 2: '6 phút', 3: 'ngày mai', 4: '3 ngày' } };

function vocabPool(subject) {
  return Object.entries(CONTENT.items)
    .filter(([k, it]) => it.kind === 'vocab' && k.startsWith(CONTENT.subjects.find((s) => s.key === subject).prefix + '.'))
    .map(([k, it]) => ({ key: k, ...it }));
}

/**
 * Builds a study card: what to show (view), how to grade it (key) and what to explain afterwards (feedback).
 * spec: { item, facet, gen, course } for generated questions, or { q: '<item>#<id>', course } for authored ones.
 */
function buildCard(spec, opts = {}) {
  const seed = opts.seed ?? ++uid * 7919;
  const random = rng(seed);
  const course = spec.course;
  const subject = Content.subjectOf(course);
  const authored = spec.q ? CONTENT.questions[spec.q] : null;
  const itemKey = authored ? authored.item : spec.item;
  const item = CONTENT.items[itemKey];
  const facet = authored ? authored.facet || (item.kind === 'vocab' ? 'use' : 'apply') : spec.facet;
  const card = {
    id: ++uid,
    seed,
    spec,
    course,
    subject,
    lang: Content.subject(subject).lang,
    itemKey,
    item,
    facet,
    isNew: !!spec.isNew,
    isRequeue: !!opts.requeue,
    next: spec.isNew ? DEFAULT_NEXT.fresh : DEFAULT_NEXT.review,
    view: { type: 'flashcard', prompt: null, hint: null, image: null, speak: null, vocab: null, options: null, targets: null, multi: null, cloze: null, typingHint: null, front: null, back: null },
    key: null,
    feedback: { explanation: null, whys: {}, summary: Content.summary(itemKey, course) },
    tags: authored ? authored.tags : [],
    questionKey: spec.q || null,
  };
  const v = card.view;
  const asFlash = (front, back) => {
    v.type = 'flashcard';
    v.front = front;
    v.back = back;
    card.key = { kind: 'flashcard' };
  };

  if (authored && spec.gen !== 'flashcard') {
    const q = authored;
    v.type = q.type;
    v.prompt = q.type === 'cloze' ? null : q.prompt;
    card.feedback.explanation = q.explanation;
    const opts2 = q.options.map((o, i) => ({ id: `o${i}`, ...o }));
    if (q.type === 'single' || q.type === 'multi') {
      v.options = shuffle(opts2, random).map((o) => ({ id: o.id, html: o.text }));
      const correct = opts2.filter((o) => o.correct).map((o) => o.id);
      v.multi = q.type === 'multi' ? correct.length : null;
      card.key = { kind: 'choice', correct };
      for (const o of opts2) if (o.why) card.feedback.whys[o.id] = o.why;
    } else if (q.type === 'true_false') {
      card.key = { kind: 'tf', value: !!q.answer };
    } else if (q.type === 'typing') {
      card.key = { kind: 'typing', accepted: q.answers };
      v.typingHint = q.answers[0];
    } else if (q.type === 'cloze') {
      const p = parseCloze(q.prompt);
      v.cloze = p.segs;
      card.key = { kind: 'cloze', blanks: p.blanks };
    } else if (q.type === 'order') {
      let shown = shuffle(opts2, random);
      if (shown.every((o, i) => o.id === opts2[i].id)) shown = [...shown.slice(1), shown[0]];
      v.options = shown.map((o) => ({ id: o.id, html: o.text }));
      card.key = { kind: 'order', order: opts2.map((o) => o.id) };
    } else if (q.type === 'match') {
      v.options = shuffle(opts2, random).map((o) => ({ id: o.id, html: o.text }));
      v.targets = shuffle(opts2, random).map((o) => ({ id: `m${o.id.slice(1)}`, html: esc(o.match) }));
      card.key = { kind: 'match', pairs: Object.fromEntries(opts2.map((o) => [o.id, `m${o.id.slice(1)}`])) };
    } else if (q.type === 'flashcard') {
      asFlash(q.prompt, q.back);
    }
    return card;
  }

  if (item.kind !== 'vocab' || spec.gen === 'flashcard' || !spec.gen) {
    if (item.kind === 'vocab') {
      const ex = Content.examples(itemKey, course)[0];
      v.speak = item.term;
      if (facet === 'recall') asFlash(`<p class="fc-meaning">${esc(item.meaning)}</p>${item.pos ? `<p class="fc-pos">${esc(item.pos)}</p>` : ''}`, card.feedback.summary);
      else if (facet === 'listen') asFlash('', card.feedback.summary);
      else if (facet === 'use' && ex) asFlash(`<p class="fc-sentence">${esc(ex.text).replace(/\{\{c\d+::.*?\}\}/g, '<span class="fc-gap">_____</span>')}</p>${ex.tr ? `<p class="fc-tr">${esc(ex.tr)}</p>` : ''}`, card.feedback.summary);
      else asFlash(`<p class="fc-term">${esc(item.term)}</p>${item.pronunciation ? `<p class="fc-pron">${esc(item.pronunciation)}</p>` : ''}`, card.feedback.summary);
      v.image = facet === 'recall' ? item.image || null : null;
    } else {
      asFlash(`<p class="fc-front">${item.front}</p>`, `<p class="fc-q">${item.front}</p>${item.back}${item.pattern ? `<p class="sum-pattern"><code>${esc(item.pattern)}</code></p>` : ''}`);
      v.image = item.image || null;
    }
    return card;
  }

  // Generated vocab questions
  if (spec.gen === 'vocab-recognize' || spec.gen === 'vocab-listen') {
    const pool = vocabPool(subject).filter((p) => p.key !== itemKey && normalize(p.meaning) !== normalize(item.meaning));
    const same = shuffle(pool.filter((p) => (p.pos || '') === (item.pos || '')), random);
    const other = shuffle(pool.filter((p) => (p.pos || '') !== (item.pos || '')), random);
    const picked = [...same, ...other].slice(0, 3);
    v.type = 'single';
    v.options = shuffle([{ id: `i:${itemKey}`, html: esc(item.meaning) }, ...picked.map((p) => ({ id: `i:${p.key}`, html: esc(p.meaning) }))], random);
    card.key = { kind: 'choice', correct: [`i:${itemKey}`] };
    for (const p of picked) card.feedback.whys[`i:${p.key}`] = `Nghĩa của <strong>${esc(p.term)}</strong>`;
    v.speak = item.term;
    v.vocab = spec.gen === 'vocab-recognize' ? { term: item.term, pron: item.pronunciation, pos: item.pos } : {};
  } else if (spec.gen === 'vocab-recall') {
    v.type = 'typing';
    v.vocab = { meaning: item.meaning, pos: item.pos };
    v.image = item.image || null;
    v.typingHint = item.term;
    card.key = { kind: 'typing', accepted: [item.term, ...(item.accept || [])] };
  } else if (spec.gen === 'vocab-use') {
    const ex = Content.examples(itemKey, course).find((e) => e.text.includes('{{c'));
    const p = parseCloze(ex.text);
    v.type = 'cloze';
    v.cloze = p.segs;
    v.hint = ex.tr;
    v.speak = plainCloze(ex.text);
    card.key = { kind: 'cloze', blanks: p.blanks };
  }
  return card;
}

/** Grades an answer. Returns { correct, typo, picked }. */
function grade(card, input) {
  const k = card.key;
  switch (k.kind) {
    case 'choice': {
      const chosen = input.optionIds || [];
      return { correct: chosen.length === k.correct.length && k.correct.every((id) => chosen.includes(id)), typo: false };
    }
    case 'tf':
      return { correct: input.value === k.value, typo: false };
    case 'typing': {
      const m = matchTyped(input.text || '', k.accepted);
      return { correct: m !== 'wrong', typo: m === 'typo' };
    }
    case 'cloze': {
      let correct = true;
      let typo = false;
      for (const [i, accepted] of Object.entries(k.blanks)) {
        const m = matchTyped((input.blanks || {})[i] || '', accepted);
        if (m === 'wrong') correct = false;
        if (m === 'typo') typo = true;
      }
      return { correct, typo: correct && typo };
    }
    case 'order':
      return { correct: (input.order || []).every((id, i) => id === k.order[i]), typo: false };
    case 'match':
      return { correct: Object.entries(k.pairs).every(([o, m]) => (input.pairs || {})[o] === m), typo: false };
    case 'flashcard':
      return { correct: input.rating > 1, typo: false };
  }
}

function autoRating(card, g, input) {
  if (card.key.kind === 'flashcard') return input.rating;
  if (!g.correct) return 1;
  if (g.typo || input.hintUsed) return 2;
  return 3;
}

// ---------------------------------------------------------------- sessions
/**
 * A study session: daily / quiz / exam. Misses come back a few cards later (not in exams).
 * Exams save answers blind and grade everything on submit.
 */
class Session {
  constructor(specs, { mode = 'daily', title = 'Hôm nay', course = null, minutes = null } = {}) {
    this.mode = mode;
    this.title = title;
    this.course = course;
    this.cards = specs.map((s) => buildCard(s));
    this.index = 0;
    this.results = new Map();
    this.combo = 0;
    this.maxCombo = 0;
    this.beats = [];
    this.deadline = minutes ? Date.now() + minutes * 60_000 : null;
    this.submitted = false;
  }
  get current() {
    return this.cards[this.index] || null;
  }
  get done() {
    return this.index >= this.cards.length;
  }
  get answeredCount() {
    return [...this.results.values()].length;
  }
  answer(input) {
    const card = this.current;
    const g = grade(card, input);
    if (this.mode === 'exam') {
      this.results.set(card.id, { ...g, rating: null, input, saved: true });
      return { saved: true };
    }
    const rating = autoRating(card, g, input);
    const result = { ...g, rating, input, next: card.next[rating] };
    this.results.set(card.id, result);
    this.beats.push(g.correct);
    if (g.correct) {
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
    } else {
      this.combo = 0;
    }
    if (rating === 1 && !card.isRequeue) {
      const copy = buildCard(card.spec, { requeue: true });
      const at = Math.min(this.index + 4, this.cards.length);
      this.cards.splice(at, 0, copy);
      result.requeuedAt = at;
    }
    return result;
  }
  next() {
    this.index++;
    return this.current;
  }
  goto(i) {
    this.index = Math.max(0, Math.min(i, this.cards.length - 1));
  }
  summary() {
    const res = [...this.results.values()];
    const firstTry = this.cards.filter((c) => !c.isRequeue).map((c) => this.results.get(c.id)).filter(Boolean);
    const correct = firstTry.filter((r) => r.correct).length;
    return {
      total: firstTry.length,
      correct,
      percent: firstTry.length ? Math.round((correct / firstTry.length) * 100) : 0,
      fresh: this.cards.filter((c) => c.isNew && !c.isRequeue).length,
      again: res.filter((r) => r.rating === 1).length,
      maxCombo: this.maxCombo,
      beats: this.beats,
    };
  }
  submit() {
    this.submitted = true;
    const course = CONTENT.courses[this.course];
    const domains = (course.exam?.domains || []).map((d) => ({ ...d, total: 0, correct: 0 }));
    for (const c of this.cards) {
      const r = this.results.get(c.id);
      const tags = [...(c.tags || []), ...(c.item.tags || [])];
      const d = domains.find((x) => (c.tags || []).includes(x.tag)) || domains.find((x) => tags.includes(x.tag));
      if (d) {
        d.total++;
        if (r?.correct) d.correct++;
      }
    }
    const correct = this.cards.filter((c) => this.results.get(c.id)?.correct).length;
    const percent = Math.round((correct / this.cards.length) * 100);
    return { correct, total: this.cards.length, percent, pass: course.exam.pass_percent, passed: percent >= course.exam.pass_percent, domains };
  }
}

function dailySession() {
  return new Session(DAILY, { mode: 'daily', title: 'Hôm nay' });
}

/** Quiz over the cards the learner keeps getting wrong. */
function weakSession() {
  return new Session(
    [
      { item: 'en.put-off', facet: 'recall', gen: 'vocab-recall', course: 'workplace-english' },
      { q: 'aws.s3.replication#prerequisite', course: 'saa-c03' },
      { item: 'en.minutes', facet: 'listen', gen: 'vocab-listen', course: 'workplace-english' },
      { q: 'aws.s3.replication#existing-objects', course: 'saa-c03' },
    ],
    { mode: 'quiz', title: 'Hay quên' },
  );
}

/** "Quiz this part": questions over a lesson's items, no reading required. */
function lessonQuiz(lessonId) {
  const lesson = CONTENT.lessons[lessonId];
  const specs = [];
  lesson.items.forEach((k, i) => {
    const it = CONTENT.items[k];
    if (it.kind === 'vocab') specs.push({ item: k, facet: i % 2 ? 'recall' : 'recognize', gen: i % 2 ? 'vocab-recall' : 'vocab-recognize', course: lesson.course });
    for (const q of Object.values(CONTENT.questions))
      if (q.item === k && (!q.courseOnly || q.courseOnly === lesson.course)) specs.push({ q: q.key, course: lesson.course });
  });
  return new Session(shuffle(specs, rng(lessonId.length * 31)).slice(0, 10), { mode: 'quiz', title: lesson.title, course: lesson.course });
}

function examSession(courseKey) {
  return new Session(
    EXAM_SET.map((q) => ({ q, course: courseKey })),
    { mode: 'exam', title: 'Thi thử', course: courseKey, minutes: 12 },
  );
}

/** Flashcards over a course: self-graded; "Quên" puts the card back a few places later. */
class Deck {
  constructor(courseKey) {
    this.course = courseKey;
    const keys = CONTENT.courses[courseKey].items;
    this.cards = keys.map((k) => buildCard({ item: k, facet: CONTENT.items[k].kind === 'vocab' ? 'recognize' : 'recall', gen: 'flashcard', course: this.courseFor(k) }));
    this.cards = shuffle(this.cards, rng(7));
    this.index = 0;
    this.counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  }
  courseFor(k) {
    const own = Object.values(CONTENT.courses).find((c) => !c.include && c.items.includes(k));
    return own ? own.key : this.course;
  }
  get current() {
    return this.cards[this.index] || null;
  }
  peek(n) {
    return this.cards.slice(this.index, this.index + n);
  }
  get done() {
    return this.index >= this.cards.length;
  }
  rate(r) {
    const card = this.current;
    this.counts[r]++;
    if (r === 1) this.cards.splice(Math.min(this.index + 4, this.cards.length), 0, buildCard(card.spec, { requeue: true }));
    this.index++;
  }
}

// ---------------------------------------------------------------- question widget
/**
 * Draws the interactive body of a card with shared class names (each demo styles them):
 *   root .q.q--<type>  ·  .q-head .q-term .q-pron .q-pos .q-meaning .q-prompt .q-img .q-hint .q-speak
 *   .q-options .q-opt(.is-picked/.is-correct/.is-wrong) .q-why  .q-tf  .q-typing  .q-cloze .q-blank
 *   .q-order .q-chip  .q-match .q-left .q-right  .q-flash .q-face  .q-actions .q-check .q-hint-btn
 * onCommit(input) fires when the learner submits.
 */
function mountQuestion(host, card, { onCommit, blind = false, labels = {} } = {}) {
  const L = { check: 'Kiểm tra', hint: 'Gợi ý', flip: 'Lật thẻ', listen: 'Nghe', ...labels };
  const v = card.view;
  const root = h(`<div class="q q--${v.type} subject-${card.subject}" data-facet="${card.facet}"></div>`);
  let committed = false;
  let hintUsed = false;
  const commit = (input) => {
    if (committed) return;
    if (!blind) committed = true;
    onCommit?.({ ...input, hintUsed });
  };

  // Head
  const head = h('<div class="q-head"></div>');
  if (v.vocab?.term) {
    head.append(h(`<p class="q-term" lang="en">${esc(v.vocab.term)}</p>`));
    const meta = [v.vocab.pron && `<span class="q-pron">${esc(v.vocab.pron)}</span>`, v.vocab.pos && `<span class="q-pos">${esc(v.vocab.pos)}</span>`].filter(Boolean).join('');
    if (meta) head.append(h(`<p class="q-meta">${meta}</p>`));
  }
  if (v.vocab?.meaning) {
    head.append(h(`<p class="q-meaning">${esc(v.vocab.meaning)}</p>`));
    if (v.vocab.pos) head.append(h(`<p class="q-meta"><span class="q-pos">${esc(v.vocab.pos)}</span></p>`));
  }
  if (v.prompt) head.append(h(`<div class="q-prompt">${v.prompt}</div>`));
  if (v.image && v.type !== 'flashcard') head.append(h(`<img class="q-img" alt="" src="${v.image}">`));
  if (v.speak && v.type !== 'flashcard') {
    const isListen = card.facet === 'listen';
    const btn = h(`<button type="button" class="q-speak${isListen ? ' q-speak-big' : ''}" aria-label="${L.listen}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke-linecap="round"/></svg>${isListen ? `<span>${L.listen}</span>` : ''}</button>`);
    btn.addEventListener('click', () => {
      Speech.say(v.speak, card.lang);
      btn.classList.remove('is-playing');
      void btn.offsetWidth;
      btn.classList.add('is-playing');
    });
    if (v.vocab?.term) head.querySelector('.q-term').append(btn);
    else head.prepend(btn);
  }
  if (head.childElementCount) root.append(head);

  const actions = h('<div class="q-actions"></div>');
  const checkBtn = (enabled = false) => {
    const b = h(`<button type="button" class="q-check"${enabled ? '' : ' disabled'}>${L.check}</button>`);
    actions.append(b);
    return b;
  };

  switch (v.type) {
    case 'single':
    case 'multi': {
      const list = h(`<div class="q-options" role="${v.type === 'single' ? 'radiogroup' : 'group'}"></div>`);
      const picked = new Set();
      let check = null;
      v.options.forEach((o, i) => {
        const b = h(`<button type="button" class="q-opt" data-id="${o.id}"><span class="q-key">${i + 1}</span><span class="q-text">${o.html}</span><span class="q-why"></span></button>`);
        b.addEventListener('click', () => {
          if (committed) return;
          if (v.type === 'single') {
            $$('.q-opt', list).forEach((x) => x.classList.remove('is-picked'));
            b.classList.add('is-picked');
            commit({ optionIds: [o.id] });
          } else {
            b.classList.toggle('is-picked');
            b.classList.contains('is-picked') ? picked.add(o.id) : picked.delete(o.id);
            check.disabled = picked.size !== v.multi;
          }
        });
        list.append(b);
      });
      if (v.type === 'multi') {
        root.append(h(`<p class="q-instr">Chọn ${v.multi} đáp án</p>`));
        check = checkBtn();
        check.addEventListener('click', () => commit({ optionIds: [...picked] }));
      }
      root.append(list);
      break;
    }
    case 'true_false': {
      const row = h('<div class="q-tf"><button type="button" class="q-opt" data-value="true"><span class="q-text">Đúng</span></button><button type="button" class="q-opt" data-value="false"><span class="q-text">Sai</span></button></div>');
      $$('.q-opt', row).forEach((b) =>
        b.addEventListener('click', () => {
          if (committed) return;
          $$('.q-opt', row).forEach((x) => x.classList.remove('is-picked'));
          b.classList.add('is-picked');
          commit({ value: b.dataset.value === 'true' });
        }),
      );
      root.append(row);
      break;
    }
    case 'typing': {
      const form = h(`<form class="q-typing" autocomplete="off"><input class="q-input" lang="en" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Gõ từ tiếng Anh…" aria-label="Câu trả lời"></form>`);
      const input = $('input', form);
      const hintEl = h('<p class="q-hint" hidden></p>');
      const check = checkBtn();
      const hintBtn = h(`<button type="button" class="q-hint-btn">${L.hint}</button>`);
      actions.prepend(hintBtn);
      input.addEventListener('input', () => (check.disabled = !input.value.trim()));
      hintBtn.addEventListener('click', () => {
        hintUsed = true;
        const t = v.typingHint;
        hintEl.textContent = t[0] + ' ' + t.slice(1).replace(/[^\s-]/g, '_').split('').join(' ');
        hintEl.hidden = false;
        hintBtn.disabled = true;
        input.focus();
      });
      const go = (e) => {
        e?.preventDefault();
        if (input.value.trim()) commit({ text: input.value });
      };
      form.addEventListener('submit', go);
      check.addEventListener('click', go);
      root.append(form, hintEl);
      root._focus = () => input.focus({ preventScroll: true });
      root._typed = () => input.value;
      break;
    }
    case 'cloze': {
      const p = h('<p class="q-cloze" lang="en"></p>');
      v.cloze.forEach((s) => {
        if ('text' in s) p.append(document.createTextNode(s.text));
        else {
          const len = Math.max(5, (card.key.blanks[s.blank][0] || '').length + 1);
          const inp = h(`<input class="q-blank" data-blank="${s.blank}" style="--len:${len}ch" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Chỗ trống ${s.blank}">`);
          p.append(inp);
        }
      });
      root.append(p);
      if (v.hint) root.append(h(`<p class="q-hint q-tr">${esc(v.hint)}</p>`));
      const check = checkBtn();
      const inputs = $$('.q-blank', p);
      const go = () => commit({ blanks: Object.fromEntries(inputs.map((i) => [i.dataset.blank, i.value])) });
      inputs.forEach((i) => {
        i.addEventListener('input', () => (check.disabled = inputs.some((x) => !x.value.trim())));
        i.addEventListener('keydown', (e) => e.key === 'Enter' && !check.disabled && go());
      });
      check.addEventListener('click', go);
      root._focus = () => inputs[0]?.focus({ preventScroll: true });
      break;
    }
    case 'order': {
      root.append(h('<p class="q-instr">Kéo để sắp xếp</p>'));
      const list = h('<ol class="q-order"></ol>');
      v.options.forEach((o) => list.append(h(`<li class="q-chip" data-id="${o.id}" tabindex="0"><span class="q-grip" aria-hidden="true"></span><span class="q-text">${o.html}</span></li>`)));
      root.append(list);
      makeReorderable(list);
      const check = checkBtn(true);
      check.addEventListener('click', () => commit({ order: $$('.q-chip', list).map((c) => c.dataset.id) }));
      break;
    }
    case 'match': {
      root.append(h('<p class="q-instr">Chạm một ô bên trái rồi chạm ô hợp với nó</p>'));
      const grid = h('<div class="q-match"><div class="q-col q-lefts"></div><div class="q-col q-rights"></div></div>');
      const pairs = {};
      let active = null;
      const check = checkBtn();
      const paint = () => {
        const order = Object.keys(pairs);
        $$('.q-left', grid).forEach((b) => {
          const n = order.indexOf(b.dataset.id);
          b.dataset.pair = n >= 0 ? n + 1 : '';
          b.classList.toggle('is-active', b.dataset.id === active);
        });
        $$('.q-right', grid).forEach((b) => {
          const owner = Object.entries(pairs).find(([, m]) => m === b.dataset.id);
          b.dataset.pair = owner ? order.indexOf(owner[0]) + 1 : '';
        });
        check.disabled = Object.keys(pairs).length !== v.options.length;
      };
      v.options.forEach((o) => {
        const b = h(`<button type="button" class="q-left q-opt" data-id="${o.id}"><span class="q-text">${o.html}</span></button>`);
        b.addEventListener('click', () => {
          if (committed) return;
          if (pairs[o.id]) delete pairs[o.id];
          active = active === o.id ? null : o.id;
          paint();
        });
        $('.q-lefts', grid).append(b);
      });
      v.targets.forEach((t) => {
        const b = h(`<button type="button" class="q-right q-opt" data-id="${t.id}"><span class="q-text">${t.html}</span></button>`);
        b.addEventListener('click', () => {
          if (committed || !active) return;
          for (const [k, m] of Object.entries(pairs)) if (m === t.id) delete pairs[k];
          pairs[active] = t.id;
          active = null;
          paint();
        });
        $('.q-rights', grid).append(b);
      });
      root.append(grid);
      check.addEventListener('click', () => commit({ pairs: { ...pairs } }));
      break;
    }
    case 'flashcard': {
      const flash = h(`<div class="q-flash" tabindex="0" role="button" aria-label="${L.flip}"><div class="q-face q-front">${v.front || ''}</div><div class="q-face q-back">${v.back || ''}</div></div>`);
      if (v.image) $('.q-front', flash).append(h(`<img class="q-img" alt="" src="${v.image}">`));
      if (v.speak) {
        const sb = h(`<button type="button" class="q-speak${card.facet === 'listen' ? ' q-speak-big' : ''}" aria-label="${L.listen}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke-linecap="round"/></svg></button>`);
        sb.addEventListener('click', (e) => {
          e.stopPropagation();
          Speech.say(v.speak, card.lang);
        });
        $('.q-front', flash).prepend(sb);
      }
      const rate = h(`<div class="q-rate" hidden>${[1, 2, 3, 4].map((r) => `<button type="button" class="q-rate-btn" data-rating="${r}"><span class="q-rate-label">${RATING_LABEL[r]}</span><span class="q-rate-next">${card.next[r]}</span></button>`).join('')}</div>`);
      const flipBtn = h(`<button type="button" class="q-flip">${L.flip}</button>`);
      const flip = () => {
        if (flash.classList.contains('is-flipped')) return;
        flash.classList.add('is-flipped');
        flipBtn.hidden = true;
        rate.hidden = false;
      };
      flash.addEventListener('click', flip);
      flash.addEventListener('keydown', (e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), flip()));
      flipBtn.addEventListener('click', flip);
      $$('.q-rate-btn', rate).forEach((b) => b.addEventListener('click', () => commit({ rating: Number(b.dataset.rating) })));
      root.append(flash);
      actions.append(flipBtn, rate);
      root._flip = flip;
      break;
    }
  }
  if (actions.childElementCount) root.append(actions);
  host.replaceChildren(root);
  root._focus?.();

  return {
    el: root,
    /** Marks right and wrong and shows every option's explanation. */
    reveal(result, input) {
      root.classList.add('is-revealed', result.correct ? 'is-right' : 'is-wrongly');
      const k = card.key;
      $$('.q-check, .q-hint-btn', root).forEach((b) => (b.disabled = true));
      if (k.kind === 'choice') {
        $$('.q-opt', root).forEach((b) => {
          const id = b.dataset.id;
          if (k.correct.includes(id)) b.classList.add('is-correct');
          else if ((input.optionIds || []).includes(id)) b.classList.add('is-wrong');
          const why = card.feedback.whys[id];
          if (why) $('.q-why', b).innerHTML = why;
          b.disabled = true;
        });
      } else if (k.kind === 'tf') {
        $$('.q-opt', root).forEach((b) => {
          const val = b.dataset.value === 'true';
          if (val === k.value) b.classList.add('is-correct');
          else if (val === input.value) b.classList.add('is-wrong');
          b.disabled = true;
        });
      } else if (k.kind === 'typing') {
        const inp = $('.q-input', root);
        inp.readOnly = true;
        inp.classList.add(result.correct ? 'is-correct' : 'is-wrong');
        if (!result.correct || result.typo) root.append(h(`<p class="q-answer">Đáp án: <strong lang="en">${esc(k.accepted[0])}</strong></p>`));
      } else if (k.kind === 'cloze') {
        $$('.q-blank', root).forEach((i) => {
          const ok = matchTyped(i.value, k.blanks[i.dataset.blank]) !== 'wrong';
          i.readOnly = true;
          i.classList.add(ok ? 'is-correct' : 'is-wrong');
          if (!ok) i.after(h(`<span class="q-fix">${esc(k.blanks[i.dataset.blank][0])}</span>`));
        });
      } else if (k.kind === 'order') {
        $$('.q-chip', root).forEach((c, i) => {
          const right = k.order.indexOf(c.dataset.id);
          c.classList.add(right === i ? 'is-correct' : 'is-wrong');
          if (right !== i) c.append(h(`<span class="q-pos-fix">${right + 1}</span>`));
          c.classList.add('is-locked');
        });
      } else if (k.kind === 'match') {
        $$('.q-left', root).forEach((b) => {
          const ok = (input.pairs || {})[b.dataset.id] === k.pairs[b.dataset.id];
          b.classList.add(ok ? 'is-correct' : 'is-wrong');
          if (!ok) {
            const target = $(`.q-right[data-id="${k.pairs[b.dataset.id]}"]`, root);
            b.insertAdjacentHTML('beforeend', `<span class="q-why">→ ${esc(target.textContent)}</span>`);
          }
          b.disabled = true;
        });
        $$('.q-right', root).forEach((b) => (b.disabled = true));
      }
    },
    flip: () => root._flip?.(),
    typed: () => root._typed?.() ?? '',
  };
}

// ---------------------------------------------------------------- gestures
/** Drag to reorder a vertical list; other items glide out of the way. Arrow keys work too. */
function makeReorderable(list) {
  let drag = null;
  const items = () => $$('.q-chip', list);
  list.addEventListener('pointerdown', (e) => {
    const chip = e.target.closest('.q-chip');
    if (!chip || chip.classList.contains('is-locked')) return;
    e.preventDefault();
    const rects = items().map((c) => c.getBoundingClientRect());
    drag = { chip, startY: e.clientY, rects, from: items().indexOf(chip), to: items().indexOf(chip), id: e.pointerId };
    chip.setPointerCapture(e.pointerId);
    chip.classList.add('is-dragging');
    list.classList.add('is-sorting');
  });
  list.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.startY;
    drag.chip.style.transform = `translate3d(0, ${dy}px, 0) scale(1.03)`;
    const r = drag.rects[drag.from];
    const center = r.top + r.height / 2 + dy;
    let to = drag.from;
    drag.rects.forEach((rr, i) => {
      if (i < drag.from && center < rr.top + rr.height / 2) to = Math.min(to, i);
      if (i > drag.from && center > rr.top + rr.height / 2) to = Math.max(to, i);
    });
    drag.to = to;
    const gap = r.height + (drag.rects[1] ? drag.rects[1].top - drag.rects[0].bottom : 8);
    items().forEach((c, i) => {
      if (c === drag.chip) return;
      let shift = 0;
      if (drag.from < to && i > drag.from && i <= to) shift = -gap;
      if (drag.from > to && i < drag.from && i >= to) shift = gap;
      c.style.transform = shift ? `translate3d(0, ${shift}px, 0)` : '';
    });
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { chip, from, to } = drag;
    const all = items();
    all.forEach((c) => {
      c.style.transition = 'none';
      c.style.transform = '';
    });
    if (to !== from) {
      const ref = all[to];
      to > from ? ref.after(chip) : ref.before(chip);
    }
    chip.classList.remove('is-dragging');
    list.classList.remove('is-sorting');
    requestAnimationFrame(() => all.forEach((c) => (c.style.transition = '')));
    drag = null;
  };
  list.addEventListener('pointerup', end);
  list.addEventListener('pointercancel', end);
  list.addEventListener('keydown', (e) => {
    const chip = e.target.closest('.q-chip');
    if (!chip || chip.classList.contains('is-locked')) return;
    if (e.key === 'ArrowUp' && chip.previousElementSibling) {
      chip.previousElementSibling.before(chip);
      chip.focus();
      e.preventDefault();
    }
    if (e.key === 'ArrowDown' && chip.nextElementSibling) {
      chip.nextElementSibling.after(chip);
      chip.focus();
      e.preventDefault();
    }
  });
}

/**
 * Swipeable card: follows the finger with a slight tilt, flings out past a distance or speed
 * threshold, springs back otherwise. onDrag(dx, dy, progress) lets the demo paint stamps/glows.
 */
function makeSwipeable(el, { onDrag, onSwipe, onTap, enabled = () => true, allowUp = true } = {}) {
  let s = null;
  let raf = 0;
  const apply = () => {
    raf = 0;
    if (!s) return;
    el.style.transform = `translate3d(${s.dx}px, ${s.dy}px, 0) rotate(${s.dx * 0.05}deg)`;
    const w = el.offsetWidth || 300;
    onDrag?.(s.dx, s.dy, Math.min(1, Math.abs(s.dx) / (w * 0.3)));
  };
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', (e) => {
    if (!enabled() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.target.closest('button, a, input')) return;
    e.preventDefault();
    s = { x: e.clientX, y: e.clientY, dx: 0, dy: 0, moved: false, t: performance.now(), vx: 0, vy: 0, lx: e.clientX, ly: e.clientY, lt: performance.now(), id: e.pointerId };
    el.setPointerCapture(e.pointerId);
    el.style.transition = 'none';
  });
  el.addEventListener('pointermove', (e) => {
    if (!s || e.pointerId !== s.id) return;
    s.dx = e.clientX - s.x;
    s.dy = e.clientY - s.y;
    if (!s.moved && Math.hypot(s.dx, s.dy) > 6) s.moved = true;
    const now = performance.now();
    const dt = Math.max(1, now - s.lt);
    s.vx = 0.8 * ((e.clientX - s.lx) / dt) + 0.2 * s.vx;
    s.vy = 0.8 * ((e.clientY - s.ly) / dt) + 0.2 * s.vy;
    s.lx = e.clientX;
    s.ly = e.clientY;
    s.lt = now;
    if (s.moved && !raf) raf = requestAnimationFrame(apply);
  });
  const release = (e) => {
    if (!s || e.pointerId !== s.id) return;
    const st = s;
    s = null;
    cancelAnimationFrame(raf);
    raf = 0;
    if (!st.moved) {
      el.style.transform = '';
      onTap?.();
      return;
    }
    const w = el.offsetWidth || 300;
    const hgt = el.offsetHeight || 400;
    let dir = null;
    if (st.dx > w * 0.3 || (st.vx > 0.55 && st.dx > 30)) dir = 'right';
    else if (st.dx < -w * 0.3 || (st.vx < -0.55 && st.dx < -30)) dir = 'left';
    else if (allowUp && (st.dy < -hgt * 0.22 || (st.vy < -0.55 && st.dy < -30)) && Math.abs(st.dy) > Math.abs(st.dx)) dir = 'up';
    if (!dir) {
      el.style.transition = reduceMotion() ? 'none' : 'transform .42s cubic-bezier(.2,1.5,.4,1)';
      el.style.transform = '';
      onDrag?.(0, 0, 0);
      return;
    }
    fling(dir, st);
  };
  let gone = false;
  const fling = (dir, st = { dx: 0, dy: 0 }, then) => {
    if (gone) return;
    gone = true;
    const w = innerWidth;
    const tx = dir === 'right' ? w * 1.2 : dir === 'left' ? -w * 1.2 : st.dx;
    const ty = dir === 'up' ? -innerHeight : st.dy + 40;
    el.style.transition = reduceMotion() ? 'none' : 'transform .32s cubic-bezier(.3,.6,.4,1), opacity .32s';
    el.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotate(${dir === 'up' ? 0 : (dir === 'right' ? 1 : -1) * 18}deg)`;
    el.style.opacity = '0';
    setTimeout(() => (then ? then() : onSwipe?.(dir)), reduceMotion() ? 0 : 260);
  };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  /** Throws the card out programmatically (rating buttons); `then` replaces onSwipe. */
  return { fling: (dir, then) => fling(dir, undefined, then) };
}

// ---------------------------------------------------------------- slides (lesson decks)
/**
 * Renders a lesson's slide deck in a shadow root with the subject's theme. Each tap reveals the
 * next .step; past the last step it moves to the next slide.
 */
function mountSlides(host, lesson, { onChange, extraCss = '' } = {}) {
  const subject = CONTENT.courses[lesson.course].subject;
  const theme = (CONTENT.themes[subject] || '').replace(/:root/g, ':host').replace(/\.slides\s+section/g, 'section').replace(/\.slides\s+/g, '');
  const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>${theme}
    :host { display: block; position: relative; }
    .deck { position: relative; width: 100%; height: 100%; overflow: hidden; border-radius: inherit; }
    section { position: absolute; inset: 0; padding: clamp(20px, 5vw, 44px); box-sizing: border-box; overflow: auto; opacity: 0; transform: translateX(24px); transition: opacity .35s, transform .45s cubic-bezier(.2,.8,.3,1); pointer-events: none; font-size: clamp(15px, 2.4vw, 19px); line-height: 1.5; }
    section.is-on { opacity: 1; transform: none; pointer-events: auto; }
    section.is-past { transform: translateX(-24px); }
    section h2 { margin: 0 0 .6em; font-size: clamp(22px, 4.2vw, 34px); line-height: 1.15; }
    .step { opacity: 0; transform: translateY(10px); transition: opacity .35s, transform .45s cubic-bezier(.2,.8,.3,1); }
    .step.is-shown { opacity: 1; transform: none; }
    .step:not(.is-shown), .step:not(.is-shown) * { animation-play-state: paused !important; }
    @media (prefers-reduced-motion: reduce) { section, .step { transition: none; } }
    ${extraCss}</style><div class="deck">${lesson.slides}</div>`;
  const sections = [...shadow.querySelectorAll('section')];
  let si = 0;
  const steps = (s) => [...s.querySelectorAll('.step')];
  const shown = (s) => steps(s).filter((x) => x.classList.contains('is-shown')).length;
  const paint = () => {
    sections.forEach((s, i) => {
      s.classList.toggle('is-on', i === si);
      s.classList.toggle('is-past', i < si);
    });
    onChange?.({ index: si, count: sections.length, step: shown(sections[si]), steps: steps(sections[si]).length, title: sections[si].dataset.title || '' });
  };
  const api = {
    next() {
      const s = sections[si];
      const pending = steps(s).find((x) => !x.classList.contains('is-shown'));
      if (pending) pending.classList.add('is-shown');
      else if (si < sections.length - 1) si++;
      else return false;
      paint();
      return true;
    },
    prev() {
      const s = sections[si];
      const on = steps(s).filter((x) => x.classList.contains('is-shown'));
      if (on.length) on[on.length - 1].classList.remove('is-shown');
      else if (si > 0) si--;
      paint();
    },
    goto(i) {
      si = Math.max(0, Math.min(i, sections.length - 1));
      paint();
    },
    get count() {
      return sections.length;
    },
  };
  paint();
  return api;
}

// ---------------------------------------------------------------- router
const Router = {
  handlers: [],
  go(path) {
    if (location.hash.slice(1) === path) this.fire();
    else location.hash = path;
  },
  on(fn) {
    this.handlers.push(fn);
  },
  fire() {
    const parts = (location.hash.slice(1) || '/').split('/').filter(Boolean);
    this.handlers.forEach((fn) => fn(parts));
  },
  start() {
    addEventListener('hashchange', () => this.fire());
    this.fire();
  },
};

// ---------------------------------------------------------------- dates
function todayLabel(d = new Date()) {
  const days = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return `${days[d.getDay()]}, ${d.getDate()} tháng ${d.getMonth() + 1}`;
}
function heatDays(d = new Date()) {
  return LEARNER.heat.map((n, i) => {
    const day = new Date(d.getTime() - (LEARNER.heat.length - 1 - i) * 86400000);
    return { n, day, label: `${day.getDate()}/${day.getMonth() + 1}` };
  });
}
function dailyCounts() {
  const fresh = DAILY.filter((s) => s.isNew).length;
  return { total: DAILY.length, fresh, reviews: DAILY.length - fresh, minutes: Math.round(DAILY.length * 0.5) };
}
