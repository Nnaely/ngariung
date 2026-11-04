export type User = {
  email: string;
  username: string;
  emoji: string;
  color: string;
  /** Foto avatar (data URL, sudah dikompres). Kalau ada, menang atas emoji. */
  avatarUrl?: string;
};

export type CheckIn = {
  id: string;
  username: string;
  emoji: string;
  color: string;
  avatarUrl?: string;
  /** ISO timestamp */
  at: string;
  /** YYYY-MM-DD (Asia/Jakarta) */
  date: string;
  streak: number;
};

export type Friend = {
  username: string;
  emoji: string;
  color: string;
  streak: number;
  minutesAgo: number;
};
