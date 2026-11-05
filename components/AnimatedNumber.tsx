"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionPreferences } from "./MotionPreferences";

export function AnimatedNumber({ value }: { value: number }) {
  const { reduced } = useMotionPreferences();
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (reduced || from === value) { setDisplay(value); return; }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / 480, 1);
      setDisplay(Math.round(from + (value - from) * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);

  return <span aria-label={String(value)}><span aria-hidden="true">{display}</span></span>;
}
