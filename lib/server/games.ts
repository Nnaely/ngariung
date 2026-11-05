import type { Db } from "./sql.ts";
import { fail } from "./errors.ts";
import { dateWIB } from "../format.ts";

export type BattleInput = { game: "ttt" | "guess"; playerB: string; winner: string };
export type DailyInput = { game: "kata" | "teka"; solved: boolean };

const MAX_NAME = 20;

/** Catat hasil battle (dimainkan di satu HP). Hanya terbuka setelah absen hari ini. */
export async function recordBattle(
  db: Db,
  userId: string,
  input: BattleInput | null | undefined,
  now: Date,
): Promise<void> {
  const game = input?.game;
  if (game !== "ttt" && game !== "guess") fail("BAD_REQUEST", "Game tidak dikenal.", 400);
  const today = dateWIB(now);

  const { rows } = await db.query<{ username: string; checked_in: boolean }>(
    `select u.username,
            exists (select 1 from check_ins c where c.user_id = u.id and c.local_date = $2::date) as checked_in
       from users u where u.id = $1`,
    [userId, today],
  );
  const me = rows[0];
  if (!me) fail("UNAUTHORIZED", "Sesi berakhir. Masuk lagi, ya.", 401);
  if (!me.checked_in) fail("BATTLE_LOCKED", "Battle terbuka setelah kamu absen hari ini.", 403);

  const playerB = typeof input?.playerB === "string" ? input.playerB.trim() : "";
  if (!playerB || playerB.length > MAX_NAME || playerB.toLowerCase() === me.username)
    fail("BAD_REQUEST", "Isi nama lawan dulu (maksimal 20 karakter, tidak boleh sama dengan kamu).", 400);
  const winner = typeof input?.winner === "string" ? input.winner.trim() : "";
  if (winner !== me.username && winner !== playerB) fail("BAD_REQUEST", "Pemenang harus salah satu pemain.", 400);

  await db.query(
    `insert into battles (recorded_by, local_date, game, player_a, player_b, winner, at)
     values ($1, $2::date, $3, $4, $5, $6, $7::timestamptz)`,
    [userId, today, game, me.username, playerB, winner, now.toISOString()],
  );
}

/** Catat hasil game harian; satu kali per game per hari. */
export async function recordDaily(
  db: Db,
  userId: string,
  input: DailyInput | null | undefined,
  now: Date,
): Promise<void> {
  const game = input?.game;
  if (game !== "kata" && game !== "teka") fail("BAD_REQUEST", "Game tidak dikenal.", 400);
  if (typeof input?.solved !== "boolean") fail("BAD_REQUEST", "Hasil game tidak lengkap.", 400);

  const { rows } = await db.query(
    `insert into daily_results (user_id, local_date, game, solved, score, at)
     values ($1, $2::date, $3, $4, $5, $6::timestamptz)
     on conflict do nothing
     returning game`,
    [userId, dateWIB(now), game, input.solved, input.solved ? 1 : 0, now.toISOString()],
  );
  if (rows.length === 0) fail("ALREADY_PLAYED", "Kamu sudah main game ini hari ini. Balik lagi besok!", 409);
}
