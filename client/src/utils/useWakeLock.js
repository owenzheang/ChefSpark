import { useEffect, useState } from "react";

// Keeps the screen awake while cooking (Screen Wake Lock API). Browsers release the lock when the
// tab is hidden, so it is requested again on return. Unsupported browsers simply report "off".
export function useWakeLock(active = true) {
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const wakeLock = typeof navigator !== "undefined" ? navigator.wakeLock : undefined;
    if (!active || !wakeLock?.request) return undefined;
    let sentinel = null;
    let cancelled = false;

    async function acquire() {
      try {
        sentinel = await wakeLock.request("screen");
        if (cancelled) { sentinel.release?.(); return; }
        setLocked(true);
        sentinel.addEventListener?.("release", () => setLocked(false));
      } catch {
        setLocked(false); // Denied (battery saver, permissions) — cooking still works.
      }
    }

    function onVisibility() {
      if (document.visibilityState === "visible" && (!sentinel || sentinel.released)) acquire();
    }

    acquire();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      sentinel?.release?.();
    };
  }, [active]);

  return locked;
}
