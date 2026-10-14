import { createElement, type CSSProperties, type ReactNode } from 'react';
import { mdBlock, mdInline } from '../lib/md';

/** The coloured band at the top of an index card; parts share it by weight. */
export function Strip({ parts }: { parts: { color: string; n: number }[] }) {
  const total = parts.reduce((s, p) => s + p.n, 0) || 1;
  return (
    <span className="strip" aria-hidden="true">
      {parts.map((p, i) => (
        <i key={i} style={{ width: `${(p.n / total) * 100}%`, background: p.color }} />
      ))}
    </span>
  );
}

export function Dot({ color }: { color: string }) {
  return <span className="dot" style={{ '--sub': color } as CSSProperties} />;
}

/** Markdown (trusted content) rendered as HTML. */
export function Md({ src, inline = false, as = inline ? 'span' : 'div', className, lang }: { src: string | null | undefined; inline?: boolean; as?: string; className?: string; lang?: string }) {
  return createElement(as, { className, lang, dangerouslySetInnerHTML: { __html: inline ? mdInline(src) : mdBlock(src) } });
}

/** Placeholder index cards while data loads. */
export function Waiting({ tall = false }: { tall?: boolean }) {
  return (
    <div className="wait" aria-busy="true" aria-label="Đang tải">
      <div className={`card${tall ? ' tall' : ''}`} />
      <div className="card" />
    </div>
  );
}

/** An index card with a handwritten note: empty states and errors, with what to do next. */
export function NoteCard({ children, error = false, action }: { children: ReactNode; error?: boolean; action?: ReactNode }) {
  return (
    <div className="card blank-card">
      <p className={`hand-note${error ? ' err' : ''}`}>{children}</p>
      {action}
    </div>
  );
}
