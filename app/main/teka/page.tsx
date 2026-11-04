"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Guard } from "@/components/Guard";
import { BottomNav } from "@/components/BottomNav";
import { dailyTeka, normalize } from "@/lib/games";
import { useStore } from "@/lib/store";
import { todayWIB } from "@/lib/format";

const MAX_TRIES = 3;

export default function TekaPage() {
  return (
    <Guard>
      <Teka />
    </Guard>
  );
}

function Teka() {
  const { state, update } = useStore();
  const user = state.user!;
  const today = todayWIB();
  const teka = dailyTeka(today);
  const played = state.dailies.find((d) => d.date === today && d.game === "teka");

  const [value, setValue] = useState("");
  const [tries, setTries] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [outcome, setOutcome] = useState<boolean | null>(null);
  const saving = useRef(false);

  const answerKey = teka.a.map(normalize);
  const solved = played ? played.solved : outcome === true;
  const finished = !!played || outcome !== null;

  const finish = (isCorrect: boolean) => {
    if (saving.current) return;
    saving.current = true;
    setOutcome(isCorrect);
    update((s) => ({
      ...s,
      dailies: [
        ...s.dailies,
        {
          date: today,
          game: "teka",
          username: user.username,
          solved: isCorrect,
          score: isCorrect ? 1 : 0,
          at: new Date().toISOString(),
        },
      ],
    }));
  };

  const submit = () => {
    if (finished) return;
    const guess = normalize(value);
    if (!guess) return;

    if (answerKey.includes(guess)) {
      finish(true);
      return;
    }

    const next = tries + 1;
    setTries(next);
    setWrong(true);
    setValue("");
    if (next >= MAX_TRIES) finish(false);
  };

  return (
    <>
      <main className="px-5 pb-32 pt-9">
        <Link href="/main" className="text-[11px] text-muted">
          ← Main
        </Link>
        <header className="mt-3">
          <p className="eyebrow">Harian · Teka-teki</p>
          <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.03em]">
            Satu teka-teki sehari
          </h1>
        </header>

        <div className="card mt-6 p-5">
          <p className="text-[14px] leading-relaxed">{teka.q}</p>

          {finished ? (
            <div className="mt-5 border-t border-line pt-4">
              <div className="flex items-center gap-2">
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${
                    solved
                      ? "bg-mint/15 text-mint"
                      : "bg-danger/15 text-danger"
                  }`}
                >
                  {solved ? "✓" : "×"}
                </span>
                <p className="text-[12.5px] font-semibold">
                  {solved ? "Jawabanmu benar" : "Jawabanmu belum tepat"}
                </p>
              </div>

              <p className="mt-3 text-[12px] text-muted">
                Jawaban resmi: <b className="text-fg">{teka.a[0]}</b>
              </p>
              {!solved && tries > 0 && (
                <p className="mt-1 text-[11px] text-muted">
                  Kamu mencoba {tries} kali.
                </p>
              )}

              <Link
                href="/main"
                className="btn-quiet mt-4 block py-2.5 text-center text-[12px]"
              >
                Kembali ke Main
              </Link>
            </div>
          ) : (
            <div className="mt-5">
              <input
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setWrong(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="jawabanmu…"
                maxLength={40}
                className="field w-full px-4 py-3 text-[13.5px] outline-none placeholder:text-muted/60"
              />
              {wrong && (
                <p className="mt-2 text-[11px] text-danger">
                  Belum tepat. Sisa {MAX_TRIES - tries} percobaan.
                </p>
              )}
              <button
                type="button"
                onClick={submit}
                className="btn-accent mt-3 w-full py-2.5 text-[12.5px]"
              >
                Jawab
              </button>
              <p className="mt-3 text-center text-[10px] text-muted">
                {MAX_TRIES - tries} percobaan tersisa
              </p>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </>
  );
}
