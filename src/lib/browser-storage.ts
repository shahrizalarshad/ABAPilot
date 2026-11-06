"use client";

import { useSyncExternalStore } from "react";

// Only the optional "bring your own key" lives in the browser now.
// Team conventions are stored per account in the database.
const KEY_API = "abapilot.apikey.v1";

/** localStorage can be unavailable (private mode, blocked storage), so never crash. */
export function loadApiKey(): string {
  try {
    return localStorage.getItem(KEY_API) ?? "";
  } catch {
    return "";
  }
}

export function saveApiKey(k: string) {
  try {
    if (k) localStorage.setItem(KEY_API, k);
    else localStorage.removeItem(KEY_API);
  } catch {}
}

/** True only after hydration on the client, so localStorage reads don't cause SSR mismatches. */
const noop = () => () => {};
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
