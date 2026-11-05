"use client";

import { useEffect } from "react";

export type Toast = { id: string; title: string; body: string };

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), 5000);
    return () => window.clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <button
      type="button"
      onClick={() => onDismiss(toast.id)}
      className="toast-item pointer-events-auto w-full rounded-[16px] border border-flame/25 bg-panel/95 px-4 py-3 text-left shadow-[0_18px_40px_-20px_rgba(0,0,0,0.8)] backdrop-blur"
    >
      <span className="block text-[12.5px] font-semibold">{toast.title}</span>
      <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">{toast.body}</span>
    </button>
  );
}

/** Kabar singkat di atas layar, mis. saat teman baru absen. */
export function Toaster({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-50 mx-auto flex w-full max-w-[440px] flex-col gap-2 px-4"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
