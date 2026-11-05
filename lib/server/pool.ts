import pg from "pg";
import { migrate, type Db } from "./sql.ts";

/** Dilempar saat belum ada database yang disambungkan (mis. env Vercel kosong). */
export class DbNotConfiguredError extends Error {
  constructor() {
    super("Database belum disambungkan (DATABASE_URL kosong).");
    this.name = "DbNotConfiguredError";
  }
}

/**
 * Integrasi Neon di Vercel mengisi DATABASE_URL (pooled). Nama lama
 * POSTGRES_URL dan nama berprefiks kustom (mis. STORAGE_DATABASE_URL) juga diterima.
 */
export function resolveDatabaseUrl(env: Record<string, string | undefined>): string | null {
  for (const key of ["DATABASE_URL", "POSTGRES_URL"]) {
    const value = env[key]?.trim();
    if (value) return value;
  }
  for (const [key, raw] of Object.entries(env)) {
    const value = raw?.trim();
    if (value && /_(DATABASE|POSTGRES)_URL$/.test(key)) return value;
  }
  return null;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Konfigurasi pool dari URL. Field dipecah satu per satu (bukan connectionString)
 * karena parameter seperti `sslmode` di URL akan menimpa pengaturan TLS kita.
 */
export function poolConfig(url: string): pg.PoolConfig {
  const parsed = new URL(url);
  const local = LOCAL_HOSTS.has(parsed.hostname);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 5432,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, "")) || "postgres",
    ssl: local ? false : { rejectUnauthorized: true },
    // PGlite lokal hanya aman dengan satu koneksi (transaksi tidak boleh bercampur).
    max: local ? 1 : 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  };
}

function pgDb(pool: pg.Pool): Db {
  return {
    async query<R>(text: string, params?: unknown[]) {
      const result = await pool.query(text, params);
      return { rows: result.rows as R[] };
    },
    async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      const tx: Db = {
        async query<R>(text: string, params?: unknown[]) {
          const result = await client.query(text, params);
          return { rows: result.rows as R[] };
        },
        transaction() {
          throw new Error("Transaksi bersarang tidak didukung.");
        },
      };
      try {
        await client.query("begin");
        const value = await fn(tx);
        await client.query("commit");
        return value;
      } catch (error) {
        await client.query("rollback").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

type DbCache = { ready?: Promise<Db> };
const globalCache = globalThis as typeof globalThis & { __ngariungDb?: DbCache };

/** Pool bersama per proses; migrasi dijalankan sekali sebelum dipakai. */
export function getDb(): Promise<Db> {
  const cache = (globalCache.__ngariungDb ??= {});
  if (!cache.ready) {
    const url = resolveDatabaseUrl(process.env);
    if (!url) return Promise.reject(new DbNotConfiguredError());
    const pool = new pg.Pool(poolConfig(url));
    pool.on("error", (error) => console.error("[db] koneksi idle bermasalah:", error));
    const db = pgDb(pool);
    cache.ready = migrate(db).then(
      () => db,
      (error: unknown) => {
        cache.ready = undefined;
        void pool.end().catch(() => undefined);
        throw error;
      },
    );
  }
  return cache.ready;
}
