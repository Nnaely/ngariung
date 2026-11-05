import { apiFetch } from "./api";

export type PushSupport = "supported" | "needs-install" | "unsupported";

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** iPhone hanya bisa menerima push dari aplikasi yang dipasang ke Home Screen. */
export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const capable = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (capable) return "supported";
  if (isIos() && !isStandalone()) return "needs-install";
  return "unsupported";
}

/**
 * Registrasi service worker yang ada, tanpa menunggu. `serviceWorker.ready`
 * tidak pernah selesai kalau registrasi gagal, jadi jangan dipakai di sini.
 */
async function currentRegistration(): Promise<ServiceWorkerRegistration | null> {
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

/** Tunggu service worker aktif, paling lama `timeoutMs`. */
async function activeRegistration(timeoutMs = 8000): Promise<ServiceWorkerRegistration | null> {
  const existing = await currentRegistration();
  if (existing?.active) return existing;
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== "supported") return null;
  const registration = await currentRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

/** Tutup notifikasi Ngariung yang masih menempel di notification center. */
export async function closeAppNotifications(): Promise<void> {
  const registration = "serviceWorker" in navigator ? await currentRegistration() : null;
  const list = registration ? await registration.getNotifications() : [];
  list.forEach((notification) => notification.close());
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Minta izin, berlangganan push, lalu daftarkan perangkat ini ke server. */
export async function enablePush(): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Izin notifikasi tidak diberikan.");
  const { publicKey } = await apiFetch<{ publicKey: string }>("/api/push/key");
  const registration = await activeRegistration();
  if (!registration) throw new Error("Aplikasi belum siap menerima notifikasi. Muat ulang halaman, lalu coba lagi.");
  let subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    // Langganan lama dengan kunci server lain tidak akan bisa dipakai.
    const current = subscription.options.applicationServerKey;
    const expected = urlBase64ToUint8Array(publicKey);
    const same = current && new Uint8Array(current).every((byte, i) => byte === expected[i]);
    if (!same) {
      await subscription.unsubscribe();
      subscription = null;
    }
  }
  subscription ??= await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  await apiFetch("/api/push/subscribe", { body: subscription.toJSON() });
}

/** Berhenti menerima push di perangkat ini. */
export async function disablePush(): Promise<void> {
  const subscription = await getPushSubscription();
  if (!subscription) return;
  await apiFetch("/api/push/unsubscribe", { body: { endpoint: subscription.endpoint } }).catch(() => undefined);
  await subscription.unsubscribe();
}

/** Kirim notifikasi contoh lewat server ke perangkat ini. */
export async function sendTestPush(): Promise<number> {
  const subscription = await getPushSubscription();
  const { sent } = await apiFetch<{ sent: number }>("/api/push/test", {
    body: { endpoint: subscription?.endpoint },
  });
  return sent;
}
