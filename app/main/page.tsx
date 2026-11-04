"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Guard } from "@/components/Guard";
import { BottomNav } from "@/components/BottomNav";
import { ChevronRightIcon, FlameIcon, GamepadIcon, LockIcon } from "@/components/Icons";
import { checkedInToday, todayCheckIns, useStore } from "@/lib/store";
import {
  dailyTeka,
  dailyWord,
  RPS_LABEL,
  rpsResult,
  tttWinner,
  type Cell,
  type RpsChoice,
} from "@/lib/games";
import { todayWIB } from "@/lib/format";
import type { BattleRecord } from "@/lib/types";

type GameKey = "ttt" | "rps";

export default function MainPage() {
  return (
    <Guard>
      <Main />
    </Guard>
  );
}

function Main() {
  const { state, update } = useStore();
  const user = state.user!;
  const today = todayWIB();

  const atPancong = checkedInToday(state);
  const present = todayCheckIns(state).filter((c) => c.username !== user.username);

  const [game, setGame] = useState<GameKey>("ttt");
  const [opponent, setOpponent] = useState(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("lawan") ?? ""
      : "",
  );
  const [matchOpp, setMatchOpp] = useState<string | null>(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("lawan")
      : null,
  );
  const [notice, setNotice] = useState<string | null>(null);

  const word = dailyWord(today);
  const teka = dailyTeka(today);
  const kataDone = state.dailies.find((d) => d.date === today && d.game === "kata");
  const tekaDone = state.dailies.find((d) => d.date === today && d.game === "teka");

  const battleBoard = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of state.battles) {
      map.set(b.winner, (map.get(b.winner) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [state.battles]);

  const dailyBoard = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of state.dailies) {
      if (!d.solved) continue;
      map.set(d.username, (map.get(d.username) ?? 0) + d.score);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [state.dailies]);

  const record = (winner: string) => {
    const rec: BattleRecord = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `battle-${Date.now()}`,
      date: today,
      game,
      playerA: user.username,
      playerB: matchOpp ?? "Lawan",
      winner,
      at: new Date().toISOString(),
    };
    update((s) => ({ ...s, battles: [rec, ...s.battles] }));
    setNotice(`${winner} menang!`);
  };

  const startMatch = () => {
    const name = opponent.trim();
    if (!name || name.toLowerCase() === user.username.toLowerCase()) {
      setNotice("Isi nama lawan dulu (tidak boleh sama dengan kamu).");
      return;
    }
    setMatchOpp(name);
    setNotice(null);
  };

  return (
    <>
      <main className="px-5 pb-32 pt-9">
        <header>
          <p className="eyebrow">Main</p>
          <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.03em]">
            Mabar di Pancong
          </h1>
          <p className="mt-1 text-[11.5px] text-muted">
            Battle cuma terbuka kalau kamu sudah absen hari ini.
          </p>
        </header>

        {/* status */}
        <div className="card mt-5 flex items-center gap-3 px-4 py-3">
          <span
            className={`grid h-9 w-9 place-items-center rounded-full ${
              atPancong ? "bg-mint/15 text-mint" : "bg-white/[0.06] text-muted"
            }`}
          >
            {atPancong ? <GamepadIcon className="h-4 w-4" /> : <LockIcon className="h-4 w-4" />}
          </span>
          <div className="flex-1">
            <p className="text-[12.5px] font-semibold">
              {atPancong ? "Battle terbuka" : "Battle terkunci"}
            </p>
            <p className="text-[10.5px] text-muted">
              {atPancong
                ? "Kamu sudah absen hari ini"
                : "Absen dulu di Pancong untuk membuka"}
            </p>
          </div>
          {!atPancong && (
            <Link href="/" className="text-[11px] font-semibold text-flame">
              Absen
            </Link>
          )}
        </div>

        {/* battle */}
        <section className="mt-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[13px] font-bold">Battle</h2>
            <span className="text-[10px] text-muted">2 pemain, 1 HP</span>
          </div>

          <div className="card mt-3 p-4">
            <div className="flex gap-1 rounded-[12px] border border-line p-1">
              {(
                [
                  ["ttt", "Tic-Tac-Toe"],
                  ["rps", "Batu Gunting Kertas"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setGame(key);
                    setMatchOpp(null);
                    setNotice(null);
                  }}
                  className={`flex-1 rounded-[9px] py-2 text-[11px] font-semibold transition ${
                    game === key ? "bg-fg text-bg" : "text-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {!matchOpp ? (
              <div className="mt-4">
                <label className="eyebrow mb-2 block">Nama lawan</label>
                <input
                  value={opponent}
                  onChange={(e) => setOpponent(e.target.value)}
                  placeholder="siapa yang kamu tantang?"
                  disabled={!atPancong}
                  className="field w-full px-4 py-3 text-[13.5px] outline-none placeholder:text-muted/60 disabled:opacity-50"
                />
                {present.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {present.slice(0, 4).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setOpponent(f.username)}
                        className="rounded-full border border-line px-2.5 py-1 text-[10.5px] text-muted"
                      >
                        {f.username}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={startMatch}
                  disabled={!atPancong}
                  className="btn-accent mt-4 w-full py-2.5 text-[12.5px] disabled:opacity-40"
                >
                  Mulai battle
                </button>
              </div>
            ) : game === "ttt" ? (
              <TicTacToe
                me={user.username}
                opponent={matchOpp}
                onWin={record}
                onReset={() => {
                  setMatchOpp(null);
                  setNotice(null);
                }}
              />
            ) : (
              <Rps
                me={user.username}
                opponent={matchOpp}
                onWin={record}
                onReset={() => {
                  setMatchOpp(null);
                  setNotice(null);
                }}
              />
            )}

            {notice && (
              <p className="mt-3 text-center text-[11.5px] font-semibold text-amber">
                {notice}
              </p>
            )}
          </div>
        </section>

        {/* game harian */}
        <section className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[13px] font-bold">Harian</h2>
            <span className="text-[10px] text-muted">1 teka-teki per hari</span>
          </div>

          <div className="mt-3 grid gap-2.5">
            <Link href="/main/kata" className="card flex items-center gap-3 px-4 py-3.5">
              <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-flame/12 text-[15px] font-black text-flame">
                A
              </span>
              <div className="flex-1">
                <p className="text-[13px] font-semibold">Tebak Kata</p>
                <p className="text-[10.5px] text-muted">
                  {kataDone
                    ? kataDone.solved
                      ? "Selesai hari ini"
                      : "Gagal hari ini"
                    : `Kata hari ini: ${word.length} huruf`}
                </p>
              </div>
              <ChevronRightIcon className="h-4 w-4 text-muted" />
            </Link>

            <Link href="/main/teka" className="card flex items-center gap-3 px-4 py-3.5">
              <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-mint/12 text-[15px] font-black text-mint">
                ?
              </span>
              <div className="flex-1">
                <p className="text-[13px] font-semibold">Teka-teki</p>
                <p className="text-[10.5px] text-muted">
                  {tekaDone
                    ? tekaDone.solved
                      ? "Terjawab hari ini"
                      : "Belum terjawab"
                    : teka.q.slice(0, 44) + "…"}
                </p>
              </div>
              <ChevronRightIcon className="h-4 w-4 text-muted" />
            </Link>
          </div>
        </section>

        {/* leaderboard game */}
        <section className="mt-8">
          <h2 className="text-[13px] font-bold">Peringkat game</h2>

          <div className="card mt-3 p-4">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Rank battle</p>
              <FlameIcon className="h-3.5 w-3.5 text-amber" />
            </div>
            <ol className="mt-2 divide-y divide-line">
              {battleBoard.map(([name, wins], i) => (
                <li key={name} className="flex items-center gap-3 py-2.5">
                  <span
                    className={`tabular w-5 text-[11px] font-semibold ${
                      i === 0 ? "text-flame" : "text-muted"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 truncate text-[12.5px]">{name}</span>
                  <span className="tabular text-[12px] font-semibold">{wins}</span>
                </li>
              ))}
              {battleBoard.length === 0 && (
                <li className="py-3 text-[11px] text-muted">
                  Belum ada battle. Tantang temanmu!
                </li>
              )}
            </ol>
          </div>

          <div className="card mt-3 p-4">
            <p className="eyebrow">Rank harian</p>
            <ol className="mt-2 divide-y divide-line">
              {dailyBoard.map(([name, score], i) => (
                <li key={name} className="flex items-center gap-3 py-2.5">
                  <span
                    className={`tabular w-5 text-[11px] font-semibold ${
                      i === 0 ? "text-mint" : "text-muted"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 truncate text-[12.5px]">{name}</span>
                  <span className="tabular text-[12px] font-semibold">{score}</span>
                </li>
              ))}
              {dailyBoard.length === 0 && (
                <li className="py-3 text-[11px] text-muted">
                  Belum ada yang memecahkan teka-teki.
                </li>
              )}
            </ol>
          </div>
        </section>

        <p className="mt-6 text-[10px] leading-relaxed text-muted/60">
          Segera hadir: Catur, Tebak Gambar, Sambung Kata, Uno, Ludo.
        </p>
      </main>

      <BottomNav />
    </>
  );
}

/* ---------------- Tic-Tac-Toe ---------------- */

function TicTacToe({
  me,
  opponent,
  onWin,
  onReset,
}: {
  me: string;
  opponent: string;
  onWin: (winner: string) => void;
  onReset: () => void;
}) {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [done, setDone] = useState(false);

  const filled = board.filter(Boolean).length;
  const turn: "X" | "O" = filled % 2 === 0 ? "X" : "O";
  const result = tttWinner(board);
  const symbolName = (s: "X" | "O") => (s === "X" ? me : opponent);

  const play = (i: number) => {
    if (done || board[i] || result) return;
    const next = [...board];
    next[i] = turn;
    setBoard(next);

    const w = tttWinner(next);
    if (w === "X" || w === "O") {
      setDone(true);
      onWin(symbolName(w));
    } else if (w === "draw") {
      setDone(true);
    }
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setDone(false);
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted">
          {result
            ? result === "draw"
              ? "Seri"
              : `${symbolName(result as "X" | "O")} menang`
            : `Giliran ${symbolName(turn)}`}
        </span>
        <span className="text-muted">
          X {me} · O {opponent}
        </span>
      </div>

      <div className="mx-auto mt-3 grid w-[248px] grid-cols-3 gap-1.5">
        {board.map((cell, i) => (
          <button
            key={i}
            type="button"
            onClick={() => play(i)}
            disabled={done || !!cell}
            className={`grid h-[78px] place-items-center rounded-[12px] border text-[26px] font-black transition ${
              cell === "X"
                ? "border-flame/50 bg-flame/10 text-flame"
                : cell === "O"
                  ? "border-ice/40 bg-ice/10 text-ice"
                  : "border-line text-muted"
            }`}
          >
            {cell ?? ""}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={done ? onReset : reset}
        className="btn-quiet mt-4 w-full py-2.5 text-[12px]"
      >
        {done ? "Selesai" : "Ulangi"}
      </button>
    </div>
  );
}

/* ---------------- Batu Gunting Kertas ---------------- */

function Rps({
  me,
  opponent,
  onWin,
  onReset,
}: {
  me: string;
  opponent: string;
  onWin: (winner: string) => void;
  onReset: () => void;
}) {
  const [phase, setPhase] = useState<"A" | "B" | "reveal">("A");
  const [pickA, setPickA] = useState<RpsChoice | null>(null);
  const [pickB, setPickB] = useState<RpsChoice | null>(null);
  const [score, setScore] = useState({ a: 0, b: 0 });
  const [done, setDone] = useState(false);

  const choose = (choice: RpsChoice) => {
    if (done) return;
    if (phase === "A") {
      setPickA(choice);
      setPhase("B");
      return;
    }
    if (phase === "B" && pickA) {
      const r = rpsResult(pickA, choice);
      const next = {
        a: score.a + (r === "A" ? 1 : 0),
        b: score.b + (r === "B" ? 1 : 0),
      };
      setScore(next);
      setPickB(choice);
      setPhase("reveal");
      if (next.a >= 2) {
        setDone(true);
        onWin(me);
      } else if (next.b >= 2) {
        setDone(true);
        onWin(opponent);
      }
    }
  };

  const nextRound = () => {
    setPickA(null);
    setPickB(null);
    setPhase("A");
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-[11px] text-muted">
        <span>
          {me} {score.a}
        </span>
        <span>first to 2</span>
        <span>
          {score.b} {opponent}
        </span>
      </div>

      {phase !== "reveal" ? (
        <>
          <p className="mt-4 text-center text-[12px] font-semibold">
            {phase === "A" ? `Giliran ${me}` : `Serahkan HP ke ${opponent}`}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(Object.keys(RPS_LABEL) as RpsChoice[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => choose(c)}
                className="btn-quiet py-3.5 text-[12px]"
              >
                {RPS_LABEL[c]}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center gap-4 text-[13px] font-semibold">
            <span className="text-flame">{pickA && RPS_LABEL[pickA]}</span>
            <span className="text-muted">vs</span>
            <span className="text-ice">{pickB && RPS_LABEL[pickB]}</span>
          </div>
          <p className="mt-2 text-[11.5px] text-muted">
            {pickA && pickB
              ? rpsResult(pickA, pickB) === "draw"
                ? "Seri"
                : rpsResult(pickA, pickB) === "A"
                  ? `${me} menang ronde ini`
                  : `${opponent} menang ronde ini`
              : ""}
          </p>
          <button
            type="button"
            onClick={done ? onReset : nextRound}
            className="btn-accent mt-4 w-full py-2.5 text-[12px]"
          >
            {done ? "Selesai" : "Ronde berikutnya"}
          </button>
        </div>
      )}
    </div>
  );
}
