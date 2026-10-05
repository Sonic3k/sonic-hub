/* Shared reads, cached once and reused by every page and sidebar. */
import { useQuery } from '@tanstack/react-query';
import { hub, tagWorlds } from '../api/hub';
import type { Note } from '../types';

const T = 10 * 60_000;
export const useTimeline = () => useQuery({ queryKey: ['timeline'], queryFn: hub.timeline, staleTime: T });
export const usePersons = () => useQuery({ queryKey: ['persons'], queryFn: hub.persons, staleTime: T });
export const useAlbums = () => useQuery({ queryKey: ['albums'], queryFn: hub.albums, staleTime: T });
export const useRegions = (limit = 8) => useQuery({ queryKey: ['regions', limit], queryFn: () => tagWorlds(limit), staleTime: T });
export const useTagStats = () => useQuery({ queryKey: ['tag-stats'], queryFn: hub.tagStats, staleTime: T });
export const useAllAlbums = () => useQuery({ queryKey: ['albums-all'], queryFn: hub.allAlbums, staleTime: T });
/** Everything written, newest first, drafts left out. */
export const useNotes = () => useQuery({ queryKey: ['notes', 'all'], staleTime: T, queryFn: async () => (await hub.notes({ size: 300 })).content.filter(n => n.status !== 'DRAFT').sort((a, b) => noteDate(b).localeCompare(noteDate(a))) });
export const useLibraryCounts = () => useQuery({ queryKey: ['library-counts'], staleTime: T, queryFn: async () => {
  const [fav, vid] = await Promise.all([hub.total({ favorite: true }), hub.total({ type: 'VIDEO' })]); return { fav, vid }; } });

export const noteDate = (n: Note) => n.publishedAt ?? n.createdAt ?? '';
export const noteHref = (n: Note) => (n.slug ? `/journal/${n.slug}` : `/journal/id/${n.id}`);
export const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
export const excerptOf = (n: Note, len = 180) => (n.excerpt || plain(n.content)).slice(0, len);
export const readMinutes = (n: Note) => Math.max(1, Math.round(plain(n.content).split(' ').length / 220));
export const fmt = (n: number) => n.toLocaleString('vi-VN');
export const counts = (buckets: { year: number; month: number; count: number }[]) => { const c: Record<number, number> = {}; buckets.forEach(b => { c[b.year] = (c[b.year] ?? 0) + b.count; }); return c; };
