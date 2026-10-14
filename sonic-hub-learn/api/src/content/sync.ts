import { resolve } from 'node:path';
import {
  parseCloze,
  type ItemDeclarationInput,
  type ItemKind,
  type QuestionInput,
  type RelatedInput,
} from '@learn/shared';
import { and, eq, inArray } from 'drizzle-orm';
import type { DayClock } from '../common/time.js';
import { chunk, contentHash } from '../common/util.js';
import type { Db, DbExecutor } from '../db/db.js';
import {
  chapter,
  course,
  courseExamDomain,
  courseFacet,
  courseItem,
  courseTag,
  item,
  itemAccept,
  itemExample,
  itemRelation,
  itemTag,
  itemVocab,
  lesson,
  lessonItem,
  question,
  questionAnswer,
  questionOption,
  questionTag,
  subject,
  tag,
  type CourseItemVia,
} from '../db/schema.js';
import { rebuildCourseCards, type RebuildResult } from '../study/projection.js';
import { questionFacet, type ContentIndex } from './check.js';
import { courseEntries, entryKey, type ContentModel, type LoadedCourse, type LoadedEntry } from './loader.js';
import { rewriteTextRefs, type MediaSyncResult } from './media.js';

export interface SyncReport {
  subjects: number;
  courses: number;
  chapters: number;
  lessons: number;
  items: { total: number; changed: number; archived: number };
  questions: { total: number; changed: number; archived: number };
  courseItems: number;
  media: { uploaded: number; reused: number };
  cards: RebuildResult;
}

interface QuestionRecord {
  key: string;
  itemKey: string;
  courseKey: string | null;
  dir: string;
  q: QuestionInput;
  kind: ItemKind;
  sort: number;
}

/**
 * Upserts the content model into the catalog (by key), archives what disappeared, links course
 * items, and brings every course's cards in line. Runs in one transaction.
 */
export async function syncContent(
  db: Db,
  model: ContentModel,
  index: ContentIndex,
  media: MediaSyncResult,
  opts: { now: Date; clock: DayClock },
): Promise<SyncReport> {
  const keyOf = (abs: string) => media.keys.get(abs);
  const mediaKey = (dir: string, ref: string | null | undefined) => (ref ? (keyOf(resolve(dir, ref)) ?? null) : null);
  const text = (value: string | null | undefined, dir: string) => rewriteTextRefs(value ?? null, dir, keyOf);

  return db.transaction(async (tx) => {
    const report: SyncReport = {
      subjects: 0,
      courses: 0,
      chapters: 0,
      lessons: 0,
      items: { total: 0, changed: 0, archived: 0 },
      questions: { total: 0, changed: 0, archived: 0 },
      courseItems: 0,
      media: { uploaded: media.uploaded, reused: media.reused },
      cards: { created: 0, rebuilt: 0, removed: 0 },
    };

    // Tags ----------------------------------------------------------------------------------
    const tagKeys = new Set<string>();
    for (const s of model.subjects) {
      for (const c of s.courses) {
        c.data.tags?.forEach((t) => tagKeys.add(t));
        c.data.exam?.domains?.forEach((d) => tagKeys.add(d.tag));
        for (const e of courseEntries(c)) {
          e.declaration?.tags?.forEach((t) => tagKeys.add(t));
          (e.declaration ?? e.ref)?.questions?.forEach((q) => q.tags?.forEach((t) => tagKeys.add(t)));
        }
      }
    }
    const tagIds = await ensureTags(tx, [...tagKeys]);

    // Subjects ------------------------------------------------------------------------------
    const subjectIds = new Map<string, number>();
    for (const [i, s] of model.subjects.entries()) {
      const values = {
        key: s.key,
        title: s.data.title,
        prefix: s.data.prefix,
        lang: s.data.lang,
        description: s.data.description ?? null,
        color: s.data.color ?? null,
        themeCss: text(s.themeCss, s.dir),
        sort: s.data.sort ?? i,
        status: 'active' as const,
      };
      const [row] = await tx
        .insert(subject)
        .values({ ...values, contentHash: contentHash(values) })
        .onConflictDoUpdate({ target: subject.key, set: { ...values, contentHash: contentHash(values), updatedAt: opts.now } })
        .returning({ id: subject.id });
      subjectIds.set(s.key, row.id);
    }
    await archiveMissing(tx, subject, [...subjectIds.values()]);
    report.subjects = subjectIds.size;

    // Courses -------------------------------------------------------------------------------
    const before = new Map((await tx.select({ key: course.key, policyHash: course.policyHash }).from(course)).map((r) => [r.key, r.policyHash]));
    const courseIds = new Map<string, number>();
    const forceRebuild = new Set<number>();
    for (const [key, c] of index.courses) {
      const d = c.data;
      const p = d.policy;
      const policyHash = contentHash({ algorithm: p.algorithm, retention: p.retention, examDate: p.exam_date ?? null });
      const values = {
        subjectId: subjectIds.get(c.subjectKey)!,
        key,
        title: d.title,
        description: d.description ?? null,
        sort: d.sort ?? 0,
        isCollection: !!d.include?.length,
        sourceType: d.source.type,
        sourceName: d.source.name ?? null,
        sourceAuthor: d.source.author ?? null,
        sourcePublisher: d.source.publisher ?? null,
        sourceEdition: d.source.edition ?? null,
        sourceUrl: d.source.url ?? null,
        algorithm: p.algorithm,
        retention: p.retention,
        newPerDay: p.new_per_day,
        maxReviewsPerDay: p.max_reviews_per_day,
        newOrder: p.new_order,
        examDate: p.exam_date ?? null,
        examQuestionCount: d.exam?.questions ?? null,
        examMinutes: d.exam?.minutes ?? null,
        examPassPercent: d.exam?.pass_percent ?? null,
        policyHash,
        status: 'active' as const,
      };
      const [row] = await tx
        .insert(course)
        .values(values)
        .onConflictDoUpdate({ target: course.key, set: { ...values, updatedAt: opts.now } })
        .returning({ id: course.id });
      courseIds.set(key, row.id);
      if (before.has(key) && before.get(key) !== policyHash) forceRebuild.add(row.id);

      await tx.delete(courseTag).where(eq(courseTag.courseId, row.id));
      if (d.tags?.length) await tx.insert(courseTag).values(d.tags.map((t) => ({ courseId: row.id, tagId: tagIds.get(t)! })));
      await tx.delete(courseFacet).where(eq(courseFacet.courseId, row.id));
      if (p.facets?.length) await tx.insert(courseFacet).values([...new Set(p.facets)].map((f) => ({ courseId: row.id, facet: f })));
      await tx.delete(courseExamDomain).where(eq(courseExamDomain.courseId, row.id));
      if (d.exam?.domains?.length)
        await tx.insert(courseExamDomain).values(
          d.exam.domains.map((dm, i) => ({ courseId: row.id, key: dm.id, title: dm.title, weight: dm.weight, tagId: tagIds.get(dm.tag)!, sort: i })),
        );
    }
    const archivedCourses = await archiveMissing(tx, course, [...courseIds.values()]);
    report.courses = courseIds.size;

    // Chapters and lessons ----------------------------------------------------------------------
    const lessonIds = new Map<string, number>();
    for (const [key, c] of index.courses) {
      const courseId = courseIds.get(key)!;
      const chapterIds = new Map<string, number>();
      for (const ch of c.chapters) {
        const values = {
          courseId,
          parentId: ch.parentKey ? chapterIds.get(ch.parentKey)! : null,
          key: ch.key,
          title: ch.title,
          description: ch.description,
          sort: ch.sort,
          status: 'active' as const,
        };
        const [row] = await tx
          .insert(chapter)
          .values(values)
          .onConflictDoUpdate({ target: [chapter.courseId, chapter.key], set: { ...values, updatedAt: opts.now } })
          .returning({ id: chapter.id });
        chapterIds.set(ch.key, row.id);
      }
      await archiveMissing(tx, chapter, [...chapterIds.values()], eq(chapter.courseId, courseId));
      report.chapters += chapterIds.size;

      const courseLessonIds: number[] = [];
      for (const l of c.lessons) {
        const values = {
          courseId,
          chapterId: chapterIds.get(l.chapterKey)!,
          key: l.key,
          title: l.title,
          summary: l.summary,
          bodyMd: text(l.bodyMd, l.dir),
          slidesHtml: text(l.slidesHtml, l.dir),
          videoUrl: l.video,
          sort: l.sort,
          status: 'active' as const,
        };
        const hash = contentHash(values);
        const [row] = await tx
          .insert(lesson)
          .values({ ...values, contentHash: hash })
          .onConflictDoUpdate({ target: [lesson.courseId, lesson.key], set: { ...values, contentHash: hash, updatedAt: opts.now } })
          .returning({ id: lesson.id });
        lessonIds.set(`${key}::${l.key}`, row.id);
        courseLessonIds.push(row.id);
      }
      await archiveMissing(tx, lesson, courseLessonIds, eq(lesson.courseId, courseId));
      report.lessons += courseLessonIds.length;
    }

    // Items ---------------------------------------------------------------------------------
    const existingItems = new Map(
      (await tx.select({ id: item.id, key: item.key, contentHash: item.contentHash, status: item.status }).from(item)).map((r) => [r.key, r]),
    );
    const refsByItem = new Map<string, LoadedEntry[]>();
    for (const c of index.courses.values())
      for (const e of courseEntries(c)) if (e.ref) refsByItem.set(e.ref.ref, [...(refsByItem.get(e.ref.ref) ?? []), e]);

    const itemIds = new Map<string, number>();
    const changedItems: { id: number; decl: ItemDeclarationInput }[] = [];
    for (const [key, entry] of index.declarations) {
      const d = entry.declaration!;
      const courseKey = entry.courseKey;
      const examples = [entry, ...(refsByItem.get(key) ?? [])].flatMap((e) =>
        ((e.declaration ?? e.ref)!.examples ?? []).map((ex, i) => {
          const obj = typeof ex === 'string' ? { text: ex } : ex;
          return { courseKey: e.courseKey, text: obj.text, translation: obj.translation ?? null, audioKey: mediaKey(e.dir, obj.audio), sort: i };
        }),
      );
      const core = {
        subjectId: subjectIds.get(index.subjectOfCourse.get(courseKey)!.key)!,
        key,
        kind: d.kind,
        frontMd: d.kind === 'vocab' ? null : text(d.front, entry.dir),
        backMd: d.kind === 'vocab' ? null : text(d.back, entry.dir),
        pattern: d.kind === 'grammar' ? (d.pattern ?? null) : null,
        imageKey: mediaKey(entry.dir, d.image),
        audioKey: mediaKey(entry.dir, d.audio),
        originCourseId: courseIds.get(courseKey)!,
        status: 'active' as const,
      };
      const hash = contentHash({ core, decl: { ...d, questions: undefined, note: undefined }, examples });
      const prev = existingItems.get(key);
      if (prev && prev.contentHash === hash && prev.status === 'active') {
        itemIds.set(key, prev.id);
        continue;
      }
      const [row] = await tx
        .insert(item)
        .values({ ...core, contentHash: hash })
        .onConflictDoUpdate({ target: item.key, set: { ...core, contentHash: hash, updatedAt: opts.now } })
        .returning({ id: item.id });
      itemIds.set(key, row.id);
      changedItems.push({ id: row.id, decl: d });

      if (d.kind === 'vocab') {
        const vocab = {
          term: d.term,
          pronunciation: d.pronunciation ?? null,
          pos: d.pos ?? null,
          meaning: d.meaning,
          definition: d.definition ?? null,
        };
        await tx.insert(itemVocab).values({ itemId: row.id, ...vocab }).onConflictDoUpdate({ target: itemVocab.itemId, set: vocab });
      } else {
        await tx.delete(itemVocab).where(eq(itemVocab.itemId, row.id));
      }
      await tx.delete(itemAccept).where(eq(itemAccept.itemId, row.id));
      if (d.kind === 'vocab' && d.accept?.length)
        await tx.insert(itemAccept).values(d.accept.map((t, i) => ({ itemId: row.id, text: t, sort: i })));
      await tx.delete(itemTag).where(eq(itemTag.itemId, row.id));
      if (d.tags?.length) await tx.insert(itemTag).values([...new Set(d.tags)].map((t) => ({ itemId: row.id, tagId: tagIds.get(t)! })));
      await tx.delete(itemExample).where(eq(itemExample.itemId, row.id));
      if (examples.length)
        await tx.insert(itemExample).values(
          examples.map((ex) => ({
            itemId: row.id,
            courseId: courseIds.get(ex.courseKey)!,
            text: ex.text,
            translation: ex.translation,
            audioKey: ex.audioKey,
            sort: ex.sort,
          })),
        );
    }
    for (const { id, decl } of changedItems) {
      await tx.delete(itemRelation).where(eq(itemRelation.itemId, id));
      const rels = (decl.related ?? []).map((r: RelatedInput) =>
        typeof r === 'string' ? { id: r, type: 'see_also' as const } : { id: r.id, type: r.type },
      );
      const unique = new Map(rels.map((r) => [`${r.id}|${r.type}`, r]));
      if (unique.size)
        await tx.insert(itemRelation).values([...unique.values()].map((r) => ({ itemId: id, relatedItemId: itemIds.get(r.id)!, type: r.type })));
    }
    const staleItems = [...existingItems.values()].filter((r) => r.status === 'active' && !itemIds.has(r.key)).map((r) => r.id);
    for (const ids of chunk(staleItems, 5000)) await tx.update(item).set({ status: 'archived', updatedAt: opts.now }).where(inArray(item.id, ids));
    report.items = { total: itemIds.size, changed: changedItems.length, archived: staleItems.length };

    // Questions -----------------------------------------------------------------------------
    const records: QuestionRecord[] = [];
    for (const c of index.courses.values()) {
      for (const e of courseEntries(c)) {
        const key = entryKey(e);
        const kind = index.declarations.get(key)?.declaration?.kind;
        if (!kind) continue;
        (e.declaration ?? e.ref)!.questions?.forEach((q, i) =>
          records.push({ key: `${key}#${q.id}`, itemKey: key, courseKey: q.course_only ? e.courseKey : null, dir: e.dir, q, kind, sort: i }),
        );
      }
    }
    const existingQuestions = new Map(
      (await tx.select({ id: question.id, key: question.key, contentHash: question.contentHash, status: question.status }).from(question)).map((r) => [
        r.key,
        r,
      ]),
    );
    const seenQuestions = new Set<string>();
    let changedQuestions = 0;
    for (const r of records) {
      seenQuestions.add(r.key);
      const q = r.q;
      const core = {
        key: r.key,
        itemId: itemIds.get(r.itemKey)!,
        courseId: r.courseKey ? courseIds.get(r.courseKey)! : null,
        facet: questionFacet(q, r.kind),
        type: q.type,
        promptMd: text(q.prompt, r.dir)!,
        backMd: text(q.back, r.dir),
        explanationMd: text(q.explanation, r.dir),
        trueFalseAnswer: q.type === 'true_false' ? q.answer! : null,
        imageKey: mediaKey(r.dir, q.image),
        audioKey: mediaKey(r.dir, q.audio),
        difficulty: q.difficulty ?? null,
        sort: r.sort,
        status: 'active' as const,
      };
      const options = (q.options ?? []).map((o, i) => ({
        textMd: text(o.text, r.dir)!,
        isCorrect: !!o.correct,
        whyMd: text(o.why, r.dir),
        matchMd: text(o.match, r.dir),
        sort: i,
      }));
      const answers =
        q.type === 'typing'
          ? (q.answers ?? []).map((t, i) => ({ blank: 0, text: t, sort: i }))
          : q.type === 'cloze'
            ? parseCloze(q.prompt).blanks.flatMap((b) => b.answers.map((t, i) => ({ blank: b.index, text: t, sort: i })))
            : [];
      const tags = [...new Set(q.tags ?? [])];
      const hash = contentHash({ core, options, answers, tags });
      const prev = existingQuestions.get(r.key);
      if (prev && prev.contentHash === hash && prev.status === 'active') continue;
      changedQuestions++;
      const [row] = await tx
        .insert(question)
        .values({ ...core, contentHash: hash })
        .onConflictDoUpdate({ target: question.key, set: { ...core, contentHash: hash, updatedAt: opts.now } })
        .returning({ id: question.id });

      const existingOptions = await tx.select({ id: questionOption.id, textMd: questionOption.textMd }).from(questionOption).where(eq(questionOption.questionId, row.id));
      const byText = new Map(existingOptions.map((o) => [o.textMd, o.id]));
      const kept = new Set<number>();
      for (const o of options) {
        const id = byText.get(o.textMd);
        if (id) {
          kept.add(id);
          await tx.update(questionOption).set({ ...o, status: 'active', updatedAt: opts.now }).where(eq(questionOption.id, id));
        } else {
          await tx.insert(questionOption).values({ questionId: row.id, ...o });
        }
      }
      const gone = existingOptions.filter((o) => !kept.has(o.id)).map((o) => o.id);
      if (gone.length) await tx.update(questionOption).set({ status: 'archived', updatedAt: opts.now }).where(inArray(questionOption.id, gone));

      await tx.delete(questionAnswer).where(eq(questionAnswer.questionId, row.id));
      if (answers.length) await tx.insert(questionAnswer).values(answers.map((a) => ({ questionId: row.id, ...a })));
      await tx.delete(questionTag).where(eq(questionTag.questionId, row.id));
      if (tags.length) await tx.insert(questionTag).values(tags.map((t) => ({ questionId: row.id, tagId: tagIds.get(t)! })));
    }
    const staleQuestions = [...existingQuestions.values()].filter((r) => r.status === 'active' && !seenQuestions.has(r.key)).map((r) => r.id);
    for (const ids of chunk(staleQuestions, 5000))
      await tx.update(question).set({ status: 'archived', updatedAt: opts.now }).where(inArray(question.id, ids));
    report.questions = { total: records.length, changed: changedQuestions, archived: staleQuestions.length };

    // Course items and lesson items ---------------------------------------------------------------
    const ownOrder = (c: LoadedCourse) => courseEntries(c).map((e) => entryKey(e));
    const expandIncludes = (c: LoadedCourse, visited: Set<string>): string[] => {
      const out: string[] = [];
      for (const rule of c.data.include ?? []) {
        for (const target of rule.courses) {
          const src = index.courses.get(target);
          if (!src || visited.has(target)) continue;
          visited.add(target);
          const keys = [...ownOrder(src), ...expandIncludes(src, visited)];
          for (const k of keys) {
            const d = index.declarations.get(k)?.declaration;
            if (!d) continue;
            if (rule.kinds?.length && !rule.kinds.includes(d.kind)) continue;
            if (rule.tags?.length && !rule.tags.some((t) => d.tags?.includes(t))) continue;
            out.push(k);
          }
        }
      }
      return out;
    };
    for (const [key, c] of index.courses) {
      const courseId = courseIds.get(key)!;
      const rows = new Map<string, { itemId: number; sort: number; noteMd: string | null; via: CourseItemVia }>();
      for (const e of courseEntries(c)) {
        const k = entryKey(e);
        const note = text((e.declaration ?? e.ref)!.note, e.dir);
        const existing = rows.get(k);
        if (existing) {
          existing.noteMd ??= note;
          continue;
        }
        rows.set(k, { itemId: itemIds.get(k)!, sort: rows.size, noteMd: note, via: e.declaration ? 'declared' : 'ref' });
      }
      for (const k of expandIncludes(c, new Set([key]))) {
        if (!rows.has(k)) rows.set(k, { itemId: itemIds.get(k)!, sort: rows.size, noteMd: null, via: 'include' });
      }
      await tx.delete(courseItem).where(eq(courseItem.courseId, courseId));
      for (const part of chunk([...rows.values()], 1000)) await tx.insert(courseItem).values(part.map((r) => ({ courseId, ...r })));
      report.courseItems += rows.size;

      for (const l of c.lessons) {
        const lessonId = lessonIds.get(`${key}::${l.key}`)!;
        await tx.delete(lessonItem).where(eq(lessonItem.lessonId, lessonId));
        const ids = [...new Set(l.entries.map((e) => itemIds.get(entryKey(e))!))];
        if (ids.length) await tx.insert(lessonItem).values(ids.map((itemId, sort) => ({ lessonId, itemId, sort })));
      }
    }
    for (const id of archivedCourses) await tx.delete(courseItem).where(eq(courseItem.courseId, id));

    // Cards ---------------------------------------------------------------------------------
    for (const id of [...courseIds.values(), ...archivedCourses]) {
      const r = await rebuildCourseCards(tx, id, { force: forceRebuild.has(id), now: opts.now, clock: opts.clock });
      report.cards.created += r.created;
      report.cards.rebuilt += r.rebuilt;
      report.cards.removed += r.removed;
    }
    return report;
  });
}

async function ensureTags(tx: DbExecutor, keys: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const part of chunk(keys, 1000)) {
    await tx.insert(tag).values(part.map((key) => ({ key }))).onConflictDoNothing();
    for (const r of await tx.select({ id: tag.id, key: tag.key }).from(tag).where(inArray(tag.key, part))) map.set(r.key, r.id);
  }
  return map;
}

type Archivable = typeof subject | typeof course | typeof chapter | typeof lesson;

/** Marks active rows not in `keepIds` as archived; returns the archived ids. */
async function archiveMissing(tx: DbExecutor, table: Archivable, keepIds: number[], scope?: ReturnType<typeof eq>): Promise<number[]> {
  const rows = await tx
    .select({ id: table.id })
    .from(table)
    .where(scope ? and(scope, eq(table.status, 'active')) : eq(table.status, 'active'));
  const keep = new Set(keepIds);
  const stale = rows.map((r) => r.id).filter((id) => !keep.has(id));
  for (const ids of chunk(stale, 5000)) await tx.update(table).set({ status: 'archived', updatedAt: new Date() }).where(inArray(table.id, ids));
  return stale;
}

