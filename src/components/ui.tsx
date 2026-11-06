"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

export const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900";

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
      {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
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
    <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
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
      className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
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
    zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    red: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    green: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  };
  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
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
            className="overflow-x-auto rounded-md bg-zinc-950 p-3 font-mono text-xs text-zinc-100"
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
      <code
        key={i}
        className="rounded bg-zinc-100 px-1 font-mono text-[0.85em] dark:bg-zinc-800"
      >
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
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${kind === "fsd" ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" : "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300"}`}
    >
      {kind === "fsd" ? "from FSD" : "AI draft"}
    </span>
  );
}

export function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-semibold text-white">
        {n}
      </span>
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}
