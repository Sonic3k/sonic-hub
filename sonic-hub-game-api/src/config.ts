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

/** How much one code, and one address, may ask of the service. */
export interface Limits {
  /** Players a code may keep in one game. */
  playersPerGame: number;
  /** Different games a code may keep players in. */
  gamesPerCode: number;
  /** The size of one saved game, as JSON text. */
  saveBytes: number;
  /** Requests a minute from one address. */
  requestsPerMinute: number;
  /** New codes an hour for one address. */
  newCodesPerHour: number;
  /** Wrong codes an hour from one address, after which it is told to wait. */
  wrongCodesPerHour: number;
}

export interface AppConfig {
  database: DatabaseConfig;
  port: number;
  corsOrigins: string[] | true;
  limits: Limits;
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

export const defaultLimits: Limits = { playersPerGame: 3, gamesPerCode: 24, saveBytes: 64 * 1024, requestsPerMinute: 240, newCodesPerHour: 10, wrongCodesPerHour: 30 };

export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const origins = opt(env, 'CORS_ORIGIN') ?? '*';
  return {
    database: databaseConfig(env),
    port: Number(opt(env, 'PORT') ?? 3200),
    corsOrigins: origins === '*' ? true : origins.split(',').map((s) => s.trim()),
    limits: {
      playersPerGame: count(env, 'PLAYERS_PER_GAME', defaultLimits.playersPerGame),
      gamesPerCode: count(env, 'GAMES_PER_CODE', defaultLimits.gamesPerCode),
      saveBytes: count(env, 'SAVE_BYTES', defaultLimits.saveBytes),
      requestsPerMinute: count(env, 'REQUESTS_PER_MINUTE', defaultLimits.requestsPerMinute),
      newCodesPerHour: count(env, 'NEW_CODES_PER_HOUR', defaultLimits.newCodesPerHour),
      wrongCodesPerHour: count(env, 'WRONG_CODES_PER_HOUR', defaultLimits.wrongCodesPerHour),
    },
  };
}
