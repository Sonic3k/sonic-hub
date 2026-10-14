import type { ChapterNode, CourseDetail, CourseSummary, LessonSummary } from '@learn/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fragment, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api';
import { Bar, NoteCard, Waiting } from '../components/Bits';
import { ModeCardsIcon, ModeExamIcon, ModeQuizIcon, ModeTodayIcon } from '../components/Icons';
import { Screen } from '../components/Screen';
import { courseShort, subStyle, useCatalog } from '../lib/catalog';
import { SOURCE_LABEL } from '../lib/labels';

/* The shelf of courses, and one course: where it comes from, how to study it, its chapters. */

const learnedPct = (c: CourseSummary) => {
  const total = c.counts.cards || c.counts.items;
  return total ? (c.counts.review / total) * 100 : 0;
};

function CourseLine({ course: c }: { course: CourseSummary }) {
  return (
    <li>
      <Link className="row-a" to={`/course/${c.key}`}>
        <span className="t">{c.title}</span>
        {c.description && <span className="d">{c.description}</span>}
        <span className="facts">
          <span className="learned">
            <span>
              {c.counts.review}/{c.counts.cards || c.counts.items} thẻ<span className="mobile-only"> đã thuộc</span>
            </span>
            <span className="xpbar thin">
              <i style={{ width: `${learnedPct(c)}%` }} />
            </span>
          </span>
          {c.enrolled ? (
            <span className="due">
              {c.counts.dueToday} thẻ<span className="mobile-only"> đến hạn</span>
            </span>
          ) : (
            <span className="off">Chưa bắt đầu</span>
          )}
        </span>
      </Link>
    </li>
  );
}

export function Courses() {
  const { catalog, isPending, error, refetch } = useCatalog();
  return (
    <Screen tab="courses" quick>
      <div className="page-head">
        <h1 className="h1">Khóa học</h1>
        {!isPending && !error && catalog.all.length > 0 && (
          <p className="tot">
            {catalog.all.length} khóa học, {catalog.enrolled.length} khóa đang học
          </p>
        )}
      </div>
      {isPending ? (
        <Waiting />
      ) : error ? (
        <NoteCard error action={<button className="btn" onClick={() => refetch()}>Thử lại</button>}>
          {error.message}
        </NoteCard>
      ) : !catalog.all.length ? (
        <NoteCard>Chưa có khóa học nào. Thêm nội dung vào kho content rồi đồng bộ lại.</NoteCard>
      ) : (
        catalog.subjects.map((s) => (
          <section key={s.key} className="box">
            <Bar right={<span className="r">{s.courses.length} khóa</span>}>{s.title}</Bar>
            <div className="body">
              <div className="cols-head" aria-hidden="true">
                <span>Khóa học</span>
                <span>Đã thuộc</span>
                <span>Đến hạn</span>
              </div>
              <ul className="topics clist">
                {s.courses.map((c) => (
                  <CourseLine key={c.key} course={c} />
                ))}
              </ul>
            </div>
          </section>
        ))
      )}
    </Screen>
  );
}

function SourceLine({ c }: { c: CourseDetail }) {
  const s = c.source;
  const bits: ReactNode[] = [SOURCE_LABEL[s.type], s.name, s.author, s.publisher, s.edition].filter(Boolean);
  if (s.url)
    bits.push(
      <a href={s.url} target="_blank" rel="noopener">
        Trang nguồn
      </a>,
    );
  return (
    <>
      {bits.map((b, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="sep">|</span>}
          {b}
        </Fragment>
      ))}
    </>
  );
}

function LessonRows({ lessons }: { lessons: LessonSummary[] }) {
  if (!lessons.length) return null;
  return (
    <ul className="topics lessons">
      {lessons.map((l) => {
        const what = [l.hasBody && 'Bài đọc', l.hasSlides && 'Slide', l.hasVideo && 'Video', `${l.itemCount} thẻ`].filter(Boolean).join(', ');
        return (
          <li key={l.id}>
            <Link to={`/lesson/${l.id}`}>
              <span className="t">{l.title}</span>
              <span className="n">{what}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** A chapter inside a chapter: a heading within the same box. */
function SubChapter({ ch }: { ch: ChapterNode }) {
  return (
    <div className="subchap">
      <h3>{ch.title}</h3>
      {ch.description && <p>{ch.description}</p>}
      <LessonRows lessons={ch.lessons} />
      {ch.children.map((child) => (
        <SubChapter key={child.key} ch={child} />
      ))}
    </div>
  );
}

function Chapter({ ch }: { ch: ChapterNode }) {
  return (
    <section className="box chapter">
      <Bar>{ch.title}</Bar>
      <div className="body">
        {ch.description && <p>{ch.description}</p>}
        <LessonRows lessons={ch.lessons} />
        {ch.children.map((child) => (
          <SubChapter key={child.key} ch={child} />
        ))}
      </div>
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
      <nav className="crumbs" aria-label="Đường dẫn">
        <Link to="/courses">Khóa học</Link>
        <span className="gt">{'>>'}</span>
        <span className="here">{c ? courseShort(c.title) : catalog.course(key) ? courseShort(catalog.course(key)!.title) : '…'}</span>
      </nav>
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
            <section className="panel course-info">
              <p className="small muted" style={{ margin: 0 }}>
                {c.subject.title}
              </p>
              <h1 className="h1">{c.title}</h1>
              {c.description && <p className="desc">{c.description}</p>}
              <div className="src">
                <span className="k">Nguồn:</span>
                <SourceLine c={c} />
              </div>
              <div className="onoff-row">
                <div>
                  <b id="enroll-label">Đang học khóa này</b>
                  <div className="small muted">
                    {c.counts.review}/{c.counts.cards} thẻ đã thuộc, {c.counts.dueToday} thẻ đến hạn hôm nay
                  </div>
                  <div className="xpbar thin">
                    <i style={{ width: `${learnedPct(c)}%` }} />
                  </div>
                </div>
                <div className="onoff" role="radiogroup" aria-labelledby="enroll-label">
                  <button type="button" role="radio" aria-checked={c.enrolled} disabled={enroll.isPending} onClick={() => !c.enrolled && enroll.mutate(true)}>
                    On
                  </button>
                  <button type="button" role="radio" className="off" aria-checked={!c.enrolled} disabled={enroll.isPending} onClick={() => c.enrolled && enroll.mutate(false)}>
                    Off
                  </button>
                </div>
              </div>
              {enroll.error && <p className="err">{enroll.error.message}</p>}
              {c.isCollection && (
                <p className="small muted" style={{ margin: 0 }}>
                  Khóa gom: thẻ lấy từ các khóa khác. Trả lời ở đây cũng được tính cho khóa gốc.
                </p>
              )}
            </section>
          </div>
          <div>
            <div className="modes">
              <Link className="mode" to="/learn/daily">
                <ModeTodayIcon />
                <b>Ôn hôm nay</b>
                <span>{c.enrolled ? `${c.counts.dueToday} đến hạn, ${Math.min(c.counts.new, c.policy.newPerDay)} mới` : 'Bật “Đang học” để vào phần ôn'}</span>
              </Link>
              <Link className="mode" to={`/learn/course/${c.key}`} state={{ back: `/course/${c.key}` }}>
                <ModeQuizIcon />
                <b>Quiz</b>
                <span>Hỏi ngẫu nhiên, không cần học trước</span>
              </Link>
              <Link className="mode" to={`/flash/${c.key}`}>
                <ModeCardsIcon />
                <b>Thẻ</b>
                <span>Lật và vuốt</span>
              </Link>
              {c.exam && (
                <Link className="mode" to={`/exam/${c.key}`}>
                  <ModeExamIcon />
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
