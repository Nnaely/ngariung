import { after } from "next/server";
import { ok, readJson, requireUserId, route } from "@/lib/server/http";
import { recordCheckIn, type CheckInInput } from "@/lib/server/checkins";
import { loadSnapshot } from "@/lib/server/snapshot";
import { checkInPayload, checkInRecipients, deliver, isQuietHour } from "@/lib/server/push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = route(async ({ req, db }) => {
  const userId = await requireUserId(req, db);
  const body = await readJson<CheckInInput | null>(req);
  const now = new Date();
  const outcome = await recordCheckIn(db, userId, body, now);
  const snapshot = await loadSnapshot(db, userId, now);

  // Kabari teman yang belum absen. Pengiriman berjalan setelah respons terkirim.
  let notified = 0;
  if (!isQuietHour(now)) {
    const recipients = await checkInRecipients(db, userId, outcome.date);
    notified = new Set(recipients.map((recipient) => recipient.userId)).size;
    if (recipients.length > 0) {
      const payload = checkInPayload(snapshot.me.user.username, outcome.date);
      after(async () => {
        const result = await deliver(db, recipients, payload);
        if (result.failed > 0) console.warn("[push] sebagian notifikasi gagal terkirim:", result);
      });
    }
  }

  return ok({ outcome, notified, snapshot });
});
