# Backend Bersama Ngariung — Rencana Implementasi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Absen, feed, peringkat, dan hasil game dibagi antar semua pengguna lewat Postgres, dan teman menerima push notification saat ada yang absen.

**Architecture:** Route Handler Next.js (`app/api/*`, runtime Node, region `sin1`) memanggil modul layanan murni di `lib/server/*.ts` yang menerima objek `Db`. Produksi memakai `pg` ke Neon; tes memakai PGlite (Postgres sungguhan di dalam proses). Klien memakai store yang menyinkronkan snapshot dari `GET /api/state`.

**Tech Stack:** Next.js 15.5, React 19, TypeScript 5, `pg` 8, `web-push` 3, `@electric-sql/pglite` (+ `-socket`) untuk tes/dev, `node:test` (Node 24 type stripping), pnpm 11.25.0 via corepack.

**Spec:** `docs/superpowers/specs/2026-11-05-shared-backend-design.md`

## Global Constraints

- Perintah pnpm: `corepack pnpm@11.25.0 <cmd>` (lockfile harus ikut diperbarui).
- Domain email: `ikamasu.ac.id`. Username: `^[a-z0-9](?:[a-z0-9._]{1,18})[a-z0-9]$`, dicadangkan: `admin, ngariung, polban, ikamasu, pancong, root, support`.
- PIN: tepat 6 digit angka; hash `scrypt`; 5 kali salah berturut-turut → terkunci 15 menit.
- Absen: jarak ≤ 200 m dan akurasi ≤ 100 m (inklusif), satu kali per tanggal WIB (Asia/Jakarta). Streak = `applyCheckIn` di `lib/streak.ts`.
- Notifikasi: hanya ke pengguna lain yang belum absen hari itu, tidak dikirim saat jam WIB < 6, teks dari `broadcastTitle`/`broadcastBody`.
- Cookie sesi `ngariung_session`: httpOnly, SameSite=Lax, Secure saat `NODE_ENV=production`, maxAge 400 hari. Database hanya menyimpan SHA-256 token.
- `lib/server/*`, `lib/streak.ts`, `lib/format.ts`, `lib/geo.ts`, `lib/identity.ts`, `lib/leaderboard.ts`: impor relatif berakhiran `.ts`, tanpa alias `@/` (supaya `node --test` bisa mengimpor langsung).
- SQL: tanggal dibaca `to_char(col, 'YYYY-MM-DD')`, agregat di-cast `::int`, waktu dikirim sebagai ISO string dari parameter `now`.
- Error API: `{ error: KODE, message: "teks Indonesia" }`; semua respons API `Cache-Control: no-store` (kecuali avatar).
- Polling klien 30 detik, hanya saat halaman terlihat dan ada interaksi ≤ 5 menit terakhir.
- Parameter demo (`?demo=`, `?lat/lng`, `?seed=1`, `?as=`) hanya aktif saat `NODE_ENV !== "production"`.
- Commit sebagai Nnaely (git config lokal), pesan diakhiri `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Dua tap ABSEN cepat atau dua HP dengan akun sama → hanya satu absen tercatat, yang kedua `ALREADY_CHECKED_IN` (tes di Task 5).
2. Pergantian hari dihitung menurut WIB: 23:30 WIB lalu 00:10 WIB = dua hari berturut-turut (Task 5).
3. Email/username dengan huruf besar atau spasi di tepi dianggap sama dengan versi kecilnya (Task 4).
4. Langganan push kedaluwarsa (404/410) dihapus dan tidak menggagalkan absen; error push lain diabaikan (Task 6).
5. Database belum disambungkan → `503 DB_NOT_CONFIGURED` dan layar "Server belum siap", bukan halaman rusak (Task 3, Task 7, Task 9).

---

## File Structure

| File | Tanggung jawab |
|---|---|
| `lib/format.ts` | + `dateWIB`, `hourWIB` |
| `lib/streak.ts` | + `visibleStreak` |
| `lib/identity.ts` | aturan username, PIN, daftar emoji/warna avatar |
| `lib/leaderboard.ts` | urutkan baris peringkat dari server |
| `lib/api-types.ts` | tipe bersama klien–server |
| `lib/server/sql.ts` | interface `Db`, migrasi |
| `lib/server/pool.ts` | koneksi `pg`, resolusi env |
| `lib/server/errors.ts` | `ServiceError` |
| `lib/server/pin.ts` | hash/verifikasi PIN |
| `lib/server/accounts.ts` | daftar, masuk, sesi, profil, avatar |
| `lib/server/checkins.ts` | absen + streak |
| `lib/server/snapshot.ts` | snapshot `/api/state` |
| `lib/server/games.ts` | battle & game harian |
| `lib/server/push.ts` | VAPID, langganan, penerima, pengiriman |
| `lib/server/http.ts` | pembungkus Route Handler, cookie, origin |
| `app/api/**/route.ts` | 14 endpoint |
| `lib/api.ts`, `lib/push-client.ts`, `lib/sync.ts` | klien: fetch, push, helper polling |
| `lib/store.tsx` | store tersinkron server |
| `components/Toaster.tsx` | toast "X baru absen" |
| `scripts/helpers/test-db.mjs` | PGlite untuk tes |
| `scripts/dev-db.mjs` | Postgres lokal (PGlite socket) |
| `scripts/smoke-api.mjs` | uji asap HTTP ke server berjalan |

---

### Task 1: Fondasi proyek

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.mjs`, `.gitignore`, `.env.example`
- Create: `vercel.json`, `scripts/dev-db.mjs`
- Remove from index: `shots/profile/**`

**Interfaces:**
- Produces: script `db:dev` (Postgres lokal di `127.0.0.1:54329`, data di `.data/pglite`), `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/postgres`.

- [ ] **Step 1:** `corepack pnpm@11.25.0 add pg web-push` dan `corepack pnpm@11.25.0 add -D @types/pg @types/web-push @electric-sql/pglite @electric-sql/pglite-socket`.
- [ ] **Step 2:** `tsconfig.json` + `"allowImportingTsExtensions": true`; `next.config.mjs` + `serverExternalPackages: ["pg", "web-push"]`; `vercel.json` = `{ "regions": ["sin1"] }`.
- [ ] **Step 3:** `.gitignore` + `.data/` dan `shots/profile/`; `git rm -r --cached --quiet shots/profile`.
- [ ] **Step 4:** `.env.example` diganti: `DATABASE_URL=` (diisi otomatis oleh Vercel), `VAPID_PUBLIC_KEY=`, `VAPID_PRIVATE_KEY=`, `VAPID_SUBJECT=` (opsional; kosong = dibuat otomatis).
- [ ] **Step 5:** `scripts/dev-db.mjs`: `new PGlite(".data/pglite")` + `PGLiteSocketServer({ db, port: 54329, host: "127.0.0.1" })`, cetak `DATABASE_URL`. Tambah script `"db:dev": "node scripts/dev-db.mjs"`.
- [ ] **Step 6:** Jalankan `corepack pnpm@11.25.0 test` dan `corepack pnpm@11.25.0 typecheck`. Expected: semua PASS, tanpa error.
- [ ] **Step 7:** Commit `chore: add database and push tooling, stop tracking browser profile`.

### Task 2: Logika bersama (murni)

**Files:**
- Modify: `lib/format.ts`, `lib/streak.ts`, `lib/identity.ts`, `lib/leaderboard.ts`
- Create: `lib/api-types.ts`
- Test: `scripts/streak.test.mjs` (baru), `scripts/leaderboard.test.mjs` (ditulis ulang), `scripts/identity.test.mjs` (ditambah)

**Interfaces:**
- Produces:
  - `dateWIB(d: Date): string` (YYYY-MM-DD), `hourWIB(d: Date): number`; `todayWIB()` memakai `dateWIB(new Date())`.
  - `visibleStreak(s: StreakState, today: string): number` — `s.current` bila `lastDate` = hari ini/kemarin, atau 2 hari lalu dan `effectiveFreezes(s, today) > 0`; selain itu `0`.
  - `identity.ts`: `USERNAME_RE`, `RESERVED_USERNAMES`, `normalizeUsername(v: string): string` (trim + lowercase), `usernameError(v: string): string | null` (pesan sama seperti halaman login sekarang), `isValidPin(v: string): boolean`, `AVATAR_EMOJIS` (10 emoji yang sekarang), `AVATAR_COLORS` (6 warna), `avatarColorFor(emoji: string): string` (`AVATAR_COLORS[index % 6]`).
  - `leaderboard.ts`: `LeaderboardRow = { username; emoji; color; avatarUrl?; streak; week }`, `LeaderboardEntry = LeaderboardRow & { isMe: boolean }`, `sortLeaderboard(rows, me: string, sortBy: "streak" | "week"): LeaderboardEntry[]` (tab week: week desc dulu; lalu streak desc; lalu username asc; input tidak dimutasi).
  - `api-types.ts`: `MeInfo = { user: User; streak: StreakState; totalCheckIns: number }`, `BoardRow = { name: string; value: number }`, `AppSnapshot = { today: string; me: MeInfo; checkIns: CheckIn[]; leaderboard: LeaderboardRow[]; battleBoard: BoardRow[]; dailyBoard: BoardRow[]; myDailies: DailyRecord[] }`, `CheckInOutcome = { streak: number; event: "INCREMENT" | "FREEZE" | "RESET"; milestone?: number; freezeUsed: boolean; date: string }`, `ApiErrorBody = { error: string; message: string }`.

- [ ] **Step 1: Tes gagal** — `streak.test.mjs`: `visibleStreak` dengan today `2026-11-05`: lastDate `2026-11-05`/`2026-11-04` → current; `2026-11-03` + freezes 1 bulan `2026-11` → current; `2026-11-03` + freezes 0 bulan `2026-11` → 0; `2026-11-03` + freezes 0 bulan `2026-10` → current (jatah baru); `2026-11-02` → 0; `lastDate: null` → 0. `dateWIB(new Date("2026-11-05T17:10:00Z")) === "2026-11-06"`, `hourWIB(new Date("2026-11-05T22:59:00Z")) === 5`.
- [ ] **Step 2: Tes gagal** — `leaderboard.test.mjs` ditulis ulang untuk `sortLeaderboard` (urutan per tab, `isMe`, tidak memutasi input); `identity.test.mjs` + `usernameError("admin")` ≠ null, `usernameError("dinda")` === null, `isValidPin` (`"123456"` true; `"12345"`, `"1234567"`, `"12a456"` false), `avatarColorFor("🔥") === "#FF5A1F"`.
- [ ] **Step 3:** Jalankan `corepack pnpm@11.25.0 test`. Expected: FAIL (fungsi belum ada).
- [ ] **Step 4:** Implementasi sesuai Interfaces.
- [ ] **Step 5:** `corepack pnpm@11.25.0 test` PASS. (Typecheck boleh gagal di `app/leaderboard/page.tsx` sampai Task 9.)
- [ ] **Step 6:** Commit `feat: shared streak, identity and leaderboard helpers`.

### Task 3: Lapisan database

**Files:**
- Create: `lib/server/sql.ts`, `lib/server/pool.ts`, `scripts/helpers/test-db.mjs`
- Test: `scripts/db.test.mjs`

**Interfaces:**
- Produces:
  - `interface Db { query<R = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: R[] }>; transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> }`
  - `migrate(db: Db): Promise<void>` — tabel `schema_migrations(version int primary key, applied_at timestamptz default now())`, semua migrasi dalam satu transaksi dengan `select pg_advisory_xact_lock(7262781)`.
  - `resolveDatabaseUrl(env): string | null` — urutan `DATABASE_URL`, `POSTGRES_URL`, lalu kunci pertama yang cocok `/_(DATABASE|POSTGRES)_URL$/`; abaikan nilai kosong.
  - `class DbNotConfiguredError extends Error`; `getDb(): Promise<Db>` — `pg.Pool` (max 5) di `globalThis`, SSL off untuk `localhost`/`127.0.0.1`, selain itu `{ rejectUnauthorized: true }` dengan parameter `sslmode`/`channel_binding` dibuang dari URL; `migrate` sekali per proses.
  - `scripts/helpers/test-db.mjs`: `createTestDb(): Promise<{ db: Db; close(): Promise<void> }>` (PGlite in-memory + `migrate`).
- Skema migrasi 1:

```sql
create table users (id uuid primary key default gen_random_uuid(), email text not null unique,
  username text not null unique, emoji text not null, color text not null, avatar text,
  avatar_version int not null default 0, pin_hash text not null, failed_logins int not null default 0,
  locked_until timestamptz, streak_current int not null default 0, streak_longest int not null default 0,
  streak_freezes int not null default 2, streak_freeze_month text, streak_last_date date,
  created_at timestamptz not null default now());
create table sessions (token_hash text primary key, user_id uuid not null references users(id) on delete cascade,
  user_agent text, created_at timestamptz not null default now());
create table check_ins (id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade,
  local_date date not null, at timestamptz not null, streak int not null, distance_m real not null,
  accuracy_m real not null, unique (user_id, local_date));
create index check_ins_date_idx on check_ins (local_date, at desc);
create table push_subscriptions (endpoint text primary key, user_id uuid not null references users(id) on delete cascade,
  p256dh text not null, auth text not null, created_at timestamptz not null default now());
create table battles (id uuid primary key default gen_random_uuid(), recorded_by uuid not null references users(id) on delete cascade,
  local_date date not null, game text not null check (game in ('ttt','guess')), player_a text not null,
  player_b text not null, winner text not null, at timestamptz not null);
create table daily_results (user_id uuid not null references users(id) on delete cascade, local_date date not null,
  game text not null check (game in ('kata','teka')), solved boolean not null, score int not null,
  at timestamptz not null, primary key (user_id, local_date, game));
create table app_config (key text primary key, value text not null);
```

- [ ] **Step 1: Tes gagal** — `db.test.mjs`: `migrate` dua kali tidak error dan `schema_migrations` berisi 1 baris; `resolveDatabaseUrl({DATABASE_URL:"a",POSTGRES_URL:"b"}) === "a"`, `({POSTGRES_URL:"b"}) === "b"`, `({STORAGE_DATABASE_URL:"c", STORAGE_DATABASE_URL_UNPOOLED:"d"}) === "c"`, `({DATABASE_URL:""}) === null`.
- [ ] **Step 2:** Jalankan tes. Expected: FAIL (modul belum ada).
- [ ] **Step 3:** Implementasi sesuai Interfaces.
- [ ] **Step 4:** Tes PASS.
- [ ] **Step 5:** Commit `feat: postgres access layer with automatic migrations`.

### Task 4: Akun dan sesi

**Files:**
- Create: `lib/server/errors.ts`, `lib/server/pin.ts`, `lib/server/accounts.ts`
- Test: `scripts/pin.test.mjs`, `scripts/accounts.test.mjs`

**Interfaces:**
- Consumes: `Db` (Task 3), helper identity (Task 2).
- Produces:
  - `class ServiceError extends Error { code: string; status: number }`, `fail(code: string, message: string, status: number): never`.
  - `hashPin(pin: string): Promise<string>` (format `scrypt$<salt b64>$<hash b64>`, N=16384, r=8, p=1, 32 byte), `verifyPin(pin: string, stored: string): Promise<boolean>`.
  - `emailExists(db, email): Promise<boolean>`
  - `registerUser(db, { email, username, emoji, pin }): Promise<string>` → userId. Error: `INVALID_EMAIL` 400, `INVALID_USERNAME` 400, `INVALID_AVATAR` 400, `INVALID_PIN` 400, `EMAIL_TAKEN` 409, `USERNAME_TAKEN` 409. Warna = `avatarColorFor(emoji)`.
  - `loginUser(db, email, pin, now: Date): Promise<string>` → userId. `INVALID_CREDENTIALS` 401 (email tak dikenal atau PIN salah ke-1..4), `LOCKED` 429 (salah ke-5 dan selama `locked_until > now`). Berhasil → reset penghitung.
  - `createSession(db, userId, userAgent?: string): Promise<string>` (token base64url 32 byte), `sessionUserId(db, token): Promise<string | null>`, `deleteSession(db, token): Promise<void>`.
  - `updateProfile(db, userId, { username?, emoji?, avatar?: string | null }): Promise<void>` — ganti username juga mengganti nama lama di `battles.player_a/player_b/winner`; ganti emoji mengatur `color`; `avatar` harus `data:image/(jpeg|png|webp);base64,...` ≤ 200 000 karakter (`INVALID_AVATAR`), `null` menghapus foto; setiap perubahan avatar menaikkan `avatar_version`.
  - `getAvatar(db, userId): Promise<{ mime: string; bytes: Buffer } | null>`.

- [ ] **Step 1: Tes gagal** — `pin.test.mjs`: hash PIN sama dua kali berbeda; `verifyPin` benar/salah; string tersimpan rusak → false.
- [ ] **Step 2: Tes gagal** — `accounts.test.mjs`: daftar `" Nama@IKAMASU.AC.ID "` lalu `emailExists("nama@ikamasu.ac.id")` true; email sama → `EMAIL_TAKEN`; username `"Dinda"` tersimpan `"dinda"`, `"dinda"` kedua → `USERNAME_TAKEN`; `gmail.com` → `INVALID_EMAIL`; `"admin"` → `INVALID_USERNAME`; PIN `"12345"` → `INVALID_PIN`; emoji di luar daftar → `INVALID_AVATAR`; login benar → userId; salah 4x → `INVALID_CREDENTIALS`, ke-5 → `LOCKED`, PIN benar +1 menit → `LOCKED`, +16 menit → sukses; sesi: token tidak tersimpan mentah, `sessionUserId` cocok, setelah `deleteSession` → null; rename memperbarui `battles`; rename ke nama terpakai → `USERNAME_TAKEN`; avatar valid → `getAvatar` mime `image/jpeg`; avatar `null` → `getAvatar` null; avatar teks biasa → `INVALID_AVATAR`.
- [ ] **Step 3:** Jalankan tes. Expected: FAIL.
- [ ] **Step 4:** Implementasi.
- [ ] **Step 5:** Tes PASS.
- [ ] **Step 6:** Commit `feat: accounts with PIN login and sessions`.

### Task 5: Absen, snapshot, game

**Files:**
- Create: `lib/server/checkins.ts`, `lib/server/snapshot.ts`, `lib/server/games.ts`
- Test: `scripts/checkins.test.mjs`, `scripts/snapshot.test.mjs`

**Interfaces:**
- Consumes: `Db`, `ServiceError`, `registerUser` (fixture tes), `applyCheckIn`, `visibleStreak`, `distanceToPancong`, `RADIUS_M`, `ACCURACY_MAX_M`, `dateWIB`.
- Produces:
  - `recordCheckIn(db, userId, { lat, lng, accuracy }, now: Date): Promise<CheckInOutcome>` — transaksi: `select ... for update` baris user → `applyCheckIn` → insert `check_ins` → update kolom streak. Error: `BAD_REQUEST` 400 (angka tidak finite), `OUT_OF_RANGE` 422, `LOW_ACCURACY` 422, `ALREADY_CHECKED_IN` 409.
  - `loadSnapshot(db, userId, now: Date): Promise<AppSnapshot>` — `UNAUTHORIZED` 401 kalau user hilang. `avatarUrl` = `/api/avatar/<id>?v=<avatar_version>` hanya bila ada foto. Leaderboard memuat semua user (`streak` = `visibleStreak`, `week` = jumlah tanggal berbeda di `[today-6, today]`). `battleBoard` = 8 teratas jumlah menang (nama asc saat seri); `dailyBoard` = 8 teratas jumlah skor `solved`; `myDailies` = milik sendiri hari ini.
  - `recordBattle(db, userId, { game: "ttt" | "guess"; playerB: string; winner: string }, now)` — `BATTLE_LOCKED` 403 bila belum absen hari ini; `BAD_REQUEST` bila `playerB` kosong/>20 karakter/sama dengan diri sendiri, atau `winner` bukan diri sendiri/`playerB`.
  - `recordDaily(db, userId, { game: "kata" | "teka"; solved: boolean }, now)` — skor `solved ? 1 : 0`; `ALREADY_PLAYED` 409.

- [ ] **Step 1: Tes gagal** — `checkins.test.mjs` (titik dalam = `PANCONG`, luar = `PANCONG.lat + 0.00225`): hari 1 → streak 1 `RESET`; hari WIB berikutnya → 2 `INCREMENT`; lompat satu hari → `FREEZE`, sisa freeze 1; dua kali sehari → `ALREADY_CHECKED_IN` dan hanya 1 baris; luar → `OUT_OF_RANGE`; akurasi 150 → `LOW_ACCURACY`; akurasi tepat 100 diterima; `2026-11-05T16:30:00Z` lalu `2026-11-05T17:10:00Z` → kedua `INCREMENT` streak 2 tanggal `2026-11-06`.
- [ ] **Step 2: Tes gagal** — `snapshot.test.mjs`: A absen → snapshot B memuat A di `checkIns` dan `leaderboard` (A 1, B 0); `week` A = 2 setelah absen di 2 tanggal; absen terakhir 3 hari lalu → 0 di leaderboard tetapi `me.streak.current` tetap nilai tersimpan; `checkIns` terbaru dulu; battle sebelum absen → `BATTLE_LOCKED`, sesudah absen masuk `battleBoard`; `recordDaily` dua kali → `ALREADY_PLAYED`; `myDailies` hanya milik sendiri; `totalCheckIns` benar.
- [ ] **Step 3:** Jalankan tes. Expected: FAIL.
- [ ] **Step 4:** Implementasi.
- [ ] **Step 5:** Tes PASS.
- [ ] **Step 6:** Commit `feat: server-side check-ins, snapshot and game results`.

### Task 6: Push notification

**Files:**
- Create: `lib/server/push.ts`
- Test: `scripts/push.test.mjs`

**Interfaces:**
- Consumes: `Db`, `ServiceError`, `broadcastTitle/Body`, `hourWIB`.
- Produces:
  - `getVapidKeys(db): Promise<{ publicKey: string; privateKey: string }>` — env (`VAPID_PUBLIC_KEY` atau `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY`) bila lengkap; kalau tidak, `app_config` (`vapid_public`, `vapid_private`) dibuat sekali dengan `webpush.generateVAPIDKeys()` (`on conflict do nothing` lalu baca ulang).
  - `vapidSubject(): string` — `VAPID_SUBJECT` → `https://${VERCEL_PROJECT_PRODUCTION_URL}` → `"mailto:admin@ikamasu.ac.id"`.
  - `saveSubscription(db, userId, { endpoint, keys: { p256dh, auth } })` — endpoint harus `https:` ≤ 1000 karakter, kunci tidak kosong (`BAD_REQUEST`); upsert per endpoint (pindah pemilik bila perlu). `removeSubscription(db, userId, endpoint)`.
  - `isQuietHour(now: Date): boolean` — `hourWIB(now) < 6`.
  - `checkInRecipients(db, actorId, today): Promise<StoredSubscription[]>`; `StoredSubscription = { endpoint; keys: { p256dh; auth }; userId }`.
  - `type PushPayload = { title; body; url; tag }`; `checkInPayload(username, date): PushPayload` (url `/feed`, tag `absen-<username>-<date>`).
  - `type PushSender = (sub, payload: string, options: object) => Promise<unknown>`; `deliver(db, subs, payload, sender = webpush.sendNotification): Promise<{ sent: number; removed: number }>` — error ber-`statusCode` 404/410 → hapus langganan; error lain dihitung gagal, tidak dilempar. Opsi: `vapidDetails`, `TTL: 4 * 3600`.
  - `subscriptionsOf(db, userId): Promise<StoredSubscription[]>`.

- [ ] **Step 1: Tes gagal** — kunci VAPID stabil antar panggilan; env mengalahkan DB; penerima: A pelaku, B berlangganan belum absen, C berlangganan sudah absen → hanya B; `isQuietHour` (`22:59Z` true, `23:00Z` false, `17:00Z` true); `deliver` dengan stub: sukses → `sent 1`; lempar `{ statusCode: 410 }` → `removed 1` dan baris hilang; lempar `{ statusCode: 500 }` → tidak melempar, baris tetap; endpoint sama disimpan dua user → satu baris milik user terakhir; `checkInPayload` memakai teks broadcast.
- [ ] **Step 2:** Jalankan tes. Expected: FAIL.
- [ ] **Step 3:** Implementasi.
- [ ] **Step 4:** Tes PASS.
- [ ] **Step 5:** Commit `feat: web push delivery with automatic VAPID keys`.

### Task 7: Endpoint API

**Files:**
- Create: `lib/server/http.ts`, `app/api/auth/{check-email,register,login,logout}/route.ts`, `app/api/state/route.ts`, `app/api/check-in/route.ts`, `app/api/profile/route.ts`, `app/api/avatar/[id]/route.ts`, `app/api/push/{key,subscribe,unsubscribe,test}/route.ts`, `app/api/games/{battle,daily}/route.ts`, `scripts/smoke-api.mjs`

**Interfaces:**
- Consumes: semua layanan Task 3–6, `getDb`.
- Produces:
  - `http.ts`: `SESSION_COOKIE = "ngariung_session"`; `route(fn: (ctx: { req: NextRequest; db: Db; params: Record<string, string> }) => Promise<Response>)` memetakan `ServiceError` → status + body, `DbNotConfiguredError` → 503 `DB_NOT_CONFIGURED` "Server belum siap. Database belum disambungkan.", lainnya → 500 `SERVER_ERROR` (di-log); `readJson<T>(req)` (`BAD_REQUEST` bila bukan JSON), `assertSameOrigin(req)` (`FORBIDDEN` 403 bila header `Origin` ada dan host berbeda), `requireUserId(req, db)` (`UNAUTHORIZED` 401), `ok(data, init?)` (+ `no-store`), `setSessionCookie(res, token)`, `clearSessionCookie(res)`.
  - Semua route: `export const dynamic = "force-dynamic"; export const runtime = "nodejs";`.
  - Respons: `check-email` → `{ exists }`; `register` (201) / `login` / `state` / `profile` / `games/*` → `{ snapshot }`; `check-in` → `{ outcome, notified, snapshot }` dengan pengiriman push lewat `after()` (dilewati saat `isQuietHour`); `push/key` → `{ publicKey }`; `push/subscribe|unsubscribe` → `{ ok: true }`; `push/test` → `{ sent }` atau `NO_SUBSCRIPTION` 404; `logout` → `{ ok: true }`; `avatar/[id]` → bytes, `Cache-Control: public, max-age=31536000, immutable`, 404 bila tidak ada.
  - `scripts/smoke-api.mjs [baseUrl]`: daftar A dan B (email acak), A absen di `PANCONG`, snapshot B memuat A, absen kedua A → 409, rename A, battle + daily A, logout A → `GET /api/state` 401. Cetak `SMOKE OK`.

- [ ] **Step 1:** Implementasi `http.ts` dan semua route.
- [ ] **Step 2:** `corepack pnpm@11.25.0 db:dev` (latar), `DATABASE_URL=... corepack pnpm@11.25.0 dev` (latar), lalu `node scripts/smoke-api.mjs http://localhost:3000`. Expected: `SMOKE OK`.
- [ ] **Step 3:** Tanpa `DATABASE_URL`, `GET /api/state` → 503 `DB_NOT_CONFIGURED`.
- [ ] **Step 4:** Commit `feat: API routes for auth, check-ins, profile, push and games`.

### Task 8: Lapisan data klien

**Files:**
- Create: `lib/api.ts`, `lib/push-client.ts`, `lib/sync.ts`, `components/Toaster.tsx`
- Modify: `public/sw.js`
- Test: `scripts/sync.test.mjs`

**Interfaces:**
- Produces:
  - `class ApiError extends Error { code: string; status: number }`; `apiFetch<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T>` — kegagalan jaringan → `ApiError("NETWORK", "Tidak ada koneksi. Coba lagi ya.", 0)`.
  - `lib/sync.ts`: `POLL_MS = 30_000`, `IDLE_MS = 300_000`, `newFriendCheckIns(prev: CheckIn[], next: CheckIn[], me: string): CheckIn[]`, `shouldPoll({ visible, now, lastInteraction }): boolean`.
  - `lib/push-client.ts`: `pushSupport(): "supported" | "needs-install" | "unsupported"` (iOS tanpa standalone → `needs-install`), `getPushSubscription()`, `enablePush(): Promise<void>`, `disablePush(): Promise<void>`, `sendTestPush(): Promise<number>`.
  - `Toaster({ toasts, onDismiss })` dengan `toasts: { id: string; title: string; body: string }[]`, hilang sendiri 5 detik, `role="status"`.
  - `sw.js`: tidak meng-cache `/api/*`; `pushsubscriptionchange` → subscribe ulang dan `POST /api/push/subscribe`.

- [ ] **Step 1: Tes gagal** — `sync.test.mjs`: `newFriendCheckIns` hanya id baru bukan milik sendiri; `shouldPoll` false saat tersembunyi atau idle > 5 menit, true saat terlihat dan aktif.
- [ ] **Step 2:** Jalankan tes. Expected: FAIL.
- [ ] **Step 3:** Implementasi.
- [ ] **Step 4:** Tes PASS.
- [ ] **Step 5:** Commit `feat: client API, push and sync helpers`.

### Task 9: Store tersinkron dan halaman

**Files:**
- Modify: `lib/store.tsx` (tulis ulang), `components/Guard.tsx`, `components/AppShell.tsx`, `app/login/page.tsx`, `app/page.tsx`, `app/feed/page.tsx`, `app/leaderboard/page.tsx`, `app/main/page.tsx`, `app/main/kata/page.tsx`, `app/main/teka/page.tsx`, `app/profile/page.tsx`, `lib/types.ts`, `lib/seed.ts`

**Interfaces:**
- Consumes: Task 2 & 8.
- Produces `useStore()` → `{ state, ready, status, toasts, dismissToast, refresh, register, login, logout, checkIn, updateProfile, recordBattle, recordDaily }`:
  - `State = { today; user: User | null; streak: StreakState; totalCheckIns; checkIns; leaderboard; battleBoard; dailyBoard; dailies }`; `status: "loading" | "online" | "offline" | "unavailable"`.
  - Cache `localStorage["ngariung.cache.v2"]`; `readLegacyProfile(): { email?: string; username?: string; emoji?: string } | null` dari `ngariung.v1`, dihapus setelah daftar/masuk berhasil.
  - `checkIn(input): Promise<{ outcome: CheckInOutcome; notified: number }>`; aksi lain `Promise<void>`; semua melempar `ApiError`.
  - `checkedInToday(state)` dan `todayCheckIns(state)` tetap diekspor.
- Perilaku halaman:
  - Login: email → `check-email` → langkah **PIN** (akun lama) atau **Profil** (username, avatar, PIN + ulangi PIN). Prefill dari profil lama.
  - Guard: tanpa `?as=`; `unavailable` tanpa user → layar "Server belum siap"; belum masuk → `/login`.
  - Home: absen lewat `store.checkIn`, pesan error di bawah tombol, dialog sukses menyebut jumlah teman yang dikabari; teks "tersimpan di perangkat ini" diganti.
  - Leaderboard: `sortLeaderboard(state.leaderboard, user.username, tab)`.
  - Main/Kata/Teka: `recordBattle`/`recordDaily`, papan dari `battleBoard`/`dailyBoard`.
  - Profil: username/emoji/foto lewat `updateProfile`; notifikasi lewat `enablePush/disablePush`, status `needs-install` memberi petunjuk Home Screen; "Kirim contoh notifikasi" → `sendTestPush`; total absen dari `totalCheckIns`; baris "Hapus data perangkat" dihapus; footer `Ngariung v0.3 · tersinkron`.
  - AppShell: `<Toaster>`; polling & toast teman baru di store.

- [ ] **Step 1:** Implementasi store dan halaman.
- [ ] **Step 2:** `corepack pnpm@11.25.0 typecheck`, `corepack pnpm@11.25.0 test`, `corepack pnpm@11.25.0 build`. Expected: semua lulus.
- [ ] **Step 3:** Uji di panel browser: `localhost:3000` (A) dan `127.0.0.1:3000` (B, cookie terpisah) dengan `?demo=in`: daftar A & B, A absen → B melihat A di feed/peringkat dan toast muncul; masuk ulang A dengan PIN; ganti avatar A terlihat di B.
- [ ] **Step 4:** Commit `feat: sync app pages with the shared backend`.

### Task 10: Dokumentasi, deploy, verifikasi

**Files:**
- Modify: `README.md` (cara kerja data, privasi, pengembangan lokal dengan `db:dev`)

- [ ] **Step 1:** Perbarui README, commit `docs: describe shared backend setup`.
- [ ] **Step 2:** Vercel → proyek `ngariung` → Storage → buat Neon (Free, Singapura) → sambungkan ke Production/Preview/Development.
- [ ] **Step 3:** Push `feat/shared-backend` → tunggu deployment preview → cek `GET /api/state` = 401 (bukan 503).
- [ ] **Step 4:** Fast-forward `main` ke `feat/shared-backend`, push → tunggu deployment produksi.
- [ ] **Step 5:** Produksi: `GET https://ngariungstreak.vercel.app/api/state` → 401, `POST /api/auth/check-email` → `{ exists: false }` untuk email acak; halaman login tampil. Laporkan ke pengguna.
