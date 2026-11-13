/* When each of the Angels came into his life, and who a month was about.
   The year is his own: the "year" column of the relationship sheet he kept (the year he got to know someone), else
   the first year of the period written on their page. The month is his too: the Moments sheet names one person for
   a month (for 2001 and 2004, one for the whole year). */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { hub, isAngel, periodYears } from '../api/hub';
import type { Person, RankingEntry } from '../types';

const T = 10 * 60_000;
export const nameOf = (p: Person) => p.displayName || p.name;

/** personId → the year he got to know them. Empty while loading, and when the sheets cannot be read. */
export function useMetYears() {
  const q = useQuery({ queryKey: ['ranking-column', 'relationship', 'year'], queryFn: () => hub.rankingColumn('relationship', 'year').catch(() => ({} as Record<string, string>)), staleTime: T });
  const years = useMemo(() => {
    const m = new Map<string, number>();
    for (const [id, v] of Object.entries(q.data ?? {})) { const y = parseInt(v, 10); if (y > 1900 && y < 2100) m.set(id, y); }
    return m;
  }, [q.data]);
  return { years, ready: !q.isLoading };
}
/** the year someone came in: from the sheet, else from the period on their page; 0 = not known */
export const metYear = (p: Person, years: Map<string, number>) => years.get(p.id) ?? periodYears(p.period)?.[0] ?? 0;

/** The Angels in the order they came: by that year (not known last), then by name. */
export function angelsInOrder(all: Person[], years: Map<string, number>): Person[] {
  const y = (p: Person) => metYear(p, years) || 9999;
  return all.filter(isAngel).sort((a, b) => y(a) - y(b) || nameOf(a).localeCompare(nameOf(b), 'vi'));
}
/** …and cut into their years, oldest first; [0, people] at the end holds those with no year. */
export function angelsByYear(all: Person[], years: Map<string, number>): [number, Person[]][] {
  const out: [number, Person[]][] = [];
  for (const p of angelsInOrder(all, years)) {
    const y = metYear(p, years), last = out[out.length - 1];
    if (last && last[0] === y) last[1].push(p); else out.push([y, [p]]);
  }
  return out;
}

export interface MomentOf { year: number; month: number; personId?: string | null; name: string }
/** Moments: who each month was about. month 0 = the whole year. Oldest first. */
export function useMoments() {
  const q = useQuery({ queryKey: ['ranking-board', 'moments', false], queryFn: () => hub.rankingBoard('moments'), staleTime: T });
  return useMemo(() => {
    const out: MomentOf[] = [];
    for (const e of (q.data ?? []).flatMap(l => l.entries) as RankingEntry[]) {
      const m = /^(\d{4})(?:-(\d{2}))?$/.exec(e.period ?? '');
      if (m) out.push({ year: +m[1], month: m[2] ? +m[2] : 0, personId: e.personId, name: e.personName || e.label });
    }
    return out.sort((a, b) => a.year - b.year || a.month - b.month);
  }, [q.data]);
}
