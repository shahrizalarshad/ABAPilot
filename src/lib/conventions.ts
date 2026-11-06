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
