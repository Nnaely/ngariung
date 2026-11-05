import type { Db } from "./sql.ts";
import { fail } from "./errors.ts";
import { visibleStreak, type StreakState } from "../streak.ts";
import { dateWIB, shiftDate } from "../format.ts";
import type { LeaderboardRow } from "../leaderboard.ts";
import type { AppSnapshot, BoardRow } from "../api-types.ts";
import type { CheckIn, DailyRecord } from "../types.ts";

type ProfileColumns = {
  id: string;
  username: string;
  emoji: string;
  color: string;
  avatar_version: number;
  has_avatar: boolean;
};

type StreakColumns = {
  streak_current: number;
  streak_longest: number;
  streak_freezes: number;
  streak_freeze_month: string | null;
  streak_last_date: string | null;
};

const PROFILE = "u.id, u.username, u.emoji, u.color, u.avatar_version, u.avatar is not null as has_avatar";
const STREAK = `u.streak_current, u.streak_longest, u.streak_freezes, u.streak_freeze_month,
  to_char(u.streak_last_date, 'YYYY-MM-DD') as streak_last_date`;

const toIso = (value: unknown) => new Date(value as string | Date).toISOString();

/** Field profil publik; `avatarUrl` hanya ada kalau ada foto. */
function profile(row: ProfileColumns) {
  return {
    username: row.username,
    emoji: row.emoji,
    color: row.color,
    ...(row.has_avatar ? { avatarUrl: `/api/avatar/${row.id}?v=${row.avatar_version}` } : {}),
  };
}

function streakState(row: StreakColumns): StreakState {
  return {
    current: row.streak_current,
    longest: row.streak_longest,
    freezes: row.streak_freezes,
    lastDate: row.streak_last_date,
    freezeMonth: row.streak_freeze_month,
  };
}

/** Semua data yang dibutuhkan aplikasi untuk satu pengguna, saat `now`. */
export async function loadSnapshot(db: Db, userId: string, now: Date): Promise<AppSnapshot> {
  const today = dateWIB(now);
  const weekStart = shiftDate(today, -6);

  const [me, members, todays, battles, dailies, mine] = await Promise.all([
    db.query<ProfileColumns & StreakColumns & { email: string; total: number }>(
      `select ${PROFILE}, ${STREAK}, u.email,
              (select count(*)::int from check_ins c where c.user_id = u.id) as total
         from users u where u.id = $1`,
      [userId],
    ),
    db.query<ProfileColumns & StreakColumns & { week: number }>(
      `select ${PROFILE}, ${STREAK}, coalesce(w.days, 0)::int as week
         from users u
         left join (
           select user_id, count(distinct local_date)::int as days
             from check_ins where local_date between $1::date and $2::date
            group by user_id
         ) w on w.user_id = u.id`,
      [weekStart, today],
    ),
    db.query<ProfileColumns & { checkin_id: string; at: unknown; streak: number }>(
      `select c.id as checkin_id, c.at, c.streak, ${PROFILE}
         from check_ins c join users u on u.id = c.user_id
        where c.local_date = $1::date
        order by c.at desc, c.id`,
      [today],
    ),
    db.query<BoardRow>(
      `select winner as name, count(*)::int as value
         from battles group by winner order by value desc, name asc limit 8`,
    ),
    db.query<BoardRow>(
      `select u.username as name, sum(d.score)::int as value
         from daily_results d join users u on u.id = d.user_id
        where d.solved group by u.username order by value desc, name asc limit 8`,
    ),
    db.query<{ game: "kata" | "teka"; solved: boolean; score: number; at: unknown }>(
      `select game, solved, score, at from daily_results where user_id = $1 and local_date = $2::date`,
      [userId, today],
    ),
  ]);

  const self = me.rows[0];
  if (!self) fail("UNAUTHORIZED", "Sesi berakhir. Masuk lagi, ya.", 401);
  const myStreak = streakState(self);

  const checkIns: CheckIn[] = todays.rows.map((row) => ({
    id: row.checkin_id,
    ...profile(row),
    at: toIso(row.at),
    date: today,
    streak: row.streak,
  }));

  const leaderboard: LeaderboardRow[] = members.rows.map((row) => ({
    ...profile(row),
    streak: visibleStreak(streakState(row), today),
    week: row.week,
  }));

  const myDailies: DailyRecord[] = mine.rows.map((row) => ({
    date: today,
    game: row.game,
    username: self.username,
    solved: row.solved,
    score: row.score,
    at: toIso(row.at),
  }));

  return {
    today,
    me: {
      user: { email: self.email, ...profile(self) },
      // Streak yang sudah pasti putus tampil 0, sama seperti di papan peringkat.
      streak: { ...myStreak, current: visibleStreak(myStreak, today) },
      totalCheckIns: self.total,
    },
    checkIns,
    leaderboard,
    battleBoard: battles.rows,
    dailyBoard: dailies.rows,
    myDailies,
  };
}
