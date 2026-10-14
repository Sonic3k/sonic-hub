/** Kinds of knowledge item. The kind decides an item's fields and the facets it can be studied by. */
export const ITEM_KINDS = ['vocab', 'grammar', 'concept'] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

/**
 * Facets are the different sides of one thing to remember; each facet keeps its own memory schedule.
 * - recognize: see the term, pick its meaning
 * - recall:    see the meaning or prompt, produce the answer (typing, or front/back flashcard)
 * - use:       use it in context (a cloze sentence)
 * - listen:    hear it, pick its meaning
 * - apply:     apply the knowledge to a scenario (authored questions)
 */
export const FACETS = ['recognize', 'recall', 'use', 'listen', 'apply'] as const;
export type Facet = (typeof FACETS)[number];

/** Facets per kind, in the order Daily introduces them. */
export const KIND_FACETS: Record<ItemKind, readonly Facet[]> = {
  vocab: ['recognize', 'recall', 'use', 'listen'],
  grammar: ['recall', 'apply'],
  concept: ['recall', 'apply'],
};

export const QUESTION_TYPES = ['single', 'multi', 'true_false', 'typing', 'cloze', 'order', 'match', 'flashcard'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Where a course comes from: made by us, a published book, a website, or an online course. */
export const SOURCE_TYPES = ['self', 'book', 'website', 'online-course'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const RELATION_TYPES = ['synonym', 'antonym', 'compare', 'prerequisite', 'see_also', 'collocation', 'word_family'] as const;
export type RelationType = (typeof RELATION_TYPES)[number];

export const STUDY_MODES = ['daily', 'quiz', 'flashcard', 'exam'] as const;
export type StudyMode = (typeof STUDY_MODES)[number];

/** Order in which a course hands out new items: the course's own order, or shuffled. */
export const NEW_ORDERS = ['course', 'random'] as const;
export type NewOrder = (typeof NEW_ORDERS)[number];

export const ALGORITHMS = ['fsrs'] as const;
export type Algorithm = (typeof ALGORITHMS)[number];

/** FSRS grades. */
export const Rating = { Again: 1, Hard: 2, Good: 3, Easy: 4 } as const;
export type RatingValue = 1 | 2 | 3 | 4;

/** FSRS card states. */
export const CardState = { New: 0, Learning: 1, Review: 2, Relearning: 3 } as const;
export type CardStateValue = 0 | 1 | 2 | 3;

/** Vocab question generators (questions built from item data, no authoring needed). */
export const GENERATORS = ['vocab-recognize', 'vocab-recall', 'vocab-use', 'vocab-listen', 'flashcard'] as const;
export type Generator = (typeof GENERATORS)[number];
