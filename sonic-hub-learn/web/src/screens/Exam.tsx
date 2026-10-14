import type { AnswerResponse, SessionView } from '@learn/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api, ApiError } from '../api';
import { Bar, Md, NoteCard, Pages, SessionHead, SubjectTag, Waiting } from '../components/Bits';
import { ClockIcon } from '../components/Icons';
import { Question, type AnswerPayload } from '../components/Question';
import { Screen } from '../components/Screen';
import { courseShort, subStyle, useCatalog } from '../lib/catalog';
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
  const { catalog } = useCatalog();
  const creating = useRef(false);
  const [error, setError] = useState<unknown>(null);

  // /exam/:course deals a new paper (also after "Thi lại", which comes back here from a finished one)
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
  const courseTitle = q.data?.course?.title ?? catalog.course(key)?.title ?? '';
  const title = `Thi thử ${courseShort(courseTitle)}`.trim();

  if (q.data?.status === 'submitted') return <Results view={q.data} courseKey={key} title={title} />;
  if (q.data) return <Sitting key={q.data.id} initial={q.data} courseKey={key} title={title} onDone={(v) => queryClient.setQueryData(['session', v.id], v)} />;
  const err = error ?? q.error;
  return (
    <Screen focus>
      <SessionHead back={`/course/${key}`} title={title} />
      <div className="s-layout solo">
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
      </div>
    </Screen>
  );
}

function Sitting({ initial, courseKey, title, onDone }: { initial: SessionView; courseKey: string; title: string; onDone: (v: SessionView) => void }) {
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
  const total = initial.cards.length;
  const unanswered = total - saved.size;
  const short = courseShort(initial.course?.title ?? catalog.course(courseKey)?.title ?? '');

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

  const last = index === total - 1;
  return (
    <Screen focus>
      <SessionHead back={`/course/${courseKey}`} title={title}>
        {left !== null ? (
          <span className={`clock${left < 120_000 ? ' low' : ''}`} aria-live="off" title="Thời gian còn lại">
            <ClockIcon />
            {clock(left)}
          </span>
        ) : (
          <span />
        )}
      </SessionHead>
      <div className="s-pages solo">
        <Pages current={index} many={total > 12} label="Chọn câu">
          {initial.cards.map((c, i) => (
            <button
              key={c.id}
              type="button"
              className={i === index ? 'now' : saved.has(c.id) ? 'saved' : undefined}
              aria-label={`Câu ${i + 1}${saved.has(c.id) ? ', đã trả lời' : ''}`}
              aria-current={i === index ? 'step' : undefined}
              onClick={() => setIndex(i)}
            >
              {i + 1}
            </button>
          ))}
        </Pages>
      </div>
      <div className="s-layout solo">
        <section className="box qpost" style={subStyle(catalog.colorOf(courseKey))}>
          <Bar
            right={
              <span className="r">
                <SubjectTag subject={catalog.subjectOf(courseKey)} />
                <span className="cn">{short}</span>
              </span>
            }
          >
            Câu {index + 1} trên {total}
          </Bar>
          <div className="body">
            <Question key={card.id} card={card} mode="exam" saved={saved.get(card.id) ?? null} onCommit={save} />
            {saved.has(card.id) && <p className="saved-note">Đã lưu đáp án. Có thể đổi trước khi nộp.</p>}
            {error ? <p className="side-err">{errorText(error)}</p> : null}
            {confirming ? (
              <div className="exam-foot confirm">
                <span className="muted">Còn {unanswered} câu bỏ trống.</span>
                <span className="pair">
                  <button type="button" className="xp" onClick={() => setConfirming(false)}>
                    Làm tiếp
                  </button>
                  <button type="button" className="btn" disabled={submitting} onClick={submit}>
                    Nộp luôn
                  </button>
                </span>
              </div>
            ) : (
              <div className="exam-foot">
                <button type="button" className="xp" disabled={index === 0} onClick={() => setIndex(index - 1)}>
                  Câu trước
                </button>
                <button type="button" className="btn" disabled={submitting} onClick={() => (last ? (unanswered ? setConfirming(true) : submit()) : setIndex(index + 1))}>
                  {last ? 'Nộp bài' : 'Câu sau'}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </Screen>
  );
}

function Results({ view, courseKey, title }: { view: SessionView; courseKey: string; title: string }) {
  const { catalog } = useCatalog();
  const r = view.exam!;
  const navigate = useNavigate();
  const color = catalog.colorOf(courseKey);
  return (
    <Screen focus>
      <SessionHead back={`/course/${courseKey}`} title={title} closeLabel="Đóng" />
      <div className="s-layout solo">
        <div>
          <section className="box done wide">
            <Bar>Kết quả thi thử</Bar>
            <div className="body">
              <p className="big">
                {Math.round(r.percent)}
                <small>%</small>
              </p>
              <p className="muted" style={{ margin: 0 }}>
                {r.correct}/{r.total} câu đúng, cần {r.passPercent}% để đạt
              </p>
              <span className={`stamp-pass ${r.passed ? 'ok' : 'no'}`}>{r.passed ? 'Đạt' : 'Chưa đạt'}</span>
              <table className="tbl dom-tbl">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Lĩnh vực</th>
                    <th className="num">Đúng</th>
                  </tr>
                </thead>
                <tbody>
                  {r.domains
                    .filter((d) => d.total)
                    .map((d, i) => (
                      <tr key={d.key}>
                        <td className="stt">{i + 1}</td>
                        <td>
                          {d.title}
                          <div className="xpbar thin">
                            <i style={{ width: `${(d.correct / d.total) * 100}%` }} />
                          </div>
                        </td>
                        <td className="num">
                          {d.correct}/{d.total}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <div className="acts">
                <button type="button" className="btn" onClick={() => navigate(`/exam/${courseKey}`)}>
                  <span className="go" />
                  Thi lại
                </button>
                <Link className="xp" to={`/course/${courseKey}`}>
                  Về khóa học
                </Link>
              </div>
            </div>
          </section>
          <h2 className="h2 review-head">Xem lại từng câu</h2>
          <div className="review">
            {view.cards.map((c, i) => {
              const state = !c.response ? 'skip' : c.outcome?.correct ? 'ok' : 'no';
              return (
                <section key={c.id} className="box qpost" style={subStyle(color)}>
                  <Bar
                    right={
                      <span className="r">
                        <span className={`res ${state}`}>{state === 'ok' ? 'Đúng' : state === 'no' ? 'Sai' : 'Bỏ trống'}</span>
                      </span>
                    }
                  >
                    Câu {i + 1}
                  </Bar>
                  <div className="body">
                    <Question card={c} mode="review" reveal={{ correct: c.outcome?.correct ?? false, feedback: c.feedback, response: c.response }} />
                    {c.feedback?.explanationMd && <Md className="expl" src={c.feedback.explanationMd} />}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </Screen>
  );
}
