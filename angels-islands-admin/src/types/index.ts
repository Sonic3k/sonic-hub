export type RelationshipType = 'CRUSH' | 'GIRLFRIEND' | 'FRIEND' | 'EX' | 'ACQUAINTANCE' | 'PEN_PAL' | 'ONLINE_FRIEND'
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
  period?: string; firstMet?: string; howWeMet?: string; song?: string
  isSelf?: boolean; isFavorite?: boolean; isFeatured?: boolean; tagIds?: number[]
}

export interface ContactResponse { id: string; platform: ContactPlatform; identifier: string; displayName?: string; notes?: string; createdAt?: string }
export interface ContactRequest { platform: string; identifier: string; displayName?: string; notes?: string }

export interface TagResponse { id: string; name: string; color?: string; description?: string }
export interface TagRequest { name: string; color?: string; description?: string }

export interface MediaFileResponse {
  id: string; fileName: string; fileType: 'IMAGE' | 'VIDEO'; mediaCategory?: string
  fileSize?: number; width?: number; height?: number; orientation?: string; aspectRatio?: number
  mimeType?: string; caption?: string; cdnUrl?: string; thumbnailUrl?: string
  dateTaken?: string; fileDateCreated?: string; fileDateModified?: string
  effectiveDate?: string; uploadedAt?: string
  latitude?: number; longitude?: number; displayedAddress?: string
  duration?: number; isAnimated?: boolean; isFavorite?: boolean; isFeatured?: boolean
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

export interface CollectionResponse {
  id: string; name: string; description?: string; parentId?: string; parentName?: string
  childrenCount?: number; mediaCount?: number; thumbnailUrl?: string; createdAt?: string
  tags?: TagResponse[]; persons?: { id: string; name: string; displayName?: string; avatarUrl?: string }[]
}
export interface CollectionRequest { name: string; description?: string; parentId?: string }

export interface ChatArchiveResponse {
  id: string; platform: Platform; title?: string; messageCount?: number
  dateFrom?: string; dateTo?: string; extractionStatus: ExtractionStatus; createdAt: string
}

export interface FactResponse { id: string; category: string; key: string; value: string; period?: string; confidence?: number; createdAt?: string }
export interface FactRequest { category: string; key: string; value: string; period?: string; confidence?: number }

export interface EpisodeResponse { id: string; summary: string; emotion?: string; importance?: number; occurredAt?: string; createdAt?: string }
export interface EpisodeRequest { summary: string; emotion?: string; importance?: number; occurredAt?: string }

export interface ChapterResponse { id: string; period: string; title?: string; summary?: string; sentiment?: string; sortOrder?: number; createdAt?: string }
export interface ChapterRequest { period: string; title?: string; summary?: string; sentiment?: string; sortOrder?: number }

export interface TraitResponse { id: string; trait: string; description?: string; evidence?: string; period?: string; createdAt?: string }
export interface TraitRequest { trait: string; description?: string; evidence?: string; period?: string }
