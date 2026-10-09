/* Shapes exactly as Angels Islands API returns them (checked against the DTOs).
   Dates are naive local wall-clock strings, e.g. "2010-09-30T14:09:00". */

export interface Paged<T> { content: T[]; totalElements: number; totalPages: number; number: number; size: number; last: boolean }
export interface TagRef { id: string; name: string; color?: string | null }
export interface PersonRef { id: string; name: string; displayName?: string | null; nickname?: string | null; avatarUrl?: string | null }

export interface MediaFile {
  id: string; fileName: string; fileType: 'IMAGE' | 'VIDEO' | 'FLASH' | 'AUDIO'; mediaCategory?: string | null; orientation?: string | null;
  width?: number | null; height?: number | null; aspectRatio?: number | null; duration?: number | null;
  isFavorite?: boolean; isFeatured?: boolean; caption?: string | null; cdnUrl: string; thumbnailUrl?: string | null;
  /** FLASH / AUDIO / VIDEO: the still that stands for the file (also its thumbnailUrl); FLASH: the music that plays with it */
  posterUrl?: string | null; soundtrackUrl?: string | null;
  dateTaken?: string | null; effectiveDate?: string | null; latitude?: number | null; longitude?: number | null;
  displayedAddress?: string | null; timezone?: string | null; mediaSource?: string | null; fileExtension?: string | null;
  persons?: PersonRef[] | null; tags?: TagRef[] | null; takenBy?: PersonRef | null;
  imageDetail?: { cameraMake?: string | null; cameraModel?: string | null; lensModel?: string | null; iso?: number | null; focalLength?: string | number | null; aperture?: string | number | null; shutterSpeed?: string | null } | null;
}

export interface Person {
  id: string; name: string; displayName?: string | null; nickname?: string | null; relationshipType?: string | null;
  period?: string | null; isSelf?: boolean | null; isFavorite?: boolean | null; isFeatured?: boolean | null; avatarUrl?: string | null; song?: string | null;
}

export interface Collection {
  id: string; name: string; description?: string | null; parentId?: string | null; parentName?: string | null;
  childrenCount?: number | null; mediaCount?: number | null; thumbnailUrl?: string | null; tags?: TagRef[] | null; persons?: PersonRef[] | null;
}

export interface Tag { id: string; name: string; color?: string | null }

export interface Note {
  id: string; title?: string | null; content: string; mood?: string | null; createdAt?: string | null; updatedAt?: string | null;
  kind?: 'JOURNAL' | 'ARTICLE' | string | null; status?: 'DRAFT' | 'PUBLISHED' | string | null; slug?: string | null; excerpt?: string | null;
  category?: string | null; publishedAt?: string | null; coverMedia?: MediaFile | null; tags?: TagRef[] | null;
  /** written by someone else: the person on the portal and/or the name, and when it was written */
  authorPersonId?: string | null; authorPersonName?: string | null; authorName?: string | null; writtenAt?: string | null; source?: string | null;
  series?: string | null; seriesOrder?: number | null;
}

export interface SeriesPart { id: string; title?: string | null; seriesOrder?: number | null; slug?: string | null; authorPersonId?: string | null; authorPersonName?: string | null; authorName?: string | null; writtenAt?: string | null }

/* ── old forums (onthi.com…) ── */
export interface ForumPerson { id: string; name: string; displayName?: string | null; avatarUrl?: string | null; isSelf: boolean }
export interface Forum { key: string; name: string; url?: string | null; description?: string | null; threadCount: number; postCount: number; memberCount: number; firstPostAt?: string | null; lastPostAt?: string | null }
export interface ForumBoard { board: string; threadCount: number; postCount: number; lastPostAt?: string | null }
export interface ForumThread { id: string; title: string; board?: string | null; startedAt?: string | null; lastPostAt?: string | null; postCount: number; starterNick?: string | null; starter?: ForumPerson | null; people: ForumPerson[] }
export interface ForumPost { id: string; sortOrder: number; authorNick: string; person?: ForumPerson | null; postedAt?: string | null; title?: string | null; contentHtml?: string | null }
export interface ForumThreadDetail { id: string; forumKey: string; forumName: string; title: string; board?: string | null; startedAt?: string | null; lastPostAt?: string | null; postCount: number; captured?: string[] | null; posts: ForumPost[] }
export interface ForumPostHit { id: string; threadId: string; threadTitle: string; forumKey: string; board?: string | null; authorNick: string; person?: ForumPerson | null; postedAt?: string | null; title?: string | null; snippet: string }
export interface ForumMember { id: string; nick: string; displayName?: string | null; joinedAt?: string | null; intro?: string | null; awards?: { title: string; points: number }[] | null; topicCount?: number | null; replyCount?: number | null; person?: ForumPerson | null; postCount: number }
export interface ForumPage<T> { content: T[]; totalElements: number; page: number; size: number }
export interface PersonForum { forumKey: string; forumName: string; postCount: number; threadCount: number; firstAt?: string | null; lastAt?: string | null; nicks: string }

export interface TimelineBucket { year: number; month: number; count: number }

export interface ChatArchive { id: string; platform: string; title?: string | null; messageCount: number; dateFrom?: string | null; dateTo?: string | null }
export interface ChatMessage { id: string; sender: string; senderType?: 'SELF' | 'PERSON' | 'OTHER' | 'SYSTEM' | null; content: string; timestamp?: string | null; seq?: number | null }

export interface TagStats { id: string; name: string; color?: string | null; mediaCount: number; albumCount: number; noteCount: number }

export interface PersonDetail extends Person {
  alternativeName?: string | null; dateOfBirth?: string | null; bio?: string | null; firstMet?: string | null; howWeMet?: string | null;
  coverUrl?: string | null; bannerUrl?: string | null; tags?: TagRef[] | null;
  totalCollections?: number | null; totalMediaFiles?: number | null; totalChatArchives?: number | null; totalFacts?: number | null; totalEpisodes?: number | null;
}
export interface Fact { id: string; category?: string | null; key?: string | null; value?: string | null; period?: string | null; confidence?: number | null; source?: string | null }
export interface Episode { id: string; summary: string; emotion?: string | null; importance?: number | null; occurredAt?: string | null; source?: string | null }
export interface Chapter { id: string; period?: string | null; title?: string | null; summary?: string | null; sentiment?: string | null; sortOrder?: number | null; source?: string | null }
export interface Trait { id: string; trait: string; description?: string | null; evidence?: string | null; period?: string | null; source?: string | null }

/** A ranked list at one moment (relationship sheet, fb association month, Moments, chat activity). */
export interface RankingSummary {
  id: string; board: string; period: string; variant?: string | null; title?: string | null; takenOn?: string | null;
  source?: string | null; columns?: string[] | null; entryCount: number;
}
/** One row of a ranking (board endpoint: metrics only when asked for). */
export interface RankingEntry {
  id: string; personId?: string | null; personName?: string | null; label: string; rank?: number | null; points?: number | null;
  period?: string | null; metrics?: Record<string, unknown> | null; note?: string | null;
}
/** A whole list with its rows, as GET /rankings/board/{board} returns them. */
export interface RankingDetail extends RankingSummary { entries: RankingEntry[] }
/** One person's row in one ranking. */
export interface PersonRanking {
  id: string; personId?: string | null; label: string; rank?: number | null; points?: number | null; period?: string | null;
  metrics?: Record<string, unknown> | null; note?: string | null; ranking: RankingSummary;
}
