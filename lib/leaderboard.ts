export type LeaderboardSort = "streak" | "week";

/** Satu anggota di papan peringkat, sudah dihitung server. */
export type LeaderboardRow = {
  username: string;
  emoji: string;
  color: string;
  avatarUrl?: string;
  /** Streak yang masih hidup hari ini (0 kalau sudah putus). */
  streak: number;
  /** Jumlah hari berbeda dengan absen dalam 7 hari terakhir. */
  week: number;
};

export type LeaderboardEntry = LeaderboardRow & { isMe: boolean };

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function sortLeaderboard(
  rows: readonly LeaderboardRow[],
  me: string,
  sortBy: LeaderboardSort,
): LeaderboardEntry[] {
  return rows
    .map((row) => ({ ...row, isMe: row.username === me }))
    .sort(
      (a, b) =>
        (sortBy === "week" ? b.week - a.week : 0) ||
        b.streak - a.streak ||
        compareText(a.username, b.username),
    );
}
