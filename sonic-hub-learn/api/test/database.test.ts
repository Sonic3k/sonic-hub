import assert from 'node:assert/strict';
import { after, describe, test } from 'node:test';
import pg from 'pg';
import type { DatabaseConfig } from '../src/config.js';
import { ensureDatabase } from '../src/db/db.js';

/*
 * The deployed API makes its own database and role on the shared server from the superuser connection.
 * Needs TEST_DATABASE_URL pointing at that kind of connection (a superuser; CI's Postgres user is one).
 */

const adminUrl = process.env.TEST_DATABASE_URL;
const name = `learn_boot_${process.pid}`;
const user = `learn_boot_app_${process.pid}`;

async function asAdmin<T>(fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const c = new pg.Client({ connectionString: adminUrl });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

async function whoAmI(url: string): Promise<{ who: string; db: string }> {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    return (await c.query('select current_user as who, current_database() as db')).rows[0];
  } finally {
    await c.end();
  }
}

describe('database bootstrap on the shared server', { skip: !adminUrl && 'TEST_DATABASE_URL not set' }, () => {
  const cfg = (password: string): DatabaseConfig => ({ url: null, adminUrl: adminUrl!, name, user, password, ssl: false });

  after(async () => {
    if (!adminUrl) return;
    await asAdmin(async (c) => {
      await c.query(`drop table if exists learn_boot_secret_${process.pid}`);
      await c.query(`drop database if exists ${name} with (force)`);
      await c.query(`drop role if exists ${user}`);
    });
  });

  test('creates the database and a role that owns it, then connects as that role', async () => {
    const url = await ensureDatabase(cfg('first-pass'));
    assert.deepEqual(await whoAmI(url), { who: user, db: name });
    const owner = await asAdmin((c) => c.query('select pg_get_userbyid(datdba) as owner from pg_database where datname = $1', [name]));
    assert.equal(owner.rows[0].owner, user);
  });

  test('runs again on every start: nothing is recreated, a new password takes over', async () => {
    const secret = () => asAdmin((c) => c.query('select rolpassword from pg_authid where rolname = $1', [user]).then((r) => r.rows[0].rolpassword as string));
    const oid = () => asAdmin((c) => c.query('select oid from pg_database where datname = $1', [name]).then((r) => String(r.rows[0].oid)));
    const [before, dbBefore] = [await secret(), await oid()];
    const url = await ensureDatabase(cfg('second-pass'));
    assert.deepEqual(await whoAmI(url), { who: user, db: name });
    assert.notEqual(await secret(), before, 'the role takes the new password');
    assert.equal(await oid(), dbBefore, 'the database is the same one');
  });

  test("the role cannot read the shared server's other data", async () => {
    const table = `learn_boot_secret_${process.pid}`;
    await asAdmin((c) => c.query(`create table ${table} (v text)`));
    const other = new URL(adminUrl!);
    other.username = user;
    other.password = 'second-pass';
    const c = new pg.Client({ connectionString: other.toString() });
    await c.connect();
    try {
      await assert.rejects(c.query(`select * from ${table}`), /permission denied/);
    } finally {
      await c.end();
    }
  });

  test('a ready DATABASE_URL is used as it is', async () => {
    assert.equal(await ensureDatabase({ url: 'postgresql://x@h/db', adminUrl: null, name, user, password: null, ssl: false }), 'postgresql://x@h/db');
  });
});
