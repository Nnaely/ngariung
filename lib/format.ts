const TZ = "Asia/Jakarta";

/** Tanggal hari ini di WIB, format YYYY-MM-DD. */
export function todayWIB(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

/** Geser tanggal YYYY-MM-DD sebanyak `days` hari. */
export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

/** Label tanggal 1 bulan berikutnya, mis. "1 Des". */
export function nextMonthStartLabel(date: string): string {
  const [y, m] = date.split("-").map(Number);
  const nextYear = m === 12 ? y + 1 : y;
  const nextMonth = m === 12 ? 1 : m + 1;
  const d = new Date(Date.UTC(nextYear, nextMonth - 1, 1));
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(d);
}

export function monthName(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function timeWIB(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(iso));
}

export function dayLabel(): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  }).format(new Date());
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} mnt lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

export function countdownToReset(): string {
  const now = new Date();
  const wib = new Date(now.toLocaleString("en-US", { timeZone: TZ }));
  const next = new Date(wib);
  next.setHours(24, 0, 0, 0);
  const diff = next.getTime() - wib.getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return `${h}j ${m}m`;
}
