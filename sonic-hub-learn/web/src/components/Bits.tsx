import { createElement, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { SubjectInfo } from '../lib/catalog';
import { mdBlock, mdInline } from '../lib/md';
import { reduceMotion } from '../lib/motion';
import { CloseIcon, FolderIcon } from './Icons';

/** "aws" → "AWS", "english" → "EN": the short code on a subject tag. */
function subjectCode(key: string): string {
  return (key.length <= 4 ? key : key.slice(0, 2)).toUpperCase();
}

/** A small glossy tag in the subject's colour. */
export function SubjectTag({ subject }: { subject: SubjectInfo | undefined }) {
  if (!subject) return null;
  return (
    <span className="sb" style={{ '--sub': subject.color } as CSSProperties} title={subject.title}>
      {subjectCode(subject.key)}
    </span>
  );
}

/** The split-gloss header of a box; `right` is placed at the far end (give it class "r"). */
export function Bar({ children, icon = <FolderIcon />, right, tone, extra }: { children: ReactNode; icon?: ReactNode; right?: ReactNode; tone?: 'ok' | 'no' | 'gold'; extra?: ReactNode }) {
  return (
    <h2 className={`bar${tone ? ` ${tone}` : ''}`}>
      {icon}
      <span>{children}</span>
      {extra}
      {right}
    </h2>
  );
}

/** The bar on top of a study screen: the red close button, what is being studied, and a counter or clock. */
export function SessionHead({ back, title, closeLabel = 'Thoát', children }: { back: string; title: string; closeLabel?: string; children?: ReactNode }) {
  return (
    <div className="s-head">
      <Link className="xclose" to={back} aria-label={closeLabel}>
        <CloseIcon />
      </Link>
      <h1 className="ttl">{title}</h1>
      {children ?? <span />}
    </div>
  );
}

/**
 * A row of paging boxes (one per question). A long row stays on one line on phones and scrolls sideways,
 * keeping the current box in view; `current` is its index.
 */
export function Pages({ children, current, many, label }: { children: ReactNode; current: number; many: boolean; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = ref.current;
    const now = row?.querySelector<HTMLElement>('.now');
    if (!row || !now || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({ left: now.offsetLeft - (row.clientWidth - now.offsetWidth) / 2, behavior: reduceMotion() ? 'auto' : 'smooth' });
  }, [current]);
  return (
    <div ref={ref} className={`pages${many ? ' many' : ''}`} role={label ? 'group' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {children}
    </div>
  );
}

/** Markdown (trusted content) rendered as HTML. */
export function Md({ src, inline = false, as = inline ? 'span' : 'div', className, lang }: { src: string | null | undefined; inline?: boolean; as?: string; className?: string; lang?: string }) {
  return createElement(as, { className, lang, dangerouslySetInnerHTML: { __html: inline ? mdInline(src) : mdBlock(src) } });
}

/** Placeholder boxes while data loads. */
export function Waiting({ tall = false }: { tall?: boolean }) {
  return (
    <div className="wait" aria-busy="true" aria-label="Đang tải">
      <div className={`box${tall ? ' tall' : ''}`}>
        <div className="bar" />
        <div className="body" />
      </div>
      <div className="box">
        <div className="bar" />
        <div className="body" />
      </div>
    </div>
  );
}

/** The yellow notice for empty states (red for errors), with what to do next. */
export function NoteCard({ children, error = false, action }: { children: ReactNode; error?: boolean; action?: ReactNode }) {
  return (
    <div className={`note-card${error ? ' err' : ''}`} role={error ? 'alert' : undefined}>
      <p>
        <b>{error ? 'Lỗi:' : 'Chú ý:'}</b>
        {children}
      </p>
      {action && <div className="acts">{action}</div>}
    </div>
  );
}
