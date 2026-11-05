import { ok, readJson, route } from "@/lib/server/http";
import { emailExists } from "@/lib/server/accounts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Apakah email sudah punya akun (menentukan langkah masuk vs daftar). */
export const POST = route(async ({ req, db }) => {
  const body = await readJson<{ email?: unknown } | null>(req);
  return ok({ exists: await emailExists(db, String(body?.email ?? "")) });
});
