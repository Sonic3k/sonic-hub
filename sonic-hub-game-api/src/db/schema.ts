import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/*
 * Three tables:
 *  - player: one player of one game, with the game's own save. A game has a few, and they are the game's own: whoever
 *    opens the game sees the same list, as on the machine an old game was installed on. Nobody signs in.
 *  - service: one row, made when the database is. It tells a database that was set up anew from one that has only
 *    lost a player, so a browser knows whether what it still holds was removed or never arrived.
 *  - cast_member: a character of a game who has been given a name or a picture here in place of the game's own.
 *    Whoever has neither is not in it: the game knows its own cast, this service only what was changed. Her picture
 *    itself is not here: it is a file in the hub's bucket, and this table knows under which key.
 */

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

export const player = pgTable(
  'player',
  {
    /** Chosen by the browser that made the player, so a save sent twice is still one player. */
    id: uuid('id').primaryKey(),
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
  (t) => [index('player_game_idx').on(t.game), check('player_version_positive', sql`${t.version} > 0`)],
);

export const service = pgTable(
  'service',
  {
    one: boolean('one').primaryKey().default(true),
    /** Given once, when the database is first set up. */
    epoch: uuid('epoch').notNull().defaultRandom(),
  },
  (t) => [check('service_one_row', sql`${t.one}`)],
);

export const castMember = pgTable(
  'cast_member',
  {
    game: text('game').notNull(),
    /** Her key in the game's own content (mina, celeste). What she is there, the game knows; this table does not. */
    member: text('member').notNull(),
    /** The name she goes by in place of the game's own, or null for the game's own. */
    name: text('name'),
    /**
     * The key her picture is kept under in the bucket (games/<game>/profile-photos/<member>-<…>.jpg), or null when she has
     * none. The address it is read at is made from it when the cast is read, so the CDN can change without this table.
     */
    photoKey: text('photo_key'),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.game, t.member] }), check('cast_member_has_something', sql`${t.name} is not null or ${t.photoKey} is not null`)],
);

export type PlayerRow = typeof player.$inferSelect;
export type MemberRow = typeof castMember.$inferSelect;
