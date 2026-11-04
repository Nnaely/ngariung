"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { BattleRecord, CheckIn, DailyRecord, User } from "./types";
import type { StreakState } from "./streak";
import { todayWIB } from "./format";
import { seedCheckIns } from "./seed";

const KEY = "ngariung.v1";

export type State = {
  user: User | null;
  streak: StreakState;
  checkIns: CheckIn[];
  battles: BattleRecord[];
  dailies: DailyRecord[];
};

export const EMPTY_STATE: State = {
  user: null,
  streak: { current: 0, longest: 0, freezes: 0, lastDate: null, freezeMonth: null },
  checkIns: [],
  battles: [],
  dailies: [],
};

function hydrate(raw: string | null): State {
  if (!raw) return EMPTY_STATE;
  try {
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      user: parsed.user ?? null,
      streak: {
        current: parsed.streak?.current ?? 0,
        longest: parsed.streak?.longest ?? 0,
        freezes: parsed.streak?.freezes ?? 0,
        lastDate: parsed.streak?.lastDate ?? null,
        freezeMonth: parsed.streak?.freezeMonth ?? null,
      },
      checkIns: Array.isArray(parsed.checkIns) ? parsed.checkIns : [],
      battles: Array.isArray(parsed.battles) ? parsed.battles : [],
      dailies: Array.isArray(parsed.dailies) ? parsed.dailies : [],
    };
  } catch {
    return EMPTY_STATE;
  }
}

function persist(state: State) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage penuh / private mode — abaikan */
  }
}

type Store = {
  state: State;
  ready: boolean;
  update: (fn: (state: State) => State) => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(EMPTY_STATE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let loaded = EMPTY_STATE;
    try {
      loaded = hydrate(window.localStorage.getItem(KEY));
    } catch {
      loaded = EMPTY_STATE;
    }

    // Aplikasi mulai kosong. Data contoh hanya kalau diminta eksplisit
    // lewat ?seed=1 (dipakai untuk screenshot / presentasi).
    const wantsSeed =
      new URLSearchParams(window.location.search).get("seed") === "1";
    if (wantsSeed && loaded.checkIns.length === 0) {
      loaded = {
        ...loaded,
        checkIns: seedCheckIns(todayWIB()),
      };
    }

    persist(loaded);
    setState(loaded);
    setReady(true);
  }, []);

  const update = useCallback((fn: (current: State) => State) => {
    setState((prev) => {
      const next = fn(prev);
      persist(next);
      return next;
    });
  }, []);

  return (
    <StoreContext.Provider value={{ state, ready, update }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore harus dipakai di dalam <StoreProvider>");
  return ctx;
}

export function checkedInToday(state: State, date = todayWIB()): boolean {
  if (!state.user) return false;
  return state.checkIns.some(
    (c) => c.date === date && c.username === state.user?.username,
  );
}

export function todayCheckIns(state: State, date = todayWIB()): CheckIn[] {
  return state.checkIns
    .filter((c) => c.date === date)
    .sort((a, b) => +new Date(b.at) - +new Date(a.at));
}
