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
} from "@/lib/file-import";
import { AnalysisView } from "@/components/analysis-view";
import { analysisSchema } from "@/lib/schema";
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

  const run = () => {
    setSavedId(null);
    submit({
      ticketId,
      title,
      module,
      description,
      code,
      spec,
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
            setSpec(await readSpecFile(f));
            setSpecFile([f.name]);
          }}
          onClear={() => {
            setSpec("");
            setSpecFile([]);
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
          <p className="text-xs text-zinc-500">
            {spec.length > 0 && <>FSD: {spec.length.toLocaleString()} chars</>}
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
              disabled={description.trim().length < 10}
              className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" /> Analyse ticket
            </button>
          )}
          <span className="text-xs text-zinc-500">
            Conventions: {systemRelease || "default"} ·{" "}
            <Link href="/settings" className="text-blue-600 hover:underline">
              edit
            </Link>
          </span>
        </div>
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
