import type { ApiErrorBody } from "./api-types";

/** Error dari API dengan kode mesin dan pesan siap tampil. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiError("NETWORK", "Tidak ada koneksi. Coba lagi ya.", 0);
  }

  const data = (await res.json().catch(() => null)) as (T & Partial<ApiErrorBody>) | null;
  if (!res.ok) {
    throw new ApiError(
      data?.error ?? "SERVER_ERROR",
      data?.message ?? "Ada gangguan di server. Coba lagi sebentar lagi.",
      res.status,
    );
  }
  return data as T;
}
