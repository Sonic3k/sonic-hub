import type { ItemView, LessonDetail } from '@learn/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { api } from '../api';
import { Bar, Md, NoteCard, SubjectTag, Waiting } from '../components/Bits';
import { QuizBubbleIcon } from '../components/Icons';
import { Screen } from '../components/Screen';
import { courseShort, subStyle, useCatalog } from '../lib/catalog';
import { mountSlides, type SlideDeckApi } from '../lib/slides';

/* A lesson: read it, step through its slides, watch its video, or skim its cards — then quiz it. */

type TabKey = 'read' | 'slides' | 'video' | 'cards';

/** Slides keep the subject's colours but take the portal's type. */
const SLIDE_TYPE = 'section, h2 { font-family: Verdana, "DejaVu Sans", Geneva, sans-serif; } h2 { font-weight: bold; }';

/** A short name for an item: the word, or a concept's question cut to its subject. */
function itemLabel(it: ItemView): string {
  if (it.vocab) return it.vocab.term;
  const text = (it.frontMd ?? it.key).replace(/[*_`#>]/g, '').replace(/<[^>]+>/g, '').trim();
  const cut = text.split(/\s[—–]\s|:\s/)[0].replace(/\?$/, '');
  return cut.length <= 60 ? cut : `${cut.slice(0, 57).replace(/\s+\S*$/, '')}…`;
}

function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

function Slides({ lesson, onProgress }: { lesson: LessonDetail; onProgress: (index: number, count: number) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<SlideDeckApi | null>(null);
  const [state, setState] = useState({ index: 0, count: 0, title: '' });
  const progress = useRef(onProgress);
  progress.current = onProgress;
  useEffect(() => {
    if (!hostRef.current || !lesson.slidesHtml) return;
    deckRef.current = mountSlides(
      hostRef.current,
      lesson.slidesHtml,
      lesson.themeCss,
      (s) => {
        setState({ index: s.index, count: s.count, title: s.title });
        progress.current(s.index, s.count);
      },
      SLIDE_TYPE,
    );
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as Element).matches('input, textarea')) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        deckRef.current?.next();
      }
      if (e.key === 'ArrowLeft') deckRef.current?.prev();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [lesson.slidesHtml, lesson.themeCss]);
  return (
    <section className="box slides-box">
      <Bar right={state.count ? <span className="r">{`${state.index + 1}/${state.count}`}</span> : undefined}>{state.title || `Slide ${state.index + 1}`}</Bar>
      <div className="body">
        <div className="slides-host" ref={hostRef} tabIndex={0} aria-label="Slide, chạm để xem tiếp" onClick={() => deckRef.current?.next()} />
        <div className="slides-ctl">
          <button type="button" className="xp" onClick={() => deckRef.current?.prev()}>
            ‹ Lùi
          </button>
          <div className="pages">
            {Array.from({ length: state.count }, (_, i) => (
              <button key={i} type="button" className={i === state.index ? 'now' : undefined} aria-label={`Slide ${i + 1}`} onClick={() => deckRef.current?.goto(i)}>
                {i + 1}
              </button>
            ))}
          </div>
          <button type="button" className="xp" onClick={() => deckRef.current?.next()}>
            Tiếp ›
          </button>
        </div>
      </div>
    </section>
  );
}

export function Lesson() {
  const { id } = useParams();
  const lessonId = Number(id);
  const location = useLocation();
  const startAt = (location.state as { position?: number } | null)?.position ?? 0;
  const queryClient = useQueryClient();
  const { catalog } = useCatalog();
  const q = useQuery({ queryKey: ['lesson', lessonId], queryFn: () => api.lesson(lessonId) });
  const l = q.data;
  const tabs = l
    ? ([l.bodyMd && ['read', 'Bài đọc'], l.slidesHtml && ['slides', 'Slide'], l.videoUrl && ['video', 'Video'], ['cards', `Thẻ (${l.items.length})`]].filter(Boolean) as [TabKey, string][])
    : [];
  const [chosen, setChosen] = useState<TabKey | null>(null);
  const tab: TabKey | null = chosen ?? tabs[0]?.[0] ?? null;
  const articleRef = useRef<HTMLElement>(null);
  const exposed = useRef(false);
  const sentAt = useRef(-1);
  const best = useRef(0);

  /** The learner has read the lesson's items: Daily hands them out first. */
  const expose = () => {
    if (exposed.current || !l?.items.length) return;
    exposed.current = true;
    void api.expose(l.items.map((i) => i.key)).catch(() => (exposed.current = false));
  };
  const saveProgress = (position: number) => {
    if (Math.abs(position - sentAt.current) < 0.02) return;
    sentAt.current = position;
    void api
      .saveProgress(lessonId, Math.round(position * 100) / 100)
      .then(() => queryClient.invalidateQueries({ queryKey: ['reading'] }))
      .catch(() => (sentAt.current = -1));
  };

  // reading: remember how far down the article the learner has seen
  useEffect(() => {
    if (tab !== 'read' || !l) return;
    let timer = 0;
    const measure = () => {
      const el = articleRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const seen = Math.min(1, Math.max(0, (innerHeight - r.top) / r.height));
      if (seen > best.current) best.current = seen;
      if (seen >= 0.9) expose();
      clearTimeout(timer);
      timer = window.setTimeout(() => saveProgress(best.current), 1200);
    };
    addEventListener('scroll', measure, { passive: true });
    measure();
    return () => {
      removeEventListener('scroll', measure);
      clearTimeout(timer);
      if (best.current > 0) saveProgress(best.current);
    };
  }, [tab, l]);

  // "continue reading": come back to where the learner stopped
  useLayoutEffect(() => {
    if (tab !== 'read' || !l || startAt < 0.05 || startAt >= 0.95) return;
    const el = articleRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    scrollTo({ top: Math.max(0, scrollY + r.top + startAt * r.height - innerHeight * 0.85) });
  }, [l]);

  useEffect(() => {
    if (tab === 'cards') expose();
  }, [tab]);

  const crumbs = (
    <nav className="crumbs" aria-label="Đường dẫn">
      <Link to="/courses">Khóa học</Link>
      {l && (
        <>
          <span className="gt">{'>>'}</span>
          <Link to={`/course/${l.course.key}`}>{courseShort(l.course.title)}</Link>
        </>
      )}
    </nav>
  );

  if (!l)
    return (
      <Screen tab="courses">
        {crumbs}
        {q.error ? (
          <NoteCard error action={<button className="btn" onClick={() => q.refetch()}>Thử lại</button>}>
            {q.error.message}
          </NoteCard>
        ) : (
          <Waiting tall />
        )}
      </Screen>
    );

  const color = catalog.colorOf(l.course.key);
  const quiz = { pathname: `/learn/lesson/${l.id}`, search: `?course=${encodeURIComponent(l.course.key)}` };
  const quizState = { back: `/lesson/${l.id}` };
  const embed = l.videoUrl ? youtubeEmbed(l.videoUrl) : null;

  return (
    <Screen tab="courses">
      {crumbs}
      <div className="lesson-wrap" style={subStyle(color)}>
        <div>
          <header className="lesson-head">
            <p className="chap">
              <SubjectTag subject={catalog.subjectOf(l.course.key)} />
              {l.chapter.title}
            </p>
            <h1 className="h1">{l.title}</h1>
            {l.summary && <p>{l.summary}</p>}
          </header>
          {tabs.length > 1 && (
            <div className="strip-tabs" role="tablist" aria-label="Cách học bài này">
              {tabs.map(([k, t]) => (
                <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setChosen(k)}>
                  {t}
                </button>
              ))}
            </div>
          )}
          {tab === 'read' && (
            <article className="sheet" ref={articleRef}>
              <Md className="reading" src={l.bodyMd} />
            </article>
          )}
          {tab === 'slides' && (
            <Slides
              lesson={l}
              onProgress={(i, n) => {
                if (n) saveProgress((i + 1) / n);
                if (i === n - 1) expose();
              }}
            />
          )}
          {tab === 'video' && l.videoUrl && (
            <section className="box video-box">
              <Bar>Video</Bar>
              <div className="body">
                {embed ? (
                  <iframe src={embed} title={l.title} allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
                ) : (
                  <a className="btn" href={l.videoUrl} target="_blank" rel="noopener">
                    <span className="go" />
                    Mở video
                  </a>
                )}
              </div>
            </section>
          )}
          {tab === 'cards' &&
            (l.items.length ? (
              <>
                <p className="muted small skim-note">Xem lướt: các thẻ đã xem sẽ được đưa vào Hôm nay trước.</p>
                <div className="skim">
                  {l.items.map((it) => (
                    <div key={it.key} className="cell">
                      {it.vocab ? (
                        <>
                          <p className="t" lang="en">
                            {it.vocab.term}
                          </p>
                          <p className="m">{it.vocab.meaning}</p>
                        </>
                      ) : (
                        <Md className="t concept" src={it.frontMd} />
                      )}
                      {it.noteMd && <Md className="note" src={it.noteMd} />}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <NoteCard>Bài này chưa có thẻ nào.</NoteCard>
            ))}
          {l.items.length > 0 && (
            <div className="sticky-cta mobile-only">
              <Link className="btn" to={quiz} state={quizState}>
                <span className="go" />
                Quiz phần này
              </Link>
            </div>
          )}
        </div>
        <aside className="lesson-side">
          {l.items.length > 0 && (
            <section className="box gold side-quiz">
              <Bar icon={<QuizBubbleIcon />} tone="gold">
                Quiz phần này
              </Bar>
              <div className="body">
                <p>Câu hỏi về {l.items.length} thẻ trong bài. Không cần đọc hết trước.</p>
                <Link className="btn wide" to={quiz} state={quizState}>
                  <span className="go" />
                  Bắt đầu quiz
                </Link>
              </div>
            </section>
          )}
          {l.items.length > 0 && (
            <section className="box in-lesson">
              <Bar>Trong bài</Bar>
              <div className="body">
                <ul className="dlist">
                  {l.items.map((it) => (
                    <li key={it.key}>
                      <span className="row">{itemLabel(it)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </aside>
      </div>
    </Screen>
  );
}
