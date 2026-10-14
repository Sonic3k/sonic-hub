/* Icons in the 2007 portal style: small glossy pictures for bars and tiles, white line icons for the tab bar. */

// ---- tab bar (stroked white by CSS)
export const TodayTabIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="5.5" width="16" height="14" rx="2" />
    <path d="M8 3v5M16 3v5M4 10.5h16M9 15l2 2 4-4" />
  </svg>
);
export const BooksTabIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4.5 4h4v16h-4zM9.5 4h4v16h-4zM14.8 5.2l3.7-1 3.2 15.3-3.7 1z" />
  </svg>
);
export const CardsTabIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="7.5" width="13.5" height="12" rx="1.8" />
    <path d="M7 7.5V5.8A1.6 1.6 0 0 1 8.6 4.2h10.8A1.6 1.6 0 0 1 21 5.8v9.9a1.6 1.6 0 0 1-1.6 1.6h-2.9" />
  </svg>
);

/** The white cross on the red close button. */
export const CloseIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

export const SpeakerIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 9v6h4l5 4V5L8 9H4z" />
    <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" strokeLinecap="round" />
  </svg>
);

// ---- section bars
export const FolderIcon = () => (
  <svg className="ic" viewBox="0 0 22 18" aria-hidden="true">
    <path d="M1.5 3.3c0-.8.6-1.4 1.4-1.4h5.2l1.9 1.9h9.1c.8 0 1.4.6 1.4 1.4v10.3c0 .8-.6 1.4-1.4 1.4H2.9c-.8 0-1.4-.6-1.4-1.4z" fill="#D9790F" stroke="#8F4A04" strokeWidth=".7" />
    <rect x="3.6" y="4.4" width="14.8" height="7.4" fill="#E9F6FF" stroke="#7FB2DA" strokeWidth=".6" />
    <path d="M1.5 7.6h19v7.4c0 .8-.6 1.4-1.4 1.4H2.9c-.8 0-1.4-.6-1.4-1.4z" fill="#F59A2A" stroke="#8F4A04" strokeWidth=".7" />
    <path d="M1.9 8.1h18.2v3.1H1.9z" fill="#FFC57A" opacity=".75" />
  </svg>
);
export const HouseIcon = () => (
  <svg className="ic" viewBox="0 0 22 20" aria-hidden="true">
    <path d="M11 2.2 2.4 9.6h2.2v8.6h12.8V9.6h2.2z" fill="#fff" stroke="#0D4A7C" strokeWidth=".9" strokeLinejoin="round" />
    <path d="M11 1.6 1.6 9.6l1.5 1.3L11 4.2l7.9 6.7 1.5-1.3z" fill="#D9452A" stroke="#7E1E08" strokeWidth=".7" strokeLinejoin="round" />
    <rect x="9.1" y="12.2" width="3.8" height="6" fill="#F59A2A" stroke="#8F4A04" strokeWidth=".6" />
    <rect x="5.8" y="11.6" width="2.4" height="2.4" fill="#BFE3FF" stroke="#0D4A7C" strokeWidth=".5" />
  </svg>
);
export const QuizBubbleIcon = () => (
  <svg className="ic" viewBox="0 0 22 20" aria-hidden="true">
    <path d="M11 1.6c-5 0-8.8 3.1-8.8 7.1 0 2.3 1.3 4.4 3.4 5.6l-.9 4.1 4.3-2.8c.7.1 1.3.2 2 .2 5 0 8.8-3.1 8.8-7.1S16 1.6 11 1.6z" fill="#4CB43E" stroke="#22661A" strokeWidth=".8" />
    <path d="M8.6 7.1c0-1.3 1-2.2 2.3-2.2s2.3.8 2.3 2c0 1.7-2.2 1.7-2.2 3.4" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="11" cy="12.9" r="1" fill="#fff" />
  </svg>
);
export const CheckIcon = () => (
  <svg className="ic" viewBox="0 0 22 18" aria-hidden="true">
    <circle cx="11" cy="9" r="7.6" fill="#fff" opacity=".22" />
    <path d="M6.6 9.2l3 3 6-6.2" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const CrossIcon = () => (
  <svg className="ic" viewBox="0 0 22 18" aria-hidden="true">
    <circle cx="11" cy="9" r="7.6" fill="#fff" opacity=".22" />
    <path d="M7.8 5.8l6.4 6.4M14.2 5.8l-6.4 6.4" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);
export const ClockIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10.2" fill="#2E8BCF" stroke="#fff" strokeWidth="1.4" />
    <circle cx="12" cy="12" r="7.6" fill="#EAF6FF" />
    <path d="M12 7v5.2l3.2 2" fill="none" stroke="#0D4A7C" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M5 8.2a8 8 0 0 1 6-4.4" stroke="#fff" strokeWidth="1.2" fill="none" opacity=".7" />
  </svg>
);

// ---- the four ways to study a course (34px tiles)
export const ModeTodayIcon = () => (
  <svg className="ico" viewBox="0 0 34 34" aria-hidden="true">
    <rect x="4" y="6" width="26" height="24" rx="3" fill="#fff" stroke="#5A6B78" />
    <path d="M4 9a3 3 0 0 1 3-3h20a3 3 0 0 1 3 3v4H4z" fill="#D9452A" stroke="#7E1E08" strokeWidth=".8" />
    <path d="M5 9.5a2.5 2.5 0 0 1 2.5-2.5h19A2.5 2.5 0 0 1 29 9.5v1H5z" fill="#F08A6E" opacity=".8" />
    <rect x="9.5" y="3" width="3" height="7" rx="1.2" fill="#C8CDD3" stroke="#6E747A" strokeWidth=".7" />
    <rect x="21.5" y="3" width="3" height="7" rx="1.2" fill="#C8CDD3" stroke="#6E747A" strokeWidth=".7" />
    <path d="M10.5 21l4 4 9-9" fill="none" stroke="#3F9A16" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const ModeQuizIcon = () => (
  <svg className="ico" viewBox="0 0 34 34" aria-hidden="true">
    <path d="M17 3.5c-7.7 0-13.5 4.9-13.5 11 0 3.6 2 6.7 5.2 8.7l-1.4 6.3 6.6-4.3c1 .2 2.1.3 3.1.3 7.7 0 13.5-4.9 13.5-11S24.7 3.5 17 3.5z" fill="#4CB43E" stroke="#22661A" strokeWidth=".9" />
    <path d="M6.5 11.5c1.8-3.8 5.6-5.6 10.5-5.6" stroke="#B9F0A8" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".8" />
    <path d="M13.6 11.6c0-2 1.6-3.4 3.6-3.4s3.6 1.3 3.6 3.1c0 2.6-3.4 2.6-3.4 5.2" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="17.4" cy="20.6" r="1.6" fill="#fff" />
  </svg>
);
export const ModeCardsIcon = () => (
  <svg className="ico" viewBox="0 0 34 34" aria-hidden="true">
    <rect x="9.5" y="4" width="20" height="15" rx="2.2" fill="#BFE3FF" stroke="#2C6EA5" transform="rotate(8 19.5 11.5)" />
    <rect x="4" y="10.5" width="21" height="17" rx="2.2" fill="#FFE14D" stroke="#9C7400" />
    <path d="M5 11.8h19v4H5z" fill="#FFF3A6" opacity=".9" />
    <path d="M8.5 19h12M8.5 23h8" stroke="#9C7400" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
export const ModeExamIcon = ({ className = 'ico' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 34 34" aria-hidden="true">
    <circle cx="17" cy="18" r="13" fill="#2E8BCF" stroke="#0D4A7C" />
    <circle cx="17" cy="18" r="10" fill="#EAF6FF" />
    <path d="M17 11.5V18l4.2 2.6" fill="none" stroke="#0D4A7C" strokeWidth="2.2" strokeLinecap="round" />
    <rect x="14.5" y="1.8" width="5" height="3.6" rx="1" fill="#D9452A" stroke="#7E1E08" strokeWidth=".7" />
    <path d="M8.5 12.5a10 10 0 0 1 6.5-4.4" stroke="#fff" strokeWidth="1.6" fill="none" opacity=".8" strokeLinecap="round" />
  </svg>
);

/** The app's badge: an open book with a star on a glossy blue tile. */
export const BrandBadge = () => (
  <svg className="badge" viewBox="0 0 40 40" aria-hidden="true">
    <defs>
      <linearGradient id="brand-gloss" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8BCBF2" />
        <stop offset=".48" stopColor="#2E8BCF" />
        <stop offset=".5" stopColor="#1767A8" />
        <stop offset="1" stopColor="#2A85C6" />
      </linearGradient>
    </defs>
    <rect x="1" y="1" width="38" height="38" rx="9" fill="url(#brand-gloss)" stroke="#0D4A7C" />
    <path d="M7.5 14.5c4.2-1.5 8.4-1.1 12.5 1.3 4.1-2.4 8.3-2.8 12.5-1.3v14.8c-4.2-1.5-8.4-1.1-12.5 1.3-4.1-2.4-8.3-2.8-12.5-1.3z" fill="#fff" stroke="#0D4A7C" strokeWidth=".7" />
    <path d="M20 15.8v14.6" stroke="#8DB8DA" strokeWidth="1.1" />
    <path d="M10.5 18.5c2.4-.6 4.8-.4 7 .6M10.5 21.5c2.4-.6 4.8-.4 7 .6M22.5 19.1c2.2-1 4.6-1.2 7-.6M22.5 22.1c2.2-1 4.6-1.2 7-.6" stroke="#A9C9E3" strokeWidth="1" fill="none" strokeLinecap="round" />
    <path d="M27.5 4.5l1.9 3.9 4.3.6-3.1 3 .7 4.3-3.8-2-3.8 2 .7-4.3-3.1-3 4.3-.6z" fill="#FF8B1F" stroke="#B85200" strokeWidth=".8" strokeLinejoin="round" />
    <path d="M3 11c0-4.4 3.6-8 8-8h8.5c-5 2.4-11.4 6-16.5 9.6z" fill="#fff" opacity=".3" />
  </svg>
);
