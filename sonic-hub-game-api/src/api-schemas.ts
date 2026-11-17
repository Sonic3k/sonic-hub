import { z } from 'zod';

/** A game's key on the shelf: small letters, digits and dashes (keep-it-down-extended). */
export const GameKey = z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/, 'a game key is small letters, digits and dashes');

export const PlayerId = z.uuid('a player id is a UUID').transform((s) => s.toLowerCase());

/** A player's name as it will be shown: spaces tidied, nothing unprintable, at most 24 signs. */
const PlayerName = z
  .string()
  .transform((s) => s.replace(/\s+/g, ' ').replace(/[\p{Cc}\p{Cf}]/gu, '').trim())
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
