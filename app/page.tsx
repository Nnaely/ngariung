"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Guard } from "@/components/Guard";
import { BottomNav } from "@/components/BottomNav";
import { Avatar } from "@/components/Avatar";
import { FeedRow } from "@/components/FeedRow";
import { Confetti } from "@/components/Confetti";
import {
  ArrowUpIcon,
  BellIcon,
  CheckIcon,
  LockIcon,
  MapPinIcon,
  SnowflakeIcon,
} from "@/components/Icons";
import { checkedInToday, todayCheckIns, useStore } from "@/lib/store";
import { nextFlameTier } from "@/lib/flame";
import { StreakFlame } from "@/components/StreakFlame";
import {
  applyCheckIn,
  broadcastBody,
  effectiveFreezes,
  FREEZES_PER_MONTH,
} from "@/lib/streak";
import {
  ACCURACY_MAX_M,
  PANCONG,
  RADIUS_M,
  bearingToPancong,
  cardinalDirection,
  distanceToPancong,
  formatDistance,
} from "@/lib/geo";
import {
  countdownToReset,
  dayLabel,
  nextMonthStartLabel,
  todayWIB,
} from "@/lib/format";
import type { CheckIn } from "@/lib/types";

type Coords = { lat: number; lng: number; accuracy: number };
type Phase = "locating" | "denied" | "unsupported" | "error" | "ready";

type SuccessInfo = {
  streak: number;
  milestone?: number;
  freezeUsed: boolean;
  message: string;
  friends: number;
};

export default function HomePage() {
  return (
    <Guard>
      <Home />
    </Guard>
  );
}

function Home() {
  const { state, update } = useStore();
  const [coords, setCoords] = useState<Coords | null>(null);
  const [phase, setPhase] = useState<Phase>("locating");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const demo = params.get("demo");
    const latParam = params.get("lat");
    const lngParam = params.get("lng");

    if (latParam && lngParam) {
      const lat = Number(latParam);
      const lng = Number(lngParam);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setCoords({ lat, lng, accuracy: 12 });
        setPhase("ready");
        return;
      }
    }

    if (demo === "in") {
      setCoords({
        lat: PANCONG.lat + 0.00055,
        lng: PANCONG.lng - 0.00035,
        accuracy: 16,
      });
      setPhase("ready");
      return;
    }

    if (demo === "out") {
      setCoords({ lat: -6.8905, lng: 107.593, accuracy: 24 });
      setPhase("ready");
      return;
    }

    if (!("geolocation" in navigator)) {
      setPhase("unsupported");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? 999,
        });
        setPhase("ready");
      },
      (err) => setPhase(err.code === 1 ? "denied" : "error"),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const user = state.user!;
  const today = todayWIB();
  const done = checkedInToday(state);
  const items = todayCheckIns(state);
  const friends = items.filter((i) => i.username !== user.username);

  // Pratinjau kartu sukses untuk screenshot/demo: ?demo=win
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("demo") !== "win") return;
    setSuccess({
      streak: 13,
      freezeUsed: false,
      message: broadcastBody(user.username),
      friends: 0,
    });
  }, [user.username]);

  const dist = coords ? distanceToPancong(coords.lat, coords.lng) : null;
  const bearing = coords ? bearingToPancong(coords.lat, coords.lng) : 0;
  const inRange = dist !== null && dist <= RADIUS_M;
  const accuracyOk = coords ? coords.accuracy <= ACCURACY_MAX_M : false;
  const canCheckIn =
    phase === "ready" && inRange && accuracyOk && !done && !submitting;

  const streak = state.streak;
  const freezes = effectiveFreezes(streak, today);
  const nextTier = nextFlameTier(streak.current);

  const buttonState: "submitting" | "done" | "locked" | "ready" = submitting
    ? "submitting"
    : done
      ? "done"
      : canCheckIn
        ? "ready"
        : "locked";

  let statusText = "";
  if (phase === "locating") statusText = "Menunggu sinyal GPS…";
  else if (phase === "denied")
    statusText =
      "Izin lokasi diblokir. Aktifkan lewat ikon gembok di address bar, lalu muat ulang.";
  else if (phase === "unsupported")
    statusText = "Perangkat ini tidak mendukung GPS.";
  else if (phase === "error")
    statusText = "Gagal membaca lokasi. Coba muat ulang.";
  else if (done) statusText = `Sudah absen hari ini · reset dalam ${countdownToReset()}`;
  else if (dist === null) statusText = "Mencari lokasimu…";
  else if (!accuracyOk)
    statusText = `GPS kurang akurat (±${Math.round(coords!.accuracy)} m). Coba di area terbuka.`;
  else if (!inRange)
    statusText = `${formatDistance(dist)} dari Pancong · arah ${cardinalDirection(bearing)}`;
  else statusText = `${formatDistance(dist)} dari titik absen`;

  const handleCheckIn = () => {
    if (!canCheckIn) return;
    setSubmitting(true);

    window.setTimeout(() => {
      const result = applyCheckIn(streak, today);
      const entry: CheckIn = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `local-${Date.now()}`,
        username: user.username,
        emoji: user.emoji,
        color: user.color,
        avatarUrl: user.avatarUrl,
        at: new Date().toISOString(),
        date: today,
        streak: result.streak.current,
      };

      update((s) => ({
        ...s,
        streak: result.streak,
        checkIns: [entry, ...s.checkIns],
      }));

      setSubmitting(false);
      setSuccess({
        streak: result.streak.current,
        milestone: result.milestone,
        freezeUsed: result.freezeUsed,
        message: broadcastBody(user.username),
        friends: friends.length,
      });
    }, 650);
  };

  return (
    <>
      <main className="px-5 pb-32 pt-9">
        <header className="flex items-start justify-between">
          <div>
            <p className="eyebrow">{dayLabel()}</p>
            <h1 className="mt-2 text-[24px] font-extrabold leading-tight tracking-[-0.03em]">
              Halo, {user.username} 👋
            </h1>
          </div>
          <Avatar
            emoji={user.emoji}
            color={user.color}
            src={user.avatarUrl}
            size={42}
          />
        </header>

        {/* lokasi */}
        <div className="card mt-5 flex items-center gap-3 px-4 py-3">
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
              inRange ? "bg-mint/15 text-mint" : "bg-white/[0.06] text-muted"
            }`}
          >
            <MapPinIcon className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">
              {phase === "locating"
                ? "Mencari lokasimu…"
                : phase === "denied"
                  ? "Izin lokasi mati"
                  : phase === "unsupported" || phase === "error"
                    ? "Lokasi tidak tersedia"
                    : inRange
                      ? "Kamu di area Pancong"
                      : "Di luar jangkauan"}
            </p>
            <p className="truncate text-[10.5px] text-muted">
              Radius {RADIUS_M} m · titik absen
            </p>
          </div>
          {dist !== null && (
            <span className="tabular text-[11px] font-bold text-muted">
              {formatDistance(dist)}
            </span>
          )}
        </div>

        {/* tombol absen */}
        <div className="relative mt-8 flex flex-col items-center">
          <div className="relative grid h-[246px] w-[246px] place-items-center">
            {canCheckIn && (
              <span
                className="absolute inset-7 rounded-full bg-flame/25 blur-2xl"
                aria-hidden="true"
              />
            )}
            <span className="absolute inset-0 rounded-full border border-white/[0.07]" />
            <span className="absolute inset-[10px] rounded-full border border-white/[0.05]" />

            <button
              type="button"
              onClick={handleCheckIn}
              disabled={!canCheckIn}
              aria-label="Absen sekarang"
              className={`relative grid h-[192px] w-[192px] place-items-center rounded-full transition active:scale-[0.975] ${
                buttonState === "ready"
                  ? "breathe text-[#20100a]"
                  : buttonState === "done"
                    ? "border border-line bg-panel text-mint"
                    : "border border-line bg-panel text-muted"
              }`}
              style={
                buttonState === "ready"
                  ? {
                      background:
                        "radial-gradient(125% 125% at 50% 14%, #FFC24B 0%, #FF9C33 46%, #FF6A1F 100%)",
                      boxShadow:
                        "0 26px 74px -30px rgba(255,120,30,0.9), inset 0 2px 14px rgba(255,255,255,0.4)",
                    }
                  : undefined
              }
            >
              {buttonState === "submitting" ? (
                <span className="flex flex-col items-center gap-2.5">
                  <span className="spinner h-6 w-6 rounded-full border-2 border-current border-t-transparent" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
                    Mengirim
                  </span>
                </span>
              ) : buttonState === "done" ? (
                <span className="flex flex-col items-center gap-1.5">
                  <CheckIcon className="h-7 w-7" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                    Sudah absen
                  </span>
                </span>
              ) : (
                <span className="flex flex-col items-center">
                  {canCheckIn ? (
                    <span className="text-[40px] leading-none" aria-hidden="true">
                      🔥
                    </span>
                  ) : (
                    <LockIcon className="mb-2.5 h-6 w-6 opacity-55" />
                  )}
                  <span
                    className={`font-black leading-none ${
                      canCheckIn
                        ? "mt-1 text-[28px] tracking-[-0.02em]"
                        : "text-[24px] tracking-[0.01em]"
                    }`}
                  >
                    ABSEN
                  </span>
                  <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.32em] opacity-60">
                    sekarang
                  </span>
                </span>
              )}
            </button>
          </div>

          <p className="mt-5 flex max-w-[300px] items-center justify-center gap-1.5 text-center text-[12px] leading-relaxed text-muted">
            {!inRange && dist !== null && phase === "ready" && !done && (
              <span
                className="inline-block"
                style={{ transform: `rotate(${bearing}deg)` }}
              >
                <ArrowUpIcon className="h-3.5 w-3.5 text-amber" />
              </span>
            )}
            {statusText}
          </p>
        </div>

        {/* streak */}
        <section className="card mt-7 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                Streak kamu
              </p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="flame-text tabular text-[64px] font-black leading-none">
                  {streak.current}
                </span>
                <span className="mb-1 text-sm font-semibold text-muted">hari</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StreakFlame streak={streak.current} size={34} />
              <div className="flex gap-1.5" aria-label="Sisa freeze bulan ini">
                {[0, 1].map((i) => (
                  <SnowflakeIcon
                    key={i}
                    className={`h-4 w-4 ${
                      i < freezes ? "text-ice" : "text-fg/15"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-[12px] border border-line px-3 py-2">
            <StreakFlame streak={streak.current} size={14} withLabel />
            <span className="text-[10px] text-muted">
              {nextTier ? `naik di ${nextTier.min} hari` : "tingkat tertinggi"}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[11px]">
            <span className="text-muted">
              Terbaik: <b className="font-semibold text-fg">{streak.longest} hari</b>
            </span>
            <span className="text-muted">
              Freeze {freezes}/{FREEZES_PER_MONTH} · reset{" "}
              {nextMonthStartLabel(today)}
            </span>
          </div>
        </section>

        {/* yang sudah absen */}
        <section className="mt-7">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-bold">Sudah di Pancong</h2>
            <Link href="/feed" className="text-[11px] text-muted">
              Lihat semua
            </Link>
          </div>

          {friends.length > 0 ? (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex -space-x-2.5">
                {friends.slice(0, 5).map((f) => (
                  <Avatar
                    key={f.id}
                    emoji={f.emoji}
                    color={f.color}
                    src={f.avatarUrl}
                    size={38}
                    className="ring-2 ring-bg"
                  />
                ))}
              </div>
              <p className="text-[12px] text-muted">
                <b className="font-semibold text-fg">{friends.length}</b> orang
                hari ini
              </p>
            </div>
          ) : (
            <p className="mt-3 text-[12px] text-muted">
              Belum ada yang absen. Jadi yang pertama!
            </p>
          )}
        </section>

        {/* feed preview */}
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-bold">Aktivitas hari ini</h2>
            <Link href="/feed" className="text-[11px] text-muted">
              Semua
            </Link>
          </div>
          <div className="card mt-3 px-4 py-1">
            {items.slice(0, 3).map((item) => (
              <FeedRow
                key={item.id}
                item={item}
                isMe={item.username === user.username}
              />
            ))}
            {items.length === 0 && (
              <p className="py-7 text-center text-[11.5px] text-muted">
                Belum ada aktivitas hari ini.
              </p>
            )}
          </div>
        </section>

        <p className="mt-8 text-center text-[9.5px] leading-relaxed text-muted/50">
          Data tersimpan di perangkat ini · belum tersambung Supabase
        </p>
      </main>

      <BottomNav />

      {success && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
          <Confetti count={28} />
          <div className="rise w-full max-w-[330px] rounded-[22px] border border-line bg-panel p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-flame/12">
                <StreakFlame streak={success.streak} size={16} />
              </span>
              <p className="eyebrow">Absen berhasil</p>
            </div>

            <div className="mt-5 flex items-baseline gap-2">
              <span className="tabular text-[56px] font-bold leading-none tracking-[-0.05em]">
                {success.streak}
              </span>
              <span className="text-[12px] text-muted">hari berturut-turut</span>
            </div>

            {success.milestone && (
              <p className="mt-3 inline-block rounded-full border border-amber/30 px-2.5 py-1 text-[10.5px] font-semibold text-amber">
                Milestone {success.milestone} hari
              </p>
            )}
            {success.freezeUsed && (
              <p className="mt-3 inline-block rounded-full border border-ice/30 px-2.5 py-1 text-[10.5px] font-semibold text-ice">
                Streak diselamatkan satu freeze
              </p>
            )}

            <div className="mt-5 rounded-[14px] border border-line p-3.5">
              <p className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted">
                <BellIcon className="h-3 w-3" />
                Terkirim ke teman
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-fg/85">
                “{success.message}”
              </p>
              {success.friends > 0 && (
                <p className="mt-1.5 text-[10px] text-muted">
                  {success.friends} orang yang belum absen
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSuccess(null)}
              className="btn-accent mt-5 w-full py-3 text-[13.5px]"
            >
              Mantap
            </button>
          </div>
        </div>
      )}
    </>
  );
}
