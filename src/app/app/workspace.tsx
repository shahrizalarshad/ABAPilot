"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useObject } from "@ai-sdk/react";
import { AlertTriangle, Check, Loader2, Sparkles, Square } from "lucide-react";
import { Field, inputCls } from "@/components/ui";
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

export function Workspace({ systemRelease }: { systemRelease: string }) {
  const [ticketId, setTicketId] = useState("");
  const [title, setTitle] = useState("");
  const [module, setModule] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [codeFiles, setCodeFiles] = useState<string[]>([]);
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

  const tooLong = spec.length > MAX_SPEC_CHARS || code.length > MAX_CODE_CHARS;

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
    submit({
      ticketId,
      title,
      module,
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
        className="space-y-4 lg:sticky lg:top-20 lg:self-start"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">New ticket</h1>
          <button
            type="button"
            className="text-xs text-blue-600 hover:underline"
            onClick={() => {
              setTicketId(EXAMPLE.ticketId);
              setTitle(EXAMPLE.title);
              setModule(EXAMPLE.module);
              setDescription(EXAMPLE.description);
              setCode(EXAMPLE.code);
            }}
          >
            Load example
          </button>
        </div>
        <div className="grid grid-cols-[1fr_90px] gap-3">
          <Field label="Ticket ID">
            <input
              className={inputCls}
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              placeholder="INC-12345"
            />
          </Field>
          <Field label="Module">
            <input
              className={inputCls}
              value={module}
              onChange={(e) => setModule(e.target.value)}
              placeholder="SD"
            />
          </Field>
        </div>
        <Field label="Title">
          <input
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short summary"
          />
        </Field>
        <Field
          label="Description"
          hint="Paste the ticket text, user emails, expected vs actual behaviour."
        >
          <textarea
            className={`${inputCls} min-h-36`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </Field>
        <UploadField
          label="Functional spec / FSD (optional)"
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
          }}
          onClear={() => {
            setSpec("");
            setSpecFile([]);
            setSpecImages([]);
            setSkippedImages([]);
            setObjects([]);
            setSelected(new Set());
          }}
        >
          <textarea
            aria-label="Functional spec"
            className={`${inputCls} min-h-28 text-xs`}
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            placeholder="Drop a .docx here, or paste requirements…"
          />
        </UploadField>
        {objects.length > 0 && (
          <ul className="space-y-0.5 rounded-md border border-zinc-200 bg-white p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900">
            <li className="mb-1 font-medium">Embedded in the FSD</li>
            {objects.map((o, i) => (
              <li
                key={i}
                className={
                  o.readable
                    ? "text-green-700 dark:text-green-400"
                    : "text-zinc-500"
                }
              >
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
          }}
          onClear={() => {
            setCode("");
            setCodeFiles([]);
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
        {(spec.length > 0 || code.length > 0) && (
          <p
            className={`text-xs ${tooLong ? "font-medium text-red-600" : "text-zinc-500"}`}
          >
            {tooLong && (
              <>
                Too long to analyse (max {MAX_SPEC_CHARS.toLocaleString()} FSD /{" "}
                {MAX_CODE_CHARS.toLocaleString()} code chars). Remove old
                version history or unrelated code.{" "}
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
            {code.length > 0 && <>Code: {code.length.toLocaleString()} chars</>}
          </p>
        )}
        <div className="flex items-center gap-2">
          {isLoading ? (
            <button
              type="button"
              onClick={stop}
              className="inline-flex items-center gap-2 rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white"
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
              className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {preparing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {preparing ? "Preparing images…" : "Analyse ticket"}
            </button>
          )}
          <span className="text-xs text-zinc-500">
            Conventions: {systemRelease || "default"} ·{" "}
            <Link href="/settings" className="text-blue-600 hover:underline">
              edit
            </Link>
          </span>
        </div>
        {prepError && <p className="text-xs text-red-600">{prepError}</p>}
      </form>

      {/* ---------- Output ---------- */}
      <div className="space-y-4">
        {error && (
          <div className="flex gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMessage(error)}</span>
          </div>
        )}

        {!a && !isLoading && !error && (
          <div className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Paste a ticket and click <strong>Analyse ticket</strong>.
            You&apos;ll get the analysis, affected objects, ABAP code with your
            change tags, test cases and a change log you can paste straight into
            the ticket. Every analysis is saved to your{" "}
            <Link href="/history" className="text-blue-600 hover:underline">
              history
            </Link>
            .
          </div>
        )}

        {isLoading && !a && (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Analysing ticket…
          </div>
        )}

        {a && (
          <AnalysisView
            a={a}
            ticketId={ticketId}
            title={title}
            isLoading={isLoading}
            actions={
              !isLoading && !error && savedId ? (
                <Link
                  href={`/history/${savedId}`}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-green-700 hover:underline dark:text-green-400"
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
    <div className="space-y-3 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      {images.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span
            className={
              over
                ? "font-medium text-red-600"
                : "text-zinc-600 dark:text-zinc-400"
            }
          >
            {selected.size} of {images.length} images selected (max {MAX_IMAGES}
            ). Pick the screenshots for the change you&apos;re working on.
          </span>
          {selected.size > 0 && (
            <button
              type="button"
              onClick={() => onChange(new Set())}
              className="text-zinc-500 hover:underline"
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
                  <span className="font-normal text-zinc-500">
                    ({g.items.length})
                  </span>
                </h4>
                <button
                  type="button"
                  onClick={() => toggle(labels, !all)}
                  className="shrink-0 text-[11px] text-blue-600 hover:underline"
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
                      className={`relative overflow-hidden rounded border text-left ${on ? "border-blue-600 ring-2 ring-blue-600/30" : "border-zinc-200 opacity-60 hover:opacity-100 dark:border-zinc-700"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
                      <img
                        src={img.thumb}
                        alt={img.label}
                        className="h-20 w-full bg-zinc-50 object-contain"
                      />
                      <span className="block truncate px-1 py-0.5 text-[10px] text-zinc-500">
                        {img.label}
                      </span>
                      {on && (
                        <span className="absolute top-1 right-1 rounded-full bg-blue-600 p-0.5 text-white">
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
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Can&apos;t read {skipped.length} image{skipped.length > 1 ? "s" : ""}:{" "}
          {skipped.join(", ")}. If one matters, paste it into the FSD as a
          PNG/JPG screenshot.
        </p>
      )}
    </div>
  );
}
