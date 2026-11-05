import { ok, readJson, requireUserId, route } from "@/lib/server/http";
import { fail } from "@/lib/server/errors";
import { deliver, subscriptionsOf } from "@/lib/server/push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Kirim contoh notifikasi ke perangkat ini (atau semua perangkat milik akun). */
export const POST = route(async ({ req, db }) => {
  const userId = await requireUserId(req, db);
  const body = await readJson<{ endpoint?: unknown } | null>(req);
  const all = await subscriptionsOf(db, userId);
  const endpoint = body?.endpoint;
  const targets = typeof endpoint === "string" ? all.filter((s) => s.endpoint === endpoint) : all;
  if (targets.length === 0) fail("NO_SUBSCRIPTION", "Notifikasi belum aktif di perangkat ini.", 404);
  const result = await deliver(db, targets, {
    title: "🔔 Notifikasi Ngariung aktif",
    body: "Begini kabarnya kalau temanmu absen. Sampai ketemu di Pancong!",
    url: "/profile",
    tag: "ngariung-tes",
  });
  if (result.sent === 0) fail("PUSH_FAILED", "Notifikasi gagal dikirim. Coba matikan lalu nyalakan lagi.", 502);
  return ok({ sent: result.sent });
});
