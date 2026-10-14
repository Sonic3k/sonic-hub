import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchTyped, parseCloze } from '@learn/shared';
import { learningDay, learningDayBounds } from '../src/common/time.js';
import { replay, emptyCard } from '../src/study/scheduler.js';
import { autoRating } from '../src/study/grader.js';

const clock = { timezone: 'Asia/Ho_Chi_Minh', rolloverHour: 4 };

test('learning day rolls over at 04:00 Vietnam time', () => {
  // 2026-10-14 03:59 +07:00 still belongs to the 13th; 04:00 starts the 14th.
  assert.equal(learningDay(new Date('2026-10-13T20:59:00Z'), clock), '2026-10-13');
  assert.equal(learningDay(new Date('2026-10-13T21:00:00Z'), clock), '2026-10-14');
  const { start, end } = learningDayBounds('2026-10-14', clock);
  assert.equal(start.toISOString(), '2026-10-13T21:00:00.000Z');
  assert.equal(end.toISOString(), '2026-10-14T21:00:00.000Z');
});

test('cloze parsing keeps alternatives and hints', () => {
  const p = parseCloze("You {{c1::aren't supposed to|are not supposed to}} park {{c2::here::place}}.");
  assert.deepEqual(
    p.blanks.map((b) => [b.index, b.answers, b.hint]),
    [
      [1, ["aren't supposed to", 'are not supposed to'], null],
      [2, ['here'], 'place'],
    ],
  );
  assert.equal(p.full, "You aren't supposed to park here.");
});

test('typed answers tolerate small typos only on longer words', () => {
  assert.equal(matchTyped('  Deadline. ', ['deadline']), 'exact');
  assert.equal(matchTyped('dedline', ['deadline']), 'typo');
  assert.equal(matchTyped('cat', ['car']), 'wrong');
  assert.equal(matchTyped('postponed', ['postpone', 'postponed']), 'exact');
  assert.equal(matchTyped('work life balance', ['work-life balance', 'work life balance']), 'exact');
});

test('replaying the same history gives the same card', () => {
  const policy = { algorithm: 'fsrs', retention: 0.9, examDate: null };
  const reviews = [
    { rating: 3, reviewedAt: new Date('2026-10-01T02:00:00Z') },
    { rating: 3, reviewedAt: new Date('2026-10-03T02:00:00Z') },
    { rating: 1, reviewedAt: new Date('2026-10-09T02:00:00Z') },
    { rating: 3, reviewedAt: new Date('2026-10-09T02:10:00Z') },
  ];
  const a = replay(reviews, policy, new Date('2026-10-10T00:00:00Z'), clock);
  const b = replay(reviews, policy, new Date('2026-10-12T00:00:00Z'), clock);
  assert.deepEqual(a, b);
  assert.equal(a.reps, 4);
  assert.equal(a.lapses, 1);
  assert.equal(replay([], policy, new Date('2026-10-10T00:00:00Z'), clock).state, emptyCard(new Date()).state);
});

test('a higher retention target schedules sooner from the same history', () => {
  const reviews = [
    { rating: 3, reviewedAt: new Date('2026-10-01T02:00:00Z') },
    { rating: 3, reviewedAt: new Date('2026-10-04T02:00:00Z') },
    { rating: 3, reviewedAt: new Date('2026-10-14T02:00:00Z') },
  ];
  const relaxed = replay(reviews, { algorithm: 'fsrs', retention: 0.85, examDate: null }, new Date(), clock);
  const strict = replay(reviews, { algorithm: 'fsrs', retention: 0.95, examDate: null }, new Date(), clock);
  assert.equal(relaxed.stability, strict.stability);
  assert.ok(strict.due < relaxed.due);
});

test('an exam date caps the interval', () => {
  const reviews = Array.from({ length: 6 }, (_, i) => ({ rating: 4, reviewedAt: new Date(Date.UTC(2026, 9, 1 + i * 3, 2)) }));
  const card = replay(reviews, { algorithm: 'fsrs', retention: 0.9, examDate: '2026-10-25' }, new Date(), clock);
  assert.ok(card.due <= new Date('2026-10-25T00:00:00+07:00'), `due ${card.due.toISOString()}`);
});

test('auto rating: wrong → Again, typo or hint → Hard, slow → Hard, quick on a mature card → Easy', () => {
  const ok = { correct: true, typo: false, responseText: null, choices: [] };
  assert.equal(autoRating({ graded: { ...ok, correct: false }, type: 'single', promptChars: 40 }), 1);
  assert.equal(autoRating({ graded: { ...ok, typo: true }, type: 'typing', promptChars: 20 }), 2);
  assert.equal(autoRating({ graded: ok, type: 'single', promptChars: 40, hintUsed: true }), 2);
  assert.equal(autoRating({ graded: ok, type: 'single', promptChars: 40, timeMs: 60_000 }), 2);
  assert.equal(autoRating({ graded: ok, type: 'single', promptChars: 40, timeMs: 5_000 }), 3);
  assert.equal(autoRating({ graded: ok, type: 'single', promptChars: 40, timeMs: 2_000, card: { state: 2, stability: 40 } }), 4);
});
