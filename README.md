# Ngariung 🔥

**Absen dulu, baru nongkrong.** Aplikasi absen harian + streak untuk mahasiswa Politeknik Negeri Bandung. Tombol absen cuma hidup kalau kamu benar-benar berada dalam **200 meter** dari Pancong.

Status: **demo PWA yang sudah jalan** (data di browser). Jalur ke produksi (Supabase + push) ada di [`supabase/schema.sql`](supabase/schema.sql) dan roadmap di bawah.

![Home](shots/02-home-crop.png)

---

## Jalankan

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Butuh Node 18.18+ (disarankan 20+).

### Build produksi

```bash
pnpm build
pnpm start
```

### URL demo (tanpa lewat login)

| URL | Efek |
|---|---|
| `/login` | Halaman masuk (validasi domain) |
| `/?as=rizky&demo=in&streak=12` | Langsung masuk, posisi 72 m dari Pancong, streak 12 |
| `/?as=rizky&demo=out&streak=12` | Posisi 2,6 km → tombol terkunci |
| `/?as=rizky&demo=win` | Pratinjau kartu "absen berhasil" |
| `/?as=rizky&lat=-6.8745&lng=107.5756` | Paksa koordinat sendiri (uji geofence) |
| `/?as=rizky&seed=1` | Isi 7 teman contoh (khusus pratinjau) |

Aplikasi **mulai kosong**: tidak ada teman atau streak bawaan. `seed=1` hanya untuk screenshot/presentasi.
`demo=in/out` juga hanya pratinjau. Tanpa parameter itu, aplikasi memakai GPS asli lewat `navigator.geolocation.watchPosition`.

---

## Yang sudah jadi

- **Gerbang domain** `@polban.ac.id` — regex `^[^@\s]+@polban\.ac\.id$`, menolak `@polban.ac.id.evil.com`.
- **Username unik** 3–20 karakter, bisa diganti kapan saja (cek ketersediaan live).
- **Geofence 200 m** dengan Haversine, akurasi GPS ≤ 100 m, tombol punya 9 state (mencari, di luar radius, GPS lemah, siap, mengirim, sukses, sudah absen, izin ditolak, error).
- **Streak** harian ala TikTok/Duolingo: increment, putus, **freeze bulanan** (2 jatah/bulan, reset tanggal 1), milestone 3/7/14/30/50/100.
- **Tampilan gelap hangat**: kartu kaca, satu aksen oranye, tanpa gradasi di background.
- **Absen 1× per hari** (kalender Asia/Jakarta), idempoten.
- **Feed hari ini** + **leaderboard** (streak & 7 hari).
- **Notifikasi**: template persis `"{username} sudah absen hari ini, ayo segera menuju Pancong skrg!"` + service worker `push` handler.
- **PWA**: manifest, ikon maskable, service worker, installable di Android & iOS.

## Yang belum (jalur produksi)

Demo ini menyimpan state di `localStorage` dan mulai tanpa data. Untuk produksi:

1. **Supabase** — import `supabase/schema.sql` (RLS + trigger domain sudah disiapkan).
2. **Google OAuth** — `polban.ac.id` memakai Google Workspace, jadi email kampus sudah terverifikasi Google. Gratis, tanpa kirim OTP.
3. **Validasi server** — pindahkan `lib/geo.ts` & `lib/streak.ts` ke Route Handler; client tidak boleh dipercaya.
4. **Web Push** — `npx web-push generate-vapid-keys`, simpan subscription, fan-out dengan batching 15 menit.
5. **Keep-alive** — cron harian ke `/api/health` supaya Supabase free tidak di-pause.

---

## Struktur

```
app/
  page.tsx            Home: geofence + tombol absen + streak
  login/page.tsx      Gerbang domain + pilih username
  feed/page.tsx       Kehadiran hari ini
  leaderboard/page.tsx
  profile/page.tsx    Statistik, ganti username, avatar
  manifest.ts         Manifest PWA
  globals.css         Token warna, animasi, konfeti
components/           Guard, BottomNav, Avatar, FeedRow, Confetti, Icons
lib/
  geo.ts              Haversine, bearing, konstanta Pancong
  streak.ts           Aturan streak murni + template notifikasi
  store.tsx           State + localStorage (pengganti Supabase)
  seed.ts             7 teman demo
supabase/schema.sql   Skema produksi (RLS, trigger, view)
shots/                Screenshot
```

## Konstanta penting

```ts
PANCONG   = { lat: -6.874474372696532, lng: 107.57563823965597 }
RADIUS_M  = 200
ACCURACY_MAX_M = 100
```

Ubah di [`lib/geo.ts`](lib/geo.ts) — satu sumber kebenaran.

---

## Pasang di HP (PWA)

**Android (Chrome):** buka URL → menu ⋮ → **Install app** / **Tambahkan ke layar utama**.
**iPhone (Safari):** buka URL → tombol **Share** → **Add to Home Screen**.

Syaratnya cuma **HTTPS**. Setelah dipasang, aplikasi terbuka fullscreen tanpa address bar dan tetap bisa dibuka offline (shell di-cache service worker; data tersimpan di perangkat).

### Cara cepat: tunnel sementara (dari laptop ini)

```bash
node scripts/prod-server.cjs          # server di :3101
./cloudflared.exe tunnel --url http://127.0.0.1:3101 --no-autoupdate
```

Cloudflared mencetak URL `https://xxxx.trycloudflare.com` — buka di HP lalu install.
URL ini **sementara**: hidup selama laptop & proses cloudflared menyala. Untuk permanen, pakai Vercel di bawah (3 menit, gratis).

## Deploy permanen gratis (Rp 0)

1. Push repo ke GitHub.
2. Buka [vercel.com/new](https://vercel.com/new) → import repo.
3. Framework terdeteksi otomatis (Next.js). Klik **Deploy**.
4. Buka `https://<project>.vercel.app` di HP → **Install app**.

Tanpa domain kustom, tanpa kartu kredit, tanpa biaya bulanan.

### Keep-alive Supabase (kalau nanti disambungkan)

Supabase free di-pause setelah 7 hari idle. Tambahkan cron GitHub Actions harian yang memanggil `GET /api/health` (lihat PRD bagian 8.5).

## Lisensi

MIT — pakai, ubah, sebarkan.
