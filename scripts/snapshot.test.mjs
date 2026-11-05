import assert from "node:assert/strict";
import test from "node:test";
import { createTestDb } from "./helpers/test-db.mjs";
import { registerUser, updateProfile } from "../lib/server/accounts.ts";
import { recordCheckIn } from "../lib/server/checkins.ts";
import { loadSnapshot } from "../lib/server/snapshot.ts";
import { recordBattle, recordDaily } from "../lib/server/games.ts";
import { PANCONG } from "../lib/geo.ts";

const HERE = { lat: PANCONG.lat, lng: PANCONG.lng, accuracy: 20 };
const noon = (date) => new Date(`${date}T05:00:00Z`);
const TODAY = "2026-11-05";
const PHOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQg=";

async function withPeople(fn) {
  const { db, close } = await createTestDb();
  try {
    const ayu = await registerUser(db, { email: "ayu@ikamasu.ac.id", username: "ayu", emoji: "🔥", pin: "123456" });
    const budi = await registerUser(db, { email: "budi@ikamasu.ac.id", username: "budi", emoji: "🐧", pin: "123456" });
    await fn(db, { ayu, budi });
  } finally {
    await close();
  }
}

async function rejectsWith(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.code, code, error.message);
    return true;
  });
}

test("one person's check-in is visible to everyone else", async () => {
  await withPeople(async (db, { ayu, budi }) => {
    await recordCheckIn(db, ayu, HERE, noon(TODAY));
    const seenByBudi = await loadSnapshot(db, budi, noon(TODAY));
    assert.equal(seenByBudi.today, TODAY);
    assert.equal(seenByBudi.me.user.username, "budi");
    assert.equal(seenByBudi.checkIns.length, 1);
    assert.deepEqual(
      { ...seenByBudi.checkIns[0], id: "-" },
      { id: "-", username: "ayu", emoji: "🔥", color: "#FF5A1F", at: "2026-11-05T05:00:00.000Z", date: TODAY, streak: 1 },
    );
    const board = Object.fromEntries(seenByBudi.leaderboard.map((row) => [row.username, row]));
    assert.deepEqual(board.ayu, { username: "ayu", emoji: "🔥", color: "#FF5A1F", streak: 1, week: 1 });
    assert.equal(board.budi.streak, 0);
  });
});

test("today's feed is newest first and only holds today's check-ins", async () => {
  await withPeople(async (db, { ayu, budi }) => {
    await recordCheckIn(db, ayu, HERE, noon("2026-11-04"));
    await recordCheckIn(db, budi, HERE, new Date(`${TODAY}T02:00:00Z`));
    await recordCheckIn(db, ayu, HERE, new Date(`${TODAY}T03:00:00Z`));
    const snapshot = await loadSnapshot(db, budi, noon(TODAY));
    assert.deepEqual(snapshot.checkIns.map((row) => row.username), ["ayu", "budi"]);
    assert.equal(snapshot.me.totalCheckIns, 1);
  });
});

test("seven-day attendance counts distinct days in an inclusive window, across a year change", async () => {
  await withPeople(async (db, { ayu }) => {
    for (const day of ["2025-12-27", "2025-12-28", "2026-01-02", "2026-01-03"]) {
      await recordCheckIn(db, ayu, HERE, noon(day));
    }
    const snapshot = await loadSnapshot(db, ayu, noon("2026-01-03"));
    assert.equal(snapshot.leaderboard.find((row) => row.username === "ayu").week, 3);
  });
});

test("a streak that can no longer be saved shows zero everywhere, but the record stays", async () => {
  await withPeople(async (db, { ayu, budi }) => {
    await recordCheckIn(db, ayu, HERE, noon("2026-11-01"));
    await recordCheckIn(db, ayu, HERE, noon("2026-11-02"));
    const mine = await loadSnapshot(db, ayu, noon(TODAY));
    assert.equal(mine.me.streak.current, 0);
    assert.equal(mine.me.streak.longest, 2);
    assert.equal(mine.me.streak.lastDate, "2026-11-02");
    assert.equal(mine.leaderboard.find((row) => row.username === "ayu").streak, 0);
    const theirs = await loadSnapshot(db, budi, noon("2026-11-04"));
    assert.equal(theirs.leaderboard.find((row) => row.username === "ayu").streak, 2, "still savable by a freeze");
  });
});

test("photos are referenced by a versioned URL instead of embedded data", async () => {
  await withPeople(async (db, { ayu, budi }) => {
    await updateProfile(db, ayu, { avatar: PHOTO });
    await recordCheckIn(db, ayu, HERE, noon(TODAY));
    const snapshot = await loadSnapshot(db, budi, noon(TODAY));
    assert.equal(snapshot.checkIns[0].avatarUrl, `/api/avatar/${ayu}?v=1`);
    assert.equal(snapshot.leaderboard.find((row) => row.username === "ayu").avatarUrl, `/api/avatar/${ayu}?v=1`);
    assert.equal((await loadSnapshot(db, ayu, noon(TODAY))).me.user.avatarUrl, `/api/avatar/${ayu}?v=1`);
    assert.equal(JSON.stringify(snapshot).includes("base64"), false);
  });
});

test("battles unlock after checking in and feed the shared battle board", async () => {
  await withPeople(async (db, { ayu }) => {
    const battle = { game: "ttt", playerB: "budi", winner: "ayu" };
    await rejectsWith(recordBattle(db, ayu, battle, noon(TODAY)), "BATTLE_LOCKED");
    await recordCheckIn(db, ayu, HERE, noon(TODAY));
    await recordBattle(db, ayu, battle, noon(TODAY));
    await recordBattle(db, ayu, battle, noon(TODAY));
    await recordBattle(db, ayu, { ...battle, winner: "budi" }, noon(TODAY));
    await rejectsWith(recordBattle(db, ayu, { ...battle, playerB: "AYU", winner: "ayu" }, noon(TODAY)), "BAD_REQUEST");
    await rejectsWith(recordBattle(db, ayu, { ...battle, winner: "orang lain" }, noon(TODAY)), "BAD_REQUEST");
    await rejectsWith(recordBattle(db, ayu, { ...battle, game: "catur" }, noon(TODAY)), "BAD_REQUEST");
    await rejectsWith(recordBattle(db, ayu, { ...battle, playerB: "x".repeat(21) }, noon(TODAY)), "BAD_REQUEST");
    const snapshot = await loadSnapshot(db, ayu, noon(TODAY));
    assert.deepEqual(snapshot.battleBoard, [{ name: "ayu", value: 2 }, { name: "budi", value: 1 }]);
  });
});

test("daily games count once per day and only solved ones score", async () => {
  await withPeople(async (db, { ayu, budi }) => {
    await recordDaily(db, ayu, { game: "kata", solved: true }, noon(TODAY));
    await rejectsWith(recordDaily(db, ayu, { game: "kata", solved: false }, noon(TODAY)), "ALREADY_PLAYED");
    await recordDaily(db, ayu, { game: "teka", solved: false }, noon(TODAY));
    await recordDaily(db, budi, { game: "kata", solved: true }, noon(TODAY));
    await recordDaily(db, budi, { game: "teka", solved: true }, noon(TODAY));
    await rejectsWith(recordDaily(db, ayu, { game: "kata", solved: "ya" }, noon("2026-11-06")), "BAD_REQUEST");
    const snapshot = await loadSnapshot(db, ayu, noon(TODAY));
    assert.deepEqual(snapshot.dailyBoard, [{ name: "budi", value: 2 }, { name: "ayu", value: 1 }]);
    assert.deepEqual(
      snapshot.myDailies.map(({ game, solved, score, username, date }) => ({ game, solved, score, username, date })).sort((a, b) => a.game.localeCompare(b.game)),
      [
        { game: "kata", solved: true, score: 1, username: "ayu", date: TODAY },
        { game: "teka", solved: false, score: 0, username: "ayu", date: TODAY },
      ],
    );
  });
});

test("a session for a deleted account is unauthorized", async () => {
  await withPeople(async (db, { ayu }) => {
    await db.query("delete from users where id = $1", [ayu]);
    await rejectsWith(loadSnapshot(db, ayu, noon(TODAY)), "UNAUTHORIZED");
  });
});
