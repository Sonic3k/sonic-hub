import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle, type NodePgDatabase, type NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import pg from 'pg';
import * as schema from './schema.js';

export type Schema = typeof schema;
export type Db = NodePgDatabase<Schema>;
/** A database handle or an open transaction. */
export type DbExecutor = PgDatabase<NodePgQueryResultHKT, Schema>;

export const DB = Symbol('DB');
export const PG_POOL = Symbol('PG_POOL');

export function createPool(url: string, ssl: false | 'verify' | 'no-verify'): pg.Pool {
  return new pg.Pool({
    connectionString: url,
    max: 8,
    ssl: ssl === false ? undefined : { rejectUnauthorized: ssl === 'verify' },
  });
}

export function createDb(pool: pg.Pool): Db {
  return drizzle(pool, { schema });
}

const here = dirname(fileURLToPath(import.meta.url));
/** api/drizzle — from api/dist/db or api/dist-test/src/db. */
const migrationsFolder = resolve(here, here.includes('dist-test') ? '../../../drizzle' : '../../drizzle');

export async function runMigrations(db: Db): Promise<void> {
  await migrate(db, { migrationsFolder });
}
