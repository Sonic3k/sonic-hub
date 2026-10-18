import type { CourseSummary, LeechView, ReadingView, SessionView, StatsView } from '@learn/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api } from '../api';
import { Dot, NoteCard, Strip, Waiting } from '../components/Bits';
import { NextIcon } from '../components/Icons';
import { Screen } from '../components/Screen';
import { subStyle, useCatalog, type Catalog } from '../lib/catalog';
import { dayLabel, dayOfMonth, greeting, todayLabel } from '../lib/format';
import { FACET_LABEL, LEARNER_NAME } from '../lib/labels';

/* Today: what to review, where reading stopped, the courses in progress, what keeps slipping. */

export function Binder({ course, color }: { course: CourseSummary; color: string }) {
  const segs = 12;
  const learned = course.counts.review;
  const total = course.counts.cards || course.counts.items;
  const on = total ? Math.round((learned / total) * segs) : 0;
  return (
    <Link className="card binder" to={`/course/${course.key}`} style={subStyle(color)}>
      <span className="tab-color" />
      <div>
        <h3>{course.title}</h3>
        <p>
          {learned}/{total} thẻ đã thuộc{course.enrolled ? '' : ', chưa bắt đầu'}
        </p>
        <div className="meter" aria-hidden="true">
          {Array.from({ length: segs }, (_, i) => (
            <i key={i} className={i < on ? 'on' : ''} />
          ))}
        </div>
      </div>
      <span className={`due${course.counts.dueToday ? '' : ' zero'}`} title="Đến hạn hôm nay">
        {course.counts.dueToday}
      </span>
    </Link>
  );
}

function TodayStack({ daily, stats, catalog }: { daily: SessionView; stats: StatsView | undefined; catalog: Catalog }) {
  const pending = daily.cards.filter((c) => c.status === 'pending');
  const fresh = pending.filter((c) => c.isNew).length;
  const byCourse = new Map<string, number>();
  pending.forEach((c) => byCourse.set(c.courseKey, (byCourse.get(c.courseKey) ?? 0) + 1));
  const bySubject = new Map<string, number>();
  (pending.length ? pending : daily.cards).forEach((c) => {
    const color = catalog.colorOf(c.courseKey);
    bySubject.set(color, (bySubject.get(color) ?? 0) + 1);
  });
  const strip = <Strip parts={bySubject.size ? [...bySubject].map(([color, n]) => ({ color, n })) : [{ color: 'var(--ink-3)', n: 1 }]} />;

  if (!daily.cards.length)
    return (
      <section className="stack" aria-label="Ôn hôm nay">
        <div className="card">
          {strip}
          <h2 className="display h1 done-title">{catalog.enrolled.length ? 'Hôm nay không có thẻ đến hạn' : 'Bắt đầu một khóa học'}</h2>
          <p className="muted" style={{ margin: '0 0 20px' }}>
            {catalog.enrolled.length
              ? 'Mọi thẻ đã ôn đều chưa tới hạn. Lật thẻ hoặc làm quiz nếu muốn học thêm.'
              : 'Bật “Đang học” ở một khóa, thẻ của khóa đó sẽ vào phần ôn mỗi ngày.'}
          </p>
          <div className="stack-actions">
            <Link className="btn wide" to={catalog.enrolled.length ? '/flash' : '/courses'}>
              {catalog.enrolled.length ? 'Lật thẻ' : 'Chọn khóa học'}
            </Link>
          </div>
        </div>
      </section>
    );

  if (!pending.length)
    return (
      <section className="stack" aria-label="Ôn hôm nay">
        <div className="card">
          {strip}
          <h2 className="display h1 done-title">Xong phần hôm nay</h2>
          <p className="done-line">Đã ôn {daily.progress.answered} thẻ ✓</p>
          <div className="subjects">
            <div>
              Ngày mai cần ôn<b>{stats ? `${stats.dueTomorrow} thẻ` : '…'}</b>
            </div>
          </div>
          <div className="stack-actions">
            <Link className="btn ghost wide" to="/flash">
              Lật thẻ thêm
            </Link>
          </div>
        </div>
      </section>
    );

  return (
    <section className="stack" aria-label="Ôn hôm nay">
      <div className="card">
        {strip}
        <div className="count">
          <b>{pending.length}</b>
          <span>thẻ cần ôn hôm nay</span>
        </div>
        <div className="mix">
          <span className="pill">
            <b>{pending.length - fresh}</b> ôn lại
          </span>
          <span className="pill">
            <b>{fresh}</b> mới
          </span>
          <span className="pill">khoảng {Math.max(1, Math.round(pending.length * 0.5))} phút</span>
        </div>
        <div className="subjects">
          {[...byCourse].map(([key, n]) => (
            <div key={key}>
              <Dot color={catalog.colorOf(key)} />
              {catalog.course(key)?.title ?? key}
              <b>{n}</b>
            </div>
          ))}
        </div>
        <Link className="btn wide" to="/learn/daily">
          {daily.progress.answered ? 'Học tiếp' : 'Bắt đầu học'}
        </Link>
      </div>
    </section>
  );
}

function Continue({ reading, catalog }: { reading: ReadingView; catalog: Catalog }) {
  return (
    <section className="sec">
      <div className="sec-head">
        <h2 className="h2">{reading.position > 0 ? 'Đọc tiếp' : 'Đọc bài tiếp theo'}</h2>
      </div>
      <Link className="card continue" to={`/lesson/${reading.lesson.id}`} state={{ position: reading.position }} style={subStyle(catalog.colorOf(reading.course.key))}>
        <div>
          <p className="muted small" style={{ margin: 0 }}>
            {reading.course.title}
          </p>
          <strong style={{ fontSize: 16.5 }}>{reading.lesson.title}</strong>
        </div>
        <span className="go">
          <NextIcon />
        </span>
        <span className="bar">
          <i style={{ width: `${Math.round(reading.position * 100)}%` }} />
        </span>
      </Link>
    </section>
  );
}

/** A concept's question cut to its subject, so the list stays one line per card. */
function shortLabel(label: string): string {
  const cut = label.split(/\s[—–]\s|:\s/)[0].replace(/\?$/, '');
  return cut.length <= 60 ? cut : `${cut.slice(0, 57).replace(/\s+\S*$/, '')}…`;
}

function Weak({ weak, catalog }: { weak: LeechView[]; catalog: Catalog }) {
  return (
    <section className="sec">
      <div className="sec-head">
        <h2 className="h2">Hay quên</h2>
      </div>
      <div className="card weak">
        {weak.length ? (
          <>
            <ul>
              {weak.slice(0, 3).map((w) => (
                <li key={`${w.courseKey}:${w.itemKey}:${w.facet}`}>
                  <Dot color={catalog.colorOf(w.courseKey)} />
                  <div>
                    <div className="w-term">{shortLabel(w.label)}</div>
                    <div className="w-facet">{FACET_LABEL[w.facet]}</div>
                  </div>
                  <span className="w-count">sai {w.againCount} lần</span>
                </li>
              ))}
            </ul>
            <Link className="btn ghost wide" to="/learn/weak" state={{ back: '/' }}>
              Ôn riêng {weak.length > 3 ? `${weak.length} thẻ` : 'mấy thẻ'} này
            </Link>
          </>
        ) : (
          <p className="calm">Chưa có thẻ nào sai đi sai lại. Thẻ nào bị quên từ hai lần sẽ hiện ở đây.</p>
        )}
      </div>
    </section>
  );
}

function Days({ stats }: { stats: StatsView }) {
  const days = stats.reviewsByDay;
  const lvl = (n: number) => (n === 0 ? '' : n < 8 ? 'l1' : n < 13 ? 'l2' : n < 18 ? 'l3' : 'l4');
  return (
    <section className="sec">
      <div className="sec-head">
        <h2 className="h2">30 ngày qua</h2>
      </div>
      <div className="card heat">
        <p className="muted small" style={{ margin: 0 }}>
          Mỗi ô là một ngày, đậm hơn là ôn nhiều thẻ hơn.
        </p>
        <div className="heat-grid">
          {days.map((d, i) => (
            <i key={d.day} className={`${lvl(d.reviews)}${i === days.length - 1 ? ' today' : ''}`} title={`${dayLabel(d.day)}: ${d.reviews} thẻ`} />
          ))}
        </div>
        <div className="heat-foot">
          <span>{stats.streakDays} ngày liên tiếp</span>
          <span>Kỷ lục {stats.bestStreakDays} ngày</span>
        </div>
      </div>
    </section>
  );
}

export function Home() {
  const { catalog, isPending: catalogPending } = useCatalog();
  const daily = useQuery({ queryKey: ['daily'], queryFn: api.daily });
  const stats = useQuery({ queryKey: ['stats'], queryFn: api.stats });
  const weak = useQuery({ queryKey: ['weak'], queryFn: api.weak });
  const reading = useQuery({ queryKey: ['reading'], queryFn: api.reading });
  const week = stats.data?.reviewsByDay.slice(-7) ?? [];

  return (
    <Screen tab="home">
      <header className="top">
        <div>
          <p className="muted small" style={{ margin: 0 }}>
            {greeting()}, {LEARNER_NAME}
          </p>
          <h1 className="display h1">{todayLabel()}</h1>
        </div>
        {week.length > 0 && (
          <div className="week" title="7 ngày qua">
            {week.map((d, i) => (
              <span key={d.day} className={`${d.reviews ? '' : 'off'}${i === week.length - 1 ? ' today' : ''}`} title={dayLabel(d.day)}>
                {d.reviews ? '✓' : dayOfMonth(d.day)}
              </span>
            ))}
          </div>
        )}
      </header>
      {daily.error && !daily.data ? (
        <NoteCard error action={<button className="btn" onClick={() => daily.refetch()}>Thử lại</button>}>
          Không tải được phần ôn hôm nay. {daily.error.message}
        </NoteCard>
      ) : (
        <div className="home">
          <div className="col">
            {daily.data && !catalogPending ? <TodayStack daily={daily.data} stats={stats.data} catalog={catalog} /> : <Waiting tall />}
            {reading.data?.reading && <Continue reading={reading.data.reading} catalog={catalog} />}
            {catalog.all.length > 0 && (
              <section className="sec">
                <div className="sec-head">
                  <h2 className="h2">{catalog.enrolled.length ? 'Đang học' : 'Khóa học có sẵn'}</h2>
                  <Link className="link small" to="/courses">
                    Tất cả khóa học
                  </Link>
                </div>
                <div className="binders">
                  {(catalog.enrolled.length ? catalog.enrolled : catalog.all).map((c) => (
                    <Binder key={c.key} course={c} color={catalog.colorOf(c.key)} />
                  ))}
                </div>
              </section>
            )}
          </div>
          <div className="col">
            {weak.data && <Weak weak={weak.data} catalog={catalog} />}
            {stats.data && <Days stats={stats.data} />}
          </div>
        </div>
      )}
    </Screen>
  );
}

