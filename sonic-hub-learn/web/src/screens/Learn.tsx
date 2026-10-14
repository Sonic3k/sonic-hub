import type { AnswerResult, CreateSessionInput, LessonDetail, QuestionType, SessionCardView, SessionView } from '@learn/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { api, ApiError } from '../api';
import { Bar, Md, NoteCard, Pages, SessionHead, SubjectTag, Waiting } from '../components/Bits';
import { CheckIcon, CrossIcon } from '../components/Icons';
import { Question, type AnswerPayload, type QuestionControls } from '../components/Question';
import { Screen } from '../components/Screen';
import { courseShort, subStyle, useCatalog, type Catalog } from '../lib/catalog';
import { untilLabel } from '../lib/format';
import { FACET_LABEL, RATING_LABEL } from '../lib/labels';
import { clientId, reduceMotion } from '../lib/motion';

/* Studying: today's Daily, a quiz over a lesson / a course / the cards that keep slipping. */

type NavState = { back?: string; title?: string } | null;

const errorText = (e: unknown) => (e instanceof ApiError ? e.message : 'Có lỗi xảy ra.');

/** What the session is, for the bar on top (sessions do not carry a title of their own). */
function sessionTitle(v: SessionView): string {
  if (v.mode === 'daily') return 'Ôn hôm nay';
  return v.course ? `Quiz ${courseShort(v.course.title)}` : 'Quiz';
}

/** Creates a quiz session, then moves to its own address so a reload resumes it. */
export function StartSession({ kind }: { kind: 'lesson' | 'weak' | 'course' }) {
  const { lessonId, key } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { catalog } = useCatalog();
  const started = useRef(false);
  const [error, setError] = useState<unknown>(null);
  const back = (location.state as NavState)?.back ?? (kind === 'lesson' ? `/lesson/${lessonId}` : kind === 'course' ? `/course/${key}` : '/');
  const lessonTitle = kind === 'lesson' ? queryClient.getQueryData<LessonDetail>(['lesson', Number(lessonId)])?.title : undefined;
  const courseTitle = kind === 'course' && key ? catalog.course(key)?.title : undefined;
  const title = kind === 'weak' ? 'Hay quên' : lessonTitle ? `Quiz: ${lessonTitle}` : courseTitle ? `Quiz ${courseShort(courseTitle)}` : 'Quiz';
  const titleRef = useRef(title);
  titleRef.current = title;
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
      .then((s) => navigate(`/session/${s.id}`, { replace: true, state: { back, title: titleRef.current } }))
      .catch(setError);
  }, [kind, lessonId, key, search, navigate, back]);
  const empty = error instanceof ApiError && error.status === 422;
  return (
    <Screen focus>
      <SessionHead back={back} title={title} />
      <div className="s-layout solo">
        {error ? (
          <NoteCard
            error={!empty}
            action={
              <Link className="btn" to={back}>
                Quay lại
              </Link>
            }
          >
            {empty ? 'Chưa có câu hỏi nào cho phần này.' : errorText(error)}
          </NoteCard>
        ) : (
          <Waiting tall />
        )}
      </div>
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
  const nav = location.state as NavState;
  const back = nav?.back ?? (q.data?.course && q.data.mode !== 'daily' ? `/course/${q.data.course.key}` : '/');
  const title = nav?.title ?? (q.data ? sessionTitle(q.data) : kind === 'daily' ? 'Ôn hôm nay' : '');
  if (!q.data)
    return (
      <Screen focus>
        <SessionHead back={back} title={title} />
        <div className="s-layout solo">
          {q.error ? (
            <NoteCard error action={<button className="btn" onClick={() => q.refetch()}>Thử lại</button>}>
              {errorText(q.error)}
            </NoteCard>
          ) : (
            <Waiting tall />
          )}
        </div>
      </Screen>
    );
  return <Player key={q.data.id} initial={q.data} back={back} title={title} catalog={catalog} />;
}

/** Wide screens, before answering: the side column says what will appear there and which keys work. */
function KeysHint({ type }: { type: QuestionType }) {
  const rows: [string, string][] =
    type === 'flashcard'
      ? [['Space', 'Lật thẻ']]
      : type === 'typing' || type === 'cloze'
        ? [['Enter', 'Kiểm tra, rồi sang câu tiếp']]
        : [...(type === 'single' ? ([['1 – 4', 'Chọn đáp án']] as [string, string][]) : []), ['Enter', 'Sang câu tiếp, sau khi trả lời']];
  return (
    <section className="box plain keys-hint" aria-hidden="true">
      <Bar>Phím tắt</Bar>
      <div className="body">
        <p>{type === 'flashcard' ? 'Lật thẻ rồi tự chấm: nhớ được tới đâu.' : 'Trả lời xong, phần giải thích hiện ở đây.'}</p>
        <table className="kv">
          <tbody>
            {rows.map(([k, what]) => (
              <tr key={k}>
                <td>
                  <kbd>{k}</kbd>
                </td>
                <td>{what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function firstPending(v: SessionView): number | null {
  return v.cards.find((c) => c.status === 'pending')?.id ?? null;
}

function Player({ initial, back, title, catalog }: { initial: SessionView; back: string; title: string; catalog: Catalog }) {
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
  const index = current ? view.cards.findIndex((c) => c.id === current.id) : view.cards.length - 1;

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

  // on phones the explanation sits under the question: bring it into view
  useEffect(() => {
    if (!answered || !sideRef.current || current?.question.type === 'flashcard') return;
    nextRef.current?.focus({ preventScroll: true });
    if (innerWidth < 960) sideRef.current.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'nearest' });
  }, [answered, current]);

  if (!view.cards.length) return <EmptySession back={back} title={title} daily={view.mode === 'daily'} />;
  if (!current) return <Finished view={view} back={back} title={title} />;

  const color = catalog.colorOf(current.courseKey);
  const courseTitle = catalog.course(current.courseKey)?.title ?? view.course?.title ?? '';
  const result = answered?.result ?? null;
  const reveal =
    result && current.question.type !== 'flashcard' ? { correct: result.correct, typo: result.typo, feedback: result.feedback, response: answered!.input } : null;
  const summaryMd = result?.feedback?.summaryMd;

  return (
    <Screen focus>
      <SessionHead back={back} title={title}>
        <span className="cnt">
          {index + 1}/{view.cards.length}
        </span>
      </SessionHead>
      <div className="s-pages">
        <Pages current={index} many={view.cards.length > 12}>
          {view.cards.map((c, i) => {
            const ok = c.outcome?.correct ?? (c.outcome?.rating ?? 0) > 1;
            const cls = c.id === current.id ? 'now' : c.status === 'answered' ? (ok ? 'ok' : 'no') : undefined;
            return (
              <i key={c.id} className={cls}>
                {c.status === 'answered' ? (ok ? '✓' : '✗') : i + 1}
              </i>
            );
          })}
        </Pages>
      </div>
      <div className="s-layout">
        <section className="box qpost" style={subStyle(color)} aria-live="polite">
          <Bar
            extra={
              <>
                {current.isNew && <span className="tag new">thẻ mới</span>}
                {current.isRequeue && <span className="tag again">hỏi lại</span>}
              </>
            }
            right={
              <span className="r">
                <SubjectTag subject={catalog.subjectOf(current.courseKey)} />
                <span className="cn">{courseShort(courseTitle)}</span>
              </span>
            }
          >
            {FACET_LABEL[current.facet]}
          </Bar>
          <div className="body">
            <Question key={current.id} card={current} mode="study" reveal={reveal} busy={busy} onCommit={send} controls={controls} />
          </div>
        </section>
        <div className="side" ref={sideRef}>
          {error ? (
            <NoteCard error action={<button className="btn" onClick={() => lastInput.current && send(lastInput.current)}>Gửi lại</button>}>
              {errorText(error)}
            </NoteCard>
          ) : result && current.question.type === 'flashcard' ? (
            <section className="box reply">
              <Bar icon={(result.rating ?? 3) > 1 ? <CheckIcon /> : <CrossIcon />} tone={(result.rating ?? 3) > 1 ? 'ok' : 'no'}>
                {RATING_LABEL[result.rating ?? 3]}
              </Bar>
              {result.memory && (
                <div className="body">
                  <div className="foot2">
                    <span className="due-tag">
                      <span>Ôn lại sau</span>
                      <b>{untilLabel(result.memory.due)}</b>
                    </span>
                  </div>
                </div>
              )}
            </section>
          ) : result ? (
            <section className="box reply" style={subStyle(color)}>
              <Bar icon={result.correct ? <CheckIcon /> : <CrossIcon />} tone={result.correct ? 'ok' : 'no'}>
                {result.correct ? (result.typo ? 'Đúng rồi, chỉ sai chính tả chút xíu' : 'Đúng rồi') : 'Chưa đúng'}
              </Bar>
              <div className="body">
                {result.feedback?.explanationMd && <Md className="expl" src={result.feedback.explanationMd} />}
                {summaryMd && <Md className={`summary${current.itemKind === 'vocab' ? ' vocab' : ''}`} src={summaryMd} />}
                {result.requeuedCardId && <p className="again-note">Thẻ này sẽ quay lại sau vài câu nữa.</p>}
                <div className="foot2">
                  {result.memory ? (
                    <span className="due-tag">
                      <span>Ôn lại sau</span>
                      <b>{untilLabel(result.memory.due)}</b>
                    </span>
                  ) : (
                    <span />
                  )}
                  <button ref={nextRef} type="button" className="btn" onClick={() => goNext(current.id, view)}>
                    Tiếp
                    <span className="go" />
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <KeysHint type={current.question.type} />
          )}
        </div>
      </div>
    </Screen>
  );
}

function EmptySession({ back, title, daily }: { back: string; title: string; daily: boolean }) {
  return (
    <Screen focus>
      <SessionHead back={back} title={title} />
      <div className="s-layout solo">
        <NoteCard
          action={
            daily ? (
              <>
                <Link className="btn" to="/courses">
                  Chọn khóa học
                </Link>
                <Link className="xp" to="/">
                  Về trang chính
                </Link>
              </>
            ) : (
              <Link className="btn" to={back}>
                Quay lại
              </Link>
            )
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

function Finished({ view, back, title }: { view: SessionView; back: string; title: string }) {
  const stats = useQuery({ queryKey: ['stats'], queryFn: api.stats });
  const firstTry = view.cards.filter((c) => !c.isRequeue && c.status === 'answered');
  const correct = firstTry.filter((c) => c.outcome?.correct).length;
  const fresh = view.cards.filter((c) => c.isNew && c.status === 'answered').length;
  const again = view.cards.filter((c) => c.outcome?.rating === 1).length;
  const isDaily = view.mode === 'daily';
  const home = isDaily ? '/' : back;
  const homeLabel = isDaily ? 'Về trang chính' : back.startsWith('/lesson') ? 'Về bài học' : back.startsWith('/course') ? 'Về khóa học' : 'Về trang chính';
  return (
    <Screen focus>
      <SessionHead back={home} title={title} closeLabel="Đóng" />
      <div className="s-layout solo">
        <section className="box done">
          <Bar>{isDaily ? 'Xong phần hôm nay' : 'Xong quiz'}</Bar>
          <div className="body">
            <p className="big">
              {correct}
              <small>/{firstTry.length}</small>
            </p>
            <p className="muted" style={{ margin: 0 }}>
              đúng ngay lần đầu
            </p>
            <table className="kv">
              <tbody>
                <tr>
                  <td>Thẻ mới đã học</td>
                  <td>{fresh}</td>
                </tr>
                <tr>
                  <td>Hỏi lại trong buổi</td>
                  <td>{again}</td>
                </tr>
                <tr>
                  <td>Đúng liền một mạch</td>
                  <td>{longestRun(view.cards)} câu</td>
                </tr>
                <tr>
                  <td>Ngày mai cần ôn</td>
                  <td>{stats.data ? `${stats.data.dueTomorrow} thẻ` : '…'}</td>
                </tr>
              </tbody>
            </table>
            <div className="acts">
              <Link className="btn" to={home}>
                <span className="go" />
                {homeLabel}
              </Link>
              {isDaily && (
                <Link className="xp" to="/flash">
                  Lật thẻ thêm
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>
    </Screen>
  );
}
