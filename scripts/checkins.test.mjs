import assert from "node:assert/strict";
import test from "node:test";
import { createTestDb } from "./helpers/test-db.mjs";
import { registerUser } from "../lib/server/accounts.ts";
import { recordCheckIn } from "../lib/server/checkins.ts";
import { PANCONG } from "../lib/geo.ts";

const HERE = { lat: PANCONG.lat, lng: PANCONG.lng, accuracy: 20 };
/** 12:00 WIB on the given date. */
const noon = (date) => new Date(`${date}T05:00:00Z`);

async function withUser(fn) {
  const { db, close } = await createTestDb();
  try {
    const id = await registerUser(db, { email: "dinda@ikamasu.ac.id", username: "dinda", emoji: "🌻", pin: "123456" });
    await fn(db, id);
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

test("consecutive WIB days grow the streak; a single skipped day spends a freeze", async () => {
  await withUser(async (db, id) => {
    assert.deepEqual(await recordCheckIn(db, id, HERE, noon("2026-11-01")), {
      streak: 1, event: "RESET", milestone: undefined, freezeUsed: false, date: "2026-11-01",
    });
    const second = await recordCheckIn(db, id, HERE, noon("2026-11-02"));
    assert.equal(second.streak, 2);
    assert.equal(second.event, "INCREMENT");
    const saved = await recordCheckIn(db, id, HERE, noon("2026-11-04"));
    assert.equal(saved.streak, 3);
    assert.equal(saved.event, "FREEZE");
    assert.equal(saved.freezeUsed, true);
    assert.equal(saved.milestone, 3);
    const { rows } = await db.query(
      "select streak_current, streak_longest, streak_freezes, to_char(streak_last_date, 'YYYY-MM-DD') as last from users",
    );
    assert.deepEqual(rows[0], { streak_current: 3, streak_longest: 3, streak_freezes: 1, last: "2026-11-04" });
  });
});

test("a second check-in on the same day is refused and stores nothing", async () => {
  await withUser(async (db, id) => {
    await recordCheckIn(db, id, HERE, noon("2026-11-05"));
    await rejectsWith(recordCheckIn(db, id, HERE, new Date("2026-11-05T09:00:00Z")), "ALREADY_CHECKED_IN");
    const { rows } = await db.query("select count(*)::int as n from check_ins");
    assert.equal(rows[0].n, 1);
  });
});

test("the day changes at midnight WIB, not midnight UTC", async () => {
  await withUser(async (db, id) => {
    await recordCheckIn(db, id, HERE, new Date("2026-11-05T16:30:00Z")); // 23:30 WIB, 5 Nov
    const next = await recordCheckIn(db, id, HERE, new Date("2026-11-05T17:10:00Z")); // 00:10 WIB, 6 Nov
    assert.equal(next.event, "INCREMENT");
    assert.equal(next.streak, 2);
    assert.equal(next.date, "2026-11-06");
  });
});

test("check-ins outside 200 m, with poor accuracy, or with bad numbers are refused", async () => {
  await withUser(async (db, id) => {
    const now = noon("2026-11-05");
    await rejectsWith(recordCheckIn(db, id, { ...HERE, lat: PANCONG.lat + 0.00225 }, now), "OUT_OF_RANGE");
    await rejectsWith(recordCheckIn(db, id, { ...HERE, accuracy: 150 }, now), "LOW_ACCURACY");
    await rejectsWith(recordCheckIn(db, id, { ...HERE, lat: "x" }, now), "BAD_REQUEST");
    await rejectsWith(recordCheckIn(db, id, { lat: Number.NaN, lng: PANCONG.lng, accuracy: 10 }, now), "BAD_REQUEST");
    await rejectsWith(recordCheckIn(db, id, null, now), "BAD_REQUEST");
    const ok = await recordCheckIn(db, id, { ...HERE, accuracy: 100 }, now);
    assert.equal(ok.streak, 1);
  });
});
