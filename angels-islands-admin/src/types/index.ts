export type RelationshipType = 'CRUSH' | 'GIRLFRIEND' | 'FRIEND' | 'EX' | 'ACQUAINTANCE' | 'PEN_PAL' | 'ONLINE_FRIEND'
export type Platform = 'YAHOO' | 'FACEBOOK' | 'SMS' | 'ZALO' | 'TELEGRAM' | 'BLOG' | 'OTHER'
export type ExtractionStatus = 'PENDING' | 'EXTRACTING' | 'DONE' | 'ERROR'

// List response (Summary DTO)
export interface PersonSummary {
  id: number; name: string; displayName?: string; nickname?: string
  relationshipType?: RelationshipType; period?: string
  isFavorite?: boolean; isFeatured?: boolean; avatarUrl?: string; song?: string
}

// Detail response (DetailResponse DTO)
export interface PersonDetail extends PersonSummary {
  alternativeName?: string; dateOfBirth?: string; bio?: string
  firstMet?: string; howWeMet?: string; coverUrl?: string; bannerUrl?: string
  tags?: TagResponse[]; totalCollections?: number; totalMediaFiles?: number
  totalChatArchives?: number; totalFacts?: number; totalEpisodes?: number
  createdAt?: string; updatedAt?: string
}

// Request DTO
export interface PersonRequest {
  name?: string; displayName?: string; alternativeName?: string; nickname?: string
  dateOfBirth?: string; bio?: string; relationshipType?: RelationshipType
  period?: string; firstMet?: string; howWeMet?: string; song?: string
  isFavorite?: boolean; isFeatured?: boolean; tagIds?: number[]
}

export interface TagResponse { id: string; name: string; color?: string; description?: string }
export interface TagRequest { name: string; color?: string; description?: string }

export interface MediaFileResponse {
  id: number; fileName: string; fileType: 'IMAGE' | 'VIDEO'; mediaCategory?: string
  fileSize?: number; width?: number; height?: number; mimeType?: string
  caption?: string; cdnUrl?: string; thumbnailUrl?: string
  effectiveDate?: string; uploadedAt?: string
}

export interface CollectionResponse { id: number; name: string; description?: string; parentId?: number; mediaCount?: number; personCount?: number; thumbnailUrl?: string }
export interface CollectionRequest { name: string; description?: string; parentId?: number }

export interface ChatArchiveResponse {
  id: number; platform: Platform; title?: string; messageCount?: number
  dateFrom?: string; dateTo?: string; extractionStatus: ExtractionStatus; createdAt: string
}

export interface FactResponse { id: number; category: string; key: string; value: string; period?: string; confidence?: number; createdAt?: string }
export interface FactRequest { category: string; key: string; value: string; period?: string; confidence?: number }

export interface EpisodeResponse { id: number; summary: string; emotion?: string; importance?: number; occurredAt?: string; createdAt?: string }
export interface EpisodeRequest { summary: string; emotion?: string; importance?: number; occurredAt?: string }

export interface ChapterResponse { id: number; period: string; title?: string; summary?: string; sentiment?: string; sortOrder?: number; createdAt?: string }
export interface ChapterRequest { period: string; title?: string; summary?: string; sentiment?: string; sortOrder?: number }

export interface TraitResponse { id: number; trait: string; description?: string; evidence?: string; period?: string; createdAt?: string }
export interface TraitRequest { trait: string; description?: string; evidence?: string; period?: string }
