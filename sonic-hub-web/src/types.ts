/* Shapes exactly as Angels Islands API returns them (checked against the DTOs).
   Dates are naive local wall-clock strings, e.g. "2010-09-30T14:09:00". */

export interface Paged<T> { content: T[]; totalElements: number; totalPages: number; number: number; size: number; last: boolean }
export interface TagRef { id: string; name: string; color?: string | null }
export interface PersonRef { id: string; name: string; displayName?: string | null; nickname?: string | null; avatarUrl?: string | null }

/** When the moment really happened, as far as it is known: date = start of the known span. */
export type DatePrecision = 'DECADE' | 'YEAR' | 'SEASON' | 'MONTH' | 'DAY' | 'HOUR' | 'MINUTE' | 'SECOND';
export interface EventDate { date: string; precision: DatePrecision; approx?: boolean; fromAlbumId?: string | null }

export interface MediaFile {
  id: string; fileName: string; fileType: 'IMAGE' | 'VIDEO' | 'FLASH' | 'AUDIO' | 'DOCUMENT'; mediaCategory?: string | null; orientation?: string | null;
  width?: number | null; height?: number | null; aspectRatio?: number | null; duration?: number | null;
  isFavorite?: boolean; isFeatured?: boolean; caption?: string | null; cdnUrl: string; thumbnailUrl?: string | null;
  /** FLASH / AUDIO / VIDEO: the still that stands for the file (also its thumbnailUrl); FLASH: the music that plays with it */
  posterUrl?: string | null; soundtrackUrl?: string | null;
  dateTaken?: string | null; effectiveDate?: string | null; event?: EventDate | null; latitude?: number | null; longitude?: number | null;
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
  event?: EventDate | null;
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
/** timestamp is UTC (no zone); timePrecision DAY = only the day is known (kept at Vietnam noon), GROUP = the time of its run of lines */
export interface ChatMessage { id: string; sender: string; senderType?: 'SELF' | 'PERSON' | 'OTHER' | 'SYSTEM' | null; content: string; timestamp?: string | null; timePrecision?: 'SECOND' | 'MINUTE' | 'GROUP' | 'DAY' | null; seq?: number | null }
/** A photo / sticker / video / file / link sent with a chat message; hasFile = its file is stored and served by the API. */
export interface ChatAttachment {
  id: string; messageId: string; type: 'PHOTO' | 'VIDEO' | 'AUDIO' | 'FILE' | 'GIF' | 'STICKER' | 'LINK';
  fileName?: string | null; url?: string | null; hasFile: boolean; contentType?: string | null; sizeBytes?: number | null;
  timestamp?: string | null; senderType?: ChatMessage['senderType']; seq?: number | null;
}

export interface TagStats { id: string; name: string; color?: string | null; mediaCount: number; albumCount: number; noteCount: number }

export interface PersonDetail extends Person {
  alternativeName?: string | null; dateOfBirth?: string | null; birthDay?: number | null; birthMonth?: number | null; birthYear?: number | null; bio?: string | null; firstMet?: string | null; howWeMet?: string | null;
  gender?: 'MALE' | 'FEMALE' | null;
  /** birth time and place: only the owner gets them (blank for everyone else) */
  birthTime?: string | null; birthTimeApprox?: boolean | null; birthTimeZone?: string | null; birthUtcOffsetMinutes?: number | null;
  birthPlace?: string | null; birthLatitude?: number | null; birthLongitude?: number | null;
  coverUrl?: string | null; bannerUrl?: string | null; tags?: TagRef[] | null; contacts?: Contact[] | null;
  totalCollections?: number | null; totalMediaFiles?: number | null; totalChatArchives?: number | null; totalFacts?: number | null; totalEpisodes?: number | null;
}
export interface Contact { id: string; platform: string; identifier: string; displayName?: string | null; notes?: string | null }
export interface Fact { id: string; category?: string | null; key?: string | null; value?: string | null; period?: string | null; confidence?: number | null; source?: string | null }
export interface Episode {
  id: string; summary: string; emotion?: string | null; importance?: number | null; occurredAt?: string | null; source?: string | null;
  /** a memory: what kind (TRIP, MILESTONE, MOMENT…), its date as far as known (when = "1995", "Hè 1998"), how long it lasted, where */
  title?: string | null; kind?: string | null; status?: 'DRAFT' | 'CONFIRMED' | null; precision?: DatePrecision | null; approx?: boolean | null;
  when?: string | null; endAt?: string | null; place?: string | null; latitude?: number | null; longitude?: number | null; externalKey?: string | null;
  media?: { id: string; fileName: string; url?: string | null; caption?: string | null; width?: number | null; height?: number | null }[] | null;
  collections?: { id: string; name: string }[] | null; tags?: TagRef[] | null; persons?: PersonRef[] | null;
  /** where it is told: forum posts, chat messages, notes — with the words as they were written */
  sourceViews?: MemorySource[] | null;
  /** the event it belongs to (its title only on a single memory) */
  lifeEventId?: string | null; lifeEventTitle?: string | null;
}
export interface MemorySource {
  kind: 'FORUM' | 'CHAT' | 'NOTE' | 'LINK'; position?: number | null; excerpt?: string | null; author?: string | null; saidAt?: string | null; url?: string | null;
  threadId?: string | null; threadTitle?: string | null; forumKey?: string | null; forumName?: string | null;
  archiveId?: string | null; archivePlatform?: string | null; archiveTitle?: string | null; archivePersonId?: string | null; archivePersonName?: string | null;
  noteId?: string | null; noteTitle?: string | null; noteSlug?: string | null;
}
export interface RandomMemory { type: 'episode' | 'fact' | 'chapter' | 'trait'; episode?: Episode | null; fact?: Fact | null; chapter?: Chapter | null; trait?: Trait | null }
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
/** A month of messages: [yyyy-mm, Facebook, Yahoo, SMS, Zalo]. */
export type ChatMonth = [string, ...number[]];
/** A person's messages counted from every chat filed under them (all their nicks and accounts), as the data is now.
 *  Days, months, hours, first and last are Vietnam time. */
export interface ChatStats {
  messages?: number; by_platform?: Record<string, number>; self?: number; them?: number; first?: string; last?: string;
  peak_month?: { month: string; messages: number }; peak_day?: { date: string; messages: number }; active_days?: number;
  longest_streak?: { days: number; from: string; to: string }; conversations?: number;
  started_by?: { self?: number; them?: number }; reply_median_s?: { self?: number | null; them?: number | null };
  monthly?: ChatMonth[]; hours?: number[];
}
/** Every Angel by their messages with him, counted the same way. */
export interface ChatBoard { title: string; series: string[]; entries: RankingEntry[] }
/** One person's row in one ranking. */
export interface PersonRanking {
  id: string; personId?: string | null; label: string; rank?: number | null; points?: number | null; period?: string | null;
  metrics?: Record<string, unknown> | null; note?: string | null; ranking: RankingSummary;
}

/** What Huyền học (the Mystic site) has read for a person — one brief per discipline, pushed by Mystic. Lines in the
 *  primary layer are grandma's own words; added ones come from other books or AI. */
export interface MysticBrief {
  discipline: string; title: string; subjectId?: string | null; profileId?: string | null; profileLabel?: string | null; url?: string | null;
  facts: { label: string; value: string }[];
  lines: { layer: 'primary' | 'added'; text: string; source?: string | null }[];
  updatedAt?: string | null; receivedAt?: string | null;
}


/** Sự kiện: a trip, a concert, a purchase — the frame memories sit in. when = "2023-02-16 → 2023-02-20" */
export interface LifeEventMoney { currency: string; out: number; in: number; count: number }
export interface LifeEvent {
  id: string; parentId?: string | null; title: string; kind?: string | null; summary?: string | null; place?: string | null; when: string;
  precision?: DatePrecision | null; approx?: boolean; startAt: string; endAt?: string | null; endExclusive: string; coverUrl?: string | null;
  latitude?: number | null; longitude?: number | null; albums: number; memories: number; transactions: number; people: number; children: number;
  money: LifeEventMoney[];
}
export interface LifeEventDetail extends LifeEvent {
  parent?: LifeEvent | null; childEvents: LifeEvent[];
  persons: { id: string; name: string; nickname?: string | null; avatarUrl?: string | null }[];
  albumList: { id: string; name: string; mediaCount?: number | null; thumbnailUrl?: string | null }[];
  memoryList: { id: string; title?: string | null; summary?: string | null; when?: string | null; occurredAt?: string | null; kind?: string | null }[];
  transactionList: { id: string; occurredAt: string; amount: number; currency: string; kind: string; description?: string | null; payeeName?: string | null; category?: string | null }[];
}
export interface LifeEventAt { moment: string; current: LifeEvent[]; previous?: LifeEvent | null; next?: LifeEvent | null }

/** Kệ game: a game as the shelf lists it. played = "2007 – 2010"; spans = each stretch he played it and on which machine;
 *  portal = playable on the portal itself, machine = playable inside a machine of its time; mine = something of his is on it. */
export type GameKind = 'OFFICIAL' | 'FAN' | 'HOMEMADE' | 'REMAKE' | 'REFERENCE';
export interface GameCard {
  id: string; key: string; title: string; kind: GameKind; platform?: string | null; developer?: string | null; genre?: string | null;
  versions?: string | null; handName?: string | null; handOrder?: number | null; coverUrl?: string | null; iconUrl?: string | null;
  basedOnKey?: string | null; played?: string | null; releaseYear?: number | null; seriesOrder?: number | null; favorite: boolean;
  series?: { key: string; name: string } | null; playFrom?: string | null; playTo?: string | null; devices: string[];
  portal: boolean; machine: boolean; spans?: { from: string; to: string; device?: string | null }[] | null; mine?: boolean;
}
export interface GamePlay {
  id: string; startAt: string; endAt?: string | null; precision: DatePrecision; when: string; deviceKey?: string | null; deviceName?: string | null;
  via?: string | null; version?: string | null; evidence?: string | null; note?: string | null; approx: boolean;
  /** the evening its machine is opened at: a day of the play on which that machine was there */
  at?: string | null;
}
/** a play that left a trace (a save, a score table, his own words), with the game it belongs to */
export interface GameTrace { gameKey: string; gameTitle: string; play: GamePlay }
export interface GameLink { id: string; kind: string; title?: string | null; url: string; note?: string | null }
export interface GameMedia { linkId: string; role: string; label?: string | null; media: MediaFile }
export interface GameMemory {
  id: string; title?: string | null; summary?: string | null; when?: string | null; kind?: string | null; coverUrl?: string | null;
  occurredAt?: string | null; persons?: { id: string; name: string; avatarUrl?: string | null }[] | null;
}
export interface GamePackage {
  id: string; key: string; engine: string; title?: string | null; fileName?: string | null; saveFileName?: string | null; config?: string | null;
  note?: string | null; gameKey: string; gameTitle: string; fileSize?: number | null; saveSize?: number | null; saveAt?: string | null;
  hasFile: boolean; hasSave: boolean; portal: boolean;
}
export interface GameSpot { packageKey: string; deviceKey: string; deviceName: string; label?: string | null; at: string; from?: string | null; to?: string | null }
export interface GameDetail extends GameCard {
  summary?: string | null; note?: string | null; basedOn?: GameCard | null; derived: GameCard[]; seriesGames: GameCard[];
  plays: GamePlay[]; links: GameLink[]; media: GameMedia[]; memories: GameMemory[];
  notes: { id: string; title?: string | null; slug?: string | null; excerpt?: string | null; writtenAt?: string | null }[]; packages: GamePackage[]; spots: GameSpot[];
  /** results of matches are filed under it (hub.gameMatches) */
  hasMatches?: boolean;
}
/** a result written down between two sides (a "kèo"): games each side took, the sides in the record's order */
export interface GameMatchPlayer { name: string; self: boolean; rating?: number | null }
export interface GameMatch {
  id: string; key: string; playedAt: string; map?: string | null; score1?: number | null; score2?: number | null; note?: string | null;
  side1: GameMatchPlayer[]; side2: GameMatchPlayer[];
}
export interface GameSeries { id: string; key: string; name: string; summary?: string | null; coverUrl?: string | null; sortOrder?: number | null; games: GameCard[] }
