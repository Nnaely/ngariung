"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { Guard } from "@/components/Guard";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Avatar } from "@/components/Avatar";
import { StreakFlame } from "@/components/StreakFlame";
import { useStore } from "@/lib/store";
import { todayWIB } from "@/lib/format";

type Entry = {
  username: string;
  emoji: string;
  color: string;
  avatarUrl?: string;
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

    const ensure = (
      username: string,
      emoji: string,
      color: string,
      avatarUrl?: string,
    ) => {
      let e = map.get(username);
      if (!e) {
        e = {
          username,
          emoji,
          color,
          avatarUrl,
          streak: 0,
          week: 0,
          isMe: username === user.username,
        };
        map.set(username, e);
      }
      return e;
    };

    for (const c of state.checkIns) {
      const e = ensure(c.username, c.emoji, c.color, c.avatarUrl);
      e.streak = Math.max(e.streak, c.streak);
      if (c.date >= weekStart) e.week += 1;
      e.emoji = c.emoji;
      e.color = c.color;
      e.avatarUrl = c.avatarUrl;
    }

    ensure(user.username, user.emoji, user.color, user.avatarUrl);
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

        <SegmentedControl
          id="ranking"
          label="Jenis peringkat"
          value={tab}
          onChange={setTab}
          options={[{ value: "streak", label: "Streak" }, { value: "week", label: "7 hari" }]}
          className="mt-5"
        />

        <div key={tab} id="ranking-panel" role="tabpanel" tabIndex={0} aria-labelledby={`ranking-tab-${tab}`} className="panel-reveal mt-5">
          <div className="mb-4 flex items-center justify-between rounded-[18px] border border-flame/20 bg-flame/[0.06] px-4 py-3">
            <div>
              <p className="eyebrow">Posisimu</p>
              <p className="mt-1 text-[12px] text-muted">Dari {entries.length} teman nongkrong</p>
            </div>
            <span className="tabular text-[25px] font-extrabold tracking-tight text-flame">
              #{entries.findIndex((entry) => entry.isMe) + 1}
            </span>
          </div>
        <div className="card divide-y divide-line px-4">
          {entries.map((e, i) => (
            <div key={e.username} style={{ "--row-delay": `${Math.min(i, 7) * 35}ms` } as CSSProperties} className="rank-row flex items-center gap-3 py-3.5">
              <span
                className={`tabular w-5 text-[11px] font-semibold ${
                  i === 0 ? "text-flame" : "text-muted"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <Avatar
                emoji={e.emoji}
                color={e.color}
                src={e.avatarUrl}
                size={36}
              />
              <p className="min-w-0 flex-1 truncate text-[13px] font-medium">
                {e.username}
                {e.isMe && (
                  <span className="ml-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-flame">
                    kamu
                  </span>
                )}
              </p>
              <span className="tabular flex items-center gap-1.5 text-[13px] font-semibold">
                <StreakFlame streak={value(e)} size={13} />
                {value(e)}
              </span>
            </div>
          ))}
        </div>
        </div>

        <p className="mt-6 text-center text-[9.5px] text-muted/50">
          {tab === "streak"
            ? "Streak harian saat ini"
            : "Total absen dalam 7 hari terakhir"}
        </p>
      </main>

    </>
  );
}
