import { createEmptyCard, fsrs, Rating, type Card, type FSRS, type Grade, State } from 'ts-fsrs';
import { daysUntil, type DayClock } from '../common/time.js';

/** The parts of a course policy that shape a card's schedule. */
export interface SchedulePolicy {
  algorithm: string;
  retention: number;
  examDate: string | null;
}

/** Memory state columns of course_card. */
export interface CardFields {
  state: number;
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  lastReview: Date | null;
}

export interface ReviewEvent {
  rating: number;
  reviewedAt: Date;
}

/** Wrong answers (Again) on one facet before it is flagged for rewriting. */
export const LEECH_AGAIN_COUNT = 6;
/** A later facet opens in Daily once the previous facet's stability reaches this many days. */
export const LADDER_MIN_STABILITY_DAYS = 7;

const MAX_INTERVAL_DAYS = 36500;
const schedulers = new Map<string, FSRS>();

/** FSRS configured for a course; an exam date caps intervals so every card comes up before the exam. */
export function schedulerFor(policy: SchedulePolicy, at: Date, clock: DayClock): FSRS {
  let maxInterval = MAX_INTERVAL_DAYS;
  if (policy.examDate) {
    const days = daysUntil(policy.examDate, at, clock);
    if (days >= 1) maxInterval = days;
  }
  const key = `${policy.algorithm}|${policy.retention}|${maxInterval}`;
  let f = schedulers.get(key);
  if (!f) {
    f = fsrs({ request_retention: policy.retention, maximum_interval: maxInterval, enable_fuzz: true, enable_short_term: true });
    schedulers.set(key, f);
  }
  return f;
}

export function toCard(fields: CardFields): Card {
  return {
    due: fields.due,
    stability: fields.stability,
    difficulty: fields.difficulty,
    elapsed_days: fields.elapsedDays,
    scheduled_days: fields.scheduledDays,
    learning_steps: fields.learningSteps,
    reps: fields.reps,
    lapses: fields.lapses,
    state: fields.state as State,
    last_review: fields.lastReview ?? undefined,
  };
}

export function fromCard(card: Card): CardFields {
  return {
    state: card.state,
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    lastReview: card.last_review ?? null,
  };
}

export function emptyCard(at: Date): CardFields {
  return fromCard(createEmptyCard(at));
}

/** Applies one answer to a card under a course's policy. */
export function applyRating(fields: CardFields, rating: number, at: Date, policy: SchedulePolicy, clock: DayClock): CardFields {
  const f = schedulerFor(policy, at, clock);
  return fromCard(f.next(toCard(fields), at, rating as Grade).card);
}

/** Rebuilds a card from the full answer history (oldest first) under a course's policy. */
export function replay(reviews: readonly ReviewEvent[], policy: SchedulePolicy, now: Date, clock: DayClock): CardFields {
  if (!reviews.length) return emptyCard(now);
  let fields = emptyCard(reviews[0].reviewedAt);
  for (const r of reviews) fields = applyRating(fields, r.rating, r.reviewedAt, policy, clock);
  return fields;
}

/** When the card would be due next for each grade (shown under flashcard self-grade buttons). */
export function previewDue(fields: CardFields, at: Date, policy: SchedulePolicy, clock: DayClock): Record<1 | 2 | 3 | 4, Date> {
  const preview = schedulerFor(policy, at, clock).repeat(toCard(fields), at);
  return {
    1: preview[Rating.Again].card.due,
    2: preview[Rating.Hard].card.due,
    3: preview[Rating.Good].card.due,
    4: preview[Rating.Easy].card.due,
  };
}

/** Probability of recalling the card right now (1 for cards never reviewed). */
export function retrievability(fields: CardFields, at: Date, policy: SchedulePolicy, clock: DayClock): number {
  if (fields.state === State.New) return 1;
  return schedulerFor(policy, at, clock).get_retrievability(toCard(fields), at, false);
}
