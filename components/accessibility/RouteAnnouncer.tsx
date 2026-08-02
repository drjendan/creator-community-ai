"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function RouteAnnouncer() {
  const pathname = usePathname(); const [announcement, setAnnouncement] = useState(""); const initialRoute = useRef(true);
  useEffect(() => {
    if (initialRoute.current) { initialRoute.current = false; return; }
    const frame = window.requestAnimationFrame(() => {
      const heading = document.querySelector("h1")?.textContent?.trim();
      setAnnouncement(heading ? `${heading} loaded` : `${document.title} loaded`);
      document.getElementById("application-content")?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);
  return <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>;
}
