import { useEffect, useState } from "react";
import { STORAGE_KEY } from "../data";

const defaultState = { sessions: [], lastSessionId: null };

export function usePersistentState() {
  const [state, setState] = useState(() => {
    if (typeof localStorage === "undefined") return defaultState;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : defaultState;
    } catch (err) {
      console.warn("Failed to load saved state", err);
      return defaultState;
    }
  });

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("Failed to persist state", err);
    }
  }, [state]);

  return [state, setState];
}
