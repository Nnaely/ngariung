"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function platform(): "ios" | "android" | "desktop" {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export function InstallRow() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (installed) return;
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      return;
    }
    setHelp((v) => !v);
  };

  const p = typeof navigator !== "undefined" ? platform() : "desktop";

  const hint =
    p === "ios"
      ? "Di iPhone: buka lewat Safari → tombol Share → Add to Home Screen."
      : p === "android"
        ? "Di Android: Chrome → menu ⋮ → Install app (atau Tambahkan ke layar utama)."
        : "Di desktop: klik ikon install di address bar, atau menu ⋮ → Cast, save, and share → Install page as app.";

  return (
    <>
      <button
        type="button"
        onClick={install}
        className="flex w-full items-center gap-3 py-3.5 text-left"
      >
        <span className="grid h-4 w-4 place-items-center text-[11px]">⬇️</span>
        <span className="flex-1 text-[12.5px]">Pasang aplikasi</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            installed ? "bg-mint/15 text-mint" : "border border-line text-muted"
          }`}
        >
          {installed ? "terpasang" : "install"}
        </span>
      </button>

      {help && !installed && (
        <p className="pb-3 pl-7 pr-2 text-[10.5px] leading-relaxed text-muted">
          {hint}
        </p>
      )}
    </>
  );
}
