import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Rating, type AnswerInput, type AnswerResult, type CardMemory, type Generator, type RatingValue, type SessionView, type StudyMode } from '@learn/shared';
import { and, asc, eq, gte, inArray, sql } from 'drizzle-orm';
import { MediaUrls } from '../common/tokens.js';
import { deriveSeed, rng } from '../common/util.js';
import { DB, type Db, type DbExecutor } from '../db/db.js';
import {
  courseCard,
  reviewChoice,
  reviewLog,
  studySession,
  studySessionCard,
  studySessionCardChoice,
} from '../db/schema.js';
import { loadCandidates, loadItems, loadUsage } from './loaders.js';
import { applyReviewToCourses, type CourseCardRow } from './projection.js';
import { AnswerShapeError, autoRating, grade, type ChoiceRecord, type Graded } from './grader.js';
import { renderCards } from './render.js';
import { pickQuestion } from './selection.js';
import { StudyService } from './study.service.js';

/** A missed card comes back this many cards later, at most this many times. */
const REQUEUE_GAP = 6;
const MAX_REQUEUES = 2;
/** Grace period after an exam deadline for answers already in flight. */
const EXAM_GRACE_MS = 60_000;

type SessionCardRow = typeof studySessionCard.$inferSelect;

function memoryOf(card: CourseCardRow | undefined): CardMemory | null {
  if (!card) return null;
  return {
    due: card.due.toISOString(),
    state: card.state as CardMemory['state'],
    stability: card.stability,
    reps: card.reps,
    lapses: card.lapses,
  };
}

@Injectable()
export class AnswerService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(MediaUrls) private readonly urls: MediaUrls,
    @Inject(StudyService) private readonly study: StudyService,
  ) {}

  async answer(sessionId: number, input: AnswerInput, now = new Date()): Promise<AnswerResult> {
    return this.db.transaction(async (tx) => {
      const session = await this.study.sessionRow(sessionId, tx);
      const [card] = await tx
        .select()
        .from(studySessionCard)
        .where(and(eq(studySessionCard.id, input.sessionCardId), eq(studySessionCard.sessionId, sessionId)));
      if (!card) throw new NotFoundException(`card ${input.sessionCardId} is not part of session ${sessionId}`);

      if (input.clientId) {
        const [prior] = await tx.select().from(reviewLog).where(eq(reviewLog.clientId, input.clientId));
        if (prior) return this.replayResult(tx, session.status, card, prior.id);
      }
      if (session.status !== 'active') throw new ConflictException(`session is ${session.status}`);
      if (card.status === 'answered') throw new ConflictException('card already answered');

      const { built } = await renderCards(tx, this.urls, [card]);
      const b = built.get(card.id);
      if (!b) throw new NotFoundException('card content is gone');
      let graded: Graded;
      try {
        graded = grade(b.key, input);
      } catch (e) {
        if (e instanceof AnswerShapeError) throw new BadRequestException(e.message);
        throw e;
      }

      if (session.mode === 'exam') {
        if (session.deadlineAt && now.getTime() > session.deadlineAt.getTime() + EXAM_GRACE_MS)
          throw new ConflictException('time is up — submit the exam');
        await tx
          .update(studySessionCard)
          .set({ status: 'saved', correct: graded.correct, responseText: graded.responseText, timeMs: input.timeMs ?? null, answeredAt: now })
          .where(eq(studySessionCard.id, card.id));
        await tx.delete(studySessionCardChoice).where(eq(studySessionCardChoice.sessionCardId, card.id));
        if (graded.choices.length) await tx.insert(studySessionCardChoice).values(graded.choices.map((c) => ({ sessionCardId: card.id, ...c })));
        return {
          sessionCardId: card.id,
          saved: true,
          correct: null,
          typo: false,
          rating: null,
          feedback: null,
          memory: null,
          requeuedCardId: null,
          sessionStatus: session.status,
        };
      }

      const [current] = await tx
        .select()
        .from(courseCard)
        .where(and(eq(courseCard.courseId, card.courseId), eq(courseCard.itemId, card.itemId), eq(courseCard.facet, card.facet)));
      const rating: RatingValue =
        b.key.kind === 'flashcard'
          ? input.rating!
          : autoRating({ graded, type: b.view.type, promptChars: b.promptChars, hintUsed: input.hintUsed, timeMs: input.timeMs, card: current });

      const updated = await this.logAndApply(tx, {
        card,
        mode: session.mode,
        sessionId,
        rating,
        graded,
        now,
        timeMs: input.timeMs ?? null,
        hintUsed: !!input.hintUsed,
        clientId: input.clientId ?? null,
      });

      let requeuedCardId: number | null = null;
      if (rating === Rating.Again) requeuedCardId = await this.requeue(tx, session.mode, card, now);
      const status = await this.completeIfDone(tx, sessionId, session.status);

      return {
        sessionCardId: card.id,
        saved: false,
        correct: graded.correct,
        typo: graded.typo,
        rating,
        feedback: b.feedback,
        memory: memoryOf(updated.get(card.courseId)),
        requeuedCardId,
        sessionStatus: status,
      };
    });
  }

  /** Grades every saved exam answer, logs them as reviews and closes the exam. */
  async submit(sessionId: number, now = new Date()): Promise<SessionView> {
    await this.db.transaction(async (tx) => {
      const session = await this.study.sessionRow(sessionId, tx);
      if (session.mode !== 'exam') throw new BadRequestException('only exams are submitted');
      if (session.status !== 'active') throw new ConflictException(`session is ${session.status}`);
      const cards = await tx.select().from(studySessionCard).where(eq(studySessionCard.sessionId, sessionId)).orderBy(asc(studySessionCard.sort));
      const saved = cards
        .filter((c) => c.status === 'saved')
        .sort((a, b) => (a.answeredAt?.getTime() ?? 0) - (b.answeredAt?.getTime() ?? 0));
      const choices = saved.length
        ? await tx.select().from(studySessionCardChoice).where(inArray(studySessionCardChoice.sessionCardId, saved.map((c) => c.id)))
        : [];
      for (const card of saved) {
        const graded: Graded = {
          correct: !!card.correct,
          typo: false,
          responseText: card.responseText,
          choices: choices
            .filter((c) => c.sessionCardId === card.id)
            .map((c): ChoiceRecord => ({ sort: c.sort, questionOptionId: c.questionOptionId, matchedOptionId: c.matchedOptionId, itemId: c.itemId })),
        };
        const rating: RatingValue = graded.correct ? Rating.Good : Rating.Again;
        await this.logAndApply(tx, {
          card,
          mode: 'exam',
          sessionId,
          rating,
          graded,
          now: card.answeredAt ?? now,
          timeMs: card.timeMs,
          hintUsed: false,
          clientId: null,
        });
      }
      await tx
        .update(studySessionCard)
        .set({ correct: false })
        .where(and(eq(studySessionCard.sessionId, sessionId), eq(studySessionCard.status, 'pending')));
      const correct = saved.filter((c) => c.correct).length;
      await tx
        .update(studySession)
        .set({ status: 'submitted', submittedAt: now, scorePercent: cards.length ? (correct / cards.length) * 100 : 0 })
        .where(eq(studySession.id, sessionId));
    });
    const view = await this.study.view(sessionId);
    if (view.exam) await this.db.update(studySession).set({ passed: view.exam.passed }).where(eq(studySession.id, sessionId));
    return view;
  }

  private async logAndApply(
    tx: DbExecutor,
    a: {
      card: SessionCardRow;
      mode: StudyMode;
      sessionId: number;
      rating: RatingValue;
      graded: Graded;
      now: Date;
      timeMs: number | null;
      hintUsed: boolean;
      clientId: string | null;
    },
  ): Promise<Map<number, CourseCardRow>> {
    const [log] = await tx
      .insert(reviewLog)
      .values({
        itemId: a.card.itemId,
        facet: a.card.facet,
        rating: a.rating,
        reviewedAt: a.now,
        mode: a.mode,
        courseId: a.card.courseId,
        sessionId: a.sessionId,
        questionId: a.card.questionId,
        generator: a.card.generator,
        correct: a.graded.correct,
        responseText: a.graded.responseText,
        timeMs: a.timeMs,
        hintUsed: a.hintUsed,
        clientId: a.clientId,
      })
      .returning({ id: reviewLog.id });
    if (a.graded.choices.length) await tx.insert(reviewChoice).values(a.graded.choices.map((c) => ({ reviewLogId: log.id, ...c })));
    const updated = await applyReviewToCourses(tx, { itemId: a.card.itemId, facet: a.card.facet, rating: a.rating, reviewedAt: a.now }, this.study.clock);
    await tx
      .update(studySessionCard)
      .set({
        status: 'answered',
        correct: a.graded.correct,
        rating: a.rating,
        responseText: a.graded.responseText,
        timeMs: a.timeMs,
        hintUsed: a.hintUsed,
        answeredAt: a.now,
        reviewLogId: log.id,
      })
      .where(eq(studySessionCard.id, a.card.id));
    return updated;
  }

  /** Shows a missed card again a few cards later, with a different question when there is one. */
  private async requeue(tx: DbExecutor, mode: StudyMode, card: SessionCardRow, now: Date): Promise<number | null> {
    const root = card.requeueOfId ?? card.id;
    const [{ n }] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(studySessionCard)
      .where(eq(studySessionCard.requeueOfId, root));
    if (n >= MAX_REQUEUES) return null;
    const [{ max }] = await tx
      .select({ max: sql<number>`max(${studySessionCard.sort})::int` })
      .from(studySessionCard)
      .where(eq(studySessionCard.sessionId, card.sessionId));
    const sort = Math.min(card.sort + REQUEUE_GAP + 1, max + 1);
    await tx
      .update(studySessionCard)
      .set({ sort: sql`${studySessionCard.sort} + 1` })
      .where(and(eq(studySessionCard.sessionId, card.sessionId), gte(studySessionCard.sort, sort)));

    const items = await loadItems(tx, [card.itemId]);
    const candidates = await loadCandidates(tx, [card.itemId]);
    const usage = await loadUsage(tx, [card.itemId]);
    const seed = deriveSeed(card.seed, n + 1);
    const chosen = pickQuestion(card, items.get(card.itemId)!, mode, candidates, usage, rng(seed), {
      questionId: card.questionId,
      generator: card.generator as Generator | null,
    });
    const [row] = await tx
      .insert(studySessionCard)
      .values({
        sessionId: card.sessionId,
        sort,
        courseId: card.courseId,
        itemId: card.itemId,
        facet: card.facet,
        questionId: chosen.questionId,
        generator: chosen.generator,
        seed,
        isNew: false,
        requeueOfId: root,
        createdAt: now,
      })
      .returning({ id: studySessionCard.id });
    return row.id;
  }

  private async completeIfDone(tx: DbExecutor, sessionId: number, status: SessionView['status']): Promise<SessionView['status']> {
    const [{ n }] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(studySessionCard)
      .where(and(eq(studySessionCard.sessionId, sessionId), eq(studySessionCard.status, 'pending')));
    if (n > 0) return status;
    await tx.update(studySession).set({ status: 'completed' }).where(eq(studySession.id, sessionId));
    return 'completed';
  }

  /** The same answer sent twice (same clientId): return what the first one produced. */
  private async replayResult(tx: DbExecutor, status: SessionView['status'], card: SessionCardRow, logId: number): Promise<AnswerResult> {
    const [answered] = await tx.select().from(studySessionCard).where(eq(studySessionCard.reviewLogId, logId));
    const target = answered ?? card;
    const { built } = await renderCards(tx, this.urls, [target]);
    const [mem] = await tx
      .select()
      .from(courseCard)
      .where(and(eq(courseCard.courseId, target.courseId), eq(courseCard.itemId, target.itemId), eq(courseCard.facet, target.facet)));
    const [requeued] = await tx
      .select({ id: studySessionCard.id })
      .from(studySessionCard)
      .where(eq(studySessionCard.requeueOfId, target.requeueOfId ?? target.id))
      .orderBy(asc(studySessionCard.id));
    return {
      sessionCardId: target.id,
      saved: false,
      correct: target.correct,
      typo: false,
      rating: (target.rating as RatingValue | null) ?? null,
      feedback: built.get(target.id)?.feedback ?? null,
      memory: memoryOf(mem),
      requeuedCardId: target.rating === Rating.Again ? (requeued?.id ?? null) : null,
      sessionStatus: status,
    };
  }
}
