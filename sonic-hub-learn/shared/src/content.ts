import { z } from 'zod';
import {
  ALGORITHMS,
  FACETS,
  ITEM_KINDS,
  NEW_ORDERS,
  QUESTION_TYPES,
  RELATION_TYPES,
  SOURCE_TYPES,
} from './enums.js';
import { hasCloze } from './text.js';

/*
 * Content file formats. Content lives in git as YAML + Markdown; these schemas validate it
 * (content:check) and are exported as JSON Schema (content/_schema) for any LLM to author against.
 */

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const ITEM_ID_RE = /^[a-z][a-z0-9]*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/;
export const TAG_RE = /^[a-z0-9]+(?:[-_.][a-z0-9]+)*(?::[a-z0-9]+(?:[-_.][a-z0-9]+)*)?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const Slug = z.string().regex(SLUG_RE, 'lowercase words joined by "-", e.g. "workplace-english"');
export const ItemId = z
  .string()
  .regex(ITEM_ID_RE, 'subject prefix + dot path, e.g. "en.deadline" or "aws.s3.storage-classes"')
  .describe('Globally unique item id: the subject prefix, then dot-separated lowercase slugs.');
const Tag = z
  .string()
  .regex(TAG_RE, 'lowercase tag, optionally namespaced: "topic:work", "domain:secure", "band:6.5"')
  .describe('Tag, optionally namespaced as "namespace:value".');
const MediaPath = z
  .string()
  .min(1)
  .describe('Media file path relative to this file, e.g. "media/s3-classes.svg". Images become WebP on sync.');
const Markdown = z.string().min(1);

// ---------------------------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------------------------

export const OptionSchema = z.strictObject({
  text: Markdown.describe('Option text (markdown).'),
  correct: z.boolean().optional().describe('Mark the correct option(s) here — never by index.'),
  why: z.string().nullish().describe('Why this option is right or wrong; shown after answering.'),
  match: z.string().nullish().describe('match questions only: the right-hand side paired with this option.'),
});

export const QuestionSchema = z
  .strictObject({
    id: Slug.describe('Unique within its item, e.g. "q1" or "scenario-archive".'),
    type: z.enum(QUESTION_TYPES).describe(
      'single: one correct option · multi: several correct · true_false: uses `answer` · ' +
        'typing: uses `answers` · cloze: blanks in `prompt` with {{c1::answer}} · ' +
        'order: `options` listed in the correct order · match: each option has `match` · flashcard: uses `back`',
    ),
    facet: z
      .enum(FACETS)
      .optional()
      .describe('Which side of the item this question trains. Default: "apply" (vocab: "use").'),
    prompt: Markdown.describe('The question (markdown). For cloze, the sentence with {{c1::answer}} blanks.'),
    options: z.array(OptionSchema).optional(),
    answer: z.boolean().optional().describe('true_false only: the correct value.'),
    answers: z
      .array(z.string().min(1))
      .optional()
      .describe('typing only: accepted answers, canonical first. Small typos are tolerated automatically.'),
    back: z.string().optional().describe('flashcard only: the back of the card (markdown).'),
    explanation: z.string().nullish().describe('Explanation shown after answering (markdown).'),
    image: MediaPath.nullish(),
    audio: MediaPath.nullish(),
    tags: z.array(Tag).optional().describe('Question tags, e.g. exam domains "domain:secure".'),
    difficulty: z.number().int().min(1).max(3).optional(),
    course_only: z
      .boolean()
      .optional()
      .describe('true: only used in the course whose file declares it. Default: shared by every course.'),
  })
  .superRefine((q, ctx) => {
    const issue = (message: string, path: (string | number)[] = []) =>
      ctx.addIssue({ code: 'custom', message, path });
    const options = q.options ?? [];
    const needsOptions = ['single', 'multi', 'order', 'match'].includes(q.type);
    if (needsOptions && options.length < 2) issue(`${q.type} needs at least 2 options`, ['options']);
    if (!needsOptions && options.length) issue(`${q.type} does not take options`, ['options']);
    const texts = new Set<string>();
    options.forEach((o, i) => {
      if (texts.has(o.text.trim())) issue('duplicate option text', ['options', i, 'text']);
      texts.add(o.text.trim());
    });
    const correct = options.filter((o) => o.correct).length;
    if (q.type === 'single' && correct !== 1) issue('single needs exactly one option with correct: true', ['options']);
    if (q.type === 'multi' && correct < 1) issue('multi needs at least one option with correct: true', ['options']);
    if ((q.type === 'order' || q.type === 'match') && correct > 0)
      issue(`${q.type} options do not use "correct"`, ['options']);
    if (q.type === 'match') options.forEach((o, i) => !o.match && issue('match options need "match"', ['options', i]));
    if (q.type === 'true_false' && q.answer === undefined) issue('true_false needs "answer"', ['answer']);
    if (q.type !== 'true_false' && q.answer !== undefined) issue('"answer" is only for true_false', ['answer']);
    if (q.type === 'typing' && !q.answers?.length) issue('typing needs "answers"', ['answers']);
    if (q.type !== 'typing' && q.answers) issue('"answers" is only for typing', ['answers']);
    if (q.type === 'cloze' && !hasCloze(q.prompt)) issue('cloze prompt needs {{c1::answer}} blanks', ['prompt']);
    if (q.type === 'flashcard' && !q.back) issue('flashcard needs "back"', ['back']);
    if (q.type !== 'flashcard' && q.back) issue('"back" is only for flashcard', ['back']);
  });

// ---------------------------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------------------------

export const ExampleSchema = z.union([
  z.string().min(1),
  z.strictObject({
    text: z.string().min(1).describe('Example sentence; mark the item with {{c1::...}} to enable cloze practice.'),
    translation: z.string().nullish().describe("Translation in the learner's language."),
    audio: MediaPath.nullish(),
  }),
]);

export const RelatedSchema = z.union([
  ItemId,
  z.strictObject({ id: ItemId, type: z.enum(RELATION_TYPES).default('see_also') }),
]);

const itemCommon = {
  id: ItemId,
  image: MediaPath.nullish(),
  audio: MediaPath.nullish().describe('Recorded audio. Without it, the browser voice reads the text.'),
  tags: z.array(Tag).optional(),
  examples: z
    .array(ExampleSchema)
    .optional()
    .describe('Examples belong to the course whose file declares them; other courses fall back to them.'),
  related: z.array(RelatedSchema).optional().describe('Related items: id, or {id, type}.'),
  note: z.string().nullish().describe('Course-specific note (markdown) shown with this item in this course.'),
  questions: z.array(QuestionSchema).optional(),
};

export const VocabItemSchema = z.strictObject({
  ...itemCommon,
  kind: z.literal('vocab'),
  term: z.string().min(1).describe('The word or phrase being learned.'),
  pronunciation: z.string().nullish().describe('IPA / pinyin / romaji, e.g. "/ˈded.laɪn/".'),
  pos: z.string().nullish().describe('Part of speech: noun, verb, adjective, adverb, phrase, idiom...'),
  meaning: z.string().min(1).describe("Meaning in the learner's language (Vietnamese)."),
  definition: z.string().nullish().describe('Definition in the target language.'),
  accept: z.array(z.string().min(1)).optional().describe('Other accepted spellings/forms when typing the term.'),
});

export const GrammarItemSchema = z.strictObject({
  ...itemCommon,
  kind: z.literal('grammar'),
  front: Markdown.describe('Front of the card: the rule or question.'),
  back: Markdown.describe('Back of the card: the explanation (markdown).'),
  pattern: z.string().nullish().describe('Short pattern, e.g. "have/has + past participle".'),
});

export const ConceptItemSchema = z.strictObject({
  ...itemCommon,
  kind: z.literal('concept'),
  front: Markdown.describe('Front of the card: the concept or question.'),
  back: Markdown.describe('Back of the card: the explanation (markdown).'),
});

export const ItemDeclarationSchema = z.discriminatedUnion('kind', [VocabItemSchema, GrammarItemSchema, ConceptItemSchema]);

export const ItemRefSchema = z.strictObject({
  ref: ItemId.describe('Reuse an item declared in another file or course.'),
  note: itemCommon.note,
  examples: itemCommon.examples,
  questions: itemCommon.questions,
});

export const ItemEntrySchema = z.union([ItemRefSchema, ItemDeclarationSchema]);

export const ItemsFileSchema = z.strictObject({
  title: z.string().nullish().describe('Lesson title, when the lesson has no .md file.'),
  items: z.array(ItemEntrySchema).default([]),
});

// ---------------------------------------------------------------------------------------------
// Subject, course, chapter, lesson
// ---------------------------------------------------------------------------------------------

export const SubjectFileSchema = z.strictObject({
  id: Slug.describe('Must equal the folder name.'),
  title: z.string().min(1),
  prefix: z
    .string()
    .regex(/^[a-z][a-z0-9]*$/)
    .describe('Item id prefix for this subject, e.g. "en" → "en.deadline".'),
  lang: z.string().default('en-US').describe('BCP-47 language of the content, used for text-to-speech.'),
  description: z.string().nullish(),
  sort: z.number().int().optional(),
});

export const SourceSchema = z.strictObject({
  type: z.enum(SOURCE_TYPES).describe('self: made by us · book · website · online-course'),
  name: z.string().nullish().describe('Book, site or course name.'),
  author: z.string().nullish(),
  publisher: z.string().nullish(),
  edition: z.string().nullish(),
  url: z.string().nullish(),
});

export const PolicySchema = z.strictObject({
  algorithm: z.enum(ALGORITHMS).default('fsrs'),
  retention: z.number().min(0.7).max(0.99).default(0.9).describe('Target recall probability at review time.'),
  new_per_day: z.number().int().min(0).max(500).default(15),
  max_reviews_per_day: z.number().int().min(1).max(5000).default(200),
  new_order: z.enum(NEW_ORDERS).default('course'),
  facets: z.array(z.enum(FACETS)).optional().describe('Facets studied in this course. Default: all.'),
  exam_date: z.string().regex(DATE_RE).nullish().describe('YYYY-MM-DD; reviews are scheduled to land before it.'),
});

export const ExamDomainSchema = z.strictObject({
  id: Slug,
  title: z.string().min(1),
  weight: z.number().positive().describe('Share of the exam, in percent.'),
  tag: Tag.describe('Questions/items carrying this tag belong to the domain.'),
});

export const ExamSchema = z.strictObject({
  questions: z.number().int().positive(),
  minutes: z.number().int().positive(),
  pass_percent: z.number().int().min(1).max(100),
  domains: z.array(ExamDomainSchema).optional(),
});

export const IncludeRuleSchema = z.strictObject({
  courses: z.array(Slug).min(1).describe('Take items from these courses...'),
  kinds: z.array(z.enum(ITEM_KINDS)).optional().describe('...optionally only these kinds...'),
  tags: z.array(Tag).optional().describe('...optionally only items carrying one of these tags.'),
});

export const CourseFileSchema = z.strictObject({
  id: Slug.describe('Globally unique; must equal the folder name.'),
  title: z.string().min(1),
  description: z.string().nullish(),
  sort: z.number().int().optional(),
  tags: z.array(Tag).optional().describe('e.g. "goal:ielts", "band:6"'),
  source: SourceSchema,
  policy: PolicySchema.prefault({}),
  exam: ExamSchema.nullish(),
  include: z
    .array(IncludeRuleSchema)
    .optional()
    .describe('Collection courses: link items from other courses (kept up to date on every sync).'),
  items: z.array(ItemEntrySchema).optional().describe('Course-level items or refs (mainly for collection courses).'),
});

export const ChapterFileSchema = z.strictObject({
  title: z.string().min(1),
  description: z.string().nullish(),
});

export const LessonFrontmatterSchema = z.strictObject({
  title: z.string().min(1),
  summary: z.string().nullish(),
  video: z.string().nullish().describe('Video URL (YouTube unlisted or a direct mp4 link).'),
});

export type OptionInput = z.infer<typeof OptionSchema>;
export type QuestionInput = z.infer<typeof QuestionSchema>;
export type ExampleInput = z.infer<typeof ExampleSchema>;
export type RelatedInput = z.infer<typeof RelatedSchema>;
export type VocabItemInput = z.infer<typeof VocabItemSchema>;
export type GrammarItemInput = z.infer<typeof GrammarItemSchema>;
export type ConceptItemInput = z.infer<typeof ConceptItemSchema>;
export type ItemDeclarationInput = z.infer<typeof ItemDeclarationSchema>;
export type ItemRefInput = z.infer<typeof ItemRefSchema>;
export type ItemEntryInput = z.infer<typeof ItemEntrySchema>;
export type ItemsFile = z.infer<typeof ItemsFileSchema>;
export type SubjectFile = z.infer<typeof SubjectFileSchema>;
export type CourseFile = z.infer<typeof CourseFileSchema>;
export type ChapterFile = z.infer<typeof ChapterFileSchema>;
export type LessonFrontmatter = z.infer<typeof LessonFrontmatterSchema>;
export type PolicyInput = z.infer<typeof PolicySchema>;
