/** Kesalahan yang sudah diketahui, dengan kode dan pesan untuk pengguna. */
export class ServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.status = status;
  }
}

export function fail(code: string, message: string, status: number): never {
  throw new ServiceError(code, message, status);
}

/** Nama constraint dari pelanggaran UNIQUE Postgres (kode 23505), atau null. */
export function uniqueViolation(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const { code, constraint } = error as { code?: unknown; constraint?: unknown };
  if (code !== "23505") return null;
  return typeof constraint === "string" ? constraint : "";
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
