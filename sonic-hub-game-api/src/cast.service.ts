import { ConflictException, HttpException, Inject, Injectable, Logger } from '@nestjs/common';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import type { MemberView } from './api-schemas.js';
import { APP_CONFIG, PHOTO_STORE } from './common/tokens.js';
import type { AppConfig } from './config.js';
import { DB, type Db, type DbExecutor } from './db/db.js';
import { castMember, type MemberRow } from './db/schema.js';
import { kindOf, type PhotoStore } from './photo-store.js';

const nobody = (member: string): MemberView => ({ id: member, name: null, photo: null });

/*
 * A game's cast: the characters a player meets in it. The game knows them (who they are, what they are called, what
 * they look like, if anything); here each of them can be given another name and a picture, which the game then shows
 * in place of its own. Nobody signs in, as with a game's players: whoever opens the page that keeps a cast changes it.
 *
 * A name is kept here. A picture is a file in the hub's bucket (PhotoStore); kept here is the key it is under, and
 * handed out is the address it is read at through the CDN.
 */
@Injectable()
export class CastService {
  private readonly log = new Logger('cast');

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(PHOTO_STORE) private readonly store: PhotoStore,
  ) {}

  private view(m: MemberRow): MemberView {
    return { id: m.member, name: m.name, photo: m.photoKey ? this.store.url(m.photoKey) : null };
  }

  /** How large a picture may be, or null where there is nowhere to keep one. */
  get photoBytes(): number | null {
    return this.store.ready ? this.config.limits.photoBytes : null;
  }

  /** Said before a picture is read: where there is nowhere to keep one, it is not taken at all. */
  needsStorage(): void {
    if (!this.store.ready) throw new HttpException({ error: 'no_storage', message: 'Pictures cannot be kept here yet: the service has no storage set up.' }, 503);
  }

  /** Everyone in a game's cast who has a name or a picture from here, by key. One read for the whole cast. */
  async cast(game: string): Promise<{ cast: MemberView[]; photoBytes: number | null }> {
    const rows = await this.db.select().from(castMember).where(eq(castMember.game, game)).orderBy(asc(castMember.member));
    return { cast: rows.map((m) => this.view(m)), photoBytes: this.photoBytes };
  }

  /** Gives a member a name, or with null the game's own back. */
  async rename(game: string, member: string, name: string | null): Promise<MemberView> {
    return (await this.change(game, member, (had) => ({ name, photoKey: had?.photoKey ?? null }))).now;
  }

  /**
   * Puts a member's picture up, in place of any she had. The file goes into the bucket as it came; the one it takes
   * the place of is removed from there once she has the new one.
   */
  async putPhoto(game: string, member: string, file: Buffer): Promise<MemberView> {
    this.needsStorage();
    const kind = kindOf(file);
    if (!kind) throw new HttpException({ error: 'not_a_picture', message: 'That cannot be used as a picture: it is not a JPEG, PNG or WebP file.' }, 400);
    const key = this.store.keyFor(game, member, file, kind);
    const [before] = await this.db.select().from(castMember).where(and(eq(castMember.game, game), eq(castMember.member, member)));
    if (before?.photoKey === key) return this.view(before);   // the picture she has, sent again
    if (!before) await this.room(this.db, game);   // told now, not after the file has been put away
    try {
      await this.store.put(key, file, kind.type);
    } catch (e) {
      this.log.error(`a picture could not be put away (${key}): ${e instanceof Error ? e.message : String(e)}`);
      throw new HttpException({ error: 'storage_failed', message: 'The picture could not be put away: the storage did not take it. Try again in a moment.' }, 502);
    }
    try {
      const changed = await this.change(game, member, (had) => ({ name: had?.name ?? null, photoKey: key }));
      if (changed.had && changed.had !== key) await this.discard(changed.had);
      return changed.now;
    } catch (e) {
      // she did not get it after all: the file is taken back out, unless it has meanwhile become hers some other way
      const hers = await this.db.select({ key: castMember.photoKey }).from(castMember).where(and(eq(castMember.game, game), eq(castMember.member, member))).then(([m]) => m?.key === key, () => true);
      if (!hers) await this.discard(key);
      throw e;
    }
  }

  /** Takes a member's picture away, and the file out of the bucket. Taking away what is not there is no error. */
  async removePhoto(game: string, member: string): Promise<MemberView> {
    const changed = await this.change(game, member, (had) => ({ name: had?.name ?? null, photoKey: null }));
    if (changed.had) await this.discard(changed.had);
    return changed.now;
  }

  /** A file nobody's picture any more. If the bucket does not let it go, it stays there unused and nothing else is wrong. */
  private async discard(key: string): Promise<void> {
    try {
      await this.store.remove(key);
    } catch (e) {
      this.log.warn(`a picture no longer used could not be removed from the storage (${key}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /** Whether one more member of `game` can be given something: so many to a game, and casts for so many games. */
  private async room(db: DbExecutor, game: string): Promise<void> {
    const { castPerGame, games } = this.config.limits;
    const perGame = await db.select({ game: castMember.game, n: count() }).from(castMember).groupBy(castMember.game);
    const here = perGame.find((g) => g.game === game)?.n ?? 0;
    if (here >= castPerGame) throw new ConflictException({ error: 'full', message: `A game's cast has room for ${castPerGame} names and pictures.`, max: castPerGame });
    if (!here && perGame.length >= games) throw new ConflictException({ error: 'full', message: `A cast is kept for at most ${games} games.`, games });
  }

  /**
   * One change to one member. A member left with neither a name nor a picture is the game's own again and is not kept.
   * The answer says how she stands now, and under which key her picture was before (`had`), so that a file no longer
   * hers can be removed. Changes are made one at a time, so the count of a game's cast holds.
   */
  private change(game: string, member: string, next: (had: MemberRow | undefined) => { name: string | null; photoKey: string | null }): Promise<{ now: MemberView; had: string | null }> {
    const her = and(eq(castMember.game, game), eq(castMember.member, member));
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(7302002)`);
      const [had] = await tx.select().from(castMember).where(her);
      const now = next(had);
      if (now.name === null && now.photoKey === null) {
        if (had) await tx.delete(castMember).where(her);
        return { now: nobody(member), had: had?.photoKey ?? null };
      }
      if (!had) await this.room(tx, game);
      const [row] = await tx
        .insert(castMember)
        .values({ game, member, ...now })
        .onConflictDoUpdate({ target: [castMember.game, castMember.member], set: { ...now, updatedAt: new Date() } })
        .returning();
      return { now: this.view(row!), had: had?.photoKey ?? null };
    });
  }
}
