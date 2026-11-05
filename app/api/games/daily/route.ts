import { ok, readJson, requireUserId, route } from "@/lib/server/http";
import { recordDaily, type DailyInput } from "@/lib/server/games";
import { loadSnapshot } from "@/lib/server/snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = route(async ({ req, db }) => {
  const userId = await requireUserId(req, db);
  const now = new Date();
  await recordDaily(db, userId, await readJson<DailyInput | null>(req), now);
  return ok({ snapshot: await loadSnapshot(db, userId, now) });
});
