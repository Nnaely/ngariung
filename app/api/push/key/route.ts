import { ok, requireUserId, route } from "@/lib/server/http";
import { getVapidKeys } from "@/lib/server/push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = route(async ({ req, db }) => {
  await requireUserId(req, db);
  return ok({ publicKey: (await getVapidKeys(db)).publicKey });
});
