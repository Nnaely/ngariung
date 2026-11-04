"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Guard } from "@/components/Guard";
import { BottomNav } from "@/components/BottomNav";
import { dailyWord, scoreGuess, type LetterMark } from "@/lib/games";
import { useStore } from "@/lib/store";
import { todayWIB } from "@/lib/format";

const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

export default function KataPage() {
  return (
    <Guard>
      <Kata />
    </Guard>
  );
}

function Kata() {
  const { state, update } = useStore();
  const user = state.user!;
  const today = todayWIB();
  const answer = dailyWord(today);

  const played = state.dailies.find((d) => d.date === today && d.game === "kata");

  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [recorded, setRecorded] = useState(false);

  const solved = guesses.includes(answer);
  const finished = solved || guesses.length >= 6;

  useEffect(() => {
    if (played || !finished || recorded) return;
    setRecorded(true);
    update((s) => ({
      ...s,
      dailies: [
        ...s.dailies,
        {
          date: today,
          game: "kata",
          username: user.username,
          solved,
          score: solved ? 1 : 0,
          at: new Date().toISOString(),
        },
      ],
    }));
  }, [finished, played, recorded, solved, today, update, user.username]);

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

  const press = (key: string) => {
    if (played || finished) return;
    if (key === "ENTER") {
      if (current.length !== 5) return;
      setGuesses((g) => [...g, current]);
      setCurrent("");
      return;
    }
    if (key === "DEL") {
      setCurrent((c) => c.slice(0, -1));
      return;
    }
    if (current.length < 5) setCurrent((c) => c + key);
  };

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

        {played ? (
          <div className="card mt-6 p-5 text-center">
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
                  <div key={r} className="grid grid-cols-5 gap-1.5">
                    {letters.map((ch, c) => {
                      const m = marks?.[c];
                      return (
                        <div
                          key={c}
                          className={`grid h-[52px] place-items-center rounded-[10px] border text-[18px] font-bold uppercase ${
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

            {finished && (
              <p className="mt-4 text-center text-[12px] font-semibold text-mint">
                {solved ? "Benar! +1 poin harian" : `Kata hari ini: ${answer}`}
              </p>
            )}

            <div className="mt-5 space-y-1.5">
              {ROWS.map((row, i) => (
                <div key={row} className="flex justify-center gap-1">
                  {i === 2 && (
                    <button
                      type="button"
                      onClick={() => press("ENTER")}
                      className="h-10 w-[42px] shrink-0 rounded-[8px] border border-line text-[12px] font-semibold text-muted"
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
                        className={`h-10 min-w-[26px] flex-1 rounded-[7px] text-[12px] font-semibold ${
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
                      className="h-10 w-[42px] shrink-0 rounded-[8px] border border-line text-[12px] font-semibold text-muted"
                    >
                      ⌫
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
      <BottomNav />
    </>
  );
}
