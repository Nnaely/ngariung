import { ok, readJson, requireUserId, route } from "@/lib/server/http";
import { saveSubscription, type PushSubscriptionInput } from "@/lib/server/push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = route(async ({ req, db }) => {
  const userId = await requireUserId(req, db);
  await saveSubscription(db, userId, await readJson<PushSubscriptionInput | null>(req));
  return ok({ ok: true });
});
