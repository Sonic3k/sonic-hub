import { ConflictException, HttpException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import type { PlayerView, PutPlayerInput } from './api-schemas.js';
import { APP_CONFIG } from './common/tokens.js';
import type { AppConfig } from './config.js';
import { DB, type Db } from './db/db.js';
import { player, service, type PlayerRow } from './db/schema.js';

const view = (p: PlayerRow): PlayerView => ({ id: p.id, name: p.name, data: p.data, version: p.version, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString(), playedAt: p.playedAt.toISOString() });

/** When a save was played: what the browser says, but never later than now. */
const playedAt = (at: string | undefined): Date => {
  const now = Date.now(), said = at === undefined ? now : Date.parse(at);
  return new Date(Number.isFinite(said) ? Math.min(said, now) : now);
};

/** The write was made from a version that is no longer the last: the answer carries the player as it now stands. */
const stale = (now: PlayerRow) => new ConflictException({ error: 'stale', message: 'This player has been saved from somewhere else since.', player: view(now) });

@Injectable()
export class SavesService {
  private known: string | null = null;

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** What this database was given when it was set up: a browser that sees another one knows it is talking to a new database. */
  private async epoch(): Promise<string> {
    if (this.known) return this.known;
    await this.db.insert(service).values({}).onConflictDoNothing();
    const [row] = await this.db.select({ epoch: service.epoch }).from(service);
    return (this.known = row!.epoch);
  }

  /** The players of a game, oldest first: the same list for whoever opens the game. */
  async players(game: string): Promise<{ max: number; epoch: string; players: PlayerView[] }> {
    const rows = await this.db.select().from(player).where(eq(player.game, game)).orderBy(asc(player.createdAt), asc(player.id));
    return { max: this.config.limits.playersPerGame, epoch: await this.epoch(), players: rows.map(view) };
  }

  /**
   * One write of a player: a new one (base 0) or the next version of one that exists. Whatever the browser held when
   * it wrote, the answer is the player as the service now has it; a write made from an older version is refused with
   * that player instead, so two devices never silently undo each other.
   */
  async put(game: string, id: string, body: PutPlayerInput): Promise<PlayerView> {
    if (body.data !== undefined && Buffer.byteLength(JSON.stringify(body.data)) > this.config.limits.saveBytes) {
      throw new HttpException({ error: 'too_big', message: `A saved game is at most ${this.config.limits.saveBytes} bytes.` }, 413);
    }
    const at = playedAt(body.at);
    if (body.base === 0) return view(await this.create(game, id, body.name!, body.data!, at));

    // made from the version before it, so played after it, whatever the clock it was played by said
    const [row] = await this.db
      .update(player)
      .set({ ...(body.name !== undefined ? { name: body.name } : {}), ...(body.data !== undefined ? { data: body.data } : {}), version: sql`${player.version} + 1`, updatedAt: new Date(), playedAt: sql`greatest(${player.playedAt} + interval '1 millisecond', ${at.toISOString()}::timestamptz)` })
      .where(and(eq(player.id, id), eq(player.game, game), eq(player.version, body.base)))
      .returning();
    if (row) return view(row);
    const [now] = await this.db.select().from(player).where(and(eq(player.id, id), eq(player.game, game)));
    // with the database's epoch: a browser that was kept by another database knows the player was not removed, but never here
    if (!now) throw new NotFoundException({ error: 'gone', message: 'There is no such player any more.', epoch: await this.epoch() });
    throw stale(now);
  }

  /** A new player, if the game has room for one more. New players are made one at a time, so the count holds. */
  private create(game: string, id: string, name: string, data: Record<string, unknown>, at: Date): Promise<PlayerRow> {
    const { playersPerGame, games } = this.config.limits;
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(7302001)`);
      const [there] = await tx.select().from(player).where(eq(player.id, id));
      if (there) {
        // sent before and the answer never arrived, or written from two places at once: it is told how the player stands
        if (there.game === game) throw stale(there);
        throw new ConflictException({ error: 'taken', message: 'That player id is in use.' });
      }
      const perGame = await tx.select({ game: player.game, n: count() }).from(player).groupBy(player.game);
      const here = perGame.find((g) => g.game === game)?.n ?? 0;
      if (here >= playersPerGame) throw new ConflictException({ error: 'full', message: `A game keeps at most ${playersPerGame} players.`, max: playersPerGame });
      if (!here && perGame.length >= games) throw new ConflictException({ error: 'full', message: `Players are kept for at most ${games} games.`, games });
      const [row] = await tx.insert(player).values({ id, game, name, data, playedAt: at }).returning();
      return row!;
    });
  }

  /** Removes a player. Removing one that is already gone is no error. */
  async remove(game: string, id: string): Promise<void> {
    await this.db.delete(player).where(and(eq(player.id, id), eq(player.game, game)));
  }
}
