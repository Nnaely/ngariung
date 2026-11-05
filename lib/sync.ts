import type { CheckIn } from "./types.ts";

/** Jeda polling snapshot saat aplikasi terbuka. */
export const POLL_MS = 30_000;
/** Berhenti polling kalau tidak ada interaksi selama ini (hemat database). */
export const IDLE_MS = 300_000;

/** Absen teman yang baru muncul di antara dua snapshot. */
export function newFriendCheckIns(prev: readonly CheckIn[], next: readonly CheckIn[], me: string): CheckIn[] {
  const seen = new Set(prev.map((checkIn) => checkIn.id));
  return next.filter((checkIn) => !seen.has(checkIn.id) && checkIn.username !== me);
}

export function shouldPoll({ visible, now, lastInteraction }: { visible: boolean; now: number; lastInteraction: number }): boolean {
  return visible && now - lastInteraction <= IDLE_MS;
}
