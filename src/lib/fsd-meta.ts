/**
 * Ticket details read straight from an FSD's structured text (no AI):
 * the latest row of the "Version Control" table, the program name on the
 * first page, the module from the ownership table, and the text of every
 * section labelled with the latest version.
 */

export type FsdMeta = {
  programId: string;
  programTitle: string;
  /** "TH" from ZTHSDR0027 */
  country: string;
  countryName: string;
  module: string;
  version: string;
  changeId: string;
  ticketId: string;
  date: string;
  status: string;
  functionalAuthor: string;
  /** All FSD text under the latest version's labels (for the AI to summarise). */
  latestVersionText: string;
};

const COUNTRIES: Record<string, string> = {
  TH: "Thailand",
  MY: "Malaysia",
  SG: "Singapore",
  VN: "Vietnam",
  ID: "Indonesia",
  PH: "Philippines",
  HK: "Hong Kong",
  TW: "Taiwan",
  CN: "China",
  KH: "Cambodia",
  MM: "Myanmar",
  LA: "Laos",
  JP: "Japan",
  KR: "Korea",
  AU: "Australia",
  NZ: "New Zealand",
  IN: "India",
  BN: "Brunei",
  MO: "Macau",
  CH: "Switzerland",
  DE: "Germany",
  US: "United States",
  GB: "United Kingdom",
  UK: "United Kingdom",
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  NL: "Netherlands",
};
const SAP_MODULES = [
  "SD",
  "MM",
  "FI",
  "CO",
  "PP",
  "QM",
  "PM",
  "WM",
  "EW",
  "LE",
  "HR",
  "PS",
  "BC",
  "CA",
  "TR",
  "CS",
  "GT",
  "XX",
];
const VERSION_RE = /^(?:version|ver\.?|v)\s*(\d+(?:\.\d+)?)\b/i;

type Table = string[][];

function parseBlocks(text: string): { tables: Table[]; paragraphs: string[] } {
  const tables: Table[] = [];
  const paragraphs: string[] = [];
  for (const block of text.split(/\n{2,}/)) {
    const lines = block.split("\n");
    if (lines.every((l) => l.startsWith("|"))) {
      tables.push(
        lines.map((l) =>
          l
            .replace(/^\|\s?|\s?\|$/g, "")
            .split(" | ")
            .map((c) => c.trim()),
        ),
      );
    } else {
      paragraphs.push(block.trim());
    }
  }
  return { tables, paragraphs };
}

function findCol(header: string[], re: RegExp): number {
  return header.findIndex((h) => re.test(h));
}

function versionControl(tables: Table[]) {
  for (const t of tables) {
    const h = t.findIndex(
      (row) =>
        row.some((c) => /^ver(sion)?\b|^ver\s*#/i.test(c)) &&
        row.some((c) => /date/i.test(c)),
    );
    if (h < 0) continue;
    const header = t[h];
    const col = {
      ver: findCol(header, /^ver(sion)?\b|^ver\s*#/i),
      amend: findCol(header, /amend|chg|change\s*(no|#|id)|^c#/i),
      date: findCol(header, /date/i),
      status: findCol(header, /status/i),
      ticket: findCol(
        header,
        /project|pcr|dcr|ticket|incident|request|^cr\b|change\s*request/i,
      ),
      fAuthor: findCol(header, /functional/i),
    };
    const rows = t.slice(h + 1).filter((r) => (r[col.ver] ?? "").match(/\d/));
    const last = rows.at(-1);
    if (!last) continue;
    const get = (i: number) => (i >= 0 ? (last[i] ?? "").trim() : "");
    return {
      version: get(col.ver),
      changeId: get(col.amend),
      date: get(col.date),
      status: get(col.status),
      ticketId: get(col.ticket),
      functionalAuthor: get(col.fAuthor),
    };
  }
  return null;
}

export function extractFsdMeta(text: string): FsdMeta | null {
  const { tables, paragraphs } = parseBlocks(text);
  const vc = versionControl(tables);

  // Program name: a Z/Y object name near the top (e.g. "ZTHSDR0027" or "Program ID : ZTHSDR0027").
  let programId = "";
  let programTitle = "";
  const top = paragraphs.slice(0, 40);
  for (let i = 0; i < top.length; i++) {
    const m = top[i].match(
      /^(?:program\s*(?:id|name)?\s*[:|-]?\s*)?([ZY][A-Z0-9_/]{4,29})$/i,
    );
    if (m) {
      programId = m[1].toUpperCase();
      const next = top[i + 1] ?? "";
      if (next && next.length <= 120 && !/^[ZY][A-Z0-9_]{4,}$/i.test(next))
        programTitle = next;
      break;
    }
  }

  // Module: "| Module | SD |" in an ownership table, else from the naming convention Z<CC><MM>…
  let sapModule = "";
  for (const t of tables)
    for (const row of t)
      if (/^module$/i.test(row[0] ?? "") && /^[A-Z]{2,4}$/i.test(row[1] ?? ""))
        sapModule ||= row[1].toUpperCase();
  const naming = programId.match(/^[ZY]([A-Z]{2})([A-Z]{2})/);
  const country = naming && COUNTRIES[naming[1]] ? naming[1] : "";
  if (!sapModule && naming && SAP_MODULES.includes(naming[2])) sapModule = naming[2];

  // Every paragraph under a label for the latest version, until the next version label.
  let latestVersionText = "";
  const latest = Number(vc?.version.replace(/[^\d.]/g, ""));
  if (latest) {
    const chunks: string[] = [];
    let current: number | null = null;
    for (const block of text.split(/\n{2,}/)) {
      const m = block.match(VERSION_RE);
      if (m) current = Number(m[1]); // headings and other text don't end a version block
      if (current === latest) chunks.push(block);
    }
    latestVersionText = chunks.join("\n\n").slice(0, 25_000);
  }

  if (!vc && !programId) return null;
  return {
    programId,
    programTitle,
    country,
    countryName: COUNTRIES[country] ?? "",
    module: sapModule,
    version: vc?.version ?? "",
    changeId: vc?.changeId ?? "",
    ticketId: vc?.ticketId ?? "",
    date: vc?.date ?? "",
    status: vc?.status ?? "",
    functionalAuthor: vc?.functionalAuthor ?? "",
    latestVersionText,
  };
}
