import {
  parseCloze,
  normalizeAnswer,
  type AnswerFeedback,
  type ClozeSegment,
  type Facet,
  type Generator,
  type OptionView,
  type QuestionView,
  type SpeakView,
} from '@learn/shared';
import { rng, shuffled } from '../common/util.js';
import type { MediaUrls } from '../common/tokens.js';
import type { ExampleData, ItemData, QuestionData, VocabLite } from './loaders.js';

/*
 * Builds what the learner sees for one session card, plus the answer key used to grade it.
 * Everything random (option order, distractors, which example) comes from the card's seed,
 * so a session renders identically every time it is opened.
 */

export type AnswerKey =
  | { kind: 'choice'; multi: boolean; correct: string[]; known: string[] }
  | { kind: 'true_false'; value: boolean }
  | { kind: 'typing'; accepted: string[] }
  | { kind: 'cloze'; blanks: Record<string, string[]> }
  | { kind: 'order'; order: string[] }
  | { kind: 'match'; pairs: Record<string, string> }
  | { kind: 'flashcard' };

export interface BuiltQuestion {
  view: QuestionView;
  key: AnswerKey;
  feedback: AnswerFeedback;
  /** Characters to read, for judging slow answers. */
  promptChars: number;
}

export interface BuildInput {
  courseId: number;
  facet: Facet;
  questionId: number | null;
  generator: Generator | null;
  seed: number;
  item: ItemData;
  question: QuestionData | null;
  /** Vocab of the item's subject, for distractors. */
  pool: VocabLite[];
  urls: MediaUrls;
}

/** Examples written for this course first, then the rest. */
export function examplesFor(item: ItemData, courseId: number | null): ExampleData[] {
  const own = item.examples.filter((e) => e.courseId === courseId);
  const rest = item.examples.filter((e) => e.courseId !== courseId);
  return [...own, ...rest];
}

/** Cloze markers replaced by their canonical answer in bold. */
export function boldCloze(text: string): string {
  return text.replace(/\{\{c\d+::(.*?)(?:::.*?)?\}\}/g, (_, a: string) => `**${a.split('|')[0].trim()}**`);
}

export function plainCloze(text: string): string {
  return parseCloze(text).full;
}

export function speakFor(item: ItemData): SpeakView | null {
  return item.vocab ? { text: item.vocab.term, lang: item.lang } : null;
}

/** The item at a glance, shown after answering and on the back of flashcards. */
export function itemSummaryMd(item: ItemData, courseId: number | null, urls: MediaUrls): string {
  const ex = examplesFor(item, courseId)[0];
  const example = ex ? `\n\n> ${boldCloze(ex.text)}${ex.translation ? `  \n> _${ex.translation}_` : ''}` : '';
  if (item.vocab) {
    const v = item.vocab;
    const head = [`**${v.term}**`, v.pronunciation, v.pos ? `_${v.pos}_` : null].filter(Boolean).join(' ');
    return `${head}\n\n${v.meaning}${v.definition ? `  \n_${v.definition}_` : ''}${example}`;
  }
  const pattern = item.pattern ? `\n\n\`${item.pattern}\`` : '';
  return `**${urls.text(item.frontMd) ?? ''}**\n\n${urls.text(item.backMd) ?? ''}${pattern}${example}`;
}

function emptyFeedback(summaryMd: string): AnswerFeedback {
  return {
    correctOptionIds: null,
    acceptedAnswers: null,
    blankAnswers: null,
    correctOrder: null,
    correctPairs: null,
    trueFalseAnswer: null,
    explanationMd: null,
    optionWhys: null,
    summaryMd,
  };
}

function baseView(input: BuildInput, source: QuestionView['source']): QuestionView {
  return {
    facet: input.facet,
    type: 'flashcard',
    source,
    generator: input.generator,
    questionKey: input.question?.key ?? null,
    promptMd: null,
    hintMd: null,
    imageUrl: null,
    audioUrl: null,
    speak: null,
    vocab: null,
    options: null,
    matchTargets: null,
    multiCount: null,
    cloze: null,
    typingHint: null,
    flashcard: null,
  };
}

function clozeBlanks(text: string, extra: string[] = []): Record<string, string[]> {
  const blanks: Record<string, string[]> = {};
  const parsed = parseCloze(text);
  for (const b of parsed.blanks) blanks[String(b.index)] = [...b.answers, ...(parsed.blanks.length === 1 ? extra : [])];
  return blanks;
}

function resolveSegments(segments: ClozeSegment[], urls: MediaUrls): ClozeSegment[] {
  return segments.map((s) => ('text' in s ? { text: urls.text(s.text) ?? '' } : s));
}

function correctAnswerMd(q: QuestionData, urls: MediaUrls): string {
  switch (q.type) {
    case 'single':
    case 'multi':
      return q.options
        .filter((o) => o.isCorrect)
        .map((o) => `- ${urls.text(o.textMd)}`)
        .join('\n');
    case 'true_false':
      return q.trueFalseAnswer ? '**True**' : '**False**';
    case 'typing':
      return `**${q.answers[0]?.text ?? ''}**`;
    case 'cloze':
      return urls.text(boldCloze(q.promptMd)) ?? '';
    case 'order':
      return q.options.map((o, i) => `${i + 1}. ${urls.text(o.textMd)}`).join('\n');
    case 'match':
      return q.options.map((o) => `- ${urls.text(o.textMd)} → **${urls.text(o.matchMd)}**`).join('\n');
    case 'flashcard':
      return urls.text(q.backMd) ?? '';
  }
}

/** A distractor-backed multiple choice of meanings; null when the subject has too few words. */
function meaningChoices(item: ItemData, pool: VocabLite[], random: () => number) {
  const v = item.vocab!;
  const own = normalizeAnswer(v.meaning);
  const term = normalizeAnswer(v.term);
  const usable = pool.filter((p) => p.itemId !== item.id && normalizeAnswer(p.meaning) !== own && normalizeAnswer(p.term) !== term);
  const samePos = shuffled(
    usable.filter((p) => (p.pos ?? '') === (v.pos ?? '')),
    random,
  );
  const otherPos = shuffled(
    usable.filter((p) => (p.pos ?? '') !== (v.pos ?? '')),
    random,
  );
  const picked: VocabLite[] = [];
  const meanings = new Set([own]);
  for (const p of [...samePos, ...otherPos]) {
    const m = normalizeAnswer(p.meaning);
    if (meanings.has(m)) continue;
    meanings.add(m);
    picked.push(p);
    if (picked.length === 3) break;
  }
  if (!picked.length) return null;
  const correctId = `i${item.id}`;
  const options: OptionView[] = shuffled(
    [{ id: correctId, textMd: v.meaning }, ...picked.map((p) => ({ id: `i${p.itemId}`, textMd: p.meaning }))],
    random,
  );
  const whys: Record<string, string> = {};
  for (const p of picked) whys[`i${p.itemId}`] = `**${p.term}**`;
  return { options, correctId, whys };
}

function itemFlashcard(input: BuildInput, summaryMd: string): BuiltQuestion {
  const { item, urls } = input;
  const view = baseView(input, 'generated');
  view.generator = 'flashcard';
  let front: string;
  let back = summaryMd;
  if (item.vocab) {
    const v = item.vocab;
    view.speak = speakFor(item);
    view.audioUrl = urls.url(item.audioKey);
    switch (input.facet) {
      case 'recall':
        front = `${v.meaning}${v.pos ? ` _(${v.pos})_` : ''}`;
        view.vocab = { meaning: v.meaning, pos: v.pos };
        view.imageUrl = urls.url(item.imageKey);
        break;
      case 'use': {
        const ex = examplesFor(item, input.courseId).find((e) => e.text.includes('{{c'));
        front = ex ? `${ex.text.replace(/\{\{c\d+::.*?\}\}/g, '_____')}${ex.translation ? `  \n_${ex.translation}_` : ''}` : v.meaning;
        if (ex) back = `${boldCloze(ex.text)}\n\n---\n\n${summaryMd}`;
        break;
      }
      case 'listen':
        front = '';
        view.vocab = {};
        break;
      default:
        front = [`**${v.term}**`, v.pronunciation].filter(Boolean).join('  \n');
        view.vocab = { term: v.term, pronunciation: v.pronunciation, pos: v.pos };
    }
  } else if (input.question) {
    front = urls.text(input.question.promptMd) ?? '';
    back = `${correctAnswerMd(input.question, urls)}${input.question.explanationMd ? `\n\n${urls.text(input.question.explanationMd)}` : ''}`;
    view.questionKey = input.question.key;
    view.imageUrl = urls.url(input.question.imageKey);
  } else {
    front = urls.text(item.frontMd) ?? '';
    back = `${urls.text(item.backMd) ?? ''}${item.pattern ? `\n\n\`${item.pattern}\`` : ''}`;
    view.imageUrl = urls.url(item.imageKey);
  }
  view.type = 'flashcard';
  view.flashcard = { frontMd: front, backMd: back };
  return { view, key: { kind: 'flashcard' }, feedback: emptyFeedback(summaryMd), promptChars: front.length };
}

function authoredQuestion(input: BuildInput, q: QuestionData, summaryMd: string, random: () => number): BuiltQuestion {
  const { urls } = input;
  const view = baseView(input, 'authored');
  view.type = q.type;
  view.promptMd = q.type === 'cloze' ? null : urls.text(q.promptMd);
  view.imageUrl = urls.url(q.imageKey);
  view.audioUrl = urls.url(q.audioKey);
  const feedback = emptyFeedback(summaryMd);
  feedback.explanationMd = urls.text(q.explanationMd);
  const promptChars = q.promptMd.length + q.options.reduce((n, o) => n + o.textMd.length, 0);
  let key: AnswerKey;

  switch (q.type) {
    case 'single':
    case 'multi': {
      view.options = shuffled(q.options, random).map((o) => ({ id: `o${o.id}`, textMd: urls.text(o.textMd) ?? '' }));
      const correct = q.options.filter((o) => o.isCorrect).map((o) => `o${o.id}`);
      if (q.type === 'multi') view.multiCount = correct.length;
      key = { kind: 'choice', multi: q.type === 'multi', correct, known: view.options.map((o) => o.id) };
      feedback.correctOptionIds = correct;
      feedback.optionWhys = Object.fromEntries(q.options.filter((o) => o.whyMd).map((o) => [`o${o.id}`, urls.text(o.whyMd) ?? '']));
      break;
    }
    case 'true_false':
      key = { kind: 'true_false', value: !!q.trueFalseAnswer };
      feedback.trueFalseAnswer = !!q.trueFalseAnswer;
      break;
    case 'typing': {
      const accepted = q.answers.filter((a) => a.blank === 0).map((a) => a.text);
      const first = accepted[0] ?? '';
      view.typingHint = { firstLetter: first.slice(0, 1), length: first.length };
      key = { kind: 'typing', accepted };
      feedback.acceptedAnswers = accepted;
      break;
    }
    case 'cloze': {
      const parsed = parseCloze(q.promptMd);
      view.cloze = { segments: resolveSegments(parsed.segments, urls), blanks: parsed.blanks.map((b) => b.index) };
      const blanks: Record<string, string[]> = {};
      for (const a of q.answers) (blanks[String(a.blank)] ??= []).push(a.text);
      key = { kind: 'cloze', blanks: Object.keys(blanks).length ? blanks : clozeBlanks(q.promptMd) };
      feedback.blankAnswers = key.blanks;
      break;
    }
    case 'order': {
      const order = q.options.map((o) => `o${o.id}`);
      let shown = shuffled(q.options, random);
      if (shown.length > 1 && shown.every((o, i) => o.id === q.options[i].id)) shown = [...shown.slice(1), shown[0]];
      view.options = shown.map((o) => ({ id: `o${o.id}`, textMd: urls.text(o.textMd) ?? '' }));
      key = { kind: 'order', order };
      feedback.correctOrder = order;
      break;
    }
    case 'match': {
      view.options = shuffled(q.options, random).map((o) => ({ id: `o${o.id}`, textMd: urls.text(o.textMd) ?? '' }));
      view.matchTargets = shuffled(q.options, random).map((o) => ({ id: `m${o.id}`, textMd: urls.text(o.matchMd) ?? '' }));
      const pairs = Object.fromEntries(q.options.map((o) => [`o${o.id}`, `m${o.id}`]));
      key = { kind: 'match', pairs };
      feedback.correctPairs = pairs;
      break;
    }
    case 'flashcard':
      view.flashcard = { frontMd: urls.text(q.promptMd) ?? '', backMd: urls.text(q.backMd) ?? '' };
      view.promptMd = null;
      key = { kind: 'flashcard' };
      break;
  }
  return { view, key, feedback, promptChars };
}

export function buildQuestion(input: BuildInput): BuiltQuestion {
  const random = rng(input.seed);
  const { item, question, urls } = input;
  const summaryMd = itemSummaryMd(item, input.courseId, urls);

  if (question) {
    if (input.generator === 'flashcard') return itemFlashcard(input, summaryMd);
    return authoredQuestion(input, question, summaryMd, random);
  }
  if (!item.vocab || input.generator === 'flashcard' || !input.generator) return itemFlashcard(input, summaryMd);

  const v = item.vocab;
  const view = baseView(input, 'generated');
  const feedback = emptyFeedback(summaryMd);
  switch (input.generator) {
    case 'vocab-recognize':
    case 'vocab-listen': {
      const choices = meaningChoices(item, input.pool, random);
      if (!choices) return itemFlashcard(input, summaryMd);
      view.type = 'single';
      view.options = choices.options;
      view.speak = speakFor(item);
      view.audioUrl = urls.url(item.audioKey);
      if (input.generator === 'vocab-recognize') view.vocab = { term: v.term, pronunciation: v.pronunciation, pos: v.pos };
      else view.vocab = {};
      feedback.correctOptionIds = [choices.correctId];
      feedback.optionWhys = choices.whys;
      const known = choices.options.map((o) => o.id);
      return { view, key: { kind: 'choice', multi: false, correct: [choices.correctId], known }, feedback, promptChars: 40 };
    }
    case 'vocab-recall': {
      const accepted = [v.term, ...item.accepts];
      view.type = 'typing';
      view.vocab = { meaning: v.meaning, pos: v.pos };
      view.imageUrl = urls.url(item.imageKey);
      view.typingHint = { firstLetter: v.term.slice(0, 1), length: v.term.length };
      feedback.acceptedAnswers = accepted;
      return { view, key: { kind: 'typing', accepted }, feedback, promptChars: v.meaning.length };
    }
    case 'vocab-use': {
      const withCloze = examplesFor(item, input.courseId).filter((e) => e.text.includes('{{c'));
      const own = withCloze.filter((e) => e.courseId === input.courseId);
      const pickFrom = own.length ? own : withCloze;
      if (!pickFrom.length) return itemFlashcard(input, summaryMd);
      const ex = pickFrom[Math.floor(random() * pickFrom.length)];
      const parsed = parseCloze(ex.text);
      view.type = 'cloze';
      view.cloze = { segments: parsed.segments, blanks: parsed.blanks.map((b) => b.index) };
      view.hintMd = ex.translation;
      view.speak = { text: parsed.full, lang: item.lang };
      const extra = parsed.blanks.length === 1 && normalizeAnswer(parsed.blanks[0].answers[0]) === normalizeAnswer(v.term) ? item.accepts : [];
      const blanks = clozeBlanks(ex.text, extra);
      feedback.blankAnswers = blanks;
      return { view, key: { kind: 'cloze', blanks }, feedback, promptChars: ex.text.length };
    }
  }
  return itemFlashcard(input, summaryMd);
}
