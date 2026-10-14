import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ItemKind, LeechView, StatsView, Facet } from '@learn/shared';
import { and, asc, eq, gte, inArray, or, sql } from 'drizzle-orm';
import { addDays, learningDay, learningDayBounds } from '../common/time.js';
import { DB, type Db } from '../db/db.js';
import { course, courseCard, courseEnrollment, item, itemVocab, reviewLog } from '../db/schema.js';
import { StudyService } from '../study/study.service.js';

@Injectable()
export class StatsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(StudyService) private readonly study: StudyService,
  ) {}

  /** The course, or every enrolled course (all active courses when nothing is enrolled yet). */
  private async courseIds(courseKey?: string): Promise<number[]> {
    if (courseKey) {
      const [c] = await this.db.select({ id: course.id }).from(course).where(eq(course.key, courseKey));
      if (!c) throw new NotFoundException(`course "${courseKey}" not found`);
      return [c.id];
    }
    const enrolled = await this.db
      .select({ id: course.id })
      .from(courseEnrollment)
      .innerJoin(course, and(eq(course.id, courseEnrollment.courseId), eq(course.status, 'active')));
    if (enrolled.length) return enrolled.map((e) => e.id);
    return (await this.db.select({ id: course.id }).from(course).where(eq(course.status, 'active'))).map((c) => c.id);
  }

  async stats(courseKey?: string, now = new Date()): Promise<StatsView> {
    const clock = this.study.clock;
    const day = learningDay(now, clock);
    const { start, end } = learningDayBounds(day, clock);
    const ids = await this.courseIds(courseKey);
    const idList = ids.length ? sql.join(ids.map((id) => sql`${id}`), sql`, `) : sql`null`;
    const inScope = sql`r.item_id in (select item_id from course_item where course_id in (${idList}))`;

    const since = learningDayBounds(addDays(day, -400), clock).start;
    const dayExpr = sql`to_char((r.reviewed_at at time zone ${clock.timezone}::text) - (${clock.rolloverHour}::int * interval '1 hour'), 'YYYY-MM-DD')`;
    const byDay = (
      await this.db.execute(sql`
        select ${dayExpr} as day, count(*)::int as reviews, count(*) filter (where r.correct)::int as correct
        from review_log r
        where r.reviewed_at >= ${since.toISOString()}::timestamptz and ${inScope}
        group by 1 order by 1`)
    ).rows as { day: string; reviews: number; correct: number }[];
    const dayMap = new Map(byDay.map((d) => [d.day, d]));

    const reviewsByDay = Array.from({ length: 30 }, (_, i) => {
      const d = addDays(day, i - 29);
      const hit = dayMap.get(d);
      return { day: d, reviews: hit?.reviews ?? 0, correct: hit?.correct ?? 0 };
    });
    let streakDays = 0;
    for (let d = dayMap.has(day) ? day : addDays(day, -1); dayMap.has(d); d = addDays(d, -1)) streakDays++;
    let bestStreakDays = 0;
    let run = 0;
    let prev: string | null = null;
    for (const d of byDay.map((x) => x.day)) {
      run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
      bestStreakDays = Math.max(bestStreakDays, run);
      prev = d;
    }
    const tomorrowEnd = learningDayBounds(addDays(day, 1), clock).end;

    const [today] = (
      await this.db.execute(sql`
        select count(*)::int as reviewed, count(*) filter (where r.correct)::int as correct
        from review_log r
        where r.reviewed_at >= ${start.toISOString()}::timestamptz and r.reviewed_at < ${end.toISOString()}::timestamptz and ${inScope}`)
    ).rows as { reviewed: number; correct: number }[];
    const [month] = (
      await this.db.execute(sql`
        select count(*)::int as n, count(*) filter (where r.correct)::int as correct
        from review_log r
        where r.reviewed_at >= ${addDaysUtc(now, -30).toISOString()}::timestamptz and r.correct is not null and ${inScope}`)
    ).rows as { n: number; correct: number }[];

    const states = ids.length
      ? await this.db
          .select({
            state: courseCard.state,
            n: sql<number>`count(distinct (${courseCard.itemId}, ${courseCard.facet}))::int`,
          })
          .from(courseCard)
          .where(inArray(courseCard.courseId, ids))
          .groupBy(courseCard.state)
      : [];
    const byState = new Map(states.map((s) => [s.state, s.n]));
    const [extra] = ids.length
      ? await this.db
          .select({
            due: sql<number>`count(distinct (${courseCard.itemId}, ${courseCard.facet})) filter (where ${courseCard.state} <> 0 and ${courseCard.due} < ${end.toISOString()})::int`,
            dueTomorrow: sql<number>`count(distinct (${courseCard.itemId}, ${courseCard.facet})) filter (where ${courseCard.state} <> 0 and ${courseCard.due} < ${tomorrowEnd.toISOString()})::int`,
            leeches: sql<number>`count(distinct (${courseCard.itemId}, ${courseCard.facet})) filter (where ${courseCard.leech})::int`,
          })
          .from(courseCard)
          .where(inArray(courseCard.courseId, ids))
      : [{ due: 0, dueTomorrow: 0, leeches: 0 }];

    return {
      day,
      today: { reviewed: today.reviewed, correct: today.correct, dueRemaining: extra.due },
      cards: {
        new: byState.get(0) ?? 0,
        learning: byState.get(1) ?? 0,
        review: byState.get(2) ?? 0,
        relearning: byState.get(3) ?? 0,
      },
      retention30d: month.n ? Math.round((month.correct / month.n) * 1000) / 1000 : null,
      reviewsByDay,
      streakDays,
      bestStreakDays: Math.max(bestStreakDays, streakDays),
      dueTomorrow: extra.dueTomorrow,
      leeches: extra.leeches,
    };
  }

  /**
   * Item facets answered wrong again and again — candidates for rewriting or a better mnemonic.
   * weak: the wider "keeps forgetting" set (also lapsed twice, or wrong twice), the same cards a weak quiz asks.
   */
  async leeches(courseKey?: string, opts: { weak?: boolean } = {}): Promise<LeechView[]> {
    const ids = await this.courseIds(courseKey);
    if (!ids.length) return [];
    const missedTwice = sql`(${courseCard.itemId}, ${courseCard.facet}) in (select item_id, facet from review_log where rating = 1 group by item_id, facet having count(*) >= 2)`;
    const which = opts.weak ? or(eq(courseCard.leech, true), gte(courseCard.lapses, 2), missedTwice) : eq(courseCard.leech, true);
    const rows = await this.db
      .select({
        courseKey: course.key,
        itemId: item.id,
        itemKey: item.key,
        kind: item.kind,
        term: itemVocab.term,
        front: item.frontMd,
        facet: courseCard.facet,
        lapses: courseCard.lapses,
      })
      .from(courseCard)
      .innerJoin(course, eq(course.id, courseCard.courseId))
      .innerJoin(item, eq(item.id, courseCard.itemId))
      .leftJoin(itemVocab, eq(itemVocab.itemId, item.id))
      .where(and(inArray(courseCard.courseId, ids), which))
      .orderBy(asc(item.key));
    if (!rows.length) return [];
    const again = await this.db
      .select({ itemId: reviewLog.itemId, facet: reviewLog.facet, n: sql<number>`count(*)::int` })
      .from(reviewLog)
      .where(and(inArray(reviewLog.itemId, [...new Set(rows.map((r) => r.itemId))]), eq(reviewLog.rating, 1)))
      .groupBy(reviewLog.itemId, reviewLog.facet);
    const againMap = new Map(again.map((a) => [`${a.itemId}:${a.facet}`, a.n]));
    const seen = new Set<string>();
    const out: LeechView[] = [];
    for (const r of rows) {
      const k = `${r.itemId}:${r.facet}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({
        courseKey: r.courseKey,
        itemKey: r.itemKey,
        kind: r.kind as ItemKind,
        label: r.term ?? (r.front ?? r.itemKey).slice(0, 80),
        facet: r.facet as Facet,
        lapses: r.lapses,
        againCount: againMap.get(k) ?? 0,
      });
    }
    return opts.weak ? out.sort((a, b) => b.againCount - a.againCount || b.lapses - a.lapses) : out;
  }
}

function addDaysUtc(at: Date, days: number): Date {
  return new Date(at.getTime() + days * 86_400_000);
}
