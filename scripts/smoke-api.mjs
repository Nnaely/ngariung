// Uji asap API terhadap server yang sedang berjalan:
//   node scripts/smoke-api.mjs http://localhost:3000
import assert from "node:assert/strict";

const BASE = process.argv[2] ?? "http://localhost:3000";
const HERE = { lat: -6.874474372696532, lng: 107.57563823965597, accuracy: 15 };
const id = Date.now().toString(36);

function client() {
  let cookie = "";
  return async (path, { method = "GET", body, origin } = {}) => {
    const headers = {};
    if (body !== undefined) headers["content-type"] = "application/json";
    if (cookie) headers.cookie = cookie;
    if (origin) headers.origin = origin;
    const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    for (const line of res.headers.getSetCookie()) {
      const [pair] = line.split(";");
      const [name, value] = pair.split("=");
      if (name === "ngariung_session") cookie = value ? `${name}=${value}` : "";
    }
    const data = (res.headers.get("content-type") ?? "").includes("json") ? await res.json() : null;
    return { status: res.status, data };
  };
}

const a = client();
const b = client();
const ayu = { email: `ayu.${id}@ikamasu.ac.id`, username: `ayu${id}`, emoji: "🔥", pin: "123456" };
const budi = { email: `budi.${id}@ikamasu.ac.id`, username: `budi${id}`, emoji: "🐧", pin: "654321" };

let r = await a("/api/state");
assert.equal(r.status, 401, "state without session");
r = await a("/api/auth/check-email", { method: "POST", body: { email: ayu.email } });
assert.deepEqual([r.status, r.data], [200, { exists: false }]);
r = await a("/api/auth/register", { method: "POST", body: ayu });
assert.equal(r.status, 201, JSON.stringify(r.data));
r = await b("/api/auth/register", { method: "POST", body: budi });
assert.equal(r.status, 201, JSON.stringify(r.data));
r = await b("/api/auth/register", { method: "POST", body: { ...budi, username: `x${id}` } });
assert.equal(r.data.error, "EMAIL_TAKEN");

r = await a("/api/check-in", { method: "POST", body: HERE });
assert.equal(r.status, 200, JSON.stringify(r.data));
assert.equal(r.data.outcome.streak, 1);
r = await a("/api/check-in", { method: "POST", body: HERE });
assert.equal(r.data.error, "ALREADY_CHECKED_IN");
r = await b("/api/check-in", { method: "POST", body: { ...HERE, lat: HERE.lat + 0.01 } });
assert.equal(r.data.error, "OUT_OF_RANGE");

r = await b("/api/state");
assert.ok(r.data.snapshot.checkIns.some((c) => c.username === ayu.username), "budi sees ayu in the feed");
assert.equal(r.data.snapshot.leaderboard.find((row) => row.username === ayu.username).streak, 1);

r = await a("/api/profile", { method: "PATCH", body: { username: `ayu${id}x` } });
assert.equal(r.status, 200, JSON.stringify(r.data));
r = await b("/api/state");
assert.ok(r.data.snapshot.checkIns.some((c) => c.username === `ayu${id}x`), "rename visible to others");

r = await a("/api/games/battle", { method: "POST", body: { game: "ttt", playerB: "lawan", winner: `ayu${id}x` } });
assert.equal(r.status, 200, JSON.stringify(r.data));
r = await a("/api/games/daily", { method: "POST", body: { game: "kata", solved: true } });
assert.equal(r.status, 200, JSON.stringify(r.data));
r = await a("/api/games/daily", { method: "POST", body: { game: "kata", solved: true } });
assert.equal(r.data.error, "ALREADY_PLAYED");

r = await a("/api/push/key");
assert.ok(r.data.publicKey.length > 80, "VAPID public key");
const endpoint = `https://fcm.googleapis.com/fcm/send/smoke-${id}`;
const keys = { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" };
r = await a("/api/push/subscribe", { method: "POST", body: { endpoint, keys } });
assert.equal(r.status, 200, JSON.stringify(r.data));
r = await a("/api/push/unsubscribe", { method: "POST", body: { endpoint } });
assert.equal(r.status, 200);

r = await a("/api/auth/check-email", { method: "POST", body: { email: ayu.email }, origin: "https://evil.example" });
assert.equal(r.status, 403, "foreign origin refused");

r = await a("/api/auth/logout", { method: "POST", body: {} });
assert.equal(r.status, 200);
r = await a("/api/state");
assert.equal(r.status, 401, "logged out");
r = await a("/api/auth/login", { method: "POST", body: { email: ayu.email, pin: "000000" } });
assert.equal(r.data.error, "INVALID_CREDENTIALS");
r = await a("/api/auth/login", { method: "POST", body: { email: ayu.email, pin: ayu.pin } });
assert.equal(r.status, 200, JSON.stringify(r.data));
assert.equal(r.data.snapshot.me.user.username, `ayu${id}x`);

console.log("SMOKE OK");
