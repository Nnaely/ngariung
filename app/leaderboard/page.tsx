"use client";

import { useMemo, useState } from "react";
import { Guard } from "@/components/Guard";
import { BottomNav } from "@/components/BottomNav";
import { Avatar } from "@/components/Avatar";
import { FlameIcon } from "@/components/Icons";
import { useStore } from "@/lib/store";
import { todayWIB } from "@/lib/format";

type Entry = {
  username: string;
  emoji: string;
  color: string;
  streak: number;
  week: number;
  isMe: boolean;
};

function shiftDays(date: string, delta: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return t.toISOString().slice(0, 10);
}

export default function LeaderboardPage() {
  return (
    <Guard>
      <Leaderboard />
    </Guard>
  );
}

function Leaderboard() {
  const { state } = useStore();
  const user = state.user!;
  const [tab, setTab] = useState<"streak" | "week">("streak");

  const entries = useMemo(() => {
    const today = todayWIB();
    const weekStart = shiftDays(today, -6);
    const map = new Map<string, Entry>();

    const ensure = (username: string, emoji: string, color: string) => {
      let e = map.get(username);
      if (!e) {
        e = {
          username,
          emoji,
          color,
          streak: 0,
          week: 0,
          isMe: username === user.username,
        };
        map.set(username, e);
      }
      return e;
    };

    for (const c of state.checkIns) {
      const e = ensure(c.username, c.emoji, c.color);
      e.streak = Math.max(e.streak, c.streak);
      if (c.date >= weekStart) e.week += 1;
      e.emoji = c.emoji;
      e.color = c.color;
    }

    ensure(user.username, user.emoji, user.color);
    const me = map.get(user.username);
    if (me) me.streak = Math.max(me.streak, state.streak.current);

    const list = [...map.values()];
    if (tab === "streak") {
      list.sort((a, b) => b.streak - a.streak || a.username.localeCompare(b.username));
    } else {
      list.sort((a, b) => b.week - a.week || b.streak - a.streak);
    }
    return list;
  }, [state.checkIns, state.streak.current, user, tab]);

  const value = (e: Entry) => (tab === "streak" ? e.streak : e.week);

  return (
    <>
      <main className="px-5 pb-32 pt-9">
        <header>
          <p className="eyebrow">Papan peringkat</p>
          <h1 className="mt-2 text-[26px] font-bold tracking-[-0.04em]">
            Siapa paling rajin
          </h1>
        </header>

        <div className="mt-5 flex gap-1 rounded-[12px] border border-line p-1">
          {(
            [
              ["streak", "Streak"],
              ["week", "7 hari"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex-1 rounded-[9px] py-2 text-[11.5px] font-semibold transition ${
                tab === key ? "bg-fg text-bg" : "text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="card mt-5 divide-y divide-line px-4">
          {entries.map((e, i) => (
            <div key={e.username} className="flex items-center gap-3 py-3.5">
              <span
                className={`tabular w-5 text-[11px] font-semibold ${
                  i === 0 ? "text-flame" : "text-muted"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <Avatar emoji={e.emoji} color={e.color} size={36} />
              <p className="min-w-0 flex-1 truncate text-[13px] font-medium">
                {e.username}
                {e.isMe && (
                  <span className="ml-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-flame">
                    kamu
                  </span>
                )}
              </p>
              <span className="tabular flex items-center gap-1.5 text-[13px] font-semibold">
                <FlameIcon
                  className={`h-3.5 w-3.5 ${i === 0 ? "text-flame" : "text-muted/60"}`}
                />
                {value(e)}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-[9.5px] text-muted/50">
          {tab === "streak"
            ? "Streak harian saat ini"
            : "Total absen dalam 7 hari terakhir"}
        </p>
      </main>

      <BottomNav />
    </>
  );
}
