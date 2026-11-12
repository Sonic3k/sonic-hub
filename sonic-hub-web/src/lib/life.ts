/* What was going on at a moment, read out of the lists the portal already has: the stretch of life (giai đoạn) it
   falls in, the games he was playing, the music list of then, the machines he had. Everything here is plain
   filtering of data the API returns; nothing is fetched. */
import type { Chapter, DeskDevice, Episode, Forum, GameCard, LifeEvent, Note } from '../types';
import type { Playlist } from '../api/music';
import { noteDate } from './queries';

const pad = (n: number) => String(n).padStart(2, '0');

/** One end of a period ("5/2007", "2008", "nay") as "YYYY-MM"; a bare year is its first month at the start, its last at the end. */
function end(part: string, last: boolean): string | null {
  const t = part.trim();
  if (/nay|now|present/i.test(t)) return '9999-12';
  const my = /^(\d{1,2})\/((?:19|20)\d{2})$/.exec(t);
  if (my) return `${my[2]}-${pad(+my[1])}`;
  const y = /^((?:19|20)\d{2})$/.exec(t);
  return y ? `${y[1]}-${last ? '12' : '01'}` : null;
}
/** A chapter's period ("5/2007 – 8/2007", "2005 – 2008", "2015 – nay", "2013") as [from, to] months, both included. */
export function periodSpan(period?: string | null): [string, string] | null {
  const parts = (period ?? '').split(/\s*[–—-]\s*/).filter(Boolean);
  if (!parts.length) return null;
  const a = end(parts[0], false), b = end(parts[parts.length - 1], true);
  return a && b ? [a, b] : null;
}
const months = (s: [string, string]) => (+s[1].slice(0, 4) - +s[0].slice(0, 4)) * 12 + (+s[1].slice(5) - +s[0].slice(5));
/** The chapters a month falls in: the widest first (the school years, then what was going on inside them); one that
 *  runs "đến nay" has no end to measure, so it comes last. */
export function chaptersAt(chapters: Chapter[], y: number, m: number): Chapter[] {
  const at = `${y}-${pad(m)}`, open = (s: [string, string]) => Number(s[1].startsWith('9999'));
  return chapters.map(c => ({ c, s: periodSpan(c.period) })).filter((x): x is { c: Chapter; s: [string, string] } => !!x.s && x.s[0] <= at && at <= x.s[1])
    .sort((a, b) => open(a.s) - open(b.s) || months(b.s) - months(a.s)).map(x => x.c);
}
/** the year a chapter starts in */
export const chapterYear = (c: Chapter) => { const s = periodSpan(c.period); return s ? +s[0].slice(0, 4) : NaN; };

/** Games he was playing on a day (a stretch of play covers it): his favourites first, then the ones begun latest. */
export function gamesAt(games: GameCard[], iso: string): GameCard[] {
  const on = (g: GameCard) => (g.spans?.length ? g.spans.some(s => s.from.slice(0, 10) <= iso && iso <= s.to.slice(0, 10)) : !!g.playFrom && g.playFrom.slice(0, 10) <= iso && iso <= (g.playTo ?? g.playFrom).slice(0, 10));
  return games.filter(g => g.kind !== 'REFERENCE' && on(g)).sort((a, b) => Number(b.favorite) - Number(a.favorite) || (b.playFrom ?? '').localeCompare(a.playFrom ?? ''));
}
/** Games begun inside a span of years: his favourites first, then the ones he stayed with longest. */
export function gamesIn(games: GameCard[], from: number, to: number | null): GameCard[] {
  const stayed = (g: GameCard) => (g.playFrom ? new Date(g.playTo ?? g.playFrom).getTime() - new Date(g.playFrom).getTime() : 0);
  return games.filter(g => g.kind !== 'REFERENCE' && g.playFrom && +g.playFrom.slice(0, 4) >= from && (to === null || +g.playFrom.slice(0, 4) < to))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || stayed(b) - stayed(a) || a.title.localeCompare(b.title));
}

/** The span a music list stands for: a WINDOW list its years ("2006 → 2008"), any other the day it was taken. */
function listSpan(p: Playlist): [string, string] | null {
  if (!p.takenAt) return null;
  const taken = p.takenAt.slice(0, 10);
  if (p.kind === 'WINDOW') return [(p.windowFrom ?? `${taken.slice(0, 4)}-01-01`).slice(0, 10), `${taken.slice(0, 4)}-12-31`];
  return [taken, taken];
}
/** The music lists of a day: the window lists that cover it, else the last one kept before it (within three years). */
export function listsAt(lists: Playlist[], iso: string): Playlist[] {
  const spans = lists.map(p => ({ p, s: listSpan(p) })).filter((x): x is { p: Playlist; s: [string, string] } => !!x.s);
  const inside = spans.filter(x => x.s[0] <= iso && iso <= x.s[1]).map(x => x.p);
  if (inside.length) return inside;
  const floor = `${+iso.slice(0, 4) - 3}${iso.slice(4)}`;
  const before = spans.filter(x => x.s[1] <= iso && x.s[1] >= floor).sort((a, b) => b.s[1].localeCompare(a.s[1]));
  return before.slice(0, 1).map(x => x.p);
}
/** The music lists of a span of years (a window list by the year its window opens), oldest first. */
export function listsIn(lists: Playlist[], from: number, to: number | null): Playlist[] {
  const year = (p: Playlist) => +((p.kind === 'WINDOW' && p.windowFrom) || p.takenAt || '').slice(0, 4);
  return lists.filter(p => year(p) >= from && (to === null || year(p) < to)).sort((a, b) => (a.takenAt ?? '').localeCompare(b.takenAt ?? ''));
}

/** A machine's span as months and years, the way the shelves write it: "10/2005 – 9/2008", "2023 – nay".
 *  The API keeps the ends in UTC (17:00 the evening before a Vietnam midnight), so they are read on Vietnam's clock. */
export function deviceRange(d: DeskDevice): string {
  const vn = (iso: string, days = 0) => new Date(new Date(`${iso}Z`).getTime() + 7 * 3600_000 + days * 86400_000);
  const from = (iso?: string | null) => { if (!iso) return null; const t = vn(iso); return t.getUTCMonth() === 0 && t.getUTCDate() === 1 ? `${t.getUTCFullYear()}` : `${t.getUTCMonth() + 1}/${t.getUTCFullYear()}`; };
  // "to" is the first moment after the machine's time: its last day is the day before (a 31/12 reads as the whole year)
  const to = (iso?: string | null) => { if (!iso) return null; const t = vn(iso, -1); return t.getUTCMonth() === 11 && t.getUTCDate() === 31 ? `${t.getUTCFullYear()}` : `${t.getUTCMonth() + 1}/${t.getUTCFullYear()}`; };
  const a = from(d.from), b = to(d.to);
  return a ? `${a} – ${b ?? 'nay'}` : b ? `đến ${b}` : '';
}
/** the year a machine came (Vietnam clock) */
export const deviceYear = (d: DeskDevice) => (d.from ? new Date(new Date(`${d.from}Z`).getTime() + 7 * 3600_000).getUTCFullYear() : NaN);
/** an evening well inside a machine's time, to turn it on at: a month after it came */
export function deviceMoment(d: DeskDevice): string | null {
  if (!d.from) return null;
  const t = new Date(new Date(`${d.from}Z`).getTime() + 7 * 3600_000 + 30 * 86400_000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T21:00`;
}

/** The forums that were alive in a year. */
export const forumsIn = (forums: Forum[], from: number, to: number | null) =>
  forums.filter(f => f.firstPostAt && f.lastPostAt && +f.firstPostAt.slice(0, 4) < (to ?? 9999) && +f.lastPostAt.slice(0, 4) >= from);
export const forumYears = (f: Forum) => (f.firstPostAt && f.lastPostAt ? `${f.firstPostAt.slice(0, 4)} – ${f.lastPostAt.slice(0, 4)}` : '');

/** What he wrote closest to a day: within the two months around it, the nearest first. */
export function notesNear(notes: Note[], iso: string, limit = 2): Note[] {
  const t = new Date(iso).getTime(), near = (n: Note) => Math.abs(new Date(noteDate(n).slice(0, 10)).getTime() - t);
  return notes.filter(n => noteDate(n) && near(n) <= 62 * 86400_000).sort((a, b) => near(a) - near(b)).slice(0, limit);
}

/** His events on the same day of other years: the ones known to the day that cover it and are not longer than three weeks. */
export function eventsOnDay(events: LifeEvent[], m: number, d: number, notYear: number): LifeEvent[] {
  const md = `${pad(m)}-${pad(d)}`, fine = new Set(['DAY', 'HOUR', 'MINUTE', 'SECOND']);
  return events.filter(e => {
    if (!e.precision || !fine.has(e.precision)) return false;
    const a = e.startAt.slice(0, 10), b = e.endExclusive.slice(0, 10), y = +a.slice(0, 4);
    if (y === notYear || new Date(b).getTime() - new Date(a).getTime() > 21 * 86400_000) return false;
    const day = `${y}-${md}`, next = `${y + 1}-${md}`;
    return (day >= a && day < b) || (next >= a && next < b);
  });
}

/** The same day in other years, as up to three cards (a year and what happened): his events of that day first — they
 *  are known at once — then, in the places left, his memories of that day by weight (they take a while to load, and
 *  must not push out a card he may already be reading). Oldest first. */
export function sameDayCards(events: LifeEvent[], memories: Episode[], at: { y: number; m: number; d: number }): { year: number; title: string }[] {
  const md = `${pad(at.m)}-${pad(at.d)}`, fine = new Set(['DAY', 'HOUR', 'MINUTE', 'SECOND']), out: { year: number; title: string }[] = [];
  const add = (year: number, title: string) => { if (out.length < 3 && year !== at.y && !out.some(c => c.year === year)) out.push({ year, title }); };
  eventsOnDay(events, at.m, at.d, at.y).forEach(e => add(+e.startAt.slice(0, 4), e.title));
  memories.filter(e => e.occurredAt && e.title && e.occurredAt.slice(5, 10) === md && (!e.precision || fine.has(e.precision)))
    .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0)).forEach(e => add(+e.occurredAt!.slice(0, 4), e.title!));
  return out.sort((a, b) => a.year - b.year);
}
