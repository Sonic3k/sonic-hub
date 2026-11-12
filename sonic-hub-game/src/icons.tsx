/* The portal's few icons, drawn on a 24 grid with square joins so they sit with the hard-edged steel around them. */
import type { ReactNode } from 'react';
import type { Input } from './taxonomy';

const Svg = ({ children, size = 22 }: { children: ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"
    strokeLinejoin="miter" aria-hidden="true" focusable="false">{children}</svg>
);

export const PlayIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 3v18l15-9z" fill="currentColor" /></svg>
);

export const AnotherIcon = ({ size = 20 }: { size?: number }) => (
  <Svg size={size}><path d="M4 8h13l-3-3M20 16H7l3 3" /></Svg>
);

const Round = ({ children }: { children: ReactNode }) => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false">{children}</svg>
);
const Keyboard = () => <Svg><path d="M2 6h20v12H2zM6 10h1M10 10h1M14 10h1M18 10h0M7 14h10" /></Svg>;
const Gamepad = () => <Round><path d="M7 7h10a5 5 0 0 1 5 5v2.5a3 3 0 0 1-5.4 1.8L15.5 15h-7l-1.1 1.3A3 3 0 0 1 2 14.5V12a5 5 0 0 1 5-5zM7.5 10v3M6 11.5h3M15.5 10.5h.01M18 12.5h.01" /></Round>;
const Touch = () => <Round><path d="M9 11.5V5.5a1.5 1.5 0 0 1 3 0V11l4.800 1a1.5 1.5 0 0 1 1.200 1.5V16l-1.300 5H10l-4.200-5.300a1.300 1.300 0 0 1 1.900-1.800L9 15.200M5.5 7a5 5 0 0 1 2-4M15.5 7a5 5 0 0 0-2-4" /></Round>;
const Mouse = () => <Round><path d="M6 10a6 6 0 0 1 12 0v5a6 6 0 0 1-12 0zM12 4v6M6 10h12" /></Round>;

export const InputIcon = ({ kind }: { kind: Input }) =>
  kind === 'keyboard' ? <Keyboard /> : kind === 'gamepad' ? <Gamepad /> : kind === 'touch' ? <Touch /> : <Mouse />;

export const SearchIcon = ({ size = 20 }: { size?: number }) => <Svg size={size}><path d="M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13zM15.5 15.5L20 20" /></Svg>;
export const CloseIcon = ({ size = 18 }: { size?: number }) => <Svg size={size}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const ChevronIcon = ({ size = 16 }: { size?: number }) => <Svg size={size}><path d="M6 9l6 6l6-6" /></Svg>;
export const UpIcon = ({ size = 18 }: { size?: number }) => <Svg size={size}><path d="M12 19V6M6 11l6-6l6 6" /></Svg>;
export const TilesIcon = ({ size = 20 }: { size?: number }) => <Svg size={size}><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></Svg>;
export const ListIcon = ({ size = 20 }: { size?: number }) => <Svg size={size}><path d="M4 6h16M4 12h16M4 18h16" /></Svg>;
/** a five-point star: outlined, or filled when `on` */
export const StarIcon = ({ size = 20, on = false }: { size?: number; on?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 2.8l2.8 5.9l6.4.8l-4.7 4.4l1.2 6.3L12 17.1l-5.7 3.1l1.2-6.3L2.8 9.5l6.4-.8z" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"
      strokeLinejoin="miter" />
  </svg>
);

/** The portal's mark: a bolt head with a play arrow cut into it. */
export const Mark = ({ size = 30 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
    <path d="M10 2h12l8 8v12l-8 8H10l-8-8V10z" fill="#04061F" />
    <path d="M11 5h10l6 6v10l-6 6H11l-6-6V11z" fill="#FFD21A" />
    <path d="M11 5h10l1 1H10z" fill="#FFF1A8" />
    <path d="M13 10v12l10-6z" fill="#04061F" />
  </svg>
);
