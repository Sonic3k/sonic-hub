/* Shapes as the Angels Islands API returns them. Dates are naive UTC strings
   ("2012-07-14T09:30:00"); see lib/format.ts for how they are read. */

export interface Paged<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  last: boolean;
}

export interface TagRef { id: string; name: string; color?: string | null }
export interface PersonRef { id: string; name: string; nickname?: string | null; avatarUrl?: string | null }

export interface Collection {
  id: string;
  parentId?: string | null;
  name: string;
  slug?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  childrenCount?: number | null;
  mediaCount?: number | null;
  persons?: PersonRef[];
  tags?: TagRef[];
}

export type FileType = 'IMAGE' | 'VIDEO';

export interface MediaFile {
  id: string;
  fileName: string;
  fileType: FileType;
  mimeType?: string | null;
  fileSize?: number | null;
  cdnUrl: string;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  aspectRatio?: number | null;
  orientation?: string | null;
  durationSeconds?: number | null;
  effectiveDate?: string | null;
  dateTaken?: string | null;
  caption?: string | null;
  isFavorite?: boolean;
  isFeatured?: boolean;
  category?: string | null;
  source?: string | null;
  persons?: PersonRef[];
  tags?: TagRef[];
  takenBy?: PersonRef | null;
  imageDetail?: { cameraMake?: string | null; cameraModel?: string | null; lensModel?: string | null;
    focalLength?: number | null; aperture?: number | null; exposureTime?: string | null; iso?: number | null } | null;
  videoDetail?: { codec?: string | null; frameRate?: number | null; bitrate?: number | null } | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
}

export type RelationshipType = 'CRUSH' | 'GIRLFRIEND' | 'EX' | 'FRIEND' | 'ACQUAINTANCE' | 'PEN_PAL' | 'ONLINE_FRIEND';

export interface Person {
  id: string;
  name: string;
  displayName?: string | null;
  nickname?: string | null;
  relationshipType?: RelationshipType | string | null;
  period?: string | null;
  isSelf?: boolean | null;
  isFavorite?: boolean | null;
  isFeatured?: boolean | null;
  avatarUrl?: string | null;
  song?: string | null;
}

export interface PersonDetail extends Person {
  alternativeName?: string | null;
  dateOfBirth?: string | null;
  bio?: string | null;
  firstMet?: string | null;
  howWeMet?: string | null;
  coverUrl?: string | null;
  bannerUrl?: string | null;
  tags?: TagRef[];
  contacts?: { id: string; platform: string; identifier: string; displayName?: string | null }[];
  totalCollections?: number | null;
  totalMediaFiles?: number | null;
  totalChatArchives?: number | null;
  totalFacts?: number | null;
  totalEpisodes?: number | null;
}

export type ChatPlatform = 'YAHOO' | 'FACEBOOK' | 'SMS' | 'ZALO' | 'TELEGRAM' | 'BLOG' | 'OTHER';

export interface ChatArchive {
  id: string;
  platform: ChatPlatform | string;
  title?: string | null;
  messageCount?: number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  extractionStatus?: string | null;
  createdAt?: string | null;
}

/** One month of the timeline, newest first. */
export interface TimelineBucket { year: number; month: number; count: number }

/** A published JournalNote wearing its article face. */
export interface Article {
  id: string;
  kind: 'JOURNAL' | 'ARTICLE';
  status: 'DRAFT' | 'PUBLISHED';
  title?: string | null;
  slug?: string | null;
  excerpt?: string | null;
  content: string;
  category?: string | null;
  coverMedia?: MediaFile | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  tags?: TagRef[];
}
