/**
 * Akses database minimal yang dipakai semua layanan server. Produksi memakai
 * node-postgres (lihat pool.ts); tes memakai PGlite dengan bentuk yang sama.
 */
export interface Db {
  query<R = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: R[] }>;
  /** Jalankan `fn` dalam satu transaksi; error apa pun membatalkan semuanya. */
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
}

type Migration = { version: number; statements: readonly string[] };

/** Satu statement per string: PGlite tidak menerima beberapa statement sekaligus. */
const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    statements: [
      `create table users (
        id uuid primary key default gen_random_uuid(),
        email text not null unique,
        username text not null unique,
        emoji text not null,
        color text not null,
        avatar text,
        avatar_version int not null default 0,
        pin_hash text not null,
        failed_logins int not null default 0,
        locked_until timestamptz,
        streak_current int not null default 0,
        streak_longest int not null default 0,
        streak_freezes int not null default 2,
        streak_freeze_month text,
        streak_last_date date,
        created_at timestamptz not null default now()
      )`,
      `create table sessions (
        token_hash text primary key,
        user_id uuid not null references users (id) on delete cascade,
        user_agent text,
        created_at timestamptz not null default now()
      )`,
      `create index sessions_user_idx on sessions (user_id)`,
      `create table check_ins (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references users (id) on delete cascade,
        local_date date not null,
        at timestamptz not null,
        streak int not null,
        distance_m real not null,
        accuracy_m real not null,
        unique (user_id, local_date)
      )`,
      `create index check_ins_date_idx on check_ins (local_date, at desc)`,
      `create table push_subscriptions (
        endpoint text primary key,
        user_id uuid not null references users (id) on delete cascade,
        p256dh text not null,
        auth text not null,
        created_at timestamptz not null default now()
      )`,
      `create index push_subscriptions_user_idx on push_subscriptions (user_id)`,
      `create table battles (
        id uuid primary key default gen_random_uuid(),
        recorded_by uuid not null references users (id) on delete cascade,
        local_date date not null,
        game text not null check (game in ('ttt', 'guess')),
        player_a text not null,
        player_b text not null,
        winner text not null,
        at timestamptz not null
      )`,
      `create table daily_results (
        user_id uuid not null references users (id) on delete cascade,
        local_date date not null,
        game text not null check (game in ('kata', 'teka')),
        solved boolean not null,
        score int not null,
        at timestamptz not null,
        primary key (user_id, local_date, game)
      )`,
      `create table app_config (
        key text primary key,
        value text not null
      )`,
    ],
  },
];

/** Kunci advisory lock agar dua instance tidak memigrasi bersamaan. */
const MIGRATION_LOCK = 7262781;

export async function migrate(db: Db): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.query(`select pg_advisory_xact_lock(${MIGRATION_LOCK})`);
    await tx.query(
      `create table if not exists schema_migrations (
        version int primary key,
        applied_at timestamptz not null default now()
      )`,
    );
    const { rows } = await tx.query<{ version: number }>("select version from schema_migrations");
    const applied = new Set(rows.map((row) => Number(row.version)));
    for (const migration of MIGRATIONS) {
      if (applied.has(migration.version)) continue;
      for (const statement of migration.statements) await tx.query(statement);
      await tx.query("insert into schema_migrations (version) values ($1)", [migration.version]);
    }
  });
}
