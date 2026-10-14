import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  bigint,
  bigserial,
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { Facet, ItemKind, NewOrder, QuestionType, RelationType, SourceType, StudyMode } from '@learn/shared';

/*
 * Two halves:
 *  - catalog: synced from git (content/), upserted by key, never hard-deleted (archived instead)
 *  - learner state: review_log is the single source of truth for answers; course_card is a
 *    per-course projection of it (each course schedules with its own policy).
 */

export type EntityStatus = 'active' | 'archived';
export type CourseItemVia = 'declared' | 'ref' | 'include';
export type SessionStatus = 'active' | 'submitted' | 'completed';
export type SessionCardStatus = 'pending' | 'saved' | 'answered';

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

/** Columns every catalog/state entity carries (the BaseEntity of this service). */
const audit = {
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ---------------------------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------------------------

export const subject = pgTable('subject', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  title: text('title').notNull(),
  prefix: text('prefix').notNull().unique(),
  lang: text('lang').notNull(),
  description: text('description'),
  themeCss: text('theme_css'),
  sort: integer('sort').notNull().default(0),
  status: text('status').$type<EntityStatus>().notNull().default('active'),
  contentHash: text('content_hash'),
  ...audit,
});

export const tag = pgTable('tag', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  ...audit,
});

export const course = pgTable(
  'course',
  {
    id: serial('id').primaryKey(),
    subjectId: integer('subject_id')
      .notNull()
      .references(() => subject.id),
    key: text('key').notNull().unique(),
    title: text('title').notNull(),
    description: text('description'),
    sort: integer('sort').notNull().default(0),
    isCollection: boolean('is_collection').notNull().default(false),
    sourceType: text('source_type').$type<SourceType>().notNull(),
    sourceName: text('source_name'),
    sourceAuthor: text('source_author'),
    sourcePublisher: text('source_publisher'),
    sourceEdition: text('source_edition'),
    sourceUrl: text('source_url'),
    algorithm: text('algorithm').notNull().default('fsrs'),
    retention: doublePrecision('retention').notNull().default(0.9),
    newPerDay: integer('new_per_day').notNull().default(15),
    maxReviewsPerDay: integer('max_reviews_per_day').notNull().default(200),
    newOrder: text('new_order').$type<NewOrder>().notNull().default('course'),
    examDate: date('exam_date', { mode: 'string' }),
    examQuestionCount: integer('exam_question_count'),
    examMinutes: integer('exam_minutes'),
    examPassPercent: integer('exam_pass_percent'),
    /** Hash of the scheduling policy; when it changes the course's cards are rebuilt from review_log. */
    policyHash: text('policy_hash'),
    status: text('status').$type<EntityStatus>().notNull().default('active'),
    contentHash: text('content_hash'),
    ...audit,
  },
  (t) => [index('course_subject_idx').on(t.subjectId)],
);

export const courseTag = pgTable(
  'course_tag',
  {
    courseId: integer('course_id')
      .notNull()
      .references(() => course.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.courseId, t.tagId] })],
);

/** Facets a course studies (from policy.facets). */
export const courseFacet = pgTable(
  'course_facet',
  {
    courseId: integer('course_id')
      .notNull()
      .references(() => course.id, { onDelete: 'cascade' }),
    facet: text('facet').$type<Facet>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.courseId, t.facet] })],
);

export const courseExamDomain = pgTable(
  'course_exam_domain',
  {
    id: serial('id').primaryKey(),
    courseId: integer('course_id')
      .notNull()
      .references(() => course.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    title: text('title').notNull(),
    weight: doublePrecision('weight').notNull(),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tag.id),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [uniqueIndex('course_exam_domain_uq').on(t.courseId, t.key)],
);

export const chapter = pgTable(
  'chapter',
  {
    id: serial('id').primaryKey(),
    courseId: integer('course_id')
      .notNull()
      .references(() => course.id),
    parentId: integer('parent_id').references((): AnyPgColumn => chapter.id),
    /** Folder path inside the course, e.g. "01-meetings" or "01-basics/02-numbers". */
    key: text('key').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    sort: integer('sort').notNull().default(0),
    status: text('status').$type<EntityStatus>().notNull().default('active'),
    contentHash: text('content_hash'),
    ...audit,
  },
  (t) => [uniqueIndex('chapter_course_key_uq').on(t.courseId, t.key)],
);

export const lesson = pgTable(
  'lesson',
  {
    id: serial('id').primaryKey(),
    courseId: integer('course_id')
      .notNull()
      .references(() => course.id),
    chapterId: integer('chapter_id')
      .notNull()
      .references(() => chapter.id),
    /** "<chapter key>/<file stem>", unique within the course. */
    key: text('key').notNull(),
    title: text('title').notNull(),
    summary: text('summary'),
    bodyMd: text('body_md'),
    slidesHtml: text('slides_html'),
    videoUrl: text('video_url'),
    sort: integer('sort').notNull().default(0),
    status: text('status').$type<EntityStatus>().notNull().default('active'),
    contentHash: text('content_hash'),
    ...audit,
  },
  (t) => [uniqueIndex('lesson_course_key_uq').on(t.courseId, t.key), index('lesson_chapter_idx').on(t.chapterId)],
);

export const item = pgTable(
  'item',
  {
    id: serial('id').primaryKey(),
    subjectId: integer('subject_id')
      .notNull()
      .references(() => subject.id),
    key: text('key').notNull().unique(),
    kind: text('kind').$type<ItemKind>().notNull(),
    frontMd: text('front_md'),
    backMd: text('back_md'),
    pattern: text('pattern'),
    imageKey: text('image_key'),
    audioKey: text('audio_key'),
    /** The course whose file declares the item. */
    originCourseId: integer('origin_course_id').references(() => course.id),
    status: text('status').$type<EntityStatus>().notNull().default('active'),
    contentHash: text('content_hash'),
    ...audit,
  },
  (t) => [index('item_subject_kind_idx').on(t.subjectId, t.kind)],
);

export const itemVocab = pgTable(
  'item_vocab',
  {
    itemId: integer('item_id')
      .primaryKey()
      .references(() => item.id, { onDelete: 'cascade' }),
    term: text('term').notNull(),
    pronunciation: text('pronunciation'),
    pos: text('pos'),
    meaning: text('meaning').notNull(),
    definition: text('definition'),
  },
  (t) => [index('item_vocab_term_idx').on(sql`lower(${t.term})`)],
);

/** Extra accepted spellings/forms when typing a vocab term. */
export const itemAccept = pgTable(
  'item_accept',
  {
    id: serial('id').primaryKey(),
    itemId: integer('item_id')
      .notNull()
      .references(() => item.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [index('item_accept_item_idx').on(t.itemId)],
);

export const itemExample = pgTable(
  'item_example',
  {
    id: serial('id').primaryKey(),
    itemId: integer('item_id')
      .notNull()
      .references(() => item.id, { onDelete: 'cascade' }),
    /** Course whose file wrote the example; other courses fall back to it when they have none. */
    courseId: integer('course_id').references(() => course.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    translation: text('translation'),
    audioKey: text('audio_key'),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [index('item_example_item_idx').on(t.itemId)],
);

export const itemRelation = pgTable(
  'item_relation',
  {
    itemId: integer('item_id')
      .notNull()
      .references(() => item.id, { onDelete: 'cascade' }),
    relatedItemId: integer('related_item_id')
      .notNull()
      .references(() => item.id, { onDelete: 'cascade' }),
    type: text('type').$type<RelationType>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.relatedItemId, t.type] })],
);

export const itemTag = pgTable(
  'item_tag',
  {
    itemId: integer('item_id')
      .notNull()
      .references(() => item.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.tagId] }), index('item_tag_tag_idx').on(t.tagId)],
);

export const question = pgTable(
  'question',
  {
    id: serial('id').primaryKey(),
    /** "<item key>#<question id>" */
    key: text('key').notNull().unique(),
    itemId: integer('item_id')
      .notNull()
      .references(() => item.id),
    /** Set when the question is course_only. */
    courseId: integer('course_id').references(() => course.id),
    facet: text('facet').$type<Facet>().notNull(),
    type: text('type').$type<QuestionType>().notNull(),
    promptMd: text('prompt_md').notNull(),
    backMd: text('back_md'),
    explanationMd: text('explanation_md'),
    trueFalseAnswer: boolean('true_false_answer'),
    imageKey: text('image_key'),
    audioKey: text('audio_key'),
    difficulty: smallint('difficulty'),
    sort: integer('sort').notNull().default(0),
    status: text('status').$type<EntityStatus>().notNull().default('active'),
    contentHash: text('content_hash'),
    ...audit,
  },
  (t) => [index('question_item_facet_idx').on(t.itemId, t.facet)],
);

/**
 * Options keep their id while their text is unchanged, so answer statistics stay attached.
 * Options that disappear from content are archived, never deleted.
 */
export const questionOption = pgTable(
  'question_option',
  {
    id: serial('id').primaryKey(),
    questionId: integer('question_id')
      .notNull()
      .references(() => question.id),
    textMd: text('text_md').notNull(),
    isCorrect: boolean('is_correct').notNull().default(false),
    whyMd: text('why_md'),
    /** match questions: the right-hand side paired with this option. */
    matchMd: text('match_md'),
    /** Display order in content; for order questions this is the correct position. */
    sort: integer('sort').notNull().default(0),
    status: text('status').$type<EntityStatus>().notNull().default('active'),
    ...audit,
  },
  (t) => [uniqueIndex('question_option_text_uq').on(t.questionId, sql`md5(${t.textMd})`)],
);

/** Accepted answers: typing (blank 0) and cloze blanks (blank = cN). */
export const questionAnswer = pgTable(
  'question_answer',
  {
    id: serial('id').primaryKey(),
    questionId: integer('question_id')
      .notNull()
      .references(() => question.id, { onDelete: 'cascade' }),
    blank: integer('blank').notNull().default(0),
    text: text('text').notNull(),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [index('question_answer_question_idx').on(t.questionId)],
);

export const questionTag = pgTable(
  'question_tag',
  {
    questionId: integer('question_id')
      .notNull()
      .references(() => question.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.questionId, t.tagId] }), index('question_tag_tag_idx').on(t.tagId)],
);

/** Which items a course teaches, in course order, with the course's own note. */
export const courseItem = pgTable(
  'course_item',
  {
    id: serial('id').primaryKey(),
    courseId: integer('course_id')
      .notNull()
      .references(() => course.id, { onDelete: 'cascade' }),
    itemId: integer('item_id')
      .notNull()
      .references(() => item.id, { onDelete: 'cascade' }),
    sort: integer('sort').notNull(),
    noteMd: text('note_md'),
    via: text('via').$type<CourseItemVia>().notNull(),
    ...audit,
  },
  (t) => [uniqueIndex('course_item_uq').on(t.courseId, t.itemId), index('course_item_item_idx').on(t.itemId)],
);

export const lessonItem = pgTable(
  'lesson_item',
  {
    lessonId: integer('lesson_id')
      .notNull()
      .references(() => lesson.id, { onDelete: 'cascade' }),
    itemId: integer('item_id')
      .notNull()
      .references(() => item.id, { onDelete: 'cascade' }),
    sort: integer('sort').notNull(),
  },
  (t) => [primaryKey({ columns: [t.lessonId, t.itemId] }), index('lesson_item_item_idx').on(t.itemId)],
);

/** One row per source file: its stored key (a hash of the processed bytes), so sync skips unchanged files. */
export const mediaAsset = pgTable('media_asset', {
  sourceSha256: text('source_sha256').primaryKey(),
  key: text('key').notNull(),
  contentType: text('content_type').notNull(),
  bytes: integer('bytes').notNull(),
  storage: text('storage').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
});

// ---------------------------------------------------------------------------------------------
// Learner state
// ---------------------------------------------------------------------------------------------

/** Courses the learner has started; only these feed Daily. */
export const courseEnrollment = pgTable('course_enrollment', {
  courseId: integer('course_id')
    .primaryKey()
    .references(() => course.id, { onDelete: 'cascade' }),
  dailyEnabled: boolean('daily_enabled').notNull().default(true),
  /** Overrides the course policy's new_per_day. */
  newPerDay: integer('new_per_day'),
  ...audit,
});

/** Items the learner has read about (learn / skim). Read items are handed to Daily first. */
export const itemExposure = pgTable('item_exposure', {
  itemId: integer('item_id')
    .primaryKey()
    .references(() => item.id, { onDelete: 'cascade' }),
  firstSeenAt: ts('first_seen_at').notNull(),
  lastSeenAt: ts('last_seen_at').notNull(),
  seenCount: integer('seen_count').notNull().default(1),
});

/** Every answer, from any course and any mode. The single source of truth for memory. */
export const reviewLog = pgTable(
  'review_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    itemId: integer('item_id')
      .notNull()
      .references(() => item.id),
    facet: text('facet').$type<Facet>().notNull(),
    rating: smallint('rating').notNull(),
    reviewedAt: ts('reviewed_at').notNull(),
    mode: text('mode').$type<StudyMode>().notNull(),
    courseId: integer('course_id').references(() => course.id),
    sessionId: integer('session_id').references((): AnyPgColumn => studySession.id),
    questionId: integer('question_id').references(() => question.id),
    generator: text('generator'),
    correct: boolean('correct'),
    responseText: text('response_text'),
    timeMs: integer('time_ms'),
    hintUsed: boolean('hint_used').notNull().default(false),
    /** Idempotency key sent by the client (offline sync, double taps). */
    clientId: text('client_id').unique(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('review_log_item_facet_idx').on(t.itemId, t.facet, t.reviewedAt), index('review_log_time_idx').on(t.reviewedAt)],
);

export const reviewChoice = pgTable(
  'review_choice',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    reviewLogId: bigint('review_log_id', { mode: 'number' })
      .notNull()
      .references(() => reviewLog.id, { onDelete: 'cascade' }),
    sort: integer('sort').notNull().default(0),
    questionOptionId: integer('question_option_id').references(() => questionOption.id),
    /** match questions: the option whose right-hand side was paired with questionOptionId. */
    matchedOptionId: integer('matched_option_id').references(() => questionOption.id),
    /** Generated multiple choice: the item whose meaning was picked. */
    itemId: integer('item_id').references(() => item.id),
  },
  (t) => [index('review_choice_log_idx').on(t.reviewLogId), index('review_choice_option_idx').on(t.questionOptionId)],
);

/** Per-course memory state of one facet of one item: a projection of review_log. */
export const courseCard = pgTable(
  'course_card',
  {
    id: serial('id').primaryKey(),
    courseId: integer('course_id')
      .notNull()
      .references(() => course.id, { onDelete: 'cascade' }),
    itemId: integer('item_id')
      .notNull()
      .references(() => item.id, { onDelete: 'cascade' }),
    facet: text('facet').$type<Facet>().notNull(),
    state: smallint('state').notNull().default(0),
    due: ts('due').notNull(),
    stability: doublePrecision('stability').notNull().default(0),
    difficulty: doublePrecision('difficulty').notNull().default(0),
    elapsedDays: integer('elapsed_days').notNull().default(0),
    scheduledDays: integer('scheduled_days').notNull().default(0),
    learningSteps: integer('learning_steps').notNull().default(0),
    reps: integer('reps').notNull().default(0),
    lapses: integer('lapses').notNull().default(0),
    lastReview: ts('last_review'),
    leech: boolean('leech').notNull().default(false),
    ...audit,
  },
  (t) => [
    uniqueIndex('course_card_uq').on(t.courseId, t.itemId, t.facet),
    index('course_card_due_idx').on(t.courseId, t.state, t.due),
    index('course_card_item_idx').on(t.itemId, t.facet),
  ],
);

export const studySession = pgTable(
  'study_session',
  {
    id: serial('id').primaryKey(),
    mode: text('mode').$type<StudyMode>().notNull(),
    /** Null = every enrolled course (the global Daily). */
    courseId: integer('course_id').references(() => course.id),
    /** Local learning day (Daily only). */
    day: date('day', { mode: 'string' }),
    status: text('status').$type<SessionStatus>().notNull().default('active'),
    seed: integer('seed').notNull(),
    deadlineAt: ts('deadline_at'),
    submittedAt: ts('submitted_at'),
    scorePercent: doublePrecision('score_percent'),
    passed: boolean('passed'),
    ...audit,
  },
  (t) => [
    uniqueIndex('study_session_daily_uq')
      .on(t.day, sql`coalesce(${t.courseId}, 0)`)
      .where(sql`${t.mode} = 'daily'`),
  ],
);

/** What a session was built from: lessons, chapters, tags, items, or "weak". */
export const studySessionScope = pgTable(
  'study_session_scope',
  {
    sessionId: integer('session_id')
      .notNull()
      .references(() => studySession.id, { onDelete: 'cascade' }),
    scopeType: text('scope_type').notNull(),
    refKey: text('ref_key').notNull(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.scopeType, t.refKey] })],
);

export const studySessionCard = pgTable(
  'study_session_card',
  {
    id: serial('id').primaryKey(),
    sessionId: integer('session_id')
      .notNull()
      .references(() => studySession.id, { onDelete: 'cascade' }),
    sort: integer('sort').notNull(),
    /** The course this card is studied in (its schedule decides "next due" shown to the learner). */
    courseId: integer('course_id')
      .notNull()
      .references(() => course.id),
    itemId: integer('item_id')
      .notNull()
      .references(() => item.id),
    facet: text('facet').$type<Facet>().notNull(),
    questionId: integer('question_id').references(() => question.id),
    generator: text('generator'),
    /** Seeds option shuffling and distractor picks, so a resumed session renders the same. */
    seed: integer('seed').notNull(),
    isNew: boolean('is_new').notNull().default(false),
    /** Set on cards re-shown later in the session after a miss. */
    requeueOfId: integer('requeue_of_id').references((): AnyPgColumn => studySessionCard.id),
    status: text('status').$type<SessionCardStatus>().notNull().default('pending'),
    responseText: text('response_text'),
    correct: boolean('correct'),
    rating: smallint('rating'),
    timeMs: integer('time_ms'),
    hintUsed: boolean('hint_used').notNull().default(false),
    answeredAt: ts('answered_at'),
    reviewLogId: bigint('review_log_id', { mode: 'number' }).references(() => reviewLog.id),
    ...audit,
  },
  (t) => [index('study_session_card_session_idx').on(t.sessionId, t.sort)],
);

/** Exam answers waiting for submit (same shape as review_choice). */
export const studySessionCardChoice = pgTable(
  'study_session_card_choice',
  {
    id: serial('id').primaryKey(),
    sessionCardId: integer('session_card_id')
      .notNull()
      .references(() => studySessionCard.id, { onDelete: 'cascade' }),
    sort: integer('sort').notNull().default(0),
    questionOptionId: integer('question_option_id').references(() => questionOption.id),
    matchedOptionId: integer('matched_option_id').references(() => questionOption.id),
    itemId: integer('item_id').references(() => item.id),
  },
  (t) => [index('study_session_card_choice_card_idx').on(t.sessionCardId)],
);
