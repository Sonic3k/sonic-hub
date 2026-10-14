import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  CreateSessionInput,
  ExamResult,
  RatingValue,
  SessionCardView,
  SessionView,
} from '@learn/shared';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import type { AppConfig } from '../config.js';
import { APP_CONFIG, clockOf, MediaUrls } from '../common/tokens.js';
import { learningDay, learningDayBounds, type DayClock } from '../common/time.js';
import { deriveSeed, randomSeed, rng } from '../common/util.js';
import { DB, type Db, type DbExecutor } from '../db/db.js';
import {
  course,
  courseEnrollment,
  studySession,
  studySessionCard,
  studySessionScope,
} from '../db/schema.js';
import { loadCandidates, loadItems, loadUsage } from './loaders.js';
import { renderCards, type Rendered } from './render.js';
import {
  domainOf,
  loadExamDomains,
  pickQuestion,
  policyRowOf,
  selectDaily,
  selectExam,
  selectScoped,
  type SelectedCard,
} from './selection.js';

type SessionRow = typeof studySession.$inferSelect;
type SessionCardRow = typeof studySessionCard.$inferSelect;

export function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === '23505' || err?.cause?.code === '23505';
}

@Injectable()
export class StudyService {
  readonly clock: DayClock;

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) config: AppConfig,
    @Inject(MediaUrls) private readonly urls: MediaUrls,
  ) {
    this.clock = clockOf(config);
  }

  private async courseByKey(key: string) {
    const [c] = await this.db.select().from(course).where(and(eq(course.key, key), eq(course.status, 'active')));
    if (!c) throw new NotFoundException(`course "${key}" not found`);
    return c;
  }

  /** Enrolled, active courses with Daily switched on. */
  private async dailyCourses() {
    const rows = await this.db
      .select({ course, override: courseEnrollment.newPerDay })
      .from(courseEnrollment)
      .innerJoin(course, eq(course.id, courseEnrollment.courseId))
      .where(and(eq(course.status, 'active'), eq(courseEnrollment.dailyEnabled, true)))
      .orderBy(asc(course.sort), asc(course.id));
    return rows.map((r) => ({ ...policyRowOf(r.course), newPerDayOverride: r.override }));
  }

  private async findDaily(day: string, courseId: number | null): Promise<SessionRow | undefined> {
    const [s] = await this.db
      .select()
      .from(studySession)
      .where(
        and(
          eq(studySession.mode, 'daily'),
          eq(studySession.day, day),
          courseId === null ? isNull(studySession.courseId) : eq(studySession.courseId, courseId),
        ),
      );
    return s;
  }

  /** Today's Daily (built once per learning day, so every device sees the same set). */
  async daily(courseKey: string | undefined, now = new Date()): Promise<SessionView> {
    const day = learningDay(now, this.clock);
    const target = courseKey ? await this.courseByKey(courseKey) : null;
    const existing = await this.findDaily(day, target?.id ?? null);
    if (existing) return this.view(existing.id);

    let courses: Awaited<ReturnType<StudyService['dailyCourses']>>;
    if (target) {
      const [enrollment] = await this.db.select().from(courseEnrollment).where(eq(courseEnrollment.courseId, target.id));
      courses = [{ ...policyRowOf(target), newPerDayOverride: enrollment?.newPerDay ?? null }];
    } else {
      courses = await this.dailyCourses();
    }
    const seed = randomSeed();
    const { end } = learningDayBounds(day, this.clock);
    const cards = await selectDaily(this.db, courses, { now, dayEnd: end, clock: this.clock, seed });
    try {
      const id = await this.insertSession({ mode: 'daily', courseId: target?.id ?? null, day, seed, cards, scope: [] });
      return this.view(id);
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
      const raced = await this.findDaily(day, target?.id ?? null);
      return this.view(raced!.id);
    }
  }

  /** Builds today's global Daily ahead of time (morning cron). */
  async prepareDaily(now = new Date()): Promise<number | null> {
    const courses = await this.dailyCourses();
    if (!courses.length) return null;
    return (await this.daily(undefined, now)).id;
  }

  async create(input: CreateSessionInput, now = new Date()): Promise<SessionView> {
    const seed = randomSeed();
    if (input.mode === 'exam') {
      if (!input.courseKey) throw new BadRequestException('exam needs courseKey');
      const c = await this.courseByKey(input.courseKey);
      if (!c.examQuestionCount || !c.examMinutes) throw new UnprocessableEntityException(`course "${c.key}" has no exam settings`);
      const cards = await selectExam(this.db, c, seed);
      if (!cards.length) throw new UnprocessableEntityException('this course has no exam questions yet');
      const deadlineAt = new Date(now.getTime() + c.examMinutes * 60_000);
      const id = await this.insertSession({ mode: 'exam', courseId: c.id, day: null, seed, cards, scope: [], deadlineAt });
      return this.view(id);
    }

    let courses;
    let courseId: number | null = null;
    if (input.courseKey) {
      const c = await this.courseByKey(input.courseKey);
      courses = [policyRowOf(c)];
      courseId = c.id;
    } else {
      courses = await this.dailyCourses();
      if (!courses.length)
        courses = (await this.db.select().from(course).where(eq(course.status, 'active')).orderBy(asc(course.sort))).map(policyRowOf);
    }
    const size = Math.min(Math.max(input.size ?? 20, 1), 200);
    const scope = input.scope ?? {};
    const cards = await selectScoped(this.db, courses, { scope, facets: input.facets, size, now, clock: this.clock, seed });
    if (!cards.length) throw new UnprocessableEntityException('no cards match this scope');
    const scopeRows = [
      ...(scope.lessonIds ?? []).map((id) => ({ scopeType: 'lesson', refKey: String(id) })),
      ...(scope.chapterKeys ?? []).map((k) => ({ scopeType: 'chapter', refKey: k })),
      ...(scope.tags ?? []).map((k) => ({ scopeType: 'tag', refKey: k })),
      ...(scope.itemKeys ?? []).map((k) => ({ scopeType: 'item', refKey: k })),
      ...(scope.weak ? [{ scopeType: 'weak', refKey: 'true' }] : []),
      ...(input.facets ?? []).map((f) => ({ scopeType: 'facet', refKey: f })),
    ];
    const id = await this.insertSession({ mode: input.mode, courseId, day: null, seed, cards, scope: scopeRows });
    return this.view(id);
  }

  private async insertSession(s: {
    mode: SessionRow['mode'];
    courseId: number | null;
    day: string | null;
    seed: number;
    cards: SelectedCard[];
    scope: { scopeType: string; refKey: string }[];
    deadlineAt?: Date;
  }): Promise<number> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(studySession)
        .values({ mode: s.mode, courseId: s.courseId, day: s.day, seed: s.seed, deadlineAt: s.deadlineAt ?? null })
        .returning({ id: studySession.id });
      if (s.scope.length) await tx.insert(studySessionScope).values(s.scope.map((x) => ({ sessionId: row.id, ...x })));
      await this.insertCards(tx, row.id, s.mode, s.seed, s.cards, 0);
      return row.id;
    });
  }

  /** Inserts session cards from `startSort` on, choosing which question each card asks. */
  private async insertCards(
    tx: DbExecutor,
    sessionId: number,
    mode: SessionRow['mode'],
    seed: number,
    cards: SelectedCard[],
    startSort: number,
  ): Promise<void> {
    const itemIds = cards.map((c) => c.itemId);
    const items = await loadItems(tx, itemIds);
    const candidates = mode === 'exam' ? [] : await loadCandidates(tx, itemIds);
    const usage = mode === 'exam' ? new Map<string, number>() : await loadUsage(tx, itemIds);
    const random = rng(deriveSeed(seed, startSort));
    const values = cards.map((c, i) => {
      const chosen = mode === 'exam' ? { questionId: c.questionId, generator: null } : pickQuestion(c, items.get(c.itemId)!, mode, candidates, usage, random);
      return {
        sessionId,
        sort: startSort + i,
        courseId: c.courseId,
        itemId: c.itemId,
        facet: c.facet,
        questionId: chosen.questionId,
        generator: chosen.generator,
        seed: deriveSeed(seed, startSort + i),
        isNew: c.isNew,
      };
    });
    for (let i = 0; i < values.length; i += 500) await tx.insert(studySessionCard).values(values.slice(i, i + 500));
  }

  /** A course enrolled mid-day joins today's Daily if that was already built. */
  async extendDaily(courseId: number, now = new Date()): Promise<void> {
    const day = learningDay(now, this.clock);
    const session = await this.findDaily(day, null);
    if (!session) return;
    const [c] = await this.db.select().from(course).where(eq(course.id, courseId));
    const [enrollment] = await this.db.select().from(courseEnrollment).where(eq(courseEnrollment.courseId, courseId));
    if (!c || !enrollment?.dailyEnabled) return;
    const { end } = learningDayBounds(day, this.clock);
    const selected = await selectDaily(this.db, [{ ...policyRowOf(c), newPerDayOverride: enrollment.newPerDay }], {
      now,
      dayEnd: end,
      clock: this.clock,
      seed: deriveSeed(session.seed, courseId),
    });
    await this.db.transaction(async (tx) => {
      const present = new Set(
        (await tx.select({ itemId: studySessionCard.itemId, facet: studySessionCard.facet }).from(studySessionCard).where(eq(studySessionCard.sessionId, session.id))).map(
          (r) => `${r.itemId}:${r.facet}`,
        ),
      );
      const fresh = selected.filter((x) => !present.has(`${x.itemId}:${x.facet}`));
      if (!fresh.length) return;
      const [{ max }] = await tx
        .select({ max: sql<number | null>`max(${studySessionCard.sort})::int` })
        .from(studySessionCard)
        .where(eq(studySessionCard.sessionId, session.id));
      await this.insertCards(tx, session.id, 'daily', session.seed, fresh, (max ?? -1) + 1);
      if (session.status === 'completed') await tx.update(studySession).set({ status: 'active' }).where(eq(studySession.id, session.id));
    });
  }

  async sessionRow(id: number, db: DbExecutor = this.db): Promise<SessionRow> {
    const [s] = await db.select().from(studySession).where(eq(studySession.id, id));
    if (!s) throw new NotFoundException(`session ${id} not found`);
    return s;
  }

  async view(id: number, db: DbExecutor = this.db): Promise<SessionView> {
    const s = await this.sessionRow(id, db);
    const cards = await db.select().from(studySessionCard).where(eq(studySessionCard.sessionId, id)).orderBy(asc(studySessionCard.sort));
    const rendered = await renderCards(db, this.urls, cards);
    const courses = new Map((await db.select({ id: course.id, key: course.key, title: course.title }).from(course)).map((c) => [c.id, c]));
    const revealed = (c: SessionCardRow) => (s.mode === 'exam' ? s.status === 'submitted' : c.status === 'answered');

    const views: SessionCardView[] = [];
    for (const c of cards) {
      const built = rendered.built.get(c.id);
      const item = rendered.items.get(c.itemId);
      if (!built || !item) continue;
      const answered = c.status !== 'pending';
      views.push({
        id: c.id,
        sort: c.sort,
        status: c.status,
        courseKey: courses.get(c.courseId)?.key ?? '',
        itemKey: item.key,
        itemKind: item.kind,
        facet: c.facet,
        isNew: c.isNew,
        isRequeue: c.requeueOfId !== null,
        question: built.view,
        outcome: answered && revealed(c) ? { correct: c.correct, rating: (c.rating as RatingValue | null) ?? null } : answered ? { correct: null, rating: null } : null,
        feedback: answered && revealed(c) ? built.feedback : null,
      });
    }
    const answered = cards.filter((c) => c.status !== 'pending').length;
    const sessionCourse = s.courseId ? courses.get(s.courseId) : null;
    return {
      id: s.id,
      mode: s.mode,
      course: sessionCourse ? { key: sessionCourse.key, title: sessionCourse.title } : null,
      day: s.day,
      status: s.status,
      deadlineAt: s.deadlineAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      progress: {
        total: cards.length,
        answered,
        correct: s.mode === 'exam' && s.status !== 'submitted' ? 0 : cards.filter((c) => c.correct).length,
        remaining: cards.length - answered,
      },
      cards: views,
      exam: s.mode === 'exam' && s.status === 'submitted' ? await this.examResult(db, s, cards, rendered) : null,
    };
  }

  async examResult(db: DbExecutor, s: SessionRow, cards: SessionCardRow[], rendered: Rendered): Promise<ExamResult> {
    const [c] = await db.select().from(course).where(eq(course.id, s.courseId!));
    const domains = await loadExamDomains(db, c.id);
    const stats = new Map(domains.map((d) => [d.key, { key: d.key, title: d.title, total: 0, correct: 0, percent: 0 }]));
    for (const card of cards) {
      const q = card.questionId ? rendered.questions.get(card.questionId) : undefined;
      const it = rendered.items.get(card.itemId);
      const d = domainOf(q?.tags ?? [], it?.tags ?? [], domains);
      const bucket = d ? stats.get(d) : undefined;
      if (!bucket) continue;
      bucket.total++;
      if (card.correct) bucket.correct++;
    }
    for (const b of stats.values()) b.percent = b.total ? Math.round((b.correct / b.total) * 1000) / 10 : 0;
    const correct = cards.filter((x) => x.correct).length;
    const percent = cards.length ? Math.round((correct / cards.length) * 1000) / 10 : 0;
    const passPercent = c.examPassPercent ?? 70;
    return {
      total: cards.length,
      answered: cards.filter((x) => x.status !== 'pending').length,
      correct,
      percent,
      passPercent,
      passed: percent >= passPercent,
      domains: [...stats.values()],
    };
  }

  async countEnrolled(): Promise<number> {
    const [{ n }] = await this.db.select({ n: sql<number>`count(*)::int` }).from(courseEnrollment);
    return n;
  }
}
