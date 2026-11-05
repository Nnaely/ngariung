"use client";

import { useEffect, useRef, type ReactNode } from "react";
import "./dialog.css";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  className?: string;
  children: ReactNode;
};

/** Native top-layer dialog keeps keyboard focus and overlays inside the modal. */
export function Dialog({
  open,
  onClose,
  labelledBy,
  describedBy,
  className = "",
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    if (open) {
      if (!dialog.open) {
        returnFocus.current = document.activeElement as HTMLElement | null;
        dialog.showModal();
        dialog.querySelector<HTMLElement>("[data-dialog-autofocus]")?.focus({ preventScroll: true });
      }
      dialog.dataset.state = "open";
    } else if (dialog.open) {
      dialog.dataset.state = "closing";
      const reduced =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        document.documentElement.dataset.motion === "reduced";
      closeTimer = setTimeout(() => {
        dialog.close();
        if (returnFocus.current?.isConnected) {
          returnFocus.current.focus({ preventScroll: true });
        }
      }, reduced ? 0 : 180);
    }
    return () => clearTimeout(closeTimer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className={`app-dialog ${className}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        ) {
          onClose();
        }
      }}
    >
      {children}
    </dialog>
  );
}
