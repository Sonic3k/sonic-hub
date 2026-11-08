/* Pieces shared by the Yahoo! Messenger windows: the files of his copy (skin, emoticons, sounds) by name, a picture
   cut from a sprite of states, and a line of chat with its emoticons. */
import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { useAssets } from '../../assets';
import { ymPieces } from './emoticons';

export const useYm = () => useAssets('yahoo');

/** One state of a sprite whose states are stacked top to bottom (h each), or side by side with across. */
export function Sp({ src, w, h, at = 0, across, className, title, style }: {
  src?: string; w: number; h: number; at?: number; across?: boolean; className?: string; title?: string; style?: CSSProperties;
}) {
  const pos = across ? `${-at * w}px 0` : `0 ${-at * h}px`;
  return <i className={`ym-sp ${className ?? ''}`} title={title}
    style={{ width: w, height: h, backgroundImage: src ? `url("${src}")` : undefined, backgroundPosition: pos, ...style }} />;
}

/** A background stretched from one state of a stacked sprite of n states. */
export const stateBg = (src: string | undefined, n: number, at: number): CSSProperties => src ? {
  backgroundImage: `url("${src}")`, backgroundSize: `100% ${n * 100}%`, backgroundPosition: `0 ${n > 1 ? (at * 100) / (n - 1) : 0}%`,
} : {};

export const bgUrl = (src: string | undefined): CSSProperties => (src ? { backgroundImage: `url("${src}")` } : {});

/** A line as Messenger drew it: the codes it knew became their pictures; the rest stays as typed. */
export function YmText({ text }: { text: string }) {
  const { a } = useYm();
  const out: ReactNode[] = ymPieces(text).map((p, i) => {
    if (typeof p === 'string') return <Fragment key={i}>{p}</Fragment>;
    const src = a(`smileys/${p.id}.gif`);
    return src ? <img key={i} className="ym-emo" src={src} alt={p.code} title={p.code} /> : <Fragment key={i}>{p.code}</Fragment>;
  });
  return <>{out}</>;
}

/** A buzz, as it was archived ("<ding>") or typed. */
export const isBuzz = (text?: string | null) => !!text && /^\s*(<ding>|BUZZ!!!)\s*$/i.test(text);
