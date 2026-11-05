"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "ngariung.motion.v1";
const MotionContext = createContext({
  reduced: false,
  minimize: false,
  setMinimize: (_value: boolean) => {},
});

export function MotionProvider({ children }: { children: ReactNode }) {
  const [minimize, setMinimize] = useState(false);
  const [systemReduced, setSystemReduced] = useState(false);

  useEffect(() => {
    try { setMinimize(localStorage.getItem(STORAGE_KEY) === "reduced"); } catch {}
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setSystemReduced(media.matches);
    const syncStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) setMinimize(event.newValue === "reduced");
    };
    sync();
    media.addEventListener("change", sync);
    window.addEventListener("storage", syncStorage);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  const reduced = minimize || systemReduced;
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? "reduced" : "full";
  }, [reduced]);

  function changePreference(value: boolean) {
    setMinimize(value);
    try { localStorage.setItem(STORAGE_KEY, value ? "reduced" : "system"); } catch {}
  }

  return (
    <MotionContext.Provider value={{ reduced, minimize, setMinimize: changePreference }}>
      {children}
    </MotionContext.Provider>
  );
}

export function useMotionPreferences() { return useContext(MotionContext); }

export function MotionSettings() {
  const { minimize, reduced, setMinimize } = useMotionPreferences();
  return (
    <div className="flex items-center gap-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p id="motion-label" className="text-[12.5px] font-medium">Kurangi animasi</p>
        <p id="motion-description" className="mt-1 text-[10.5px] leading-relaxed text-muted">
          {reduced ? "Gerakan dibuat minimal agar lebih nyaman." : "Transisi halus, mengikuti preferensi perangkatmu."}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={minimize}
        aria-labelledby="motion-label"
        aria-describedby="motion-description"
        onClick={() => setMinimize(!minimize)}
        className="motion-switch"
      ><span /></button>
    </div>
  );
}
