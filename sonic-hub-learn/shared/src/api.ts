import type { ClozeSegment } from './text.js';
import type {
  CardStateValue,
  Facet,
  Generator,
  ItemKind,
  NewOrder,
  QuestionType,
  RatingValue,
  RelationType,
  SourceType,
  StudyMode,
} from './enums.js';

/* REST contract of the learn API (shared by the API and the web app). */

// --- Catalog ----------------------------------------------------------------------------------

export interface SourceView {
  type: SourceType;
  name: string | null;
  author: string | null;
  publisher: string | null;
  edition: string | null;
  url: string | null;
}

export interface CourseCounts {
  items: number;
  cards: number;
  new: number;
  learning: number;
  review: number;
  /** Cards due before the current learning day ends. */
  dueToday: number;
  leeches: number;
}

export interface CourseSummary {
  key: string;
  title: string;
  description: string | null;
  isCollection: boolean;
  source: SourceView;
  tags: string[];
  enrolled: boolean;
  dailyEnabled: boolean;
  counts: CourseCounts;
}

export interface SubjectSummary {
  key: string;
  title: string;
  description: string | null;
  lang: string;
  courses: CourseSummary[];
}

export interface LessonSummary {
  id: number;
  key: string;
  title: string;
  summary: string | null;
  hasBody: boolean;
  hasSlides: boolean;
  hasVideo: boolean;
  itemCount: number;
}

export interface ChapterNode {
  key: string;
  title: string;
  description: string | null;
  lessons: LessonSummary[];
  children: ChapterNode[];
}

export interface ExamConfigView {
  questions: number;
  minutes: number;
  passPercent: number;
  domains: { key: string; title: string; weight: number; tag: string }[];
}

export interface CourseDetail extends CourseSummary {
  subject: { key: string; title: string; lang: string; themeCss: string | null };
  policy: {
    algorithm: string;
    retention: number;
    /** Effective value (enrollment override or course policy). */
    newPerDay: number;
    maxReviewsPerDay: number;
    newOrder: NewOrder;
    facets: Facet[];
    examDate: string | null;
  };
  exam: ExamConfigView | null;
  chapters: ChapterNode[];
}

export interface VocabView {
  term: string;
  pronunciation: string | null;
  pos: string | null;
  meaning: string;
  definition: string | null;
}

export interface ExampleView {
  /** Plain sentence (cloze markers filled in). */
  text: string;
  /** Markdown with the cloze answers in bold. */
  textMd: string;
  translation: string | null;
  audioUrl: string | null;
  /** True when the example was written for the course being viewed. */
  ownCourse: boolean;
}

export interface MemoryView {
  courseKey: string;
  facet: Facet;
  state: CardStateValue;
  due: string;
  stability: number;
  reps: number;
  lapses: number;
  retrievability: number;
  leech: boolean;
}

export interface ItemView {
  key: string;
  kind: ItemKind;
  frontMd: string | null;
  backMd: string | null;
  pattern: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  speak: SpeakView | null;
  vocab: VocabView | null;
  accepts: string[];
  examples: ExampleView[];
  /** The viewed course's note for this item. */
  noteMd: string | null;
  tags: string[];
  related: { key: string; type: RelationType; label: string }[];
  memory: MemoryView[];
}

export interface LessonDetail {
  id: number;
  key: string;
  title: string;
  summary: string | null;
  bodyMd: string | null;
  slidesHtml: string | null;
  videoUrl: string | null;
  course: { key: string; title: string };
  chapter: { key: string; title: string };
  themeCss: string | null;
  items: ItemView[];
}

export interface SearchResult {
  items: { key: string; kind: ItemKind; label: string; detail: string | null; courses: string[] }[];
  lessons: { id: number; title: string; courseKey: string; courseTitle: string }[];
}

// --- Study ------------------------------------------------------------------------------------

/** Text for the browser's speech synthesis when there is no recorded audio. */
export interface SpeakView {
  text: string;
  lang: string;
}

export interface OptionView {
  /** "o<option id>" for authored options, "i<item id>" for generated ones. */
  id: string;
  textMd: string;
}

export interface QuestionView {
  facet: Facet;
  /** How to answer it. */
  type: QuestionType;
  source: 'authored' | 'generated';
  generator: Generator | null;
  questionKey: string | null;
  promptMd: string | null;
  /** Extra line under the prompt, e.g. the translation of a cloze sentence. */
  hintMd: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  speak: SpeakView | null;
  /** Generated vocab questions: the fields to show (others are hidden on purpose). */
  vocab: Partial<VocabView> | null;
  options: OptionView[] | null;
  /** match: the right-hand column, shuffled ("m<option id>"). */
  matchTargets: OptionView[] | null;
  /** multi: how many options are correct. */
  multiCount: number | null;
  cloze: { segments: ClozeSegment[]; blanks: number[] } | null;
  typingHint: { firstLetter: string; length: number } | null;
  /** flashcard: front and back; the learner grades themselves. */
  flashcard: { frontMd: string; backMd: string } | null;
}

export interface AnswerFeedback {
  correctOptionIds: string[] | null;
  acceptedAnswers: string[] | null;
  blankAnswers: Record<string, string[]> | null;
  correctOrder: string[] | null;
  /** match: option id → target id */
  correctPairs: Record<string, string> | null;
  trueFalseAnswer: boolean | null;
  explanationMd: string | null;
  /** Why each option is right or wrong. */
  optionWhys: Record<string, string> | null;
  /** The item at a glance (meaning, back of the card). */
  summaryMd: string | null;
}

export interface CardMemory {
  due: string;
  state: CardStateValue;
  stability: number;
  reps: number;
  lapses: number;
}

export interface SessionCardView {
  id: number;
  sort: number;
  status: 'pending' | 'saved' | 'answered';
  courseKey: string;
  itemKey: string;
  itemKind: ItemKind;
  facet: Facet;
  isNew: boolean;
  isRequeue: boolean;
  question: QuestionView;
  outcome: { correct: boolean | null; rating: RatingValue | null } | null;
  /** Shown once answered (after submit, for exams). */
  feedback: AnswerFeedback | null;
}

export interface ExamDomainResult {
  key: string;
  title: string;
  total: number;
  correct: number;
  percent: number;
}

export interface ExamResult {
  total: number;
  answered: number;
  correct: number;
  percent: number;
  passPercent: number;
  passed: boolean;
  domains: ExamDomainResult[];
}

export interface SessionView {
  id: number;
  mode: StudyMode;
  course: { key: string; title: string } | null;
  day: string | null;
  status: 'active' | 'submitted' | 'completed';
  deadlineAt: string | null;
  createdAt: string;
  progress: { total: number; answered: number; correct: number; remaining: number };
  cards: SessionCardView[];
  exam: ExamResult | null;
}

export interface SessionScopeInput {
  lessonIds?: number[];
  chapterKeys?: string[];
  tags?: string[];
  itemKeys?: string[];
  /** Only items the learner keeps getting wrong. */
  weak?: boolean;
}

export interface CreateSessionInput {
  mode: Exclude<StudyMode, 'daily'>;
  /** Omit for every enrolled course. Required for exam. */
  courseKey?: string;
  scope?: SessionScopeInput;
  facets?: Facet[];
  size?: number;
}

export interface AnswerInput {
  sessionCardId: number;
  /** single / multi */
  optionIds?: string[];
  /** true_false */
  value?: boolean;
  /** typing */
  text?: string;
  /** cloze: blank index → typed text */
  blanks?: Record<string, string>;
  /** order: option ids in the chosen order */
  order?: string[];
  /** match: option id → target id */
  pairs?: Record<string, string>;
  /** flashcard: self grade */
  rating?: RatingValue;
  timeMs?: number;
  hintUsed?: boolean;
  /** Idempotency key. */
  clientId?: string;
}

export interface AnswerResult {
  sessionCardId: number;
  /** Exams only save the answer until submit. */
  saved: boolean;
  correct: boolean | null;
  typo: boolean;
  rating: RatingValue | null;
  feedback: AnswerFeedback | null;
  /** The card's schedule in the course it was studied in. */
  memory: CardMemory | null;
  /** Re-shown later in this session after a miss. */
  requeuedCardId: number | null;
  sessionStatus: SessionView['status'];
}

export interface EnrollmentInput {
  enrolled: boolean;
  dailyEnabled?: boolean;
  newPerDay?: number | null;
}

// --- Stats ------------------------------------------------------------------------------------

export interface StatsView {
  day: string;
  today: { reviewed: number; correct: number; dueRemaining: number };
  cards: { new: number; learning: number; review: number; relearning: number };
  /** Share of correct answers over the last 30 days (reviews of already-learned cards). */
  retention30d: number | null;
  reviewsByDay: { day: string; reviews: number; correct: number }[];
  streakDays: number;
  leeches: number;
}

export interface LeechView {
  courseKey: string;
  itemKey: string;
  kind: ItemKind;
  label: string;
  facet: Facet;
  lapses: number;
  againCount: number;
}
