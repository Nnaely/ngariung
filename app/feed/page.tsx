"use client";

import Link from "next/link";
import { useState } from "react";
import { Guard } from "@/components/Guard";
import { UsersIcon } from "@/components/Icons";
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
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const visibleItems = items.filter((item) => item.username.toLowerCase().includes(query));

  return (
    <>
      <main className="page-content px-5 pb-32 pt-9">
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

        {items.length > 0 && (
          <div className="reveal-section mt-5">
            <label htmlFor="feed-search" className="sr-only">Cari teman yang sudah absen</label>
            <div className="field flex items-center gap-2 px-3.5">
              <UsersIcon className="h-4 w-4 shrink-0 text-muted" />
              <input id="feed-search" type="search" autoComplete="off" placeholder="Cari temanmu…" value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent py-3 text-[13px] outline-none placeholder:text-muted/65" />
            </div>
            <p role="status" className="mt-2 text-[10.5px] text-muted">{query ? `${visibleItems.length} teman ditemukan` : "Lihat siapa yang sudah merapat hari ini."}</p>
          </div>
        )}

        <div className="card stagger-list mt-4 divide-y divide-line px-4">
          {visibleItems.map((item) => (
            <FeedRow
              key={item.id}
              item={item}
              isMe={item.username === user.username}
            />
          ))}

          {visibleItems.length === 0 && (
            <div className="py-14 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-[18px] border border-flame/20 bg-flame/10 text-flame">
                <UsersIcon className="h-5 w-5" />
              </span>
              <p className="mt-4 text-[12.5px] font-medium">
                {query ? "Temanmu belum ditemukan" : "Pancong masih sepi"}
              </p>
              <p className="mt-1 text-[11px] text-muted">
                {query ? "Coba username lain atau lihat semua teman." : "Jadi yang pertama merapat dan nyalakan streak-mu."}
              </p>
              {query ? (
                <button type="button" onClick={() => setSearch("")} className="btn-quiet mt-5 px-4 py-2.5 text-[11px]">Tampilkan semua</button>
              ) : (
                <Link href="/" className="btn-accent mt-5 inline-block px-5 py-3 text-[12px]">Yuk, absen dulu</Link>
              )}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[9.5px] text-muted/50">
          {items.length === 0
            ? "Setiap absen akan muncul di sini"
            : "Diperbarui otomatis tiap absen"}
        </p>
      </main>

    </>
  );
}
