"use client";

import { useEffect, useRef } from "react";

const focusable = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function useDialogFocus<T extends HTMLElement>(open: boolean, onEscape: () => void) {
  const ref = useRef<T>(null); const escapeRef = useRef(onEscape); escapeRef.current = onEscape;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null; const dialog = ref.current;
    const controls = () => Array.from(dialog?.querySelectorAll<HTMLElement>(focusable) ?? []).filter((item) => !item.hasAttribute("aria-hidden"));
    controls()[0]?.focus();
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); escapeRef.current(); return; }
      if (event.key !== "Tab") return;
      const items = controls(); if (!items.length) { event.preventDefault(); dialog?.focus(); return; }
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", keyboard);
    return () => { document.removeEventListener("keydown", keyboard); previous?.focus(); };
  }, [open]);
  return ref;
}
