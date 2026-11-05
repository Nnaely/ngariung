import { createHash, randomBytes } from "node:crypto";
import type { Db } from "./sql.ts";
import { UUID_RE, fail, uniqueViolation } from "./errors.ts";
import { hashPin, verifyPin } from "./pin.ts";
import {
  AVATAR_EMOJIS,
  CAMPUS_EMAIL_DOMAIN,
  avatarColorFor,
  isCampusEmail,
  isValidPin,
  normalizeCampusEmail,
  normalizeUsername,
  usernameError,
} from "../identity.ts";

export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;
/** Batas panjang data URL foto (avatar 192 px JPEG biasanya ~15–30 ribu karakter). */
export const MAX_AVATAR_CHARS = 200_000;

const AVATAR_DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

export type RegisterInput = { email: string; username: string; emoji: string; pin: string };
export type ProfilePatch = { username?: string; emoji?: string; avatar?: string | null };

function campusEmailOrFail(value: unknown): string {
  const email = normalizeCampusEmail(String(value ?? ""));
  if (!isCampusEmail(email)) fail("INVALID_EMAIL", `Pakai email @${CAMPUS_EMAIL_DOMAIN} untuk bergabung, ya.`, 400);
  return email;
}

function usernameOrFail(value: unknown): string {
  const username = normalizeUsername(String(value ?? ""));
  const problem = usernameError(username);
  if (problem) fail("INVALID_USERNAME", problem, 400);
  return username;
}

function emojiOrFail(value: unknown): string {
  if (typeof value !== "string" || !AVATAR_EMOJIS.includes(value))
    fail("INVALID_AVATAR", "Pilih salah satu avatar yang tersedia.", 400);
  return value;
}

function usernameTaken(): never {
  fail("USERNAME_TAKEN", "Username itu sudah dipakai. Coba yang lain.", 409);
}

export async function emailExists(db: Db, email: string): Promise<boolean> {
  const { rows } = await db.query("select 1 from users where email = $1", [campusEmailOrFail(email)]);
  return rows.length > 0;
}

/** Buat akun baru, kembalikan id-nya. */
export async function registerUser(db: Db, input: RegisterInput): Promise<string> {
  const email = campusEmailOrFail(input.email);
  const username = usernameOrFail(input.username);
  const emoji = emojiOrFail(input.emoji);
  const pin = String(input.pin ?? "");
  if (!isValidPin(pin)) fail("INVALID_PIN", "PIN harus 6 angka.", 400);

  const existing = await db.query<{ email: string }>(
    "select email from users where email = $1 or username = $2",
    [email, username],
  );
  if (existing.rows.some((row) => row.email === email))
    fail("EMAIL_TAKEN", "Email ini sudah terdaftar. Masuk pakai PIN-mu, ya.", 409);
  if (existing.rows.length > 0) usernameTaken();

  try {
    const { rows } = await db.query<{ id: string }>(
      "insert into users (email, username, emoji, color, pin_hash) values ($1, $2, $3, $4, $5) returning id",
      [email, username, emoji, avatarColorFor(emoji), await hashPin(pin)],
    );
    return rows[0].id;
  } catch (error) {
    // Dua pendaftaran bersamaan: constraint UNIQUE yang menjadi wasit.
    const constraint = uniqueViolation(error);
    if (constraint === "users_email_key") fail("EMAIL_TAKEN", "Email ini sudah terdaftar. Masuk pakai PIN-mu, ya.", 409);
    if (constraint !== null) usernameTaken();
    throw error;
  }
}

type LoginRow = { id: string; pin_hash: string; locked_until: Date | string | null };

function lockedMessage(until: Date, now: Date): string {
  const minutes = Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 60_000));
  return `Terlalu banyak PIN salah. Coba lagi dalam ${minutes} menit.`;
}

/** Masuk dengan email + PIN, kembalikan id akun. */
export async function loginUser(db: Db, email: string, pin: string, now: Date): Promise<string> {
  const invalid = (): never => fail("INVALID_CREDENTIALS", "Email atau PIN salah.", 401);
  const normalized = normalizeCampusEmail(String(email ?? ""));
  const pinText = String(pin ?? "");
  if (!isCampusEmail(normalized) || !isValidPin(pinText)) invalid();

  const { rows } = await db.query<LoginRow>(
    "select id, pin_hash, locked_until from users where email = $1",
    [normalized],
  );
  const user = rows[0];
  if (!user) invalid();

  const lockedUntil = user.locked_until ? new Date(user.locked_until) : null;
  if (lockedUntil && lockedUntil > now) fail("LOCKED", lockedMessage(lockedUntil, now), 429);

  if (!(await verifyPin(pinText, user.pin_hash))) {
    const counted = await db.query<{ failed_logins: number }>(
      "update users set failed_logins = failed_logins + 1 where id = $1 returning failed_logins",
      [user.id],
    );
    if (counted.rows[0].failed_logins >= MAX_FAILED_LOGINS) {
      const until = new Date(now.getTime() + LOCK_MINUTES * 60_000);
      await db.query("update users set failed_logins = 0, locked_until = $2 where id = $1", [user.id, until.toISOString()]);
      fail("LOCKED", lockedMessage(until, now), 429);
    }
    invalid();
  }

  await db.query("update users set failed_logins = 0, locked_until = null where id = $1", [user.id]);
  return user.id;
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(db: Db, userId: string, userAgent?: string | null): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.query("insert into sessions (token_hash, user_id, user_agent) values ($1, $2, $3)", [
    tokenHash(token),
    userId,
    userAgent ? userAgent.slice(0, 300) : null,
  ]);
  return token;
}

export async function sessionUserId(db: Db, token: string | null | undefined): Promise<string | null> {
  if (!token || token.length > 200) return null;
  const { rows } = await db.query<{ user_id: string }>("select user_id from sessions where token_hash = $1", [
    tokenHash(token),
  ]);
  return rows[0]?.user_id ?? null;
}

export async function deleteSession(db: Db, token: string | null | undefined): Promise<void> {
  if (!token) return;
  await db.query("delete from sessions where token_hash = $1", [tokenHash(token)]);
}

/** Ubah username, emoji (warna ikut), dan/atau foto. `avatar: null` menghapus foto. */
export async function updateProfile(db: Db, userId: string, patch: ProfilePatch): Promise<void> {
  const username = patch.username === undefined ? undefined : usernameOrFail(patch.username);
  const emoji = patch.emoji === undefined ? undefined : emojiOrFail(patch.emoji);
  const avatar = patch.avatar;
  if (
    avatar !== undefined &&
    avatar !== null &&
    (typeof avatar !== "string" || avatar.length > MAX_AVATAR_CHARS || !AVATAR_DATA_URL.test(avatar))
  )
    fail("INVALID_AVATAR", "Foto tidak bisa dipakai. Pilih gambar lain, ya.", 400);

  try {
    await db.transaction(async (tx) => {
      const { rows } = await tx.query<{ username: string }>("select username from users where id = $1 for update", [
        userId,
      ]);
      const current = rows[0];
      if (!current) fail("UNAUTHORIZED", "Sesi berakhir. Masuk lagi, ya.", 401);

      if (username !== undefined && username !== current.username) {
        const taken = await tx.query("select 1 from users where username = $1", [username]);
        if (taken.rows.length > 0) usernameTaken();
        await tx.query("update users set username = $2 where id = $1", [userId, username]);
        await tx.query(
          `update battles set
             player_a = case when player_a = $1 then $2 else player_a end,
             player_b = case when player_b = $1 then $2 else player_b end,
             winner   = case when winner   = $1 then $2 else winner   end
           where $1 in (player_a, player_b, winner)`,
          [current.username, username],
        );
      }
      if (emoji !== undefined) {
        await tx.query("update users set emoji = $2, color = $3 where id = $1", [userId, emoji, avatarColorFor(emoji)]);
      }
      if (avatar !== undefined) {
        await tx.query("update users set avatar = $2, avatar_version = avatar_version + 1 where id = $1", [
          userId,
          avatar,
        ]);
      }
    });
  } catch (error) {
    if (uniqueViolation(error) !== null) usernameTaken();
    throw error;
  }
}

export async function getAvatar(db: Db, userId: string): Promise<{ mime: string; bytes: Buffer } | null> {
  if (!UUID_RE.test(userId)) return null;
  const { rows } = await db.query<{ avatar: string | null }>("select avatar from users where id = $1", [userId]);
  const match = rows[0]?.avatar ? AVATAR_DATA_URL.exec(rows[0].avatar) : null;
  if (!match) return null;
  return { mime: match[1], bytes: Buffer.from(match[2], "base64") };
}
