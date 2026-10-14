import { CardState, KIND_FACETS, type Facet, type Generator, type ItemKind, type SessionScopeInput, type StudyMode } from '@learn/shared';
import { and, asc, eq, inArray, isNull, ne, or, sql, type SQL } from 'drizzle-orm';
import type { DayClock } from '../common/time.js';
import { groupBy, rng, shuffled } from '../common/util.js';
import type { DbExecutor } from '../db/db.js';
import {
  chapter,
  course,
  courseCard,
  courseExamDomain,
  courseItem,
  item,
  itemExposure,
  itemTag,
  lesson,
  lessonItem,
  question,
  questionTag,
  reviewLog,
  tag,
} from '../db/schema.js';
import { policyOf } from './projection.js';
import type { ItemData, QuestionCandidate } from './loaders.js';
import { LADDER_MIN_STABILITY_DAYS, retrievability, type SchedulePolicy } from './scheduler.js';

export interface SelectedCard {
  courseId: number;
  itemId: number;
  facet: Facet;
  isNew: boolean;
  questionId: number | null;
  generator: Generator | null;
}

export interface CoursePolicyRow {
  id: number;
  key: string;
  algorithm: string;
  retention: number;
  examDate: string | null;
  newPerDay: number;
  maxReviewsPerDay: number;
  newOrder: string;
}

type CardRow = typeof courseCard.$inferSelect & { kind: ItemKind; itemSort: number; firstSeenAt: Date | null };

const key = (c: { itemId: number; facet: string }) => `${c.itemId}:${c.facet}`;

async function loadCards(db: DbExecutor, courseIds: number[], extra?: SQL): Promise<CardRow[]> {
  if (!courseIds.length) return [];
  const rows = await db
    .select({ card: courseCard, kind: item.kind, itemSort: courseItem.sort, firstSeenAt: itemExposure.firstSeenAt })
    .from(courseCard)
    .innerJoin(item, and(eq(item.id, courseCard.itemId), eq(item.status, 'active')))
    .innerJoin(courseItem, and(eq(courseItem.courseId, courseCard.courseId), eq(courseItem.itemId, courseCard.itemId)))
    .leftJoin(itemExposure, eq(itemExposure.itemId, courseCard.itemId))
    .where(extra ? and(inArray(courseCard.courseId, courseIds), extra) : inArray(courseCard.courseId, courseIds));
  return rows.map((r) => ({ ...r.card, kind: r.kind, itemSort: r.itemSort, firstSeenAt: r.firstSeenAt }));
}

/** New cards a course may introduce: one facet per item, later facets once the earlier ones are stable. */
function eligibleNew(rows: CardRow[], newOrder: string, seed: number): CardRow[] {
  const eligible: CardRow[] = [];
  for (const cards of groupBy(rows, (r) => r.itemId).values()) {
    const byFacet = new Map(cards.map((c) => [c.facet, c]));
    const ladder = KIND_FACETS[cards[0].kind].filter((f) => byFacet.has(f));
    for (let i = 0; i < ladder.length; i++) {
      const card = byFacet.get(ladder[i])!;
      if (card.state !== CardState.New) continue;
      const ready = ladder.slice(0, i).every((f) => {
        const prev = byFacet.get(f)!;
        return prev.state === CardState.Review && prev.stability >= LADDER_MIN_STABILITY_DAYS;
      });
      if (ready) eligible.push(card);
      break;
    }
  }
  const facetIndex = (c: CardRow) => KIND_FACETS[c.kind].indexOf(c.facet);
  const exposed = eligible.filter((c) => c.firstSeenAt).sort((a, b) => a.firstSeenAt!.getTime() - b.firstSeenAt!.getTime());
  const rest = eligible.filter((c) => !c.firstSeenAt);
  const ordered =
    newOrder === 'random' ? shuffled(rest, rng(seed)) : rest.sort((a, b) => a.itemSort - b.itemSort || facetIndex(a) - facetIndex(b));
  return [...exposed, ...ordered];
}

/** Spreads new cards evenly between reviews. */
function interleave<T>(reviews: T[], news: T[]): T[] {
  if (!news.length) return reviews;
  if (!reviews.length) return news;
  const gap = Math.max(1, Math.floor(reviews.length / news.length));
  const out: T[] = [];
  let n = 0;
  reviews.forEach((r, i) => {
    out.push(r);
    if ((i + 1) % gap === 0 && n < news.length) out.push(news[n++]);
  });
  while (n < news.length) out.push(news[n++]);
  return out;
}

/**
 * Daily: every card due before the learning day ends (most likely forgotten first) plus each
 * course's quota of new cards — read items first, then course order. Each item facet appears once
 * even when several courses share it.
 */
export async function selectDaily(
  db: DbExecutor,
  courses: (CoursePolicyRow & { newPerDayOverride: number | null })[],
  opts: { now: Date; dayEnd: Date; clock: DayClock; seed: number },
): Promise<SelectedCard[]> {
  const reviews = new Map<string, { card: CardRow; r: number }>();
  const newKeys = new Set<string>();
  const newByCourse: CardRow[][] = [];
  for (const c of courses) {
    const policy = policyOf(c);
    const rows = await loadCards(db, [c.id]);
    const due = rows
      .filter((r) => r.state !== CardState.New && r.due < opts.dayEnd)
      .map((card) => ({ card, r: retrievability(card, opts.now, policy, opts.clock) }))
      .sort((a, b) => a.r - b.r)
      .slice(0, c.maxReviewsPerDay);
    for (const d of due) {
      const prev = reviews.get(key(d.card));
      if (!prev || d.r < prev.r) reviews.set(key(d.card), d);
    }
    const quota = c.newPerDayOverride ?? c.newPerDay;
    const picked: CardRow[] = [];
    for (const card of eligibleNew(rows, c.newOrder, opts.seed)) {
      if (picked.length >= quota) break;
      if (newKeys.has(key(card))) continue;
      newKeys.add(key(card));
      picked.push(card);
    }
    newByCourse.push(picked);
  }
  const reviewList = [...reviews.values()].sort((a, b) => a.r - b.r).map((d) => d.card);
  // Alternate courses so a long Daily mixes subjects instead of running one course after another.
  const newList: CardRow[] = [];
  for (let i = 0; newByCourse.some((l) => i < l.length); i++) for (const l of newByCourse) if (i < l.length) newList.push(l[i]);
  return interleave(
    reviewList.map((c) => toSelected(c, false)),
    newList.map((c) => toSelected(c, true)),
  );
}

function toSelected(c: CardRow, isNew: boolean): SelectedCard {
  return { courseId: c.courseId, itemId: c.itemId, facet: c.facet, isNew, questionId: null, generator: null };
}

/** Item ids matching a scope; null when the scope sets no filter. Different filters intersect. */
async function scopeItemIds(db: DbExecutor, courseIds: number[], scope: SessionScopeInput): Promise<Set<number> | null> {
  const sets: Set<number>[] = [];
  if (scope.lessonIds?.length) {
    const rows = await db.select({ id: lessonItem.itemId }).from(lessonItem).where(inArray(lessonItem.lessonId, scope.lessonIds));
    sets.push(new Set(rows.map((r) => r.id)));
  }
  if (scope.chapterKeys?.length) {
    const matches = scope.chapterKeys.map((k) => or(eq(chapter.key, k), sql`${chapter.key} like ${`${k}/%`}`)!);
    const rows = await db
      .select({ id: lessonItem.itemId })
      .from(lessonItem)
      .innerJoin(lesson, eq(lesson.id, lessonItem.lessonId))
      .innerJoin(chapter, eq(chapter.id, lesson.chapterId))
      .where(and(inArray(lesson.courseId, courseIds), or(...matches)));
    sets.push(new Set(rows.map((r) => r.id)));
  }
  if (scope.tags?.length) {
    const rows = await db.select({ id: itemTag.itemId }).from(itemTag).innerJoin(tag, eq(tag.id, itemTag.tagId)).where(inArray(tag.key, scope.tags));
    sets.push(new Set(rows.map((r) => r.id)));
  }
  if (scope.itemKeys?.length) {
    const rows = await db.select({ id: item.id }).from(item).where(inArray(item.key, scope.itemKeys));
    sets.push(new Set(rows.map((r) => r.id)));
  }
  if (!sets.length) return null;
  return sets.reduce((acc, s) => new Set([...acc].filter((id) => s.has(id))));
}

/**
 * Quiz / flashcards over a scope: cards that are due come first (most likely forgotten first),
 * the rest in random order. Nothing is gated — new cards are included too.
 */
export async function selectScoped(
  db: DbExecutor,
  courses: CoursePolicyRow[],
  opts: { scope: SessionScopeInput; facets?: Facet[]; size: number; now: Date; clock: DayClock; seed: number },
): Promise<SelectedCard[]> {
  const courseIds = courses.map((c) => c.id);
  const itemIds = await scopeItemIds(db, courseIds, opts.scope);
  if (itemIds && !itemIds.size) return [];
  let rows = await loadCards(db, courseIds, itemIds ? inArray(courseCard.itemId, [...itemIds]) : undefined);
  if (opts.facets?.length) rows = rows.filter((r) => opts.facets!.includes(r.facet));

  if (opts.scope.weak) {
    const againRows = rows.length
      ? await db
          .select({ itemId: reviewLog.itemId, facet: reviewLog.facet, again: sql<number>`count(*) filter (where ${reviewLog.rating} = 1)::int` })
          .from(reviewLog)
          .where(inArray(reviewLog.itemId, [...new Set(rows.map((r) => r.itemId))]))
          .groupBy(reviewLog.itemId, reviewLog.facet)
      : [];
    const again = new Map(againRows.map((a) => [key(a), a.again]));
    rows = rows.filter((r) => r.leech || r.lapses >= 2 || (again.get(key(r)) ?? 0) >= 2);
  }

  const order = new Map(courseIds.map((id, i) => [id, i]));
  const unique = new Map<string, CardRow>();
  for (const r of [...rows].sort((a, b) => order.get(a.courseId)! - order.get(b.courseId)!)) if (!unique.has(key(r))) unique.set(key(r), r);

  const policies = new Map(courses.map((c) => [c.id, policyOf(c)]));
  const all = [...unique.values()];
  const due = all
    .filter((r) => r.state !== CardState.New && r.due <= opts.now)
    .map((card) => ({ card, r: retrievability(card, opts.now, policies.get(card.courseId)!, opts.clock) }))
    .sort((a, b) => a.r - b.r)
    .map((d) => d.card);
  const dueKeys = new Set(due.map(key));
  const random = rng(opts.seed);
  const rest = shuffled(
    all.filter((r) => !dueKeys.has(key(r))),
    random,
  );
  const picked = [...due, ...rest].slice(0, opts.size);
  return shuffled(picked, random).map((c) => toSelected(c, c.state === CardState.New));
}

export interface ExamDomain {
  key: string;
  title: string;
  weight: number;
  tag: string;
}

export async function loadExamDomains(db: DbExecutor, courseId: number): Promise<ExamDomain[]> {
  return db
    .select({ key: courseExamDomain.key, title: courseExamDomain.title, weight: courseExamDomain.weight, tag: tag.key })
    .from(courseExamDomain)
    .innerJoin(tag, eq(tag.id, courseExamDomain.tagId))
    .where(eq(courseExamDomain.courseId, courseId))
    .orderBy(asc(courseExamDomain.sort));
}

/** A question's exam domain: by its own tags first, then by its item's tags. */
export function domainOf(questionTags: string[], itemTags: string[], domains: ExamDomain[]): string | null {
  return domains.find((d) => questionTags.includes(d.tag))?.key ?? domains.find((d) => itemTags.includes(d.tag))?.key ?? null;
}

/** Exam: authored questions sampled by domain weight, then shuffled. */
export async function selectExam(db: DbExecutor, c: { id: number; examQuestionCount: number | null }, seed: number): Promise<SelectedCard[]> {
  const total = c.examQuestionCount ?? 65;
  const qs = await db
    .select({ id: question.id, itemId: question.itemId, facet: question.facet })
    .from(question)
    .innerJoin(courseItem, and(eq(courseItem.itemId, question.itemId), eq(courseItem.courseId, c.id)))
    .innerJoin(item, and(eq(item.id, question.itemId), eq(item.status, 'active')))
    .where(and(eq(question.status, 'active'), ne(question.type, 'flashcard'), or(isNull(question.courseId), eq(question.courseId, c.id))));
  if (!qs.length) return [];
  const qTags = await db
    .select({ id: questionTag.questionId, key: tag.key })
    .from(questionTag)
    .innerJoin(tag, eq(tag.id, questionTag.tagId))
    .where(inArray(questionTag.questionId, qs.map((q) => q.id)));
  const iTags = await db
    .select({ id: itemTag.itemId, key: tag.key })
    .from(itemTag)
    .innerJoin(tag, eq(tag.id, itemTag.tagId))
    .where(inArray(itemTag.itemId, [...new Set(qs.map((q) => q.itemId))]));
  const qTagMap = groupBy(qTags, (t) => t.id);
  const iTagMap = groupBy(iTags, (t) => t.id);
  const domains = await loadExamDomains(db, c.id);
  const random = rng(seed);

  const byDomain = groupBy(
    shuffled(qs, random),
    (q) =>
      domainOf(
        (qTagMap.get(q.id) ?? []).map((t) => t.key),
        (iTagMap.get(q.itemId) ?? []).map((t) => t.key),
        domains,
      ) ?? '',
  );
  const weightSum = domains.reduce((s, d) => s + d.weight, 0) || 1;
  const picked: typeof qs = [];
  for (const d of domains) picked.push(...(byDomain.get(d.key) ?? []).slice(0, Math.round((total * d.weight) / weightSum)));
  const pickedIds = new Set(picked.map((q) => q.id));
  const leftovers = shuffled(
    qs.filter((q) => !pickedIds.has(q.id)),
    random,
  );
  picked.push(...leftovers.slice(0, Math.max(0, total - picked.length)));
  return shuffled(picked.slice(0, total), random).map((q) => ({
    courseId: c.id,
    itemId: q.itemId,
    facet: q.facet,
    isNew: false,
    questionId: q.id,
    generator: null,
  }));
}

const VOCAB_GENERATOR: Partial<Record<Facet, Generator>> = {
  recognize: 'vocab-recognize',
  recall: 'vocab-recall',
  use: 'vocab-use',
  listen: 'vocab-listen',
};

/**
 * Which question a card asks: the authored question or generator answered longest ago, so each
 * review shows a different angle of the same item.
 */
export function pickQuestion(
  card: { courseId: number; itemId: number; facet: Facet },
  item: ItemData,
  mode: StudyMode,
  candidates: QuestionCandidate[],
  usage: Map<string, number>,
  random: () => number,
  exclude?: { questionId: number | null; generator: Generator | null },
): { questionId: number | null; generator: Generator | null } {
  const visible = candidates.filter(
    (q) => q.itemId === card.itemId && q.facet === card.facet && (q.courseId === null || q.courseId === card.courseId),
  );
  type Option = { questionId: number | null; generator: Generator | null; usageKey: string };
  let options: Option[];
  if (mode === 'flashcard') {
    if (item.kind === 'vocab' || card.facet === 'recall' || !visible.length) return { questionId: null, generator: 'flashcard' };
    options = visible.map((q) => ({ questionId: q.id, generator: 'flashcard', usageKey: `q:${q.id}` }));
  } else {
    options = visible.map((q) => ({ questionId: q.id, generator: null, usageKey: `q:${q.id}` }));
    if (item.kind === 'vocab') {
      const gen = VOCAB_GENERATOR[card.facet];
      const hasCloze = item.examples.some((e) => e.text.includes('{{c'));
      if (gen && (card.facet !== 'use' || hasCloze)) options.push({ questionId: null, generator: gen, usageKey: `g:${card.itemId}:${card.facet}:${gen}` });
    } else if (card.facet === 'recall') {
      options.push({ questionId: null, generator: 'flashcard', usageKey: `g:${card.itemId}:${card.facet}:flashcard` });
    }
  }
  if (exclude && options.length > 1)
    options = options.filter((o) => !(o.questionId === exclude.questionId && o.generator === exclude.generator));
  if (!options.length) return { questionId: null, generator: 'flashcard' };
  const ranked = options.map((o) => ({ o, used: usage.get(o.usageKey) ?? 0, tie: random() })).sort((a, b) => a.used - b.used || a.tie - b.tie);
  return { questionId: ranked[0].o.questionId, generator: ranked[0].o.generator };
}

export function policyRowOf(c: typeof course.$inferSelect): CoursePolicyRow & SchedulePolicy {
  return {
    id: c.id,
    key: c.key,
    algorithm: c.algorithm,
    retention: c.retention,
    examDate: c.examDate,
    newPerDay: c.newPerDay,
    maxReviewsPerDay: c.maxReviewsPerDay,
    newOrder: c.newOrder,
  };
}
