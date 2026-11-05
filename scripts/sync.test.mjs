import assert from "node:assert/strict";
import test from "node:test";
import { IDLE_MS, newFriendCheckIns, shouldPoll } from "../lib/sync.ts";

const row = (id, username) => ({ id, username, emoji: "🔥", color: "#FF5A1F", at: "2026-11-05T05:00:00Z", date: "2026-11-05", streak: 1 });

test("only check-ins that are new and not mine become toasts", () => {
  const before = [row("1", "ayu")];
  const after = [row("3", "me"), row("2", "budi"), row("1", "ayu")];
  assert.deepEqual(newFriendCheckIns(before, after, "me").map((c) => c.id), ["2"]);
  assert.deepEqual(newFriendCheckIns(after, after, "me"), []);
});

test("polling runs only while the app is visible and recently used", () => {
  const now = 1_000_000;
  assert.equal(shouldPoll({ visible: true, now, lastInteraction: now - 1000 }), true);
  assert.equal(shouldPoll({ visible: true, now, lastInteraction: now - IDLE_MS }), true);
  assert.equal(shouldPoll({ visible: true, now, lastInteraction: now - IDLE_MS - 1 }), false);
  assert.equal(shouldPoll({ visible: false, now, lastInteraction: now }), false);
});
