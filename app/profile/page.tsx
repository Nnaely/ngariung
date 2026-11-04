"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Guard } from "@/components/Guard";
import { BottomNav } from "@/components/BottomNav";
import { Avatar } from "@/components/Avatar";
import {
  BellIcon,
  CheckIcon,
  FlameIcon,
  RotateIcon,
  SnowflakeIcon,
} from "@/components/Icons";
import { useStore } from "@/lib/store";
import { effectiveFreezes, FREEZES_PER_MONTH } from "@/lib/streak";
import { monthName, nextMonthStartLabel, todayWIB } from "@/lib/format";

const USERNAME_RE = /^[a-z0-9](?:[a-z0-9._]{1,18})[a-z0-9]$/;
const EMOJIS = ["🔥", "😎", "🌻", "🐧", "🍓", "⚡", "🐱", "🎧", "🍊", "🌙"];
const COLORS = ["#FF5A1F", "#FFB020", "#2EE6A8", "#FF4D6D", "#5AC8FA", "#A78BFA"];

export default function ProfilePage() {
  return (
    <Guard>
      <Profile />
    </Guard>
  );
}

function Profile() {
  const { state, update } = useStore();
  const router = useRouter();
  const user = state.user!;

  const [draft, setDraft] = useState(user.username);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  const mine = useMemo(
    () => state.checkIns.filter((c) => c.username === user.username),
    [state.checkIns, user.username],
  );

  const taken = useMemo(() => {
    const set = new Set(state.checkIns.map((c) => c.username));
    set.delete(user.username);
    return set;
  }, [state.checkIns, user.username]);

  const saveUsername = () => {
    const value = draft.trim().toLowerCase();
    if (value === user.username) return setSaved(false);
    if (value.length < 3) return setError("Minimal 3 karakter.");
    if (value.length > 20) return setError("Maksimal 20 karakter.");
    if (!USERNAME_RE.test(value))
      return setError("Hanya huruf kecil, angka, titik, underscore.");
    if (taken.has(value)) return setError("Username itu sudah dipakai.");

    const previous = user.username;
    update((s) => ({
      ...s,
      user: s.user ? { ...s.user, username: value } : s.user,
      checkIns: s.checkIns.map((c) =>
        c.username === previous ? { ...c, username: value } : c,
      ),
    }));
    setDraft(value);
    setError(null);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const pickEmoji = (emoji: string) => {
    const color = COLORS[EMOJIS.indexOf(emoji) % COLORS.length];
    update((s) => ({
      ...s,
      user: s.user ? { ...s.user, emoji, color } : s.user,
    }));
  };

  const enableNotifications = async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      new Notification("Ngariung aktif", {
        body: "Kamu akan dapat kabar saat temanmu absen di Pancong.",
        icon: "/icons/icon-192.png",
      });
    }
  };

  const resetDemo = () => {
    if (!window.confirm("Hapus semua data di perangkat ini?")) return;
    window.localStorage.removeItem("ngariung.v1");
    window.location.href = "/login";
  };

  const logout = () => {
    update((s) => ({ ...s, user: null }));
    router.replace("/login");
  };

  return (
    <>
      <main className="px-5 pb-32 pt-9">
        <header className="card flex flex-col items-center px-5 py-7">
          <Avatar emoji={user.emoji} color={user.color} size={82} />
          <h1 className="mt-3 text-[22px] font-extrabold tracking-[-0.02em]">
            {user.username}
          </h1>
          <p className="text-[11.5px] text-muted">{user.email}</p>
          <div className="mt-4 flex items-center gap-1.5 rounded-full bg-flame/12 px-3 py-1.5 text-[11.5px] font-bold text-flame">
            <FlameIcon className="h-3.5 w-3.5" />
            {state.streak.current} hari berturut-turut
          </div>
        </header>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {[
            { label: "Streak", value: state.streak.current },
            { label: "Terbaik", value: state.streak.longest },
            {
              label: "Total absen",
              value: Math.max(mine.length, state.streak.current),
            },
          ].map((s) => (
            <div key={s.label} className="card px-3 py-3.5 text-center">
              <p className="tabular text-[22px] font-black leading-none">
                {s.value}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <div className="card mt-3 flex items-center gap-2.5 px-4 py-3">
          <SnowflakeIcon className="h-4 w-4 text-ice" />
          <p className="flex-1 text-[11px] text-muted">
            Freeze {monthName(todayWIB())}{" "}
            <b className="font-semibold text-fg">
              {effectiveFreezes(state.streak, todayWIB())}/{FREEZES_PER_MONTH}
            </b>
          </p>
          <span className="text-[9.5px] text-muted/60">
            reset {nextMonthStartLabel(todayWIB())}
          </span>
        </div>

        <section className="mt-8">
          <h2 className="eyebrow">Username</h2>
          <div className="field mt-3 flex items-center gap-1.5 px-4">
            <span className="text-[14px] text-muted">@</span>
            <input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value.toLowerCase().replace(/\s/g, ""));
                setError(null);
                setSaved(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && saveUsername()}
              spellCheck={false}
              autoComplete="off"
              className="w-full bg-transparent py-3 text-[14px] outline-none"
            />
            {saved && <CheckIcon className="h-4 w-4 text-mint" />}
          </div>
          {error && (
            <p role="alert" className="mt-2 text-[11.5px] text-danger">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={saveUsername}
            className="btn-quiet mt-3 w-full py-2.5 text-[12.5px]"
          >
            Simpan
          </button>
        </section>

        <section className="mt-8">
          <h2 className="eyebrow">Avatar</h2>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => pickEmoji(e)}
                aria-pressed={user.emoji === e}
                className={`grid h-11 place-items-center rounded-[12px] border text-[19px] transition ${
                  user.emoji === e
                    ? "border-flame/70 bg-flame/10"
                    : "border-line"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="eyebrow">Pengaturan</h2>
          <div className="mt-3 divide-y divide-line border-y border-line">
            <button
              type="button"
              onClick={enableNotifications}
              className="flex w-full items-center gap-3 py-3.5 text-left"
            >
              <BellIcon className="h-4 w-4 text-muted" />
              <span className="flex-1 text-[12.5px]">Notifikasi</span>
              <span
                className={`text-[10.5px] ${
                  permission === "granted" ? "text-mint" : "text-muted"
                }`}
              >
                {permission === "granted"
                  ? "aktif"
                  : permission === "denied"
                    ? "diblokir"
                    : permission === "unsupported"
                      ? "tidak didukung"
                      : "ketuk untuk aktifkan"}
              </span>
            </button>

            <button
              type="button"
              onClick={resetDemo}
              className="flex w-full items-center gap-3 py-3.5 text-left"
            >
              <RotateIcon className="h-4 w-4 text-muted" />
              <span className="flex-1 text-[12.5px]">Hapus data perangkat</span>
            </button>

            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-3 py-3.5 text-left"
            >
              <span className="grid h-4 w-4 place-items-center text-muted">→</span>
              <span className="flex-1 text-[12.5px] text-danger">Keluar</span>
            </button>
          </div>
        </section>

        <p className="mt-8 flex items-center justify-center gap-1.5 text-[9.5px] text-muted/50">
          <FlameIcon className="h-3 w-3" />
          Ngariung v0.2 · data lokal
        </p>
      </main>

      <BottomNav />
    </>
  );
}
