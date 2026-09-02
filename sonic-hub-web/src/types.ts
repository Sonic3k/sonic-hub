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

export interface Person {
  id: string;
  name: string;
  nickname?: string | null;
  isSelf?: boolean;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  bannerUrl?: string | null;
  relationshipType?: string | null;
  period?: string | null;
  bio?: string | null;
}
