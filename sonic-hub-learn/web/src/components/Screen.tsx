import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router';
import { BooksIcon, CardsIcon, TodayIcon } from './Icons';

export type Tab = 'home' | 'courses' | 'flash';

function Nav({ tab }: { tab: Tab | null }) {
  const item = (key: Tab, to: string, label: string, icon: ReactNode) => (
    <Link to={to} className={tab === key ? 'on' : undefined} aria-current={tab === key ? 'page' : undefined}>
      {icon}
      <span>{label}</span>
    </Link>
  );
  return (
    <nav className="nav" aria-label="Điều hướng chính">
      <div className="nav-in">
        {item('home', '/', 'Hôm nay', <TodayIcon />)}
        {item('courses', '/courses', 'Khóa học', <BooksIcon />)}
        {item('flash', '/flash', 'Thẻ', <CardsIcon />)}
      </div>
    </nav>
  );
}

/** One page of the app. Focus screens (studying, exams) hide the navigation. */
export function Screen({ children, tab = null, focus = false }: { children: ReactNode; tab?: Tab | null; focus?: boolean }) {
  useEffect(() => {
    scrollTo(0, 0);
  }, []);
  return (
    <>
      <main className={`screen${focus ? ' focus' : ''}`}>{children}</main>
      {!focus && <Nav tab={tab} />}
    </>
  );
}
