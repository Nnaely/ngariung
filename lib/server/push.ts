import webpush, { type RequestOptions } from "web-push";
import type { Db } from "./sql.ts";
import { fail } from "./errors.ts";
import { broadcastBody, broadcastTitle } from "../streak.ts";
import { hourWIB } from "../format.ts";

type Env = Record<string, string | undefined>;
type PushKeys = { p256dh: string; auth: string };

export type PushSubscriptionInput = { endpoint: string; keys: PushKeys };
export type StoredSubscription = { endpoint: string; keys: PushKeys; userId: string };
export type PushPayload = { title: string; body: string; url: string; tag: string };
export type PushSender = (
  subscription: { endpoint: string; keys: PushKeys },
  payload: string,
  options: RequestOptions,
) => Promise<unknown>;
export type VapidKeys = { publicKey: string; privateKey: string };

/** Notifikasi tidak dikirim sebelum jam ini (WIB). */
export const QUIET_UNTIL_HOUR = 6;
/** Notifikasi yang tertunda lebih dari ini sudah tidak relevan. */
const TTL_SECONDS = 4 * 3600;
const VAPID_LOCK = 7262782;
const BASE64URL = /^[A-Za-z0-9_-]+={0,2}$/;

/**
 * Layanan push milik browser (Chrome/Android, Firefox, Safari, Edge). Endpoint
 * lain ditolak supaya server tidak bisa disuruh mengirim request ke alamat sembarang.
 */
const PUSH_HOSTS = new Set(["fcm.googleapis.com", "android.googleapis.com", "updates.push.services.mozilla.com"]);
const PUSH_HOST_SUFFIXES = [".push.apple.com", ".notify.windows.com"];

function isPushServiceHost(hostname: string): boolean {
  return PUSH_HOSTS.has(hostname) || PUSH_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

export function isQuietHour(now: Date): boolean {
  return hourWIB(now) < QUIET_UNTIL_HOUR;
}

export function vapidSubject(env: Env = process.env): string {
  const subject = env.VAPID_SUBJECT?.trim();
  if (subject) return subject;
  const host = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (host) return `https://${host}`;
  return "mailto:admin@ikamasu.ac.id";
}

const storedKeys = new WeakMap<Db, Promise<VapidKeys>>();

async function readStoredKeys(db: Db): Promise<Partial<VapidKeys>> {
  const { rows } = await db.query<{ key: string; value: string }>(
    "select key, value from app_config where key in ('vapid_public', 'vapid_private')",
  );
  const map = new Map(rows.map((row) => [row.key, row.value]));
  return { publicKey: map.get("vapid_public"), privateKey: map.get("vapid_private") };
}

async function loadOrCreateKeys(db: Db): Promise<VapidKeys> {
  const existing = await readStoredKeys(db);
  if (existing.publicKey && existing.privateKey) return existing as VapidKeys;
  return db.transaction(async (tx) => {
    await tx.query(`select pg_advisory_xact_lock(${VAPID_LOCK})`);
    const again = await readStoredKeys(tx);
    if (again.publicKey && again.privateKey) return again as VapidKeys;
    const generated = webpush.generateVAPIDKeys();
    await tx.query("delete from app_config where key in ('vapid_public', 'vapid_private')");
    await tx.query("insert into app_config (key, value) values ('vapid_public', $1), ('vapid_private', $2)", [
      generated.publicKey,
      generated.privateKey,
    ]);
    return { publicKey: generated.publicKey, privateKey: generated.privateKey };
  });
}

/** Kunci VAPID dari env bila lengkap; kalau tidak, dibuat sekali dan disimpan di database. */
export function getVapidKeys(db: Db, env: Env = process.env): Promise<VapidKeys> {
  const publicKey = (env.VAPID_PUBLIC_KEY || env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)?.trim();
  const privateKey = env.VAPID_PRIVATE_KEY?.trim();
  if (publicKey && privateKey) return Promise.resolve({ publicKey, privateKey });

  let pending = storedKeys.get(db);
  if (!pending) {
    pending = loadOrCreateKeys(db);
    pending.catch(() => storedKeys.delete(db));
    storedKeys.set(db, pending);
  }
  return pending;
}

function invalidSubscription(): never {
  fail("BAD_REQUEST", "Langganan notifikasi tidak valid. Coba nyalakan ulang notifikasi.", 400);
}

export async function saveSubscription(
  db: Db,
  userId: string,
  input: PushSubscriptionInput | null | undefined,
): Promise<void> {
  const endpoint = input?.endpoint;
  const p256dh = input?.keys?.p256dh;
  const auth = input?.keys?.auth;
  if (typeof endpoint !== "string" || endpoint.length > 1000) invalidSubscription();
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    invalidSubscription();
  }
  if (url.protocol !== "https:" || !isPushServiceHost(url.hostname)) invalidSubscription();
  if (typeof p256dh !== "string" || p256dh.length > 200 || !BASE64URL.test(p256dh)) invalidSubscription();
  if (typeof auth !== "string" || auth.length > 100 || !BASE64URL.test(auth)) invalidSubscription();

  await db.query(
    `insert into push_subscriptions (endpoint, user_id, p256dh, auth) values ($1, $2, $3, $4)
     on conflict (endpoint) do update
       set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`,
    [endpoint, userId, p256dh, auth],
  );
}

export async function removeSubscription(db: Db, userId: string, endpoint: unknown): Promise<void> {
  if (typeof endpoint !== "string") return;
  await db.query("delete from push_subscriptions where endpoint = $1 and user_id = $2", [endpoint, userId]);
}

type SubscriptionRow = { endpoint: string; p256dh: string; auth: string; user_id: string };

function toStored(row: SubscriptionRow): StoredSubscription {
  return { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth }, userId: row.user_id };
}

export async function subscriptionsOf(db: Db, userId: string): Promise<StoredSubscription[]> {
  const { rows } = await db.query<SubscriptionRow>(
    "select endpoint, p256dh, auth, user_id from push_subscriptions where user_id = $1",
    [userId],
  );
  return rows.map(toStored);
}

/** Perangkat milik orang lain yang belum absen pada `today`. */
export async function checkInRecipients(db: Db, actorId: string, today: string): Promise<StoredSubscription[]> {
  const { rows } = await db.query<SubscriptionRow>(
    `select s.endpoint, s.p256dh, s.auth, s.user_id
       from push_subscriptions s
      where s.user_id <> $1
        and not exists (
          select 1 from check_ins c where c.user_id = s.user_id and c.local_date = $2::date
        )`,
    [actorId, today],
  );
  return rows.map(toStored);
}

export function checkInPayload(username: string, date: string): PushPayload {
  return {
    title: broadcastTitle(username),
    body: broadcastBody(username),
    url: "/feed",
    tag: `absen-${username}-${date}`,
  };
}

const defaultSender: PushSender = (subscription, payload, options) =>
  webpush.sendNotification(subscription, payload, options);

/**
 * Kirim satu payload ke banyak langganan. Langganan yang sudah mati (404/410)
 * dihapus; kegagalan lain dihitung tanpa menghentikan pengiriman lain.
 */
export async function deliver(
  db: Db,
  subscriptions: readonly StoredSubscription[],
  payload: PushPayload,
  sender: PushSender = defaultSender,
): Promise<{ sent: number; removed: number; failed: number }> {
  const result = { sent: 0, removed: 0, failed: 0 };
  if (subscriptions.length === 0) return result;

  const keys = await getVapidKeys(db);
  const options: RequestOptions = {
    vapidDetails: { subject: vapidSubject(), publicKey: keys.publicKey, privateKey: keys.privateKey },
    TTL: TTL_SECONDS,
    urgency: "high",
  };
  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await sender({ endpoint: subscription.endpoint, keys: subscription.keys }, body, options);
        result.sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number } | null)?.statusCode;
        if (status === 404 || status === 410) {
          await db.query("delete from push_subscriptions where endpoint = $1", [subscription.endpoint]);
          result.removed += 1;
        } else {
          result.failed += 1;
        }
      }
    }),
  );
  return result;
}
