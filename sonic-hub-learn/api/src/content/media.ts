import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { and, eq } from 'drizzle-orm';
import sharp from 'sharp';
import type { SyncConfig } from '../config.js';
import { sha256 } from '../common/util.js';
import type { DbExecutor } from '../db/db.js';
import { mediaAsset } from '../db/schema.js';
import { ASSET_SCHEME } from '../common/assets.js';

const RASTER_TO_WEBP = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tif', '.tiff']);
const CONTENT_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/opus',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};
export const MEDIA_EXTENSIONS = new Set([...RASTER_TO_WEBP, ...Object.keys(CONTENT_TYPES)]);
const MAX_IMAGE_WIDTH = 1600;

export function isRelativeRef(ref: string): boolean {
  return !/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(ref);
}

const MD_IMAGE_RE = /(!\[[^\]]*\]\(\s*<?)([^)\s>]+)(>?(?:\s+["'][^"']*["'])?\s*\))/g;
const HTML_ATTR_RE = /(\b(?:src|poster|data-src|href)\s*=\s*)(["'])([^"']+)\2/gi;
const CSS_URL_RE = /(url\(\s*)(["']?)([^"')]+)\2(\s*\))/gi;

function isMediaPath(ref: string): boolean {
  return MEDIA_EXTENSIONS.has(extname(ref.split(/[?#]/)[0]).toLowerCase());
}

/** Relative media paths referenced inside markdown, HTML or CSS text. */
export function findTextRefs(text: string | null | undefined): string[] {
  if (!text) return [];
  const refs: string[] = [];
  for (const m of text.matchAll(MD_IMAGE_RE)) refs.push(m[2]);
  for (const m of text.matchAll(HTML_ATTR_RE)) refs.push(m[3]);
  for (const m of text.matchAll(CSS_URL_RE)) refs.push(m[3]);
  return refs.filter((r) => isRelativeRef(r) && isMediaPath(r));
}

/** Replaces relative media paths in text with asset:// keys. */
export function rewriteTextRefs(text: string | null | undefined, baseDir: string, keyOf: (abs: string) => string | undefined): string | null {
  if (text == null) return null;
  const swap = (ref: string) => {
    if (!isRelativeRef(ref) || !isMediaPath(ref)) return ref;
    const key = keyOf(resolve(baseDir, ref.split(/[?#]/)[0]));
    return key ? `${ASSET_SCHEME}${key}` : ref;
  };
  return text
    .replace(MD_IMAGE_RE, (_, a: string, ref: string, b: string) => `${a}${swap(ref)}${b}`)
    .replace(HTML_ATTR_RE, (_, a: string, q: string, ref: string) => `${a}${q}${swap(ref)}${q}`)
    .replace(CSS_URL_RE, (_, a: string, q: string, ref: string, b: string) => `${a}${q}${swap(ref)}${q}${b}`);
}

export interface PreparedMedia {
  bytes: Buffer;
  ext: string;
  contentType: string;
}

/** Raster images become WebP (max 1600px wide); everything else is stored as is. */
export async function prepareMedia(abs: string): Promise<PreparedMedia> {
  const ext = extname(abs).toLowerCase();
  const source = readFileSync(abs);
  if (RASTER_TO_WEBP.has(ext)) {
    const bytes = await sharp(source, { animated: ext === '.gif' })
      .rotate()
      .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    return { bytes, ext: '.webp', contentType: 'image/webp' };
  }
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) throw new Error(`unsupported media type: ${abs}`);
  return { bytes: source, ext, contentType };
}

export interface MediaStore {
  kind: SyncConfig['media']['storage'];
  put(key: string, bytes: Buffer, contentType: string): Promise<void>;
}

export function createMediaStore(cfg: SyncConfig['media']): MediaStore {
  if (cfg.storage === 'b2') {
    if (!cfg.b2.keyId || !cfg.b2.appKey) throw new Error('MEDIA_STORAGE=b2 needs B2_KEY_ID and B2_APP_KEY');
    const client = new S3Client({
      endpoint: cfg.b2.endpoint,
      region: cfg.b2.region,
      credentials: { accessKeyId: cfg.b2.keyId, secretAccessKey: cfg.b2.appKey },
    });
    return {
      kind: 'b2',
      async put(key, bytes, contentType) {
        await client.send(
          new PutObjectCommand({
            Bucket: cfg.b2.bucket,
            Key: key,
            Body: bytes,
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000, immutable',
          }),
        );
      },
    };
  }
  if (cfg.storage === 'local') {
    return {
      kind: 'local',
      async put(key, bytes) {
        const target = join(cfg.localDir, key);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, bytes);
      },
    };
  }
  return { kind: 'none', async put() {} };
}

export interface MediaSyncResult {
  keys: Map<string, string>;
  uploaded: number;
  reused: number;
}

/**
 * Turns source files into stored media. Keys are content hashes, so unchanged files are never
 * uploaded twice; media_asset remembers each source file's hash to skip re-encoding.
 */
export async function syncMedia(db: DbExecutor, store: MediaStore, prefix: string, files: Iterable<string>): Promise<MediaSyncResult> {
  const keys = new Map<string, string>();
  let uploaded = 0;
  let reused = 0;
  for (const abs of new Set(files)) {
    const sourceSha = sha256(readFileSync(abs));
    const [known] = await db
      .select()
      .from(mediaAsset)
      .where(and(eq(mediaAsset.sourceSha256, sourceSha), eq(mediaAsset.storage, store.kind)));
    if (known) {
      keys.set(abs, known.key);
      reused++;
      continue;
    }
    const prepared = await prepareMedia(abs);
    const key = `${prefix}/${sha256(prepared.bytes).slice(0, 24)}${prepared.ext}`;
    await store.put(key, prepared.bytes, prepared.contentType);
    await db
      .insert(mediaAsset)
      .values({ key, sourceSha256: sourceSha, contentType: prepared.contentType, bytes: prepared.bytes.length, storage: store.kind })
      .onConflictDoUpdate({
        target: mediaAsset.sourceSha256,
        set: { key, contentType: prepared.contentType, bytes: prepared.bytes.length, storage: store.kind },
      });
    keys.set(abs, key);
    uploaded++;
  }
  return { keys, uploaded, reused };
}
