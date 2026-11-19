import { ConflictException, HttpException, Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import sharp, { type Metadata } from 'sharp';
import type { MemberView } from './api-schemas.js';
import { APP_CONFIG } from './common/tokens.js';
import type { AppConfig } from './config.js';
import { DB, type Db } from './db/db.js';
import { castMember, castPhoto, type MemberRow } from './db/schema.js';

/** The widths a picture is handed out at. Asked for any other, a browser gets the next one up. */
export const WIDTHS = [320, 640, 960, 1280, 1920] as const;
/** The width handed out when none is asked for: the one a profile is shown at. */
const PROFILE = 640;
/** More than a camera's picture has, and far less than what a small file can claim to unfold into. */
const MOST_PIXELS = 100_000_000;
/** The kinds of file a picture may come as. Whatever its sender calls it, the file itself is looked at. */
const KINDS = new Set(['jpeg', 'png', 'webp']);

const view = (m: MemberRow): MemberView => ({ id: m.member, name: m.name, photo: m.photoAt ? m.photoAt.getTime() : null });
const nobody = (member: string): MemberView => ({ id: member, name: null, photo: null });

const notAPicture = (why: string) => new HttpException({ error: 'not_a_picture', message: `That cannot be used as a picture: ${why}. Send a JPEG, PNG or WebP file.` }, 400);

interface Copy { width: number; height: number; bytes: Buffer }

/**
 * The copies of a picture that are kept: one for each width pictures are handed out at, none wider than the picture
 * came, each drawn afresh as a WebP file. So what is kept is a picture and nothing else, whatever was sent: upright
 * (a phone notes which way up it was held instead of turning the picture), and without what the file said about
 * itself, such as where it was taken.
 */
async function copies(file: Buffer): Promise<Copy[]> {
  let meta: Metadata;
  try {
    meta = await sharp(file, { limitInputPixels: false }).metadata();
  } catch {
    throw notAPicture('it is not a picture file');
  }
  if (!meta.format || !KINDS.has(meta.format)) throw notAPicture(`it is a ${meta.format ?? 'file of a kind not known'}`);
  if (!meta.width || !meta.height) throw notAPicture('it has no size');
  if (meta.width * meta.height > MOST_PIXELS) throw notAPicture(`it is ${meta.width} by ${meta.height} pixels, more than a picture needs`);
  const [wide, tall] = (meta.orientation ?? 1) >= 5 ? [meta.height, meta.width] : [meta.width, meta.height];   // as seen: it may be stored lying on its side
  const widths: number[] = WIDTHS.filter((w) => w <= wide);
  if (!widths.length) widths.push(wide);
  try {
    // The file is unfolded once, straight down to the widest copy; the narrower ones are made from that, one after
    // another. So a large picture costs its own reading and little more, however many copies are kept.
    const widest = widths[widths.length - 1]!;
    const { data: pixels, info: is } = await sharp(file, { limitInputPixels: MOST_PIXELS }).rotate().resize({ width: widest, withoutEnlargement: true }).raw().toBuffer({ resolveWithObject: true });
    const kept: Copy[] = [];
    for (const width of widths) {
      // each copy as tall as the picture itself makes it at that width, not as the widest copy's rounding would
      const { data, info } = await sharp(pixels, { raw: { width: is.width, height: is.height, channels: is.channels } }).resize({ width, height: Math.max(1, Math.round((width * tall) / wide)), fit: 'fill' }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
      kept.push({ width: info.width, height: info.height, bytes: data });
    }
    return kept;
  } catch {
    throw notAPicture('the file is damaged or cut short');
  }
}

/*
 * A game's cast: the characters a player meets in it. The game knows them (who they are, what they are called, what
 * they look like, if anything); here each of them can be given another name and a picture, which the game then shows
 * in place of its own. Anyone reads these; changing them takes the key (AdminGuard).
 */
@Injectable()
export class CastService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Everyone in a game's cast who has a name or a picture from here, by key. One read for the whole cast. */
  async cast(game: string): Promise<{ cast: MemberView[] }> {
    const rows = await this.db.select().from(castMember).where(eq(castMember.game, game)).orderBy(asc(castMember.member));
    return { cast: rows.map(view) };
  }

  /** Gives a member a name, or with null the game's own back. */
  rename(game: string, member: string, name: string | null): Promise<MemberView> {
    return this.change(game, member, (had) => ({ name, photoAt: had?.photoAt ?? null }));
  }

  /** Puts a member's picture up, in place of any she had. */
  async putPhoto(game: string, member: string, file: Buffer): Promise<MemberView> {
    const kept = await copies(file);
    // never the moment of the picture before: its address may be held by a browser for good
    return this.change(game, member, (had) => ({ name: had?.name ?? null, photoAt: new Date(Math.max(Date.now(), (had?.photoAt?.getTime() ?? 0) + 1)) }), kept);
  }

  /** Takes a member's picture away. Taking away what is not there is no error. */
  removePhoto(game: string, member: string): Promise<MemberView> {
    return this.change(game, member, (had) => ({ name: had?.name ?? null, photoAt: null }), []);
  }

  /**
   * One change to one member. A member left with neither a name nor a picture is the game's own again and is not kept.
   * `photos`: the copies of her picture from now on (none: she has no picture); left out, her picture is not touched.
   * Changes are made one at a time, so the count of a game's cast holds.
   */
  private change(game: string, member: string, next: (had: MemberRow | undefined) => { name: string | null; photoAt: Date | null }, photos?: Copy[]): Promise<MemberView> {
    const max = this.config.limits.castPerGame;
    const her = and(eq(castMember.game, game), eq(castMember.member, member));
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(7302002)`);
      const [had] = await tx.select().from(castMember).where(her);
      const now = next(had);
      if (now.name === null && now.photoAt === null) {
        if (had) await tx.delete(castMember).where(her);   // her pictures go with her
        return nobody(member);
      }
      if (!had) {
        const [{ n } = { n: 0 }] = await tx.select({ n: count() }).from(castMember).where(eq(castMember.game, game));
        if (n >= max) throw new ConflictException({ error: 'full', message: `A game's cast has room for ${max} names and pictures.`, max });
      }
      const [row] = await tx
        .insert(castMember)
        .values({ game, member, ...now })
        .onConflictDoUpdate({ target: [castMember.game, castMember.member], set: { ...now, updatedAt: new Date() } })
        .returning();
      if (photos) {
        await tx.delete(castPhoto).where(and(eq(castPhoto.game, game), eq(castPhoto.member, member)));
        if (photos.length) await tx.insert(castPhoto).values(photos.map((p) => ({ game, member, ...p })));
      }
      return view(row!);
    });
  }

  /**
   * A member's picture for a place `wanted` pixels wide: the copy at the next width up, or her widest when she has
   * none that wide. null when she has no picture. One read, of one copy.
   */
  async photo(game: string, member: string, wanted: number | undefined): Promise<{ bytes: Buffer; width: number; version: number } | null> {
    const width = WIDTHS.find((w) => w >= (wanted ?? PROFILE)) ?? WIDTHS[WIDTHS.length - 1]!;
    const [row] = await this.db
      .select({ bytes: castPhoto.bytes, width: castPhoto.width, at: castMember.photoAt })
      .from(castPhoto)
      .innerJoin(castMember, and(eq(castMember.game, castPhoto.game), eq(castMember.member, castPhoto.member)))
      .where(and(eq(castPhoto.game, game), eq(castPhoto.member, member)))
      .orderBy(sql`(${castPhoto.width} >= ${width}) desc`, sql`abs(${castPhoto.width} - ${width})`)
      .limit(1);
    return row?.at ? { bytes: row.bytes, width: row.width, version: row.at.getTime() } : null;
  }
}
