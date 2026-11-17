import { sql } from 'drizzle-orm';
import { check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/*
 * Two tables:
 *  - holder: whoever carries a code. The code is all there is to them: no name, no address, no password.
 *    Only its SHA-256 is kept, so nobody reading this table learns a code.
 *  - player: one player of one game under a holder, with the game's own save. A game may have a few.
 */

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

export const holder = pgTable(
  'holder',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    codeHash: text('code_hash').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
    /** When the code was last used, to the day: what tells a code in use from one long forgotten. */
    seenAt: ts('seen_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('holder_code_hash_key').on(t.codeHash)],
);

export const player = pgTable(
  'player',
  {
    /** Chosen by the browser that made the player, so a save sent twice is still one player. */
    id: uuid('id').primaryKey(),
    holderId: uuid('holder_id')
      .notNull()
      .references(() => holder.id, { onDelete: 'cascade' }),
    /** The game's key on the shelf (keep-it-down-extended). Games are not listed anywhere: a new one just starts saving. */
    game: text('game').notNull(),
    name: text('name').notNull(),
    /**
     * The saved game, exactly as the game sent it. Its shape belongs to the game and differs from one game to the
     * next, so it is one document here and never taken apart by this service.
     */
    data: jsonb('data').$type<Record<string, unknown>>().notNull(),
    /** Goes up by one with every write. A write names the version it was made from and is refused if that is no longer the last. */
    version: integer('version').notNull().default(1),
    createdAt: ts('created_at').notNull().defaultNow(),
    /** When this version reached the service. */
    updatedAt: ts('updated_at').notNull().defaultNow(),
    /**
     * When this version was played, by the service's clock as the browser reads it: earlier than updated_at for a
     * save made with no connection and sent later. Two saves of one player made apart are told apart by these two.
     */
    playedAt: ts('played_at').notNull().defaultNow(),
  },
  (t) => [index('player_holder_game_idx').on(t.holderId, t.game), check('player_version_positive', sql`${t.version} > 0`)],
);

export type HolderRow = typeof holder.$inferSelect;
export type PlayerRow = typeof player.$inferSelect;
