export interface DatabaseConfig {
  /** A ready connection string (local development, tests): when set, nothing is created. */
  url: string | null;
  /**
   * The shared server's superuser connection (Railway: the Postgres service's DATABASE_URL). Used on start to create
   * the game database and its role; the app itself then connects as that role.
   */
  adminUrl: string | null;
  name: string;
  user: string;
  password: string | null;
  /** false: plain connection · 'verify': TLS with certificate check · 'no-verify': TLS, self-signed allowed */
  ssl: false | 'verify' | 'no-verify';
}

/** How much is kept, and how much one address may ask of the service. */
export interface Limits {
  /** Players a game keeps. */
  playersPerGame: number;
  /** Different games players are kept for, and as many a cast is kept for. Games are not listed anywhere, so this is what bounds what can pile up. */
  games: number;
  /** The size of one saved game, as JSON text. */
  saveBytes: number;
  /** Requests a minute from one address. */
  requestsPerMinute: number;
  /** The size of one picture: it is kept as it is sent up. */
  photoBytes: number;
  /** Members of one game's cast that can be given a name or a picture. */
  castPerGame: number;
}

/**
 * Where a cast's pictures are kept and read. As everywhere on the hub: the file goes into the hub's bucket (Backblaze
 * B2, spoken to as S3), in a folder of this service's own, and is read through the CDN in front of the bucket, which
 * hands a picture out at whatever width its address asks for (?width=).
 */
export interface MediaConfig {
  /** The bucket and what opens it, or null where none is set up: then names are given as ever and pictures cannot be kept. */
  b2: { endpoint: string; region: string; keyId: string; appKey: string; bucket: string; /** addresses as S3-compatible test servers want them; B2 itself works either way */ pathStyle: boolean } | null;
  /** This service's folder in the bucket (games), beside the hub's others (angels-islands, learn, music). */
  prefix: string;
  /** The address the bucket is read at (the CDN): a file's key is appended to it. */
  publicBaseUrl: string;
}

export interface AppConfig {
  database: DatabaseConfig;
  port: number;
  corsOrigins: string[] | true;
  limits: Limits;
  /**
   * The header in which the proxy in front names the caller, in small letters (Railway's edge: x-real-ip), or null
   * where there is none and a caller is known by the address the connection came from. The limits count by it, so
   * it is only ever a header the proxy writes itself, never one a caller could send.
   */
  addressHeader: string | null;
  media: MediaConfig;
}

function ssl(env: NodeJS.ProcessEnv): DatabaseConfig['ssl'] {
  const v = (env.DATABASE_SSL ?? '').trim().toLowerCase();
  if (v === 'true' || v === 'verify') return 'verify';
  if (v === 'no-verify') return 'no-verify';
  return false;
}

/** An environment value, treating an empty string as unset. */
function opt(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const v = env[name]?.trim();
  return v ? v : undefined;
}

function count(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const v = opt(env, name);
  if (v === undefined) return fallback;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new Error(`${name} has to be a whole number above zero, not "${v}"`);
  return n;
}

/** DATABASE_URL as it is, or the shared server's admin URL plus the password for the game role. */
function databaseConfig(env: NodeJS.ProcessEnv): DatabaseConfig {
  const db: DatabaseConfig = {
    url: opt(env, 'DATABASE_URL') ?? null,
    adminUrl: opt(env, 'DATABASE_ADMIN_URL') ?? null,
    // names that nothing else on the shared server is likely to bear: the role's password is set at every start
    name: opt(env, 'GAME_DB_NAME') ?? 'game_saves',
    user: opt(env, 'GAME_DB_USER') ?? 'game_saves_app',
    password: opt(env, 'GAME_DB_PASSWORD') ?? null,
    ssl: ssl(env),
  };
  if (!db.url && !(db.adminUrl && db.password)) {
    throw new Error('Set DATABASE_URL, or DATABASE_ADMIN_URL with GAME_DB_PASSWORD (the database and its role are then created)');
  }
  return db;
}

export const defaultLimits: Limits = { playersPerGame: 3, games: 50, saveBytes: 64 * 1024, requestsPerMinute: 240, photoBytes: 16 * 1024 * 1024, castPerGame: 200 };

/** With nothing set: no bucket to keep pictures in, and the hub's own folder and CDN for when there is one. */
export const defaultMedia: MediaConfig = { b2: null, prefix: 'games', publicBaseUrl: 'https://sonic-hub.b-cdn.net' };

/**
 * B2_KEY_ID and B2_APP_KEY open the bucket (the same pair the hub's other services have); B2_BUCKET, B2_ENDPOINT and
 * B2_REGION say which, and default to the hub's. CDN_BASE (or MEDIA_BASE_URL) is the address it is read at, and
 * MEDIA_PREFIX this service's folder in it.
 */
function mediaConfig(env: NodeJS.ProcessEnv): MediaConfig {
  const keyId = opt(env, 'B2_KEY_ID'), appKey = opt(env, 'B2_APP_KEY');
  if (!keyId !== !appKey) throw new Error('B2_KEY_ID and B2_APP_KEY go together: set both, or neither (then pictures cannot be kept)');
  const endpoint = opt(env, 'B2_ENDPOINT') ?? 's3.us-east-005.backblazeb2.com';
  const prefix = (opt(env, 'MEDIA_PREFIX') ?? defaultMedia.prefix).replace(/^\/+|\/+$/g, '');
  if (!/^[a-z0-9][a-z0-9/_-]*$/.test(prefix)) throw new Error(`MEDIA_PREFIX has to be a folder name in small letters, not "${prefix}"`);
  return {
    b2: keyId && appKey ? { endpoint: /^https?:\/\//.test(endpoint) ? endpoint : `https://${endpoint}`, region: opt(env, 'B2_REGION') ?? 'us-east-005', keyId, appKey, bucket: opt(env, 'B2_BUCKET') ?? 'sonic-hub', pathStyle: (opt(env, 'B2_PATH_STYLE') ?? 'false') === 'true' } : null,
    prefix,
    publicBaseUrl: (opt(env, 'MEDIA_BASE_URL') ?? opt(env, 'CDN_BASE') ?? defaultMedia.publicBaseUrl).replace(/\/+$/, ''),
  };
}

/**
 * ADDRESS_HEADER names it; `none` says there is no such header. Left unset, it is x-real-ip on Railway (whose edge
 * sets that header on every request, and is the only way in) and nothing anywhere else.
 */
function addressHeader(env: NodeJS.ProcessEnv): string | null {
  const v = opt(env, 'ADDRESS_HEADER')?.toLowerCase();
  if (v === undefined) return opt(env, 'RAILWAY_ENVIRONMENT_ID') ? 'x-real-ip' : null;
  if (v === 'none') return null;
  if (!/^[a-z0-9-]+$/.test(v)) throw new Error(`ADDRESS_HEADER has to be the name of a header, not "${v}"`);
  return v;
}

export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const origins = opt(env, 'CORS_ORIGIN') ?? '*';
  return {
    addressHeader: addressHeader(env),
    media: mediaConfig(env),
    database: databaseConfig(env),
    port: Number(opt(env, 'PORT') ?? 3200),
    corsOrigins: origins === '*' ? true : origins.split(',').map((s) => s.trim()),
    limits: {
      playersPerGame: count(env, 'PLAYERS_PER_GAME', defaultLimits.playersPerGame),
      games: count(env, 'GAMES', defaultLimits.games),
      saveBytes: count(env, 'SAVE_BYTES', defaultLimits.saveBytes),
      requestsPerMinute: count(env, 'REQUESTS_PER_MINUTE', defaultLimits.requestsPerMinute),
      photoBytes: count(env, 'PHOTO_BYTES', defaultLimits.photoBytes),
      castPerGame: count(env, 'CAST_PER_GAME', defaultLimits.castPerGame),
    },
  };
}
