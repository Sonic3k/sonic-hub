/* Desktop pictures. One of his photos when a period had one; otherwise the system's own default picture from the files
   he gathered (skin.tsx WALLPAPER_ASSET), or until it has come — and for the systems whose picture is not among them —
   one drawn here in the spirit of what the machine showed then (a sky over hills, deep space, glass light…). */
import type { CSSProperties, ReactNode } from 'react';
import { cdn } from '../api/client';
import type { Wallpaper as Wp } from './api';
import { useAssets } from './assets';
import { WALLPAPER_ASSET } from './skin';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function stars(n: number, seed: number, maxY = 100, bright = .9) {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const x = r() * 100, y = r() * maxY, s = r();
    return <circle key={i} cx={`${x}%`} cy={`${y}%`} r={s < .9 ? .6 + s * .6 : 1.6} fill="#fff" opacity={(.35 + r() * .6) * bright} />;
  });
}
const svg = (children: ReactNode, viewBox = '0 0 1600 1000') =>
  <svg className="dv-wp-svg" viewBox={viewBox} preserveAspectRatio="xMidYMid slice" aria-hidden="true">{children}</svg>;

const BUILTIN: Record<string, () => ReactNode> = {
  'win98-teal': () => null,
  'xp-hills': () => svg(<>
    <defs>
      <linearGradient id="xh-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a62c9" /><stop offset=".55" stopColor="#6aa5ea" /><stop offset="1" stopColor="#cfe5fb" /></linearGradient>
      <linearGradient id="xh-back" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5aa63e" /><stop offset="1" stopColor="#2d7a22" /></linearGradient>
      <linearGradient id="xh-front" x1="0" y1="0" x2=".2" y2="1"><stop offset="0" stopColor="#8fd04f" /><stop offset=".6" stopColor="#4f9e2e" /><stop offset="1" stopColor="#2f7420" /></linearGradient>
      <filter id="xh-blur" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="18" /></filter>
    </defs>
    <rect width="1600" height="1000" fill="url(#xh-sky)" />
    <g filter="url(#xh-blur)" fill="#fff" opacity=".85">
      <ellipse cx="380" cy="230" rx="210" ry="48" /><ellipse cx="520" cy="205" rx="150" ry="40" /><ellipse cx="1160" cy="170" rx="250" ry="52" />
      <ellipse cx="1320" cy="300" rx="190" ry="38" opacity=".7" /><ellipse cx="820" cy="330" rx="160" ry="30" opacity=".6" />
    </g>
    <path d="M0 640C260 560 560 600 820 650s560 20 780-60V1000H0z" fill="url(#xh-back)" />
    <path d="M0 720C320 600 720 600 1000 700c220 80 420 90 600 40V1000H0z" fill="url(#xh-front)" />
    <path d="M0 720C320 600 720 600 1000 700c220 80 420 90 600 40" stroke="#c4f08a" strokeWidth="5" fill="none" opacity=".45" />
  </>),
  'xp-space': () => svg(<>
    <defs>
      <radialGradient id="xs-bg" cx=".7" cy=".3" r="1"><stop offset="0" stopColor="#123a8c" /><stop offset=".55" stopColor="#061a4a" /><stop offset="1" stopColor="#01061a" /></radialGradient>
      <radialGradient id="xs-planet" cx=".55" cy=".25" r=".9"><stop offset="0" stopColor="#3f8fe6" /><stop offset=".55" stopColor="#0d3a8a" /><stop offset="1" stopColor="#03122e" /></radialGradient>
      <filter id="xs-blur" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="40" /></filter><filter id="xs-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="10" /></filter>
    </defs>
    <rect width="1600" height="1000" fill="url(#xs-bg)" />
    <g filter="url(#xs-blur)" opacity=".7"><ellipse cx="1150" cy="330" rx="260" ry="130" fill="#2f86d8" transform="rotate(-25 1150 330)" />
      <ellipse cx="1260" cy="420" rx="150" ry="80" fill="#7fd1ff" opacity=".6" /><ellipse cx="980" cy="230" rx="120" ry="60" fill="#5b4fd6" opacity=".5" /></g>
    {stars(140, 7)}
    <circle cx="420" cy="1420" r="860" fill="url(#xs-planet)" />
    <circle cx="420" cy="1420" r="860" fill="none" stroke="#8fd3ff" strokeWidth="14" filter="url(#xs-glow)" opacity=".85" />
    <rect y="900" width="1600" height="100" fill="#cfe9ff" opacity=".18" filter="url(#xs-blur)" />
  </>),
  'xp-azure': () => svg(<>
    <defs>
      <linearGradient id="xa-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0a2f86" /><stop offset=".5" stopColor="#1257c4" /><stop offset="1" stopColor="#061f5c" /></linearGradient>
      <filter id="xa-blur" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="50" /></filter>
    </defs>
    <rect width="1600" height="1000" fill="url(#xa-bg)" />
    <g filter="url(#xa-blur)"><ellipse cx="900" cy="760" rx="380" ry="120" fill="#fff4d8" opacity=".75" /><ellipse cx="700" cy="560" rx="520" ry="90" fill="#7fc0ff" opacity=".5" transform="rotate(-12 700 560)" /></g>
    <path d="M0 780c300-90 600-60 900 10s500 60 700-30V1000H0z" fill="#05173f" opacity=".55" />
  </>),
  'vista-aurora': () => svg(<>
    <defs>
      <linearGradient id="va-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#01110b" /><stop offset=".6" stopColor="#03251a" /><stop offset="1" stopColor="#0a3b22" /></linearGradient>
      <filter id="va-blur" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="22" /></filter>
    </defs>
    <rect width="1600" height="1000" fill="url(#va-bg)" />
    {stars(90, 3, 55, .7)}
    <g filter="url(#va-blur)" fill="none" strokeLinecap="round">
      <path d="M-100 520C200 300 500 420 800 300s600-80 900 60" stroke="#3cf29a" strokeWidth="70" opacity=".55" />
      <path d="M-100 600C250 420 560 520 860 420s520-40 840 80" stroke="#1fd1c9" strokeWidth="46" opacity=".5" />
      <path d="M200 380C450 250 700 330 980 230" stroke="#b7ff8a" strokeWidth="28" opacity=".4" />
    </g>
    <path d="M0 860l120-70 90 40 140-110 120 90 110-60 160 100 140-80 150 70 170-120 170 110 130-50 80 40V1000H0z" fill="#020b07" />
  </>),
  'win7-glow': () => svg(<>
    <defs>
      <radialGradient id="w7-bg" cx=".5" cy=".55" r=".8"><stop offset="0" stopColor="#3aa0f0" /><stop offset=".5" stopColor="#0e5bbf" /><stop offset="1" stopColor="#062a6b" /></radialGradient>
      <filter id="w7-blur" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="30" /></filter>
    </defs>
    <rect width="1600" height="1000" fill="url(#w7-bg)" />
    <g filter="url(#w7-blur)" opacity=".6">{[-40, -18, 6, 28, 52].map((a, i) =>
      <rect key={i} x="780" y="-200" width="70" height="1400" fill="#bfe6ff" opacity={.25 + (i % 2) * .15} transform={`rotate(${a} 800 560)`} />)}</g>
    <circle cx="800" cy="560" r="150" fill="#e8f6ff" opacity=".35" filter="url(#w7-blur)" />
  </>),
  'win7-night-arch': () => svg(<>
    <defs>
      <linearGradient id="na-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#020a24" /><stop offset=".7" stopColor="#0a2a6a" /><stop offset="1" stopColor="#1a3f86" /></linearGradient>
      <filter id="na-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="6" /></filter>
    </defs>
    <rect width="1600" height="1000" fill="url(#na-bg)" />
    {stars(60, 11, 45, .6)}
    <g fill="none" filter="url(#na-glow)">{[0, 1, 2, 3, 4, 5, 6].map(i =>
      <ellipse key={i} cx={1150 - i * 70} cy={1050 - i * 22} rx={900 - i * 60} ry={760 - i * 70} stroke="#f7c35a" strokeWidth={10 - i} opacity={.9 - i * .1} />)}</g>
    <g fill="none" opacity=".9">{[0, 1, 2, 3, 4, 5, 6].map(i =>
      <ellipse key={i} cx={1150 - i * 70} cy={1050 - i * 22} rx={900 - i * 60} ry={760 - i * 70} stroke="#ffe6a8" strokeWidth={2} />)}</g>
  </>),
  'win81-teal': () => svg(<>
    <defs><linearGradient id="w81" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0b5c62" /><stop offset="1" stopColor="#2ea6a4" /></linearGradient></defs>
    <rect width="1600" height="1000" fill="url(#w81)" />
    <g opacity=".22" fill="#fff"><path d="M0 1000L520 300l380 700z" /><path d="M700 1000L1180 180 1600 760V1000z" opacity=".6" /><path d="M1100 0h500v420z" opacity=".5" /></g>
  </>),
  'win10-light': () => svg(<>
    <defs>
      <linearGradient id="w10-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#010a1e" /><stop offset="1" stopColor="#04256a" /></linearGradient>
      <linearGradient id="w10-beam" gradientUnits="userSpaceOnUse" x1="-120" y1="0" x2="1120" y2="0">
        <stop offset="0" stopColor="#0a6ad6" stopOpacity="0" /><stop offset=".7" stopColor="#2f8de8" stopOpacity=".42" /><stop offset="1" stopColor="#9ad8ff" stopOpacity=".95" />
      </linearGradient>
      <radialGradient id="w10-glow" gradientUnits="userSpaceOnUse" cx="1120" cy="497" r="240">
        <stop offset="0" stopColor="#eef9ff" stopOpacity=".95" /><stop offset=".22" stopColor="#86ccff" stopOpacity=".55" /><stop offset="1" stopColor="#1f6fd6" stopOpacity="0" />
      </radialGradient>
      <filter id="w10-soft" filterUnits="userSpaceOnUse" x="-400" y="-400" width="2400" height="1800"><feGaussianBlur stdDeviation="9" /></filter>
    </defs>
    <rect width="1600" height="1000" fill="url(#w10-bg)" />
    <g filter="url(#w10-soft)">
      <path d="M-120 230L1120 476 1120 500-120 660z" fill="url(#w10-beam)" opacity=".75" />
      <path d="M-120 730L1120 506 1120 528-120 1010z" fill="url(#w10-beam)" opacity=".5" />
    </g>
    <circle cx="1120" cy="497" r="240" fill="url(#w10-glow)" />
  </>),
  'win10-peaks': () => svg(<>
    <defs>
      <linearGradient id="pk-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a1f6e" /><stop offset=".6" stopColor="#1b4fb8" /><stop offset="1" stopColor="#5a8fe0" /></linearGradient>
      <linearGradient id="pk-snow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#b8c9e6" /></linearGradient>
    </defs>
    <rect width="1600" height="1000" fill="url(#pk-sky)" />
    <path d="M0 780l260-260 120 90 230-300 160 170 140-120 250 260 180-150 260 230V1000H0z" fill="url(#pk-snow)" />
    <path d="M610 310l-90 240 110-60 40 120 70-150 30 60zM1040 440l-80 150 90-40 60 90 40-110z" fill="#6f84a8" opacity=".55" />
    <path d="M0 860l300-120 300 90 300-70 300 100 400-80V1000H0z" fill="#3b4a66" />
  </>),
  'win10-lake': () => svg(<>
    <defs><linearGradient id="lk-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b7be0" /><stop offset="1" stopColor="#bcd8f7" /></linearGradient></defs>
    <rect width="1600" height="560" fill="url(#lk-sky)" />
    <path d="M0 560V180l260 120 200-220 180 260 160-120 200 230 180-160 220 140 200-200V560z" fill="#4c6b3a" />
    <path d="M0 560V330l300 60 240-90 220 150 260-60 280 80 300-120V560z" fill="#2f4d28" />
    <rect y="560" width="1600" height="440" fill="#1d5fb0" />
    <g transform="matrix(1 0 0 -1 0 1120)" opacity=".5"><path d="M0 560V330l300 60 240-90 220 150 260-60 280 80 300-120V560z" fill="#2f4d28" /></g>
    <path d="M0 640h1600" stroke="#bfe0ff" strokeWidth="3" opacity=".4" />
  </>),
  'win11-bloom': () => svg(<>
    <defs>
      <linearGradient id="b11-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e4eefb" /><stop offset="1" stopColor="#b9cff0" /></linearGradient>
      <linearGradient id="b11-p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6fb6ff" /><stop offset="1" stopColor="#0a4fc4" /></linearGradient>
    </defs>
    <rect width="1600" height="1000" fill="url(#b11-bg)" />
    <g transform="translate(800 560)" opacity=".92">{[0, 40, 80, 120, 160, 200, 240, 280, 320].map(a =>
      <ellipse key={a} rx="250" ry="90" cx="160" fill="url(#b11-p)" opacity=".55" transform={`rotate(${a})`} />)}</g>
  </>),
  's40-blue': () => svg(<>
    <defs><radialGradient id="s40" cx=".3" cy=".2" r="1"><stop offset="0" stopColor="#6fc3ff" /><stop offset="1" stopColor="#0b3a8a" /></radialGradient></defs>
    <rect width="1600" height="1000" fill="url(#s40)" />
    <g fill="#fff" opacity=".2">{[[300, 300, 140], [1100, 200, 90], [900, 700, 220], [200, 800, 70]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}</g>
  </>, '0 0 1600 1000'),
  'ios-dusk': () => svg(<>
    <defs>
      <linearGradient id="ios-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2b1d6b" /><stop offset=".5" stopColor="#b04f8f" /><stop offset="1" stopColor="#f6a15b" /></linearGradient>
      <filter id="ios-blur" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="60" /></filter>
    </defs>
    <rect width="1000" height="1600" fill="url(#ios-bg)" />
    <g filter="url(#ios-blur)"><circle cx="250" cy="400" r="220" fill="#6a5cff" opacity=".6" /><circle cx="780" cy="1100" r="260" fill="#ffcf6b" opacity=".55" /></g>
  </>, '0 0 1000 1600'),
};

BUILTIN['win81-lock'] = BUILTIN['win81-teal'];
BUILTIN['win11-lock'] = BUILTIN['win11-bloom'];

const BG: Record<string, string> = {
  'win98-teal': '#008080', 'xp-hills': '#4a8fe0', 'xp-space': '#04102e', 'xp-azure': '#0b3a9a', 'vista-aurora': '#02170e',
  'win7-glow': '#0d4fae', 'win7-night-arch': '#06173f', 'win81-teal': '#1a8a8c', 'win10-light': '#02133a', 'win10-peaks': '#173f99',
  'win10-lake': '#2d5fa6', 'win11-bloom': '#cfdff5', 'win81-lock': '#1a8a8c', 'win11-lock': '#cfdff5', 's40-blue': '#1a5bb5', 'ios-dusk': '#7a3a7f',
};

/** asset: a picture of the asset folders to show instead of a drawn one ([folder, file]), e.g. a phone's own */
export function Wallpaper({ wp, fallback = 'win7-glow', asset }: { wp: Wp | null | undefined; fallback?: string; asset?: [string, string] | null }) {
  const key0 = wp?.builtin && BUILTIN[wp.builtin] ? wp.builtin : fallback;
  const pick = asset ?? (wp?.url ? null : WALLPAPER_ASSET[wp?.builtin ?? ''] ?? WALLPAPER_ASSET[key0]);
  const { a } = useAssets(pick?.[0] ?? 'w10');
  const own = pick ? a(pick[1]) : undefined;
  if (!wp?.url && own) {
    return <div className="dv-wp" style={{ backgroundColor: '#000', backgroundImage: `url("${own}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />;
  }
  if (wp?.url) {
    const fit = wp.fit ?? 'FILL';
    const style: CSSProperties = {
      backgroundColor: wp.color ?? '#000', backgroundImage: `url("${cdn(wp.url, 1920)}")`,
      backgroundSize: fit === 'FILL' ? 'cover' : fit === 'FIT' ? 'contain' : fit === 'STRETCH' ? '100% 100%' : 'auto',
      backgroundRepeat: fit === 'TILE' ? 'repeat' : 'no-repeat', backgroundPosition: 'center',
    };
    return <div className="dv-wp" style={style} />;
  }
  const key = wp?.builtin && BUILTIN[wp.builtin] ? wp.builtin : fallback;
  return <div className="dv-wp" style={{ background: wp?.color ?? BG[key] ?? '#123' }}>{BUILTIN[key]?.()}</div>;
}
