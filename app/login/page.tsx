"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { CAMPUS_EMAIL_DOMAIN, isCampusEmail, normalizeCampusEmail } from "@/lib/identity";
import { Avatar } from "@/components/Avatar";
import { CheckIcon, ChevronRightIcon, FlameIcon, GamepadIcon, UsersIcon } from "@/components/Icons";
import "@/components/onboarding.css";

const USERNAME_RE = /^[a-z0-9](?:[a-z0-9._]{1,18})[a-z0-9]$/;
const RESERVED = ["admin", "ngariung", "polban", "ikamasu", "pancong", "root", "support"];
const AVATARS = [
  { emoji: "🔥", label: "Api" },
  { emoji: "😎", label: "Kacamata hitam" },
  { emoji: "🌻", label: "Bunga matahari" },
  { emoji: "🐧", label: "Penguin" },
  { emoji: "🍓", label: "Stroberi" },
  { emoji: "⚡", label: "Petir" },
  { emoji: "🐱", label: "Kucing" },
  { emoji: "🎧", label: "Headphone" },
  { emoji: "🍊", label: "Jeruk" },
  { emoji: "🌙", label: "Bulan" },
];
const COLORS = ["#FF5A1F", "#FFB020", "#2EE6A8", "#FF4D6D", "#5AC8FA", "#A78BFA"];

export default function LoginPage() {
  const { state, ready, update } = useStore();
  const router = useRouter();
  const usernameInput = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"email" | "username">("email");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [emoji, setEmoji] = useState(AVATARS[0].emoji);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && state.user) router.replace("/");
  }, [ready, state.user, router]);

  useEffect(() => {
    if (step === "username") usernameInput.current?.focus({ preventScroll: true });
  }, [step]);

  const taken = useMemo(() => new Set(state.checkIns.map((c) => c.username)), [state.checkIns]);
  const color = COLORS[AVATARS.findIndex((avatar) => avatar.emoji === emoji) % COLORS.length];

  const submitEmail = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = normalizeCampusEmail(email);
    if (!value) return setError("Isi email kampusmu dulu ya.");
    if (!value.includes("@")) return setError("Format email belum benar.");
    if (!isCampusEmail(value)) return setError(`Pakai email @${CAMPUS_EMAIL_DOMAIN} untuk bergabung, ya.`);
    setEmail(value);
    setError(null);
    setStep("username");
  };

  const submitUsername = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !ready) return;
    const value = username.trim().toLowerCase();
    if (value.length < 3) return setError("Minimal 3 karakter.");
    if (value.length > 20) return setError("Maksimal 20 karakter.");
    if (!USERNAME_RE.test(value)) return setError("Pakai huruf kecil, angka, titik, atau underscore. Awali dan akhiri dengan huruf atau angka.");
    if (RESERVED.includes(value)) return setError("Username ini disimpan untuk sistem. Coba yang lain.");
    if (taken.has(value)) return setError("Username itu sudah dipakai. Coba yang lain.");
    // Recheck the domain at the final submission, not only the first step.
    if (!isCampusEmail(email)) {
      setStep("email");
      return setError(`Gunakan email @${CAMPUS_EMAIL_DOMAIN}.`);
    }
    setError(null);
    setBusy(true);
    update((s) => ({ ...s, user: { email: normalizeCampusEmail(email), username: value, emoji, color } }));
    router.replace("/");
  };

  const goBack = () => {
    setStep("email");
    setError(null);
    requestAnimationFrame(() => emailInput.current?.focus({ preventScroll: true }));
  };

  return (
    <main className={`onboarding ${step === "username" ? "onboarding--profile" : ""}`}>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" width={32} height={32} className="rounded-[10px]" />
          <span className="text-[15px] font-semibold tracking-tight">Ngariung</span>
        </div>
      </header>

      <section className="onboarding-hero" aria-labelledby="welcome-title">
        <div className="onboarding-emblem" aria-hidden="true">
          <span className="onboarding-orbit onboarding-orbit--one" />
          <span className="onboarding-orbit onboarding-orbit--two" />
          <span className="onboarding-flame"><FlameIcon className="h-10 w-10" /></span>
          <span className="onboarding-spark onboarding-spark--one" />
          <span className="onboarding-spark onboarding-spark--two" />
        </div>
        <p className="eyebrow">Tempat cerita dimulai</p>
        <h1 id="welcome-title" className="mt-3 text-[38px] font-extrabold leading-[1.08] tracking-[-0.045em]">
          Ketemu di Pancong.<br /><span className="flame-text">Jaga apinya.</span>
        </h1>
        <p className="mt-3 max-w-[310px] text-[12.5px] leading-relaxed text-muted">
          Absen bareng, kumpulkan streak, dan bikin waktu nongkrong makin seru.
        </p>
        <div className="onboarding-benefits" aria-label="Fitur Ngariung">
          <span><FlameIcon className="h-3.5 w-3.5" />Jaga streak</span>
          <span><UsersIcon className="h-3.5 w-3.5" />Ketemu teman</span>
          <span><GamepadIcon className="h-3.5 w-3.5" />Main bareng</span>
        </div>
      </section>

      <section className="onboarding-card" aria-label="Daftar akun Ngariung">
        <ol className="onboarding-steps" aria-label="Langkah pendaftaran">
          <li aria-current={step === "email" ? "step" : undefined} data-complete={step === "username"}>
            <span>{step === "username" ? <CheckIcon className="h-3 w-3" /> : "1"}</span>Email kampus
          </li>
          <li aria-current={step === "username" ? "step" : undefined}><span>2</span>Profil kamu</li>
        </ol>

        <div key={step} className="onboarding-step">
          {step === "email" ? (
            <form noValidate onSubmit={submitEmail}>
              <h2 className="text-[19px] font-bold tracking-tight">Yuk, gabung dulu.</h2>
              <p id="email-hint" className="mb-5 mt-1 text-[11.5px] leading-relaxed text-muted">Gunakan email @{CAMPUS_EMAIL_DOMAIN}.</p>
              <label htmlFor="email" className="mb-2 block text-[11px] font-semibold text-fg/90">Email kampus</label>
              <input
                ref={emailInput} id="email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
                placeholder={`nama@${CAMPUS_EMAIL_DOMAIN}`} value={email} required
                aria-invalid={!!error} aria-describedby={`email-hint${error ? " login-error" : ""}`}
                onChange={(event) => { setEmail(event.target.value); setError(null); }}
                className="field w-full px-4 py-3.5 text-[15px] text-fg outline-none placeholder:text-muted/60"
              />
              {error && <p id="login-error" role="alert" className="onboarding-error mt-3 text-[12px] leading-relaxed text-danger">{error}</p>}
              <button type="submit" disabled={!ready} className="btn-accent onboarding-continue mt-4 flex w-full items-center justify-center gap-2 py-3.5 text-[14px] disabled:opacity-60">
                Lanjut <ChevronRightIcon className="h-4 w-4" />
              </button>
              <p className="mt-3 text-center text-[10px] leading-relaxed text-muted">Satu langkah lagi sebelum mulai nongkrong.</p>
            </form>
          ) : (
            <form noValidate onSubmit={submitUsername} aria-busy={busy}>
              <div className="mb-5 flex items-center gap-3">
                <span key={emoji} className="onboarding-avatar-preview"><Avatar emoji={emoji} color={color} size={44} /></span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[18px] font-bold tracking-tight">{username ? `Hai, ${username}!` : "Biar teman mengenalimu."}</h2>
                  <p className="mt-0.5 text-[11px] text-muted">Pilih nama dan avatar andalanmu.</p>
                </div>
              </div>
              <div className="mb-4 flex items-center gap-2 rounded-[12px] border border-line bg-white/[0.02] px-3 py-2.5">
                <CheckIcon className="h-3.5 w-3.5 shrink-0 text-mint" />
                <span className="truncate text-[11px] text-fg/80">{email}</span>
                <button type="button" disabled={busy} onClick={goBack} className="ml-auto shrink-0 text-[11px] font-semibold text-flame">Ganti</button>
              </div>
              <label htmlFor="username" className="mb-2 block text-[11px] font-semibold text-fg/90">Username</label>
              <div className="field flex items-center gap-1.5 px-4">
                <span className="text-[15px] text-muted" aria-hidden="true">@</span>
                <input
                  ref={usernameInput} id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required
                  placeholder="usernamekamu" value={username} maxLength={20} disabled={busy}
                  aria-invalid={!!error} aria-describedby={`username-hint${error ? " login-error" : ""}`}
                  onChange={(event) => { setUsername(event.target.value.toLowerCase().replace(/\s/g, "")); setError(null); }}
                  className="min-w-0 w-full bg-transparent py-3.5 text-[15px] text-fg outline-none placeholder:text-muted/60"
                />
              </div>
              <p id="username-hint" className="mt-2 text-[10.5px] text-muted">3–20 karakter. Bisa diganti nanti di Profil.</p>
              <fieldset className="mt-4" disabled={busy}>
                <legend className="mb-2 text-[11px] font-semibold text-fg/90">Pilih avatar</legend>
                <div className="grid grid-cols-5 gap-2">
                  {AVATARS.map((avatar) => (
                    <button
                      key={avatar.emoji} type="button" onClick={() => setEmoji(avatar.emoji)} aria-label={`Avatar ${avatar.label}`} aria-pressed={emoji === avatar.emoji}
                      className={`onboarding-avatar grid h-11 place-items-center rounded-[12px] border text-[19px] ${emoji === avatar.emoji ? "border-flame/70 bg-flame/10" : "border-line bg-panel"}`}
                    >{avatar.emoji}</button>
                  ))}
                </div>
              </fieldset>
              {error && <p id="login-error" role="alert" className="onboarding-error mt-3 text-[12px] leading-relaxed text-danger">{error}</p>}
              <button type="submit" disabled={busy || !ready} className="btn-accent onboarding-continue mt-5 flex w-full items-center justify-center gap-2 py-3.5 text-[14px] disabled:opacity-60">
                {busy ? <><span className="spinner h-4 w-4 rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />Menyiapkan…</> : <>Mulai nongkrong <ChevronRightIcon className="h-4 w-4" /></>}
              </button>
            </form>
          )}
        </div>
      </section>
      <p className="mt-5 text-center text-[10px] leading-relaxed text-muted/70">Data demo tersimpan di perangkat ini.</p>
    </main>
  );
}
