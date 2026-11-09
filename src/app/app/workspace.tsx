"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useObject } from "@ai-sdk/react";
import { AlertTriangle, Check, Loader2, Sparkles, Square } from "lucide-react";
import { Field, SourceTag, Step, inputCls } from "@/components/ui";
import { extractFsdMeta, type FsdMeta } from "@/lib/fsd-meta";
import { UploadField } from "@/components/upload-field";
import {
  CODE_ACCEPT,
  SPEC_ACCEPT,
  readCodeFiles,
  readSpecFile,
  encodeImages,
  MAX_IMAGES,
  type SpecImage,
} from "@/lib/file-import";
import type { EmbeddedObject } from "@/lib/docx-objects";
import { compactAbap, missingIncludes } from "@/lib/abap-compact";
import { AnalysisView } from "@/components/analysis-view";
import { MAX_CODE_CHARS, MAX_SPEC_CHARS, analysisSchema } from "@/lib/schema";
import { loadApiKey } from "@/lib/browser-storage";

/** The API returns JSON errors like {"error": "..."}; show just the message. */
function errorMessage(error: Error): string {
  try {
    const parsed = JSON.parse(error.message);
    if (typeof parsed?.error === "string") return parsed.error;
  } catch {}
  return error.message || "Something went wrong.";
}

const EXAMPLE = {
  ticketId: "INC-20431",
  title: "Sales order report shows wrong net value for orders with free goods",
  module: "SD",
  description:
    "Users report that custom report ZSD_ORDER_VALUE shows a higher net value than VA03 for sales orders that contain free-of-charge items (item category TANN). Finance uses this report for month-end accruals. Expected: free goods should be excluded or shown with 0 value. Happens since the last pricing change in March. Example order: 1000045821.",
  code: `SELECT vbeln posnr netwr waerk pstyv
  FROM vbap
  INTO TABLE lt_items
  WHERE vbeln IN s_vbeln.

LOOP AT lt_items INTO ls_item.
  SELECT SINGLE kunnr FROM vbak INTO lv_kunnr WHERE vbeln = ls_item-vbeln.
  lv_total = lv_total + ls_item-netwr.
ENDLOOP.`,
};

export function Workspace({
  systemRelease,
  authorId,
}: {
  systemRelease: string;
  authorId: string;
}) {
  const [ticketId, setTicketId] = useState("");
  const [title, setTitle] = useState("");
  const [module, setModule] = useState("");
  const [description, setDescription] = useState("");
  const [changeId, setChangeId] = useState("");
  const [fsdVersion, setFsdVersion] = useState("");
  const [country, setCountry] = useState("");
  const [meta, setMeta] = useState<FsdMeta | null>(null);
  /** Fields whose current value was filled automatically (removed when the user edits). */
  const [autoFilled, setAutoFilled] = useState<Record<string, "fsd" | "ai">>(
    {},
  );
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [code, setCode] = useState("");
  const [codeFiles, setCodeFiles] = useState<string[]>([]);
  /** Code before "Compact code", for Undo; null when not compacted. */
  const [codeBeforeCompact, setCodeBeforeCompact] = useState<string | null>(
    null,
  );
  const [spec, setSpec] = useState("");
  const [specFile, setSpecFile] = useState<string[]>([]);
  const [specImages, setSpecImages] = useState<SpecImage[]>([]);
  const [skippedImages, setSkippedImages] = useState<string[]>([]);
  const [objects, setObjects] = useState<EmbeddedObject[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preparing, setPreparing] = useState(false);
  const [prepError, setPrepError] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const pendingId = useRef<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const {
    object: a,
    submit,
    isLoading,
    error,
    stop,
  } = useObject({
    api: "/api/analyze",
    schema: analysisSchema,
    // Read the id the server will save this analysis under.
    fetch: async (input, init) => {
      const res = await fetch(input, init);
      pendingId.current = res.headers.get("x-analysis-id");
      return res;
    },
    onFinish: ({ object }) => {
      if (object) setSavedId(pendingId.current);
    },
  });

  const missing = missingIncludes(code, codeFiles);
  const loadExample = () => {
    setTicketId(EXAMPLE.ticketId);
    setTitle(EXAMPLE.title);
    setModule(EXAMPLE.module);
    setDescription(EXAMPLE.description);
    setCode(EXAMPLE.code);
  };
  const fsdSummary = specFile.length
    ? [
        specFile[0],
        meta?.version && `v${meta.version}`,
        selected.size > 0 &&
          `${selected.size} image${selected.size > 1 ? "s" : ""}`,
        objects.filter((o) => o.readable).length > 0 &&
          `${objects.filter((o) => o.readable).length} embedded sheet(s) read`,
      ]
        .filter(Boolean)
        .join(" · ")
    : spec.trim()
      ? `${spec.length.toLocaleString()} chars pasted`
      : "";
  const codeSummary = code.trim()
    ? `${codeFiles.length ? codeFiles.join(", ") : "Pasted"} · ${code.length.toLocaleString()} chars`
    : "";
  const detailsSummary =
    description.trim().length >= 10
      ? [ticketId, changeId, module].filter(Boolean).join(" · ") ||
        "Description added"
      : "";
  const tooLong = spec.length > MAX_SPEC_CHARS || code.length > MAX_CODE_CHARS;

  /** Wrap a setter so a manual edit removes the "from FSD"/"AI draft" tag. */
  const edit = (key: string, set: (v: string) => void) => (v: string) => {
    set(v);
    setAutoFilled((a) => {
      if (!(key in a)) return a;
      const next = { ...a };
      delete next[key];
      return next;
    });
  };
  const tag = (key: string) =>
    autoFilled[key] ? <SourceTag kind={autoFilled[key]} /> : null;

  /** Fill ticket details from the FSD; only touches fields that are empty or were auto-filled. */
  const applyFsd = async (text: string) => {
    const m = extractFsdMeta(text);
    setMeta(m);
    setDraftError("");
    if (!m) return;
    const current: Record<string, string> = {
      ticketId,
      changeId,
      module,
      fsdVersion,
      country,
      title,
      description,
    };
    const setters: Record<string, (v: string) => void> = {
      ticketId: setTicketId,
      changeId: setChangeId,
      module: setModule,
      fsdVersion: setFsdVersion,
      country: setCountry,
      title: setTitle,
      description: setDescription,
    };
    const canFill = (k: string) => !current[k].trim() || k in autoFilled;
    const filled: Record<string, "fsd" | "ai"> = {};
    const values: Record<string, string> = {
      ticketId: m.ticketId,
      changeId: m.changeId,
      module: m.module,
      fsdVersion: m.version,
      country: m.countryName || m.country,
    };
    for (const [k, v] of Object.entries(values))
      if (v && canFill(k)) {
        setters[k](v);
        filled[k] = "fsd";
      }
    setAutoFilled((a) => ({ ...a, ...filled }));

    if (
      m.latestVersionText.length < 20 ||
      !(canFill("title") || canFill("description"))
    )
      return;
    setDrafting(true);
    try {
      const res = await fetch("/api/prefill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...m, apiKey: loadApiKey() || undefined }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error ?? "Couldn't draft the description.");
      const ai: Record<string, "ai"> = {};
      if (canFill("title") && data.title) {
        setTitle(data.title);
        ai.title = "ai";
      }
      if (canFill("description") && data.description) {
        setDescription(data.description);
        ai.description = "ai";
      }
      setAutoFilled((a) => ({ ...a, ...ai }));
    } catch (e) {
      setDraftError(
        e instanceof Error ? e.message : "Couldn't draft the description.",
      );
    } finally {
      setDrafting(false);
    }
  };

  const run = async () => {
    setSavedId(null);
    setPrepError("");
    const chosen = specImages.filter((i) => selected.has(i.label));
    let images: Awaited<ReturnType<typeof encodeImages>> = [];
    if (chosen.length) {
      setPreparing(true);
      try {
        images = await encodeImages(chosen);
      } catch (e) {
        setPrepError(
          e instanceof Error ? e.message : "Couldn't prepare the images.",
        );
        return;
      } finally {
        setPreparing(false);
      }
    }
    // On phones the results sit below the form; bring them into view.
    requestAnimationFrame(() =>
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      }),
    );
    submit({
      ticketId,
      title,
      module,
      changeId,
      fsdVersion,
      country,
      description,
      code,
      spec,
      images,
      apiKey: loadApiKey() || undefined,
    });
  };

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      {/* ---------- Input ---------- */}
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <h1 className="font-display text-[26px] leading-tight font-bold">
          New ticket
        </h1>
        <Step
          n={1}
          title="Start with the FSD"
          done={!!fsdSummary}
          summary={fsdSummary || "Optional. Fills the ticket details for you."}
        />
        <UploadField
          label="Functional spec / FSD"
          hint="Upload the FSD as .docx (drag & drop works) or paste the relevant parts. Text is extracted in your browser."
          accept={SPEC_ACCEPT}
          files={specFile}
          onFiles={async ([f]) => {
            const result = await readSpecFile(f);
            setSpec(result.text);
            setSpecImages(result.images);
            setSelected(new Set(result.defaultSelection));
            setSkippedImages(result.skipped);
            setObjects(result.objects);
            setSpecFile([f.name]);
            void applyFsd(result.text);
          }}
          onClear={() => {
            setSpec("");
            setSpecFile([]);
            setSpecImages([]);
            setSkippedImages([]);
            setObjects([]);
            setSelected(new Set());
            setMeta(null);
          }}
        >
          {specFile.length ? (
            <details className="rounded-md border border-line bg-sunken">
              <summary className="cursor-pointer px-3 py-2 text-xs text-muted">
                View extracted text ({spec.length.toLocaleString()} chars)
              </summary>
              <textarea
                aria-label="Functional spec"
                className={`${inputCls} min-h-40 rounded-t-none border-x-0 border-b-0 text-xs`}
                value={spec}
                onChange={(e) => setSpec(e.target.value)}
              />
            </details>
          ) : (
            <textarea
              aria-label="Functional spec"
              className={`${inputCls} min-h-28 text-xs`}
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              placeholder="Drop a .docx here, or paste requirements…"
            />
          )}
        </UploadField>
        {objects.length > 0 && (
          <ul className="space-y-0.5 rounded-md border border-line bg-surface p-3 text-xs">
            <li className="mb-1 font-medium">Embedded in the FSD</li>
            {objects.map((o, i) => (
              <li key={i} className={o.readable ? "text-spruce" : "text-muted"}>
                {o.readable ? "✓ Read: " : "– Not readable: "}
                {o.summary}
              </li>
            ))}
          </ul>
        )}
        {(specImages.length > 0 || skippedImages.length > 0) && (
          <SpecImages
            images={specImages}
            skipped={skippedImages}
            selected={selected}
            onChange={setSelected}
          />
        )}
        <Step
          n={2}
          title="Add the ABAP code"
          done={!!codeSummary}
          summary={
            codeSummary || "The program and its includes, a short dump or logs."
          }
        />
        <UploadField
          label="ABAP code, short dump or logs (optional)"
          hint="Upload one or more program files (.abap, .txt from SE38/SE80) or paste. Remove client names and sensitive data."
          accept={CODE_ACCEPT}
          multiple
          files={codeFiles}
          onFiles={async (files) => {
            const text = await readCodeFiles(files);
            setCode((prev) =>
              prev.trim() ? `${prev.trimEnd()}\n\n${text}` : text,
            );
            setCodeFiles((prev) => [...prev, ...files.map((f) => f.name)]);
            setCodeBeforeCompact(null);
          }}
          onClear={() => {
            setCode("");
            setCodeFiles([]);
            setCodeBeforeCompact(null);
          }}
        >
          <textarea
            aria-label="ABAP code"
            className={`${inputCls} min-h-40 font-mono text-xs`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            placeholder="Drop .abap / .txt files here, or paste code…"
          />
        </UploadField>
        {missing.length > 0 && (
          <p className="-mt-2 text-xs text-amber">
            This code uses include{missing.length > 1 ? "s" : ""} that
            aren&apos;t uploaded:{" "}
            <span className="font-mono">{missing.join(", ")}</span>. Upload them
            too (SE38 → Utilities → More Utilities → Upload/Download) so the AI
            sees the full logic.
          </p>
        )}
        {code.length > 2000 && (
          <div className="-mt-2 flex flex-wrap items-center gap-2 text-xs">
            {codeBeforeCompact == null ? (
              <button
                type="button"
                onClick={() => {
                  const r = compactAbap(code);
                  setCodeBeforeCompact(code);
                  setCode(r.text);
                }}
                className={`rounded-md border px-2 py-1 ${code.length > MAX_CODE_CHARS ? "border-spruce bg-spruce text-on-spruce hover:bg-spruce-hover" : "border-line-strong hover:bg-sunken"}`}
                title="Removes comment lines, commented-out code and blank lines. Keeps code, trailing change tags and the latest change history."
              >
                Compact code
              </button>
            ) : (
              <>
                <span className="text-spruce">
                  Compacted {codeBeforeCompact.length.toLocaleString()} →{" "}
                  {code.length.toLocaleString()} chars (comment lines, old
                  commented-out code and blank lines removed)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCode(codeBeforeCompact);
                    setCodeBeforeCompact(null);
                  }}
                  className="text-muted underline hover:text-ink"
                >
                  Undo
                </button>
              </>
            )}
          </div>
        )}
        <Step
          n={3}
          title="Check the ticket details"
          done={!!detailsSummary}
          summary={detailsSummary || undefined}
        >
          {drafting && (
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Loader2 className="h-3 w-3 animate-spin" /> AI is drafting title
              &amp; description…
            </span>
          )}
        </Step>
        {meta && (
          <div className="rounded-md border border-spruce bg-spruce-soft p-3 text-xs text-spruce">
            <p className="font-medium">
              From the FSD: {meta.programId || "program"}
              {meta.programTitle && ` · ${meta.programTitle}`}
            </p>
            <p className="mt-0.5">
              {[
                meta.version && `Version ${meta.version}`,
                meta.changeId && `Change ${meta.changeId}`,
                meta.ticketId && `Ticket ${meta.ticketId}`,
                meta.status,
                meta.date,
                meta.functionalAuthor && `by ${meta.functionalAuthor}`,
              ]
                .filter(Boolean)
                .join(" · ") ||
                "No version table found — fill in the details below."}
            </p>
          </div>
        )}
        {draftError && <p className="text-xs text-amber">{draftError}</p>}
        <div className="grid grid-cols-2 gap-3">
          <Field label={<>Ticket ID {tag("ticketId")}</>}>
            <input
              className={inputCls}
              value={ticketId}
              onChange={(e) => edit("ticketId", setTicketId)(e.target.value)}
              placeholder="INC-12345"
            />
          </Field>
          <Field label={<>Change ID {tag("changeId")}</>}>
            <input
              className={inputCls}
              value={changeId}
              onChange={(e) => edit("changeId", setChangeId)(e.target.value)}
              placeholder="C075"
            />
          </Field>
          <Field label={<>Module {tag("module")}</>}>
            <input
              className={inputCls}
              value={module}
              onChange={(e) => edit("module", setModule)(e.target.value)}
              placeholder="SD"
            />
          </Field>
          <Field label={<>Country {tag("country")}</>}>
            <input
              className={inputCls}
              value={country}
              onChange={(e) => edit("country", setCountry)(e.target.value)}
              placeholder="Thailand"
            />
          </Field>
        </div>
        {fsdVersion && (
          <p className="-mt-1 text-xs text-muted">
            Implementing FSD version <strong>{fsdVersion}</strong>{" "}
            {tag("fsdVersion")}{" "}
            <button
              type="button"
              className="underline"
              onClick={() => edit("fsdVersion", setFsdVersion)("")}
            >
              clear
            </button>
          </p>
        )}
        <Field label={<>Title {tag("title")}</>}>
          <input
            className={inputCls}
            value={title}
            onChange={(e) => edit("title", setTitle)(e.target.value)}
            placeholder="Short summary"
          />
        </Field>
        <Field
          label={<>Description {tag("description")}</>}
          hint="What needs to change and why. Filled from the FSD's latest version if you upload one; review and edit."
        >
          <textarea
            className={`${inputCls} min-h-36`}
            value={description}
            onChange={(e) =>
              edit("description", setDescription)(e.target.value)
            }
            required
          />
        </Field>
        {/* Step 4 stays in reach: pinned to the bottom of the screen while the form scrolls. */}
        <div className="sticky bottom-0 z-10 -mx-4 space-y-2 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur">
          {(spec.length > 0 || code.length > 0) && (
            <p
              className={`text-xs ${tooLong ? "font-medium text-markup" : "text-muted"}`}
            >
              {tooLong && (
                <>
                  Too long to analyse (max {MAX_SPEC_CHARS.toLocaleString()} FSD
                  / {MAX_CODE_CHARS.toLocaleString()} code chars).{" "}
                  {code.length > MAX_CODE_CHARS && codeBeforeCompact == null
                    ? "Click Compact code to remove comments. "
                    : "Remove old version history or unrelated code. "}
                </>
              )}
              {spec.length > 0 && (
                <>
                  FSD: {spec.length.toLocaleString()} chars
                  {selected.size > 0 &&
                    ` + ${selected.size} image${selected.size > 1 ? "s" : ""}`}
                </>
              )}
              {spec.length > 0 && code.length > 0 && " · "}
              {code.length > 0 && (
                <>Code: {code.length.toLocaleString()} chars</>
              )}
            </p>
          )}
          <div className="flex items-center gap-2">
            {isLoading ? (
              <button
                type="button"
                onClick={stop}
                className="inline-flex items-center gap-2 rounded-md border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-sunken"
              >
                <Square className="h-4 w-4" /> Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={
                  description.trim().length < 10 ||
                  preparing ||
                  selected.size > MAX_IMAGES ||
                  tooLong
                }
                className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md bg-spruce px-4 py-2 text-sm font-semibold text-on-spruce hover:bg-spruce-hover disabled:opacity-50"
              >
                {preparing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {preparing ? "Preparing images…" : "Analyse ticket"}
              </button>
            )}
            <span className="text-xs text-muted">
              Conventions: {systemRelease || "default"} ·{" "}
              <Link href="/settings" className="text-spruce hover:underline">
                edit
              </Link>
            </span>
          </div>
        </div>
        {prepError && <p className="text-xs text-markup">{prepError}</p>}
      </form>

      {/* ---------- Output ---------- */}
      <div ref={resultsRef} className="scroll-mt-20 space-y-4">
        {error && (
          <div className="flex gap-2 rounded-md border border-markup bg-markup-soft p-3 text-sm text-markup">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMessage(error)}</span>
          </div>
        )}

        {!a && !isLoading && !error && (
          <div className="rounded-lg border border-dashed border-line-strong p-6 text-sm">
            <p className="font-medium text-ink">What you&apos;ll get</p>
            <ul className="mt-3 grid gap-2 text-muted sm:grid-cols-2">
              {[
                "Summary and technical analysis",
                "Ask before building: gaps in the FSD",
                "Affected objects",
                "Code wrapped in your change tags",
                "Unit test cases",
                "Change log and Word tech spec",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 rounded-sm bg-spruce"
                    aria-hidden="true"
                  />
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted">
              Every analysis is saved to your{" "}
              <Link href="/history" className="text-spruce hover:underline">
                history
              </Link>
              .{" "}
              <button
                type="button"
                onClick={loadExample}
                className="text-spruce hover:underline"
              >
                Load example ticket
              </button>{" "}
              to see it without your own files.
            </p>
          </div>
        )}

        {isLoading && !a && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Analysing ticket…
          </div>
        )}

        {a && (
          <AnalysisView
            a={a}
            ticketId={ticketId}
            title={title}
            isLoading={isLoading}
            sourceCode={codeBeforeCompact ?? code}
            exportMeta={{
              module,
              changeId,
              fsdVersion,
              country,
              programId: meta?.programId,
              technicalAuthor: authorId,
            }}
            actions={
              !isLoading && !error && savedId ? (
                <Link
                  href={`/history/${savedId}`}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-spruce hover:underline"
                >
                  <Check className="h-3.5 w-3.5" /> Saved to history
                </Link>
              ) : null
            }
          />
        )}
      </div>
    </main>
  );
}

function SpecImages({
  images,
  skipped,
  selected,
  onChange,
}: {
  images: SpecImage[];
  skipped: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  // Group by FSD version (newest first); images without a version go by heading, last.
  const groups: { key: string; version: number | null; items: SpecImage[] }[] =
    [];
  for (const img of images) {
    const key =
      img.version != null
        ? `Version ${img.version}`
        : img.section || "Other images";
    const g = groups.find((x) => x.key === key);
    if (g) g.items.push(img);
    else groups.push({ key, version: img.version, items: [img] });
  }
  groups.sort((a, b) => (b.version ?? -1) - (a.version ?? -1));
  const toggle = (labels: string[], on: boolean) => {
    const next = new Set(selected);
    labels.forEach((l) => (on ? next.add(l) : next.delete(l)));
    onChange(next);
  };
  const over = selected.size > MAX_IMAGES;

  return (
    <div className="space-y-3 rounded-md border border-line bg-surface p-3">
      {images.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className={over ? "font-medium text-markup" : "text-muted"}>
            {selected.size} of {images.length} images selected (max {MAX_IMAGES}
            ). Pick the screenshots for the change you&apos;re working on.
          </span>
          {selected.size > 0 && (
            <button
              type="button"
              onClick={() => onChange(new Set())}
              className="text-muted hover:underline"
            >
              Clear selection
            </button>
          )}
        </div>
      )}
      <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
        {groups.map((g) => {
          const labels = g.items.map((i) => i.label);
          const all = labels.every((l) => selected.has(l));
          return (
            <section key={g.key}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <h4 className="truncate text-xs font-semibold" title={g.key}>
                  {g.key}{" "}
                  <span className="font-normal text-muted">
                    ({g.items.length})
                  </span>
                </h4>
                <button
                  type="button"
                  onClick={() => toggle(labels, !all)}
                  className="shrink-0 text-[11px] text-spruce hover:underline"
                >
                  {all ? "Deselect" : "Select"} all
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {g.items.map((img) => {
                  const on = selected.has(img.label);
                  return (
                    <button
                      key={img.label}
                      type="button"
                      onClick={() => toggle([img.label], !on)}
                      aria-pressed={on}
                      aria-label={`${on ? "Deselect" : "Select"} ${img.label}`}
                      className={`relative overflow-hidden rounded border text-left ${on ? "border-spruce ring-2 ring-spruce/30" : "border-line opacity-60 hover:opacity-100"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
                      <img
                        src={img.thumb}
                        alt={img.label}
                        className="h-20 w-full bg-paper object-contain"
                      />
                      <span className="block truncate px-1 py-0.5 text-[10px] text-muted">
                        {img.label}
                      </span>
                      {on && (
                        <span className="absolute top-1 right-1 rounded-full bg-spruce p-0.5 text-on-spruce">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      {skipped.length > 0 && (
        <p className="text-xs text-amber">
          Can&apos;t read {skipped.length} image{skipped.length > 1 ? "s" : ""}:{" "}
          {skipped.join(", ")}. If one matters, paste it into the FSD as a
          PNG/JPG screenshot.
        </p>
      )}
    </div>
  );
}
