import { apiUrl, get } from './client';
import type { DeskMemory, DeskMoment, GameCard, GameDetail, GameMatch, GamePackage, GameSeries, GameTrace, Chapter, LifeEvent, LifeEventAt, LifeEventDetail, ChatArchive, ChatBoard, ChatStats, RandomMemory, ChatAttachment, ChatMessage, Collection, Episode, Fact, Forum, ForumBoard, ForumMember, ForumPage, ForumPostHit, ForumThread, ForumThreadDetail, MediaFile, MysticBrief, Note, Paged, Person, PersonDetail, PersonForum, PersonRanking, RankingDetail, SeriesPart, Tag, TagStats, TimelineBucket, Trait } from '../types';
import { isoDay, addDays } from '../lib/date';

export interface Search {
  type?: 'IMAGE' | 'VIDEO'; favorite?: boolean; featured?: boolean; personId?: string; collectionId?: string;
  tagIds?: string[]; tagNames?: string[]; q?: string; from?: string; to?: string; vague?: boolean; random?: boolean;
  page?: number; size?: number; sortBy?: string; sortDir?: 'asc' | 'desc'; inclPersons?: boolean; inclTags?: boolean;
}

/** The links a list of memories can carry. The API sends none unless asked, so each list asks for what it shows;
 *  a single memory (hub.episode) always comes whole. */
export type MemoryLinks = { inclMedia?: boolean; inclCollections?: boolean; inclTags?: boolean; inclPersons?: boolean; inclSources?: boolean };
/** what a memory's card shows: its cover photo, who was there, its tags */
export const MEMORY_CARD: MemoryLinks = { inclMedia: true, inclPersons: true, inclTags: true };

export const hub = {
  games: () => get<GameCard[]>('/games'),
  game: (key: string) => get<GameDetail>(`/games/${encodeURIComponent(key)}`),
  gameTraces: () => get<GameTrace[]>('/games/traces'),
  gameMatches: (key: string) => get<GameMatch[]>(`/games/${encodeURIComponent(key)}/matches`),
  gameSeries: () => get<GameSeries[]>('/game-series'),
  gameSeriesOne: (key: string) => get<GameSeries>(`/game-series/${encodeURIComponent(key)}`),
  gamePackage: (key: string) => get<GamePackage>(`/game-packages/${encodeURIComponent(key)}`),
  gamePackages: () => get<GamePackage[]>('/game-packages'),
  timeline: () => get<TimelineBucket[]>('/media-files/timeline-index', { tz: 'Asia/Ho_Chi_Minh' }),
  search: (p: Search) => get<Paged<MediaFile>>('/media-files/search', p as Record<string, string | number | boolean | string[] | undefined>),
  persons: () => get<Person[]>('/persons'),
  tags: () => get<Tag[]>('/tags'),
  albums: async () => {
    const root = await get<Collection>('/collections/root', { inclChildrenCount: true, inclMediaCount: true });
    return get<Collection[]>(`/collections/${root.id}/children`, { inclChildrenCount: true, inclMediaCount: true });
  },
  notes: (p: { kind?: string; status?: string; category?: string; tagId?: string; q?: string; page?: number; size?: number; authorId?: string }) => get<Paged<Note>>('/journal/notes', p),
  seriesParts: (name: string) => get<SeriesPart[]>('/journal/series/parts', { name }),
  forums: () => get<Forum[]>('/forums'),
  forum: (key: string) => get<Forum>(`/forums/${key}`),
  forumBoards: (key: string) => get<ForumBoard[]>(`/forums/${key}/boards`),
  forumThreads: (key: string, p: { board?: string; q?: string; sort?: string; page?: number; size?: number; at?: string }) => get<ForumPage<ForumThread>>(`/forums/${key}/threads`, p),
  forumThread: (id: string) => get<ForumThreadDetail>(`/forum-threads/${id}`),
  forumPosts: (key: string, p: { q?: string; personId?: string; nick?: string; page?: number; size?: number }) => get<ForumPage<ForumPostHit>>(`/forums/${key}/posts`, p),
  forumMembers: (key: string) => get<ForumMember[]>(`/forums/${key}/members`),
  personForums: (id: string) => get<PersonForum[]>(`/persons/${id}/forums`),
  personForumPosts: (id: string, page = 0, size = 10) => get<ForumPage<ForumPostHit>>(`/persons/${id}/forum-posts`, { page, size }),
  noteBySlug: (slug: string) => get<Note>(`/journal/notes/slug/${encodeURIComponent(slug)}`),
  noteById: (id: string) => get<Note>(`/journal/notes/${id}`),
  categories: () => get<string[]>('/journal/categories'),
  archives: (personId: string) => get<ChatArchive[]>(`/persons/${personId}/chat-archives`),
  messages: (personId: string, archiveId: string, page: number, size: number, q?: string) => get<Paged<ChatMessage>>(`/persons/${personId}/chat-archives/${archiveId}/messages`, { page, size, q }),
  /** where message seq N falls in the reader's list */
  messagePosition: (personId: string, archiveId: string, seq: number) => get<{ index: number }>(`/persons/${personId}/chat-archives/${archiveId}/messages/position`, { seq }),
  /** Attachments of these messages; ids go 100 to a request so the URL stays short. */
  chatAttachments: async (personId: string, archiveId: string, messageIds: string[]) => {
    const parts: Promise<ChatAttachment[]>[] = [];
    for (let i = 0; i < messageIds.length; i += 100)
      parts.push(get<ChatAttachment[]>(`/persons/${personId}/chat-archives/${archiveId}/attachments`, { messageIds: messageIds.slice(i, i + 100).join(',') }));
    return (await Promise.all(parts)).flat();
  },
  /** One archive's attachments for the gallery; type is comma-separated (PHOTO,GIF). */
  chatAttachmentsAll: (personId: string, archiveId: string, p: { page?: number; size?: number; type?: string; order?: 'asc' | 'desc' }) =>
    get<Paged<ChatAttachment>>(`/persons/${personId}/chat-archives/${archiveId}/attachments/all`, p),
  /** The stored file of an attachment (only when hasFile). */
  attachmentUrl: (id: string) => apiUrl(`/chat-attachments/${id}/content`),
  person: (id: string) => get<PersonDetail>(`/persons/${id}`),
  mysticBriefs: (id: string) => get<MysticBrief[]>(`/persons/${id}/mystic-briefs`),
  facts: (id: string) => get<Fact[]>(`/persons/${id}/memory/facts`),
  /** one person's memories, newest first; q = words anywhere (marks optional), best match first.
   *  Without links (media, people, tags, albums, sources) unless p asks for them — see MemoryLinks. */
  episodes: (id: string, p?: { q?: string; kind?: string; tagId?: string; withPersonId?: string; oldestFirst?: boolean; source?: string } & MemoryLinks) => get<Episode[]>(`/persons/${id}/memory/episodes`, p),
  episode: (personId: string, id: string) => get<Episode>(`/persons/${personId}/memory/episodes/${id}`),
  /** a memory's photos as whole files (camera, people, tags — what the viewer shows), in the memory's order: one request for all */
  episodeMedia: (personId: string, id: string) => get<MediaFile[]>(`/persons/${personId}/memory/episodes/${id}/media`, { inclDetails: true, inclPersons: true, inclTags: true }),
  /** memories picked at random; types = episode,fact,chapter,trait */
  randomMemory: (id: string, count = 1, types?: string, links?: MemoryLinks) => get<RandomMemory[]>(`/persons/${id}/memory/random`, { count, types, ...links }),
  chapters: (id: string) => get<Chapter[]>(`/persons/${id}/memory/chapters`),
  /** events (sự kiện) of the hub's owner, oldest first */
  events: () => get<LifeEvent[]>('/events'),
  event: (id: string) => get<LifeEventDetail>(`/events/${id}`),
  /** the events a moment is inside, the one before and the next one */
  eventsAt: (moment: string) => get<LifeEventAt>('/events/at', { moment }),
  /** the computer and the phone of a moment ("2007-11-12T21:00", Vietnam wall-clock), every machine he had, that day's memories */
  deskAt: (at: string) => get<DeskMoment>('/desk/at', { at }),
  /** memories up to a moment, newest first — everyone's, a page of them */
  memoriesUpTo: (at: string, size = 100) => get<{ items: DeskMemory[]; total: number }>('/desk/memories', { at, size }),
  traits: (id: string) => get<Trait[]>(`/persons/${id}/memory/traits`),
  rankings: (id: string) => get<PersonRanking[]>(`/persons/${id}/rankings`),
  /** messages with one person, every nick and account together, counted from the chats as they are now */
  chatStats: (id: string) => get<ChatStats>(`/persons/${id}/chat-stats`),
  /** every Angel by messages, counted the same way */
  chatBoard: () => get<ChatBoard>('/chat-stats'),
  /** Every list of one board with its rows, oldest first; metrics (heavy) only when asked for. */
  rankingBoard: (board: string, metrics = false) => get<RankingDetail[]>(`/rankings/board/${encodeURIComponent(board)}`, { metrics: metrics || undefined }),
  /** One column of a board's sheets per person ({personId: value}), each from the latest sheet that has them. */
  rankingColumn: (board: string, key: string) => get<Record<string, string>>(`/rankings/board/${encodeURIComponent(board)}/column/${encodeURIComponent(key)}`),
  total: async (p: Search) => (await hub.search({ ...p, size: 1 })).totalElements,
  tagStats: () => get<TagStats[]>('/tags/stats'),
  allAlbums: () => get<Collection[]>('/collections/all', { inclMediaCount: true, inclChildrenCount: true, inclTags: true }),
  albumMedia: (id: string, sortDir: 'asc' | 'desc' = 'asc') => get<MediaFile[]>(`/collections/${id}/media`, { sort: 'effectiveDate', sortDir, inclDetails: true, inclPersons: true, inclTags: true }),
  breadcrumb: (id: string) => get<Collection[]>(`/collections/${id}/breadcrumb`),
  media: (id: string) => get<MediaFile>(`/media-files/${id}`),
};

/** One real line from an old conversation: a random archive, a random spot, the longest of a few lines there.
 *  Not everyone has a conversation kept: a few people are tried before giving up. */
export async function randomLine(people: Person[]): Promise<{ text: string; who: string; platform: string; at?: string | null } | null> {
  for (const p of [...people].sort(() => Math.random() - .5).slice(0, 6)) {
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
/** An Angel: not yourself, type ANGEL (or not given a type yet). Friends and others are not listed as Angels. */
export const isAngel = (p: Person) => !p.isSelf && (!p.relationshipType || p.relationshipType === 'ANGEL');
export const peopleOfYear = (persons: Person[], y: number) =>
  persons.filter(isAngel).filter(p => { const r = yearsOf(p); return r ? y >= r[0] && y <= r[1] : false; });

/** Tags ranked by how much lives in them — one call. */
export async function tagWorlds(limit = 10): Promise<(Tag & { count: number })[]> {
  const stats = await hub.tagStats();
  return stats.filter(t => t.mediaCount > 0).sort((a, b) => b.mediaCount - a.mediaCount).slice(0, limit).map(t => ({ id: t.id, name: t.name, color: t.color, count: t.mediaCount }));
}

/** a game package's file and its save, streamed by the API from the private bucket */
export const packageFile = (key: string) => apiUrl(`/game-packages/${encodeURIComponent(key)}/file`);
export const packageSave = (key: string) => apiUrl(`/game-packages/${encodeURIComponent(key)}/save`);
