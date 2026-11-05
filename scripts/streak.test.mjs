import assert from "node:assert/strict";
import test from "node:test";
import { visibleStreak } from "../lib/streak.ts";
import { dateWIB, hourWIB } from "../lib/format.ts";

const TODAY = "2026-11-05";

function state(lastDate, extra = {}) {
  return { current: 9, longest: 12, freezes: 2, lastDate, freezeMonth: "2026-11", ...extra };
}

test("a streak checked in today or yesterday is still alive", () => {
  assert.equal(visibleStreak(state("2026-11-05"), TODAY), 9);
  assert.equal(visibleStreak(state("2026-11-04"), TODAY), 9);
});

test("a two-day gap is alive only while this month's freeze can still save it", () => {
  assert.equal(visibleStreak(state("2026-11-03", { freezes: 1 }), TODAY), 9);
  assert.equal(visibleStreak(state("2026-11-03", { freezes: 0 }), TODAY), 0);
});

test("a new month refills freezes, so last month's empty allowance does not end the streak", () => {
  assert.equal(visibleStreak(state("2026-10-31", { freezes: 0, freezeMonth: "2026-10" }), "2026-11-02"), 9);
});

test("three or more missed days, or no check-in at all, show zero", () => {
  assert.equal(visibleStreak(state("2026-11-02"), TODAY), 0);
  assert.equal(visibleStreak(state(null), TODAY), 0);
});

test("dates and hours follow Asia/Jakarta, not UTC", () => {
  assert.equal(dateWIB(new Date("2026-11-05T16:59:00Z")), "2026-11-05");
  assert.equal(dateWIB(new Date("2026-11-05T17:10:00Z")), "2026-11-06");
  assert.equal(hourWIB(new Date("2026-11-05T22:59:00Z")), 5);
  assert.equal(hourWIB(new Date("2026-11-05T23:00:00Z")), 6);
  assert.equal(hourWIB(new Date("2026-11-05T17:00:00Z")), 0);
});
