/** ANGEL / FRIEND / FAMILY / OTHER are the types to pick; the older ones stay until every person has moved off them. */
export type RelationshipType = 'ANGEL' | 'FRIEND' | 'FAMILY' | 'OTHER'
export type Platform = 'YAHOO' | 'FACEBOOK' | 'SMS' | 'ZALO' | 'TELEGRAM' | 'BLOG' | 'OTHER'
export type ContactPlatform = 'YAHOO' | 'FACEBOOK' | 'ZALO' | 'TELEGRAM' | 'SMS' | 'PHONE' | 'BLOG' | 'INSTAGRAM' | 'TIKTOK' | 'OTHER'
export type ExtractionStatus = 'PENDING' | 'EXTRACTING' | 'DONE' | 'ERROR'

// List response (Summary DTO)
export interface PersonSummary {
  id: string; name: string; displayName?: string; nickname?: string
  relationshipType?: RelationshipType; period?: string
  isSelf?: boolean; isFavorite?: boolean; isFeatured?: boolean; avatarUrl?: string; song?: string
}

// Detail response (DetailResponse DTO)
export interface PersonDetail extends PersonSummary {
  alternativeName?: string; dateOfBirth?: string; bio?: string
  birthDay?: number | null; birthMonth?: number | null; birthYear?: number | null
  gender?: 'MALE' | 'FEMALE' | null
  /** what Huyền học reads a chart from: the clock time ("HH:mm"), its zone and offset, and the birthplace */
  birthTime?: string | null; birthTimeApprox?: boolean | null; birthTimeZone?: string | null; birthUtcOffsetMinutes?: number | null
  birthPlace?: string | null; birthLatitude?: number | null; birthLongitude?: number | null
  firstMet?: string; howWeMet?: string; coverUrl?: string; bannerUrl?: string
  tags?: TagResponse[]; contacts?: ContactResponse[]
  totalCollections?: number; totalMediaFiles?: number
  totalChatArchives?: number; totalFacts?: number; totalEpisodes?: number
  createdAt?: string; updatedAt?: string
}

// Request DTO
export interface PersonRequest {
  name?: string; displayName?: string; alternativeName?: string; nickname?: string
  dateOfBirth?: string; bio?: string; relationshipType?: RelationshipType
  birthDay?: number; birthMonth?: number; birthYear?: number
  /** "" clears; clearing birthTime clears its zone, offset and approx flag, clearing birthPlace its coordinates */
  gender?: string; birthTime?: string; birthTimeApprox?: boolean; birthTimeZone?: string; birthUtcOffsetMinutes?: number
  birthPlace?: string; birthLatitude?: number; birthLongitude?: number
  period?: string; firstMet?: string; howWeMet?: string; song?: string
  isSelf?: boolean; isFavorite?: boolean; isFeatured?: boolean; tagIds?: number[]
}

export interface ContactResponse { id: string; platform: ContactPlatform; identifier: string; displayName?: string; notes?: string; createdAt?: string }
export interface ContactRequest { platform: string; identifier: string; displayName?: string; notes?: string }

export interface TagResponse { id: string; name: string; color?: string; description?: string }
export interface TagRequest { name: string; color?: string; description?: string }
export interface TagStats { id: string; name: string; color?: string; mediaCount: number; albumCount: number; noteCount: number }

export interface MediaFileResponse {
  id: string; fileName: string; fileType: 'IMAGE' | 'VIDEO' | 'FLASH' | 'AUDIO' | 'DOCUMENT'; mediaCategory?: string
  fileSize?: number; width?: number; height?: number; orientation?: string; aspectRatio?: number
  mimeType?: string; caption?: string; cdnUrl?: string; thumbnailUrl?: string
  /** FLASH / AUDIO / VIDEO: the still shown for the file (also its thumbnailUrl); FLASH: the music played with it */
  posterUrl?: string; soundtrackUrl?: string
  dateTaken?: string; fileDateCreated?: string; fileDateModified?: string
  effectiveDate?: string; uploadedAt?: string
  event?: EventDate | null
  latitude?: number; longitude?: number; displayedAddress?: string; timezone?: string
  duration?: number; isAnimated?: boolean; isFavorite?: boolean; isFeatured?: boolean
  persons?: { id: string; name: string; displayName?: string; avatarUrl?: string }[]
  takenBy?: { id: string; name: string; displayName?: string; avatarUrl?: string }
  mediaSource?: string
  fileExtension?: string
  tags?: TagResponse[]
  // Image EXIF
  imageDetail?: {
    cameraMake?: string; cameraModel?: string; lensModel?: string
    iso?: number; focalLength?: number; aperture?: number; shutterSpeed?: string
    colorSpace?: string; flashFired?: boolean; whiteBalance?: string
    exposureMode?: string; meteringMode?: string; software?: string
    isSelfie?: boolean; isScreenshot?: boolean; isPanorama?: boolean; isPortrait?: boolean
  }
  // Video
  videoDetail?: {
    videoCodec?: string; audioCodec?: string; fps?: number; bitrate?: number
  }
}

/** When the moment really happened, as far as it is known (start of the known span). */
export type DatePrecision = 'DECADE' | 'YEAR' | 'SEASON' | 'MONTH' | 'DAY' | 'HOUR' | 'MINUTE' | 'SECOND'
export interface EventDate { date: string; precision: DatePrecision; approx?: boolean; fromAlbumId?: string | null }
export interface EventDateInput { date: string; precision?: DatePrecision; approx?: boolean }

export interface CollectionResponse {
  id: string; name: string; description?: string; parentId?: string; parentName?: string
  childrenCount?: number; mediaCount?: number; thumbnailUrl?: string; createdAt?: string
  tags?: TagResponse[]; persons?: { id: string; name: string; displayName?: string; avatarUrl?: string }[]
  event?: EventDate | null
}
export interface CollectionRequest { name?: string; description?: string; parentId?: string; personIds?: string[]; tagIds?: string[]; event?: EventDateInput }

export interface ChatArchiveResponse {
  id: string; platform: Platform; title?: string; messageCount?: number
  dateFrom?: string; dateTo?: string; extractionStatus: ExtractionStatus; createdAt: string
  externalKey?: string; sources?: string
  // other chats (not linked to anyone in Persons)
  counterpart?: string; counterpartKey?: string; personId?: string; personName?: string
}

export interface FactResponse { id: string; category: string; key: string; value: string; period?: string; confidence?: number; source?: string; createdAt?: string }
export interface FactRequest { category: string; key: string; value: string; period?: string; confidence?: number }

export interface EpisodeResponse { id: string; summary: string; emotion?: string; importance?: number; occurredAt?: string; createdAt?: string }
export interface EpisodeRequest { summary: string; emotion?: string; importance?: number; occurredAt?: string }

export interface ChapterResponse { id: string; period: string; title?: string; summary?: string; sentiment?: string; sortOrder?: number; createdAt?: string }
export interface ChapterRequest { period: string; title?: string; summary?: string; sentiment?: string; sortOrder?: number }

export interface TraitResponse { id: string; trait: string; description?: string; evidence?: string; period?: string; createdAt?: string }
export interface TraitRequest { trait: string; description?: string; evidence?: string; period?: string }

/** A long write-up about a person (Markdown), one per source — e.g. "deep" = Claude's deep research */
export interface PersonReport { id: string; source: string; title: string; content: string; updatedAt?: string }

export interface ProblemResponse {
  id: string; title: string; description?: string; status: string
  resolvedAt?: string; createdAt?: string; noteCount?: number
}
export interface ProblemRequest { title?: string; description?: string; status?: string }
export type NoteKind = 'JOURNAL' | 'ARTICLE'
export type NoteStatus = 'DRAFT' | 'PUBLISHED'
export interface JournalNoteResponse {
  id: string; title?: string; content: string; mood?: string
  createdAt?: string; updatedAt?: string
  tags?: TagResponse[]; problems?: ProblemResponse[]
  // article face
  kind?: NoteKind; slug?: string; excerpt?: string; coverMedia?: MediaFileResponse
  category?: string; status?: NoteStatus; publishedAt?: string
  // written by someone else (both author fields empty = my own note)
  authorPersonId?: string; authorPersonName?: string; authorName?: string
  writtenAt?: string; source?: string; externalKey?: string
}
export interface JournalNoteRequest {
  title?: string; content?: string; mood?: string; problemIds?: string[]; tagIds?: string[]
  kind?: NoteKind; slug?: string; excerpt?: string; coverMediaId?: string; clearCover?: boolean
  category?: string; status?: NoteStatus; publishedAt?: string
  authorPersonId?: string; authorName?: string; clearAuthor?: boolean
  writtenAt?: string; clearWrittenAt?: boolean; source?: string
}
export interface JournalAuthor { personId?: string; name?: string; notes: number }

export interface Paged<T> { content: T[]; totalElements: number; totalPages: number; number: number; last: boolean }
