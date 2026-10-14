import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type MediaStorageKind = 'b2' | 'local' | 'none';

export interface AppConfig {
  databaseUrl: string;
  /** false: plain connection · 'verify': TLS with certificate check · 'no-verify': TLS, self-signed allowed */
  databaseSsl: false | 'verify' | 'no-verify';
  port: number;
  corsOrigins: string[] | true;
  timezone: string;
  /** A learning day starts at this local hour (late-night study still counts for the previous day). */
  dayRolloverHour: number;
  /** Builds today's Daily every morning; off in tests. */
  cronEnabled: boolean;
  media: {
    /** Public base URL that stored keys are appended to (the Bunny CDN in front of B2). */
    publicBaseUrl: string;
    /** When set, the API serves this folder at /media (local development). */
    serveLocalDir: string | null;
  };
}

export interface SyncConfig {
  databaseUrl: string;
  databaseSsl: AppConfig['databaseSsl'];
  contentDir: string;
  media: {
    storage: MediaStorageKind;
    prefix: string;
    localDir: string;
    b2: { endpoint: string; region: string; keyId: string; appKey: string; bucket: string };
  };
}

const here = dirname(fileURLToPath(import.meta.url));
/** sonic-hub-learn/ (this file runs from api/dist or api/dist-test/src). */
const learnRoot = resolve(here, here.includes('dist-test') ? '../../..' : '../..');

function ssl(env: NodeJS.ProcessEnv): AppConfig['databaseSsl'] {
  const v = (env.DATABASE_SSL ?? '').trim().toLowerCase();
  if (v === 'true' || v === 'verify') return 'verify';
  if (v === 'no-verify') return 'no-verify';
  return false;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const v = env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

/** An environment value, treating an empty string as unset (CI passes missing secrets as ""). */
function opt(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const v = env[name]?.trim();
  return v ? v : undefined;
}

export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const origins = opt(env, 'CORS_ORIGIN') ?? '*';
  return {
    databaseUrl: required(env, 'DATABASE_URL'),
    databaseSsl: ssl(env),
    port: Number(opt(env, 'PORT') ?? 3100),
    corsOrigins: origins === '*' ? true : origins.split(',').map((s) => s.trim()),
    timezone: opt(env, 'APP_TIMEZONE') ?? 'Asia/Ho_Chi_Minh',
    dayRolloverHour: Number(opt(env, 'DAY_ROLLOVER_HOUR') ?? 4),
    cronEnabled: (opt(env, 'CRON_ENABLED') ?? 'true') !== 'false',
    media: {
      publicBaseUrl: (opt(env, 'MEDIA_BASE_URL') ?? opt(env, 'CDN_BASE') ?? 'https://sonic-hub.b-cdn.net').replace(/\/+$/, ''),
      serveLocalDir: opt(env, 'MEDIA_SERVE_DIR') ? resolve(opt(env, 'MEDIA_SERVE_DIR')!) : null,
    },
  };
}

export function loadSyncConfig(env: NodeJS.ProcessEnv = process.env, overrides: Partial<{ contentDir: string; storage: MediaStorageKind }> = {}): SyncConfig {
  const storage = overrides.storage ?? (opt(env, 'MEDIA_STORAGE') as MediaStorageKind | undefined) ?? (opt(env, 'B2_KEY_ID') ? 'b2' : 'local');
  const endpoint = opt(env, 'B2_ENDPOINT') ?? 's3.us-east-005.backblazeb2.com';
  return {
    databaseUrl: required(env, 'DATABASE_URL'),
    databaseSsl: ssl(env),
    contentDir: resolve(overrides.contentDir ?? opt(env, 'CONTENT_DIR') ?? resolve(learnRoot, 'content')),
    media: {
      storage,
      prefix: opt(env, 'MEDIA_PREFIX') ?? 'learn',
      localDir: resolve(opt(env, 'MEDIA_LOCAL_DIR') ?? resolve(learnRoot, '.media')),
      b2: {
        endpoint: endpoint.startsWith('http') ? endpoint : `https://${endpoint}`,
        region: opt(env, 'B2_REGION') ?? 'us-east-005',
        keyId: opt(env, 'B2_KEY_ID') ?? '',
        appKey: opt(env, 'B2_APP_KEY') ?? '',
        bucket: opt(env, 'B2_BUCKET') ?? 'sonic-hub',
      },
    },
  };
}

export const defaultContentDir = resolve(learnRoot, 'content');
