import { ok, readJson, route, setSessionCookie } from "@/lib/server/http";
import { createSession, registerUser, type RegisterInput } from "@/lib/server/accounts";
import { loadSnapshot } from "@/lib/server/snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = route(async ({ req, db }) => {
  const body = await readJson<Partial<RegisterInput> | null>(req);
  const userId = await registerUser(db, {
    email: String(body?.email ?? ""),
    username: String(body?.username ?? ""),
    emoji: String(body?.emoji ?? ""),
    pin: String(body?.pin ?? ""),
  });
  const token = await createSession(db, userId, req.headers.get("user-agent"));
  const res = ok({ snapshot: await loadSnapshot(db, userId, new Date()) }, { status: 201 });
  setSessionCookie(res, token);
  return res;
});
