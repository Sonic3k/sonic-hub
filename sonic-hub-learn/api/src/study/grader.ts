import { CardState, matchTyped, Rating, type AnswerInput, type QuestionType, type RatingValue } from '@learn/shared';
import type { AnswerKey } from './question-builder.js';

export interface ChoiceRecord {
  sort: number;
  questionOptionId: number | null;
  matchedOptionId: number | null;
  itemId: number | null;
}

export interface Graded {
  /** null only for flashcards that were not self-graded (never stored). */
  correct: boolean;
  /** Accepted, but with a small spelling slip. */
  typo: boolean;
  responseText: string | null;
  choices: ChoiceRecord[];
}

/** The answer does not fit the question (wrong shape or unknown option ids). */
export class AnswerShapeError extends Error {}

function optionRef(id: string): Pick<ChoiceRecord, 'questionOptionId' | 'itemId'> {
  if (/^o\d+$/.test(id)) return { questionOptionId: Number(id.slice(1)), itemId: null };
  if (/^i\d+$/.test(id)) return { questionOptionId: null, itemId: Number(id.slice(1)) };
  throw new AnswerShapeError(`unknown option id "${id}"`);
}

export function grade(key: AnswerKey, input: AnswerInput): Graded {
  switch (key.kind) {
    case 'choice': {
      const chosen = [...new Set(input.optionIds ?? [])];
      if (!chosen.length) throw new AnswerShapeError('optionIds is required');
      if (!key.multi && chosen.length !== 1) throw new AnswerShapeError('choose exactly one option');
      const known = new Set(key.known);
      for (const id of chosen) if (!known.has(id)) throw new AnswerShapeError(`option "${id}" is not part of this question`);
      const correct = chosen.length === key.correct.length && key.correct.every((id) => chosen.includes(id));
      return { correct, typo: false, responseText: null, choices: chosen.map((id, sort) => ({ sort, matchedOptionId: null, ...optionRef(id) })) };
    }
    case 'true_false': {
      if (typeof input.value !== 'boolean') throw new AnswerShapeError('value (true/false) is required');
      return { correct: input.value === key.value, typo: false, responseText: String(input.value), choices: [] };
    }
    case 'typing': {
      if (typeof input.text !== 'string') throw new AnswerShapeError('text is required');
      const m = matchTyped(input.text, key.accepted);
      return { correct: m !== 'wrong', typo: m === 'typo', responseText: input.text, choices: [] };
    }
    case 'cloze': {
      const blanks = input.blanks;
      if (!blanks) throw new AnswerShapeError('blanks is required');
      let correct = true;
      let typo = false;
      for (const [index, accepted] of Object.entries(key.blanks)) {
        const m = matchTyped(blanks[index] ?? '', accepted);
        if (m === 'wrong') correct = false;
        if (m === 'typo') typo = true;
      }
      const responseText = Object.keys(key.blanks)
        .map((i) => blanks[i] ?? '')
        .join(' | ');
      return { correct, typo: correct && typo, responseText, choices: [] };
    }
    case 'order': {
      const order = input.order ?? [];
      if (order.length !== key.order.length || new Set(order).size !== order.length || order.some((id) => !key.order.includes(id)))
        throw new AnswerShapeError('order must list every option exactly once');
      const correct = order.every((id, i) => id === key.order[i]);
      return { correct, typo: false, responseText: null, choices: order.map((id, sort) => ({ sort, matchedOptionId: null, ...optionRef(id) })) };
    }
    case 'match': {
      const pairs = input.pairs;
      if (!pairs) throw new AnswerShapeError('pairs is required');
      const targets = new Set(Object.values(key.pairs));
      for (const [o, m] of Object.entries(pairs))
        if (!(o in key.pairs) || !targets.has(m)) throw new AnswerShapeError(`pair "${o}" → "${m}" is not part of this question`);
      const correct = Object.entries(key.pairs).every(([o, m]) => pairs[o] === m);
      return {
        correct,
        typo: false,
        responseText: null,
        choices: Object.entries(pairs).map(([o, m], sort) => ({
          sort,
          questionOptionId: Number(o.slice(1)),
          matchedOptionId: Number(m.slice(1)),
          itemId: null,
        })),
      };
    }
    case 'flashcard': {
      if (!input.rating || ![1, 2, 3, 4].includes(input.rating)) throw new AnswerShapeError('rating (1–4) is required for flashcards');
      return { correct: input.rating > Rating.Again, typo: false, responseText: null, choices: [] };
    }
  }
}

/** [fast, slow] answer times in ms before reading time is added. */
const PACE: Record<QuestionType, [number, number]> = {
  single: [4_000, 15_000],
  true_false: [3_000, 12_000],
  multi: [8_000, 40_000],
  typing: [6_000, 25_000],
  cloze: [6_000, 25_000],
  order: [8_000, 45_000],
  match: [10_000, 60_000],
  flashcard: [0, Number.POSITIVE_INFINITY],
};
/** Reading time per prompt character (~20 characters a second). */
const READ_MS_PER_CHAR = 50;
const EASY_MIN_STABILITY_DAYS = 21;

/**
 * Grades how well an answer was remembered: wrong → Again; right with a hint, a typo or slowly →
 * Hard; right → Good; right and fast on a card already known for weeks → Easy.
 */
export function autoRating(a: {
  graded: Graded;
  type: QuestionType;
  promptChars: number;
  hintUsed?: boolean;
  timeMs?: number | null;
  card?: { state: number; stability: number } | null;
}): RatingValue {
  if (!a.graded.correct) return Rating.Again;
  if (a.graded.typo || a.hintUsed) return Rating.Hard;
  const [fast, slow] = PACE[a.type];
  const reading = a.promptChars * READ_MS_PER_CHAR;
  if (a.timeMs != null && a.timeMs > slow + reading) return Rating.Hard;
  const mature = a.card && a.card.state === CardState.Review && a.card.stability >= EASY_MIN_STABILITY_DAYS;
  if (a.timeMs != null && mature && a.timeMs < fast + reading * 0.3) return Rating.Easy;
  return Rating.Good;
}
