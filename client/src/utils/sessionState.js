import { useEffect, useState } from "react";

// State kept in this tab's sessionStorage so refresh and back keep it; closing the tab clears it.
// Storage can be unavailable (private mode, SSR): then it behaves like ordinary state.
function read(key, initial) {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw === null ? initial : JSON.parse(raw);
  } catch {
    return initial;
  }
}

export function useSessionState(key, initial) {
  const [value, setValue] = useState(() => read(key, initial));
  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or blocked: keep the in-memory value only.
    }
  }, [key, value]);
  return [value, setValue];
}

export function clearSessionKeys(keys) {
  try {
    keys.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
