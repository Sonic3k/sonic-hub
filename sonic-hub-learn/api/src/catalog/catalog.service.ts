import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  clozeToPlain,
  type ChapterNode,
  type CourseCounts,
  type CourseDetail,
  type CourseSummary,
  type EnrollmentInput,
  type Facet,
  FACETS,
  type ItemView,
  type LessonDetail,
  type LessonSummary,
  type MemoryView,
  type ReadingView,
  type SearchResult,
  type SubjectSummary,
} from '@learn/shared';
import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { learningDay, learningDayBounds } from '../common/time.js';
import { MediaUrls } from '../common/tokens.js';
import { groupBy } from '../common/util.js';
import { DB, type Db } from '../db/db.js';
import {
  chapter,
  course,
  courseCard,
  courseEnrollment,
  courseExamDomain,
  courseFacet,
  courseItem,
  courseTag,
  item,
  itemExposure,
  itemRelation,
  itemTag,
  itemVocab,
  lesson,
  lessonItem,
  lessonProgress,
  subject,
  tag,
} from '../db/schema.js';
import { loadItems } from '../study/loaders.js';
import { policyOf } from '../study/projection.js';
import { boldCloze, examplesFor, speakFor } from '../study/question-builder.js';
import { retrievability } from '../study/scheduler.js';
import { StudyService } from '../study/study.service.js';

type CourseRow = typeof course.$inferSelect;

/** A lesson read this far counts as finished; "continue reading" then moves on to the next one. */
const READ_THROUGH = 0.95;

function escapeLike(q: string): string {
  return q.replace(/[\\%_]/g, (c) => `\\${c}`);
}

@Injectable()
export class CatalogService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(MediaUrls) private readonly urls: MediaUrls,
    @Inject(StudyService) private readonly study: StudyService,
  ) {}

  private dayEnd(now: Date): Date {
    return learningDayBounds(learningDay(now, this.study.clock), this.study.clock).end;
  }

  private async courseByKey(key: string): Promise<CourseRow> {
    const [c] = await this.db.select().from(course).where(and(eq(course.key, key), eq(course.status, 'active')));
    if (!c) throw new NotFoundException(`course "${key}" not found`);
    return c;
  }

  private async counts(courseIds: number[], dayEnd: Date): Promise<Map<number, CourseCounts>> {
    const map = new Map<number, CourseCounts>();
    if (!courseIds.length) return map;
    for (const id of courseIds) map.set(id, { items: 0, cards: 0, new: 0, learning: 0, review: 0, dueToday: 0, leeches: 0 });
    const items = await this.db
      .select({ courseId: courseItem.courseId, n: sql<number>`count(*)::int` })
      .from(courseItem)
      .innerJoin(item, and(eq(item.id, courseItem.itemId), eq(item.status, 'active')))
      .where(inArray(courseItem.courseId, courseIds))
      .groupBy(courseItem.courseId);
    for (const r of items) map.get(r.courseId)!.items = r.n;
    const cards = await this.db
      .select({
        courseId: courseCard.courseId,
        total: sql<number>`count(*)::int`,
        fresh: sql<number>`count(*) filter (where ${courseCard.state} = 0)::int`,
        learning: sql<number>`count(*) filter (where ${courseCard.state} in (1, 3))::int`,
        review: sql<number>`count(*) filter (where ${courseCard.state} = 2)::int`,
        due: sql<number>`count(*) filter (where ${courseCard.state} <> 0 and ${courseCard.due} < ${dayEnd.toISOString()})::int`,
        leeches: sql<number>`count(*) filter (where ${courseCard.leech})::int`,
      })
      .from(courseCard)
      .where(inArray(courseCard.courseId, courseIds))
      .groupBy(courseCard.courseId);
    for (const r of cards)
      Object.assign(map.get(r.courseId)!, { cards: r.total, new: r.fresh, learning: r.learning, review: r.review, dueToday: r.due, leeches: r.leeches });
    return map;
  }

  private async summaries(rows: CourseRow[], now: Date): Promise<Map<number, CourseSummary>> {
    const ids = rows.map((r) => r.id);
    const counts = await this.counts(ids, this.dayEnd(now));
    const tags = ids.length
      ? await this.db.select({ courseId: courseTag.courseId, key: tag.key }).from(courseTag).innerJoin(tag, eq(tag.id, courseTag.tagId)).where(inArray(courseTag.courseId, ids))
      : [];
    const tagMap = groupBy(tags, (t) => t.courseId);
    const enrollments = ids.length ? await this.db.select().from(courseEnrollment).where(inArray(courseEnrollment.courseId, ids)) : [];
    const enrolled = new Map(enrollments.map((e) => [e.courseId, e]));
    const out = new Map<number, CourseSummary>();
    for (const c of rows) {
      const e = enrolled.get(c.id);
      out.set(c.id, {
        key: c.key,
        title: c.title,
        description: c.description,
        isCollection: c.isCollection,
        source: {
          type: c.sourceType,
          name: c.sourceName,
          author: c.sourceAuthor,
          publisher: c.sourcePublisher,
          edition: c.sourceEdition,
          url: c.sourceUrl,
        },
        tags: (tagMap.get(c.id) ?? []).map((t) => t.key),
        enrolled: !!e,
        dailyEnabled: e?.dailyEnabled ?? false,
        counts: counts.get(c.id)!,
      });
    }
    return out;
  }

  async subjects(now = new Date()): Promise<SubjectSummary[]> {
    const subjects = await this.db.select().from(subject).where(eq(subject.status, 'active')).orderBy(asc(subject.sort), asc(subject.id));
    const courses = await this.db.select().from(course).where(eq(course.status, 'active')).orderBy(asc(course.sort), asc(course.id));
    const summaries = await this.summaries(courses, now);
    return subjects.map((s) => ({
      key: s.key,
      title: s.title,
      description: s.description,
      lang: s.lang,
      color: s.color,
      courses: courses.filter((c) => c.subjectId === s.id).map((c) => summaries.get(c.id)!),
    }));
  }

  async course(key: string, now = new Date()): Promise<CourseDetail> {
    const c = await this.courseByKey(key);
    const summary = (await this.summaries([c], now)).get(c.id)!;
    const [s] = await this.db.select().from(subject).where(eq(subject.id, c.subjectId));
    const facets = (await this.db.select({ facet: courseFacet.facet }).from(courseFacet).where(eq(courseFacet.courseId, c.id))).map((f) => f.facet);
    const [enrollment] = await this.db.select().from(courseEnrollment).where(eq(courseEnrollment.courseId, c.id));
    const domains = await this.db
      .select({ key: courseExamDomain.key, title: courseExamDomain.title, weight: courseExamDomain.weight, tag: tag.key })
      .from(courseExamDomain)
      .innerJoin(tag, eq(tag.id, courseExamDomain.tagId))
      .where(eq(courseExamDomain.courseId, c.id))
      .orderBy(asc(courseExamDomain.sort));

    const chapters = await this.db
      .select()
      .from(chapter)
      .where(and(eq(chapter.courseId, c.id), eq(chapter.status, 'active')))
      .orderBy(asc(chapter.sort), asc(chapter.id));
    const lessons = await this.db
      .select({
        lesson,
        itemCount: sql<number>`(select count(*)::int from ${lessonItem} where ${lessonItem.lessonId} = ${lesson.id})`,
      })
      .from(lesson)
      .where(and(eq(lesson.courseId, c.id), eq(lesson.status, 'active')))
      .orderBy(asc(lesson.sort), asc(lesson.id));
    const lessonsByChapter = groupBy(lessons, (l) => l.lesson.chapterId);
    const nodes = new Map<number, ChapterNode>();
    for (const ch of chapters) {
      nodes.set(ch.id, {
        key: ch.key,
        title: ch.title,
        description: ch.description,
        lessons: (lessonsByChapter.get(ch.id) ?? []).map(
          ({ lesson: l, itemCount }): LessonSummary => ({
            id: l.id,
            key: l.key,
            title: l.title,
            summary: l.summary,
            hasBody: !!l.bodyMd,
            hasSlides: !!l.slidesHtml,
            hasVideo: !!l.videoUrl,
            itemCount,
          }),
        ),
        children: [],
      });
    }
    const roots: ChapterNode[] = [];
    for (const ch of chapters) {
      const node = nodes.get(ch.id)!;
      const parent = ch.parentId ? nodes.get(ch.parentId) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }

    return {
      ...summary,
      subject: { key: s.key, title: s.title, lang: s.lang, color: s.color, themeCss: this.urls.text(s.themeCss) },
      policy: {
        algorithm: c.algorithm,
        retention: c.retention,
        newPerDay: enrollment?.newPerDay ?? c.newPerDay,
        maxReviewsPerDay: c.maxReviewsPerDay,
        newOrder: c.newOrder,
        facets: facets.length ? facets : [...FACETS],
        examDate: c.examDate,
      },
      exam:
        c.examQuestionCount && c.examMinutes
          ? { questions: c.examQuestionCount, minutes: c.examMinutes, passPercent: c.examPassPercent ?? 70, domains }
          : null,
      chapters: roots,
    };
  }

  async setEnrollment(key: string, input: EnrollmentInput, now = new Date()): Promise<CourseDetail> {
    const c = await this.courseByKey(key);
    if (!input.enrolled) {
      await this.db.delete(courseEnrollment).where(eq(courseEnrollment.courseId, c.id));
    } else {
      const values = { courseId: c.id, dailyEnabled: input.dailyEnabled ?? true, newPerDay: input.newPerDay ?? null };
      await this.db
        .insert(courseEnrollment)
        .values(values)
        .onConflictDoUpdate({
          target: courseEnrollment.courseId,
          set: {
            ...(input.dailyEnabled !== undefined ? { dailyEnabled: input.dailyEnabled } : {}),
            ...(input.newPerDay !== undefined ? { newPerDay: input.newPerDay } : {}),
            updatedAt: now,
          },
        });
      await this.study.extendDaily(c.id, now);
    }
    return this.course(key, now);
  }

  /** Item views in the given order, with this course's notes/examples and the learner's memory. */
  async itemViews(itemIds: number[], courseId: number | null, now: Date): Promise<ItemView[]> {
    if (!itemIds.length) return [];
    const items = await loadItems(this.db, itemIds);
    const notes = courseId
      ? new Map(
          (
            await this.db
              .select({ itemId: courseItem.itemId, noteMd: courseItem.noteMd })
              .from(courseItem)
              .where(and(eq(courseItem.courseId, courseId), inArray(courseItem.itemId, itemIds)))
          ).map((n) => [n.itemId, n.noteMd]),
        )
      : new Map<number, string | null>();
    const relRows = await this.db
      .select({
        itemId: itemRelation.itemId,
        type: itemRelation.type,
        key: item.key,
        term: itemVocab.term,
        front: item.frontMd,
      })
      .from(itemRelation)
      .innerJoin(item, eq(item.id, itemRelation.relatedItemId))
      .leftJoin(itemVocab, eq(itemVocab.itemId, item.id))
      .where(inArray(itemRelation.itemId, itemIds));
    const rels = groupBy(relRows, (r) => r.itemId);
    const memRows = await this.db
      .select({ card: courseCard, key: course.key, algorithm: course.algorithm, retention: course.retention, examDate: course.examDate })
      .from(courseCard)
      .innerJoin(course, eq(course.id, courseCard.courseId))
      .where(
        courseId
          ? and(inArray(courseCard.itemId, itemIds), eq(courseCard.courseId, courseId))
          : and(inArray(courseCard.itemId, itemIds), eq(course.status, 'active')),
      );
    const mem = groupBy(memRows, (m) => m.card.itemId);

    return itemIds
      .map((id) => items.get(id))
      .filter((it): it is NonNullable<typeof it> => !!it)
      .map((it): ItemView => ({
        key: it.key,
        kind: it.kind,
        frontMd: this.urls.text(it.frontMd),
        backMd: this.urls.text(it.backMd),
        pattern: it.pattern,
        imageUrl: this.urls.url(it.imageKey),
        audioUrl: this.urls.url(it.audioKey),
        speak: speakFor(it),
        vocab: it.vocab,
        accepts: it.accepts,
        examples: examplesFor(it, courseId).map((e) => ({
          text: clozeToPlain(e.text),
          textMd: boldCloze(e.text),
          translation: e.translation,
          audioUrl: this.urls.url(e.audioKey),
          ownCourse: courseId !== null && e.courseId === courseId,
        })),
        noteMd: this.urls.text(notes.get(it.id) ?? null),
        tags: it.tags,
        related: (rels.get(it.id) ?? []).map((r) => ({
          key: r.key,
          type: r.type,
          label: r.term ?? (r.front ?? r.key).slice(0, 80),
        })),
        memory: (mem.get(it.id) ?? []).map(
          (m): MemoryView => ({
            courseKey: m.key,
            facet: m.card.facet as Facet,
            state: m.card.state as MemoryView['state'],
            due: m.card.due.toISOString(),
            stability: m.card.stability,
            reps: m.card.reps,
            lapses: m.card.lapses,
            retrievability: retrievability(m.card, now, policyOf(m), this.study.clock),
            leech: m.card.leech,
          }),
        ),
      }));
  }

  async lesson(id: number, now = new Date()): Promise<LessonDetail> {
    const [row] = await this.db
      .select({ lesson, chapter, course, theme: subject.themeCss })
      .from(lesson)
      .innerJoin(chapter, eq(chapter.id, lesson.chapterId))
      .innerJoin(course, eq(course.id, lesson.courseId))
      .innerJoin(subject, eq(subject.id, course.subjectId))
      .where(and(eq(lesson.id, id), eq(lesson.status, 'active')));
    if (!row) throw new NotFoundException(`lesson ${id} not found`);
    const ids = (
      await this.db.select({ itemId: lessonItem.itemId }).from(lessonItem).where(eq(lessonItem.lessonId, id)).orderBy(asc(lessonItem.sort))
    ).map((r) => r.itemId);
    return {
      id: row.lesson.id,
      key: row.lesson.key,
      title: row.lesson.title,
      summary: row.lesson.summary,
      bodyMd: this.urls.text(row.lesson.bodyMd),
      slidesHtml: this.urls.text(row.lesson.slidesHtml),
      videoUrl: row.lesson.videoUrl,
      course: { key: row.course.key, title: row.course.title },
      chapter: { key: row.chapter.key, title: row.chapter.title },
      themeCss: this.urls.text(row.theme),
      items: await this.itemViews(ids, row.course.id, now),
    };
  }

  async courseItems(
    key: string,
    q: { lessonId?: number; chapterKey?: string; tag?: string; offset?: number; limit?: number },
    now = new Date(),
  ): Promise<{ total: number; items: ItemView[] }> {
    const c = await this.courseByKey(key);
    const rows = await this.db
      .select({ itemId: courseItem.itemId })
      .from(courseItem)
      .innerJoin(item, and(eq(item.id, courseItem.itemId), eq(item.status, 'active')))
      .where(eq(courseItem.courseId, c.id))
      .orderBy(asc(courseItem.sort));
    let ids = rows.map((r) => r.itemId);
    if (q.lessonId) {
      const inLesson = new Set(
        (await this.db.select({ id: lessonItem.itemId }).from(lessonItem).where(eq(lessonItem.lessonId, q.lessonId))).map((r) => r.id),
      );
      ids = ids.filter((id) => inLesson.has(id));
    }
    if (q.chapterKey) {
      const inChapter = new Set(
        (
          await this.db
            .select({ id: lessonItem.itemId })
            .from(lessonItem)
            .innerJoin(lesson, eq(lesson.id, lessonItem.lessonId))
            .innerJoin(chapter, eq(chapter.id, lesson.chapterId))
            .where(and(eq(lesson.courseId, c.id), or(eq(chapter.key, q.chapterKey), sql`${chapter.key} like ${`${q.chapterKey}/%`}`)))
        ).map((r) => r.id),
      );
      ids = ids.filter((id) => inChapter.has(id));
    }
    if (q.tag) {
      const tagged = new Set(
        (await this.db.select({ id: itemTag.itemId }).from(itemTag).innerJoin(tag, eq(tag.id, itemTag.tagId)).where(eq(tag.key, q.tag))).map((r) => r.id),
      );
      ids = ids.filter((id) => tagged.has(id));
    }
    const offset = Math.max(q.offset ?? 0, 0);
    const limit = Math.min(Math.max(q.limit ?? 50, 1), 500);
    return { total: ids.length, items: await this.itemViews(ids.slice(offset, offset + limit), c.id, now) };
  }

  async item(key: string, courseKey: string | undefined, now = new Date()): Promise<ItemView> {
    const [row] = await this.db.select({ id: item.id }).from(item).where(eq(item.key, key));
    if (!row) throw new NotFoundException(`item "${key}" not found`);
    const courseId = courseKey ? (await this.courseByKey(courseKey)).id : null;
    return (await this.itemViews([row.id], courseId, now))[0];
  }

  async search(q: string): Promise<SearchResult> {
    const term = q.trim();
    if (term.length < 2) return { items: [], lessons: [] };
    const like = `%${escapeLike(term)}%`;
    const items = await this.db
      .select({ id: item.id, key: item.key, kind: item.kind, term: itemVocab.term, meaning: itemVocab.meaning, front: item.frontMd, back: item.backMd })
      .from(item)
      .leftJoin(itemVocab, eq(itemVocab.itemId, item.id))
      .where(
        and(
          eq(item.status, 'active'),
          or(ilike(itemVocab.term, like), ilike(itemVocab.meaning, like), ilike(item.frontMd, like), ilike(item.backMd, like), ilike(item.key, like)),
        ),
      )
      .limit(30);
    const courseRows = items.length
      ? await this.db
          .select({ itemId: courseItem.itemId, key: course.key })
          .from(courseItem)
          .innerJoin(course, and(eq(course.id, courseItem.courseId), eq(course.status, 'active')))
          .where(inArray(courseItem.itemId, items.map((i) => i.id)))
      : [];
    const coursesOf = groupBy(courseRows, (r) => r.itemId);
    const lessons = await this.db
      .select({ id: lesson.id, title: lesson.title, courseKey: course.key, courseTitle: course.title })
      .from(lesson)
      .innerJoin(course, eq(course.id, lesson.courseId))
      .where(and(eq(lesson.status, 'active'), eq(course.status, 'active'), or(ilike(lesson.title, like), ilike(lesson.bodyMd, like))))
      .limit(10);
    return {
      items: items.map((i) => ({
        key: i.key,
        kind: i.kind,
        label: i.term ?? (i.front ?? i.key).slice(0, 120),
        detail: i.meaning ?? (i.back ? i.back.slice(0, 160) : null),
        courses: (coursesOf.get(i.id) ?? []).map((c) => c.key),
      })),
      lessons,
    };
  }

  /** A course's readable lessons (body or slides) in reading order: chapters depth-first, then lesson order. */
  private async readingOrder(courseId: number): Promise<number[]> {
    const chapters = await this.db
      .select({ id: chapter.id, parentId: chapter.parentId })
      .from(chapter)
      .where(and(eq(chapter.courseId, courseId), eq(chapter.status, 'active')))
      .orderBy(asc(chapter.sort), asc(chapter.id));
    const lessons = await this.db
      .select({ id: lesson.id, chapterId: lesson.chapterId })
      .from(lesson)
      .where(and(eq(lesson.courseId, courseId), eq(lesson.status, 'active'), or(sql`${lesson.bodyMd} is not null`, sql`${lesson.slidesHtml} is not null`)))
      .orderBy(asc(lesson.sort), asc(lesson.id));
    const children = groupBy(chapters, (c) => c.parentId);
    const lessonsOf = groupBy(lessons, (l) => l.chapterId);
    const out: number[] = [];
    const walk = (parentId: number | null) => {
      for (const ch of children.get(parentId) ?? []) {
        for (const l of lessonsOf.get(ch.id) ?? []) out.push(l.id);
        walk(ch.id);
      }
    };
    walk(null);
    return out;
  }

  private async readingView(lessonId: number, position: number, updatedAt: Date): Promise<ReadingView | null> {
    const [row] = await this.db
      .select({ lesson, chapter, course, subjectKey: subject.key })
      .from(lesson)
      .innerJoin(chapter, eq(chapter.id, lesson.chapterId))
      .innerJoin(course, eq(course.id, lesson.courseId))
      .innerJoin(subject, eq(subject.id, course.subjectId))
      .where(and(eq(lesson.id, lessonId), eq(lesson.status, 'active'), eq(course.status, 'active')));
    if (!row) return null;
    return {
      lesson: { id: row.lesson.id, title: row.lesson.title, summary: row.lesson.summary },
      course: { key: row.course.key, title: row.course.title },
      chapter: { key: row.chapter.key, title: row.chapter.title },
      subjectKey: row.subjectKey,
      position,
      updatedAt: updatedAt.toISOString(),
    };
  }

  /**
   * The lesson to pick up again: the last one opened; once that was read through, the next one in
   * its course. Before anything was read: the first lesson of the first enrolled course.
   */
  async reading(now = new Date()): Promise<ReadingView | null> {
    const [last] = await this.db
      .select({ progress: lessonProgress, courseId: lesson.courseId })
      .from(lessonProgress)
      .innerJoin(lesson, and(eq(lesson.id, lessonProgress.lessonId), eq(lesson.status, 'active')))
      .innerJoin(course, and(eq(course.id, lesson.courseId), eq(course.status, 'active')))
      .orderBy(desc(lessonProgress.updatedAt))
      .limit(1);
    if (last) {
      if (last.progress.position < READ_THROUGH) return this.readingView(last.progress.lessonId, last.progress.position, last.progress.updatedAt);
      const order = await this.readingOrder(last.courseId);
      const nextId = order[order.indexOf(last.progress.lessonId) + 1];
      if (!nextId) return null;
      const [started] = await this.db.select().from(lessonProgress).where(eq(lessonProgress.lessonId, nextId));
      return this.readingView(nextId, started?.position ?? 0, started?.updatedAt ?? last.progress.updatedAt);
    }
    const [first] = await this.db
      .select({ id: course.id })
      .from(courseEnrollment)
      .innerJoin(course, and(eq(course.id, courseEnrollment.courseId), eq(course.status, 'active')))
      .orderBy(asc(course.sort), asc(course.id));
    if (!first) return null;
    const [lessonId] = await this.readingOrder(first.id);
    return lessonId ? this.readingView(lessonId, 0, now) : null;
  }

  /**
   * Remembers how far the learner got in a lesson: the furthest point, so glancing at the top of a lesson
   * again does not undo what was read. Opening it still makes it the lesson to continue.
   */
  async setReadingProgress(lessonId: number, position: number, now = new Date()): Promise<{ position: number }> {
    const [row] = await this.db.select({ id: lesson.id }).from(lesson).where(eq(lesson.id, lessonId));
    if (!row) throw new NotFoundException(`lesson ${lessonId} not found`);
    const value = Math.min(Math.max(position, 0), 1);
    const [saved] = await this.db
      .insert(lessonProgress)
      .values({ lessonId, position: value, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: lessonProgress.lessonId, set: { position: sql`greatest(${lessonProgress.position}, ${value})`, updatedAt: now } })
      .returning({ position: lessonProgress.position });
    return { position: saved.position };
  }

  /** Records that the learner read these items (learn / skim); Daily hands them out first. */
  async expose(itemKeys: string[], now = new Date()): Promise<{ updated: number }> {
    if (!itemKeys.length) return { updated: 0 };
    const rows = await this.db.select({ id: item.id }).from(item).where(inArray(item.key, itemKeys));
    for (const r of rows) {
      await this.db
        .insert(itemExposure)
        .values({ itemId: r.id, firstSeenAt: now, lastSeenAt: now, seenCount: 1 })
        .onConflictDoUpdate({ target: itemExposure.itemId, set: { lastSeenAt: now, seenCount: sql`${itemExposure.seenCount} + 1` } });
    }
    return { updated: rows.length };
  }
}
