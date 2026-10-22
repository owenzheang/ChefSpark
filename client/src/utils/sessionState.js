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

// Removes every key with the given prefix (e.g. all of ChefSpark's per-tab state on sign-out).
export function clearSessionPrefix(prefix) {
  try {
    Object.keys(window.sessionStorage).filter((key) => key.startsWith(prefix))
      .forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
