import type { RatingValue, SessionCardView, SessionView } from '@learn/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api, ApiError } from '../api';
import { Dot, NoteCard, Strip, Waiting } from '../components/Bits';
import { FlashBack, FlashFront } from '../components/Question';
import { Screen } from '../components/Screen';
import { courseShort, subStyle, useCatalog, type Catalog } from '../lib/catalog';
import { untilLabel } from '../lib/format';
import { RATING_FALLBACK, RATING_LABEL, RATINGS } from '../lib/labels';
import { clientId } from '../lib/motion';
import { makeSwipeable, type SwipeDir } from '../lib/swipe';

/* Flashcards for one course: tap to turn over, swipe right (remember), left (forgot), up (easy). */

const DIR_OF: Record<RatingValue, SwipeDir> = { 1: 'left', 2: 'right', 3: 'right', 4: 'up' };
const RATING_OF: Record<SwipeDir, RatingValue> = { left: 1, right: 3, up: 4 };

interface TopHandle {
  fling: (dir: SwipeDir, then: () => void) => void;
  flip: () => void;
}

function TopCard({ card, color, onRate, handle }: { card: SessionCardView; color: string; onRate: (r: RatingValue) => void; handle: RefObject<TopHandle | null> }) {
  const ref = useRef<HTMLDivElement>(null);
  const stamps = useRef<Record<SwipeDir, HTMLSpanElement | null>>({ left: null, right: null, up: null });
  const [flipped, setFlipped] = useState(false);
  const rate = useRef(onRate);
  rate.current = onRate;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sw = makeSwipeable(el, {
      onTap: () => setFlipped((f) => !f),
      onDrag: (dx, dy, p) => {
        const up = dy < -20 && Math.abs(dy) > Math.abs(dx);
        const s = stamps.current;
        if (s.right) s.right.style.opacity = String(!up && dx > 0 ? p : 0);
        if (s.left) s.left.style.opacity = String(!up && dx < 0 ? p : 0);
        if (s.up) s.up.style.opacity = String(up ? Math.min(1, -dy / 160) : 0);
      },
      onSwipe: (dir) => rate.current(RATING_OF[dir]),
    });
    handle.current = {
      fling: (dir, then) => {
        const s = stamps.current[dir];
        if (s) s.style.opacity = '1';
        sw.fling(dir, then);
      },
      flip: () => setFlipped((f) => !f),
    };
    return () => {
      sw.destroy();
      handle.current = null;
    };
  }, [card.id, handle]);
  return (
    <div ref={ref} className={`fcard${flipped ? ' flipped' : ''}`} style={subStyle(color)}>
      <Faces card={card} />
      <span className="fstamp left" ref={(e) => void (stamps.current.left = e)}>
        Quên
      </span>
      <span className="fstamp right" ref={(e) => void (stamps.current.right = e)}>
        Nhớ
      </span>
      <span className="fstamp up" ref={(e) => void (stamps.current.up = e)}>
        Dễ
      </span>
    </div>
  );
}

function Faces({ card }: { card: SessionCardView }) {
  return (
    <div className="inner">
      <div className="face front">
        <FlashFront card={card} />
        <span className="hint">Chạm để lật</span>
      </div>
      <div className="face back">
        <FlashBack card={card} />
      </div>
    </div>
  );
}

function Deck({ initial, catalog, onRestart }: { initial: SessionView; catalog: Catalog; onRestart: () => void }) {
  const [view, setView] = useState(initial);
  const [rated, setRated] = useState<Set<number>>(() => new Set());
  const [counts, setCounts] = useState<Record<RatingValue, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const [error, setError] = useState<string | null>(null);
  const top = useRef<TopHandle | null>(null);
  const shownAt = useRef(Date.now());
  const pending = view.cards.filter((c) => c.status === 'pending' && !rated.has(c.id));
  const visible = pending.slice(0, 3);
  const current = visible[0] ?? null;

  useEffect(() => {
    shownAt.current = Date.now();
  }, [current?.id]);

  const rate = (card: SessionCardView, r: RatingValue) => {
    setRated((s) => new Set(s).add(card.id));
    setCounts((c) => ({ ...c, [r]: c[r] + 1 }));
    setError(null);
    api
      .answer(view.id, { sessionCardId: card.id, rating: r, timeMs: Date.now() - shownAt.current, clientId: clientId() })
      .then((res) => (res.requeuedCardId ? api.session(view.id).then(setView) : undefined))
      .catch((e: unknown) => {
        setRated((s) => {
          const next = new Set(s);
          next.delete(card.id);
          return next;
        });
        setCounts((c) => ({ ...c, [r]: c[r] - 1 }));
        setError(e instanceof ApiError ? e.message : 'Không lưu được thẻ vừa chấm.');
      });
  };
  const press = (r: RatingValue) => {
    if (!current) return;
    if (top.current) top.current.fling(DIR_OF[r], () => rate(current, r));
    else rate(current, r);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        top.current?.flip();
      }
      if (['1', '2', '3', '4'].includes(e.key)) press(Number(e.key) as RatingValue);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  const courseColor = catalog.colorOf(view.course?.key ?? '');
  if (!current)
    return (
      <>
        <div className="deck-area">
          <div className="card done-card" style={{ position: 'absolute', inset: 0 }}>
            <Strip parts={[{ color: courseColor, n: 1 }]} />
            <h2 className="display" style={{ fontSize: 28 }}>
              Hết bộ thẻ
            </h2>
            <div className="lines">
              {RATINGS.map((r) => (
                <div key={r}>
                  <span>{RATING_LABEL[r]}</span>
                  <b>{counts[r]}</b>
                </div>
              ))}
            </div>
            <button className="btn wide" onClick={onRestart}>
              Học lại bộ này
            </button>
          </div>
        </div>
      </>
    );

  return (
    <>
      <div className="deck-area">
        {[...visible].reverse().map((card) => {
          const depth = visible.indexOf(card);
          const color = catalog.colorOf(card.courseKey);
          return depth === 0 ? (
            <TopCard key={card.id} card={card} color={color} onRate={(r) => rate(card, r)} handle={top} />
          ) : (
            <div key={card.id} className={`fcard under-${depth}`} style={subStyle(color)} aria-hidden="true">
              <Faces card={card} />
            </div>
          );
        })}
      </div>
      <div className="deck-actions">
        <p className="deck-left">{error ?? `Còn ${pending.length} thẻ`}</p>
        <div className="q-rate">
          {RATINGS.map((r) => (
            <button key={r} className="q-rate-btn" data-rating={r} onClick={() => press(r)}>
              <span className="q-rate-label">{RATING_LABEL[r]}</span>
              <span className="q-rate-next">{untilLabel(current.ratingDue?.[r]) || RATING_FALLBACK[r]}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export function Flash() {
  const { key, sessionId } = useParams();
  const navigate = useNavigate();
  const { catalog, isPending, error: catalogError, refetch: refetchCatalog } = useCatalog();
  const creating = useRef<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const chipsRef = useRef<HTMLDivElement>(null);

  // /flash: open the first course being studied
  useEffect(() => {
    if (key || isPending) return;
    const first = catalog.enrolled[0] ?? catalog.all[0];
    if (first) navigate(`/flash/${first.key}`, { replace: true });
  }, [key, isPending, catalog, navigate]);

  // /flash/:course: deal a fresh deck, then give it its own address so a reload keeps it
  useEffect(() => {
    if (!key || sessionId || creating.current === key) return;
    creating.current = key;
    setError(null);
    api
      .createSession({ mode: 'flashcard', courseKey: key, facets: ['recognize', 'recall'], size: 30 })
      .then((s) => navigate(`/flash/${key}/${s.id}`, { replace: true }))
      .catch((e) => {
        setError(e);
        creating.current = null;
      });
  }, [key, sessionId, navigate, attempt]);

  const id = sessionId ? Number(sessionId) : null;
  const q = useQuery({ queryKey: ['session', id], queryFn: () => api.session(id!), enabled: id !== null, staleTime: 0, gcTime: 0 });

  useEffect(() => {
    chipsRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [key, isPending]);

  return (
    <Screen tab="flash">
      <header className="top">
        <div>
          <h1 className="display h1">Thẻ</h1>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            Chạm để lật. Vuốt phải là nhớ, trái là quên, lên là dễ.
          </p>
        </div>
      </header>
      <div className="deck-chips" ref={chipsRef}>
        {catalog.all.map((c) => (
          <button key={c.key} aria-pressed={c.key === key} onClick={() => c.key !== key && navigate(`/flash/${c.key}`)}>
            <Dot color={catalog.colorOf(c.key)} />
            {courseShort(c.title)}
          </button>
        ))}
      </div>
      {catalogError && !catalog.all.length ? (
        <div className="deck-area" style={{ height: 'auto' }}>
          <NoteCard error action={<button className="btn" onClick={() => refetchCatalog()}>Thử lại</button>}>
            {catalogError.message}
          </NoteCard>
        </div>
      ) : !isPending && !catalog.all.length ? (
        <div className="deck-area" style={{ height: 'auto' }}>
          <NoteCard>Chưa có khóa học nào để lật thẻ.</NoteCard>
        </div>
      ) : error ? (
        <div className="deck-area" style={{ height: 'auto' }}>
          <NoteCard
            error={!(error instanceof ApiError && error.status === 422)}
            action={error instanceof ApiError && error.status === 422 ? undefined : <button className="btn" onClick={() => setAttempt((n) => n + 1)}>Thử lại</button>}
          >
            {error instanceof ApiError && error.status === 422 ? 'Khóa này chưa có thẻ nào để lật.' : error instanceof ApiError ? error.message : 'Có lỗi xảy ra.'}
          </NoteCard>
        </div>
      ) : q.data ? (
        <Deck
          key={q.data.id}
          initial={q.data}
          catalog={catalog}
          onRestart={() => {
            creating.current = null;
            navigate(`/flash/${key}`);
          }}
        />
      ) : q.error ? (
        <NoteCard error action={<button className="btn" onClick={() => q.refetch()}>Thử lại</button>}>
          {q.error.message}
        </NoteCard>
      ) : (
        <div className="deck-area">
          <Waiting tall />
        </div>
      )}
    </Screen>
  );
}
