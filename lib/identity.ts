/** Aturan akun yang dipakai bersama oleh halaman dan server. */
export const CAMPUS_EMAIL_DOMAIN = "ikamasu.ac.id";

export function normalizeCampusEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isCampusEmail(value: string): boolean {
  return /^[^@\s]+@ikamasu\.ac\.id$/i.test(normalizeCampusEmail(value));
}

export const USERNAME_RE = /^[a-z0-9](?:[a-z0-9._]{1,18})[a-z0-9]$/;
export const RESERVED_USERNAMES: readonly string[] = [
  "admin",
  "ngariung",
  "polban",
  "ikamasu",
  "pancong",
  "root",
  "support",
];

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

/** Pesan kesalahan untuk username yang sudah dinormalisasi, atau null bila valid. */
export function usernameError(value: string): string | null {
  if (value.length < 3) return "Minimal 3 karakter.";
  if (value.length > 20) return "Maksimal 20 karakter.";
  if (!USERNAME_RE.test(value))
    return "Pakai huruf kecil, angka, titik, atau underscore. Awali dan akhiri dengan huruf atau angka.";
  if (RESERVED_USERNAMES.includes(value)) return "Username ini disimpan untuk sistem. Coba yang lain.";
  return null;
}

/** PIN akun: tepat enam angka 0–9. */
export function isValidPin(value: string): boolean {
  return /^[0-9]{6}$/.test(value);
}

export const AVATAR_EMOJIS: readonly string[] = ["🔥", "😎", "🌻", "🐧", "🍓", "⚡", "🐱", "🎧", "🍊", "🌙"];
export const AVATAR_COLORS: readonly string[] = ["#FF5A1F", "#FFB020", "#2EE6A8", "#FF4D6D", "#5AC8FA", "#A78BFA"];

/** Warna latar avatar yang menyertai sebuah emoji. */
export function avatarColorFor(emoji: string): string {
  const index = AVATAR_EMOJIS.indexOf(emoji);
  return AVATAR_COLORS[(index < 0 ? 0 : index) % AVATAR_COLORS.length];
}
