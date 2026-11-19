import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import type { MediaConfig } from './config.js';

/*
 * Where a cast's pictures are kept: the hub's bucket, in this service's folder, the way the hub's other services keep
 * theirs. A picture is put there as it was sent up and read through the CDN in front of the bucket, which hands it
 * out at whatever width an address asks for (?width=). So nothing is resized here, and no picture is served from here.
 */

/** The kinds of file a picture may come as. */
export interface Kind { ext: 'jpg' | 'png' | 'webp'; type: 'image/jpeg' | 'image/png' | 'image/webp' }

/** What kind of picture a file is, by how the file itself begins (whatever its sender calls it); null when it is none of the three. */
export function kindOf(file: Buffer): Kind | null {
  if (file.length >= 3 && file[0] === 0xff && file[1] === 0xd8 && file[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' };
  if (file.length >= 8 && file.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', type: 'image/png' };
  if (file.length >= 12 && file.toString('latin1', 0, 4) === 'RIFF' && file.toString('latin1', 8, 12) === 'WEBP') return { ext: 'webp', type: 'image/webp' };
  return null;
}

/** The folder, inside a game's own, that the profile pictures of its cast are kept in. */
export const PROFILE_PHOTOS = 'profile-photos';
/** The folder, inside a game's own, that the pictures of its cast's albums are kept in. */
export const ALBUM = 'album';

export interface PhotoStore {
  /** Whether there is anywhere to keep a picture. */
  readonly ready: boolean;
  /**
   * The key a member's picture is kept under: <folder>/<game>/profile-photos/<member>-<what the file is>.<kind>, for
   * one: games/keep-it-down-extended/profile-photos/nell-6b4be6e45efb.jpg. So what is uploaded here has a folder of
   * its own in the bucket, a game's profile pictures lie side by side in one place, and each says by its name whose
   * it is. The rest of the name is made from the file itself, so another picture is at another address (and one
   * address is one picture for good, which is what lets the CDN and every browser keep it), and the same picture
   * sent twice is kept once.
   */
  keyFor(game: string, member: string, file: Buffer, kind: Kind): string;
  /**
   * The key a picture of her album is kept under: <folder>/<game>/album/<member>-<place>-<what the file is>.<kind>,
   * for one: games/keep-it-down-extended/album/nell-03-6b4be6e45efb.jpg. A game's album pictures lie in one folder,
   * in order: whose it is, then its place.
   */
  albumKeyFor(game: string, member: string, n: number, file: Buffer, kind: Kind): string;
  /** The address a kept file is read at. A width is asked for by adding ?width= to it. */
  url(key: string): string;
  put(key: string, bytes: Buffer, contentType: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export function createPhotoStore(media: MediaConfig): PhotoStore {
  const client = media.b2
    ? new S3Client({
        endpoint: media.b2.endpoint,
        region: media.b2.region,
        credentials: { accessKeyId: media.b2.keyId, secretAccessKey: media.b2.appKey },
        forcePathStyle: media.b2.pathStyle,
        // only the checksums S3 itself requires: B2 has not always taken the extra ones this library adds by default
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
        // a picture that cannot be put away is told so, not waited on for ever
        requestHandler: { connectionTimeout: 5_000, requestTimeout: 60_000 },
      })
    : null;
  const bucket = media.b2?.bucket ?? '';
  const none = () => new Error('no storage is set up');
  return {
    ready: !!client,
    keyFor: (game, member, file, kind) => `${media.prefix}/${game}/${PROFILE_PHOTOS}/${member}-${createHash('sha256').update(file).digest('hex').slice(0, 12)}.${kind.ext}`,
    albumKeyFor: (game, member, n, file, kind) => `${media.prefix}/${game}/${ALBUM}/${member}-${String(n).padStart(2, '0')}-${createHash('sha256').update(file).digest('hex').slice(0, 12)}.${kind.ext}`,
    url: (key) => `${media.publicBaseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`,
    async put(key, bytes, contentType) {
      if (!client) throw none();
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable' }));
    },
    async remove(key) {
      if (!client) throw none();
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}
