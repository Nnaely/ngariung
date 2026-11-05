import { NextResponse } from "next/server";
import { route } from "@/lib/server/http";
import { getAvatar } from "@/lib/server/accounts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Foto profil. URL memuat versi (?v=), jadi aman di-cache selamanya. */
export const GET = route(async ({ db, params }) => {
  const avatar = await getAvatar(db, params.id ?? "");
  if (!avatar) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new NextResponse(new Uint8Array(avatar.bytes), {
    headers: {
      "Content-Type": avatar.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
