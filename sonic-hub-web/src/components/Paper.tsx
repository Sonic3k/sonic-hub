/* The pieces the two home pages are laid out with (the 2.4 set): a photo print, dated rows, tiles, the handwritten
   margin note, the strip of the same day in other years. A print may be tilted or taped; pages use that sparingly. */
import type { CSSProperties, ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { eraClass } from '../lib/era';
import type { Moment } from '../lib/moment';

const rot = (deg?: number): CSSProperties | undefined => (deg ? { transform: `rotate(${deg}deg)` } : undefined);

/** A photo on paper: white border, soft shadow, an optional caption in the caption hand, a strip of tape, a tag. */
export function Print({ src, alt = '', caption, ratio = '4 / 3', tilt, tape, tag, to, href, onClick, className = '', style, top, small }: {
  src: string; alt?: string; caption?: ReactNode; ratio?: string; tilt?: number; tape?: number; tag?: string;
  to?: string; href?: string; onClick?: () => void; className?: string; style?: CSSProperties; top?: boolean; small?: boolean;
}) {
  const cls = `print ${caption ? 'captioned' : ''} ${small ? 'print-s' : ''} ${className}`, st = { ...rot(tilt), ...style };
  const body = <>
    {tape !== undefined && <span className="tape" aria-hidden="true" style={rot(tape)} />}
    <img src={src} alt={alt} loading="lazy" decoding="async" style={{ aspectRatio: ratio, objectPosition: top ? 'top' : undefined }} />
    {caption && <span className="print-cap">{caption}</span>}
    {tag && <span className="print-tag">{tag}</span>}
  </>;
  if (to) return <Link className={cls} style={st} to={to}>{body}</Link>;
  if (href) return <a className={cls} style={st} href={href}>{body}</a>;
  if (onClick) return <button type="button" className={cls} style={st} onClick={onClick}>{body}</button>;
  return <span className={cls} style={st}>{body}</span>;
}

/** A year in the colours of its era: the small mark that says "when" all over the portal. */
export function YearChip({ year, className = '' }: { year: number; className?: string }) {
  return <b className={`ychip ${eraClass(year)} ${className}`}>{year}</b>;
}
/** The years of a section as a grid, each in its era's tint (a sidebar's way through time). */
export function YearGrid({ years, active, href }: { years: number[]; active?: number; href: (y: number) => string }) {
  if (!years.length) return null;
  return <div className="ygrid">{years.map(y => <Link key={y} to={href(y)} className={`${eraClass(y)} ${y === active ? 'on' : ''}`}>{y}</Link>)}</div>;
}

/** A margin note in the school hand with its little arrow: only for words that were really written or said. */
export function HandNote({ children, tilt = -2, caps }: { children: ReactNode; tilt?: number; caps?: boolean }) {
  return (
    <div className="hand-note" style={rot(tilt)}>
      <p className={caps ? 'caps' : ''}>{children}</p>
      <svg viewBox="0 0 80 30" width="80" height="30" aria-hidden="true"><path d="M3 20c18-12 40-14 68-6" /><path d="M62 6l10 8-12 6" /></svg>
    </div>
  );
}

export interface Row { key: string; when: string; title: string; to: string }
/** Dated rows between hairlines: when, then what. */
export function Rows({ rows }: { rows: Row[] }) {
  if (!rows.length) return null;
  return <div className="drows">{rows.map(r => <Link key={r.key} className="drow" to={r.to}><span className="drow-d">{r.when}</span><span className="drow-t">{r.title}</span></Link>)}</div>;
}

const PC = <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="1.6" /><path d="M9 20h6M12 16v4" /></svg>;
const PHONE = <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.2" /><path d="M11 18.5h2" /></svg>;
/** Turning on a machine of then: a tile in the era's ink (the machines are pages of their own, so a plain link). */
export function MachineTile({ name, label, range, href, phone, photo }: { name?: string; label?: string; range?: string; href: string; phone?: boolean; photo?: string | null }) {
  return (
    <a className={`tile on ${photo ? 'photo' : ''}`} href={href}>
      {photo && <img src={photo} alt="" loading="lazy" />}
      <span className="tile-in">{range && <span className="tile-k">{range}</span>}<span className="tile-v">{phone ? PHONE : PC}{label ?? `Bật ${name}`}</span></span>
    </a>
  );
}
/** A section's word on the moment: its name in the era's ink, then what it holds from then. */
export function Tile({ label, to, children }: { label: string; to: string; children: ReactNode }) {
  return <Link className="tile" to={to}><span className="tile-k">{label}</span><span className="tile-v">{children}</span></Link>;
}

/** The two ways to look at home, as a switch (the menu's first two entries; on a phone they are only here). */
export function ModeSwitch() {
  return (
    <div className="modes" role="tablist" aria-label="Cách xem">
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'on' : '')}>Hôm nay</NavLink>
      <NavLink to="/timeline" className={({ isActive }) => (isActive ? 'on' : '')}>Dòng thời gian</NavLink>
    </div>
  );
}

export interface DayCard { year: number; title: string }
/** The same day in other years: what happened on it where the hub knows, then the other years that have photos this month. */
export function SameDay({ moment, cards, years, onPick }: { moment: Moment; cards: DayCard[]; years: number[]; onPick: (m: Moment) => void }) {
  if (!cards.length && !years.length) return null;
  const go = (y: number) => () => onPick({ ...moment, y });
  return (
    <div className="sameday-x">
      <h2>Ngày này các năm</h2>
      {cards.length > 0 && <div className="sd-cards">{cards.map(c => (
        <button key={`${c.year}-${c.title}`} type="button" className={`sd-card ${eraClass(c.year)}`} onClick={go(c.year)}><b>{c.year}</b><span>{c.title}</span></button>))}</div>}
      {years.length > 0 && <div className="sd-years">{years.map(y => <button key={y} type="button" className={eraClass(y)} onClick={go(y)}>{y}</button>)}</div>}
    </div>
  );
}
