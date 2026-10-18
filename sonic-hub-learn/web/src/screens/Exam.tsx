import type { AnswerResponse, SessionView } from '@learn/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api, ApiError } from '../api';
import { Md, NoteCard, Strip, Waiting } from '../components/Bits';
import { BackIcon, CloseIcon } from '../components/Icons';
import { Question, type AnswerPayload } from '../components/Question';
import { Screen } from '../components/Screen';
import { courseShort, useCatalog } from '../lib/catalog';
import { clientId, reduceMotion } from '../lib/motion';

/* Practice exam: answers are saved blind until submit, then graded by exam domain. */

const errorText = (e: unknown) => (e instanceof ApiError ? e.message : 'Có lỗi xảy ra.');

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

export function Exam() {
  const { key = '', sessionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const creating = useRef(false);
  const [error, setError] = useState<unknown>(null);

  // /exam/:course deals a new paper (also after "Thi lại", which comes back here from a finished one: the route
  // keeps this same screen, so the guard is reset once a paper has its own address)
  useEffect(() => {
    if (sessionId) {
      creating.current = false;
      return;
    }
    if (creating.current) return;
    creating.current = true;
    setError(null);
    api
      .createSession({ mode: 'exam', courseKey: key })
      .then((s) => {
        queryClient.setQueryData(['session', s.id], s);
        navigate(`/exam/${key}/${s.id}`, { replace: true });
      })
      .catch(setError);
  }, [key, sessionId, navigate, queryClient]);

  const id = sessionId ? Number(sessionId) : null;
  const q = useQuery({ queryKey: ['session', id], queryFn: () => api.session(id!), enabled: id !== null, staleTime: Infinity });

  if (q.data?.status === 'submitted') return <Results view={q.data} courseKey={key} />;
  if (q.data) return <Sitting key={q.data.id} initial={q.data} courseKey={key} onDone={(v) => queryClient.setQueryData(['session', v.id], v)} />;
  const err = error ?? q.error;
  return (
    <Screen focus>
      <div className="s-top">
        <Link className="round" to={`/course/${key}`} aria-label="Thoát">
          <CloseIcon />
        </Link>
        <div />
        <span />
      </div>
      {err ? (
        <NoteCard
          error
          action={
            <Link className="btn" to={`/course/${key}`}>
              Về khóa học
            </Link>
          }
        >
          {errorText(err)}
        </NoteCard>
      ) : (
        <Waiting tall />
      )}
    </Screen>
  );
}

function Sitting({ initial, courseKey, onDone }: { initial: SessionView; courseKey: string; onDone: (v: SessionView) => void }) {
  const { catalog } = useCatalog();
  const [index, setIndex] = useState(() => Math.max(0, initial.cards.findIndex((c) => c.status === 'pending')));
  const [saved, setSaved] = useState<Map<number, AnswerResponse>>(
    () => new Map(initial.cards.filter((c) => c.status === 'saved' && c.response).map((c) => [c.id, c.response!])),
  );
  const [now, setNow] = useState(Date.now());
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const shownAt = useRef(Date.now());
  const first = useRef(true);
  const deadline = initial.deadlineAt ? Date.parse(initial.deadlineAt) : null;
  const left = deadline ? deadline - now : null;
  const card = initial.cards[index];
  const color = catalog.colorOf(courseKey);
  const unanswered = initial.cards.length - saved.size;

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      onDone(await api.submit(initial.id));
    } catch (e) {
      setError(e);
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (left !== null && left <= 0) void submit();
  }, [left !== null && left <= 0]);
  // a new question starts at the top
  useEffect(() => {
    shownAt.current = Date.now();
    setConfirming(false);
    if (first.current) first.current = false;
    else scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
  }, [index]);

  const save = (input: AnswerPayload) => {
    const before = saved.get(card.id);
    setSaved((m) => new Map(m).set(card.id, input));
    setError(null);
    api.answer(initial.id, { sessionCardId: card.id, ...input, timeMs: Date.now() - shownAt.current, clientId: clientId() }).catch((e) => {
      setError(e);
      setSaved((m) => {
        const next = new Map(m);
        if (before) next.set(card.id, before);
        else next.delete(card.id);
        return next;
      });
    });
  };

  const last = index === initial.cards.length - 1;
  return (
    <Screen focus>
      <div className="s-top">
        <Link className="round" to={`/course/${courseKey}`} aria-label="Thoát">
          <CloseIcon />
        </Link>
        <strong>Thi thử {courseShort(initial.course?.title ?? '')}</strong>
        <span className={`timer${left !== null && left < 120_000 ? ' low' : ''}`} aria-live="off">
          {left !== null ? clock(left) : ''}
        </span>
      </div>
      <div className="navq">
        {initial.cards.map((c, i) => (
          <button key={c.id} className={`${saved.has(c.id) ? 'saved' : ''} ${i === index ? 'now' : ''}`} aria-label={`Câu ${i + 1}`} onClick={() => setIndex(i)}>
            {i + 1}
          </button>
        ))}
      </div>
      <div className="s-layout">
        <section className="card qcard" style={{ '--sub': color } as CSSProperties}>
          <Strip parts={[{ color, n: 1 }]} />
          <p className="q-label">
            Câu {index + 1} trên {initial.cards.length}
          </p>
          <div className="qbody">
            <Question key={card.id} card={card} mode="exam" saved={saved.get(card.id) ?? null} onCommit={save} />
          </div>
          {saved.has(card.id) && <p className="saved-note">Đã lưu đáp án. Có thể đổi trước khi nộp.</p>}
          {error ? <p className="saved-note" style={{ color: 'var(--pen)' }}>{errorText(error)}</p> : null}
          {confirming ? (
            <div className="exam-foot">
              <span className="muted" style={{ alignSelf: 'center' }}>
                Còn {unanswered} câu bỏ trống.
              </span>
              <span style={{ display: 'flex', gap: 10 }}>
                <button className="btn ghost" onClick={() => setConfirming(false)}>
                  Làm tiếp
                </button>
                <button className="btn" disabled={submitting} onClick={submit}>
                  Nộp luôn
                </button>
              </span>
            </div>
          ) : (
            <div className="exam-foot">
              <button className="btn ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>
                Câu trước
              </button>
              <button className="btn" disabled={submitting} onClick={() => (last ? (unanswered ? setConfirming(true) : submit()) : setIndex(index + 1))}>
                {last ? 'Nộp bài' : 'Câu sau'}
              </button>
            </div>
          )}
        </section>
        <div />
      </div>
    </Screen>
  );
}

function Results({ view, courseKey }: { view: SessionView; courseKey: string }) {
  const { catalog } = useCatalog();
  const r = view.exam!;
  const color = catalog.colorOf(courseKey);
  const navigate = useNavigate();
  return (
    <Screen focus>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Link className="back" to={`/course/${courseKey}`}>
          <BackIcon />
          {courseShort(view.course?.title ?? courseKey)}
        </Link>
        <div className="card done-card">
          <Strip parts={[{ color, n: 1 }]} />
          <h1 className="display h1">Kết quả thi thử</h1>
          <p className="score">
            {Math.round(r.percent)}
            <small>%</small>
          </p>
          <p className="muted" style={{ margin: 0 }}>
            {r.correct}/{r.total} câu đúng, cần {r.passPercent}% để đạt
          </p>
          <span className={`pass-stamp ${r.passed ? 'ok' : 'no'}`}>{r.passed ? 'Đạt' : 'Chưa đạt'}</span>
          <div className="dom">
            {r.domains
              .filter((d) => d.total)
              .map((d) => (
                <div key={d.key}>
                  <span>{d.title}</span>
                  <b>
                    {d.correct}/{d.total}
                  </b>
                  <span className="bar">
                    <i style={{ width: `${(d.correct / d.total) * 100}%` }} />
                  </span>
                </div>
              ))}
          </div>
          <button className="btn wide" onClick={() => navigate(`/exam/${courseKey}`)}>
            Thi lại
          </button>
        </div>
        <h2 className="h2" style={{ margin: '28px 0 12px' }}>
          Xem lại từng câu
        </h2>
        <div className="review">
          {view.cards.map((c, i) => (
            <section key={c.id} className="card qcard" style={{ '--sub': color } as CSSProperties}>
              <p className="q-label">
                Câu {i + 1}
                {c.response ? '' : ', bỏ trống'}
              </p>
              <Question card={c} mode="review" reveal={{ correct: c.outcome?.correct ?? false, feedback: c.feedback, response: c.response }} />
              {c.feedback?.explanationMd && <Md className="expl" src={c.feedback.explanationMd} />}
            </section>
          ))}
        </div>
      </div>
    </Screen>
  );
}
