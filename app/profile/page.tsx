"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Guard } from "@/components/Guard";
import { Avatar } from "@/components/Avatar";
import { Dialog } from "@/components/Dialog";
import { MotionSettings } from "@/components/MotionPreferences";
import { StreakFlame } from "@/components/StreakFlame";
import { InstallRow } from "@/components/InstallRow";
import {
  BellIcon,
  CheckIcon,
  ChevronRightIcon,
  SnowflakeIcon,
} from "@/components/Icons";
import { useStore } from "@/lib/store";
import { effectiveFreezes, FREEZES_PER_MONTH } from "@/lib/streak";
import { monthName, nextMonthStartLabel, todayWIB } from "@/lib/format";
import { fileToAvatar } from "@/lib/image";
import { AVATAR_EMOJIS, normalizeUsername, usernameError } from "@/lib/identity";
import { ApiError } from "@/lib/api";
import {
  closeAppNotifications,
  disablePush,
  enablePush,
  getPushSubscription,
  pushSupport,
  sendTestPush,
  type PushSupport,
} from "@/lib/push-client";
import "./profile.css";

const errorText = (error: unknown, fallback: string) =>
  error instanceof ApiError || error instanceof Error ? error.message : fallback;

export default function ProfilePage() {
  return (
    <Guard>
      <Profile />
    </Guard>
  );
}

function Profile() {
  const { state, updateProfile, logout } = useStore();
  const router = useRouter();
  const user = state.user!;

  const [draft, setDraft] = useState(user.username);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<"username" | "avatar" | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [busyPhoto, setBusyPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [support, setSupport] = useState<PushSupport>("supported");
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [notifOn, setNotifOn] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const level = pushSupport();
    setSupport(level);
    if (level !== "supported") {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    void getPushSubscription()
      .then((subscription) => setNotifOn(Boolean(subscription) && Notification.permission === "granted"))
      .catch(() => setNotifOn(false));
    void closeNotifications();
  }, []);

  const closeNotifications = () => closeAppNotifications().catch(() => undefined);

  const saveUsername = async () => {
    if (savingName) return;
    const value = normalizeUsername(draft);
    if (value === user.username) return setEditing(null);
    const problem = usernameError(value);
    if (problem) return setError(problem);

    setSavingName(true);
    try {
      await updateProfile({ username: value });
      setDraft(value);
      setError(null);
      setEditing(null);
      setNotice("Username berhasil disimpan.");
    } catch (err) {
      setError(errorText(err, "Username gagal disimpan."));
    } finally {
      setSavingName(false);
    }
  };

  const pickEmoji = async (emoji: string) => {
    setPhotoError(null);
    try {
      await updateProfile(user.avatarUrl ? { emoji, avatar: null } : { emoji });
      setNotice("Avatar baru, semangat baru!");
    } catch (err) {
      setPhotoError(errorText(err, "Avatar gagal disimpan."));
    }
  };

  const onPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setPhotoError(null);
    setBusyPhoto(true);
    try {
      await updateProfile({ avatar: await fileToAvatar(file) });
      setNotice("Foto profil berhasil disimpan.");
    } catch (err) {
      setPhotoError(errorText(err, "Gagal memuat foto."));
    } finally {
      setBusyPhoto(false);
    }
  };

  const removePhoto = async () => {
    setPhotoError(null);
    try {
      await updateProfile({ avatar: null });
    } catch (err) {
      setPhotoError(errorText(err, "Foto gagal dihapus."));
    }
  };

  const toggleNotifications = async () => {
    if (support !== "supported" || notifBusy) return;
    setNotifBusy(true);
    setNotifError(null);
    try {
      if (notifOn) {
        await disablePush();
        await closeNotifications();
        setNotifOn(false);
        setNotice("Notifikasi dimatikan.");
      } else {
        await enablePush();
        setNotifOn(true);
        setNotice("Notifikasi aktif. Kamu dikabari saat teman absen.");
      }
    } catch (err) {
      setNotifError(errorText(err, "Notifikasi gagal diatur."));
    } finally {
      setPermission(Notification.permission);
      setNotifBusy(false);
    }
  };

  /** Contoh notifikasi lewat server, persis seperti saat teman absen. */
  const sendSampleNotification = async () => {
    setNotifError(null);
    try {
      await sendTestPush();
      setNotice("Contoh notifikasi dikirim ke perangkat ini.");
    } catch (err) {
      setNotifError(errorText(err, "Contoh notifikasi gagal dikirim."));
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <>
      <main className="page-content px-5 pb-32 pt-9">
        <header className="profile-hero card flex flex-col items-center px-5 py-7">
          <button
            type="button"
            onClick={() => setEditing("avatar")}
            aria-label="Ganti avatar profil"
            className="profile-avatar-button rounded-full"
          >
            <Avatar emoji={user.emoji} color={user.color} src={user.avatarUrl} size={82} />
            <span aria-hidden="true" className="profile-avatar-edit">✎</span>
          </button>
          <h1 className="mt-3 max-w-full truncate text-[22px] font-extrabold tracking-[-0.02em]">
            {user.username}
          </h1>
          <p className="max-w-full break-all text-center text-[11.5px] text-muted">{user.email}</p>
          <div className="mt-4 flex items-center gap-1.5 rounded-full bg-flame/12 px-3 py-1.5 text-[11.5px] font-bold text-flame">
            <StreakFlame streak={state.streak.current} size={14} />
            {state.streak.current} hari berturut-turut
          </div>
        </header>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {[
            { label: "Streak", value: state.streak.current },
            { label: "Terbaik", value: state.streak.longest },
            {
              label: "Total absen",
              value: state.totalCheckIns,
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

        <section className="mt-7" aria-labelledby="profile-settings-title">
          <h2 id="profile-settings-title" className="eyebrow">Bikin jadi kamu</h2>
          <div className="card mt-3 divide-y divide-line px-4">
            <button
              type="button"
              onClick={() => {
                setDraft(user.username);
                setError(null);
                setEditing("username");
              }}
              className="profile-action flex w-full items-center gap-3 py-4 text-left"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-flame/10 text-flame">@</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-semibold">Ganti username</span>
                <span className="mt-1 block truncate text-[11px] text-muted">@{user.username}</span>
              </span>
              <ChevronRightIcon className="h-4 w-4 text-muted" />
            </button>
            <button
              type="button"
              onClick={() => setEditing("avatar")}
              className="profile-action flex w-full items-center gap-3 py-4 text-left"
            >
              <Avatar emoji={user.emoji} color={user.color} src={user.avatarUrl} size={36} />
              <span className="flex-1">
                <span className="block text-[12.5px] font-semibold">Ganti avatar</span>
                <span className="mt-1 block text-[11px] text-muted">Foto favorit atau emoji andalanmu</span>
              </span>
              <ChevronRightIcon className="h-4 w-4 text-muted" />
            </button>
          </div>
          <div role="status" aria-live="polite" className="mt-2 min-h-5 text-[11px] text-mint">
            {notice && (
              <span key={notice} className="profile-saved flex items-center gap-1.5">
                <CheckIcon className="h-3.5 w-3.5" />{notice}
              </span>
            )}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="eyebrow">Pengaturan</h2>
          <div className="mt-3 divide-y divide-line border-y border-line">
            <InstallRow />
            <MotionSettings />
            <button
              type="button"
              onClick={toggleNotifications}
              aria-pressed={notifOn}
              aria-busy={notifBusy}
              disabled={support !== "supported" || permission === "denied" || notifBusy}
              className="flex w-full items-center gap-3 py-3.5 text-left"
            >
              <BellIcon className="h-4 w-4 text-muted" />
              <span className="flex-1 text-[12.5px]">Notifikasi absen teman</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  notifOn
                    ? "bg-mint/15 text-mint"
                    : "border border-line text-muted"
                }`}
              >
                {support === "needs-install"
                  ? "pasang dulu"
                  : support === "unsupported"
                    ? "tidak didukung"
                    : permission === "denied"
                      ? "diblokir browser"
                      : notifBusy
                        ? "sebentar…"
                        : notifOn
                          ? "aktif"
                          : "mati"}
              </span>
            </button>

            {(support === "needs-install" || permission === "denied" || notifError) && (
              <p role={notifError ? "alert" : undefined} className={`py-3 text-[11px] leading-relaxed ${notifError ? "text-danger" : "text-muted"}`}>
                {notifError ??
                  (support === "needs-install"
                    ? "Di iPhone, pasang Ngariung ke Home Screen dulu (Share → Add to Home Screen), lalu buka dari ikonnya untuk menyalakan notifikasi."
                    : "Notifikasi diblokir. Izinkan lewat ikon gembok di address bar, lalu muat ulang halaman.")}
              </p>
            )}

            {notifOn && (
              <button
                type="button"
                onClick={sendSampleNotification}
                className="flex w-full items-center gap-3 py-3.5 text-left"
              >
                <span className="grid h-4 w-4 place-items-center text-[11px]">
                  🔔
                </span>
                <span className="flex-1 text-[12.5px]">Kirim contoh notifikasi</span>
                <span className="text-[10px] text-muted">sekali tap</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 py-3.5 text-left"
            >
              <span className="grid h-4 w-4 place-items-center text-muted">→</span>
              <span className="flex-1 text-[12.5px] text-danger">Keluar</span>
            </button>
          </div>
        </section>

        <p className="mt-8 flex items-center justify-center gap-1.5 text-[9.5px] text-muted/50">
          <span aria-hidden="true" className="h-1 w-1 rounded-full bg-flame" />
          Ngariung v0.3 · tersinkron
        </p>
      </main>

      <Dialog open={editing === "username"} onClose={() => setEditing(null)} labelledBy="username-dialog-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Identitasmu</p>
            <h2 id="username-dialog-title" className="mt-2 text-xl font-bold tracking-tight">Ganti username</h2>
          </div>
          <button type="button" onClick={() => setEditing(null)} aria-label="Tutup ganti username" className="profile-dialog-close">×</button>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); saveUsername(); }} className="mt-5">
          <label htmlFor="profile-username" className="mb-2 block text-xs text-muted">Username baru</label>
          <div className="field flex items-center gap-1.5 px-4">
            <span className="text-sm text-muted" aria-hidden="true">@</span>
            <input
              id="profile-username"
              value={draft}
              onChange={(event) => { setDraft(event.target.value.toLowerCase().replace(/\s/g, "")); setError(null); }}
              data-dialog-autofocus
              spellCheck={false}
              autoComplete="off"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "profile-username-error" : "profile-username-help"}
              className="w-full bg-transparent py-3.5 text-sm outline-none"
            />
          </div>
          <p id="profile-username-help" className="mt-2 text-[11px] leading-relaxed text-muted">3–20 karakter. Pakai huruf kecil, angka, titik, atau underscore.</p>
          {error && <p id="profile-username-error" role="alert" className="mt-2 text-xs text-danger">{error}</p>}
          <button type="submit" disabled={savingName} className="btn-accent mt-5 w-full py-3.5 text-sm disabled:opacity-60">{savingName ? "Menyimpan…" : "Simpan perubahan"}</button>
        </form>
      </Dialog>

      <Dialog open={editing === "avatar"} onClose={() => setEditing(null)} labelledBy="avatar-dialog-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Bebas berekspresi</p>
            <h2 id="avatar-dialog-title" className="mt-2 text-xl font-bold tracking-tight">Pilih avatarmu</h2>
          </div>
          <button type="button" onClick={() => setEditing(null)} aria-label="Tutup pilihan avatar" className="profile-dialog-close">×</button>
        </div>
        <div className="mt-6 flex items-center gap-4">
          <div key={user.avatarUrl ?? user.emoji} className="profile-avatar-preview">
            <Avatar emoji={user.emoji} color={user.color} src={user.avatarUrl} size={64} />
          </div>
          <div className="flex-1">
            <label className="profile-upload btn-quiet block cursor-pointer px-4 py-3 text-center text-xs">
              {busyPhoto ? "Memproses…" : user.avatarUrl ? "Ganti foto" : "Unggah foto"}
              <input type="file" accept="image/*" className="sr-only" disabled={busyPhoto} onChange={onPhoto} />
            </label>
            {user.avatarUrl && <button type="button" onClick={removePhoto} className="mt-2 min-h-8 w-full text-center text-[11px] text-muted">Hapus foto</button>}
          </div>
        </div>
        {photoError && <p role="alert" className="mt-3 text-xs text-danger">{photoError}</p>}
        <p className="mb-3 mt-6 text-xs text-muted">Atau pilih emoji andalanmu</p>
        <div className="grid grid-cols-5 gap-2">
          {AVATAR_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => pickEmoji(emoji)}
              aria-label={`Pilih avatar ${emoji}`}
              aria-pressed={!user.avatarUrl && user.emoji === emoji}
              className={`profile-emoji grid h-12 place-items-center rounded-xl border text-xl ${!user.avatarUrl && user.emoji === emoji ? "border-flame/70 bg-flame/10" : "border-line"}`}
            >{emoji}</button>
          ))}
        </div>
        <p className="mt-4 text-center text-[11px] text-muted">Pilihanmu langsung tersimpan.</p>
        <button type="button" onClick={() => setEditing(null)} className="btn-accent mt-4 w-full py-3.5 text-sm">Selesai</button>
      </Dialog>
    </>
  );
}
