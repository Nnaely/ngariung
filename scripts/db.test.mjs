import assert from "node:assert/strict";
import test from "node:test";
import { createTestDb } from "./helpers/test-db.mjs";
import { migrate } from "../lib/server/sql.ts";
import { poolConfig, resolveDatabaseUrl } from "../lib/server/pool.ts";

test("migrations create every table once and can safely run again", async () => {
  const { db, close } = await createTestDb();
  try {
    await migrate(db);
    const applied = await db.query("select count(*)::int as n from schema_migrations");
    assert.equal(applied.rows[0].n, 1);
    const tables = await db.query(
      "select table_name from information_schema.tables where table_schema = 'public' order by 1",
    );
    assert.deepEqual(
      tables.rows.map((row) => row.table_name),
      ["app_config", "battles", "check_ins", "daily_results", "push_subscriptions", "schema_migrations", "sessions", "users"],
    );
  } finally {
    await close();
  }
});

test("a failing transaction leaves no partial writes", async () => {
  const { db, close } = await createTestDb();
  try {
    await assert.rejects(
      db.transaction(async (tx) => {
        await tx.query("insert into app_config (key, value) values ('a', '1')");
        throw new Error("boom");
      }),
      /boom/,
    );
    const rows = await db.query("select count(*)::int as n from app_config");
    assert.equal(rows.rows[0].n, 0);
  } finally {
    await close();
  }
});

test("the database URL follows Vercel's variable names in order", () => {
  assert.equal(resolveDatabaseUrl({ DATABASE_URL: "a", POSTGRES_URL: "b" }), "a");
  assert.equal(resolveDatabaseUrl({ POSTGRES_URL: "b" }), "b");
  assert.equal(resolveDatabaseUrl({ STORAGE_DATABASE_URL_UNPOOLED: "d", STORAGE_DATABASE_URL: "c" }), "c");
  assert.equal(resolveDatabaseUrl({ DATABASE_URL: " ", POSTGRES_URL_NON_POOLING: "x" }), null);
  assert.equal(resolveDatabaseUrl({}), null);
});

test("remote databases use verified TLS without URL overrides; local ones use one plain connection", () => {
  const remote = poolConfig(
    "postgres://neon%40user:p%40ss@ep-cool-1-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  );
  assert.equal(remote.host, "ep-cool-1-pooler.ap-southeast-1.aws.neon.tech");
  assert.equal(remote.port, 5432);
  assert.equal(remote.user, "neon@user");
  assert.equal(remote.password, "p@ss");
  assert.equal(remote.database, "neondb");
  assert.deepEqual(remote.ssl, { rejectUnauthorized: true });
  assert.equal(remote.connectionString, undefined);

  const local = poolConfig("postgres://postgres:postgres@127.0.0.1:54329/postgres");
  assert.equal(local.ssl, false);
  assert.equal(local.max, 1);
  assert.equal(local.port, 54329);
});
