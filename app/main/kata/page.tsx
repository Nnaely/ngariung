"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Guard } from "@/components/Guard";
import "@/components/navigation.css";
import { dailyWord, scoreGuess, type LetterMark } from "@/lib/games";
import { useStore } from "@/lib/store";
import { todayWIB } from "@/lib/format";
import { ApiError } from "@/lib/api";

const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

export default function KataPage() {
  return (
    <Guard>
      <Kata />
    </Guard>
  );
}

function Kata() {
  const { state, recordDaily } = useStore();
  const today = state.today || todayWIB();
  const answer = dailyWord(today);

  const played = state.dailies.find((d) => d.date === today && d.game === "kata");

  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [recorded, setRecorded] = useState(false);
  const [message, setMessage] = useState("");
  const [invalidAttempt, setInvalidAttempt] = useState(0);

  const solved = guesses.includes(answer);
  const finished = solved || guesses.length >= 6;

  useEffect(() => {
    if (played || !finished || recorded) return;
    setRecorded(true);
    recordDaily({ game: "kata", solved }).catch((error: unknown) => {
      if (error instanceof ApiError && error.code === "ALREADY_PLAYED") return;
      setMessage(error instanceof ApiError ? error.message : "Hasil belum tersimpan. Cek koneksimu.");
    });
  }, [finished, played, recorded, solved, recordDaily]);

  const keyMarks = (() => {
    const best: Record<string, LetterMark> = {};
    const rank = { miss: 0, present: 1, hit: 2 } as const;
    for (const g of guesses) {
      const marks = scoreGuess(g, answer);
      g.split("").forEach((ch, i) => {
        const m = marks[i];
        if (!best[ch] || rank[m] > rank[best[ch]]) best[ch] = m;
      });
    }
    return best;
  })();

  const press = useCallback((key: string) => {
    if (played || finished) return;
    if (key === "ENTER") {
      if (current.length !== 5) {
        setMessage("Lengkapi 5 huruf dulu, ya.");
        setInvalidAttempt((attempt) => attempt + 1);
        return;
      }
      setMessage("");
      setGuesses((g) => [...g, current]);
      setCurrent("");
      return;
    }
    if (key === "DEL") {
      setMessage("");
      setCurrent((c) => c.slice(0, -1));
      return;
    }
    if (/^[A-Z]$/.test(key)) {
      setMessage("");
      setCurrent((c) => c.length < 5 ? c + key : c);
    }
  }, [current, finished, played]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select, a"))) return;
      // Enter/Space on a focused button belongs to that button, including the
      // on-screen keyboard. Do not replace its native activation with a guess.
      if (event.key === "Enter" && target instanceof HTMLElement && target.closest("button, [role='button'], [role='switch']")) return;
      const key = event.key === "Backspace" ? "DEL" : event.key.toUpperCase();
      if (key !== "ENTER" && key !== "DEL" && !/^[A-Z]$/.test(key)) return;
      event.preventDefault();
      press(key);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [press]);

  return (
    <>
      <main className="px-5 pb-32 pt-9">
        <Link href="/main" className="text-[11px] text-muted">
          ← Main
        </Link>
        <header className="mt-3">
          <p className="eyebrow">Harian · Tebak Kata</p>
          <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.03em]">
            Tebak kata hari ini
          </h1>
          <p className="mt-1 text-[11.5px] text-muted">
            5 huruf, 6 kesempatan. Satu kata per hari.
          </p>
        </header>

        {played && !recorded ? (
          <div className="panel-reveal card mt-6 p-5 text-center">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
              Sudah dimainkan
            </p>
            <p className="mt-3 text-[13px]">
              Jawaban hari ini:{" "}
              <b className="tracking-[0.2em]">{answer}</b>
            </p>
            <p className="mt-2 text-[11.5px] text-muted">
              {played.solved ? "Kamu berhasil 🎉" : "Coba lagi besok ya"}
            </p>
            <Link href="/main" className="btn-quiet mt-5 block py-2.5 text-[12px]">
              Kembali ke Main
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-1.5">
              {Array.from({ length: 6 }).map((_, r) => {
                const guess = guesses[r];
                const marks = guess ? scoreGuess(guess, answer) : null;
                const letters = guess
                  ? guess.split("")
                  : r === guesses.length
                    ? current.padEnd(5, " ").split("")
                    : ["", "", "", "", ""];
                return (
                  <div key={r === guesses.length ? `${r}-${invalidAttempt}` : r} className={`grid grid-cols-5 gap-1.5 ${r === guesses.length && message ? "answer-nudge" : ""}`}>
                    {letters.map((ch, c) => {
                      const m = marks?.[c];
                      return (
                        <div
                          key={`${c}-${m ?? ch.trim()}`}
                          data-filled={!!ch.trim()}
                          data-revealed={!!m}
                          aria-label={ch.trim() ? `${ch}: ${m === "hit" ? "posisi benar" : m === "present" ? "posisi berbeda" : m === "miss" ? "tidak ada" : "belum dikirim"}` : "Kosong"}
                          style={{ "--tile-delay": `${c * 55}ms` } as CSSProperties}
                          className={`word-tile grid h-[52px] place-items-center rounded-[10px] border text-[18px] font-bold uppercase ${
                            m === "hit"
                              ? "border-mint/60 bg-mint/20 text-mint"
                              : m === "present"
                                ? "border-amber/60 bg-amber/20 text-amber"
                                : m === "miss"
                                  ? "border-line bg-white/[0.04] text-muted"
                                  : ch.trim()
                                    ? "border-muted/40 text-fg"
                                    : "border-line text-muted"
                          }`}
                        >
                          {ch.trim()}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <p role="status" className={`mt-4 min-h-5 text-center text-[11px] ${message ? "text-danger" : finished ? solved ? "font-semibold text-mint" : "font-semibold text-amber" : "text-muted"}`}>
              {message || (finished ? solved ? "Benar! +1 poin harian" : `Kata hari ini: ${answer}` : `Percobaan ${guesses.length + 1} dari 6 · bisa pakai keyboard`)}
            </p>

            <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[9px] text-muted">
              <span><span className="text-mint">●</span> Posisi benar</span>
              <span><span className="text-amber">●</span> Posisi berbeda</span>
              <span><span className="text-muted/50">●</span> Tidak ada</span>
            </div>

            <div className="mt-5 space-y-1.5">
              {ROWS.map((row, i) => (
                <div key={row} className="flex justify-center gap-1">
                  {i === 2 && (
                    <button
                      type="button"
                      onClick={() => press("ENTER")}
                      aria-label="Kirim tebakan"
                      disabled={finished}
                      className="game-key h-11 w-9 shrink-0 rounded-[8px] border border-line text-[12px] font-semibold text-muted disabled:opacity-40"
                    >
                      ↵
                    </button>
                  )}
                  {row.split("").map((k) => {
                    const m = keyMarks[k];
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => press(k)}
                        disabled={finished}
                        className={`game-key h-11 min-w-0 flex-1 rounded-[7px] text-[12px] font-semibold disabled:opacity-60 ${
                          m === "hit"
                            ? "bg-mint/25 text-mint"
                            : m === "present"
                              ? "bg-amber/25 text-amber"
                              : m === "miss"
                                ? "bg-white/[0.03] text-muted/40"
                                : "bg-white/[0.06] text-fg"
                        }`}
                      >
                        {k}
                      </button>
                    );
                  })}
                  {i === 2 && (
                    <button
                      type="button"
                      onClick={() => press("DEL")}
                      aria-label="Hapus huruf terakhir"
                      disabled={finished}
                      className="game-key h-11 w-9 shrink-0 rounded-[8px] border border-line text-[12px] font-semibold text-muted disabled:opacity-40"
                    >
                      ⌫
                    </button>
                  )}
                </div>
              ))}
            </div>
            {finished && <Link href="/main" className="btn-quiet mt-5 block py-3 text-center text-[12px]">Kembali ke Main</Link>}
          </>
        )}
      </main>
    </>
  );
}
