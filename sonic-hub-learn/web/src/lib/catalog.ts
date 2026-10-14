import type { CourseSummary, SubjectSummary } from '@learn/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo, type CSSProperties } from 'react';
import { api } from '../api';

/** Used when a subject has no colour in its subject.yaml. */
const FALLBACK = ['#2F55CF', '#D88400', '#1C8A56', '#B5446E', '#5B4BC4', '#0E7C86', '#8A5A00'];

export interface SubjectInfo {
  key: string;
  title: string;
  lang: string;
  color: string;
}

export interface Catalog {
  subjects: (SubjectSummary & { color: string })[];
  subjectOf(courseKey: string): SubjectInfo | undefined;
  course(courseKey: string): CourseSummary | undefined;
  colorOf(courseKey: string): string;
  /** Enrolled courses in subject order. */
  enrolled: CourseSummary[];
  /** Every course in subject order. */
  all: CourseSummary[];
}

export function buildCatalog(list: SubjectSummary[] = []): Catalog {
  const subjects = list.map((s, i) => ({ ...s, color: s.color ?? FALLBACK[i % FALLBACK.length] }));
  const bySubject = new Map<string, SubjectInfo>();
  const byCourse = new Map<string, CourseSummary>();
  for (const s of subjects)
    for (const c of s.courses) {
      bySubject.set(c.key, { key: s.key, title: s.title, lang: s.lang, color: s.color });
      byCourse.set(c.key, c);
    }
  const all = subjects.flatMap((s) => s.courses);
  return {
    subjects,
    subjectOf: (k) => bySubject.get(k),
    course: (k) => byCourse.get(k),
    colorOf: (k) => bySubject.get(k)?.color ?? 'var(--ink-3)',
    enrolled: all.filter((c) => c.enrolled),
    all,
  };
}

export function useCatalog() {
  const q = useQuery({ queryKey: ['subjects'], queryFn: api.subjects, staleTime: 30_000 });
  const catalog = useMemo(() => buildCatalog(q.data), [q.data]);
  return { ...q, catalog };
}

/** "AWS Solutions Architect – Associate (SAA-C03)" → "SAA-C03"; short titles stay as they are. */
export function courseShort(title: string): string {
  const m = title.match(/\(([^)]+)\)\s*$/);
  return title.length > 28 && m ? m[1] : title;
}

/** Inline style that sets the subject colour for CSS (strips, dots, meters). */
export function subStyle(color: string | undefined): CSSProperties {
  return { '--sub': color ?? 'var(--ink-3)' } as CSSProperties;
}
