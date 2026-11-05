"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { readLegacyProfile, useStore } from "@/lib/store";
import { ApiError, apiFetch } from "@/lib/api";
import {
  AVATAR_EMOJIS,
  CAMPUS_EMAIL_DOMAIN,
  avatarColorFor,
  isCampusEmail,
  isValidPin,
  normalizeCampusEmail,
  normalizeUsername,
  usernameError,
} from "@/lib/identity";
import { Avatar } from "@/components/Avatar";
import { CheckIcon, ChevronRightIcon, FlameIcon, GamepadIcon, UsersIcon } from "@/components/Icons";
import "@/components/onboarding.css";

const AVATAR_LABELS: Record<string, string> = {
  "🔥": "Api",
  "😎": "Kacamata hitam",
  "🌻": "Bunga matahari",
  "🐧": "Penguin",
  "🍓": "Stroberi",
  "⚡": "Petir",
  "🐱": "Kucing",
  "🎧": "Headphone",
  "🍊": "Jeruk",
  "🌙": "Bulan",
};

type Step = "email" | "pin" | "profile";

const digitsOnly = (value: string) => value.replace(/\D/g, "").slice(0, 6);

function PinField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  disabled,
  describedBy,
  invalid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  disabled: boolean;
  describedBy?: string;
  invalid: boolean;
}) {
  return (
    <>
      <label htmlFor={id} className="mb-2 block text-[11px] font-semibold text-fg/90">{label}</label>
      <input
        id={id} name={id} type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} required
        autoComplete={autoComplete} placeholder="••••••" value={value} disabled={disabled}
        aria-invalid={invalid} aria-describedby={describedBy}
        onChange={(event) => onChange(digitsOnly(event.target.value))}
        className="field w-full px-4 py-3.5 text-center text-[18px] tracking-[0.5em] text-fg outline-none placeholder:text-muted/50"
      />
    </>
  );
}

export default function LoginPage() {
  const { state, ready, login, register } = useStore();
  const router = useRouter();
  const emailInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [emoji, setEmoji] = useState(AVATAR_EMOJIS[0]);
  const [pin, setPin] = useState("");
  const [pinAgain, setPinAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && state.user) router.replace("/");
  }, [ready, state.user, router]);

  // Pengguna versi lama: isi otomatis dari profil yang dulu tersimpan di HP ini.
  useEffect(() => {
    const legacy = readLegacyProfile();
    if (!legacy) return;
    if (legacy.email) setEmail(legacy.email);
    if (legacy.username) setUsername(legacy.username);
    if (legacy.emoji && AVATAR_EMOJIS.includes(legacy.emoji)) setEmoji(legacy.emoji);
  }, []);

  const color = avatarColorFor(emoji);
  const fail = (err: unknown) => setError(err instanceof ApiError ? err.message : "Ada gangguan. Coba lagi ya.");

  const submitEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const value = normalizeCampusEmail(email);
    if (!value) return setError("Isi email kampusmu dulu ya.");
    if (!value.includes("@")) return setError("Format email belum benar.");
    if (!isCampusEmail(value)) return setError(`Pakai email @${CAMPUS_EMAIL_DOMAIN} untuk bergabung, ya.`);
    setEmail(value);
    setError(null);
    setBusy(true);
    try {
      const { exists } = await apiFetch<{ exists: boolean }>("/api/auth/check-email", { body: { email: value } });
      setPin("");
      setPinAgain("");
      setStep(exists ? "pin" : "profile");
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const submitPin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (!isValidPin(pin)) return setError("PIN terdiri dari 6 angka.");
    setError(null);
    setBusy(true);
    try {
      await login(email, pin);
      router.replace("/");
    } catch (err) {
      setPin("");
      fail(err);
      setBusy(false);
    }
  };

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const value = normalizeUsername(username);
    const problem = usernameError(value);
    if (problem) return setError(problem);
    if (!isValidPin(pin)) return setError("Buat PIN 6 angka untuk masuk di HP lain.");
    if (pin !== pinAgain) return setError("PIN dan ulangan PIN belum sama.");
    setError(null);
    setBusy(true);
    try {
      await register({ email, username: value, emoji, pin });
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_TAKEN") {
        setPin("");
        setStep("pin");
      }
      fail(err);
      setBusy(false);
    }
  };

  const goBack = () => {
    setStep("email");
    setError(null);
    requestAnimationFrame(() => emailInput.current?.focus({ preventScroll: true }));
  };

  const errorText = error && <p id="login-error" role="alert" className="onboarding-error mt-3 text-[12px] leading-relaxed text-danger">{error}</p>;
  const emailChip = (
    <div className="mb-4 flex items-center gap-2 rounded-[12px] border border-line bg-white/[0.02] px-3 py-2.5">
      <CheckIcon className="h-3.5 w-3.5 shrink-0 text-mint" />
      <span className="truncate text-[11px] text-fg/80">{email}</span>
      <button type="button" disabled={busy} onClick={goBack} className="ml-auto shrink-0 text-[11px] font-semibold text-flame">Ganti</button>
    </div>
  );
  const submitLabel = (idle: string) =>
    busy ? <><span className="spinner h-4 w-4 rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />Sebentar…</> : <>{idle} <ChevronRightIcon className="h-4 w-4" /></>;

  return (
    <main className={`onboarding ${step !== "email" ? "onboarding--profile" : ""}`}>
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

      <section className="onboarding-card" aria-label="Masuk atau daftar Ngariung">
        <ol className="onboarding-steps" aria-label="Langkah masuk">
          <li aria-current={step === "email" ? "step" : undefined} data-complete={step !== "email"}>
            <span>{step !== "email" ? <CheckIcon className="h-3 w-3" /> : "1"}</span>Email kampus
          </li>
          <li aria-current={step !== "email" ? "step" : undefined}><span>2</span>{step === "pin" ? "Masukkan PIN" : "Profil kamu"}</li>
        </ol>

        <div key={step} className="onboarding-step">
          {step === "email" && (
            <form noValidate onSubmit={submitEmail} aria-busy={busy}>
              <h2 className="text-[19px] font-bold tracking-tight">Yuk, gabung dulu.</h2>
              <p id="email-hint" className="mb-5 mt-1 text-[11.5px] leading-relaxed text-muted">Gunakan email @{CAMPUS_EMAIL_DOMAIN}.</p>
              <label htmlFor="email" className="mb-2 block text-[11px] font-semibold text-fg/90">Email kampus</label>
              <input
                ref={emailInput} id="email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
                placeholder={`nama@${CAMPUS_EMAIL_DOMAIN}`} value={email} required disabled={busy}
                aria-invalid={!!error} aria-describedby={`email-hint${error ? " login-error" : ""}`}
                onChange={(event) => { setEmail(event.target.value); setError(null); }}
                className="field w-full px-4 py-3.5 text-[15px] text-fg outline-none placeholder:text-muted/60"
              />
              {errorText}
              <button type="submit" disabled={busy || !ready} className="btn-accent onboarding-continue mt-4 flex w-full items-center justify-center gap-2 py-3.5 text-[14px] disabled:opacity-60">
                {submitLabel("Lanjut")}
              </button>
              <p className="mt-3 text-center text-[10px] leading-relaxed text-muted">Sudah punya akun? Masukkan email yang sama.</p>
            </form>
          )}

          {step === "pin" && (
            <form noValidate onSubmit={submitPin} aria-busy={busy}>
              <h2 className="text-[19px] font-bold tracking-tight">Selamat datang lagi!</h2>
              <p id="pin-hint" className="mb-5 mt-1 text-[11.5px] leading-relaxed text-muted">Masukkan PIN 6 angka yang kamu buat saat daftar.</p>
              {emailChip}
              <PinField id="pin" label="PIN" value={pin} onChange={(value) => { setPin(value); setError(null); }} autoComplete="current-password" disabled={busy} invalid={!!error} describedBy={`pin-hint${error ? " login-error" : ""}`} />
              {errorText}
              <button type="submit" disabled={busy || !ready} className="btn-accent onboarding-continue mt-5 flex w-full items-center justify-center gap-2 py-3.5 text-[14px] disabled:opacity-60">
                {submitLabel("Masuk")}
              </button>
              <p className="mt-3 text-center text-[10px] leading-relaxed text-muted">Lupa PIN? Minta admin Ngariung untuk mengaturnya ulang.</p>
            </form>
          )}

          {step === "profile" && (
            <form noValidate onSubmit={submitProfile} aria-busy={busy}>
              <div className="mb-5 flex items-center gap-3">
                <span key={emoji} className="onboarding-avatar-preview"><Avatar emoji={emoji} color={color} size={44} /></span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[18px] font-bold tracking-tight">{username ? `Hai, ${username}!` : "Biar teman mengenalimu."}</h2>
                  <p className="mt-0.5 text-[11px] text-muted">Pilih nama, avatar, dan PIN-mu.</p>
                </div>
              </div>
              {emailChip}
              <label htmlFor="username" className="mb-2 block text-[11px] font-semibold text-fg/90">Username</label>
              <div className="field flex items-center gap-1.5 px-4">
                <span className="text-[15px] text-muted" aria-hidden="true">@</span>
                <input
                  id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required
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
                  {AVATAR_EMOJIS.map((item) => (
                    <button
                      key={item} type="button" onClick={() => setEmoji(item)} aria-label={`Avatar ${AVATAR_LABELS[item] ?? item}`} aria-pressed={emoji === item}
                      className={`onboarding-avatar grid h-11 place-items-center rounded-[12px] border text-[19px] ${emoji === item ? "border-flame/70 bg-flame/10" : "border-line bg-panel"}`}
                    >{item}</button>
                  ))}
                </div>
              </fieldset>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div><PinField id="new-pin" label="Buat PIN" value={pin} onChange={(value) => { setPin(value); setError(null); }} autoComplete="new-password" disabled={busy} invalid={!!error} describedBy="pin-new-hint" /></div>
                <div><PinField id="new-pin-again" label="Ulangi PIN" value={pinAgain} onChange={(value) => { setPinAgain(value); setError(null); }} autoComplete="new-password" disabled={busy} invalid={!!error} describedBy="pin-new-hint" /></div>
              </div>
              <p id="pin-new-hint" className="mt-2 text-[10.5px] text-muted">6 angka. Dipakai untuk masuk dari HP lain — jangan dibagikan.</p>
              {errorText}
              <button type="submit" disabled={busy || !ready} className="btn-accent onboarding-continue mt-5 flex w-full items-center justify-center gap-2 py-3.5 text-[14px] disabled:opacity-60">
                {submitLabel("Mulai nongkrong")}
              </button>
            </form>
          )}
        </div>
      </section>
      <p className="mt-5 text-center text-[10px] leading-relaxed text-muted/70">Akun, absen, dan streak tersimpan di server Ngariung.</p>
    </main>
  );
}
