/* Shared reads, cached once and reused by every page and sidebar. */
import { useQuery } from '@tanstack/react-query';
import { hub, tagWorlds } from '../api/hub';
import type { Note } from '../types';
import { vnClock } from './date';

const T = 10 * 60_000;
export const useTimeline = () => useQuery({ queryKey: ['timeline'], queryFn: hub.timeline, staleTime: T });
export const usePersons = () => useQuery({ queryKey: ['persons'], queryFn: hub.persons, staleTime: T });
export const useAlbums = () => useQuery({ queryKey: ['albums'], queryFn: hub.albums, staleTime: T });
export const useRegions = (limit = 8) => useQuery({ queryKey: ['regions', limit], queryFn: () => tagWorlds(limit), staleTime: T });
export const useTagStats = () => useQuery({ queryKey: ['tag-stats'], queryFn: hub.tagStats, staleTime: T });
export const useAllAlbums = () => useQuery({ queryKey: ['albums-all'], queryFn: hub.allAlbums, staleTime: T });
/** Everything written, newest first, drafts left out: every page of the list (the API gives 100 at a time), each note
 *  with its lead, word count and tags. A note's text comes with the note itself (hub.noteBySlug / noteById). */
export const useNotes = () => useQuery({ queryKey: ['notes', 'all'], staleTime: T, queryFn: async () => {
  const first = await hub.notes({ size: 100, inclTags: true });
  const rest = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) => hub.notes({ size: 100, page: i + 1, inclTags: true })));
  return [first, ...rest].flatMap(p => p.content).filter(n => n.status !== 'DRAFT').sort((a, b) => noteDate(b).localeCompare(noteDate(a)));
} });
export const useLibraryCounts = () => useQuery({ queryKey: ['library-counts'], staleTime: T, queryFn: async () => {
  const [fav, vid] = await Promise.all([hub.total({ favorite: true }), hub.total({ type: 'VIDEO' })]); return { fav, vid }; } });

/** a note's date on Vietnam's clock (kept in UTC: a day-only note sits at Vietnam midnight or noon) */
export const noteDate = (n: Note) => vnClock(n.publishedAt ?? n.createdAt);
export const noteHref = (n: Note) => (n.slug ? `/journal/${n.slug}` : `/journal/id/${n.id}`);
const ENTITY: Record<string, string> = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" };
export const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&(nbsp|amp|lt|gt|quot|apos|#39);/g, m => ENTITY[m]).replace(/\s+/g, ' ').trim();
/** a note's words without markup: its whole text when the note came with it, else the lead a list carries */
export const textOf = (n: Note) => (n.content != null ? plain(n.content) : n.lead ?? '');
export const excerptOf = (n: Note, len = 180) => (n.excerpt || textOf(n)).slice(0, len);
/** the opening sentence of something written, as a line to show for it */
export function firstLine(n: Note, max = 110): string {
  const t = textOf(n), cut = new RegExp(`^.{24,${max}}?[.!?…](?=\\s|$)`).exec(t)?.[0] ?? t.slice(0, max - 14);
  return cut.length < t.length && !/[.!?…]$/.test(cut) ? `${cut}…` : cut;
}
export const readMinutes = (n: Note) => Math.max(1, Math.round((n.words ?? textOf(n).split(' ').length) / 220));
export const fmt = (n: number) => n.toLocaleString('vi-VN');
export const counts = (buckets: { year: number; month: number; count: number }[]) => { const c: Record<number, number> = {}; buckets.forEach(b => { c[b.year] = (c[b.year] ?? 0) + b.count; }); return c; };
