import type { RelationshipType } from '../types'

/** The types to choose from. */
export const REL_CHOICES: RelationshipType[] = ['ANGEL', 'FRIEND', 'OTHER']

export const REL_LABELS: Record<RelationshipType, string> = { ANGEL: '😇 Angel', FRIEND: '🤝 Friend', OTHER: '👤 Other' }
