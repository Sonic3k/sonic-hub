import { FACETS, KIND_FACETS, Rating, type Facet, type ItemKind } from '@learn/shared';
import { and, asc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { chunk, groupBy } from '../common/util.js';
import type { DayClock } from '../common/time.js';
import type { DbExecutor } from '../db/db.js';
import { course, courseCard, courseFacet, courseItem, item, itemExample, question, reviewLog } from '../db/schema.js';
import { applyRating, LEECH_AGAIN_COUNT, replay, type CardFields, type ReviewEvent, type SchedulePolicy } from './scheduler.js';

/*
 * course_card is a projection of review_log: every answer is applied to the card of that item facet
 * in every course that has it, each course using its own policy. A card can always be rebuilt by
 * replaying the item facet's history, so new courses (and policy changes) start from what the
 * learner already knows.
 */

export type CourseCardRow = typeof courseCard.$inferSelect;

export function policyOf(c: { algorithm: string; retention: number; examDate: string | null }): SchedulePolicy {
  return { algorithm: c.algorithm, retention: c.retention, examDate: c.examDate };
}

/** Applies a logged answer to every course's card for the item facet. Call after inserting the review_log row. */
export async function applyReviewToCourses(
  tx: DbExecutor,
  args: { itemId: number; facet: Facet; rating: number; reviewedAt: Date },
  clock: DayClock,
): Promise<Map<number, CourseCardRow>> {
  const rows = await tx
    .select({ card: courseCard, algorithm: course.algorithm, retention: course.retention, examDate: course.examDate })
    .from(courseCard)
    .innerJoin(course, eq(course.id, courseCard.courseId))
    .where(and(eq(courseCard.itemId, args.itemId), eq(courseCard.facet, args.facet)));

  let leech: boolean | null = null;
  if (args.rating === Rating.Again) {
    const [{ n }] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(reviewLog)
      .where(and(eq(reviewLog.itemId, args.itemId), eq(reviewLog.facet, args.facet), eq(reviewLog.rating, Rating.Again)));
    leech = n >= LEECH_AGAIN_COUNT;
  }

  const updated = new Map<number, CourseCardRow>();
  for (const row of rows) {
    const next = applyRating(row.card, args.rating, args.reviewedAt, policyOf(row), clock);
    const [saved] = await tx
      .update(courseCard)
      .set({ ...next, leech: leech === null ? row.card.leech : row.card.leech || leech })
      .where(eq(courseCard.id, row.card.id))
      .returning();
    updated.set(saved.courseId, saved);
  }
  return updated;
}

interface DesiredCard {
  itemId: number;
  facet: Facet;
}

/** Which item facets a course studies: enabled by its policy and backed by content to ask about. */
async function desiredCards(tx: DbExecutor, courseId: number): Promise<DesiredCard[]> {
  const enabledRows = await tx.select({ facet: courseFacet.facet }).from(courseFacet).where(eq(courseFacet.courseId, courseId));
  const enabled = new Set<Facet>(enabledRows.length ? enabledRows.map((r) => r.facet) : FACETS);

  const courseItemIds = tx.select({ id: courseItem.itemId }).from(courseItem).where(eq(courseItem.courseId, courseId));
  const items = await tx
    .select({ id: item.id, kind: item.kind })
    .from(item)
    .where(and(inArray(item.id, courseItemIds), eq(item.status, 'active')));

  const clozeRows = await tx
    .selectDistinct({ itemId: itemExample.itemId })
    .from(itemExample)
    .where(and(inArray(itemExample.itemId, courseItemIds), sql`${itemExample.text} like '%{{c%::%}}%'`));
  const hasCloze = new Set(clozeRows.map((r) => r.itemId));

  const authored = await tx
    .selectDistinct({ itemId: question.itemId, facet: question.facet })
    .from(question)
    .where(
      and(
        inArray(question.itemId, courseItemIds),
        eq(question.status, 'active'),
        or(isNull(question.courseId), eq(question.courseId, courseId)),
      ),
    );
  const hasAuthored = new Set(authored.map((r) => `${r.itemId}:${r.facet}`));

  const out: DesiredCard[] = [];
  for (const it of items) {
    for (const facet of KIND_FACETS[it.kind as ItemKind]) {
      if (!enabled.has(facet)) continue;
      const authoredHere = hasAuthored.has(`${it.id}:${facet}`);
      const available =
        authoredHere ||
        (it.kind === 'vocab' ? facet !== 'use' || hasCloze.has(it.id) : facet === 'recall');
      if (available) out.push({ itemId: it.id, facet });
    }
  }
  return out;
}

export interface RebuildResult {
  created: number;
  rebuilt: number;
  removed: number;
}

/**
 * Brings a course's cards in line with its content: creates missing cards (replaying any history),
 * removes cards it no longer studies, and with `force` rebuilds every card (policy changed).
 */
export async function rebuildCourseCards(
  tx: DbExecutor,
  courseId: number,
  opts: { force: boolean; now: Date; clock: DayClock },
): Promise<RebuildResult> {
  const [c] = await tx.select().from(course).where(eq(course.id, courseId));
  if (!c) throw new Error(`course ${courseId} not found`);
  const policy = policyOf(c);
  const desired = c.status === 'active' ? await desiredCards(tx, courseId) : [];
  const desiredKeys = new Set(desired.map((d) => `${d.itemId}:${d.facet}`));

  const existing = await tx.select().from(courseCard).where(eq(courseCard.courseId, courseId));
  const existingByKey = new Map(existing.map((e) => [`${e.itemId}:${e.facet}`, e]));

  const stale = existing.filter((e) => !desiredKeys.has(`${e.itemId}:${e.facet}`)).map((e) => e.id);
  for (const ids of chunk(stale, 5000)) await tx.delete(courseCard).where(inArray(courseCard.id, ids));

  const toBuild = desired.filter((d) => opts.force || !existingByKey.has(`${d.itemId}:${d.facet}`));
  if (!toBuild.length) return { created: 0, rebuilt: 0, removed: stale.length };

  const history = await tx
    .select({ itemId: reviewLog.itemId, facet: reviewLog.facet, rating: reviewLog.rating, reviewedAt: reviewLog.reviewedAt })
    .from(reviewLog)
    .where(inArray(reviewLog.itemId, tx.select({ id: courseItem.itemId }).from(courseItem).where(eq(courseItem.courseId, courseId))))
    .orderBy(asc(reviewLog.reviewedAt), asc(reviewLog.id));
  const byKey = groupBy(history, (h) => `${h.itemId}:${h.facet}`);

  let created = 0;
  let rebuilt = 0;
  const inserts: (typeof courseCard.$inferInsert)[] = [];
  for (const d of toBuild) {
    const key = `${d.itemId}:${d.facet}`;
    const events: ReviewEvent[] = byKey.get(key) ?? [];
    const fields: CardFields = replay(events, policy, opts.now, opts.clock);
    const leech = events.filter((e) => e.rating === Rating.Again).length >= LEECH_AGAIN_COUNT;
    const current = existingByKey.get(key);
    if (current) {
      await tx.update(courseCard).set({ ...fields, leech }).where(eq(courseCard.id, current.id));
      rebuilt++;
    } else {
      inserts.push({ courseId, itemId: d.itemId, facet: d.facet, ...fields, leech });
      created++;
    }
  }
  for (const rows of chunk(inserts, 1000)) await tx.insert(courseCard).values(rows);
  return { created, rebuilt, removed: stale.length };
}
