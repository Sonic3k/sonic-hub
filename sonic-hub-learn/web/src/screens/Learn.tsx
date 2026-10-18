import type { AnswerResult, CreateSessionInput, SessionCardView, SessionView } from '@learn/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { api, ApiError } from '../api';
import { Md, NoteCard, Strip, Waiting } from '../components/Bits';
import { CloseIcon } from '../components/Icons';
import { Question, type AnswerPayload, type QuestionControls } from '../components/Question';
import { Screen } from '../components/Screen';
import { courseShort, useCatalog, type Catalog } from '../lib/catalog';
import { untilLabel } from '../lib/format';
import { FACET_LABEL, RATING_LABEL } from '../lib/labels';
import { clientId, reduceMotion } from '../lib/motion';

/* Studying: today's Daily, a quiz over a lesson / a course / the cards that keep slipping. */

type BackState = { back?: string } | null;

const errorText = (e: unknown) => (e instanceof ApiError ? e.message : 'Có lỗi xảy ra.');

/** Creates a quiz session, then moves to its own address so a reload resumes it. */
export function StartSession({ kind }: { kind: 'lesson' | 'weak' | 'course' }) {
  const { lessonId, key } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const started = useRef(false);
  const [error, setError] = useState<unknown>(null);
  const back = (location.state as BackState)?.back ?? (kind === 'lesson' ? `/lesson/${lessonId}` : kind === 'course' ? `/course/${key}` : '/');
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const courseKey = search.get('course') ?? undefined;
    const input: CreateSessionInput =
      kind === 'lesson'
        ? { mode: 'quiz', courseKey, scope: { lessonIds: [Number(lessonId)] }, size: 10 }
        : kind === 'weak'
          ? { mode: 'quiz', scope: { weak: true }, size: 20 }
          : { mode: 'quiz', courseKey: key, size: 10 };
    api
      .createSession(input)
      .then((s) => navigate(`/session/${s.id}`, { replace: true, state: { back } }))
      .catch(setError);
  }, [kind, lessonId, key, search, navigate, back]);
  return (
    <Screen focus>
      <div className="s-top">
        <Link className="round" to={back} aria-label="Thoát">
          <CloseIcon />
        </Link>
        <div />
        <span />
      </div>
      {error ? (
        <NoteCard
          error={!(error instanceof ApiError && error.status === 422)}
          action={
            <Link className="btn" to={back}>
              Quay lại
            </Link>
          }
        >
          {error instanceof ApiError && error.status === 422 ? 'Chưa có câu hỏi nào cho phần này.' : errorText(error)}
        </NoteCard>
      ) : (
        <Waiting tall />
      )}
    </Screen>
  );
}

export function Learn({ kind }: { kind: 'daily' | 'session' }) {
  const { sessionId } = useParams();
  const location = useLocation();
  const id = kind === 'session' ? Number(sessionId) : null;
  const q = useQuery({
    queryKey: kind === 'daily' ? ['daily', 'play'] : ['session', id],
    queryFn: () => (kind === 'daily' ? api.daily() : api.session(id!)),
    staleTime: 0,
    gcTime: 0,
  });
  const { catalog } = useCatalog();
  const stateBack = (location.state as BackState)?.back;
  const back = stateBack ?? (q.data?.course && q.data.mode !== 'daily' ? `/course/${q.data.course.key}` : '/');
  if (!q.data)
    return (
      <Screen focus>
        <div className="s-top">
          <Link className="round" to={back} aria-label="Thoát">
            <CloseIcon />
          </Link>
          <div />
          <span />
        </div>
        {q.error ? (
          <NoteCard error action={<button className="btn" onClick={() => q.refetch()}>Thử lại</button>}>
            {errorText(q.error)}
          </NoteCard>
        ) : (
          <Waiting tall />
        )}
      </Screen>
    );
  return <Player key={q.data.id} initial={q.data} back={back} catalog={catalog} />;
}

function firstPending(v: SessionView): number | null {
  return v.cards.find((c) => c.status === 'pending')?.id ?? null;
}

function Player({ initial, back, catalog }: { initial: SessionView; back: string; catalog: Catalog }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState(initial);
  const [currentId, setCurrentId] = useState<number | null>(() => firstPending(initial));
  const [answered, setAnswered] = useState<{ result: AnswerResult; input: AnswerPayload } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const shownAt = useRef(Date.now());
  const answerId = useRef(clientId());
  const lastInput = useRef<AnswerPayload | null>(null);
  const controls = useRef<QuestionControls>(null);
  const sideRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const current = view.cards.find((c) => c.id === currentId) ?? null;
  const position = current ? view.cards.findIndex((c) => c.id === current.id) + 1 : view.cards.length;

  useEffect(() => {
    shownAt.current = Date.now();
    answerId.current = clientId();
  }, [currentId]);

  const finishTouches = () => {
    for (const key of [['daily'], ['stats'], ['weak'], ['subjects']]) void queryClient.invalidateQueries({ queryKey: key });
  };

  const goNext = (fromId: number, v: SessionView) => {
    const idx = v.cards.findIndex((c) => c.id === fromId);
    const next = v.cards.slice(idx + 1).find((c) => c.status === 'pending') ?? v.cards.find((c) => c.status === 'pending');
    setAnswered(null);
    setError(null);
    setCurrentId(next?.id ?? null);
    if (!next) finishTouches();
    scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
  };

  const send = async (input: AnswerPayload) => {
    if (!current || busy) return;
    lastInput.current = input;
    setBusy(true);
    setError(null);
    try {
      const result = await api.answer(view.id, { sessionCardId: current.id, ...input, timeMs: Date.now() - shownAt.current, clientId: answerId.current });
      let next: SessionView = {
        ...view,
        cards: view.cards.map((c): SessionCardView =>
          c.id === current.id
            ? { ...c, status: 'answered', outcome: { correct: result.correct, rating: result.rating }, feedback: result.feedback, response: input, ratingDue: null }
            : c,
        ),
      };
      if (result.requeuedCardId) next = await api.session(view.id).catch(() => next);
      setView(next);
      setAnswered({ result, input });
      if (current.question.type === 'flashcard') setTimeout(() => goNext(current.id, next), 650);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  // keys: 1–4 pick an option, space turns a flashcard, Enter moves on
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as Element).matches('input, textarea')) return;
      if (answered) {
        if (e.key === 'Enter' && nextRef.current) {
          e.preventDefault();
          nextRef.current.click();
        }
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= 9) controls.current?.pick(n);
      if (e.key === ' ' && current?.question.type === 'flashcard') {
        e.preventDefault();
        controls.current?.flip();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [answered, current]);

  // on phones the note sits under the card: bring it into view
  useEffect(() => {
    if (!answered || !sideRef.current || current?.question.type === 'flashcard') return;
    nextRef.current?.focus({ preventScroll: true });
    if (innerWidth < 960) sideRef.current.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
  }, [answered, current]);

  if (!view.cards.length) return <EmptySession back={back} daily={view.mode === 'daily'} />;
  if (!current) return <Finished view={view} back={back} catalog={catalog} />;

  const color = catalog.colorOf(current.courseKey);
  const courseTitle = catalog.course(current.courseKey)?.title ?? view.course?.title ?? '';
  const result = answered?.result ?? null;
  const reveal =
    result && current.question.type !== 'flashcard' ? { correct: result.correct, typo: result.typo, feedback: result.feedback, response: answered!.input } : null;

  return (
    <Screen focus>
      <div className="s-top">
        <Link className="round" to={back} aria-label="Thoát">
          <CloseIcon />
        </Link>
        <div className={`ticks${view.cards.length > 18 ? ' dense' : ''}`} aria-hidden="true">
          {view.cards.map((c) => {
            const ok = c.outcome?.correct;
            const cls = c.id === current.id ? 'now' : c.status === 'answered' ? (ok ? 'ok' : 'no') : '';
            return (
              <i key={c.id} className={cls}>
                {c.status === 'answered' ? (ok ? '✓' : '✗') : ''}
              </i>
            );
          })}
        </div>
        <span className="s-count">
          {position}/{view.cards.length}
        </span>
      </div>
      <div className="s-layout">
        <section className="card qcard" style={{ '--sub': color } as CSSProperties} aria-live="polite">
          <Strip parts={[{ color, n: 1 }]} />
          <p className="q-label">
            <span className="dot" />
            {FACET_LABEL[current.facet]}, {courseShort(courseTitle)}
            {current.isNew && <span className="new">thẻ mới</span>}
            {current.isRequeue && <span className="again">hỏi lại</span>}
          </p>
          <div className="qbody">
            <Question key={current.id} card={current} mode="study" reveal={reveal} busy={busy} onCommit={send} controls={controls} />
          </div>
        </section>
        <div className="side" ref={sideRef}>
          {error ? (
            <NoteCard error action={<button className="btn" onClick={() => lastInput.current && send(lastInput.current)}>Gửi lại</button>}>
              {errorText(error)}
            </NoteCard>
          ) : result && current.question.type === 'flashcard' ? (
            <div className="card note flash-note">
              <span className="stamp">
                <span>{RATING_LABEL[result.rating ?? 3]}</span>
                <b>{untilLabel(result.memory?.due)}</b>
              </span>
            </div>
          ) : result ? (
            <div className="card note" style={{ '--sub': color } as CSSProperties}>
              <p className={`verdict ${result.correct ? 'ok' : 'no'}`}>
                {result.correct ? (result.typo ? 'Đúng rồi, chỉ sai chính tả chút xíu' : 'Đúng rồi') : 'Chưa đúng'}
              </p>
              {result.feedback?.explanationMd && <Md className="expl" src={result.feedback.explanationMd} />}
              <Md className={`summary${current.itemKind === 'vocab' ? ' vocab' : ''}`} src={result.feedback?.summaryMd} />
              {result.requeuedCardId && <p className="requeue">Thẻ này sẽ quay lại sau vài câu nữa.</p>}
              <div className="foot">
                {result.memory ? (
                  <span className="stamp">
                    <span>Ôn lại sau</span>
                    <b>{untilLabel(result.memory.due)}</b>
                  </span>
                ) : (
                  <span />
                )}
                <button ref={nextRef} className="btn" onClick={() => goNext(current.id, view)}>
                  Tiếp
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Screen>
  );
}

function EmptySession({ back, daily }: { back: string; daily: boolean }) {
  return (
    <Screen focus>
      <div style={{ maxWidth: 560, margin: '4vh auto 0' }}>
        <NoteCard
          action={
            <div style={{ display: 'grid', gap: 10 }}>
              <Link className="btn wide" to={daily ? '/courses' : back}>
                {daily ? 'Chọn khóa học' : 'Quay lại'}
              </Link>
              {daily && (
                <Link className="btn ghost wide" to="/">
                  Về trang chính
                </Link>
              )}
            </div>
          }
        >
          {daily ? 'Hôm nay chưa có thẻ nào. Bật “Đang học” ở một khóa học để thẻ của khóa đó vào phần ôn mỗi ngày.' : 'Phần này chưa có câu hỏi nào.'}
        </NoteCard>
      </div>
    </Screen>
  );
}

/** Longest run of right answers, in the order the cards were asked. */
function longestRun(cards: SessionCardView[]): number {
  let best = 0;
  let run = 0;
  for (const c of cards) {
    if (c.status !== 'answered') continue;
    run = c.outcome?.correct ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

function Finished({ view, back, catalog }: { view: SessionView; back: string; catalog: Catalog }) {
  const stats = useQuery({ queryKey: ['stats'], queryFn: api.stats });
  const firstTry = view.cards.filter((c) => !c.isRequeue && c.status === 'answered');
  const correct = firstTry.filter((c) => c.outcome?.correct).length;
  const fresh = view.cards.filter((c) => c.isNew && c.status === 'answered').length;
  const again = view.cards.filter((c) => c.outcome?.rating === 1).length;
  const bySubject = new Map<string, number>();
  for (const c of view.cards) {
    const color = catalog.colorOf(c.courseKey);
    bySubject.set(color, (bySubject.get(color) ?? 0) + 1);
  }
  const isDaily = view.mode === 'daily';
  return (
    <Screen focus>
      <div className="card done-card" style={{ maxWidth: 560, margin: '4vh auto 0' }}>
        <Strip parts={[...bySubject].map(([color, n]) => ({ color, n }))} />
        <h1 className="display h1">{isDaily ? 'Xong phần hôm nay' : 'Xong quiz'}</h1>
        <p className="score">
          {correct}
          <small>/{firstTry.length}</small>
        </p>
        <p className="muted" style={{ margin: 0 }}>
          đúng ngay lần đầu
        </p>
        <div className="lines">
          <div>
            <span>Thẻ mới đã học</span>
            <b>{fresh}</b>
          </div>
          <div>
            <span>Hỏi lại trong buổi</span>
            <b>{again}</b>
          </div>
          <div>
            <span>Đúng liền một mạch</span>
            <b>{longestRun(view.cards)} câu</b>
          </div>
          <div>
            <span>Ngày mai cần ôn</span>
            <b>{stats.data ? `${stats.data.dueTomorrow} thẻ` : '…'}</b>
          </div>
        </div>
        <div className="actions">
          <Link className="btn wide" to={isDaily ? '/' : back}>
            {isDaily ? 'Về trang chính' : back.startsWith('/lesson') ? 'Về bài học' : back.startsWith('/course') ? 'Về khóa học' : 'Về trang chính'}
          </Link>
          {isDaily && (
            <Link className="btn ghost wide" to="/flash">
              Lật thẻ thêm
            </Link>
          )}
        </div>
      </div>
    </Screen>
  );
}
