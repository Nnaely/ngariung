import { ok, readJson, requireUserId, route } from "@/lib/server/http";
import { recordBattle, type BattleInput } from "@/lib/server/games";
import { loadSnapshot } from "@/lib/server/snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = route(async ({ req, db }) => {
  const userId = await requireUserId(req, db);
  const now = new Date();
  await recordBattle(db, userId, await readJson<BattleInput | null>(req), now);
  return ok({ snapshot: await loadSnapshot(db, userId, now) });
});
