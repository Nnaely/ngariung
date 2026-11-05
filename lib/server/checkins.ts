import type { Db } from "./sql.ts";
import { fail, uniqueViolation } from "./errors.ts";
import { applyCheckIn, type StreakState } from "../streak.ts";
import { ACCURACY_MAX_M, RADIUS_M, distanceToPancong, formatDistance } from "../geo.ts";
import { dateWIB } from "../format.ts";
import type { CheckInOutcome } from "../api-types.ts";

export type CheckInInput = { lat: number; lng: number; accuracy: number };

type StreakRow = {
  current: number;
  longest: number;
  freezes: number;
  freeze_month: string | null;
  last_date: string | null;
};

function alreadyCheckedIn(): never {
  fail("ALREADY_CHECKED_IN", "Kamu sudah absen hari ini. Balik lagi besok!", 409);
}

/** Catat absen hari ini (WIB) dan perbarui streak dalam satu transaksi. */
export async function recordCheckIn(
  db: Db,
  userId: string,
  input: CheckInInput | null | undefined,
  now: Date,
): Promise<CheckInOutcome> {
  const { lat, lng, accuracy } = (input ?? {}) as Partial<Record<keyof CheckInInput, unknown>>;
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    typeof accuracy !== "number" ||
    ![lat, lng, accuracy].every(Number.isFinite) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180 ||
    accuracy < 0
  )
    fail("BAD_REQUEST", "Data lokasi tidak lengkap. Coba muat ulang halaman.", 400);

  if (accuracy > ACCURACY_MAX_M)
    fail("LOW_ACCURACY", `GPS kurang akurat (±${Math.round(accuracy)} m). Coba di area terbuka.`, 422);
  const distance = distanceToPancong(lat, lng);
  if (distance > RADIUS_M)
    fail("OUT_OF_RANGE", `Kamu masih ${formatDistance(distance)} dari Pancong. Absen hanya dalam radius ${RADIUS_M} m.`, 422);

  const today = dateWIB(now);
  try {
    return await db.transaction(async (tx) => {
      const { rows } = await tx.query<StreakRow>(
        `select streak_current as current, streak_longest as longest, streak_freezes as freezes,
                streak_freeze_month as freeze_month, to_char(streak_last_date, 'YYYY-MM-DD') as last_date
           from users where id = $1 for update`,
        [userId],
      );
      const row = rows[0];
      if (!row) fail("UNAUTHORIZED", "Sesi berakhir. Masuk lagi, ya.", 401);

      const before: StreakState = {
        current: row.current,
        longest: row.longest,
        freezes: row.freezes,
        lastDate: row.last_date,
        freezeMonth: row.freeze_month,
      };
      const result = applyCheckIn(before, today);
      if (result.event === "ALREADY") alreadyCheckedIn();
      const after = result.streak;

      await tx.query(
        `insert into check_ins (user_id, local_date, at, streak, distance_m, accuracy_m)
         values ($1, $2::date, $3::timestamptz, $4, $5, $6)`,
        [userId, today, now.toISOString(), after.current, distance, accuracy],
      );
      await tx.query(
        `update users set streak_current = $2, streak_longest = $3, streak_freezes = $4,
                          streak_freeze_month = $5, streak_last_date = $6::date
          where id = $1`,
        [userId, after.current, after.longest, after.freezes, after.freezeMonth, after.lastDate],
      );

      return {
        streak: after.current,
        event: result.event,
        milestone: result.milestone,
        freezeUsed: result.freezeUsed,
        date: today,
      };
    });
  } catch (error) {
    if (uniqueViolation(error) !== null) alreadyCheckedIn();
    throw error;
  }
}
