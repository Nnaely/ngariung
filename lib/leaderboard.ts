import type { CheckIn, User } from "./types";

export type LeaderboardSort = "streak" | "week";

export type LeaderboardEntry = {
  username: string;
  emoji: string;
  color: string;
  avatarUrl?: string;
  streak: number;
  week: number;
  isMe: boolean;
};

type LeaderboardInput = {
  checkIns: readonly CheckIn[];
  user: User;
  currentStreak: number;
  /** Current calendar date in Asia/Jakarta, formatted YYYY-MM-DD. */
  today: string;
  sortBy: LeaderboardSort;
};

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareCheckIns(a: CheckIn, b: CheckIn): number {
  return (
    compareText(a.date, b.date) ||
    Date.parse(a.at) - Date.parse(b.at) ||
    compareText(a.id, b.id)
  );
}

/**
 * Rank the latest known streak, never a historical maximum. Peer freeze state
 * is unavailable in check-in history, so do not infer whether it has expired.
 */
export function buildLeaderboard({
  checkIns,
  user,
  currentStreak,
  today,
  sortBy,
}: LeaderboardInput): LeaderboardEntry[] {
  const [year, month, day] = today.split("-").map(Number);
  const weekStart = new Date(Date.UTC(year, month - 1, day - 6))
    .toISOString()
    .slice(0, 10);
  const latestByUser = new Map<string, CheckIn>();
  const weekDaysByUser = new Map<string, Set<string>>();

  for (const checkIn of checkIns) {
    // Future records cannot describe the user's current streak or attendance.
    if (checkIn.date > today) continue;

    const previous = latestByUser.get(checkIn.username);
    if (!previous || compareCheckIns(checkIn, previous) > 0) {
      latestByUser.set(checkIn.username, checkIn);
    }

    if (checkIn.date >= weekStart) {
      let dates = weekDaysByUser.get(checkIn.username);
      if (!dates) {
        dates = new Set<string>();
        weekDaysByUser.set(checkIn.username, dates);
      }
      dates.add(checkIn.date);
    }
  }

  const entries = new Map<string, LeaderboardEntry>();
  for (const [username, latest] of latestByUser) {
    entries.set(username, {
      username,
      emoji: latest.emoji,
      color: latest.color,
      avatarUrl: latest.avatarUrl,
      streak: latest.streak,
      week: weekDaysByUser.get(username)?.size ?? 0,
      isMe: username === user.username,
    });
  }

  // The current profile and streak can change without another check-in, e.g.
  // after an avatar edit or a streak reset. They override historical snapshots.
  entries.set(user.username, {
    username: user.username,
    emoji: user.emoji,
    color: user.color,
    avatarUrl: user.avatarUrl,
    streak: currentStreak,
    week: weekDaysByUser.get(user.username)?.size ?? 0,
    isMe: true,
  });

  return [...entries.values()].sort((a, b) =>
    (sortBy === "week" ? b.week - a.week : 0) ||
    b.streak - a.streak ||
    compareText(a.username, b.username),
  );
}
