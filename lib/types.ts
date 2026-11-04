export type User = {
  email: string;
  username: string;
  emoji: string;
  color: string;
};

export type CheckIn = {
  id: string;
  username: string;
  emoji: string;
  color: string;
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
