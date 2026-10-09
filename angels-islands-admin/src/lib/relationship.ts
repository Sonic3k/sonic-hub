import type { RelationshipType } from '../types'

/** The types to choose from. The older ones are shown only on people who still have one, until they are migrated. */
export const REL_CHOICES: RelationshipType[] = ['ANGEL', 'FRIEND', 'OTHER']

export const REL_LABELS: Record<RelationshipType, string> = {
  ANGEL: '😇 Angel', FRIEND: '🤝 Friend', OTHER: '👤 Other',
  CRUSH: '💗 Crush (old)', GIRLFRIEND: '❤️ Girlfriend (old)', EX: '💔 Ex (old)', ACQUAINTANCE: '👋 Acquaintance (old)',
  PEN_PAL: '✉️ Pen Pal (old)', ONLINE_FRIEND: '💬 Online Friend (old)',
}

/** Options for the select: the three types, plus the person's current old one so that saving does not change it. */
export const relOptions = (current?: RelationshipType | null): RelationshipType[] =>
  current && !REL_CHOICES.includes(current) ? [...REL_CHOICES, current] : REL_CHOICES
