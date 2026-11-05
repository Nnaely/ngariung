export type StreakState = {
  current: number;
  longest: number;
  /** Sisa freeze bulan berjalan. */
  freezes: number;
  lastDate: string | null; // YYYY-MM-DD (Asia/Jakarta)
  /** Bulan terakhir jatah freeze di-reset, format YYYY-MM. */
  freezeMonth: string | null;
};

export type CheckInEvent = "INCREMENT" | "FREEZE" | "RESET" | "ALREADY";

export type CheckInResult = {
  streak: StreakState;
  event: CheckInEvent;
  milestone?: number;
  freezeUsed: boolean;
  /** true kalau jatah freeze baru saja di-reset karena bulan berganti. */
  freezeReset: boolean;
};

export const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365] as const;

/** Jatah streak freeze per bulan. Reset otomatis di tanggal 1. */
export const FREEZES_PER_MONTH = 2;

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

/** Freeze yang berlaku hari ini (jatah baru otomatis penuh di bulan baru). */
export function effectiveFreezes(s: StreakState, today: string): number {
  return s.freezeMonth === monthKey(today) ? s.freezes : FREEZES_PER_MONTH;
}

/** Selisih hari antara dua tanggal YYYY-MM-DD (b - a). */
export function diffDays(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const start = Date.UTC(ay, am - 1, ad);
  const end = Date.UTC(by, bm - 1, bd);
  return Math.round((end - start) / 86_400_000);
}

/**
 * Aturan streak (lihat PRD 6.2):
 *  - gap 1 hari  -> increment
 *  - gap 2 hari  -> pakai freeze kalau masih ada (streak lanjut)
 *  - lainnya     -> reset ke 1
 *  - freeze adalah jatah bulanan: penuh lagi setiap awal bulan
 */
export function applyCheckIn(s: StreakState, today: string): CheckInResult {
  if (s.lastDate === today) {
    return {
      streak: s,
      event: "ALREADY",
      freezeUsed: false,
      freezeReset: false,
    };
  }

  const month = monthKey(today);
  const freezeReset = s.freezeMonth !== month;
  let freezes = freezeReset ? FREEZES_PER_MONTH : s.freezes;

  const gap = s.lastDate ? diffDays(s.lastDate, today) : Number.POSITIVE_INFINITY;

  let current = s.current;
  let event: CheckInEvent;
  let freezeUsed = false;

  if (gap === 1) {
    current += 1;
    event = "INCREMENT";
  } else if (gap === 2 && freezes > 0) {
    current += 1;
    freezes -= 1;
    freezeUsed = true;
    event = "FREEZE";
  } else {
    current = 1;
    event = "RESET";
  }

  const longest = Math.max(s.longest, current);
  const milestone = (MILESTONES as readonly number[]).includes(current)
    ? current
    : undefined;

  return {
    streak: { current, longest, freezes, lastDate: today, freezeMonth: month },
    event,
    milestone,
    freezeUsed,
    freezeReset,
  };
}

/**
 * Streak yang pantas ditampilkan ke orang lain hari ini. Streak yang sudah
 * pasti putus (tidak bisa diselamatkan freeze lagi) tampil 0, meski nilai
 * tersimpan baru di-reset saat pemiliknya absen berikutnya.
 */
export function visibleStreak(s: StreakState, today: string): number {
  if (!s.lastDate) return 0;
  const gap = diffDays(s.lastDate, today);
  if (gap <= 1) return s.current;
  if (gap === 2 && effectiveFreezes(s, today) > 0) return s.current;
  return 0;
}

/** Notifikasi yang dikirim ke pengguna lain — teks dikunci oleh PRD R5. */
export function broadcastBody(username: string): string {
  return `${username} sudah absen hari ini, ayo segera menuju Pancong skrg!`;
}

export function broadcastTitle(username: string): string {
  return `🔥 ${username} baru absen!`;
}
