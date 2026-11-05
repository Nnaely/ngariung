import type { StreakState } from "./streak.ts";
import type { LeaderboardRow } from "./leaderboard.ts";
import type { CheckIn, DailyRecord, User } from "./types.ts";

/** Data akun yang sedang masuk. */
export type MeInfo = {
  user: User;
  /** State streak tersimpan (dipakai untuk freeze & rekor). */
  streak: StreakState;
  totalCheckIns: number;
};

/** Baris papan game: nama pemain dan nilainya (menang / skor). */
export type BoardRow = { name: string; value: number };

/** Semua yang dibutuhkan aplikasi, dikirim oleh GET /api/state. */
export type AppSnapshot = {
  /** Tanggal hari ini (WIB) menurut server, YYYY-MM-DD. */
  today: string;
  me: MeInfo;
  /** Absen hari ini dari semua orang, terbaru dulu. */
  checkIns: CheckIn[];
  leaderboard: LeaderboardRow[];
  battleBoard: BoardRow[];
  dailyBoard: BoardRow[];
  /** Hasil game harian milik sendiri hari ini. */
  myDailies: DailyRecord[];
};

export type CheckInOutcome = {
  streak: number;
  event: "INCREMENT" | "FREEZE" | "RESET";
  milestone?: number;
  freezeUsed: boolean;
  /** Tanggal absen (WIB). */
  date: string;
};

export type ApiErrorBody = { error: string; message: string };
