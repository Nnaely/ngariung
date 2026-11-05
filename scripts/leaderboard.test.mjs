import assert from "node:assert/strict";
import test from "node:test";
import { sortLeaderboard } from "../lib/leaderboard.ts";

function row(username, streak, week, extra = {}) {
  return { username, emoji: "😎", color: "#123456", streak, week, ...extra };
}

const ROWS = [
  row("cici", 3, 5),
  row("budi", 7, 2),
  row("ayu", 7, 4),
  row("self", 0, 0),
];

test("streak tab ranks by streak, then username for ties", () => {
  assert.deepEqual(
    sortLeaderboard(ROWS, "self", "streak").map((entry) => entry.username),
    ["ayu", "budi", "cici", "self"],
  );
});

test("seven-day tab ranks by attendance, then streak, then username", () => {
  const rows = [...ROWS, row("dodi", 1, 5)];
  assert.deepEqual(
    sortLeaderboard(rows, "self", "week").map((entry) => entry.username),
    ["cici", "dodi", "ayu", "budi", "self"],
  );
});

test("only the signed-in user is marked as me", () => {
  const entries = sortLeaderboard(ROWS, "budi", "streak");
  assert.deepEqual(entries.filter((entry) => entry.isMe).map((entry) => entry.username), ["budi"]);
});

test("profile fields pass through and the input array is left untouched", () => {
  const rows = [row("ayu", 1, 1, { avatarUrl: "/api/avatar/1?v=2" }), row("budi", 2, 1)];
  const before = structuredClone(rows);
  const entries = sortLeaderboard(rows, "ayu", "streak");
  assert.deepEqual(rows, before);
  assert.equal(entries.find((entry) => entry.username === "ayu").avatarUrl, "/api/avatar/1?v=2");
});
