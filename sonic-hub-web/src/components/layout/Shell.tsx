import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { api } from '../../api/angels';
import { cdn } from '../../api/client';

const NAV = [
  { to: '/articles', label: 'Bài viết' },
  { to: '/photos',   label: 'Ảnh' },
  { to: '/angels',   label: 'Angels' },
  { to: '/games',    label: 'Game' },
  { to: '/football', label: 'Bóng đá' },
];

/* One header for every room, always the same width and the same item spacing,
   so nothing moves when you cross from words to photographs. Only the column
   under it changes: a reading measure for text, the full width for photos. */
export default function Shell() {
  const { pathname } = useLocation();
  const photos = pathname.startsWith('/photos');

  useEffect(() => {
    document.documentElement.dataset.theme = photos ? 'photos' : 'main';
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', photos ? '#F5F5F4' : '#FAF4ED');
  }, [photos]);

  const { data: persons } = useQuery({ queryKey: ['persons'], queryFn: api.persons, staleTime: 10 * 60_000 });
  const me = persons?.find(p => p.isSelf);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur-sm transition-colors">
        <div className="mx-auto max-w-[1560px] px-[18px] md:flex md:h-14 md:items-center md:justify-between md:gap-8">
          <NavLink to="/" className="flex h-12 items-center gap-2.5 md:h-auto">
            <span className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-raise">
              {me?.avatarUrl && <img src={cdn(me.avatarUrl, 160)} alt="" className="h-full w-full object-cover" />}
            </span>
            <span className="font-display text-[19px] font-bold tracking-[-0.02em]">Sonic Hub</span>
          </NavLink>
          <nav className="-mx-[18px] flex h-10 items-stretch gap-6 overflow-x-auto px-[18px] text-[14.5px] font-medium text-ink2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:h-14 md:px-0">
            {NAV.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) => clsx(
                  'flex items-center whitespace-nowrap border-b-2 transition-colors hover:text-ink',
                  isActive ? 'border-ink text-ink' : 'border-transparent',
                )}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className={clsx('mx-auto min-w-0 px-[18px] pb-20 pt-7 md:pt-10', photos ? 'max-w-[1560px]' : 'max-w-[760px]')}>
        <Outlet />
      </main>
    </>
  );
}
