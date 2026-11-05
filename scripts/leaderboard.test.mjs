import assert from "node:assert/strict";
import test from "node:test";
import { buildLeaderboard } from "../lib/leaderboard.ts";

const TODAY = "2026-11-05";
const USER = {
  username: "self",
  email: "self@ikamasu.ac.id",
  emoji: "🔥",
  color: "#FF5A1F",
};

function checkIn(username, date, streak, extra = {}) {
  return {
    id: `${username}-${date}`,
    username,
    date,
    at: `${date}T12:00:00+07:00`,
    streak,
    emoji: "😎",
    color: "#123456",
    ...extra,
  };
}

function leaderboard(checkIns, extra = {}) {
  return buildLeaderboard({
    checkIns,
    user: USER,
    currentStreak: 0,
    today: TODAY,
    sortBy: "streak",
    ...extra,
  });
}

test("latest known streak replaces a historical peak regardless of input order", () => {
  const rows = [checkIn("alfa", "2026-11-05", 2), checkIn("alfa", "2026-10-25", 40)];
  assert.equal(leaderboard(rows).find((entry) => entry.username === "alfa").streak, 2);
  assert.deepEqual(leaderboard(rows), leaderboard([...rows].reverse()));
});

test("weekly counts deduplicate dates and include only the inclusive seven-day window", () => {
  const rows = [
    checkIn("alfa", "2026-10-29", 10), // One day before the window.
    checkIn("alfa", "2026-10-30", 11), // First day of the window.
    checkIn("alfa", "2026-10-30", 11, { id: "duplicate-day" }),
    checkIn("alfa", TODAY, 3),
    checkIn("alfa", TODAY, 3, { id: "duplicate-today" }),
    checkIn("alfa", "2026-11-06", 99), // A future row cannot inflate either rank.
    checkIn("future-only", "2026-11-07", 100),
  ];
  const entries = leaderboard(rows, { sortBy: "week" });
  assert.equal(entries.find((entry) => entry.username === "alfa").week, 2);
  assert.equal(entries.find((entry) => entry.username === "alfa").streak, 3);
  assert.equal(entries.some((entry) => entry.username === "future-only"), false);
});

test("calendar boundaries use date arithmetic across a year change", () => {
  const rows = [
    checkIn("alfa", "2025-12-27", 1),
    checkIn("alfa", "2025-12-28", 2),
    checkIn("alfa", "2026-01-03", 3),
  ];
  assert.equal(leaderboard(rows, { today: "2026-01-03" }).find((entry) => entry.username === "alfa").week, 2);
});

test("profile data comes from the latest timestamp, including removal of an old photo", () => {
  const rows = [
    checkIn("alfa", TODAY, 4, { id: "new", at: "2026-11-05T15:00:00+07:00", emoji: "🌙", color: "#654321" }),
    checkIn("alfa", TODAY, 4, { id: "old", at: "2026-11-05T07:00:00Z", avatarUrl: "data:image/png;base64,old" }),
  ];
  const entry = leaderboard(rows).find((row) => row.username === "alfa");
  assert.equal(entry.emoji, "🌙");
  assert.equal(entry.color, "#654321");
  assert.equal(entry.avatarUrl, undefined);
  assert.deepEqual(leaderboard(rows), leaderboard([...rows].reverse()));
});

test("a current user's reset and profile edits override historical snapshots", () => {
  const entries = leaderboard([checkIn("self", TODAY, 25, { avatarUrl: "old-photo" })]);
  assert.deepEqual(entries[0], {
    username: "self",
    emoji: USER.emoji,
    color: USER.color,
    avatarUrl: undefined,
    streak: 0,
    week: 1,
    isMe: true,
  });
});

test("the current user is present even before their first check-in", () => {
  assert.equal(leaderboard([]).length, 1);
  assert.equal(leaderboard([])[0].isMe, true);
  assert.equal(leaderboard([])[0].week, 0);
});

test("streak ties use username; weekly ties use streak then username", () => {
  const rows = [
    checkIn("charlie", TODAY, 3),
    checkIn("bravo", TODAY, 5),
    checkIn("alfa", TODAY, 5),
    checkIn("delta", "2026-11-04", 1),
    checkIn("delta", TODAY, 2),
  ];
  assert.deepEqual(leaderboard(rows).map((entry) => entry.username), ["alfa", "bravo", "charlie", "delta", "self"]);
  assert.deepEqual(leaderboard(rows, { sortBy: "week" }).map((entry) => entry.username), ["delta", "alfa", "bravo", "charlie", "self"]);
  assert.deepEqual(leaderboard(rows), leaderboard([...rows].reverse()));
});

test("same-timestamp snapshots resolve deterministically and inputs remain untouched", () => {
  const rows = Object.freeze([
    Object.freeze(checkIn("alfa", TODAY, 1, { id: "a", emoji: "🍓" })),
    Object.freeze(checkIn("alfa", TODAY, 2, { id: "z", emoji: "🌙" })),
  ]);
  assert.equal(leaderboard(rows)[0].streak, 2);
  assert.deepEqual(leaderboard(rows), leaderboard([...rows].reverse()));
});

test("older peer records retain their last observed streak without guessing freeze expiry", () => {
  const entry = leaderboard([checkIn("alfa", "2026-10-01", 9)])[0];
  assert.equal(entry.streak, 9);
  assert.equal(entry.week, 0);
});
