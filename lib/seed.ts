import type { CheckIn, Friend } from "./types";

/** Teman-teman demo — pengganti data dari Supabase. */
export const FRIENDS: Friend[] = [
  { username: "dinda", emoji: "🌻", color: "#FFB020", streak: 21, minutesAgo: 23 },
  { username: "adit", emoji: "🐧", color: "#5AC8FA", streak: 4, minutesAgo: 61 },
  { username: "nabila", emoji: "🍓", color: "#FF4D6D", streak: 8, minutesAgo: 95 },
  { username: "farhan", emoji: "🎧", color: "#A78BFA", streak: 2, minutesAgo: 140 },
  { username: "salsa", emoji: "🍊", color: "#FF8A3D", streak: 16, minutesAgo: 180 },
  { username: "bayu", emoji: "⚡", color: "#2EE6A8", streak: 6, minutesAgo: 240 },
  { username: "ghani", emoji: "🐱", color: "#F472B6", streak: 1, minutesAgo: 310 },
];

/** Absen demo untuk tanggal tertentu. */
export function seedCheckIns(today: string): CheckIn[] {
  const now = Date.now();
  return FRIENDS.map((f) => ({
    id: `seed-${today}-${f.username}`,
    username: f.username,
    emoji: f.emoji,
    color: f.color,
    at: new Date(now - f.minutesAgo * 60_000).toISOString(),
    date: today,
    streak: f.streak,
  }));
}
