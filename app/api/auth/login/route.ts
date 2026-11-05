import { ok, readJson, route, setSessionCookie } from "@/lib/server/http";
import { createSession, loginUser } from "@/lib/server/accounts";
import { loadSnapshot } from "@/lib/server/snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = route(async ({ req, db }) => {
  const body = await readJson<{ email?: unknown; pin?: unknown } | null>(req);
  const now = new Date();
  const userId = await loginUser(db, String(body?.email ?? ""), String(body?.pin ?? ""), now);
  const token = await createSession(db, userId, req.headers.get("user-agent"));
  const res = ok({ snapshot: await loadSnapshot(db, userId, now) });
  setSessionCookie(res, token);
  return res;
});
