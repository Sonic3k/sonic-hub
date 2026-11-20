import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { asc, count, desc, eq, sql } from 'drizzle-orm';
import type { HighlightView } from './api-schemas.js';
import { APP_CONFIG } from './common/tokens.js';
import type { AppConfig } from './config.js';
import { DB, type Db } from './db/db.js';
import { highlight, type HighlightRow } from './db/schema.js';

const view = (h: HighlightRow): HighlightView => ({ game: h.game, since: h.createdAt.toISOString() });

/*
 * The games picked out on the shelf: the ones that stand in front of their kind, large. The shelf has its own list
 * of games and knows what kind each is; kept here is only which of them are picked out, and since when. Nobody signs
 * in, as with a game's players and its cast: whoever opens the shelf's page for it changes it.
 */
@Injectable()
export class HighlightsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Every highlight, the one picked last first: one read, whatever their number. */
  async all(): Promise<{ max: number; highlights: HighlightView[] }> {
    const rows = await this.db.select().from(highlight).orderBy(desc(highlight.createdAt), asc(highlight.game));
    return { max: this.config.limits.highlights, highlights: rows.map(view) };
  }

  /**
   * Picks a game out. One that is picked out already stays as it was, with the moment it was picked: to bring it to
   * the front again it is dropped and picked anew. Picks are made one at a time, so the count holds.
   */
  pick(game: string): Promise<HighlightView> {
    const most = this.config.limits.highlights;
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(7302003)`);
      const [there] = await tx.select().from(highlight).where(eq(highlight.game, game));
      if (there) return view(there);
      const [{ n } = { n: 0 }] = await tx.select({ n: count() }).from(highlight);
      if (n >= most) throw new ConflictException({ error: 'full', message: `At most ${most} games are picked out at one time.`, max: most });
      const [row] = await tx.insert(highlight).values({ game }).returning();
      return view(row!);
    });
  }

  /** No longer picked out. Dropping one that is not picked out is no error. */
  async drop(game: string): Promise<void> {
    await this.db.delete(highlight).where(eq(highlight.game, game));
  }
}
