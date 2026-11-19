import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { defaultLimits, type AppConfig } from '../src/config.js';
import { createDb, ensureDatabase, runMigrations } from '../src/db/db.js';
import { createApp } from '../src/main.js';

/*
 * The first version that was deployed kept players under holders, each with a code. A database from that time has
 * to become this one with its players in it. It is made and migrated the way the deployed one is: by a role that
 * owns its database and nothing else. Needs TEST_DATABASE_URL (a superuser connection; a scratch database is created).
 */

const adminUrl = process.env.TEST_DATABASE_URL;
const dbName = `game_mig_${process.pid}`;
const user = `game_mig_app_${process.pid}`;
/** dist-test/test/ → drizzle/ */
const DRIZZLE = new URL('../../drizzle/', import.meta.url);

describe('a database from the first version', { skip: !adminUrl && 'TEST_DATABASE_URL not set' }, () => {
  let pool: pg.Pool;
  let dbUrl = '';
  const old = mkdtempSync(join(tmpdir(), 'game-first-'));
  const ids = { sonic: crypto.randomUUID(), guest: crypto.randomUUID(), friend: crypto.randomUUID(), chess: crypto.randomUUID() };
  const rows = () => pool.query('select id, game, name, data, version, played_at from player order by created_at, name').then((r) => r.rows);

  before(async () => {
    dbUrl = await ensureDatabase({ url: null, adminUrl: adminUrl!, name: dbName, user, password: 'migrating', ssl: false });
    pool = new pg.Pool({ connectionString: dbUrl, max: 2 });
    assert.equal((await pool.query('select current_user as who')).rows[0].who, user);

    // the database as the first version made it: only its first migration, run the way the service runs them
    const journal = JSON.parse(readFileSync(new URL('meta/_journal.json', DRIZZLE), 'utf8'));
    mkdirSync(join(old, 'meta'));
    cpSync(new URL('0000_init.sql', DRIZZLE), join(old, '0000_init.sql'));
    writeFileSync(join(old, 'meta', '_journal.json'), JSON.stringify({ ...journal, entries: journal.entries.slice(0, 1) }));
    await migrate(drizzle(pool), { migrationsFolder: old });
    // two people, each with a code of their own, and what they had kept
    const holder = async (hash: string) => (await pool.query('insert into holder (code_hash) values ($1) returning id', [hash])).rows[0].id as string;
    const mine = await holder('a'.repeat(64)), theirs = await holder('b'.repeat(64));
    await holder('c'.repeat(64));
    const keep = (id: string, holderId: string, game: string, name: string, data: unknown, version: number) =>
      pool.query(`insert into player (id, holder_id, game, name, data, version, played_at) values ($1, $2, $3, $4, $5, $6, now() - interval '1 hour')`, [id, holderId, game, name, JSON.stringify(data), version]);
    await keep(ids.sonic, mine, 'keep-it-down-extended', 'Sonic', { points: 941, vs: { mina: { w: 5, l: 2, d: 0 } } }, 7);
    await keep(ids.guest, mine, 'keep-it-down-extended', 'Guest', { points: 600 }, 1);
    await keep(ids.friend, theirs, 'keep-it-down-extended', 'A friend', { points: 688 }, 3);
    await keep(ids.chess, theirs, 'commander-chess', 'A friend', { rank: 2 }, 2);
  });

  after(async () => {
    rmSync(old, { recursive: true, force: true });
    if (!adminUrl) return;
    await pool?.end();
    const admin = new pg.Client({ connectionString: adminUrl });
    await admin.connect();
    await admin.query(`drop database if exists ${dbName} with (force)`);
    await admin.query(`drop role if exists ${user}`);
    await admin.end();
  });

  test('becomes this one, and every player in it stays, as a player of the game', async () => {
    const before = await rows();
    assert.equal(before.length, 4);
    await runMigrations(createDb(pool));
    assert.deepEqual(await rows(), before, 'the same players, with their saves, versions and times');
    const tables = (await pool.query(`select table_name from information_schema.tables where table_schema = 'public' order by 1`)).rows.map((r) => r.table_name);
    assert.deepEqual(tables, ['cast_member', 'cast_photo', 'player', 'service']);
    assert.deepEqual((await pool.query('select (select count(*) from cast_member)::int as members, (select count(*) from cast_photo)::int as photos')).rows[0], { members: 0, photos: 0 }, 'a cast is the game’s own until it is changed here');
    const columns = (await pool.query(`select column_name from information_schema.columns where table_name = 'player' order by ordinal_position`)).rows.map((r) => r.column_name);
    assert.deepEqual(columns, ['id', 'game', 'name', 'data', 'version', 'created_at', 'updated_at', 'played_at']);
    const indexes = (await pool.query(`select indexname from pg_indexes where tablename = 'player' order by 1`)).rows.map((r) => r.indexname);
    assert.deepEqual(indexes, ['player_game_idx', 'player_pkey']);
    assert.equal((await pool.query('select count(*)::int as n from service')).rows[0].n, 1);
  });

  test('run again, nothing changes; and the service on it shows the game its players', async () => {
    const epoch = (await pool.query('select epoch from service')).rows[0].epoch;
    await runMigrations(createDb(pool));
    assert.equal((await pool.query('select epoch from service')).rows[0].epoch, epoch);
    process.env.NODE_ENV = 'test';
    const config: AppConfig = { database: { url: dbUrl, adminUrl: null, name: dbName, user, password: null, ssl: false }, port: 0, corsOrigins: true, addressHeader: null, adminKey: null, limits: defaultLimits };
    const app = await createApp(config);
    await app.listen(0, '127.0.0.1');
    try {
      const base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}/api`;
      const list = (await (await fetch(`${base}/games/keep-it-down-extended/players`)).json()) as any;
      assert.equal(list.epoch, epoch);
      assert.deepEqual(list.players.map((p: any) => [p.id, p.name, p.data.points, p.version]).sort(), [[ids.friend, 'A friend', 688, 3], [ids.guest, 'Guest', 600, 1], [ids.sonic, 'Sonic', 941, 7]].sort());
      // a save made from the version a browser still holds goes on as before
      const next = await fetch(`${base}/games/keep-it-down-extended/players/${ids.sonic}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ base: 7, data: { points: 957 } }) });
      assert.deepEqual([next.status, ((await next.json()) as any).version], [200, 8]);
      assert.equal(((await (await fetch(`${base}/games/commander-chess/players`)).json()) as any).players.length, 1);
    } finally {
      await app.close();
    }
  });
});
