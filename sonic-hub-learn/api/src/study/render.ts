import type { Facet, Generator } from '@learn/shared';
import type { MediaUrls } from '../common/tokens.js';
import type { DbExecutor } from '../db/db.js';
import { loadItems, loadQuestions, loadVocabPools, type ItemData, type QuestionData } from './loaders.js';
import { buildQuestion, type BuiltQuestion } from './question-builder.js';

export interface RenderableCard {
  id: number;
  courseId: number;
  itemId: number;
  facet: Facet;
  questionId: number | null;
  generator: string | null;
  seed: number;
}

export interface Rendered {
  built: Map<number, BuiltQuestion>;
  items: Map<number, ItemData>;
  questions: Map<number, QuestionData>;
}

/** Builds question views and answer keys for session cards, loading everything in a few batches. */
export async function renderCards(db: DbExecutor, urls: MediaUrls, cards: readonly RenderableCard[]): Promise<Rendered> {
  const items = await loadItems(
    db,
    cards.map((c) => c.itemId),
  );
  const questions = await loadQuestions(
    db,
    cards.filter((c) => c.questionId).map((c) => c.questionId!),
  );
  const needPool = new Set<number>();
  for (const c of cards)
    if (c.generator === 'vocab-recognize' || c.generator === 'vocab-listen') {
      const it = items.get(c.itemId);
      if (it) needPool.add(it.subjectId);
    }
  const pools = await loadVocabPools(db, [...needPool]);
  const built = new Map<number, BuiltQuestion>();
  for (const c of cards) {
    const item = items.get(c.itemId);
    if (!item) continue;
    built.set(
      c.id,
      buildQuestion({
        courseId: c.courseId,
        facet: c.facet,
        questionId: c.questionId,
        generator: c.generator as Generator | null,
        seed: c.seed,
        item,
        question: c.questionId ? (questions.get(c.questionId) ?? null) : null,
        pool: pools.get(item.subjectId) ?? [],
        urls,
      }),
    );
  }
  return { built, items, questions };
}
