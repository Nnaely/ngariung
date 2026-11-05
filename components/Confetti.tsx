"use client";

import { useMemo, type CSSProperties } from "react";

const COLORS = [
  "#F04E23",
  "#FF7A3D",
  "#F4F4F5",
  "#8A8A93",
  "#3DDC97",
  "#F04E23",
  "#FF7A3D",
];

export function Confetti({ count = 44 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        dx: (Math.random() - 0.5) * 240,
        rot: Math.random() * 900 - 450,
        dur: 1.3 + Math.random() * 1.1,
        delay: Math.random() * 0.25,
        color: COLORS[i % COLORS.length],
        w: 6 + Math.random() * 6,
        h: 9 + Math.random() * 10,
        round: Math.random() > 0.7,
      })),
    [count],
  );

  return (
    <div aria-hidden="true" className="confetti-layer">
      {pieces.map((p, i) => {
        const style = {
          left: `${p.left}%`,
          background: p.color,
          width: p.w,
          height: p.h,
          borderRadius: p.round ? "999px" : "2px",
          "--dx": `${p.dx}px`,
          "--rot": `${p.rot}deg`,
          "--dur": `${p.dur}s`,
          "--delay": `${p.delay}s`,
        } as CSSProperties;
        return <span key={i} className="confetti-piece" style={style} />;
      })}
    </div>
  );
}
