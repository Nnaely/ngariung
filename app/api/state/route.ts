import { ok, requireUserId, route } from "@/lib/server/http";
import { loadSnapshot } from "@/lib/server/snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = route(async ({ req, db }) => {
  const userId = await requireUserId(req, db);
  return ok({ snapshot: await loadSnapshot(db, userId, new Date()) });
});
