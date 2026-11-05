# Backend bersama Ngariung — rancangan

Tanggal: 2026-11-05 · Status: disetujui pemilik proyek (Nnaely) di chat

## Masalah

Semua data Ngariung (akun, absen, streak, hasil game) tersimpan di `localStorage`
masing-masing perangkat. Akibatnya absen seseorang tidak pernah sampai ke pengguna
lain: tidak ada notifikasi, feed hanya berisi diri sendiri, dan papan peringkat
tidak memuat teman.

## Tujuan

1. Absen, feed hari ini, papan peringkat, rank battle, dan rank harian dibagi
   antar semua pengguna lewat satu database.
2. Saat seseorang absen, teman yang menyalakan notifikasi dan belum absen hari
   itu menerima push notification sungguhan.
3. Akun tidak bisa diambil alih hanya dengan mengetik email orang lain.
4. Pemasangan cukup lewat dashboard Vercel: tidak perlu Vercel CLI dan tidak
   perlu menjalankan SQL manual.

Di luar cakupan: verifikasi email, validasi GPS yang kebal spoofing, realtime
berbasis websocket, impor streak lokal lama.

## Arsitektur

```
Browser/PWA ──fetch──> Next.js Route Handlers (/api/*, Node runtime, region sin1)
     ▲                         │  pg (node-postgres)
     │ Web Push                ▼
Service worker <── web-push ── Postgres (Neon, region Singapura)
```

- **Database:** Postgres Neon dari Vercel Marketplace (tab Storage proyek). Vercel
  mengisi `DATABASE_URL` otomatis. Kode juga menerima `POSTGRES_URL` dan nama
  variabel dengan prefiks (`*_DATABASE_URL`, `*_POSTGRES_URL`).
- **Driver:** `pg` dengan pool kecil yang disimpan di `globalThis`. SSL diverifikasi
  untuk host jarak jauh; host lokal tanpa SSL.
- **Migrasi:** dijalankan otomatis saat database pertama kali dipakai, dalam satu
  transaksi dengan `pg_advisory_xact_lock`, dicatat di tabel `schema_migrations`.
- **Region fungsi:** `vercel.json` → `"regions": ["sin1"]` (Hobby boleh satu region),
  supaya dekat dengan database dan pengguna di Bandung.

## Model data

| Tabel | Isi utama |
|---|---|
| `users` | email unik, username unik, emoji, warna, foto (data URL) + versi, hash PIN, penghitung gagal login, state streak (`current`, `longest`, `freezes`, `freeze_month`, `last_date`) |
| `sessions` | hash SHA-256 token sesi, `user_id`, waktu dibuat/terakhir dipakai |
| `check_ins` | `user_id`, `local_date` (WIB), `at`, streak saat absen, jarak, akurasi; unik per (`user_id`, `local_date`) |
| `push_subscriptions` | endpoint (PK), `user_id`, kunci `p256dh` dan `auth` |
| `battles` | pencatat, tanggal, game, nama pemain A/B, nama pemenang |
| `daily_results` | `user_id`, tanggal, game (`kata`/`teka`), solved, skor; unik per hari per game |
| `app_config` | pasangan kunci VAPID yang dibuat otomatis |

Tanggal lokal disimpan sebagai `date` dan selalu dibaca dengan `to_char(..., 'YYYY-MM-DD')`.

## Akun dan sesi

- Daftar: email `@ikamasu.ac.id` + username + avatar + **PIN 6 digit**.
- Masuk di perangkat lain: email + PIN.
- PIN di-hash dengan `scrypt` (salt acak, `timingSafeEqual`). Setelah 5 kali salah,
  akun dikunci 15 menit.
- Sesi: token acak 32 byte di cookie `httpOnly`, `SameSite=Lax`, `Secure` di produksi,
  umur 400 hari. Database hanya menyimpan hash token.
- Semua endpoint yang mengubah data hanya menerima JSON dan menolak `Origin` asing.
- Tautan demo `?as=`, `?seed=1`, `?demo=in/out`, `?lat/lng` hanya aktif saat
  development. Di produksi tidak ada jalan pintas absen.

## Endpoint

| Method & path | Fungsi |
|---|---|
| `POST /api/auth/check-email` | apakah email sudah terdaftar |
| `POST /api/auth/register` | buat akun + sesi |
| `POST /api/auth/login` | email + PIN → sesi |
| `POST /api/auth/logout` | hapus sesi |
| `GET /api/state` | snapshot: saya, absen hari ini, peringkat, papan game, hasil harian saya |
| `POST /api/check-in` | absen; balas hasil streak + jumlah teman yang dikabari |
| `PATCH /api/profile` | ganti username, emoji/warna, foto |
| `GET /api/avatar/[id]` | gambar avatar (cache panjang, URL berversi) |
| `GET /api/push/key` | kunci publik VAPID |
| `POST /api/push/subscribe` · `POST /api/push/unsubscribe` | simpan/hapus langganan push |
| `POST /api/push/test` | kirim contoh push ke perangkat sendiri |
| `POST /api/games/battle` · `POST /api/games/daily` | catat hasil game |

Error dikembalikan sebagai `{ error: KODE, message: "teks Indonesia" }`.

## Aturan bisnis di server

- **Absen:** jarak ke titik Pancong ≤ 200 m dan akurasi ≤ 100 m (dari koordinat
  yang dikirim perangkat), satu kali per tanggal WIB. Streak dihitung dengan
  `applyCheckIn` yang sama dengan sekarang, di dalam transaksi; absen ganda ditolak
  oleh constraint unik.
- **Streak di peringkat:** streak dianggap masih hidup kalau absen terakhir hari ini,
  kemarin, atau dua hari lalu dengan sisa freeze bulan berjalan; selain itu tampil 0.
- **7 hari:** jumlah tanggal berbeda yang ada absennya dalam 7 hari terakhir.
- **Notifikasi:** penerima = semua langganan push milik pengguna lain yang belum absen
  hari itu. Tidak dikirim pukul 00.00–06.00 WIB. Tag notifikasi per pengirim per hari.
  Pengiriman berjalan setelah respons (`after()`), langganan yang kedaluwarsa (404/410)
  dihapus.
- **Kunci VAPID:** dari env (`VAPID_PUBLIC_KEY`/`NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
  `VAPID_PRIVATE_KEY`) bila ada; kalau tidak, dibuat sekali dan disimpan di `app_config`.

## Klien

- `lib/store.tsx` menjadi store yang disinkronkan dengan server, bentuk `state`
  dipertahankan supaya perubahan di halaman minimal.
- Snapshot terakhir disimpan di `localStorage` untuk tampilan cepat/offline.
- Polling `/api/state` setiap 30 detik hanya saat halaman terlihat dan ada interaksi
  dalam 5 menit terakhir; segarkan juga saat fokus kembali dan setelah setiap aksi.
  Ini menjaga pemakaian Neon (100 CU-jam/bulan, tidur setelah 5 menit idle).
- Toast di dalam aplikasi saat ada teman baru absen.
- Service worker tidak lagi meng-cache `/api/*`.
- Profil lama di `localStorage` (`ngariung.v1`) dipakai untuk mengisi form daftar.

## Penanganan error

- Database belum terpasang → `503 DB_NOT_CONFIGURED`; aplikasi menampilkan pesan
  "Server belum siap" alih-alih rusak.
- Offline → tampilkan snapshot terakhir dan tandai offline; aksi menampilkan pesan
  koneksi.
- Sesi tidak valid → `401`, store menghapus cache dan kembali ke halaman masuk.

## Pengujian

- Unit test (`node --test`): PIN, aturan streak & peringkat, pemilihan penerima notifikasi.
- Tes layanan dengan PGlite (Postgres sungguhan di proses yang sama): daftar, masuk,
  kunci akun, absen lintas hari, absen ganda, peringkat, langganan push, game.
- Uji lokal: `next dev` + Postgres lokal (PGlite socket), dua akun di dua sesi browser,
  termasuk endpoint push palsu untuk memastikan server benar-benar mengirim push.
- `pnpm typecheck` dan `pnpm build` harus lulus. Setelah deploy: cek produksi.

## Pemasangan

1. Buat database Neon (gratis, region Singapura) dari tab Storage proyek `ngariung`
   di Vercel dan sambungkan ke semua environment.
2. Push ke GitHub → Vercel men-deploy otomatis.
