/* Shapes exactly as Angels Islands API returns them (checked against the DTOs).
   Dates are naive local wall-clock strings, e.g. "2010-09-30T14:09:00". */

export interface Paged<T> { content: T[]; totalElements: number; totalPages: number; number: number; size: number; last: boolean }
export interface TagRef { id: string; name: string; color?: string | null }
export interface PersonRef { id: string; name: string; displayName?: string | null; nickname?: string | null; avatarUrl?: string | null }

export interface MediaFile {
  id: string; fileName: string; fileType: 'IMAGE' | 'VIDEO'; mediaCategory?: string | null; orientation?: string | null;
  width?: number | null; height?: number | null; aspectRatio?: number | null; duration?: number | null;
  isFavorite?: boolean; isFeatured?: boolean; caption?: string | null; cdnUrl: string; thumbnailUrl?: string | null;
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
}

export interface TimelineBucket { year: number; month: number; count: number }

export interface ChatArchive { id: string; platform: string; title?: string | null; messageCount: number; dateFrom?: string | null; dateTo?: string | null }
export interface ChatMessage { id: string; sender: string; content: string; timestamp?: string | null; seq?: number | null }

export interface TagStats { id: string; name: string; color?: string | null; mediaCount: number; albumCount: number; noteCount: number }
