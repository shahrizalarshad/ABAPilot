import { useSyncExternalStore } from "react";

export type Conventions = {
  authorId: string;
  changeTagFormat: string;
  systemRelease: string;
  namingRules: string;
  extraRules: string;
  language: string;
};

export const DEFAULT_CONVENTIONS: Conventions = {
  authorId: "",
  changeTagFormat:
    '"{TAG} BEGIN - {TICKET} - {AUTHOR} - {DATE}\n...changed code...\n"{TAG} END - {TICKET}',
  systemRelease: "S/4HANA 2023 (ABAP 7.58)",
  namingRules:
    "Custom objects start with Z. Local variables lv_, tables lt_, structures ls_, objects lo_, parameters iv_/ev_/cv_.",
  extraRules:
    "Never modify SAP standard code; use enhancements/BAdIs. No SELECT inside LOOP. Use new ABAP syntax (inline declarations, string templates) where the release allows.",
  language: "English",
};

const KEY = "abapilot.conventions.v1";
const KEY_API = "abapilot.apikey.v1";

/** localStorage can be unavailable (private mode, blocked storage) — never crash. */
export function loadConventions(): Conventions {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_CONVENTIONS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_CONVENTIONS;
}

export function saveConventions(c: Conventions) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {}
}

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
