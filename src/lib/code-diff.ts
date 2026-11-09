/**
 * Before/after support for proposed code changes, without AI:
 * - `indexSource` + `locateExcerpt` find the AI's "original code" in the uploaded program.
 * - `diffLines` computes a line diff between the original and the new code.
 */

const FILE_MARKER = /^\*&---- File: (.+?) ----\*$/;

/** Comparison key for one line: "" for blank and comment lines, which matching skips. */
function lineKey(line: string): string {
  const t = line.trim();
  if (!t || t.startsWith("*") || t.startsWith('"')) return "";
  // Drop a trailing "comment, but not a " inside a '...' or `...` literal or a |...| template.
  let quote = "";
  let cut = t.length;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (quote) {
      if (ch === quote) quote = "";
    } else if (ch === "'" || ch === "`" || ch === "|") quote = ch;
    else if (ch === '"') {
      cut = i;
      break;
    }
  }
  return t.slice(0, cut).replace(/\s+/g, " ").trim().toUpperCase();
}

type SourceLine = { file?: string; line: number; key: string };

/** Significant lines of the uploaded code, each with its file and line number within that file. */
export type SourceIndex = SourceLine[];

export function indexSource(code: string): SourceIndex {
  const out: SourceIndex = [];
  let file: string | undefined;
  let n = 0;
  for (const raw of code.replace(/\r\n?/g, "\n").split("\n")) {
    const m = raw.trim().match(FILE_MARKER);
    if (m) {
      file = m[1];
      n = 0;
      continue;
    }
    n++;
    const key = lineKey(raw);
    if (key) out.push({ file, line: n, key });
  }
  return out;
}

export type CodeLocation = {
  file?: string;
  startLine: number;
  endLine: number;
  /** Source line number for each line of the excerpt (blank/comment lines are interpolated). */
  lineNumbers: number[];
  /** How many places in the code match; more than 1 means the excerpt is ambiguous. */
  matches: number;
};

/**
 * Find an excerpt in the uploaded code. Blank lines, comment lines, trailing comments,
 * indentation and letter case are ignored, so an excerpt copied from compacted code
 * still matches the full program. Returns null when the excerpt isn't there.
 */
export function locateExcerpt(
  index: SourceIndex,
  excerpt: string,
  preferFile?: string,
): CodeLocation | null {
  const lines = excerpt.replace(/\r\n?/g, "\n").split("\n");
  const keys = lines.map(lineKey);
  const sig = keys.flatMap((k, i) => (k ? [i] : []));
  if (!sig.length || !index.length) return null;

  const starts: number[] = [];
  const first = keys[sig[0]];
  for (let s = 0; s + sig.length <= index.length; s++) {
    if (index[s].key !== first) continue;
    let ok = true;
    for (let j = 1; j < sig.length; j++) {
      const src = index[s + j];
      if (src.key !== keys[sig[j]] || src.file !== index[s].file) {
        ok = false;
        break;
      }
    }
    if (ok) starts.push(s);
  }
  if (!starts.length) return null;

  const pref = preferFile?.trim().toUpperCase();
  const preferred = pref
    ? starts.find((i) => index[i].file?.toUpperCase() === pref)
    : undefined;
  const s = preferred ?? starts[0];

  // Line number for every excerpt line: significant lines map to the source,
  // other lines count on from the previous one.
  const lineNumbers: number[] = [];
  let k = 0;
  let prev = index[s].line - 1;
  for (let i = 0; i < lines.length; i++) {
    if (keys[i]) prev = index[s + k++].line;
    else if (i < sig[0]) prev = index[s].line - (sig[0] - i);
    else prev = prev + 1;
    lineNumbers.push(prev);
  }
  const startLine = index[s].line;
  const endLine = index[s + sig.length - 1].line;
  return {
    file: index[s].file,
    startLine,
    endLine,
    lineNumbers,
    matches: starts.length,
  };
}

export type DiffOp = {
  type: "same" | "del" | "ins";
  text: string;
  /** 0-based index in the old / new line arrays. */
  oldIndex?: number;
  newIndex?: number;
};

/** Line diff (longest common subsequence). Lines are compared without trailing spaces. */
export function diffLines(oldText: string, newText: string): DiffOp[] {
  const a = oldText.replace(/\r\n?/g, "\n").replace(/\n+$/, "").split("\n");
  const b = newText.replace(/\r\n?/g, "\n").replace(/\n+$/, "").split("\n");
  const eq = (x: string, y: string) => x.trimEnd() === y.trimEnd();

  // Trim the common prefix and suffix so the LCS table stays small.
  let pre = 0;
  while (pre < a.length && pre < b.length && eq(a[pre], b[pre])) pre++;
  let suf = 0;
  while (
    suf < a.length - pre &&
    suf < b.length - pre &&
    eq(a[a.length - 1 - suf], b[b.length - 1 - suf])
  )
    suf++;

  const ops: DiffOp[] = [];
  for (let i = 0; i < pre; i++)
    ops.push({ type: "same", text: b[i], oldIndex: i, newIndex: i });

  const am = a.slice(pre, a.length - suf);
  const bm = b.slice(pre, b.length - suf);
  const n = am.length;
  const m = bm.length;
  if (n * m > 4_000_000) {
    // Too large for a table: show everything as removed then added.
    am.forEach((t, i) => ops.push({ type: "del", text: t, oldIndex: pre + i }));
    bm.forEach((t, j) => ops.push({ type: "ins", text: t, newIndex: pre + j }));
  } else {
    const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--)
      for (let j = m - 1; j >= 0; j--)
        dp[i][j] = eq(am[i], bm[j])
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && eq(am[i], bm[j])) {
        ops.push({
          type: "same",
          text: bm[j],
          oldIndex: pre + i++,
          newIndex: pre + j++,
        });
      } else if (i < n && (j === m || dp[i + 1][j] >= dp[i][j + 1])) {
        ops.push({ type: "del", text: am[i], oldIndex: pre + i++ });
      } else {
        ops.push({ type: "ins", text: bm[j], newIndex: pre + j++ });
      }
    }
  }

  for (let k = 0; k < suf; k++)
    ops.push({
      type: "same",
      text: b[b.length - suf + k],
      oldIndex: a.length - suf + k,
      newIndex: b.length - suf + k,
    });
  return ops;
}

/** "ZTHSDR0027_F01, lines 2442–2450" */
export function describeLocation(loc: CodeLocation): string {
  const lines =
    loc.startLine === loc.endLine
      ? `line ${loc.startLine}`
      : `lines ${loc.startLine}–${loc.endLine}`;
  return loc.file ? `${loc.file}, ${lines}` : lines;
}

/**
 * Compact code removes every blank line, so line numbers in code without any blank
 * line don't match the real program. A real ABAP program always has blank lines.
 */
export function hasRealLineNumbers(code: string): boolean {
  return /\n[ \t]*\r?\n/.test(code);
}

/** Where a proposed change's original lines are, as text for exports; "" when not checked. */
export function locationText(
  source: SourceIndex | null,
  exactLines: boolean,
  c: { originalCode?: string; fileName?: string } | undefined,
): string {
  if (!source || !c?.originalCode?.trim()) return "";
  const loc = locateExcerpt(source, c.originalCode, c.fileName);
  if (!loc) return "Original lines not found in the uploaded code";
  return `Found in ${exactLines ? describeLocation(loc) : loc.file || "the uploaded code"}`;
}
