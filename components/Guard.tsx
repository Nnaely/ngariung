"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

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

/** Pesan layar penuh saat server tidak bisa dipakai, dengan tombol coba lagi. */
export function ServerNotice({ title, body, onRetry }: { title: string; body: string; onRetry: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center px-8 text-center">
      <div className="flex max-w-[300px] flex-col items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-[13px] border border-line text-flame">
          <FlameIcon className="h-5 w-5" />
        </span>
        <h1 className="text-[17px] font-bold tracking-tight">{title}</h1>
        <p className="text-[12px] leading-relaxed text-muted">{body}</p>
        <button type="button" onClick={onRetry} className="btn-quiet mt-2 px-5 py-2.5 text-[12px]">
          Coba lagi
        </button>
      </div>
    </div>
  );
}

/** Lindungi halaman: wajib punya sesi di server. */
export function Guard({ children }: { children: ReactNode }) {
  const { state, ready, status, refresh } = useStore();
  const router = useRouter();
  const waiting = status === "unavailable" || status === "offline";

  useEffect(() => {
    if (ready && !state.user && !waiting) router.replace("/login");
  }, [ready, state.user, waiting, router]);

  if (state.user) return <>{children}</>;
  if (ready && status === "unavailable")
    return (
      <ServerNotice
        title="Server belum siap"
        body="Database Ngariung belum tersambung. Coba lagi sebentar lagi, ya."
        onRetry={() => void refresh()}
      />
    );
  if (ready && status === "offline")
    return (
      <ServerNotice
        title="Tidak ada koneksi"
        body="Ngariung butuh internet untuk tahu siapa saja yang sudah di Pancong."
        onRetry={() => void refresh()}
      />
    );
  return <Splash />;
}
