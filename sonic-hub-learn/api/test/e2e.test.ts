import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { parseCloze, type AnswerInput, type AnswerResult, type ReadingResponse, type SessionCardView, type SessionView, type StatsView, type SubjectSummary } from '@learn/shared';
import pg from 'pg';
import { defaultContentDir, type AppConfig } from '../src/config.js';
import { checkContent } from '../src/content/check.js';
import { loadContent } from '../src/content/loader.js';
import { createMediaStore, syncMedia } from '../src/content/media.js';
import { syncContent, type SyncReport } from '../src/content/sync.js';
import { createDb, createPool, runMigrations } from '../src/db/db.js';
import { createApp } from '../src/main.js';

/*
 * End-to-end: sync the real content into a fresh database, then drive the HTTP API.
 * Needs TEST_DATABASE_URL pointing at a Postgres server (any database; a scratch one is created).
 */

const adminUrl = process.env.TEST_DATABASE_URL;
const clock = { timezone: 'Asia/Ho_Chi_Minh', rolloverHour: 4 };
const dbName = `learn_e2e_${process.pid}`;
const work = mkdtempSync(join(tmpdir(), 'learn-e2e-'));
const contentDir = join(work, 'content');
const mediaDir = join(work, 'media');
let dbUrl = '';
let base = '';
let close: () => Promise<void> = async () => {};
let sqlPool: pg.Pool;

async function sync(): Promise<SyncReport> {
  const model = loadContent(contentDir);
  const { issues, index } = checkContent(model);
  assert.deepEqual(
    issues.filter((i) => i.level === 'error'),
    [],
  );
  const pool = createPool(dbUrl, false);
  try {
    const db = createDb(pool);
    await runMigrations(db);
    const store = createMediaStore({ storage: 'local', prefix: 'learn', localDir: mediaDir, b2: { endpoint: '', region: '', keyId: '', appKey: '', bucket: '' } });
    const media = await syncMedia(db, store, 'learn', index.media.keys());
    return await syncContent(db, model, index, media, { now: new Date(), clock });
  } finally {
    await pool.end();
  }
}

async function q<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await sqlPool.query(text, params)).rows as T[];
}

async function api<T>(path: string, body?: unknown, method?: string): Promise<{ status: number; data: T }> {
  const res = await fetch(`${base}/api${path}`, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: (await res.json()) as T };
}

async function ok<T>(path: string, body?: unknown, method?: string): Promise<T> {
  const r = await api<T>(path, body, method);
  assert.ok(r.status < 300, `${path} → ${r.status} ${JSON.stringify(r.data)}`);
  return r.data;
}

/** Builds a right (or wrong) answer for a card by looking up the answer in the database. */
async function answerFor(card: SessionCardView, correct: boolean): Promise<AnswerInput> {
  const view = card.question;
  const base: AnswerInput = { sessionCardId: card.id, timeMs: 5000 };
  if (view.type === 'flashcard') return { ...base, rating: correct ? 3 : 1 };
  if (view.source === 'generated') {
    const [v] = await q<{ term: string; meaning: string }>('select term, meaning from item_vocab v join item i on i.id = v.item_id where i.key = $1', [card.itemKey]);
    if (view.type === 'single') {
      const right = view.options!.find((o) => o.textMd === v.meaning)!.id;
      return { ...base, optionIds: [correct ? right : view.options!.find((o) => o.id !== right)!.id] };
    }
    if (view.type === 'typing') return { ...base, text: correct ? v.term : 'zzz' };
    if (view.type === 'cloze') {
      const examples = await q<{ text: string }>('select e.text from item_example e join item i on i.id = e.item_id where i.key = $1', [card.itemKey]);
      const segs = JSON.stringify(view.cloze!.segments);
      const ex = examples.find((e) => JSON.stringify(parseCloze(e.text).segments) === segs)!;
      const blanks = Object.fromEntries(parseCloze(ex.text).blanks.map((b) => [String(b.index), correct ? b.answers[0] : 'zzz']));
      return { ...base, blanks };
    }
  }
  const [question] = await q<{ id: number; true_false_answer: boolean | null }>('select id, true_false_answer from question where key = $1', [view.questionKey]);
  const options = await q<{ id: number; is_correct: boolean }>(
    "select id, is_correct from question_option where question_id = $1 and status = 'active' order by sort",
    [question.id],
  );
  switch (view.type) {
    case 'single':
    case 'multi': {
      const right = options.filter((o) => o.is_correct).map((o) => `o${o.id}`);
      const wrong = options.filter((o) => !o.is_correct).map((o) => `o${o.id}`);
      return { ...base, optionIds: correct ? right : [wrong[0]] };
    }
    case 'true_false':
      return { ...base, value: correct ? !!question.true_false_answer : !question.true_false_answer };
    case 'typing': {
      const [a] = await q<{ text: string }>('select text from question_answer where question_id = $1 order by sort', [question.id]);
      return { ...base, text: correct ? a.text : 'zzz' };
    }
    case 'cloze': {
      const answers = await q<{ blank: number; text: string }>('select blank, text from question_answer where question_id = $1 order by blank, sort', [question.id]);
      const blanks: Record<string, string> = {};
      for (const a of answers) blanks[String(a.blank)] ??= correct ? a.text : 'zzz';
      return { ...base, blanks };
    }
    case 'order': {
      const order = options.map((o) => `o${o.id}`);
      return { ...base, order: correct ? order : [...order].reverse() };
    }
    case 'match': {
      const ids = options.map((o) => o.id);
      const pairs = Object.fromEntries(ids.map((id, i) => [`o${id}`, `m${correct ? id : ids[(i + 1) % ids.length]}`]));
      return { ...base, pairs };
    }
  }
  throw new Error(`no answer builder for ${view.type}`);
}

describe('learn API end to end', { skip: !adminUrl && 'TEST_DATABASE_URL not set' }, () => {
  before(async () => {
    const admin = new pg.Client({ connectionString: adminUrl });
    await admin.connect();
    await admin.query(`drop database if exists ${dbName}`);
    await admin.query(`create database ${dbName}`);
    await admin.end();
    const u = new URL(adminUrl!);
    u.pathname = `/${dbName}`;
    dbUrl = u.toString();
    sqlPool = new pg.Pool({ connectionString: dbUrl });
    cpSync(defaultContentDir, contentDir, { recursive: true });

    process.env.NODE_ENV = 'test';
    const config: AppConfig = {
      databaseUrl: dbUrl,
      databaseSsl: false,
      port: 0,
      corsOrigins: true,
      timezone: clock.timezone,
      dayRolloverHour: clock.rolloverHour,
      cronEnabled: false,
      media: { publicBaseUrl: 'http://media.test', serveLocalDir: null },
    };
    await sync();
    const app = await createApp(config);
    await app.listen(0, '127.0.0.1');
    base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
    close = () => app.close();
  });

  after(async () => {
    await close();
    await sqlPool?.end();
    if (adminUrl) {
      const admin = new pg.Client({ connectionString: adminUrl });
      await admin.connect();
      await admin.query(`drop database if exists ${dbName} with (force)`);
      await admin.end();
    }
    rmSync(work, { recursive: true, force: true });
  });

  test('a second sync with no content change touches nothing', async () => {
    const report = await sync();
    assert.equal(report.items.changed, 0);
    assert.equal(report.questions.changed, 0);
    assert.deepEqual(report.cards, { created: 0, rebuilt: 0, removed: 0 });
    assert.equal(report.media.uploaded, 0);
  });

  test('media paths become CDN URLs', async () => {
    const course = await ok<{ chapters: { lessons: { id: number }[] }[] }>('/courses/saa-c03');
    const lesson = await ok<{ bodyMd: string; items: { imageUrl: string | null }[] }>(`/lessons/${course.chapters[0].lessons[0].id}`);
    assert.match(lesson.bodyMd, /\(http:\/\/media\.test\/learn\/[0-9a-f]{24}\.svg\)/);
    assert.match(lesson.items[0].imageUrl ?? '', /^http:\/\/media\.test\/learn\//);
  });

  test('subjects carry their colour', async () => {
    const subjects = await ok<SubjectSummary[]>('/subjects');
    assert.equal(subjects.find((s) => s.key === 'english')!.color, '#2F55CF');
    assert.equal(subjects.find((s) => s.key === 'aws')!.color, '#D88400');
  });

  test('daily mixes enrolled courses, and stays the same all day', async () => {
    for (const c of ['workplace-english', 'ielts-6-essentials']) await ok(`/courses/${c}/enrollment`, { enrolled: true });
    const daily = await ok<SessionView>('/daily');
    assert.ok(daily.cards.length > 0);
    assert.notEqual(daily.cards[0].courseKey, daily.cards[1].courseKey, 'new cards alternate between courses');
    const keys = daily.cards.map((c) => `${c.itemKey}:${c.facet}`);
    assert.equal(new Set(keys).size, keys.length, 'each item facet appears once');
    assert.ok(!keys.some((k) => k.endsWith(':recall') && k.startsWith('en.') && !k.includes('grammar')), 'vocab recall waits until recognize is stable');
    assert.ok(!daily.cards.some((c) => c.courseKey === 'saa-c03'));
    const again = await ok<SessionView>('/daily');
    assert.equal(again.id, daily.id);
  });

  test('a course enrolled mid-day joins today\'s daily', async () => {
    const before = await ok<SessionView>('/daily');
    await ok('/courses/saa-c03/enrollment', { enrolled: true });
    const after = await ok<SessionView>('/daily');
    assert.equal(after.id, before.id);
    const added = after.cards.slice(before.cards.length);
    assert.ok(added.length > 0 && added.every((c) => c.courseKey === 'saa-c03'));
  });

  test('continue reading: first lesson of an enrolled course, then where the learner stopped', async () => {
    const start = (await ok<ReadingResponse>('/reading')).reading!;
    assert.equal(start.position, 0);
    assert.ok(['workplace-english', 'ielts-6-essentials', 'saa-c03'].includes(start.course.key));
    const saa = await ok<{ chapters: { lessons: { id: number; hasBody: boolean }[] }[] }>('/courses/saa-c03');
    const lessonId = saa.chapters[0].lessons.find((l) => l.hasBody)!.id;
    await ok(`/lessons/${lessonId}/progress`, { position: 0.4 }, 'PUT');
    const now = (await ok<ReadingResponse>('/reading')).reading!;
    assert.equal(now.lesson.id, lessonId);
    assert.equal(now.position, 0.4);
    assert.equal(now.subjectKey, 'aws');
    await ok(`/lessons/${lessonId}/progress`, { position: 0.1 }, 'PUT');
    assert.equal((await ok<ReadingResponse>('/reading')).reading!.position, 0.4, 'opening the lesson again at the top keeps the furthest point');
    await ok(`/lessons/${lessonId}/progress`, { position: 1 }, 'PUT');
    assert.equal((await ok<ReadingResponse>('/reading')).reading, null, 'read through, and no other readable lesson follows in the course');
    assert.equal((await api(`/lessons/${lessonId}/progress`, { position: 2 }, 'PUT')).status, 400);
    assert.equal((await api('/lessons/999999/progress', { position: 0.5 }, 'PUT')).status, 404);
  });

  test('an answer counts for every course that shares the item', async () => {
    const daily = await ok<SessionView>('/daily');
    const card = daily.cards.find((c) => c.itemKey === 'en.deadline' && c.facet === 'recognize')!;
    const result = await ok<AnswerResult>(`/sessions/${daily.id}/answers`, await answerFor(card, true));
    assert.equal(result.correct, true);
    assert.equal(result.rating, 3);
    const cards = await q<{ key: string; reps: number; state: number }>(
      "select c.key, cc.reps, cc.state from course_card cc join course c on c.id = cc.course_id join item i on i.id = cc.item_id where i.key = 'en.deadline' and cc.facet = 'recognize' order by c.key",
    );
    assert.deepEqual(
      cards.map((c) => [c.key, c.reps]),
      [
        ['english-all-flashcards', 1],
        ['ielts-6-essentials', 1],
        ['workplace-english', 1],
      ],
    );
    assert.equal((await api(`/sessions/${daily.id}/answers`, await answerFor(card, true))).status, 409, 'a card is answered once');
  });

  test('the same answer sent twice (same clientId) is recorded once', async () => {
    const daily = await ok<SessionView>('/daily');
    const card = daily.cards.find((c) => c.status === 'pending' && c.question.source === 'generated' && c.question.type === 'single')!;
    const body = { ...(await answerFor(card, true)), clientId: 'dup-1' };
    const first = await ok<AnswerResult>(`/sessions/${daily.id}/answers`, body);
    const second = await ok<AnswerResult>(`/sessions/${daily.id}/answers`, body);
    assert.equal(second.sessionCardId, first.sessionCardId);
    assert.equal(second.rating, first.rating);
    const [{ n }] = await q<{ n: number }>("select count(*)::int as n from review_log where client_id = 'dup-1'");
    assert.equal(n, 1);
  });

  test('a miss comes back later in the session, with another question when there is one', async () => {
    const quiz = await ok<SessionView>('/sessions', { mode: 'quiz', courseKey: 'saa-c03', scope: { itemKeys: ['aws.s3.storage-classes'] }, facets: ['apply'] });
    assert.equal(quiz.cards.length, 1);
    const card = quiz.cards[0];
    const result = await ok<AnswerResult>(`/sessions/${quiz.id}/answers`, await answerFor(card, false));
    assert.equal(result.rating, 1);
    assert.ok(result.feedback?.optionWhys && Object.keys(result.feedback.optionWhys).length >= 3, 'every option explains itself');
    const after = await ok<SessionView>(`/sessions/${quiz.id}`);
    const requeued = after.cards.find((c) => c.id === result.requeuedCardId)!;
    assert.ok(requeued.isRequeue);
    assert.notEqual(requeued.question.questionKey, card.question.questionKey);
  });

  test('every question type is graded', async () => {
    const quiz = await ok<SessionView>('/sessions', {
      mode: 'quiz',
      courseKey: 'saa-c03',
      scope: { itemKeys: ['aws.s3.lifecycle-rules', 'aws.s3.encryption', 'aws.s3.versioning'] },
      facets: ['apply'],
    });
    const types = new Set<string>();
    for (const card of quiz.cards) {
      const r = await ok<AnswerResult>(`/sessions/${quiz.id}/answers`, await answerFor(card, true));
      assert.equal(r.correct, true, `${card.question.type} ${card.question.questionKey}`);
      types.add(card.question.type);
    }
    assert.ok(types.has('order') || types.has('true_false') || types.has('match'));

    const english = await ok<SessionView>('/sessions', {
      mode: 'quiz',
      courseKey: 'workplace-english',
      scope: { itemKeys: ['en.grammar.be-supposed-to', 'en.grammar.polite-requests', 'en.agenda'] },
      facets: ['apply', 'use', 'recall'],
      size: 50,
    });
    for (const card of english.cards) {
      const r = await ok<AnswerResult>(`/sessions/${english.id}/answers`, await answerFor(card, true));
      assert.equal(r.correct, true, `${card.question.type} ${card.question.questionKey ?? card.question.generator}`);
    }
  });

  test('a typed answer with a small typo counts, graded Hard', async () => {
    const quiz = await ok<SessionView>('/sessions', { mode: 'quiz', courseKey: 'workplace-english', scope: { itemKeys: ['en.postpone'] }, facets: ['recall'] });
    const card = quiz.cards[0];
    assert.equal(card.question.type, 'typing');
    const r = await ok<AnswerResult>(`/sessions/${quiz.id}/answers`, { sessionCardId: card.id, text: 'postpne', timeMs: 4000 });
    assert.equal(r.correct, true);
    assert.equal(r.typo, true);
    assert.equal(r.rating, 2);
  });

  test('flashcards are self-graded and wrong shapes are rejected', async () => {
    const deck = await ok<SessionView>('/sessions', { mode: 'flashcard', courseKey: 'english-all-flashcards', size: 3 });
    assert.ok(deck.cards.every((c) => c.question.type === 'flashcard' && c.question.flashcard));
    for (const c of deck.cards) {
      const due = c.ratingDue!;
      assert.ok(due, 'pending flashcards preview each grade');
      const t = [1, 2, 3, 4].map((r) => Date.parse(due[r as 1 | 2 | 3 | 4]));
      assert.ok(t[0] <= t[1] && t[1] <= t[2] && t[2] <= t[3], 'a better grade never comes back sooner');
      if (c.itemKind === 'vocab' && c.facet === 'recognize') assert.ok(c.question.vocab?.term, 'vocab flashcards carry the word');
    }
    const bad = await api(`/sessions/${deck.id}/answers`, { sessionCardId: deck.cards[0].id });
    assert.equal(bad.status, 400);
    const r = await ok<AnswerResult>(`/sessions/${deck.id}/answers`, { sessionCardId: deck.cards[0].id, rating: 4 });
    assert.equal(r.rating, 4);
    const after = (await ok<SessionView>(`/sessions/${deck.id}`)).cards.find((c) => c.id === deck.cards[0].id)!;
    assert.deepEqual(after.response, { rating: 4 });
    assert.equal(after.ratingDue, null);
  });

  test('exam answers are saved blind, then graded by domain on submit', async () => {
    const exam = await ok<SessionView>('/sessions', { mode: 'exam', courseKey: 'saa-c03' });
    assert.ok(exam.deadlineAt);
    const sent = new Map<number, AnswerInput>();
    for (const [i, card] of exam.cards.entries()) {
      const input = await answerFor(card, i % 2 === 0);
      sent.set(card.id, input);
      const r = await ok<AnswerResult>(`/sessions/${exam.id}/answers`, input);
      assert.equal(r.saved, true);
      assert.equal(r.feedback, null);
    }
    const midway = await ok<SessionView>(`/sessions/${exam.id}`);
    for (const c of midway.cards) {
      assert.equal(c.status, 'saved');
      assert.deepEqual(c.outcome, { correct: null, rating: null }, 'still blind before submit');
      const { sessionCardId: _id, timeMs: _t, ...given } = sent.get(c.id)!;
      assert.deepEqual(c.response, given, 'the saved answer comes back when revisiting a question');
    }
    const done = await ok<SessionView>(`/sessions/${exam.id}/submit`, {});
    assert.ok(done.cards.every((c) => c.response), 'answers stay visible in the review');
    assert.equal(done.status, 'submitted');
    assert.equal(done.exam!.total, exam.cards.length);
    assert.equal(done.exam!.correct, Math.ceil(exam.cards.length / 2));
    assert.equal(done.exam!.domains.reduce((s, d) => s + d.total, 0), exam.cards.length);
    assert.ok(done.cards.every((c) => c.feedback));
    assert.equal((await api(`/sessions/${exam.id}/submit`, {})).status, 409);
    const [{ n }] = await q<{ n: number }>("select count(*)::int as n from review_log where mode = 'exam' and session_id = $1", [exam.id]);
    assert.equal(n, exam.cards.length);
  });

  test('a collection course added later starts from what is already known', async () => {
    const dir = join(contentDir, 'english/courses/review-deck');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'course.yaml'),
      'id: review-deck\ntitle: Review deck\nsource:\n  type: self\npolicy:\n  facets: [recognize]\ninclude:\n  - courses: [workplace-english]\n    kinds: [vocab]\n',
    );
    const report = await sync();
    assert.ok(report.cards.created > 0);
    const [card] = await q<{ reps: number; state: number }>(
      "select cc.reps, cc.state from course_card cc join course c on c.id = cc.course_id join item i on i.id = cc.item_id where c.key = 'review-deck' and i.key = 'en.deadline' and cc.facet = 'recognize'",
    );
    assert.ok(card.reps >= 1 && card.state !== 0, 'history replayed into the new course');
  });

  test('changing a course policy rebuilds its cards from history', async () => {
    const file = join(contentDir, 'english/courses/workplace-english/course.yaml');
    writeFileSync(file, readFileSync(file, 'utf8').replace('retention: 0.9', 'retention: 0.95'));
    const report = await sync();
    assert.ok(report.cards.rebuilt > 0);
    const [c] = await q<{ retention: number }>("select retention from course where key = 'workplace-english'");
    assert.equal(c.retention, 0.95);
  });

  test('edits keep option identity; removed content is archived, not deleted', async () => {
    const file = join(contentDir, 'english/courses/workplace-english/02-meetings/01-running-a-meeting.items.yaml');
    const before = await q<{ id: number; text_md: string }>(
      "select o.id, o.text_md from question_option o join question q on q.id = o.question_id where q.key = 'en.grammar.polite-requests#mind-ing' order by o.sort",
    );
    let text = readFileSync(file, 'utf8');
    text = text.replace('why: mind luôn đi với V-ing.', 'why: Sau mind luôn là V-ing.');
    text = text.replace("          - text: opened\n            why: Quá khứ phân từ không đứng sau mind trong câu yêu cầu.\n", '');
    text = text.replace(/\n  - id: en\.wrap-up[\s\S]*?(?=\n  - id: en\.grammar\.polite-requests)/, '');
    writeFileSync(file, text);
    const report = await sync();
    assert.equal(report.items.archived, 1);
    const after = await q<{ id: number; text_md: string; status: string; why_md: string }>(
      "select o.id, o.text_md, o.status, o.why_md from question_option o join question q on q.id = o.question_id where q.key = 'en.grammar.polite-requests#mind-ing' order by o.sort",
    );
    assert.deepEqual(
      after.map((o) => o.id),
      before.map((o) => o.id),
    );
    assert.equal(after.find((o) => o.text_md === 'opening')!.why_md, 'Sau mind luôn là V-ing.');
    assert.equal(after.find((o) => o.text_md === 'opened')!.status, 'archived');
    const [wrap] = await q<{ status: string }>("select status from item where key = 'en.wrap-up'");
    assert.equal(wrap.status, 'archived');
    const [{ n }] = await q<{ n: number }>("select count(*)::int as n from course_card cc join item i on i.id = cc.item_id where i.key = 'en.wrap-up'");
    assert.equal(n, 0);
  });

  test('stats and leeches answer', async () => {
    const stats = await ok<StatsView>('/stats');
    assert.ok(stats.today.reviewed > 0);
    assert.equal(stats.reviewsByDay.length, 30);
    assert.equal(stats.streakDays, 1);
    assert.equal(stats.bestStreakDays, 1);
    assert.ok(stats.dueTomorrow >= stats.today.dueRemaining);
    assert.ok(Array.isArray(await ok('/leeches')));
    // wrong twice on the same facet: it joins the "keeps forgetting" list
    const quiz = await ok<SessionView>('/sessions', { mode: 'quiz', courseKey: 'workplace-english', scope: { itemKeys: ['en.agenda'] }, facets: ['recognize'] });
    const first = await ok<AnswerResult>(`/sessions/${quiz.id}/answers`, await answerFor(quiz.cards[0], false));
    const requeued = (await ok<SessionView>(`/sessions/${quiz.id}`)).cards.find((c) => c.id === first.requeuedCardId)!;
    await ok<AnswerResult>(`/sessions/${quiz.id}/answers`, await answerFor(requeued, false));
    const weak = await ok<{ itemKey: string; facet: string; againCount: number }[]>('/leeches?weak=true');
    const agenda = weak.find((w) => w.itemKey === 'en.agenda' && w.facet === 'recognize');
    assert.ok(agenda && agenda.againCount >= 2);
    const search = await ok<{ items: { key: string }[] }>('/search?q=deadline');
    assert.equal(search.items[0].key, 'en.deadline');
  });
});
