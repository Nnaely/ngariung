import { clearSessionCookie, ok, route, sessionToken } from "@/lib/server/http";
import { deleteSession } from "@/lib/server/accounts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = route(async ({ req, db }) => {
  await deleteSession(db, sessionToken(req));
  const res = ok({ ok: true });
  clearSessionCookie(res);
  return res;
});
