/**
 * Shrink ABAP source for analysis without losing what the AI needs:
 * - full-line comments (`*` in column 1, or lines starting with `"`) are removed,
 *   including commented-out old code;
 * - the change-history header keeps its first lines (program title) and its
 *   latest entries, so the AI can follow the numbering (C059 → C060);
 * - change markers like "*-- BEGIN OF CHANGE C059" are kept;
 * - trailing comments on code lines ("C059+) are kept;
 * - blank lines are removed.
 * File markers added by ABAPilot ("*&---- File: … ----*") are always kept.
 */

export type CompactResult = {
  text: string;
  removedLines: number;
  before: number;
  after: number;
};

const HEADER_KEEP_FIRST = 8;
const HEADER_KEEP_LAST = 40;
const FILE_MARKER = /^\*&---- File: .* ----\*$/;
const CHANGE_MARKER =
  /\b(begin|end|start|stop)\b[^\n]*\b(of\s+)?(change|chg|modif\w*|insert\w*|delet\w*|mod)\b|^\*\s*[-=*>]{1,}\s*(begin|end)\b/i;

const isComment = (l: string) =>
  l.startsWith("*") || l.trimStart().startsWith('"');

export function compactAbap(source: string): CompactResult {
  const before = source.length;
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let removed = 0;
  let i = 0;

  while (i < lines.length) {
    // A file section starts at its marker (or at the top of pasted code).
    if (FILE_MARKER.test(lines[i])) out.push(lines[i++]);

    // Header: comment/blank lines before the first statement of this file.
    const start = i;
    while (
      i < lines.length &&
      !FILE_MARKER.test(lines[i]) &&
      (isComment(lines[i]) || !lines[i].trim())
    )
      i++;
    const header = lines.slice(start, i).filter((l) => l.trim());
    const alreadyCut = header.some((l) =>
      l.includes("change-history lines removed by ABAPilot"),
    );
    if (!alreadyCut && header.length > HEADER_KEEP_FIRST + HEADER_KEEP_LAST) {
      const dropped = header.length - HEADER_KEEP_FIRST - HEADER_KEEP_LAST;
      out.push(
        ...header.slice(0, HEADER_KEEP_FIRST),
        `* … ${dropped} older change-history lines removed by ABAPilot …`,
        ...header.slice(-HEADER_KEEP_LAST),
      );
      removed += dropped;
    } else {
      out.push(...header);
    }
    removed += i - start - header.length; // blank lines in the header

    // Body until the next file marker.
    while (i < lines.length && !FILE_MARKER.test(lines[i])) {
      const l = lines[i++];
      if (!l.trim()) {
        removed++;
      } else if (isComment(l) && !CHANGE_MARKER.test(l)) {
        removed++;
      } else {
        out.push(l.replace(/\s+$/, ""));
      }
    }
  }

  const text = out.join("\n");
  return { text, removedLines: removed, before, after: text.length };
}

/**
 * INCLUDE programs referenced in the code but not present as uploaded files.
 * Ignores INCLUDE STRUCTURE / INCLUDE TYPE (data declarations).
 */
export function missingIncludes(code: string, fileNames: string[]): string[] {
  const have = new Set(
    fileNames.map((f) =>
      f
        .replace(/\.[^.]+$/, "")
        .replace(/^[0-9a-f]{8}-/i, "")
        .toUpperCase(),
    ),
  );
  for (const m of code.matchAll(/^\*&---- File: (.+?) ----\*$/gm))
    have.add(m[1].replace(/\.[^.]+$/, "").toUpperCase());
  const found = new Set<string>();
  for (const m of code.matchAll(/^\s*INCLUDE\s+([A-Z0-9_/]+)\s*\./gim)) {
    const name = m[1].toUpperCase();
    if (!["STRUCTURE", "TYPE"].includes(name) && !have.has(name))
      found.add(name);
  }
  return [...found];
}
