import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { api } from '../api';
import { courseShort, useCatalog } from '../lib/catalog';
import { APP_NAME, LEARNER_NAME, LEARNER_NICK } from '../lib/labels';
import { Bar } from './Bits';
import { BooksTabIcon, BrandBadge, CardsTabIcon, HouseIcon, TodayTabIcon } from './Icons';

export type Tab = 'home' | 'courses' | 'flash';

function useMedia(query: string): boolean {
  const [match, setMatch] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(query).matches);
  useEffect(() => {
    const m = matchMedia(query);
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
}

/** The glossy tab bar: a dock at the bottom on phones, the top of the frame on wide screens. */
function Tabs({ tab }: { tab: Tab | null }) {
  const item = (key: Tab, to: string, label: string, icon: ReactNode) => (
    <Link to={to} className={tab === key ? 'on' : undefined} aria-current={tab === key ? 'page' : undefined}>
      {icon}
      <span>{label}</span>
    </Link>
  );
  return (
    <nav className="tabs" aria-label="Điều hướng chính">
      {item('home', '/', 'Hôm nay', <TodayTabIcon />)}
      {item('courses', '/courses', 'Khóa học', <BooksTabIcon />)}
      {item('flash', '/flash', 'Thẻ', <CardsTabIcon />)}
    </nav>
  );
}

/** Wide screens: a column of shortcuts beside the overview pages. */
function QuickPanel() {
  const { catalog } = useCatalog();
  const daily = useQuery({ queryKey: ['daily'], queryFn: api.daily });
  const weak = useQuery({ queryKey: ['weak'], queryFn: api.weak });
  const todo = daily.data?.cards.filter((c) => c.status === 'pending').length;
  return (
    <aside className="quick" aria-label="Truy cập nhanh">
      <Bar icon={<HouseIcon />}>Truy cập nhanh</Bar>
      <ul className="dlist">
        <li>
          <Link to="/learn/daily">
            Ôn hôm nay<span className="n">{todo !== undefined ? `(${todo})` : ''}</span>
          </Link>
        </li>
        <li>
          <Link to="/learn/weak" state={{ back: '/' }}>
            Hay quên<span className="n">{weak.data ? `(${weak.data.length})` : ''}</span>
          </Link>
        </li>
        <li>
          <Link to="/flash">Thẻ</Link>
        </li>
        {catalog.all.length > 0 && <li className="sep">Khóa học</li>}
        {catalog.all.map((c) => (
          <li key={c.key}>
            <Link to={`/course/${c.key}`}>
              {courseShort(c.title)}
              <span className="n">{c.enrolled ? `(${c.counts.dueToday})` : ''}</span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/**
 * One page of the app inside the portal frame. Focus screens (studying, exams) drop the tabs (and, on phones,
 * the masthead); `quick` adds the shortcut column on wide screens.
 */
export function Screen({ children, tab = null, focus = false, quick = false }: { children: ReactNode; tab?: Tab | null; focus?: boolean; quick?: boolean }) {
  const wide = useMedia('(min-width: 1180px)');
  useEffect(() => {
    scrollTo(0, 0);
  }, []);
  return (
    <div className={`app${focus ? ' focus-on' : ''}`}>
      <header className="mast">
        <div className="mast-in">
          <Link className="brand" to="/" aria-label={`${APP_NAME}, về trang chính`}>
            <BrandBadge />
            <span className="word">
              <b>{APP_NAME}</b>
              <small>sonic hub</small>
            </span>
          </Link>
        </div>
      </header>
      <div className="frame">
        {!focus && <Tabs tab={tab} />}
        <main className={`screen${focus ? ' s-focus' : ''}`}>
          {quick && wide ? (
            <div className="wrap has-quick">
              <QuickPanel />
              <div className="wrap-main">{children}</div>
            </div>
          ) : (
            children
          )}
        </main>
        <footer className="foot">
          © {new Date().getFullYear()} Sonic Hub | Góc học của {LEARNER_NAME}
          {LEARNER_NICK ? ` (${LEARNER_NICK})` : ''}
        </footer>
      </div>
    </div>
  );
}
