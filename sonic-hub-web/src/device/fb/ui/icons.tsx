/* Icons drawn for this portal (no network's own marks). Each takes the current colour. */
import type { ReactNode } from 'react';

const S = ({ children, size = 16, fill = false, className }: { children: ReactNode; size?: number; fill?: boolean; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

type P = { size?: number; className?: string };

export const IHome = (p: P) => <S {...p}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 9.5V20h5v-5.5h3V20h5V9.5" /></S>;
export const IFriends = (p: P) => <S {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.6 6.5-5.6s5.9 2 6.5 5.6" /><circle cx="17" cy="9" r="2.6" /><path d="M16.5 14.3c2.6.1 4.4 1.7 5 4.7" /></S>;
export const IChat = (p: P) => <S {...p}><path d="M12 3.5c-5 0-9 3.6-9 8.1 0 2.5 1.2 4.7 3.2 6.2V21l3-1.7c.9.3 1.8.4 2.8.4 5 0 9-3.6 9-8.1S17 3.5 12 3.5Z" /><path d="m7.5 13.5 3-3.2 2.4 2.2 3.6-3.6" /></S>;
export const IBell = (p: P) => <S {...p}><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15Z" /><path d="M10 20.5a2.2 2.2 0 0 0 4 0" /></S>;
export const ISearch = (p: P) => <S {...p}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.6-4.6" /></S>;
export const IGlobe = (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18" /></S>;
export const ILock = (p: P) => <S {...p}><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" /></S>;
export const IPeople = IFriends;
export const IThumb = (p: P) => <S {...p}><path d="M7.5 10.5v10H4.5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z" /><path d="M7.5 10.5 11 3.6c1.5 0 2.6 1.2 2.4 2.7l-.5 3.7h5.4a2 2 0 0 1 2 2.4l-1.4 6.4a2 2 0 0 1-2 1.7H7.5" /></S>;
export const IComment = (p: P) => <S {...p}><path d="M20.5 11.5c0 4.2-3.8 7.5-8.5 7.5-1.1 0-2.2-.2-3.2-.5L4 20.5l1.3-3.7C4.2 15.5 3.5 13.6 3.5 11.5 3.5 7.3 7.3 4 12 4s8.5 3.3 8.5 7.5Z" /></S>;
export const IShare = (p: P) => <S {...p}><path d="M14 4.5 21 11l-7 6.5v-4C8.5 13.5 5.5 15.5 3 20c.5-6 3.6-10.5 11-11Z" /></S>;
export const IPin = (p: P) => <S {...p}><path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21Z" /><circle cx="12" cy="9.8" r="2.4" /></S>;
export const IWork = (p: P) => <S {...p}><rect x="3" y="7.5" width="18" height="12.5" rx="2" /><path d="M8.5 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v2M3 13h18" /></S>;
export const ISchool = (p: P) => <S {...p}><path d="m2.5 9 9.5-4.5L21.5 9 12 13.5Z" /><path d="M6.5 11v4.5c1.5 1.6 3.5 2.4 5.5 2.4s4-.8 5.5-2.4V11M21.5 9v5" /></S>;
export const IHouse = (p: P) => <S {...p}><path d="M4 10.5 12 4l8 6.5V20H4Z" /><path d="M10 20v-5h4v5" /></S>;
export const IHeart = (p: P) => <S {...p}><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" /></S>;
export const IClock = (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></S>;
export const ICake = (p: P) => <S {...p}><path d="M4 20.5h16v-7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2Z" /><path d="M4 15.5c2 1.3 4 1.3 6 0s4-1.3 6 0 2.7 1 4 0M12 11.5V8" /><path d="M12 5.2c.8-.8.8-1.7 0-2.7-.8 1-.8 1.9 0 2.7Z" /></S>;
export const IFlag = (p: P) => <S {...p}><path d="M5 21V4M5 4.5h12l-2 4 2 4H5" /></S>;
export const IStar = (p: P) => <S {...p}><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8Z" /></S>;
export const ILink = (p: P) => <S {...p}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1" /></S>;
export const IQuote = (p: P) => <S {...p}><path d="M9.5 7.5H5.5v5h4c0 2-1 3.5-3 4M18.5 7.5h-4v5h4c0 2-1 3.5-3 4" /></S>;
export const IPhoto = (p: P) => <S {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-8 8" /></S>;
export const INote = (p: P) => <S {...p}><path d="M6 3.5h9l3.5 3.5v13.5H6Z" /><path d="M14.5 3.5V7.5h4M9 12h6M9 15.5h6" /></S>;
export const IBack = (p: P) => <S {...p}><path d="m15 5-7 7 7 7" /></S>;
export const INext = (p: P) => <S {...p}><path d="m9 5 7 7-7 7" /></S>;
export const IPrev = IBack;
export const IClose = (p: P) => <S {...p}><path d="M6 6l12 12M18 6 6 18" /></S>;
export const IDice = (p: P) => <S {...p}><rect x="4" y="4" width="16" height="16" rx="3.5" /><circle cx="9" cy="9" r=".9" fill="currentColor" /><circle cx="15" cy="15" r=".9" fill="currentColor" /><circle cx="15" cy="9" r=".9" fill="currentColor" /><circle cx="9" cy="15" r=".9" fill="currentColor" /><circle cx="12" cy="12" r=".9" fill="currentColor" /></S>;
export const ILatest = (p: P) => <S {...p}><path d="M5 5v14M9 12h10M15 8l4 4-4 4" /></S>;
export const IDots = (p: P) => <S {...p} fill><circle cx="5.5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="18.5" cy="12" r="1.7" /></S>;
export const IInfo = (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.6v.2" /></S>;
export const IGroup = (p: P) => <S {...p}><circle cx="12" cy="8" r="3.2" /><circle cx="5.5" cy="10" r="2.4" /><circle cx="18.5" cy="10" r="2.4" /><path d="M6.5 19.5c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5M1.8 18c.4-2.2 1.7-3.4 3.6-3.6M22.2 18c-.4-2.2-1.7-3.4-3.6-3.6" /></S>;
export const IPage = IFlag;
export const IFile = (p: P) => <S {...p}><path d="M6 3.5h8l4 4v13H6Z" /><path d="M14 3.5v4h4" /></S>;
export const IPlay = (p: P) => <S {...p} fill><path d="M8 5.5v13l11-6.5Z" /></S>;

/** The small round reaction badges under a post. */
export function ReactionIcon({ type, size = 16 }: { type: string; size?: number }) {
  const face: Record<string, string> = { HAHA: '😆', WOW: '😮', SAD: '😢', ANGRY: '😡', CARE: '🤗' };
  if (type === 'LOVE')
    return <svg width={size} height={size} viewBox="0 0 16 16" className="rx-ico" aria-label="Love"><circle cx="8" cy="8" r="8" fill="#f25268" /><path d="M8 12s-3.6-2.2-3.6-4.8A1.9 1.9 0 0 1 8 6.1a1.9 1.9 0 0 1 3.6 1.1C11.6 9.8 8 12 8 12Z" fill="#fff" /></svg>;
  if (face[type]) return <span className="rx-ico rx-face" style={{ width: size, height: size, fontSize: size - 2 }} aria-label={type.toLowerCase()}>{face[type]}</span>;
  return <svg width={size} height={size} viewBox="0 0 16 16" className="rx-ico" aria-label="Like"><circle cx="8" cy="8" r="8" fill="#4a86f7" /><path d="M5 7.4h1.6v4.4H5zM6.6 7.4l1.6-3c.7 0 1.2.5 1.1 1.2l-.2 1.5h2.3a.9.9 0 0 1 .9 1.1l-.6 2.6a.9.9 0 0 1-.9.7H6.6" fill="#fff" /></svg>;
}
