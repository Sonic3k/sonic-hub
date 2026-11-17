import { ConflictException, HttpException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, lt, sql } from 'drizzle-orm';
import type { PlayerView, PutPlayerInput } from './api-schemas.js';
import { bareCode, hashCode, newCode } from './common/codes.js';
import { APP_CONFIG } from './common/tokens.js';
import type { AppConfig } from './config.js';
import { DB, type Db } from './db/db.js';
import { holder, player, type PlayerRow } from './db/schema.js';

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
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** A new holder, and the code that is all there is to them. The code is given this once and not kept. */
  async newHolder(): Promise<{ code: string }> {
    const code = newCode();
    await this.db.insert(holder).values({ codeHash: hashCode(bareCode(code)!) });
    return { code };
  }

  /** The holder a typed code belongs to, or null. Notes, at most once a day, that the code is still in use. */
  async holderOf(typed: string): Promise<string | null> {
    const bare = bareCode(typed);
    if (!bare) return null;
    const [row] = await this.db.select({ id: holder.id, seenAt: holder.seenAt }).from(holder).where(eq(holder.codeHash, hashCode(bare)));
    if (!row) return null;
    if (Date.now() - row.seenAt.getTime() > 24 * 3600 * 1000) {
      void this.db.update(holder).set({ seenAt: new Date() }).where(and(eq(holder.id, row.id), lt(holder.seenAt, new Date(Date.now() - 24 * 3600 * 1000)))).catch(() => undefined);
    }
    return row.id;
  }

  /** The players a holder keeps in one game, oldest first. */
  async players(holderId: string, game: string): Promise<{ max: number; players: PlayerView[] }> {
    const rows = await this.db.select().from(player).where(and(eq(player.holderId, holderId), eq(player.game, game))).orderBy(asc(player.createdAt), asc(player.id));
    return { max: this.config.limits.playersPerGame, players: rows.map(view) };
  }

  /**
   * One write of a player: a new one (base 0) or the next version of one that exists. Whatever the browser held when
   * it wrote, the answer is the player as the service now has it; a write made from an older version is refused with
   * that player instead, so two devices never silently undo each other.
   */
  async put(holderId: string, game: string, id: string, body: PutPlayerInput): Promise<PlayerView> {
    if (body.data !== undefined && Buffer.byteLength(JSON.stringify(body.data)) > this.config.limits.saveBytes) {
      throw new HttpException({ error: 'too_big', message: `A saved game is at most ${this.config.limits.saveBytes} bytes.` }, 413);
    }
    const at = playedAt(body.at);
    if (body.base === 0) return view(await this.create(holderId, game, id, body.name!, body.data!, at));

    // made from the version before it, so played after it, whatever the clock it was played by said
    const [row] = await this.db
      .update(player)
      .set({ ...(body.name !== undefined ? { name: body.name } : {}), ...(body.data !== undefined ? { data: body.data } : {}), version: sql`${player.version} + 1`, updatedAt: new Date(), playedAt: sql`greatest(${player.playedAt} + interval '1 millisecond', ${at.toISOString()}::timestamptz)` })
      .where(and(eq(player.id, id), eq(player.holderId, holderId), eq(player.game, game), eq(player.version, body.base)))
      .returning();
    if (row) return view(row);
    const [now] = await this.db.select().from(player).where(and(eq(player.id, id), eq(player.holderId, holderId), eq(player.game, game)));
    if (!now) throw new NotFoundException({ error: 'gone', message: 'There is no such player any more.' });
    throw stale(now);
  }

  /** A new player, if the game has room for one more under this holder. The holder's row is locked while it is counted. */
  private create(holderId: string, game: string, id: string, name: string, data: Record<string, unknown>, at: Date): Promise<PlayerRow> {
    const { playersPerGame, gamesPerCode } = this.config.limits;
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select 1 from ${holder} where ${holder.id} = ${holderId} for update`);
      const [there] = await tx.select().from(player).where(eq(player.id, id));
      if (there) {
        // sent before and the answer never arrived, or written from two places at once: it is told how the player stands
        if (there.holderId === holderId && there.game === game) throw stale(there);
        throw new ConflictException({ error: 'taken', message: 'That player id is in use.' });
      }
      const perGame = await tx.select({ game: player.game, n: count() }).from(player).where(eq(player.holderId, holderId)).groupBy(player.game);
      const here = perGame.find((g) => g.game === game)?.n ?? 0;
      if (here >= playersPerGame) throw new ConflictException({ error: 'full', message: `A game keeps at most ${playersPerGame} players.`, max: playersPerGame });
      if (!here && perGame.length >= gamesPerCode) throw new ConflictException({ error: 'full', message: `A code keeps players in at most ${gamesPerCode} games.`, games: gamesPerCode });
      const [row] = await tx.insert(player).values({ id, holderId, game, name, data, playedAt: at }).returning();
      return row!;
    });
  }

  /** Removes a player. Removing one that is already gone is no error. */
  async remove(holderId: string, game: string, id: string): Promise<void> {
    await this.db.delete(player).where(and(eq(player.id, id), eq(player.holderId, holderId), eq(player.game, game)));
  }
}
