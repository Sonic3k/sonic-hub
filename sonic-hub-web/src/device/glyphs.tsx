/* Desktop icons: a glyph name says what the thing is (a folder, a document, a browser globe, a chat smiley…) and the
   label under it says what he called it. On a machine they are the system's own icons and the programs' icons of that
   year (skin.tsx), from the files he gathered; what has none is drawn here (48×48). */
import { useId, type ReactNode } from 'react';
import { useAssets } from './assets';
import { iconFiles, iconOf, iconSet, useIconCtx } from './skin';

type G = (id: string) => ReactNode;

const lin = (id: string, a: string, b: string, x2 = 0, y2 = 1) =>
  <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>;
const rad = (id: string, a: string, b: string, cx = .35, cy = .3) =>
  <radialGradient id={id} cx={cx} cy={cy} r=".8"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></radialGradient>;

const shade = <ellipse cx="24" cy="44.5" rx="17" ry="2.2" fill="rgba(0,0,0,.18)" />;

function folder(id: string, a = '#ffe08a', b = '#f1b52e', inner?: ReactNode) {
  return <>
    <defs>{lin(`${id}f`, a, b)}{lin(`${id}b`, '#f4c652', '#d99a1c')}</defs>
    {shade}
    <path d="M4 12a3 3 0 0 1 3-3h11l4 4h19a3 3 0 0 1 3 3v24a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill={`url(#${id}b)`} />
    <rect x="7" y="15" width="34" height="18" rx="1.5" fill="#fff" opacity=".92" />
    <path d="M4 19a3 3 0 0 1 3-3h34a3 3 0 0 1 3 3v21a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill={`url(#${id}f)`} />
    <path d="M5 20h38" stroke="#fff" strokeOpacity=".55" />
    {inner}
  </>;
}

function doc(id: string, band: string, mark?: ReactNode) {
  return <>
    <defs>{lin(`${id}p`, '#ffffff', '#e8edf4')}</defs>
    {shade}
    <path d="M10 4h20l9 9v29a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill={`url(#${id}p)`} stroke="#9aa6b5" />
    <path d="M30 4v9h9" fill="#dfe5ee" stroke="#9aa6b5" />
    <g stroke="#b9c3cf" strokeWidth="1.6"><path d="M13 20h18M13 24h20M13 28h17M13 32h19" /></g>
    {band && <rect x="8" y="34" width="31" height="10" rx="1.5" fill={band} />}
    {mark}
  </>;
}

function globe(id: string, a: string, b: string, ring?: string) {
  return <>
    <defs>{rad(`${id}g`, a, b)}</defs>
    {shade}
    <circle cx="24" cy="23" r="17" fill={`url(#${id}g)`} />
    <g fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="1.4">
      <ellipse cx="24" cy="23" rx="7.5" ry="17" /><path d="M7 23h34M9.5 14h29M9.5 32h29" />
    </g>
    {ring && <path d="M5 30c8 9 30 9 39-6" stroke={ring} strokeWidth="3.5" fill="none" strokeLinecap="round" />}
    <ellipse cx="18" cy="13" rx="8" ry="4" fill="#fff" opacity=".35" />
  </>;
}

function tile(id: string, a: string, b: string, inner: ReactNode, r = 9) {
  return <>
    <defs>{lin(`${id}t`, a, b)}</defs>
    {shade}
    <rect x="5" y="4" width="38" height="38" rx={r} fill={`url(#${id}t)`} />
    <path d={`M5 ${4 + r}a${r} ${r} 0 0 1 ${r}-${r}h${38 - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v6H5z`} fill="#fff" opacity=".18" />
    {inner}
  </>;
}

const W = '#fff';
const GLYPHS: Record<string, G> = {
  computer: id => <>
    <defs>{lin(`${id}s`, '#5aa0e8', '#1c4fa3')}{lin(`${id}c`, '#e9edf2', '#b7c0cb')}</defs>
    {shade}
    <rect x="5" y="6" width="38" height="27" rx="2.5" fill={`url(#${id}c)`} stroke="#8a95a3" />
    <rect x="8" y="9" width="32" height="21" rx="1" fill={`url(#${id}s)`} />
    <path d="M9 10l14 0-14 11z" fill="#fff" opacity=".22" />
    <path d="M19 33h10l2 6H17z" fill="#aab3bf" /><rect x="12" y="39" width="24" height="3.5" rx="1.5" fill="#c9d0d9" stroke="#8a95a3" />
  </>,
  documents: id => folder(id, '#ffe08a', '#f1b52e', <g transform="translate(14 22)"><rect width="20" height="15" rx="1" fill="#fff" stroke="#c9a23c" /><path d="M3 4h14M3 8h14M3 12h9" stroke="#9fb0c4" strokeWidth="1.4" /></g>),
  folder: id => folder(id),
  'user-folder': id => folder(id, '#ffe08a', '#f1b52e', <g transform="translate(17 22)"><circle cx="7" cy="5" r="4.5" fill="#6b8fc7" /><path d="M0 16c0-5 3-7.5 7-7.5s7 2.5 7 7.5z" fill="#6b8fc7" /></g>),
  'folder-pictures': id => folder(id, '#ffe08a', '#f1b52e', <g transform="translate(13 22)"><rect width="22" height="16" rx="1.5" fill="#fff" stroke="#c9a23c" /><path d="M2 14l6-7 5 5 3-3 4 5z" fill="#55a35a" /><circle cx="16" cy="5" r="2.4" fill="#f3b32f" /></g>),
  'folder-music': id => folder(id, '#ffe08a', '#f1b52e', <g transform="translate(17 21)" fill="#4f6fa8"><path d="M5 2l11-2v13a3.5 3 0 1 1-2-2.7V4L7 5.3V15a3.5 3 0 1 1-2-2.7z" /></g>),
  'heart-folder': id => folder(id, '#ffd3dd', '#ef7f9a', <path d="M24 38s-9-5.5-9-11a4.8 4.8 0 0 1 9-2.4A4.8 4.8 0 0 1 33 27c0 5.5-9 11-9 11z" fill="#e23d62" />),
  recycle: id => <>
    <defs>{lin(`${id}r`, '#f4f7fb', '#b8c4d3', 1, 0)}</defs>
    {shade}
    <path d="M12 12h24l-3 30H15z" fill={`url(#${id}r)`} stroke="#7f8da0" />
    <ellipse cx="24" cy="12" rx="12.5" ry="3.5" fill="#dfe6ef" stroke="#7f8da0" />
    <g stroke="#9aa8b9" strokeWidth="1.5"><path d="M19 18l1 20M24 18v20M29 18l-1 20" /></g>
    <path d="M18 27a6 6 0 0 1 10-4l1.5-1.5M30 29a6 6 0 0 1-10 4l-1.5 1.5" stroke="#3aa05a" strokeWidth="2" fill="none" />
  </>,
  network: id => globe(id, '#9ed3ff', '#2f6fbe', undefined),
  control: id => tile(id, '#7fb2ec', '#2e64b5', <g stroke={W} strokeWidth="2.4" strokeLinecap="round"><path d="M15 14v20M24 14v20M33 14v20" /><g fill={W}><circle cx="15" cy="28" r="3.3" /><circle cx="24" cy="18" r="3.3" /><circle cx="33" cy="25" r="3.3" /></g></g>),
  'globe-blue': id => globe(id, '#8fd0ff', '#1655b6', '#f1c232'),
  'globe-orange': id => globe(id, '#7fb7ff', '#1d3e9b', '#f28a1d'),
  'globe-multi': id => globe(id, '#a6e3a1', '#1f8f5f', '#3d7fd6'),
  'globe-teal': id => globe(id, '#7fe7da', '#0b6f8e', '#23c4a3'),
  'im-smile': id => <>
    <defs>{rad(`${id}y`, '#fff6a6', '#f1b20b')}</defs>
    {shade}
    <circle cx="24" cy="22" r="17" fill={`url(#${id}y)`} stroke="#c98a05" />
    <g fill="#4b2c0a"><ellipse cx="18" cy="18" rx="2.2" ry="3.4" /><ellipse cx="30" cy="18" rx="2.2" ry="3.4" /></g>
    <path d="M14.5 25c2.8 6 16.2 6 19 0" stroke="#4b2c0a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <ellipse cx="17" cy="11" rx="6" ry="3" fill="#fff" opacity=".5" />
  </>,
  'chat-blue': id => tile(id, '#5fb4ff', '#0a6ad6', <path d="M24 12c-7.7 0-14 5.3-14 11.8 0 3.5 1.8 6.6 4.7 8.8L14 38l6-3.2c1.3.4 2.6.6 4 .6 7.7 0 14-5.3 14-11.8S31.7 12 24 12z" fill={W} />, 11),
  'phone-bubble': id => tile(id, '#5ec8f5', '#0b80c8', <path d="M18 14c1.5 0 2.5 3.5 2.5 4.6 0 1.4-2 2-2 3.2 0 2 4.7 6.7 6.7 6.7 1.2 0 1.8-2 3.2-2 1.1 0 4.6 1 4.6 2.5 0 2.1-2.6 4.5-5 4.5C21.4 33.5 14.5 26.6 14.5 19c0-2.4 2.4-5 3.5-5z" fill={W} />, 21),
  sms: id => tile(id, '#77e07a', '#21a438', <path d="M24 12c-7.7 0-14 5-14 11.3 0 3.6 2 6.7 5.3 8.8L14 37l6.3-3c1.2.3 2.4.4 3.7.4 7.7 0 14-5 14-11.1S31.7 12 24 12z" fill={W} />, 11),
  fb: id => tile(id, '#5d7ec7', '#2f4f96', <g fill={W}><circle cx="19" cy="19" r="4.6" /><path d="M10.5 34c0-6 3.8-9 8.5-9s8.5 3 8.5 9z" /><circle cx="30.5" cy="20.5" r="3.6" opacity=".8" /><path d="M27 34c0-1 0-2-.4-3 1.2-2.4 2.6-3.4 4-3.4 3.7 0 6.4 2.4 6.4 6.4z" opacity=".8" /></g>, 8),
  'doc-blue': id => doc(id, '#2b5fb4'),
  'sheet-green': id => doc(id, '#2c8a4a', <g stroke="#2c8a4a" strokeWidth="1"><path d="M13 18h22v14H13zM13 22.5h22M13 27h22M20 18v14M27.5 18v14" fill="none" /></g>),
  'slides-orange': id => doc(id, '#d2552b', <rect x="13" y="17" width="21" height="13" rx="1" fill="#f6c5ae" stroke="#d2552b" />),
  pdf: id => doc(id, '#c9302c'),
  text: id => doc(id, ''),
  notepad: () => <>
    {shade}
    <rect x="9" y="7" width="30" height="36" rx="2" fill="#fdfdf5" stroke="#8d9aa8" />
    <rect x="9" y="7" width="30" height="7" rx="2" fill="#6aa0dc" />
    <g stroke="#c6cfd9" strokeWidth="1.3"><path d="M13 20h22M13 25h22M13 30h22M13 35h15" /></g>
    <g fill="#506276"><circle cx="15" cy="7" r="1.7" /><circle cx="21" cy="7" r="1.7" /><circle cx="27" cy="7" r="1.7" /><circle cx="33" cy="7" r="1.7" /></g>
  </>,
  sticky: id => <>
    <defs>{lin(`${id}k`, '#fff7a8', '#f8de4f')}</defs>
    {shade}
    <path d="M8 7h32v24l-9 11H8z" fill={`url(#${id}k)`} stroke="#d4b42b" />
    <path d="M40 31h-9v11z" fill="#e6c83c" />
    <g stroke="#9c8a2e" strokeWidth="1.4" opacity=".7"><path d="M13 16h21M13 21h21M13 26h15" /></g>
  </>,
  notes: id => tile(id, '#fff27a', '#f4c51d', <g stroke="#8a6d0a" strokeWidth="1.8" opacity=".75"><path d="M13 17h22M13 23h22M13 29h16" /></g>, 9),
  image: () => <>
    {shade}
    <rect x="6" y="9" width="36" height="30" rx="2" fill="#fff" stroke="#8d9aa8" />
    <rect x="9" y="12" width="30" height="24" fill="#bfe3ff" /><path d="M9 36l9-12 7 8 5-5 9 9z" fill="#4e9f50" /><circle cx="31" cy="18" r="3" fill="#f3b32f" />
  </>,
  photos: () => <>
    {shade}
    <rect x="12" y="6" width="28" height="22" rx="2" fill="#fff" stroke="#9aa6b5" transform="rotate(8 26 17)" />
    <rect x="7" y="13" width="30" height="26" rx="2" fill="#fff" stroke="#8d9aa8" />
    <rect x="10" y="16" width="24" height="18" fill="#9fd1ff" /><path d="M10 34l7-9 5 6 4-4 8 7z" fill="#4e9f50" /><circle cx="28" cy="21" r="2.4" fill="#f3b32f" />
  </>,
  gallery: id => tile(id, '#ffb36b', '#e8562a', <><path d="M10 34l8-10 6 7 5-5 9 8z" fill={W} /><circle cx="30" cy="16" r="3.5" fill={W} /></>, 9),
  film: () => <>
    {shade}
    <rect x="7" y="9" width="34" height="30" rx="2" fill="#2f3a48" />
    <g fill="#d7dde5">{[12, 18, 24, 30, 36].map(y => <g key={y}><rect x="9" y={y - 1.5} width="3" height="3" /><rect x="36" y={y - 1.5} width="3" height="3" /></g>)}</g>
    <rect x="14" y="12" width="20" height="24" fill="#6fa8dc" /><path d="M21 19l8 5-8 5z" fill="#fff" />
  </>,
  media: id => <>
    <defs>{rad(`${id}m`, '#9be06a', '#1f7a2c')}</defs>
    {shade}
    <circle cx="24" cy="23" r="17" fill={`url(#${id}m)`} /><path d="M20 15l12 8-12 8z" fill="#fff" />
  </>,
  music: id => tile(id, '#ff8fb1', '#e2336d', <path d="M19 14l14-3v17a4 3.5 0 1 1-2.5-3.2V16.5L21.5 18.4V31a4 3.5 0 1 1-2.5-3.2z" fill={W} />, 9),
  wave: id => tile(id, '#8fa3bf', '#3b4f6e', <path d="M10 24h4l2-7 3 14 3-18 3 20 3-13 2 6 3-4h5" stroke={W} strokeWidth="2" fill="none" strokeLinejoin="round" />, 6),
  game: id => <>
    <defs>{lin(`${id}p`, '#7c8a9c', '#3d4757')}</defs>
    {shade}
    <path d="M14 15h20c5 0 8 5 8.5 12.5.4 6-3.6 8.2-6.4 5L32 28H16l-4.1 4.5c-2.8 3.2-6.8 1-6.4-5C6 20 9 15 14 15z" fill={`url(#${id}p)`} />
    <path d="M14 20v7M10.5 23.5h7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="32" cy="21.5" r="2.1" fill="#f15a5a" /><circle cx="36" cy="25.5" r="2.1" fill="#4fb3f4" />
  </>,
  /* a DOS program on Windows: the black screen with its prompt */
  dos: id => <>
    <defs>{lin(`${id}f`, '#e9edf2', '#b7c0cb')}</defs>
    {shade}
    <rect x="5" y="8" width="38" height="31" rx="2" fill={`url(#${id}f)`} stroke="#8a95a3" />
    <rect x="5" y="8" width="38" height="6" rx="2" fill="#1f3f9e" /><rect x="8" y="17" width="32" height="19" fill="#0b0b0b" />
    <path d="M11 22h3.5M11 22v4h3.5M17 26.5h1.2M17 22.5h1.2M20.5 21.8l3 2.6-3 2.6" stroke="#d8d8d8" strokeWidth="1.4" fill="none" />
    <rect x="25" y="25.2" width="4.5" height="1.6" fill="#d8d8d8" />
  </>,
  /* Minesweeper's mine */
  mine: id => <>
    <defs>{rad(`${id}m`, '#5d6470', '#0e1014')}</defs>
    {shade}
    <g stroke="#15181d" strokeWidth="3" strokeLinecap="round"><path d="M24 7v34M7 24h34M12 12l24 24M36 12L12 36" /></g>
    <circle cx="24" cy="24" r="12" fill={`url(#${id}m)`} />
    <rect x="18.5" y="17.5" width="4.5" height="4.5" rx="1" fill="#fff" />
  </>,
  /* Lines: the balls on their board */
  lines: id => <>
    <defs>{lin(`${id}g`, '#d9dde3', '#a9b1bc')}</defs>
    {shade}
    <rect x="5" y="6" width="38" height="36" rx="2.5" fill={`url(#${id}g)`} stroke="#7d8794" />
    <g stroke="#8d96a2" strokeWidth="1"><path d="M17.7 6v36M30.3 6v36M5 18h38M5 30h38" /></g>
    <circle cx="11.4" cy="12" r="4.4" fill="#e23b3b" /><circle cx="24" cy="24" r="4.4" fill="#2f74e0" /><circle cx="36.6" cy="36" r="4.4" fill="#2fb34a" />
    <circle cx="36.6" cy="12" r="4.4" fill="#f2c230" /><circle cx="10.2" cy="10.8" r="1.4" fill="#fff" opacity=".6" />
  </>,
  'game-boom': id => <>
    <defs>{rad(`${id}b`, '#6a7383', '#14181f')}</defs>
    {shade}
    <circle cx="22" cy="27" r="14" fill={`url(#${id}b)`} />
    <rect x="25" y="9" width="7" height="7" rx="1.5" transform="rotate(35 28 12)" fill="#8a93a3" />
    <path d="M32 8c3-4 7-2 8 1" stroke="#c98a3a" strokeWidth="2" fill="none" />
    <g fill="#ffcf3f"><circle cx="41" cy="9" r="2.2" /><path d="M41 3l1 3.5L45 8l-3.4 1L41 13l-.8-4L37 8l3.2-1.6z" /></g>
    <ellipse cx="17" cy="21" rx="4.5" ry="3" fill="#fff" opacity=".35" />
  </>,
  chess: () => <>
    {shade}
    <path d="M17 41h14l-1.5-5h-11zM19 36h10l-1-10h-8z" fill="#2c3440" />
    <circle cx="24" cy="18" r="6" fill="#2c3440" /><rect x="18" y="24" width="12" height="3" rx="1.5" fill="#2c3440" />
    <ellipse cx="22" cy="16" rx="2.5" ry="1.6" fill="#fff" opacity=".35" />
  </>,
  paint: () => <>
    {shade}
    <path d="M24 7C13 7 6 14.5 6 23c0 9 7.5 15 15 15 3 0 3.6-2 2.6-3.7-1.4-2.5.3-4.3 3-4.3H31c6 0 11-3.6 11-9.6C42 12.6 34 7 24 7z" fill="#f2e2c4" stroke="#b98d4b" />
    <circle cx="15" cy="20" r="3" fill="#e2453c" /><circle cx="21" cy="14" r="3" fill="#f2b12a" /><circle cx="30" cy="14" r="3" fill="#3aa757" /><circle cx="35" cy="21" r="3" fill="#2f7be5" />
  </>,
  app: id => <>
    <defs>{lin(`${id}a`, '#f3f6fa', '#c5cfdb')}</defs>
    {shade}
    <rect x="6" y="8" width="36" height="31" rx="3" fill={`url(#${id}a)`} stroke="#7f8da0" />
    <rect x="6" y="8" width="36" height="7" rx="3" fill="#4f7fc0" /><rect x="11" y="20" width="12" height="9" rx="1" fill="#9fb8d8" /><path d="M27 21h10M27 25h10M27 29h7" stroke="#9aa6b5" strokeWidth="1.6" />
  </>,
  code: id => tile(id, '#5b6b84', '#27303e', <path d="M18 17l-7 7 7 7M30 17l7 7-7 7M27 13l-6 22" stroke="#8fd3ff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />, 7),
  shield: id => <>
    <defs>{lin(`${id}s`, '#ff8a6b', '#c62f1f')}</defs>
    {shade}
    <path d="M24 5l15 5v11c0 10-6.5 17-15 21C15.5 38 9 31 9 21V10z" fill={`url(#${id}s)`} /><path d="M17 23l5 5 9-10" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
  </>,
  help: id => <>
    <defs>{rad(`${id}h`, '#8fd0ff', '#1655b6')}</defs>
    {shade}
    <circle cx="24" cy="23" r="17" fill={`url(#${id}h)`} /><path d="M19 18a5 5 0 1 1 7 4.6c-1.5.7-2 1.6-2 3.4" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" /><circle cx="24" cy="32" r="2" fill="#fff" />
  </>,
  book: () => <>
    {shade}
    <path d="M9 9h13a4 4 0 0 1 4 4v28a3 3 0 0 0-3-3H9z" fill="#3f8ad8" /><path d="M39 9H26a4 4 0 0 0-4 4v28a3 3 0 0 1 3-3h14z" fill="#2a6cb6" />
    <path d="M12 15h7M12 20h7M29 15h7M29 20h7" stroke="#fff" strokeOpacity=".6" strokeWidth="1.6" />
  </>,
  mail: () => <>
    {shade}
    <rect x="6" y="11" width="36" height="26" rx="2" fill="#fff" stroke="#8d9aa8" /><path d="M7 12l17 13 17-13" stroke="#5b86c6" strokeWidth="2" fill="none" />
  </>,
  keyboard: () => <>
    {shade}
    <rect x="4" y="15" width="40" height="19" rx="3" fill="#dfe5ec" stroke="#7f8da0" />
    <g fill="#9aa6b5">{[0, 1, 2, 3, 4, 5, 6].map(i => <rect key={i} x={8 + i * 4.7} y="19" width="3.4" height="3" rx=".6" />)}{[0, 1, 2, 3, 4, 5].map(i => <rect key={i} x={10 + i * 4.7} y="24" width="3.4" height="3" rx=".6" />)}</g>
    <rect x="14" y="29" width="20" height="2.6" rx=".8" fill="#9aa6b5" />
  </>,
  phone: id => tile(id, '#7fe08a', '#24a043', <path d="M18 13c1.6 0 2.8 4 2.8 5.2 0 1.6-2.2 2.2-2.2 3.6 0 2.2 5.4 7.6 7.6 7.6 1.4 0 2-2.2 3.6-2.2 1.2 0 5.2 1.2 5.2 2.8 0 2.4-3 5-5.6 5C21 35 13 27 13 18.6c0-2.6 2.6-5.6 5-5.6z" fill={W} />, 9),
  remote: () => <>
    {shade}
    <rect x="4" y="9" width="22" height="16" rx="1.5" fill="#4f8fe0" stroke="#2a5fa8" /><rect x="22" y="21" width="22" height="16" rx="1.5" fill="#6fb3f7" stroke="#2a5fa8" />
    <path d="M26 14h7v4M20 32h-7v-4" stroke="#1f3f73" strokeWidth="2" fill="none" />
  </>,
  archive: id => <>
    <defs>{lin(`${id}z`, '#c9a6e8', '#7a4fb0')}</defs>
    {shade}
    <rect x="9" y="8" width="30" height="34" rx="2" fill={`url(#${id}z)`} /><path d="M24 8v34" stroke="#f6e7ff" strokeWidth="3" strokeDasharray="2.4 2.4" /><rect x="20" y="20" width="8" height="6" rx="1" fill="#f6e7ff" />
  </>,
  calendar: () => <>
    {shade}
    <rect x="7" y="9" width="34" height="32" rx="3" fill="#fff" stroke="#8d9aa8" /><rect x="7" y="9" width="34" height="10" rx="3" fill="#e2453c" />
    <g fill="#9aa6b5">{[0, 1, 2, 3].map(r => [0, 1, 2, 3, 4].map(c => <rect key={`${r}${c}`} x={11 + c * 5.8} y={22 + r * 4.6} width="3.6" height="2.8" rx=".5" />))}</g>
  </>,
  clock: () => <>
    {shade}
    <circle cx="24" cy="23" r="17" fill="#fff" stroke="#5a6676" strokeWidth="2.4" />
    <g stroke="#2d3540" strokeLinecap="round"><path d="M24 23V12" strokeWidth="2.4" /><path d="M24 23l7 4" strokeWidth="2.4" /></g><circle cx="24" cy="23" r="1.8" fill="#e2453c" />
  </>,
  contacts: id => tile(id, '#b4bcc8', '#6c7787', <g fill={W}><circle cx="24" cy="19" r="6" /><path d="M13 36c0-7 5-10 11-10s11 3 11 10z" /></g>, 9),
  settings: id => tile(id, '#aab4c2', '#5f6b7c', <g fill="none" stroke={W} strokeWidth="3"><circle cx="24" cy="23" r="5" /><path d="M24 11v4M24 31v4M12 23h4M32 23h4M15.5 14.5l2.8 2.8M29.7 28.7l2.8 2.8M15.5 31.5l2.8-2.8M29.7 17.3l2.8-2.8" strokeLinecap="round" /></g>, 9),
  camera: id => tile(id, '#a9b2bf', '#525d6c', <><rect x="11" y="17" width="26" height="17" rx="3" fill={W} /><circle cx="24" cy="25.5" r="5.5" fill="#525d6c" /><rect x="19" y="13" width="10" height="5" rx="1.5" fill={W} /></>, 9),
  compass: id => tile(id, '#e9f4ff', '#a9c9ee', <><circle cx="24" cy="23" r="12.5" fill="none" stroke="#3d7fd6" strokeWidth="2" /><path d="M24 23l7-7-3 10z" fill="#e2453c" /><path d="M24 23l-7 7 3-10z" fill="#9aa6b5" /></>, 9),
  bag: id => tile(id, '#72c9f0', '#1b84c4', <path d="M14 18h20l-2 17H16zM19 18a5 5 0 0 1 10 0" stroke={W} strokeWidth="2.4" fill="none" />, 6),
  forum: () => <>
    {shade}
    <path d="M6 10h24a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H15l-6 5v-5H6a2 2 0 0 1-2-2V12a2 2 0 0 1 2-2z" fill="#4f8fe0" />
    <path d="M20 20h22a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2v5l-6-5H20a2 2 0 0 1-2-2V22a2 2 0 0 1 2-2z" fill="#f2a43b" />
  </>,
  blog: () => <>
    {shade}
    <rect x="8" y="7" width="28" height="35" rx="2" fill="#fff" stroke="#8d9aa8" /><g stroke="#b9c3cf" strokeWidth="1.5"><path d="M12 14h20M12 19h20M12 24h14" /></g>
    <path d="M30 40l12-12 3 3-12 12-4 1z" fill="#f2a43b" stroke="#a96a12" />
  </>,
  star: id => tile(id, '#5a2a6b', '#1e0f2a', <path d="M24 11l3.6 7.8 8.4.9-6.3 5.7 1.8 8.3L24 29.4l-7.5 4.3 1.8-8.3-6.3-5.7 8.4-.9z" fill="#f7d36b" />, 9),
  ball: () => <>
    {shade}
    <circle cx="24" cy="23" r="17" fill="#fff" stroke="#2d3540" strokeWidth="1.6" />
    <path d="M24 15l7 5-2.7 8h-8.6L17 20z" fill="#2d3540" /><path d="M24 6v9M31 20l9-3M28.3 28l5 7.5M19.7 28l-5 7.5M17 20l-9-3" stroke="#2d3540" strokeWidth="1.6" />
  </>,
};

/** Programs whose own icon is among the assets (folder, small one for 16 px, large one): drawn only until it comes. */
const OWN: Record<string, [folder: string, small: string, large: string]> = {
  'im-smile': ['yahoo', 'icon/messenger-16.png', 'icon/messenger-256.png'],
};

/** Icon by glyph name (and the item's name, which tells which program it is); on a machine, the system's own icon or the
 *  program's icon of that year when there is one; anything unknown is a plain program icon. */
export function Glyph({ name, size = 32, className, label }: { name?: string | null; size?: number; className?: string; label?: string }) {
  const own = OWN[name ?? ''];
  const pick = iconOf(name, label, useIconCtx());
  if (own) return <OwnIcon own={own} name={name!} size={size} className={className} />;
  if (pick) return <AssetIcon folder={pick[0]} base={pick[1]} name={name} size={size} className={className} />;
  return <Drawn name={name} size={size} className={className} />;
}

function AssetIcon({ folder, base, name, size, className }: { folder: string; base: string; name?: string | null; size: number; className?: string }) {
  const { a, map } = useAssets(folder);
  const files = iconFiles(map, base.startsWith('icon/') ? base : `icon/${base}`, size);
  if (!files) return <Drawn name={name} size={size} className={className} />;
  return <img className={`dv-own-icon ${className ?? ''}`} src={a(files.one)} srcSet={iconSet(files, a)} width={size} height={size} alt="" draggable={false} />;
}

function Drawn({ name, size, className }: { name?: string | null; size: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  const draw = GLYPHS[name ?? ''] ?? GLYPHS.app;
  return <svg className={className} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">{draw(id)}</svg>;
}

function OwnIcon({ own: [folder, small, large], name, size, className }: { own: [string, string, string]; name: string; size: number; className?: string }) {
  const { a } = useAssets(folder);
  const src = a(size <= 16 ? small : large);
  if (!src) return <Drawn name={name} size={size} className={className} />;
  return <img className={`dv-own-icon ${className ?? ''}`} src={src} width={size} height={size} alt="" draggable={false} />;
}

/** The power mark that stands where a system's own logo would: a ring with a spark, his own. */
export function Mark({ size = 18, color = '#fff' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" fill="none" stroke={color} strokeWidth="2.6" />
    <path d="M12 2.5l1.8 4.2L18 8.5l-4.2 1.8L12 14.5l-1.8-4.2L6 8.5l4.2-1.8z" fill={color} />
  </svg>;
}
