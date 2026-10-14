import type { CourseSummary, LeechView, ReadingView, SessionView, StatsView } from '@learn/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api } from '../api';
import { Bar, NoteCard, SubjectTag, Waiting } from '../components/Bits';
import { Screen } from '../components/Screen';
import { useCatalog, type Catalog } from '../lib/catalog';
import { dayLabel, dayOfMonth, greeting, todayLabel } from '../lib/format';
import { FACET_LABEL, LEARNER_NAME } from '../lib/labels';

/* Today: what to review, where reading stopped, the courses in progress, what keeps slipping. */

/** The last seven days as paging boxes: ✓ for a day with reviews. */
function Week({ stats }: { stats: StatsView | undefined }) {
  const week = stats?.reviewsByDay.slice(-7) ?? [];
  if (!week.length) return null;
  return (
    <div className="pages week" title="7 ngày qua">
      {week.map((d, i) => (
        <span key={d.day} className={i === week.length - 1 ? 'now' : d.reviews ? 'ok' : ''} title={`${dayLabel(d.day)}: ${d.reviews} thẻ`}>
          {d.reviews ? '✓' : dayOfMonth(d.day)}
        </span>
      ))}
    </div>
  );
}

function Today({ daily, stats, catalog }: { daily: SessionView; stats: StatsView | undefined; catalog: Catalog }) {
  const pending = daily.cards.filter((c) => c.status === 'pending');
  const fresh = pending.filter((c) => c.isNew).length;
  const byCourse = new Map<string, number>();
  pending.forEach((c) => byCourse.set(c.courseKey, (byCourse.get(c.courseKey) ?? 0) + 1));
  const enrolled = catalog.enrolled.length > 0;

  if (!daily.cards.length)
    return (
      <section className="box today" aria-label="Ôn hôm nay">
        <Bar>Ôn hôm nay</Bar>
        <div className="body">
          <p className="tot">{enrolled ? 'Hôm nay không có thẻ đến hạn' : 'Bắt đầu một khóa học'}</p>
          <p className="said">
            {enrolled
              ? 'Mọi thẻ đã ôn đều chưa tới hạn. Lật thẻ hoặc làm quiz nếu muốn học thêm.'
              : 'Bật “Đang học” ở một khóa, thẻ của khóa đó sẽ vào phần ôn mỗi ngày.'}
          </p>
          <Link className="btn" to={enrolled ? '/flash' : '/courses'}>
            <span className="go" />
            {enrolled ? 'Lật thẻ' : 'Chọn khóa học'}
          </Link>
        </div>
      </section>
    );

  if (!pending.length)
    return (
      <section className="box today" aria-label="Ôn hôm nay">
        <Bar>Ôn hôm nay</Bar>
        <div className="body">
          <p className="tot">Xong phần hôm nay</p>
          <p className="said">
            Đã ôn <b>{daily.progress.answered} thẻ ✓</b>
          </p>
          <div className="lines">
            <div>
              <span>Ngày mai cần ôn</span>
              <b>{stats ? `${stats.dueTomorrow} thẻ` : '…'}</b>
            </div>
          </div>
          <Link className="xp" to="/flash">
            Lật thẻ thêm
          </Link>
        </div>
      </section>
    );

  return (
    <section className="box today" aria-label="Ôn hôm nay">
      <Bar>Ôn hôm nay</Bar>
      <div className="body">
        <p className="tot">
          {pending.length} thẻ cần ôn hôm nay ({pending.length - fresh} ôn lại, {fresh} mới)
        </p>
        <div className="lines">
          {[...byCourse].map(([key, n]) => (
            <div key={key}>
              <SubjectTag subject={catalog.subjectOf(key)} />
              <span>{catalog.course(key)?.title ?? key}</span>
              <b>{n}</b>
            </div>
          ))}
        </div>
        <div className="act">
          <Link className="btn" to="/learn/daily">
            <span className="go" />
            {daily.progress.answered ? 'Học tiếp' : 'Bắt đầu học'}
          </Link>
          <span className="meta">khoảng {Math.max(1, Math.round(pending.length * 0.5))} phút</span>
        </div>
      </div>
    </section>
  );
}

function Continue({ reading, catalog }: { reading: ReadingView; catalog: Catalog }) {
  const pct = Math.round(reading.position * 100);
  return (
    <section className="box continue">
      <Bar>{reading.position > 0 ? 'Đọc tiếp' : 'Đọc bài tiếp theo'}</Bar>
      <div className="body">
        <Link className="t" to={`/lesson/${reading.lesson.id}`} state={{ position: reading.position }}>
          {reading.lesson.title}
        </Link>
        <p className="from">
          <SubjectTag subject={catalog.subjectOf(reading.course.key)} />
          {reading.course.title}
        </p>
        {reading.position > 0 ? (
          <div className="prog">
            <div className="xpbar">
              <i style={{ width: `${pct}%` }} />
            </div>
            <span>Đã đọc {pct}%</span>
          </div>
        ) : (
          reading.lesson.summary && <p className="muted small" style={{ margin: 0 }}>{reading.lesson.summary}</p>
        )}
      </div>
    </section>
  );
}

/** A course on a list: how much is learned, what is due today. */
function CourseItem({ course: c }: { course: CourseSummary }) {
  const total = c.counts.cards || c.counts.items;
  const due = c.counts.dueToday;
  return (
    <li>
      <Link to={`/course/${c.key}`}>
        <span className="t">{c.title}</span>
        <span className={`due${c.enrolled && due ? '' : ' zero'}`} title="Đến hạn hôm nay">
          {!c.enrolled ? 'Chưa bắt đầu' : due ? `${due} đến hạn` : 'Không có thẻ đến hạn'}
        </span>
        <span className="meter">
          <span className="xpbar thin">
            <i style={{ width: `${total ? (c.counts.review / total) * 100 : 0}%` }} />
          </span>
          <span>
            {c.counts.review}/{total} thẻ đã thuộc
          </span>
        </span>
      </Link>
    </li>
  );
}

/** A concept's question cut to its subject, so the list stays one line per card. */
function shortLabel(label: string): string {
  const cut = label.split(/\s[—–]\s|:\s/)[0].replace(/\?$/, '');
  return cut.length <= 60 ? cut : `${cut.slice(0, 57).replace(/\s+\S*$/, '')}…`;
}

function Weak({ weak }: { weak: LeechView[] }) {
  return (
    <section className="box weak">
      <Bar>Hay quên</Bar>
      <div className="body">
        {weak.length ? (
          <>
            <ul className="dlist">
              {weak.slice(0, 3).map((w) => (
                <li key={`${w.courseKey}:${w.itemKey}:${w.facet}`}>
                  <div className="row weak-li">
                    <span className="w-term">{shortLabel(w.label)}</span>
                    <span className="w-facet">{FACET_LABEL[w.facet]}</span>
                    <span className="w-count">sai {w.againCount} lần</span>
                  </div>
                </li>
              ))}
            </ul>
            <Link className="xp wide" to="/learn/weak" state={{ back: '/' }}>
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

const WEEK_HEAD = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/** The last 30 days as a calendar; darker means more cards reviewed. */
function Days({ stats }: { stats: StatsView }) {
  const days = stats.reviewsByDay;
  if (!days.length) return null;
  const offset = (new Date(`${days[0].day}T00:00:00`).getDay() + 6) % 7;
  const lvl = (n: number) => (n === 0 ? '' : n < 8 ? 'l1' : n < 13 ? 'l2' : n < 18 ? 'l3' : 'l4');
  return (
    <section className="box cal">
      <Bar>30 ngày qua</Bar>
      <div className="body">
        <div className="cal-grid">
          {WEEK_HEAD.map((d) => (
            <b key={d}>{d}</b>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <i key={`blank-${i}`} className="blank" />
          ))}
          {days.map((d, i) => (
            <i key={d.day} className={`${lvl(d.reviews)}${i === days.length - 1 ? ' today' : ''}`} title={`${dayLabel(d.day)}: ${d.reviews} thẻ`}>
              {dayOfMonth(d.day)}
            </i>
          ))}
        </div>
        <p className="cal-note">Mỗi ô là một ngày, đậm hơn là ôn nhiều thẻ hơn.</p>
        <p className="cal-foot">
          <span>{stats.streakDays} ngày liên tiếp</span>
          <span>Kỷ lục {stats.bestStreakDays} ngày</span>
        </p>
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
  const list = catalog.enrolled.length ? catalog.enrolled : catalog.all;

  return (
    <Screen tab="home" quick>
      <header className="top">
        <div>
          <p className="hello">
            {greeting()}, {LEARNER_NAME}
          </p>
          <h1 className="h1">{todayLabel()}</h1>
        </div>
        <Week stats={stats.data} />
      </header>
      {daily.error && !daily.data ? (
        <NoteCard error action={<button className="btn" onClick={() => daily.refetch()}>Thử lại</button>}>
          Không tải được phần ôn hôm nay. {daily.error.message}
        </NoteCard>
      ) : (
        <div className="home">
          <div className="c-today">{daily.data && !catalogPending ? <Today daily={daily.data} stats={stats.data} catalog={catalog} /> : <Waiting tall />}</div>
          <div className="c-main col">
            {reading.data?.reading && <Continue reading={reading.data.reading} catalog={catalog} />}
            {list.length > 0 && (
              <section className="box course-rows">
                <Bar
                  right={
                    <Link className="r" to="/courses">
                      Tất cả khóa học
                    </Link>
                  }
                >
                  {catalog.enrolled.length ? 'Đang học' : 'Khóa học có sẵn'}
                </Bar>
                <div className="body">
                  <ul className="topics">
                    {list.map((c) => (
                      <CourseItem key={c.key} course={c} />
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </div>
          <div className="c-side col">
            {weak.data && <Weak weak={weak.data} />}
            {stats.data && <Days stats={stats.data} />}
          </div>
        </div>
      )}
    </Screen>
  );
}
