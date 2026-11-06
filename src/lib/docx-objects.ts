"use client";

import JSZip from "jszip";

/**
 * Embedded OLE objects in a .docx (Excel sheets, PDFs, Visio…). Word shows each
 * one as a preview picture (usually EMF), so mammoth only sees that picture.
 * We read the embedding itself and, for Excel, turn the sheets into text.
 */
export type EmbeddedObject = {
  /** Text inserted into the FSD where the object's preview appears. */
  text: string;
  /** Short description for the UI, e.g. "Excel: Microsoft_Excel_Worksheet.xlsx (3 sheets)". */
  summary: string;
  readable: boolean;
};

/** Map of preview-image base64 → the embedded object it stands for. */
export type ObjectsByPreview = Map<string, EmbeddedObject>;

// Layout sheets are often wide (70+ columns) but short, data samples long:
// keep full width, cap rows, and cap total size per embedded workbook.
const MAX_ROWS = 200;
const MAX_COLS = 100;
const MAX_CHARS_PER_OBJECT = 40_000;

const KINDS: [RegExp, string][] = [
  [/^Excel\.Sheet/i, "Excel"],
  [/^AcroExch|^Acrobat|^PDF/i, "PDF document"],
  [/^Visio/i, "Visio drawing"],
  [/^Word\.Document/i, "Word document"],
  [/^PowerPoint/i, "PowerPoint"],
  [/^Package/i, "attached file"],
  [/^PBrush|^Paint/i, "picture"],
];

export async function readEmbeddedObjects(
  docx: ArrayBuffer,
): Promise<ObjectsByPreview> {
  const result: ObjectsByPreview = new Map();
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(docx);
  } catch {
    return result;
  }
  const relsXml = await zip.file("word/_rels/document.xml.rels")?.async("text");
  const docXml = await zip.file("word/document.xml")?.async("text");
  if (!relsXml || !docXml) return result;

  const rels = new Map<string, string>();
  for (const r of xml(relsXml).getElementsByTagName("Relationship")) {
    rels.set(
      r.getAttribute("Id") ?? "",
      `word/${r.getAttribute("Target") ?? ""}`.replace("word//", ""),
    );
  }

  const doc = xml(docXml);
  for (const obj of Array.from(doc.getElementsByTagName("w:object"))) {
    const preview = byLocalName(obj, "imagedata")?.getAttribute("r:id");
    const ole = byLocalName(obj, "OLEObject");
    const embedPath = rels.get(ole?.getAttribute("r:id") ?? "");
    const previewPath = rels.get(preview ?? "");
    if (!previewPath || !embedPath) continue;

    const previewData = await zip.file(previewPath)?.async("base64");
    if (!previewData || result.has(previewData)) continue;

    const progId = ole?.getAttribute("ProgID") ?? "";
    const kind =
      KINDS.find(([re]) => re.test(progId))?.[1] ?? "embedded object";
    const fileName = embedPath.split("/").pop() ?? embedPath;

    // Leave pictures to the normal image handling.
    if (kind === "picture") continue;

    if (kind === "Excel" && fileName.toLowerCase().endsWith(".xlsx")) {
      const bytes = await zip.file(embedPath)?.async("arraybuffer");
      const sheets = bytes ? await readXlsx(bytes).catch(() => null) : null;
      if (sheets && sheets.length) {
        let budget = MAX_CHARS_PER_OBJECT;
        const body = sheets
          .map((s) => {
            const kept: string[] = [];
            for (const row of s.rows) {
              if (budget - row.length < 0) break;
              budget -= row.length + 1;
              kept.push(row);
            }
            const cut = s.totalRows - kept.length;
            const note =
              cut > 0
                ? `\n[… ${cut} more row${cut > 1 ? "s" : ""} not shown]`
                : "";
            return `Sheet "${s.name}" (${s.totalRows} rows × ${s.width} columns):\n${kept.join("\n")}${note}`;
          })
          .join("\n\n");
        result.set(previewData, {
          readable: true,
          summary: `Excel ${fileName} (${sheets.length} sheet${sheets.length > 1 ? "s" : ""})`,
          text: `[Embedded Excel: ${fileName}]\n${body}\n[End of embedded Excel]`,
        });
        continue;
      }
    }
    result.set(previewData, {
      readable: false,
      summary: `${kind}${kind === "Excel" ? " (old .xls format)" : ""}`,
      text: `[Embedded ${kind} — content not readable here; open it in Word if it matters]`,
    });
  }
  return result;
}

type Sheet = { name: string; rows: string[]; totalRows: number; width: number };

/** Minimal .xlsx reader: shared strings, inline strings and values; no formulas or styles. */
async function readXlsx(data: ArrayBuffer): Promise<Sheet[]> {
  const zip = await JSZip.loadAsync(data);
  const workbook = await zip.file("xl/workbook.xml")?.async("text");
  const wbRels = await zip.file("xl/_rels/workbook.xml.rels")?.async("text");
  if (!workbook || !wbRels) return [];

  const shared: string[] = [];
  const ss = await zip.file("xl/sharedStrings.xml")?.async("text");
  if (ss) {
    for (const si of Array.from(xml(ss).getElementsByTagName("si"))) {
      shared.push(
        Array.from(si.getElementsByTagName("t"))
          .map((t) => t.textContent ?? "")
          .join(""),
      );
    }
  }

  const targets = new Map<string, string>();
  for (const r of Array.from(
    xml(wbRels).getElementsByTagName("Relationship"),
  )) {
    const t = r.getAttribute("Target") ?? "";
    targets.set(
      r.getAttribute("Id") ?? "",
      t.startsWith("/") ? t.slice(1) : `xl/${t}`,
    );
  }

  const sheets: Sheet[] = [];
  for (const s of Array.from(xml(workbook).getElementsByTagName("sheet"))) {
    const path = targets.get(s.getAttribute("r:id") ?? "");
    const sheetXml = path ? await zip.file(path)?.async("text") : undefined;
    if (!sheetXml) continue;

    const grid: string[][] = [];
    let totalRows = 0;
    for (const row of Array.from(xml(sheetXml).getElementsByTagName("row"))) {
      const r = Number(row.getAttribute("r") ?? grid.length + 1) - 1;
      if (Array.from(row.getElementsByTagName("v")).some((v) => v.textContent))
        totalRows++;
      if (r >= MAX_ROWS) continue;
      for (const c of Array.from(row.getElementsByTagName("c"))) {
        const col = colIndex(c.getAttribute("r") ?? "");
        if (col < 0 || col >= MAX_COLS) continue;
        const type = c.getAttribute("t");
        const v = c.getElementsByTagName("v")[0]?.textContent ?? "";
        const value =
          type === "s"
            ? (shared[Number(v)] ?? "")
            : type === "inlineStr"
              ? Array.from(c.getElementsByTagName("t"))
                  .map((t) => t.textContent)
                  .join("")
              : v;
        (grid[r] ??= [])[col] = value.replace(/\s+/g, " ").trim();
      }
    }
    // Drop empty rows and trailing empty columns.
    const rows = grid.filter((r) => r && r.some((v) => v));
    const width = Math.max(
      0,
      ...rows.map((r) => r.reduce((w, v, i) => (v ? i + 1 : w), 0)),
    );
    if (!rows.length || !width) continue;
    sheets.push({
      totalRows: Math.max(totalRows, rows.length),
      width,
      name: s.getAttribute("name") ?? "Sheet",
      rows: rows.map(
        (r) =>
          `| ${Array.from({ length: width }, (_, i) => (r[i] ?? "").replace(/\|/g, "/")).join(" | ")} |`,
      ),
    });
  }
  return sheets;
}

function xml(text: string) {
  return new DOMParser().parseFromString(text, "application/xml");
}

function byLocalName(el: Element, name: string): Element | undefined {
  return Array.from(el.getElementsByTagName("*")).find(
    (e) => e.localName === name,
  );
}

/** "AB12" → 27 */
function colIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)?.[0];
  if (!letters) return -1;
  return [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
}
