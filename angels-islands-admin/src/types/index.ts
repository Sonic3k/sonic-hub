export type RelationshipType = 'CRUSH' | 'GIRLFRIEND' | 'FRIEND' | 'EX' | 'ACQUAINTANCE' | 'PEN_PAL' | 'ONLINE_FRIEND'
export type Platform = 'YAHOO' | 'FACEBOOK' | 'SMS' | 'ZALO' | 'TELEGRAM' | 'BLOG' | 'OTHER'
export type ExtractionStatus = 'PENDING' | 'EXTRACTING' | 'DONE' | 'ERROR'

export interface Person {
  id: number; name: string; displayName?: string; alternativeName?: string; nickname?: string
  dateOfBirth?: string; bio?: string; relationshipType?: RelationshipType; period?: string
  firstMet?: string; howWeMet?: string; song?: string; isFavorite?: boolean; isFeatured?: boolean
  createdAt: string; updatedAt: string
}

export interface Tag { id: number; name: string; color?: string; description?: string }

export interface MediaFile {
  id: number; fileName: string; storageKey?: string; fileType: 'IMAGE' | 'VIDEO'
  mediaCategory?: string; fileSize?: number; width?: number; height?: number
  mimeType?: string; caption?: string; effectiveDate?: string; uploadedAt?: string
}

export interface Collection { id: number; name: string; description?: string }

export interface ChatArchive {
  id: number; platform: Platform; title?: string; messageCount?: number
  dateFrom?: string; dateTo?: string; extractionStatus: ExtractionStatus; createdAt: string
}

export interface ChatMessage { id: number; sender: string; content: string; timestamp?: string }
export interface Fact { id: number; category: string; key: string; value: string; period?: string; confidence?: number }
export interface Episode { id: number; summary: string; emotion?: string; importance?: number; occurredAt?: string }
export interface LifeChapter { id: number; period: string; title?: string; summary?: string; sentiment?: string; sortOrder?: number }
export interface PersonalityTrait { id: number; trait: string; description?: string; evidence?: string; period?: string }
