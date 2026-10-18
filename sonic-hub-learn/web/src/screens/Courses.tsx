import type { ChapterNode, CourseDetail } from '@learn/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { api } from '../api';
import { NoteCard, Strip, Waiting } from '../components/Bits';
import { BackIcon, CardsIcon, ExamIcon, NextIcon, QuizIcon, TodayIcon } from '../components/Icons';
import { Screen } from '../components/Screen';
import { subStyle, useCatalog } from '../lib/catalog';
import { SOURCE_LABEL } from '../lib/labels';
import { Binder } from './Home';

/* The shelf of courses, and one course: where it comes from, how to study it, its chapters. */

export function Courses() {
  const { catalog, isPending, error, refetch } = useCatalog();
  return (
    <Screen tab="courses">
      <header className="top">
        <h1 className="display h1">Khóa học</h1>
      </header>
      {isPending ? (
        <Waiting />
      ) : error ? (
        <NoteCard error action={<button className="btn" onClick={() => refetch()}>Thử lại</button>}>
          {error.message}
        </NoteCard>
      ) : (
        catalog.subjects.map((s) => (
          <section key={s.key} className="subject-block">
            <h2 className="h2">{s.title}</h2>
            <div className="binders">
              {s.courses.map((c) => (
                <Binder key={c.key} course={c} color={s.color} />
              ))}
            </div>
          </section>
        ))
      )}
    </Screen>
  );
}

function SourceLine({ c }: { c: CourseDetail }) {
  const s = c.source;
  return (
    <>
      <span className="pill">{SOURCE_LABEL[s.type]}</span>
      {s.name && <span className="pill">{s.name}</span>}
      {s.author && <span className="pill">{s.author}</span>}
      {s.publisher && <span className="pill">{s.publisher}</span>}
      {s.edition && <span className="pill">{s.edition}</span>}
      {s.url && (
        <a className="pill" href={s.url} target="_blank" rel="noopener">
          Trang nguồn
        </a>
      )}
    </>
  );
}

function Chapter({ ch }: { ch: ChapterNode }) {
  return (
    <section className="chapter">
      <h2 className="h2">{ch.title}</h2>
      {ch.description && <p>{ch.description}</p>}
      {ch.lessons.map((l) => {
        const what = [l.hasBody && 'Bài đọc', l.hasSlides && 'Slide', l.hasVideo && 'Video', `${l.itemCount} thẻ`].filter(Boolean) as string[];
        return (
          <Link key={l.id} className="card lesson-row" to={`/lesson/${l.id}`}>
            <div>
              <h4>{l.title}</h4>
              <div className="what">
                {what.map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </div>
            </div>
            <span className="row-go">
              <NextIcon />
            </span>
          </Link>
        );
      })}
      {ch.children.map((child) => (
        <Chapter key={child.key} ch={child} />
      ))}
    </section>
  );
}

export function Course() {
  const { key = '' } = useParams();
  const queryClient = useQueryClient();
  const { catalog } = useCatalog();
  const q = useQuery({ queryKey: ['course', key], queryFn: () => api.course(key) });
  const enroll = useMutation({
    mutationFn: (enrolled: boolean) => api.enroll(key, { enrolled }),
    onSuccess: (detail) => {
      queryClient.setQueryData(['course', key], detail);
      for (const k of [['subjects'], ['daily'], ['stats'], ['reading'], ['weak']]) void queryClient.invalidateQueries({ queryKey: k });
    },
  });
  const c = q.data;
  const color = c?.subject.color ?? catalog.colorOf(key);
  return (
    <Screen tab="courses">
      <Link className="back" to="/courses">
        <BackIcon />
        Khóa học
      </Link>
      {!c ? (
        q.error ? (
          <NoteCard error action={<button className="btn" onClick={() => q.refetch()}>Thử lại</button>}>
            {q.error.message}
          </NoteCard>
        ) : (
          <Waiting tall />
        )
      ) : (
        <div className="course-wrap" style={subStyle(color)}>
          <div>
            <section className="card course-head">
              <Strip parts={[{ color, n: 1 }]} />
              <p className="muted small" style={{ margin: 0 }}>
                {c.subject.title}
              </p>
              <h1 className="display h1" style={{ marginTop: 4 }}>
                {c.title}
              </h1>
              {c.description && <p className="desc">{c.description}</p>}
              <div className="source">
                <SourceLine c={c} />
              </div>
              <div className="switch-row">
                <div>
                  <strong>Đang học khóa này</strong>
                  <div className="muted small">
                    {c.counts.review}/{c.counts.cards} thẻ đã thuộc, {c.counts.dueToday} thẻ đến hạn hôm nay
                  </div>
                </div>
                <button
                  className="switch"
                  role="switch"
                  aria-checked={c.enrolled}
                  aria-label="Đang học khóa này"
                  disabled={enroll.isPending}
                  onClick={() => enroll.mutate(!c.enrolled)}
                />
              </div>
              {enroll.error && (
                <p className="muted small" style={{ color: 'var(--pen)', margin: '10px 0 0' }}>
                  {enroll.error.message}
                </p>
              )}
              {c.isCollection && (
                <p className="muted small" style={{ margin: '14px 0 0' }}>
                  Khóa gom: thẻ lấy từ các khóa khác. Trả lời ở đây cũng được tính cho khóa gốc.
                </p>
              )}
            </section>
          </div>
          <div>
            <div className="modes">
              <Link className="card mode" to="/learn/daily">
                <TodayIcon />
                <b>Ôn hôm nay</b>
                <span>{c.enrolled ? `${c.counts.dueToday} đến hạn, ${Math.min(c.counts.new, c.policy.newPerDay)} mới` : 'Bật “Đang học” để vào phần ôn'}</span>
              </Link>
              <Link className="card mode" to={`/learn/course/${c.key}`} state={{ back: `/course/${c.key}` }}>
                <QuizIcon />
                <b>Quiz</b>
                <span>Hỏi ngẫu nhiên, không cần học trước</span>
              </Link>
              <Link className="card mode" to={`/flash/${c.key}`}>
                <CardsIcon />
                <b>Thẻ</b>
                <span>Lật và vuốt</span>
              </Link>
              {c.exam && (
                <Link className="card mode" to={`/exam/${c.key}`}>
                  <ExamIcon />
                  <b>Thi thử</b>
                  <span>
                    {c.exam.questions} câu, {c.exam.minutes} phút
                  </span>
                </Link>
              )}
            </div>
            {c.chapters.map((ch) => (
              <Chapter key={ch.key} ch={ch} />
            ))}
            {!c.chapters.length && <p className="muted">Khóa gom không có bài học riêng — học bằng Thẻ, Quiz hoặc Ôn hôm nay.</p>}
          </div>
        </div>
      )}
    </Screen>
  );
}
