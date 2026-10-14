import type { Facet, ItemKind, QuestionType } from '@learn/shared';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { chunk } from '../common/util.js';
import type { DbExecutor } from '../db/db.js';
import {
  item,
  itemAccept,
  itemExample,
  itemTag,
  itemVocab,
  question,
  questionAnswer,
  questionOption,
  questionTag,
  reviewLog,
  subject,
  tag,
} from '../db/schema.js';

/* Batch loaders for everything a question or an item view needs. */

export interface VocabData {
  term: string;
  pronunciation: string | null;
  pos: string | null;
  meaning: string;
  definition: string | null;
}

export interface ExampleData {
  courseId: number | null;
  text: string;
  translation: string | null;
  audioKey: string | null;
  sort: number;
}

export interface ItemData {
  id: number;
  key: string;
  kind: ItemKind;
  subjectId: number;
  lang: string;
  status: string;
  frontMd: string | null;
  backMd: string | null;
  pattern: string | null;
  imageKey: string | null;
  audioKey: string | null;
  vocab: VocabData | null;
  accepts: string[];
  examples: ExampleData[];
  tags: string[];
}

export interface OptionData {
  id: number;
  textMd: string;
  isCorrect: boolean;
  whyMd: string | null;
  matchMd: string | null;
  sort: number;
}

export interface QuestionData {
  id: number;
  key: string;
  itemId: number;
  courseId: number | null;
  facet: Facet;
  type: QuestionType;
  promptMd: string;
  backMd: string | null;
  explanationMd: string | null;
  trueFalseAnswer: boolean | null;
  imageKey: string | null;
  audioKey: string | null;
  options: OptionData[];
  answers: { blank: number; text: string }[];
  tags: string[];
}

export interface VocabLite {
  itemId: number;
  term: string;
  meaning: string;
  pos: string | null;
}

export interface QuestionCandidate {
  id: number;
  itemId: number;
  courseId: number | null;
  facet: Facet;
  type: QuestionType;
}

async function inChunks<T>(ids: readonly number[], load: (part: number[]) => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (const part of chunk([...new Set(ids)], 5000)) out.push(...(await load(part)));
  return out;
}

export async function loadItems(db: DbExecutor, ids: readonly number[]): Promise<Map<number, ItemData>> {
  const map = new Map<number, ItemData>();
  if (!ids.length) return map;
  const rows = await inChunks(ids, (part) =>
    db
      .select({ item, lang: subject.lang })
      .from(item)
      .innerJoin(subject, eq(subject.id, item.subjectId))
      .where(inArray(item.id, part)),
  );
  for (const { item: r, lang } of rows) {
    map.set(r.id, {
      id: r.id,
      key: r.key,
      kind: r.kind,
      subjectId: r.subjectId,
      lang,
      status: r.status,
      frontMd: r.frontMd,
      backMd: r.backMd,
      pattern: r.pattern,
      imageKey: r.imageKey,
      audioKey: r.audioKey,
      vocab: null,
      accepts: [],
      examples: [],
      tags: [],
    });
  }
  const vocab = await inChunks(ids, (part) => db.select().from(itemVocab).where(inArray(itemVocab.itemId, part)));
  for (const v of vocab) {
    const it = map.get(v.itemId);
    if (it) it.vocab = { term: v.term, pronunciation: v.pronunciation, pos: v.pos, meaning: v.meaning, definition: v.definition };
  }
  const accepts = await inChunks(ids, (part) =>
    db.select().from(itemAccept).where(inArray(itemAccept.itemId, part)).orderBy(asc(itemAccept.sort)),
  );
  for (const a of accepts) map.get(a.itemId)?.accepts.push(a.text);
  const examples = await inChunks(ids, (part) =>
    db.select().from(itemExample).where(inArray(itemExample.itemId, part)).orderBy(asc(itemExample.id)),
  );
  for (const e of examples)
    map.get(e.itemId)?.examples.push({ courseId: e.courseId, text: e.text, translation: e.translation, audioKey: e.audioKey, sort: e.sort });
  const tags = await inChunks(ids, (part) =>
    db.select({ itemId: itemTag.itemId, key: tag.key }).from(itemTag).innerJoin(tag, eq(tag.id, itemTag.tagId)).where(inArray(itemTag.itemId, part)),
  );
  for (const t of tags) map.get(t.itemId)?.tags.push(t.key);
  return map;
}

export async function loadQuestions(db: DbExecutor, ids: readonly number[]): Promise<Map<number, QuestionData>> {
  const map = new Map<number, QuestionData>();
  if (!ids.length) return map;
  const rows = await inChunks(ids, (part) => db.select().from(question).where(inArray(question.id, part)));
  for (const q of rows) {
    map.set(q.id, {
      id: q.id,
      key: q.key,
      itemId: q.itemId,
      courseId: q.courseId,
      facet: q.facet,
      type: q.type,
      promptMd: q.promptMd,
      backMd: q.backMd,
      explanationMd: q.explanationMd,
      trueFalseAnswer: q.trueFalseAnswer,
      imageKey: q.imageKey,
      audioKey: q.audioKey,
      options: [],
      answers: [],
      tags: [],
    });
  }
  const options = await inChunks(ids, (part) =>
    db
      .select()
      .from(questionOption)
      .where(and(inArray(questionOption.questionId, part), eq(questionOption.status, 'active')))
      .orderBy(asc(questionOption.sort)),
  );
  for (const o of options)
    map.get(o.questionId)?.options.push({ id: o.id, textMd: o.textMd, isCorrect: o.isCorrect, whyMd: o.whyMd, matchMd: o.matchMd, sort: o.sort });
  const answers = await inChunks(ids, (part) =>
    db.select().from(questionAnswer).where(inArray(questionAnswer.questionId, part)).orderBy(asc(questionAnswer.blank), asc(questionAnswer.sort)),
  );
  for (const a of answers) map.get(a.questionId)?.answers.push({ blank: a.blank, text: a.text });
  const tags = await inChunks(ids, (part) =>
    db
      .select({ questionId: questionTag.questionId, key: tag.key })
      .from(questionTag)
      .innerJoin(tag, eq(tag.id, questionTag.tagId))
      .where(inArray(questionTag.questionId, part)),
  );
  for (const t of tags) map.get(t.questionId)?.tags.push(t.key);
  return map;
}

/** Active vocab of the given subjects, used for multiple-choice distractors. */
export async function loadVocabPools(db: DbExecutor, subjectIds: readonly number[]): Promise<Map<number, VocabLite[]>> {
  const map = new Map<number, VocabLite[]>();
  if (!subjectIds.length) return map;
  const rows = await db
    .select({ subjectId: item.subjectId, itemId: item.id, term: itemVocab.term, meaning: itemVocab.meaning, pos: itemVocab.pos })
    .from(itemVocab)
    .innerJoin(item, eq(item.id, itemVocab.itemId))
    .where(and(inArray(item.subjectId, [...new Set(subjectIds)]), eq(item.status, 'active')));
  for (const r of rows) {
    const list = map.get(r.subjectId) ?? [];
    list.push({ itemId: r.itemId, term: r.term, meaning: r.meaning, pos: r.pos });
    map.set(r.subjectId, list);
  }
  return map;
}

/** Active authored questions of the given items. */
export async function loadCandidates(db: DbExecutor, itemIds: readonly number[]): Promise<QuestionCandidate[]> {
  if (!itemIds.length) return [];
  return inChunks(itemIds, (part) =>
    db
      .select({ id: question.id, itemId: question.itemId, courseId: question.courseId, facet: question.facet, type: question.type })
      .from(question)
      .where(and(inArray(question.itemId, part), eq(question.status, 'active'))),
  );
}

/** When each question / generator was last answered: "q:<id>" or "g:<item>:<facet>:<generator>" → ms. */
export async function loadUsage(db: DbExecutor, itemIds: readonly number[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!itemIds.length) return map;
  const rows = await inChunks(itemIds, (part) =>
    db
      .select({
        itemId: reviewLog.itemId,
        facet: reviewLog.facet,
        questionId: reviewLog.questionId,
        generator: reviewLog.generator,
        last: sql<Date>`max(${reviewLog.reviewedAt})`,
      })
      .from(reviewLog)
      .where(inArray(reviewLog.itemId, part))
      .groupBy(reviewLog.itemId, reviewLog.facet, reviewLog.questionId, reviewLog.generator),
  );
  for (const r of rows) {
    const t = new Date(r.last).getTime();
    if (r.questionId) map.set(`q:${r.questionId}`, Math.max(t, map.get(`q:${r.questionId}`) ?? 0));
    else if (r.generator) map.set(`g:${r.itemId}:${r.facet}:${r.generator}`, t);
  }
  return map;
}
