"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

export const inputCls =
  "w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm outline-none focus:border-spruce focus:ring-2 focus:ring-spruce/20";

export function Field({
  label,
  hint,
  children,
}: {
  label: ReactNode;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-1.5 text-sm font-medium">
        {label}
      </span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Card({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {actions}
      </div>
      <div className="p-4 text-sm">{children}</div>
    </section>
  );
}

export function CopyButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
      className="inline-flex items-center gap-1 rounded-md border border-line-strong px-2 py-1 text-xs hover:bg-sunken"
    >
      {done ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {done ? "Copied" : label}
    </button>
  );
}

export function Badge({
  children,
  tone = "zinc",
}: {
  children: ReactNode;
  tone?: "zinc" | "blue" | "amber" | "red" | "green";
}) {
  const tones = {
    zinc: "bg-sunken text-ink",
    blue: "bg-spruce-soft text-spruce",
    amber: "bg-amber-soft text-amber",
    red: "bg-markup-soft text-markup",
    green: "bg-spruce-soft text-spruce",
  };
  return (
    <span
      className={`inline-flex rounded-sm px-2 py-0.5 text-xs font-medium tabular-nums ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Tiny, dependency-free renderer for the Markdown the model returns (headings, lists, code, bold). */
export function Prose({ text }: { text?: string }) {
  if (!text) return null;
  const blocks = text.split(/```/);
  return (
    <div className="space-y-2 leading-relaxed">
      {blocks.map((b, i) =>
        i % 2 === 1 ? (
          <pre
            key={i}
            className="overflow-x-auto rounded-md bg-code p-3 font-mono text-xs text-code-ink"
          >
            {b.replace(/^[a-z]*\n/i, "")}
          </pre>
        ) : (
          b
            .split(/\n{2,}/)
            .filter((p) => p.trim())
            .map((p, j) => <Paragraph key={`${i}-${j}`} text={p} />)
        ),
      )}
    </div>
  );
}

function inline(s: string) {
  const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i}>{p.slice(2, -2)}</strong>
    ) : p.startsWith("`") && p.endsWith("`") ? (
      <code key={i} className="rounded bg-sunken px-1 font-mono text-[0.85em]">
        {p.slice(1, -1)}
      </code>
    ) : (
      p
    ),
  );
}

function Paragraph({ text }: { text: string }) {
  const lines = text.split("\n");
  if (lines.every((l) => /^\s*([-*]|\d+\.)\s/.test(l))) {
    const ordered = /^\s*\d+\./.test(lines[0]);
    const items = lines.map((l) => l.replace(/^\s*([-*]|\d+\.)\s/, ""));
    const List = ordered ? "ol" : "ul";
    return (
      <List
        className={`${ordered ? "list-decimal" : "list-disc"} space-y-1 pl-5`}
      >
        {items.map((it, i) => (
          <li key={i}>{inline(it)}</li>
        ))}
      </List>
    );
  }
  const h = text.match(/^(#{1,4})\s+(.*)/);
  if (h) return <p className="pt-1 font-semibold">{inline(h[2])}</p>;
  return (
    <p>
      {lines.map((l, i) => (
        <span key={i}>
          {inline(l)}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </p>
  );
}

/** Small marker next to a field label showing where its value came from. */
export function SourceTag({ kind }: { kind: "fsd" | "ai" }) {
  return (
    <span
      className={`rounded-sm px-1.5 font-mono text-[10px] leading-[18px] font-semibold tracking-[0.06em] uppercase ${kind === "fsd" ? "bg-spruce-soft text-spruce" : "border border-dashed border-line-strong bg-sunken leading-4 text-muted"}`}
    >
      {kind === "fsd" ? "from FSD" : "AI draft"}
    </span>
  );
}

/** A numbered workspace step. `done` shows a check and a one-line summary of what was loaded. */
export function Step({
  n,
  title,
  done,
  summary,
  children,
}: {
  n: number;
  title: string;
  done?: boolean;
  summary?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 pt-2">
      <span
        className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-sm font-mono text-xs font-semibold ${done ? "border border-spruce bg-spruce-soft text-spruce" : "bg-spruce text-on-spruce"}`}
        aria-hidden="true"
      >
        {done ? "✓" : n}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[15px] font-semibold">
            {title}
            {done && <span className="sr-only"> (done)</span>}
          </h2>
          {children}
        </div>
        {summary && (
          <p className="truncate text-xs text-muted" title={summary}>
            {summary}
          </p>
        )}
      </div>
    </div>
  );
}

/** Read-only ABAP with line numbers; lines carrying "<changeId>+ / "<changeId>- are tinted. */
export function CodeBlock({
  code,
  changeId,
}: {
  code?: string;
  changeId?: string;
}) {
  const lines = (code ?? "").replace(/\r\n/g, "\n").split("\n");
  const kind = (line: string) => {
    if (changeId && line.includes(`"${changeId}+`)) return "add";
    if (changeId && line.includes(`"${changeId}-`)) return "remove";
    // Without a known change ID, still mark the common trailing tag style ("C075+ / "C075-).
    if (!changeId && /"\s*C\d{2,4}\+/.test(line)) return "add";
    if (!changeId && /"\s*C\d{2,4}-/.test(line)) return "remove";
    const t = line.trimStart();
    return t.startsWith("*") || t.startsWith('"') ? "comment" : "";
  };
  return (
    <pre className="overflow-x-auto rounded-md bg-code py-2 font-mono text-xs leading-[21px]">
      {lines.map((line, i) => {
        const k = kind(line);
        return (
          <span
            key={i}
            className={`block pr-4 whitespace-pre ${
              k === "add"
                ? "bg-code-added/10 text-code-added shadow-[inset_3px_0_0_var(--code-added)]"
                : k === "remove"
                  ? "bg-code-removed/10 text-code-removed shadow-[inset_3px_0_0_var(--code-removed)]"
                  : k === "comment"
                    ? "text-code-comment"
                    : "text-code-ink"
            }`}
          >
            <span
              className="inline-block w-10 pr-3 text-right text-code-comment tabular-nums select-none"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            {line || " "}
          </span>
        );
      })}
    </pre>
  );
}
