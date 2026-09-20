"use client";

import { useEffect, useState } from "react";

/** `Date.now()` is impure and must not be called directly during render
 * (it can differ between server and client, causing a hydration mismatch).
 * This starts `null` until mounted, then refreshes periodically so a
 * deadline crossing shows up without a full page reload. */
export function useNow(intervalMs = 30_000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, intervalMs);
    const immediate = setTimeout(tick, 0);
    return () => {
      clearInterval(timer);
      clearTimeout(immediate);
    };
  }, [intervalMs]);
  return now;
}
