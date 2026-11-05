import { ok, readJson, requireUserId, route } from "@/lib/server/http";
import { updateProfile, type ProfilePatch } from "@/lib/server/accounts";
import { loadSnapshot } from "@/lib/server/snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Field yang tidak dikirim = tidak berubah; `avatar: null` menghapus foto. */
export const PATCH = route(async ({ req, db }) => {
  const userId = await requireUserId(req, db);
  const body = (await readJson<ProfilePatch | null>(req)) ?? {};
  await updateProfile(db, userId, { username: body.username, emoji: body.emoji, avatar: body.avatar });
  return ok({ snapshot: await loadSnapshot(db, userId, new Date()) });
});
