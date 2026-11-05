import assert from "node:assert/strict";
import test from "node:test";
import { createTestDb } from "./helpers/test-db.mjs";
import {
  createSession,
  deleteSession,
  emailExists,
  getAvatar,
  loginUser,
  registerUser,
  sessionUserId,
  updateProfile,
} from "../lib/server/accounts.ts";

const NOW = new Date("2026-11-05T05:00:00Z");
const minutes = (n) => new Date(NOW.getTime() + n * 60_000);
const PHOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQg=";

async function withDb(fn) {
  const { db, close } = await createTestDb();
  try {
    await fn(db);
  } finally {
    await close();
  }
}

function register(db, extra = {}) {
  return registerUser(db, { email: "dinda@ikamasu.ac.id", username: "dinda", emoji: "🌻", pin: "123456", ...extra });
}

async function rejectsWith(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.code, code, error.message);
    assert.equal(typeof error.message, "string");
    return true;
  });
}

test("email and username are normalized, so case and stray spaces do not create a second account", async () => {
  await withDb(async (db) => {
    await register(db, { email: " Dinda@IKAMASU.AC.ID ", username: " Dinda " });
    assert.equal(await emailExists(db, "dinda@ikamasu.ac.id"), true);
    assert.equal(await emailExists(db, "lain@ikamasu.ac.id"), false);
    const { rows } = await db.query("select email, username, color from users");
    assert.deepEqual(rows[0], { email: "dinda@ikamasu.ac.id", username: "dinda", color: "#2EE6A8" });
    await rejectsWith(register(db, { username: "dinda2" }), "EMAIL_TAKEN");
    await rejectsWith(register(db, { email: "dinda2@ikamasu.ac.id", username: "DINDA" }), "USERNAME_TAKEN");
  });
});

test("registration rejects bad email, username, avatar and PIN", async () => {
  await withDb(async (db) => {
    await rejectsWith(register(db, { email: "dinda@gmail.com" }), "INVALID_EMAIL");
    await rejectsWith(register(db, { username: "admin" }), "INVALID_USERNAME");
    await rejectsWith(register(db, { username: "a" }), "INVALID_USERNAME");
    await rejectsWith(register(db, { emoji: "💀" }), "INVALID_AVATAR");
    await rejectsWith(register(db, { pin: "12345" }), "INVALID_PIN");
    await rejectsWith(emailExists(db, "bukan-email"), "INVALID_EMAIL");
    const { rows } = await db.query("select count(*)::int as n from users");
    assert.equal(rows[0].n, 0);
  });
});

test("login needs the right PIN; unknown emails get the same answer as wrong PINs", async () => {
  await withDb(async (db) => {
    const id = await register(db);
    assert.equal(await loginUser(db, " DINDA@ikamasu.ac.id", "123456", NOW), id);
    await rejectsWith(loginUser(db, "dinda@ikamasu.ac.id", "654321", NOW), "INVALID_CREDENTIALS");
    await rejectsWith(loginUser(db, "siapa@ikamasu.ac.id", "123456", NOW), "INVALID_CREDENTIALS");
  });
});

test("five wrong PINs lock the account for fifteen minutes, even for the right PIN", async () => {
  await withDb(async (db) => {
    const id = await register(db);
    for (let i = 0; i < 4; i++) await rejectsWith(loginUser(db, "dinda@ikamasu.ac.id", "000000", NOW), "INVALID_CREDENTIALS");
    await rejectsWith(loginUser(db, "dinda@ikamasu.ac.id", "000000", NOW), "LOCKED");
    await rejectsWith(loginUser(db, "dinda@ikamasu.ac.id", "123456", minutes(1)), "LOCKED");
    assert.equal(await loginUser(db, "dinda@ikamasu.ac.id", "123456", minutes(16)), id);
    // A successful login clears the counter: four more misses are not a lock yet.
    for (let i = 0; i < 4; i++) await rejectsWith(loginUser(db, "dinda@ikamasu.ac.id", "000000", minutes(17)), "INVALID_CREDENTIALS");
    assert.equal(await loginUser(db, "dinda@ikamasu.ac.id", "123456", minutes(17)), id);
  });
});

test("sessions resolve to their user, are stored only as hashes, and end on logout", async () => {
  await withDb(async (db) => {
    const id = await register(db);
    const token = await createSession(db, id, "Mozilla/5.0");
    assert.equal(await sessionUserId(db, token), id);
    const { rows } = await db.query("select token_hash from sessions");
    assert.notEqual(rows[0].token_hash, token);
    assert.equal(await sessionUserId(db, "token-palsu"), null);
    assert.equal(await sessionUserId(db, ""), null);
    await deleteSession(db, token);
    assert.equal(await sessionUserId(db, token), null);
  });
});

test("renaming keeps battle history attached to the new username", async () => {
  await withDb(async (db) => {
    const id = await register(db);
    await register(db, { email: "adit@ikamasu.ac.id", username: "adit", emoji: "🐧" });
    await db.query(
      "insert into battles (recorded_by, local_date, game, player_a, player_b, winner, at) values ($1, '2026-11-05', 'ttt', 'dinda', 'adit', 'dinda', now())",
      [id],
    );
    await updateProfile(db, id, { username: "dinda.p" });
    const { rows } = await db.query("select player_a, winner from battles");
    assert.deepEqual(rows[0], { player_a: "dinda.p", winner: "dinda.p" });
    await rejectsWith(updateProfile(db, id, { username: "adit" }), "USERNAME_TAKEN");
    await rejectsWith(updateProfile(db, id, { username: "x" }), "INVALID_USERNAME");
  });
});

test("avatar photos are validated, versioned and removable; emoji changes set the color", async () => {
  await withDb(async (db) => {
    const id = await register(db);
    await updateProfile(db, id, { avatar: PHOTO });
    const avatar = await getAvatar(db, id);
    assert.equal(avatar.mime, "image/jpeg");
    assert.ok(Buffer.isBuffer(avatar.bytes) && avatar.bytes.length > 0);
    await updateProfile(db, id, { emoji: "🌙" });
    let { rows } = await db.query("select emoji, color, avatar_version from users");
    assert.deepEqual(rows[0], { emoji: "🌙", color: "#FF4D6D", avatar_version: 1 });
    await updateProfile(db, id, { avatar: null });
    assert.equal(await getAvatar(db, id), null);
    ({ rows } = await db.query("select avatar_version from users"));
    assert.equal(rows[0].avatar_version, 2);
    await rejectsWith(updateProfile(db, id, { avatar: "bukan gambar" }), "INVALID_AVATAR");
    await rejectsWith(updateProfile(db, id, { avatar: `data:image/jpeg;base64,${"A".repeat(200_001)}` }), "INVALID_AVATAR");
    await rejectsWith(updateProfile(db, id, { emoji: "💀" }), "INVALID_AVATAR");
    assert.equal(await getAvatar(db, "bukan-uuid"), null);
  });
});
