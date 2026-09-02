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

/* One shell, two rooms. Reading routes sit in Rosé Pine with a 700px column;
   the photo routes switch to the neutral palette and let the column run wide. */
export default function Shell() {
  const { pathname } = useLocation();
  const photos = pathname.startsWith('/photos');

  useEffect(() => {
    document.documentElement.dataset.theme = photos ? 'photos' : 'main';
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', photos ? '#F5F5F4' : '#191724');
  }, [photos]);

  const { data: persons } = useQuery({ queryKey: ['persons'], queryFn: api.persons, staleTime: 10 * 60_000 });
  const me = persons?.find(p => p.isSelf);

  return (
    <div className={clsx(
      'mx-auto px-[18px] md:grid md:gap-12 lg:gap-16 md:pt-11',
      photos ? 'max-w-[1560px] md:grid-cols-[220px_minmax(0,1fr)]' : 'max-w-[1120px] md:grid-cols-[250px_minmax(0,700px)]',
    )}>
      <aside className="md:sticky md:top-11 md:self-start">
        <div className="flex items-center gap-3 border-b border-line py-4 md:flex-col md:items-start md:gap-4 md:border-0 md:py-0 md:pb-6">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-raise md:h-16 md:w-16">
            {me?.avatarUrl && <img src={cdn(me.avatarUrl, 160)} alt="" className="h-full w-full object-cover" />}
          </div>
          <div>
            <NavLink to="/" className="font-display text-xl font-bold tracking-[-0.02em] md:text-2xl">Sonic Hub</NavLink>
            <p className="hidden text-sm leading-relaxed text-ink2 md:block md:max-w-[22em] md:pt-2">
              Ghi lại những gì tôi thích: ảnh cũ, game, bóng đá, và vài người từng quen.
            </p>
          </div>
        </div>
        <nav className="-mx-[18px] flex gap-[18px] overflow-x-auto whitespace-nowrap px-[18px] pt-3 text-[14px] font-medium text-ink2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:flex-col md:gap-[10px] md:border-t md:border-line md:px-0 md:pt-[18px] md:text-[15px]">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => clsx('py-1 transition-colors hover:text-ink', isActive && 'text-accent hover:text-accent')}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 pb-20 pt-6 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
