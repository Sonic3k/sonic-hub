import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

const TABS = [
  { to: '/photos', label: 'Thư mục', end: true },
  { to: '/photos/timeline', label: 'Dòng thời gian', end: false },
];

/* Two ways into the same photographs: by the folders they were put in, or by
   the day they were taken. Folder sub-routes keep the first tab lit. */
export default function PhotosNav({ inFolder = false }: { inFolder?: boolean }) {
  return (
    <div className="mb-5 flex gap-5 border-b border-line text-[14px] font-medium text-ink2">
      {TABS.map(t => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) => clsx('-mb-px border-b-2 pb-2.5 transition-colors hover:text-ink',
            (isActive || (inFolder && t.end)) ? 'border-ink text-ink' : 'border-transparent')}
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  );
}
