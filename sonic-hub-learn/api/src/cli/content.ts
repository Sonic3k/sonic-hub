import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { defaultContentDir, loadSyncConfig, type MediaStorageKind } from '../config.js';
import { createDb, openPool, runMigrations } from '../db/db.js';
import { checkContent, formatIssues } from '../content/check.js';
import { loadContent } from '../content/loader.js';
import { createMediaStore, syncMedia } from '../content/media.js';
import { syncContent } from '../content/sync.js';

/*
 * content check            validate content/ (schema, references, media) — no database needed
 * content sync             check, upload media, upsert the catalog, rebuild course cards
 *   --content <dir>        content folder (default: sonic-hub-learn/content)
 *   --media b2|local|none  where media goes (default: b2 when B2_KEY_ID is set, else local .media/)
 */

const github = process.env.GITHUB_ACTIONS === 'true';

async function main(): Promise<number> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { content: { type: 'string' }, media: { type: 'string' } },
  });
  const command = positionals[0];
  if (command !== 'check' && command !== 'sync') {
    console.error('usage: content <check|sync> [--content <dir>] [--media b2|local|none]');
    return 2;
  }

  const contentDir = values.content ? resolve(values.content) : undefined;
  const model = loadContent(contentDir ?? (process.env.CONTENT_DIR ? resolve(process.env.CONTENT_DIR) : defaultContentDir));
  const { issues, index } = checkContent(model);
  const errors = issues.filter((i) => i.level === 'error');
  if (issues.length) console.log(formatIssues(issues, github));
  const items = index.declarations.size;
  const courses = index.courses.size;
  console.log(`content: ${model.subjects.length} subjects, ${courses} courses, ${items} items, ${index.media.size} media files — ${errors.length} errors, ${issues.length - errors.length} warnings`);
  if (errors.length) return 1;
  if (command === 'check') return 0;

  const config = loadSyncConfig(process.env, { contentDir, storage: values.media as MediaStorageKind | undefined });
  const pool = await openPool(config.database);
  try {
    const db = createDb(pool);
    await runMigrations(db);
    const store = createMediaStore(config.media);
    const media = await syncMedia(db, store, config.media.prefix, index.media.keys());
    const report = await syncContent(db, model, index, media, {
      now: new Date(),
      clock: { timezone: process.env.APP_TIMEZONE || 'Asia/Ho_Chi_Minh', rolloverHour: Number(process.env.DAY_ROLLOVER_HOUR || 4) },
    });
    console.log(`media (${store.kind}): ${media.uploaded} uploaded, ${media.reused} unchanged`);
    console.log(JSON.stringify(report, null, 2));
    return 0;
  } finally {
    await pool.end();
  }
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
