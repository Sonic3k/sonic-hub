import { z } from 'zod';

/** A game's key on the shelf: small letters, digits and dashes (keep-it-down-extended). */
export const GameKey = z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/, 'a game key is small letters, digits and dashes');

export const PlayerId = z.uuid('a player id is a UUID').transform((s) => s.toLowerCase());

/** A name as it will be shown: spaces tidied, nothing unprintable. */
const tidy = (s: string) => s.replace(/\s+/g, ' ').replace(/[\p{Cc}\p{Cf}]/gu, '').trim();

/** A player's name: tidied, not empty, at most 24 signs. */
const PlayerName = z
  .string()
  .transform(tidy)
  .refine((s) => s.length > 0, 'a name cannot be empty')
  .refine((s) => [...s].length <= 24, 'a name is at most 24 signs');

/**
 * One write of a player. `base` is the version the write was made from: 0 for a player the service has not seen
 * (name and data are then both needed), otherwise the version last read, with whatever is to change.
 * `at` is when it was played, on the service's clock (every answer carries X-Now): a save played with no connection
 * and sent hours later is then still known to be older than one played since. Left out, it is the moment of arrival.
 */
export const PutPlayerBody = z
  .object({
    base: z.number().int().min(0),
    name: PlayerName.optional(),
    data: z.record(z.string(), z.unknown()).optional(),
    at: z.iso.datetime('at is a moment like 2026-11-17T08:50:00.000Z').optional(),
  })
  .superRefine((b, ctx) => {
    if (b.base === 0 && (b.name === undefined || b.data === undefined)) ctx.addIssue({ code: 'custom', message: 'a new player (base 0) needs a name and data' });
    if (b.base > 0 && b.name === undefined && b.data === undefined) ctx.addIssue({ code: 'custom', message: 'nothing to change: give a name, data or both' });
  });
export type PutPlayerInput = z.infer<typeof PutPlayerBody>;

/** A player as the API gives it. */
export interface PlayerView {
  id: string;
  name: string;
  data: Record<string, unknown>;
  version: number;
  createdAt: string;
  /** when this version reached the service */
  updatedAt: string;
  /** when it was played: `at` as the write gave it, never later than updatedAt, always later than the version before */
  playedAt: string;
}

/** A game picked out on the shelf, as the API gives it. */
export interface HighlightView {
  /** the game's key on the shelf */
  game: string;
  /** when it was picked out */
  since: string;
}

/** A member of a game's cast, by the key the game's own content knows her by (mina, celeste): small letters, digits and dashes. */
export const MemberKey = z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/, 'a cast member is named in small letters, digits and dashes');

/** The youngest and the oldest a member of a cast can be said to be. Everyone in a cast is an adult. */
export const AGES = [18, 99] as const;

/**
 * What a member is given in place of the game's own: a name (tidied as a player's is; null, or nothing but spaces,
 * gives her the game's own back) and an age (null for the game's own). Either may be left out, and is then left alone.
 */
export const PutMemberBody = z
  .object({
    name: z
      .union([z.null(), z.string()])
      .transform((s) => (s === null ? null : tidy(s) || null))
      .refine((s) => s === null || [...s].length <= 24, 'a name is at most 24 signs')
      .optional(),
    age: z.union([z.null(), z.number().int().min(AGES[0], `an age is at least ${AGES[0]}: everyone in a cast is an adult`).max(AGES[1], `an age is at most ${AGES[1]}`)]).optional(),
  })
  .refine((b) => b.name !== undefined || b.age !== undefined, 'say her name, her age, or both');
export type PutMemberInput = z.infer<typeof PutMemberBody>;

/** A picture's place in an album: 1, 2, 3… */
export const AlbumPlace = z.string().regex(/^[1-9][0-9]?$/, 'a place in an album is a number from 1').transform(Number);

/** A member of a cast as the API gives her: only what was changed here. */
export interface MemberView {
  id: string;
  /** null: the game's own name */
  name: string | null;
  /** null: the game's own age */
  age: number | null;
  /** The address of her picture at the CDN, or null when she has none. A width is asked for by adding ?width= to it. */
  photo: string | null;
  /** The pictures of her album that were put up here, by place. Places with none are left out. */
  album: Array<{ n: number; photo: string }>;
}
