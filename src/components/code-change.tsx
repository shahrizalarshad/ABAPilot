"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FilePlus2 } from "lucide-react";
import type { DeepPartial } from "ai";
import type { Analysis } from "@/lib/schema";
import {
  type CodeLocation,
  type DiffOp,
  type SourceIndex,
  describeLocation,
  diffLines,
  locateExcerpt,
} from "@/lib/code-diff";
import { Card, CodeBlock, CopyButton } from "@/components/ui";

type Change = NonNullable<DeepPartial<Analysis>["codeChanges"]>[number];

const rowCls = {
  same: "text-code-ink",
  del: "bg-code-removed/10 text-code-removed shadow-[inset_3px_0_0_var(--code-removed)]",
  ins: "bg-code-added/10 text-code-added shadow-[inset_3px_0_0_var(--code-added)]",
  pad: "bg-white/[0.03]",
};
const numCls =
  "inline-block w-12 flex-none pr-2 text-right text-code-comment tabular-nums select-none";

export function CodeChange({
  c,
  source,
  exactLines,
  changeId,
  isLoading,
}: {
  c: Change;
  /** Index of the uploaded code; null when no code is available to check against. */
  source: SourceIndex | null;
  /** False when the code was compacted, so line numbers don't match the real program. */
  exactLines: boolean;
  changeId?: string;
  isLoading?: boolean;
}) {
  const [mode, setMode] = useState<"unified" | "split">("unified");
  const original = c?.originalCode ?? "";
  const next = c?.abapCode ?? "";
  const hasOriginal = original.trim().length > 0;

  const loc = useMemo(
    () =>
      hasOriginal && source
        ? locateExcerpt(source, original, c?.fileName)
        : null,
    [hasOriginal, source, original, c?.fileName],
  );
  const ops = useMemo(
    () => (hasOriginal ? diffLines(original, next) : []),
    [hasOriginal, original, next],
  );

  const where = [c?.fileName, c?.location].filter(Boolean).join(" · ");

  return (
    <Card
      title={`Code · ${c?.objectName ?? ""}`}
      actions={<CopyButton text={next} label="Copy new code" />}
    >
      {c?.description && <p className="mb-3 text-muted">{c.description}</p>}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Status
          hasOriginal={hasOriginal}
          loc={loc}
          checked={!!source}
          exactLines={exactLines}
          where={where}
          pending={!!isLoading && !next}
        />
        {hasOriginal && (
          <div
            className="inline-flex rounded-md border border-line-strong p-0.5 text-xs"
            role="group"
            aria-label="Diff layout"
          >
            {(
              [
                ["unified", "Unified"],
                ["split", "Side by side"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={`rounded px-2 py-0.5 ${mode === m ? "bg-spruce text-on-spruce" : "text-ink hover:bg-sunken"}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!hasOriginal ? (
        <CodeBlock code={next} changeId={changeId} />
      ) : mode === "unified" ? (
        <Unified ops={ops} loc={exactLines ? loc : null} />
      ) : (
        <Split ops={ops} loc={exactLines ? loc : null} />
      )}
    </Card>
  );
}

function Status({
  hasOriginal,
  loc,
  checked,
  exactLines,
  where,
  pending,
}: {
  hasOriginal: boolean;
  loc: CodeLocation | null;
  checked: boolean;
  exactLines: boolean;
  where: string;
  pending: boolean;
}) {
  const base = "inline-flex items-center gap-1.5 text-xs";
  if (pending) return <span className={`${base} text-muted`}>{where}</span>;
  if (!hasOriginal)
    return (
      <span className={`${base} text-muted`}>
        <FilePlus2 className="h-4 w-4 text-spruce" />
        New code{where ? ` · ${where}` : ""}
      </span>
    );
  if (!checked)
    return (
      <span className={`${base} text-muted`}>
        {where ? `${where} · ` : ""}No program uploaded to check against
      </span>
    );
  if (!loc)
    return (
      <span
        className={`${base} rounded-sm bg-amber-soft px-2 py-1 font-medium text-amber`}
      >
        <AlertTriangle className="h-4 w-4" />
        Original lines not found in the uploaded code. Check before applying.
      </span>
    );
  const place = exactLines
    ? describeLocation(loc)
    : loc.file || "the uploaded code";
  return (
    <span
      className={`${base} rounded-sm bg-spruce-soft px-2 py-1 font-medium text-spruce`}
    >
      <CheckCircle2 className="h-4 w-4" />
      Found in {place}
      {where && locationSuffix(where, loc.file)}
      {loc.matches > 1 && ` · matches ${loc.matches} places, check which one`}
    </span>
  );
}

/** Show the FORM/method only when it adds something beyond the file name. */
function locationSuffix(where: string, file?: string) {
  const rest = where
    .split(" · ")
    .filter((p) => p !== file)
    .join(" · ");
  return rest ? ` · ${rest}` : "";
}

function oldNo(op: DiffOp, loc: CodeLocation | null) {
  if (op.oldIndex == null) return "";
  return loc ? (loc.lineNumbers[op.oldIndex] ?? "") : op.oldIndex + 1;
}

function newNo(op: DiffOp, loc: CodeLocation | null) {
  if (op.newIndex == null) return "";
  return (loc ? (loc.lineNumbers[0] ?? 1) : 1) + op.newIndex;
}

function Unified({ ops, loc }: { ops: DiffOp[]; loc: CodeLocation | null }) {
  return (
    <pre
      className="overflow-x-auto rounded-md bg-code py-2 font-mono text-xs leading-[21px]"
      data-testid="diff-unified"
    >
      {ops.map((op, i) => (
        <span
          key={i}
          className={`flex pr-4 whitespace-pre ${rowCls[op.type]}`}
          data-op={op.type}
        >
          <span className={numCls} aria-hidden="true">
            {oldNo(op, loc)}
          </span>
          <span className={numCls} aria-hidden="true">
            {newNo(op, loc)}
          </span>
          <span className="w-5 flex-none text-center select-none">
            {op.type === "del" ? "-" : op.type === "ins" ? "+" : " "}
          </span>
          {op.text || " "}
        </span>
      ))}
    </pre>
  );
}

type SplitRow = { left?: DiffOp; right?: DiffOp };

function toRows(ops: DiffOp[]): SplitRow[] {
  const rows: SplitRow[] = [];
  let dels: DiffOp[] = [];
  let ins: DiffOp[] = [];
  const flush = () => {
    for (let i = 0; i < Math.max(dels.length, ins.length); i++)
      rows.push({ left: dels[i], right: ins[i] });
    dels = [];
    ins = [];
  };
  for (const op of ops) {
    if (op.type === "del") dels.push(op);
    else if (op.type === "ins") ins.push(op);
    else {
      flush();
      rows.push({ left: op, right: op });
    }
  }
  flush();
  return rows;
}

function Split({ ops, loc }: { ops: DiffOp[]; loc: CodeLocation | null }) {
  const rows = toRows(ops);
  const side = (which: "left" | "right", label: string) => (
    <div className="min-w-0">
      <div className="border-b border-white/10 px-3 py-1 font-mono text-[11px] text-code-comment">
        {label}
      </div>
      <pre className="overflow-x-auto py-2 font-mono text-xs leading-[21px]">
        {rows.map((r, i) => {
          const op = r[which];
          return (
            <span
              key={i}
              className={`flex pr-4 whitespace-pre ${op ? rowCls[op.type] : rowCls.pad}`}
            >
              <span className={numCls} aria-hidden="true">
                {op ? (which === "left" ? oldNo(op, loc) : newNo(op, loc)) : ""}
              </span>
              {op?.text || " "}
            </span>
          );
        })}
      </pre>
    </div>
  );
  return (
    <div
      className="grid grid-cols-2 divide-x divide-white/10 overflow-hidden rounded-md bg-code"
      data-testid="diff-split"
    >
      {side("left", "Current")}
      {side("right", "New")}
    </div>
  );
}
