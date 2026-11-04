"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { shiftDate, todayWIB } from "@/lib/format";
import { FREEZES_PER_MONTH, monthKey } from "@/lib/streak";

import { FlameIcon } from "./Icons";

export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-[13px] border border-line text-flame">
          <FlameIcon className="h-5 w-5" />
        </span>
        <span className="text-[11px] uppercase tracking-[0.2em] text-muted">
          Ngariung
        </span>
      </div>
    </div>
  );
}

/** Lindungi halaman: wajib punya sesi (demo: tersimpan di localStorage). */
export function Guard({ children }: { children: ReactNode }) {
  const { state, ready, update } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!ready || state.user) return;

    // Demo link: /?as=rizky&streak=12 membuat sesi tanpa lewat login.
    const params = new URLSearchParams(window.location.search);
    const as = params.get("as");
    if (as) {
      const username = as.toLowerCase().replace(/[^a-z0-9._]/g, "").slice(0, 20);
      if (username.length >= 3) {
        const seed = Math.max(0, Math.min(365, Number(params.get("streak") ?? 0) || 0));
        update((s) =>
          s.user
            ? s
            : {
                ...s,
                user: {
                  email: `${username}@polban.ac.id`,
                  username,
                  emoji: "🔥",
                  color: "#FF5A1F",
                },
                streak:
                  seed > 0
                    ? {
                        current: seed,
                        longest: seed + 3,
                        freezes: FREEZES_PER_MONTH,
                        lastDate: shiftDate(todayWIB(), -1),
                        freezeMonth: monthKey(todayWIB()),
                      }
                    : s.streak,
              },
        );
        return;
      }
    }

    router.replace("/login");
  }, [ready, state.user, router, update]);

  if (!ready || !state.user) return <Splash />;
  return <>{children}</>;
}
