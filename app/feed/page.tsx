"use client";

import Link from "next/link";
import { Guard } from "@/components/Guard";
import { BottomNav } from "@/components/BottomNav";
import { FeedRow } from "@/components/FeedRow";
import { todayCheckIns, useStore } from "@/lib/store";
import { dayLabel } from "@/lib/format";

export default function FeedPage() {
  return (
    <Guard>
      <Feed />
    </Guard>
  );
}

function Feed() {
  const { state } = useStore();
  const user = state.user!;
  const items = todayCheckIns(state);
  const me = items.find((i) => i.username === user.username);

  return (
    <>
      <main className="px-5 pb-32 pt-9">
        <header>
          <p className="eyebrow">{dayLabel()}</p>
          <div className="mt-2 flex items-baseline justify-between">
            <h1 className="text-[26px] font-bold tracking-[-0.04em]">Hari ini</h1>
            <span className="tabular text-[11px] text-muted">
              {items.length} absen
            </span>
          </div>
        </header>

        {me ? (
          <div className="mt-5 flex items-center gap-2.5 border-t border-line pt-4">
            <span className="h-1.5 w-1.5 rounded-full bg-mint" />
            <p className="text-[11.5px] text-muted">
              Kamu sudah absen hari ini. Balik lagi besok.
            </p>
          </div>
        ) : (
          <div className="mt-5 flex items-center gap-2.5 border-t border-line pt-4">
            <span className="h-1.5 w-1.5 rounded-full bg-flame" />
            <p className="flex-1 text-[11.5px] text-muted">
              Kamu belum absen hari ini.
            </p>
            <Link href="/" className="text-[11px] font-medium text-flame">
              Absen
            </Link>
          </div>
        )}

        <div className="card mt-4 divide-y divide-line px-4">
          {items.map((item) => (
            <FeedRow
              key={item.id}
              item={item}
              isMe={item.username === user.username}
            />
          ))}

          {items.length === 0 && (
            <div className="py-14 text-center">
              <span className="mx-auto grid h-10 w-10 place-items-center rounded-full border border-line text-muted">
                ·
              </span>
              <p className="mt-4 text-[12.5px] font-medium">
                Belum ada yang absen
              </p>
              <p className="mt-1 text-[11px] text-muted">
                Jadi yang pertama hari ini.
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[9.5px] text-muted/50">
          {items.length === 0
            ? "Setiap absen akan muncul di sini"
            : "Diperbarui otomatis tiap absen"}
        </p>
      </main>

      <BottomNav />
    </>
  );
}
