/* The demo's line icons, as JSX. */
const P: Record<string, JSX.Element> = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  photos: <><rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-8 8" /></>,
  journal: <><path d="M6 3h9l4 4v14H6z" /><path d="M9 11h7M9 15h7M9 19h4" /></>,
  angels: <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />,
  fantasy: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5l4 3-1.5 4.7h-5L8 10.5z" /></>,
  games: <><rect x="2" y="7" width="20" height="11" rx="5" /><path d="M7 11v4M5 13h4M16 12h.01M18 14h.01" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  dice: <><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="9" cy="9" r="1.1" /><circle cx="15" cy="15" r="1.1" /><circle cx="15" cy="9" r="1.1" /><circle cx="9" cy="15" r="1.1" /></>,
};
export const Icon = ({ name }: { name: string }) => <span className="ico"><svg viewBox="0 0 24 24">{P[name]}</svg></span>;
