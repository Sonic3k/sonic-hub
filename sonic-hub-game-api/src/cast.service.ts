import { ConflictException, HttpException, Inject, Injectable, Logger } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { MemberView } from './api-schemas.js';
import { APP_CONFIG, PHOTO_STORE } from './common/tokens.js';
import type { AppConfig } from './config.js';
import { DB, type Db, type DbExecutor } from './db/db.js';
import { castAlbum, castMember, type AlbumRow, type MemberRow } from './db/schema.js';
import { kindOf, type Kind, type PhotoStore } from './photo-store.js';

/** What a member's own row holds. A member left with none of it has no row. */
interface Hers { name: string | null; age: number | null; photoKey: string | null }

/*
 * A game's cast: the characters a player meets in it. The game knows them (who they are, what they are called, how
 * old, what they look like, if anything); here each of them can be given another name, another age, a picture, and
 * the pictures of her album, which the game then shows in place of its own. Nobody signs in, as with a game's
 * players: whoever opens the page that keeps a cast changes it.
 *
 * Names and ages are kept here. A picture is a file in the hub's bucket (PhotoStore); kept here is the key it is
 * under, and handed out is the address it is read at through the CDN.
 */
@Injectable()
export class CastService {
  private readonly log = new Logger('cast');

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(PHOTO_STORE) private readonly store: PhotoStore,
  ) {}

  private view(member: string, m: MemberRow | undefined, album: AlbumRow[]): MemberView {
    return {
      id: member,
      name: m?.name ?? null,
      age: m?.age ?? null,
      photo: m?.photoKey ? this.store.url(m.photoKey) : null,
      album: album.map((a) => ({ n: a.n, photo: this.store.url(a.photoKey) })),
    };
  }

  /** How large a picture may be, or null where there is nowhere to keep one. */
  get photoBytes(): number | null {
    return this.store.ready ? this.config.limits.photoBytes : null;
  }

  /** Said before a picture is read: where there is nowhere to keep one, it is not taken at all. */
  needsStorage(): void {
    if (!this.store.ready) throw new HttpException({ error: 'no_storage', message: 'Pictures cannot be kept here yet: the service has no storage set up.' }, 503);
  }

  /**
   * Everyone in a game's cast who was given something here, by key. Two reads for the whole cast, however many
   * they are: who they are, and the pictures of all their albums.
   */
  async cast(game: string): Promise<{ cast: MemberView[]; photoBytes: number | null; albumPictures: number }> {
    const [members, album] = await Promise.all([
      this.db.select().from(castMember).where(eq(castMember.game, game)),
      this.db.select().from(castAlbum).where(eq(castAlbum.game, game)).orderBy(asc(castAlbum.member), asc(castAlbum.n)),
    ]);
    const by = new Map(members.map((m) => [m.member, m]));
    const pictures = new Map<string, AlbumRow[]>();
    for (const a of album) pictures.set(a.member, [...(pictures.get(a.member) ?? []), a]);
    const ids = [...new Set([...by.keys(), ...pictures.keys()])].sort();
    return { cast: ids.map((id) => this.view(id, by.get(id), pictures.get(id) ?? [])), photoBytes: this.photoBytes, albumPictures: this.config.limits.albumPerMember };
  }

  /** One member as she now stands. */
  private async her(db: DbExecutor, game: string, member: string): Promise<MemberView> {
    const [m] = await db.select().from(castMember).where(and(eq(castMember.game, game), eq(castMember.member, member)));
    const album = await db.select().from(castAlbum).where(and(eq(castAlbum.game, game), eq(castAlbum.member, member))).orderBy(asc(castAlbum.n));
    return this.view(member, m, album);
  }

  /** Gives a member a name, an age, or both; null gives the game's own back. What is left out is left alone. */
  async set(game: string, member: string, given: { name?: string | null; age?: number | null }): Promise<MemberView> {
    return (await this.change(game, member, (had) => ({ name: given.name === undefined ? had.name : given.name, age: given.age === undefined ? had.age : given.age, photoKey: had.photoKey }))).now;
  }

  /**
   * Puts a member's picture up, in place of any she had. The file goes into the bucket as it came; the one it takes
   * the place of is removed from there once she has the new one.
   */
  async putPhoto(game: string, member: string, file: Buffer): Promise<MemberView> {
    const kind = this.pictureKind(file);
    const key = this.store.keyFor(game, member, file, kind);
    const [before] = await this.db.select().from(castMember).where(and(eq(castMember.game, game), eq(castMember.member, member)));
    if (before?.photoKey === key) return this.her(this.db, game, member);   // the picture she has, sent again
    if (!(await this.isIn(this.db, game, member))) await this.room(this.db, game);   // told now, not after the file has been put away
    await this.putAway(key, file, kind);
    try {
      const changed = await this.change(game, member, (had) => ({ ...had, photoKey: key }));
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
    const changed = await this.change(game, member, (had) => ({ ...had, photoKey: null }));
    if (changed.had) await this.discard(changed.had);
    return changed.now;
  }

  /**
   * Puts a picture at a place in a member's album, in place of any that was there. An album is its pictures in the
   * order of their places: a place (1 to 99) says where a picture stands among the others and nothing more, so
   * places may be left out. How many pictures an album holds is a limit of its own.
   */
  async putPlate(game: string, member: string, n: number, file: Buffer): Promise<MemberView> {
    const kind = this.pictureKind(file);
    const key = this.store.albumKeyFor(game, member, n, file, kind);
    const at = and(eq(castAlbum.game, game), eq(castAlbum.member, member), eq(castAlbum.n, n));
    const [before] = await this.db.select().from(castAlbum).where(at);
    if (before?.photoKey === key) return this.her(this.db, game, member);   // the picture that is there, sent again
    if (!before) await this.albumRoom(this.db, game, member);               // turned away before the file is put anywhere
    if (!(await this.isIn(this.db, game, member))) await this.room(this.db, game);
    await this.putAway(key, file, kind);
    let was: string | null = null;
    try {
      const now = await this.db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(7302002)`);
        const [had] = await tx.select().from(castAlbum).where(at);
        if (!had) await this.albumRoom(tx, game, member);
        if (!had && !(await this.isIn(tx, game, member))) await this.room(tx, game);
        was = had?.photoKey ?? null;
        await tx.insert(castAlbum).values({ game, member, n, photoKey: key }).onConflictDoUpdate({ target: [castAlbum.game, castAlbum.member, castAlbum.n], set: { photoKey: key, updatedAt: new Date() } });
        return this.her(tx, game, member);
      });
      if (was && was !== key) await this.discard(was);
      return now;
    } catch (e) {
      const there = await this.db.select({ key: castAlbum.photoKey }).from(castAlbum).where(at).then(([a]) => a?.key === key, () => true);
      if (!there) await this.discard(key);
      throw e;
    }
  }

  /** Takes the picture at a place out of a member's album. Taking away what is not there is no error. */
  async removePlate(game: string, member: string, n: number): Promise<MemberView> {
    const [gone] = await this.db.delete(castAlbum).where(and(eq(castAlbum.game, game), eq(castAlbum.member, member), eq(castAlbum.n, n))).returning();
    if (gone) await this.discard(gone.photoKey);
    return this.her(this.db, game, member);
  }

  /** What kind of picture a file is; where it is none, it is turned away. */
  private pictureKind(file: Buffer): Kind {
    this.needsStorage();
    const kind = kindOf(file);
    if (!kind) throw new HttpException({ error: 'not_a_picture', message: 'That cannot be used as a picture: it is not a JPEG, PNG or WebP file.' }, 400);
    return kind;
  }

  private async putAway(key: string, file: Buffer, kind: Kind): Promise<void> {
    try {
      await this.store.put(key, file, kind.type);
    } catch (e) {
      this.log.error(`a picture could not be put away (${key}): ${e instanceof Error ? e.message : String(e)}`);
      throw new HttpException({ error: 'storage_failed', message: 'The picture could not be put away: the storage did not take it. Try again in a moment.' }, 502);
    }
  }

  /** A file nobody's picture any more. If the bucket does not let it go, it stays there unused and nothing else is wrong. */
  private async discard(key: string): Promise<void> {
    try {
      await this.store.remove(key);
    } catch (e) {
      this.log.warn(`a picture no longer used could not be removed from the storage (${key}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /** Whether a member has anything here yet: a row of her own, or a picture in her album. */
  private async isIn(db: DbExecutor, game: string, member: string): Promise<boolean> {
    const [m] = await db.select({ member: castMember.member }).from(castMember).where(and(eq(castMember.game, game), eq(castMember.member, member)));
    if (m) return true;
    const [a] = await db.select({ n: castAlbum.n }).from(castAlbum).where(and(eq(castAlbum.game, game), eq(castAlbum.member, member))).limit(1);
    return !!a;
  }

  /** Whether a member's album can take one more picture. */
  private async albumRoom(db: DbExecutor, game: string, member: string): Promise<void> {
    const most = this.config.limits.albumPerMember;
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(castAlbum).where(and(eq(castAlbum.game, game), eq(castAlbum.member, member)));
    if (n >= most) throw new ConflictException({ error: 'album_full', message: `An album holds ${most} pictures.`, max: most });
  }

  /** Whether one more member of `game` can be given something: so many to a game, and casts for so many games. */
  private async room(db: DbExecutor, game: string): Promise<void> {
    const { castPerGame, games } = this.config.limits;
    const counted = await db.execute<{ game: string; n: number }>(sql`select game, count(*)::int as n from (select game, member from cast_member union select game, member from cast_album) everyone group by game`);
    const here = counted.rows.find((g) => g.game === game)?.n ?? 0;
    if (here >= castPerGame) throw new ConflictException({ error: 'full', message: `A game's cast has room for ${castPerGame} of its members to be given something.`, max: castPerGame });
    if (!here && counted.rows.length >= games) throw new ConflictException({ error: 'full', message: `A cast is kept for at most ${games} games.`, games });
  }

  /**
   * One change to a member's own row. A member left with no name, age or picture has no row. The answer says how
   * she stands now, and under which key her picture was before (`had`), so that a file no longer hers can be
   * removed. Changes are made one at a time, so the count of a game's cast holds.
   */
  private change(game: string, member: string, next: (had: Hers) => Hers): Promise<{ now: MemberView; had: string | null }> {
    const her = and(eq(castMember.game, game), eq(castMember.member, member));
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(7302002)`);
      const [had] = await tx.select().from(castMember).where(her);
      const now = next({ name: had?.name ?? null, age: had?.age ?? null, photoKey: had?.photoKey ?? null });
      if (now.name === null && now.age === null && now.photoKey === null) {
        if (had) await tx.delete(castMember).where(her);
      } else {
        if (!had && !(await this.isIn(tx, game, member))) await this.room(tx, game);
        await tx.insert(castMember).values({ game, member, ...now }).onConflictDoUpdate({ target: [castMember.game, castMember.member], set: { ...now, updatedAt: new Date() } });
      }
      return { now: await this.her(tx, game, member), had: had?.photoKey ?? null };
    });
  }
}
