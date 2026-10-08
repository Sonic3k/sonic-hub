import { get } from './client';
import type { Chapter, ChatArchive, ChatMessage, Collection, Episode, Fact, MediaFile, Note, Paged, Person, PersonDetail, PersonRanking, Tag, TagStats, TimelineBucket, Trait } from '../types';
import { isoDay, addDays } from '../lib/date';

export interface Search {
  type?: 'IMAGE' | 'VIDEO'; favorite?: boolean; featured?: boolean; personId?: string; collectionId?: string;
  tagIds?: string[]; tagNames?: string[]; q?: string; from?: string; to?: string; random?: boolean;
  page?: number; size?: number; sortBy?: string; sortDir?: 'asc' | 'desc'; inclPersons?: boolean; inclTags?: boolean;
}

export const hub = {
  timeline: () => get<TimelineBucket[]>('/media-files/timeline-index', { tz: 'Asia/Ho_Chi_Minh' }),
  search: (p: Search) => get<Paged<MediaFile>>('/media-files/search', p as Record<string, string | number | boolean | string[] | undefined>),
  persons: () => get<Person[]>('/persons'),
  tags: () => get<Tag[]>('/tags'),
  albums: async () => {
    const root = await get<Collection>('/collections/root', { inclChildrenCount: true, inclMediaCount: true });
    return get<Collection[]>(`/collections/${root.id}/children`, { inclChildrenCount: true, inclMediaCount: true });
  },
  notes: (p: { kind?: string; status?: string; category?: string; tagId?: string; q?: string; page?: number; size?: number }) => get<Paged<Note>>('/journal/notes', p),
  noteBySlug: (slug: string) => get<Note>(`/journal/notes/slug/${encodeURIComponent(slug)}`),
  noteById: (id: string) => get<Note>(`/journal/notes/${id}`),
  categories: () => get<string[]>('/journal/categories'),
  archives: (personId: string) => get<ChatArchive[]>(`/persons/${personId}/chat-archives`),
  messages: (personId: string, archiveId: string, page: number, size: number, q?: string) => get<Paged<ChatMessage>>(`/persons/${personId}/chat-archives/${archiveId}/messages`, { page, size, q }),
  person: (id: string) => get<PersonDetail>(`/persons/${id}`),
  facts: (id: string) => get<Fact[]>(`/persons/${id}/memory/facts`),
  episodes: (id: string) => get<Episode[]>(`/persons/${id}/memory/episodes`),
  chapters: (id: string) => get<Chapter[]>(`/persons/${id}/memory/chapters`),
  traits: (id: string) => get<Trait[]>(`/persons/${id}/memory/traits`),
  rankings: (id: string) => get<PersonRanking[]>(`/persons/${id}/rankings`),
  total: async (p: Search) => (await hub.search({ ...p, size: 1 })).totalElements,
  tagStats: () => get<TagStats[]>('/tags/stats'),
  allAlbums: () => get<Collection[]>('/collections/all', { inclMediaCount: true, inclChildrenCount: true, inclTags: true }),
  albumMedia: (id: string, sortDir: 'asc' | 'desc' = 'asc') => get<MediaFile[]>(`/collections/${id}/media`, { sort: 'effectiveDate', sortDir, inclDetails: true, inclPersons: true, inclTags: true }),
  breadcrumb: (id: string) => get<Collection[]>(`/collections/${id}/breadcrumb`),
  media: (id: string) => get<MediaFile>(`/media-files/${id}`),
};

/** One real line from an old conversation: a random archive, a random spot, the longest of a few lines there. */
export async function randomLine(people: Person[]): Promise<{ text: string; who: string; platform: string; at?: string | null } | null> {
  for (const p of [...people].sort(() => Math.random() - .5).slice(0, 3)) {
    const archives = (await hub.archives(p.id).catch(() => [] as ChatArchive[])).filter(a => a.messageCount > 0);
    if (!archives.length) continue;
    const a = archives[Math.floor(Math.random() * archives.length)], size = 6;
    const page = Math.floor(Math.random() * Math.max(1, Math.floor(a.messageCount / size)));
    const msgs = (await hub.messages(p.id, a.id, page, size).catch(() => null))?.content ?? [];
    const best = msgs.filter(m => m.content && m.content.length > 8 && m.content.length < 220).sort((x, y) => y.content.length - x.content.length)[0];
    if (best) return { text: best.content, who: best.sender, platform: a.platform, at: best.timestamp };
  }
  return null;
}

/* ── Composite reads the cosmos needs ─────────────────────────────────────── */

/** Photos of one calendar day; widens to the month, then the year, so a galaxy is never empty. */
export async function dayOf(year: number, month: number, day: number): Promise<{ scope: 'day' | 'month' | 'year'; items: MediaFile[] }> {
  const d = new Date(year, month - 1, day);
  const exact = await hub.search({ from: isoDay(d), to: isoDay(addDays(d, 1)), size: 24, sortBy: 'effectiveDate', sortDir: 'asc', inclPersons: true });
  if (exact.content.length) return { scope: 'day', items: exact.content };
  const m0 = new Date(year, month - 1, 1), m1 = new Date(year, month, 1);
  const inMonth = await hub.search({ from: isoDay(m0), to: isoDay(m1), size: 12, random: true, inclPersons: true });
  if (inMonth.content.length) return { scope: 'month', items: inMonth.content };
  const inYear = await hub.search({ from: `${year}-01-01`, to: `${year + 1}-01-01`, size: 12, random: true, inclPersons: true });
  return { scope: 'year', items: inYear.content };
}

/** A random real day of `year` that has photos: random populated month → random photo → its day. */
export async function randomDay(year: number, buckets: TimelineBucket[]): Promise<{ month: number; day: number } | null> {
  const months = buckets.filter(b => b.year === year && b.count > 0);
  if (!months.length) return null;
  const pick = months[Math.floor(Math.random() * months.length)];
  const r = await hub.search({ from: isoDay(new Date(year, pick.month - 1, 1)), to: isoDay(new Date(year, pick.month, 1)), size: 1, random: true });
  const iso = r.content[0]?.effectiveDate;
  if (!iso) return { month: pick.month, day: 1 };
  return { month: Number(iso.slice(5, 7)), day: Number(iso.slice(8, 10)) };
}

/** Years in any period string: "2009–2012", "Mùa hè 2010", "2016 - nay". */
export function periodYears(period?: string | null): [number, number] | null {
  const nums = (period ?? '').match(/(19|20)\d{2}/g)?.map(Number);
  if (!nums?.length) return null;
  return [nums[0], /nay|now|present/i.test(period ?? '') ? new Date().getFullYear() : nums[nums.length - 1]];
}

/** Years mentioned by a person's period string ("2009–2012", "2015", "2016 - nay"). */
export function yearsOf(p: Person): [number, number] | null {
  const nums = (p.period ?? '').match(/(19|20)\d{2}/g)?.map(Number);
  if (!nums?.length) return null;
  const end = /nay|now|present/i.test(p.period ?? '') ? new Date().getFullYear() : nums[nums.length - 1];
  return [nums[0], end];
}
export const peopleOfYear = (persons: Person[], y: number) =>
  persons.filter(p => !p.isSelf).filter(p => { const r = yearsOf(p); return r ? y >= r[0] && y <= r[1] : false; });

/** Tags ranked by how much lives in them — one call. */
export async function tagWorlds(limit = 10): Promise<(Tag & { count: number })[]> {
  const stats = await hub.tagStats();
  return stats.filter(t => t.mediaCount > 0).sort((a, b) => b.mediaCount - a.mediaCount).slice(0, limit).map(t => ({ id: t.id, name: t.name, color: t.color, count: t.mediaCount }));
}
