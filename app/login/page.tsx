"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Avatar } from "@/components/Avatar";

const EMAIL_RE = /^[^@\s]+@polban\.ac\.id$/i;
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9._]{1,18})[a-z0-9]$/;
const RESERVED = ["admin", "ngariung", "polban", "mancong", "root", "support"];

const EMOJIS = ["🔥", "😎", "🌻", "🐧", "🍓", "⚡", "🐱", "🎧", "🍊", "🌙"];
const COLORS = [
  "#FF5A1F",
  "#FFB020",
  "#2EE6A8",
  "#FF4D6D",
  "#5AC8FA",
  "#A78BFA",
];

export default function LoginPage() {
  const { state, ready, update } = useStore();
  const router = useRouter();

  const [step, setStep] = useState<"email" | "username">("email");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && state.user) router.replace("/");
  }, [ready, state.user, router]);

  const taken = useMemo(
    () => new Set(state.checkIns.map((c) => c.username)),
    [state.checkIns],
  );

  const submitEmail = () => {
    const value = email.trim().toLowerCase();
    if (!value) return setError("Isi email kampusmu dulu ya.");
    if (!value.includes("@")) return setError("Format email belum benar.");
    if (!EMAIL_RE.test(value))
      return setError(
        "Ngariung cuma untuk mahasiswa Polban. Pakai email @polban.ac.id ya.",
      );
    setError(null);
    setStep("username");
  };

  const submitUsername = () => {
    const value = username.trim().toLowerCase();
    if (value.length < 3) return setError("Minimal 3 karakter.");
    if (value.length > 20) return setError("Maksimal 20 karakter.");
    if (!USERNAME_RE.test(value))
      return setError(
        "Hanya huruf kecil, angka, titik, dan underscore. Tidak boleh diawali/diakhiri tanda.",
      );
    if (RESERVED.includes(value))
      return setError("Username ini disimpan untuk sistem. Coba yang lain.");
    if (taken.has(value))
      return setError("Username itu sudah dipakai. Coba yang lain.");

    setError(null);
    setBusy(true);
    const color = COLORS[EMOJIS.indexOf(emoji) % COLORS.length];
    setTimeout(() => {
      update((s) => ({
        ...s,
        user: { email: email.trim().toLowerCase(), username: value, emoji, color },
      }));
      router.replace("/");
    }, 380);
  };

  return (
    <div className="flex min-h-dvh flex-col px-6 pb-8 pt-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt=""
            className="h-8 w-8 rounded-[10px]"
          />
          <span className="text-[15px] font-semibold tracking-tight">
            Ngariung
          </span>
        </div>
        <span className="rounded-full border border-line px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted">
          Demo
        </span>
      </header>

      <div className="flex flex-1 flex-col justify-center py-8">
        <p className="eyebrow">Absen harian · Polban</p>
        <h1 className="mt-3 text-[40px] font-bold leading-[1.02] tracking-[-0.045em]">
          Absen dulu,
          <br />
          <span className="text-flame">nongkrong nanti.</span>
        </h1>
        <p className="mt-4 max-w-[320px] text-[13.5px] leading-relaxed text-muted">
          Kumpulkan streak dan dapatkan ranking. Cuma buat mahasiswa dengan email
          kampus.
        </p>
      </div>

      <div>
        {step === "email" ? (
          <>
            <label
              htmlFor="email"
              className="eyebrow mb-2 block"
            >
              Email kampus
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="nama@polban.ac.id"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && submitEmail()}
              className="field w-full px-4 py-3.5 text-[15px] text-fg outline-none placeholder:text-muted/60"
            />
            {error && (
              <p role="alert" className="mt-3 text-[12.5px] leading-snug text-danger">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={submitEmail}
              className="btn-accent mt-5 w-full py-3.5 text-[14.5px]"
            >
              Lanjut
            </button>
            <p className="mt-3.5 text-center text-[11px] leading-relaxed text-muted">
              Hanya <span className="text-fg/80">@polban.ac.id</span> yang bisa
              masuk. Domain lain otomatis ditolak.
            </p>
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2.5 rounded-[14px] border border-line px-3 py-2.5">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-mint/10 text-[11px] text-mint">
                ✓
              </span>
              <span className="truncate text-[12.5px] text-fg/90">{email}</span>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setError(null);
                }}
                className="ml-auto text-[11px] font-medium text-muted underline-offset-2 hover:underline"
              >
                ganti
              </button>
            </div>

            <label htmlFor="username" className="eyebrow mb-2 block">
              Pilih username
            </label>
            <div className="field flex items-center gap-1.5 px-4">
              <span className="text-[15px] text-muted">@</span>
              <input
                id="username"
                autoFocus
                autoComplete="off"
                spellCheck={false}
                placeholder="usernamekamu"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/\s/g, ""));
                  setError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && submitUsername()}
                className="w-full bg-transparent py-3.5 text-[15px] text-fg outline-none placeholder:text-muted/60"
              />
            </div>
            <p className="mt-2 text-[10.5px] text-muted">
              Bisa diganti kapan saja setelah masuk.
            </p>

            <p className="eyebrow mb-2 mt-5">Avatar</p>
            <div className="grid grid-cols-5 gap-2">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  aria-pressed={emoji === e}
                  className={`grid h-11 place-items-center rounded-[12px] border text-[19px] transition ${
                    emoji === e
                      ? "border-flame/70 bg-flame/10"
                      : "border-line bg-panel"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>

            {error && (
              <p role="alert" className="mt-3.5 text-[12.5px] leading-snug text-danger">
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={submitUsername}
              className="btn-accent mt-5 w-full py-3.5 text-[14.5px] disabled:opacity-60"
            >
              {busy ? "Menyiapkan…" : "Masuk"}
            </button>
          </>
        )}
      </div>

      {state.checkIns.length > 0 && (
        <div className="mt-7 flex items-center justify-center gap-2.5">
          <div className="flex -space-x-2">
            {state.checkIns.slice(0, 4).map((c) => (
              <Avatar
                key={c.id}
                emoji={c.emoji}
                color={c.color}
                size={24}
                className="ring-2 ring-bg"
              />
            ))}
          </div>
          <p className="text-[10.5px] text-muted">
            <b className="text-fg">{state.checkIns.length}</b> orang sudah absen
            hari ini
          </p>
        </div>
      )}
    </div>
  );
}
