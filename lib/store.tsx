"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CheckIn, DailyRecord, User } from "./types";
import type { StreakState } from "./streak";
import type { LeaderboardRow } from "./leaderboard";
import type { AppSnapshot, BoardRow, CheckInOutcome } from "./api-types";
import { ApiError, apiFetch } from "./api";
import { POLL_MS, newFriendCheckIns, shouldPoll } from "./sync";
import { todayWIB } from "./format";
import { disablePush } from "./push-client";
import type { Toast } from "@/components/Toaster";

const CACHE_KEY = "ngariung.cache.v2";
/** Profil versi lama (semua data dulu hanya di perangkat). */
const LEGACY_KEY = "ngariung.v1";

export type State = {
  /** Tanggal hari ini (WIB) menurut server. */
  today: string;
  user: User | null;
  streak: StreakState;
  totalCheckIns: number;
  /** Absen hari ini dari semua orang, terbaru dulu. */
  checkIns: CheckIn[];
  leaderboard: LeaderboardRow[];
  battleBoard: BoardRow[];
  dailyBoard: BoardRow[];
  /** Hasil game harian milik sendiri hari ini. */
  dailies: DailyRecord[];
};

export type Status = "loading" | "online" | "offline" | "unavailable";

export const EMPTY_STATE: State = {
  today: "",
  user: null,
  streak: { current: 0, longest: 0, freezes: 2, lastDate: null, freezeMonth: null },
  totalCheckIns: 0,
  checkIns: [],
  leaderboard: [],
  battleBoard: [],
  dailyBoard: [],
  dailies: [],
};

export type RegisterInput = { email: string; username: string; emoji: string; pin: string };
export type ProfilePatch = { username?: string; emoji?: string; avatar?: string | null };
export type BattleInput = { game: "ttt" | "guess"; playerB: string; winner: string };
export type DailyInput = { game: "kata" | "teka"; solved: boolean };
export type CheckInInput = { lat: number; lng: number; accuracy: number };

type Store = {
  state: State;
  /** true setelah sesi diketahui (dari cache atau server). */
  ready: boolean;
  status: Status;
  toasts: Toast[];
  dismissToast: (id: string) => void;
  refresh: () => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  login: (email: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  checkIn: (input: CheckInInput) => Promise<{ outcome: CheckInOutcome; notified: number }>;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
  recordBattle: (input: BattleInput) => Promise<void>;
  recordDaily: (input: DailyInput) => Promise<void>;
};

type SnapshotResponse = { snapshot: AppSnapshot };

function fromSnapshot(snapshot: AppSnapshot): State {
  return {
    today: snapshot.today,
    user: snapshot.me.user,
    streak: snapshot.me.streak,
    totalCheckIns: snapshot.me.totalCheckIns,
    checkIns: snapshot.checkIns,
    leaderboard: snapshot.leaderboard,
    battleBoard: snapshot.battleBoard,
    dailyBoard: snapshot.dailyBoard,
    dailies: snapshot.myDailies,
  };
}

function readCache(): AppSnapshot | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as AppSnapshot) : null;
  } catch {
    return null;
  }
}

function writeCache(snapshot: AppSnapshot | null) {
  try {
    if (snapshot) window.localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
    else window.localStorage.removeItem(CACHE_KEY);
  } catch {
    /* storage penuh / private mode — abaikan */
  }
}

export type LegacyProfile = { email?: string; username?: string; emoji?: string };

/** Profil dari versi lama (data lokal), dipakai untuk mengisi form daftar. */
export function readLegacyProfile(): LegacyProfile | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const user = (JSON.parse(raw) as { user?: LegacyProfile | null }).user;
    return user ? { email: user.email, username: user.username, emoji: user.emoji } : null;
  } catch {
    return null;
  }
}

function forgetLegacyProfile() {
  try {
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* abaikan */
  }
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<Status>("loading");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const snapshotRef = useRef<AppSnapshot | null>(null);
  const lastInteraction = useRef(0);
  const inflight = useRef<Promise<void> | null>(null);

  const apply = useCallback((snapshot: AppSnapshot, announce: boolean) => {
    const previous = snapshotRef.current;
    if (announce && previous && previous.me.user.username === snapshot.me.user.username) {
      const fresh = newFriendCheckIns(previous.checkIns, snapshot.checkIns, snapshot.me.user.username);
      if (fresh.length > 0) {
        setToasts((current) =>
          [
            ...current,
            ...fresh.map((checkIn) => ({
              id: `checkin-${checkIn.id}`,
              title: `🔥 ${checkIn.username} baru absen!`,
              body: "Sudah di Pancong. Yuk, merapat!",
            })),
          ].slice(-3),
        );
      }
    }
    snapshotRef.current = snapshot;
    writeCache(snapshot);
    setState(fromSnapshot(snapshot));
    setStatus("online");
    setReady(true);
  }, []);

  const signOutLocally = useCallback(() => {
    snapshotRef.current = null;
    writeCache(null);
    setState(EMPTY_STATE);
    setReady(true);
  }, []);

  /** Jalankan aksi API; sesi yang berakhir langsung mengembalikan ke halaman masuk. */
  const call = useCallback(
    async <T,>(run: () => Promise<T>): Promise<T> => {
      try {
        return await run();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401 && snapshotRef.current) signOutLocally();
        throw error;
      }
    },
    [signOutLocally],
  );

  const refresh = useCallback(() => {
    if (inflight.current) return inflight.current;
    const run = (async () => {
      try {
        const { snapshot } = await apiFetch<SnapshotResponse>("/api/state");
        apply(snapshot, true);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          signOutLocally();
          setStatus("online");
        } else if (error instanceof ApiError && error.code === "DB_NOT_CONFIGURED") {
          setStatus("unavailable");
          setReady(true);
        } else {
          setStatus("offline");
          setReady(true);
        }
      } finally {
        inflight.current = null;
      }
    })();
    inflight.current = run;
    return run;
  }, [apply, signOutLocally]);

  // Tampilkan data terakhir secepatnya, lalu segarkan dari server.
  useEffect(() => {
    lastInteraction.current = Date.now();
    const cached = readCache();
    if (cached) {
      snapshotRef.current = cached;
      setState(fromSnapshot(cached));
      setReady(true);
    }
    void refresh();
  }, [refresh]);

  // Polling hanya saat aplikasi terlihat dan sedang dipakai.
  useEffect(() => {
    const mark = () => {
      lastInteraction.current = Date.now();
    };
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      mark();
      if (snapshotRef.current) void refresh();
    };
    const onOnline = () => {
      if (snapshotRef.current) void refresh();
    };
    const activity = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    activity.forEach((name) => window.addEventListener(name, mark, { passive: true }));
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    const timer = window.setInterval(() => {
      if (!snapshotRef.current) return;
      const visible = document.visibilityState === "visible";
      if (shouldPoll({ visible, now: Date.now(), lastInteraction: lastInteraction.current })) void refresh();
    }, POLL_MS);
    return () => {
      activity.forEach((name) => window.removeEventListener(name, mark));
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const register = useCallback(
    async (input: RegisterInput) => {
      const { snapshot } = await apiFetch<SnapshotResponse>("/api/auth/register", { body: input });
      forgetLegacyProfile();
      snapshotRef.current = null;
      apply(snapshot, false);
    },
    [apply],
  );

  const login = useCallback(
    async (email: string, pin: string) => {
      const { snapshot } = await apiFetch<SnapshotResponse>("/api/auth/login", { body: { email, pin } });
      forgetLegacyProfile();
      snapshotRef.current = null;
      apply(snapshot, false);
    },
    [apply],
  );

  const logout = useCallback(async () => {
    await disablePush().catch(() => undefined);
    await apiFetch("/api/auth/logout", { body: {} }).catch(() => undefined);
    signOutLocally();
  }, [signOutLocally]);

  const checkIn = useCallback(
    (input: CheckInInput) =>
      call(async () => {
        const data = await apiFetch<{ outcome: CheckInOutcome; notified: number } & SnapshotResponse>(
          "/api/check-in",
          { body: input },
        );
        apply(data.snapshot, false);
        return { outcome: data.outcome, notified: data.notified };
      }),
    [apply, call],
  );

  const updateProfile = useCallback(
    (patch: ProfilePatch) =>
      call(async () => {
        const { snapshot } = await apiFetch<SnapshotResponse>("/api/profile", { method: "PATCH", body: patch });
        apply(snapshot, false);
      }),
    [apply, call],
  );

  const recordBattle = useCallback(
    (input: BattleInput) =>
      call(async () => {
        const { snapshot } = await apiFetch<SnapshotResponse>("/api/games/battle", { body: input });
        apply(snapshot, false);
      }),
    [apply, call],
  );

  const recordDaily = useCallback(
    (input: DailyInput) =>
      call(async () => {
        const { snapshot } = await apiFetch<SnapshotResponse>("/api/games/daily", { body: input });
        apply(snapshot, false);
      }),
    [apply, call],
  );

  return (
    <StoreContext.Provider
      value={{
        state,
        ready,
        status,
        toasts,
        dismissToast,
        refresh,
        register,
        login,
        logout,
        checkIn,
        updateProfile,
        recordBattle,
        recordDaily,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore harus dipakai di dalam <StoreProvider>");
  return ctx;
}

function currentDay(state: State): string {
  return state.today || todayWIB();
}

export function checkedInToday(state: State): boolean {
  const user = state.user;
  if (!user) return false;
  const today = currentDay(state);
  return state.checkIns.some((checkIn) => checkIn.date === today && checkIn.username === user.username);
}

/** Absen hari ini, terbaru dulu. */
export function todayCheckIns(state: State): CheckIn[] {
  const today = currentDay(state);
  return state.checkIns.filter((checkIn) => checkIn.date === today);
}
