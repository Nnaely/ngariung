import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "./pool.ts";
import type { Db } from "./sql.ts";
import { fail, type ServiceError } from "./errors.ts";
import { sessionUserId } from "./accounts.ts";

export const SESSION_COOKIE = "ngariung_session";
const SESSION_MAX_AGE_S = 400 * 24 * 3600;

export type RouteContext = { req: NextRequest; db: Db; params: Record<string, string> };
// Next.js memeriksa argumen kedua harus cocok dengan `{ params: Promise<SegmentParams> }`
// milik setiap route, jadi tipenya dibuat longgar di sini dan disaring saat dipakai.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteArgs = { params: Promise<any> };

/** Respons JSON yang tidak boleh di-cache. */
export function ok(data: unknown, init: { status?: number } = {}): NextResponse {
  return NextResponse.json(data, { status: init.status ?? 200, headers: { "Cache-Control": "no-store" } });
}

export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function sessionToken(req: NextRequest): string | undefined {
  return req.cookies.get(SESSION_COOKIE)?.value;
}

/** Tolak permintaan pengubah data yang datang dari situs lain. */
export function assertSameOrigin(req: NextRequest): void {
  const origin = req.headers.get("origin");
  if (!origin) return;
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    // ditangani di bawah
  }
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!originHost || originHost !== host) fail("FORBIDDEN", "Permintaan ditolak.", 403);
}

export async function readJson<T>(req: NextRequest): Promise<T> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().includes("application/json")) fail("BAD_REQUEST", "Format permintaan tidak dikenal.", 400);
  try {
    return (await req.json()) as T;
  } catch {
    fail("BAD_REQUEST", "Format permintaan tidak dikenal.", 400);
  }
}

export async function requireUserId(req: NextRequest, db: Db): Promise<string> {
  const userId = await sessionUserId(db, sessionToken(req));
  if (!userId) fail("UNAUTHORIZED", "Sesi berakhir. Masuk lagi, ya.", 401);
  return userId;
}

function errorResponse(error: unknown): NextResponse {
  const name = error instanceof Error ? error.name : "";
  if (name === "ServiceError") {
    const known = error as ServiceError;
    const res = ok({ error: known.code, message: known.message }, { status: known.status });
    if (known.code === "UNAUTHORIZED") clearSessionCookie(res);
    return res;
  }
  if (name === "DbNotConfiguredError") {
    return ok(
      { error: "DB_NOT_CONFIGURED", message: "Server belum siap. Database belum disambungkan." },
      { status: 503 },
    );
  }
  console.error("[api] kesalahan tak terduga:", error);
  return ok({ error: "SERVER_ERROR", message: "Ada gangguan di server. Coba lagi sebentar lagi." }, { status: 500 });
}

/**
 * Pembungkus Route Handler: cek origin untuk permintaan pengubah data,
 * siapkan database, dan ubah error menjadi JSON `{ error, message }`.
 */
export function route(handler: (ctx: RouteContext) => Promise<Response>) {
  return async (req: NextRequest, args: RouteArgs): Promise<Response> => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") assertSameOrigin(req);
      const raw: Record<string, unknown> = (await args?.params) ?? {};
      const params = Object.fromEntries(
        Object.entries(raw).flatMap(([key, value]) => (typeof value === "string" ? [[key, value]] : [])),
      );
      const db = await getDb();
      return await handler({ req, db, params });
    } catch (error) {
      return errorResponse(error);
    }
  };
}
