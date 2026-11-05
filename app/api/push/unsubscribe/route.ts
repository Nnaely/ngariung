import { ok, readJson, requireUserId, route } from "@/lib/server/http";
import { removeSubscription } from "@/lib/server/push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = route(async ({ req, db }) => {
  const userId = await requireUserId(req, db);
  const body = await readJson<{ endpoint?: unknown } | null>(req);
  await removeSubscription(db, userId, body?.endpoint);
  return ok({ ok: true });
});
