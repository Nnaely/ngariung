import assert from "node:assert/strict";
import test from "node:test";
import { createTestDb } from "./helpers/test-db.mjs";
import { registerUser } from "../lib/server/accounts.ts";
import { recordCheckIn } from "../lib/server/checkins.ts";
import {
  checkInPayload,
  checkInRecipients,
  deliver,
  getVapidKeys,
  isQuietHour,
  removeSubscription,
  saveSubscription,
  subscriptionsOf,
  vapidSubject,
} from "../lib/server/push.ts";
import { PANCONG } from "../lib/geo.ts";

const TODAY = "2026-11-05";
const NOON = new Date(`${TODAY}T05:00:00Z`);
const HERE = { lat: PANCONG.lat, lng: PANCONG.lng, accuracy: 20 };
const KEYS = { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" };
const sub = (n) => ({ endpoint: `https://fcm.googleapis.com/fcm/send/device-${n}`, keys: KEYS });

async function withDb(fn) {
  const { db, close } = await createTestDb();
  try {
    await fn(db);
  } finally {
    await close();
  }
}

const person = (db, name) =>
  registerUser(db, { email: `${name}@ikamasu.ac.id`, username: name, emoji: "🔥", pin: "123456" });

async function rejectsWith(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.code, code, error.message);
    return true;
  });
}

test("VAPID keys are created once, stored, and reused", async () => {
  await withDb(async (db) => {
    const first = await getVapidKeys(db, {});
    const second = await getVapidKeys(db, {});
    assert.deepEqual(first, second);
    assert.match(first.publicKey, /^[A-Za-z0-9_-]{80,}$/);
    const { rows } = await db.query("select count(*)::int as n from app_config");
    assert.equal(rows[0].n, 2);
  });
});

test("VAPID keys from the environment take precedence", async () => {
  await withDb(async (db) => {
    assert.deepEqual(await getVapidKeys(db, { VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv" }), { publicKey: "pub", privateKey: "priv" });
    assert.deepEqual(await getVapidKeys(db, { NEXT_PUBLIC_VAPID_PUBLIC_KEY: "pub2", VAPID_PRIVATE_KEY: "priv2" }), { publicKey: "pub2", privateKey: "priv2" });
  });
});

test("the push contact prefers VAPID_SUBJECT, then the production URL", () => {
  assert.equal(vapidSubject({ VAPID_SUBJECT: "mailto:a@b.id", VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" }), "mailto:a@b.id");
  assert.equal(vapidSubject({ VERCEL_PROJECT_PRODUCTION_URL: "ngariungstreak.vercel.app" }), "https://ngariungstreak.vercel.app");
  assert.equal(vapidSubject({}), "mailto:admin@ikamasu.ac.id");
});

test("a check-in notifies only other people who have not checked in today, on every device", async () => {
  await withDb(async (db) => {
    const [ayu, budi, cici, dodi] = [await person(db, "ayu"), await person(db, "budi"), await person(db, "cici"), await person(db, "dodi")];
    await saveSubscription(db, ayu, sub(1));
    await saveSubscription(db, budi, sub(2));
    await saveSubscription(db, budi, sub(3));
    await saveSubscription(db, cici, sub(4));
    await recordCheckIn(db, cici, HERE, NOON);
    await recordCheckIn(db, ayu, HERE, NOON);
    const recipients = await checkInRecipients(db, ayu, TODAY);
    assert.deepEqual(recipients.map((r) => r.endpoint).sort(), [sub(2).endpoint, sub(3).endpoint]);
    assert.deepEqual(recipients[0].keys, KEYS);
    assert.equal(recipients[0].userId, budi);
    assert.equal(dodi.length, 36);
  });
});

test("quiet hours are 00:00 to 05:59 WIB", () => {
  assert.equal(isQuietHour(new Date("2026-11-05T17:00:00Z")), true); // 00:00 WIB
  assert.equal(isQuietHour(new Date("2026-11-05T22:59:00Z")), true); // 05:59 WIB
  assert.equal(isQuietHour(new Date("2026-11-05T23:00:00Z")), false); // 06:00 WIB
  assert.equal(isQuietHour(new Date("2026-11-05T16:59:00Z")), false); // 23:59 WIB
});

test("subscriptions follow the latest account on a device and only the owner can remove one", async () => {
  await withDb(async (db) => {
    const ayu = await person(db, "ayu");
    const budi = await person(db, "budi");
    await saveSubscription(db, ayu, sub(1));
    await saveSubscription(db, budi, sub(1));
    assert.equal((await subscriptionsOf(db, ayu)).length, 0);
    assert.equal((await subscriptionsOf(db, budi)).length, 1);
    await removeSubscription(db, ayu, sub(1).endpoint);
    assert.equal((await subscriptionsOf(db, budi)).length, 1);
    await removeSubscription(db, budi, sub(1).endpoint);
    assert.equal((await subscriptionsOf(db, budi)).length, 0);
  });
});

test("invalid subscriptions are refused", async () => {
  await withDb(async (db) => {
    const ayu = await person(db, "ayu");
    await rejectsWith(saveSubscription(db, ayu, { endpoint: "http://insecure.example/x", keys: KEYS }), "BAD_REQUEST");
    await rejectsWith(saveSubscription(db, ayu, { endpoint: "bukan url", keys: KEYS }), "BAD_REQUEST");
    await rejectsWith(saveSubscription(db, ayu, { endpoint: sub(1).endpoint, keys: { p256dh: "", auth: "x" } }), "BAD_REQUEST");
    await rejectsWith(saveSubscription(db, ayu, { endpoint: sub(1).endpoint }), "BAD_REQUEST");
    await rejectsWith(saveSubscription(db, ayu, null), "BAD_REQUEST");
  });
});

test("delivery signs with VAPID, drops expired subscriptions, and survives other failures", async () => {
  await withDb(async (db) => {
    const ayu = await person(db, "ayu");
    for (const n of [1, 2, 3]) await saveSubscription(db, ayu, sub(n));
    const calls = [];
    const sender = async (subscription, payload, options) => {
      calls.push({ subscription, payload, options });
      if (subscription.endpoint === sub(2).endpoint) throw Object.assign(new Error("gone"), { statusCode: 410 });
      if (subscription.endpoint === sub(3).endpoint) throw Object.assign(new Error("boom"), { statusCode: 500 });
      return { statusCode: 201 };
    };
    const payload = checkInPayload("budi", TODAY);
    const result = await deliver(db, await subscriptionsOf(db, ayu), payload, sender);
    assert.deepEqual(result, { sent: 1, removed: 1, failed: 1 });
    assert.equal(calls.length, 3);
    assert.deepEqual(JSON.parse(calls[0].payload), payload);
    assert.equal(calls[0].options.TTL, 4 * 3600);
    assert.equal(calls[0].options.vapidDetails.publicKey, (await getVapidKeys(db)).publicKey);
    assert.deepEqual((await subscriptionsOf(db, ayu)).map((s) => s.endpoint).sort(), [sub(1).endpoint, sub(3).endpoint]);
    assert.deepEqual(await deliver(db, [], payload, sender), { sent: 0, removed: 0, failed: 0 });
  });
});

test("the check-in notification uses the fixed broadcast text and a per-person tag", () => {
  assert.deepEqual(checkInPayload("dinda", TODAY), {
    title: "🔥 dinda baru absen!",
    body: "dinda sudah absen hari ini, ayo segera menuju Pancong skrg!",
    url: "/feed",
    tag: "absen-dinda-2026-11-05",
  });
});
