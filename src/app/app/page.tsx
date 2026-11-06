"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useObject } from "@ai-sdk/react";
import {
  AlertTriangle,
  FileDown,
  Loader2,
  Sparkles,
  Square,
} from "lucide-react";
import { Nav } from "@/components/nav";
import {
  Badge,
  Card,
  CopyButton,
  Field,
  Prose,
  inputCls,
} from "@/components/ui";
import { analysisSchema } from "@/lib/schema";
import { analysisToMarkdown } from "@/lib/markdown";
import {
  DEFAULT_CONVENTIONS,
  loadApiKey,
  loadConventions,
  useHydrated,
} from "@/lib/conventions";

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

export default function Workspace() {
  const [ticketId, setTicketId] = useState("");
  const [title, setTitle] = useState("");
  const [module, setModule] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  // Read saved settings from the browser; fall back to defaults during server render.
  const hydrated = useHydrated();
  const conventions = useMemo(
    () => (hydrated ? loadConventions() : DEFAULT_CONVENTIONS),
    [hydrated],
  );

  const {
    object: a,
    submit,
    isLoading,
    error,
    stop,
  } = useObject({
    api: "/api/analyze",
    schema: analysisSchema,
  });

  const run = () =>
    submit({
      ticketId,
      title,
      module,
      description,
      code,
      conventions,
      apiKey: loadApiKey() || undefined,
    });

  const md = a ? analysisToMarkdown(a, ticketId, title) : "";

  const download = () => {
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${ticketId || "ticket"}-analysis.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Nav />
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
          <Field
            label="ABAP code, short dump or logs (optional)"
            hint="Remove client names and sensitive data before pasting."
          >
            <textarea
              className={`${inputCls} min-h-40 font-mono text-xs`}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
            />
          </Field>
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
              Conventions: {conventions.systemRelease || "default"} ·{" "}
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
              <span>{error.message || "Something went wrong."}</span>
            </div>
          )}

          {!a && !isLoading && !error && (
            <div className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
              Paste a ticket and click <strong>Analyse ticket</strong>.
              You&apos;ll get the analysis, affected objects, ABAP code with
              your change tags, test cases and a change log you can paste
              straight into the ticket.
            </div>
          )}

          {isLoading && !a && (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Analysing ticket…
            </div>
          )}

          {a && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {a.ticketType && (
                  <Badge tone="blue">{a.ticketType.replace("_", " ")}</Badge>
                )}
                {a.sapModule && <Badge>{a.sapModule}</Badge>}
                {a.complexity && (
                  <Badge
                    tone={
                      a.complexity === "high"
                        ? "red"
                        : a.complexity === "medium"
                          ? "amber"
                          : "green"
                    }
                  >
                    {a.complexity} complexity
                  </Badge>
                )}
                {a.estimatedHours != null && (
                  <Badge>~{a.estimatedHours} h</Badge>
                )}
                {isLoading && (
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                )}
                <div className="ml-auto flex gap-2">
                  <CopyButton text={md} label="Copy all (Markdown)" />
                  <button
                    onClick={download}
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    <FileDown className="h-3.5 w-3.5" /> .md
                  </button>
                </div>
              </div>

              {a.summary && (
                <Card title="Summary">
                  <Prose text={a.summary} />
                </Card>
              )}

              {a.clarifyingQuestions && a.clarifyingQuestions.length > 0 && (
                <Card
                  title="Ask before building"
                  actions={
                    <CopyButton
                      text={a.clarifyingQuestions
                        .map((q) => `- ${q}`)
                        .join("\n")}
                    />
                  }
                >
                  <ul className="list-disc space-y-1 pl-5">
                    {a.clarifyingQuestions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </Card>
              )}

              {a.analysis && (
                <Card title="Technical analysis">
                  <Prose text={a.analysis} />
                </Card>
              )}

              {a.affectedObjects && a.affectedObjects.length > 0 && (
                <Card title="Affected objects">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs text-zinc-500">
                        <tr>
                          <th className="pb-2 pr-3">Object</th>
                          <th className="pb-2 pr-3">Type</th>
                          <th className="pb-2 pr-3">Action</th>
                          <th className="pb-2">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {a.affectedObjects.map((o, i) => (
                          <tr
                            key={i}
                            className="border-t border-zinc-100 align-top dark:border-zinc-800"
                          >
                            <td className="py-2 pr-3 font-mono text-xs">
                              {o?.name}
                            </td>
                            <td className="py-2 pr-3">{o?.objectType}</td>
                            <td className="py-2 pr-3">{o?.action}</td>
                            <td className="py-2">{o?.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {a.solution && (
                <Card title="Proposed solution">
                  <Prose text={a.solution} />
                </Card>
              )}

              {a.codeChanges?.map((c, i) => (
                <Card
                  key={i}
                  title={`Code · ${c?.objectName ?? ""}`}
                  actions={
                    <CopyButton text={c?.abapCode ?? ""} label="Copy ABAP" />
                  }
                >
                  {c?.description && (
                    <p className="mb-3 text-zinc-600 dark:text-zinc-400">
                      {c.description}
                    </p>
                  )}
                  <pre className="overflow-x-auto rounded-md bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-100">
                    {c?.abapCode}
                  </pre>
                </Card>
              ))}

              {a.testCases && a.testCases.length > 0 && (
                <Card title="Test cases">
                  <div className="space-y-3">
                    {a.testCases.map((t, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold">
                            {t?.id}
                          </span>
                          {t?.type && (
                            <Badge
                              tone={
                                t.type === "negative"
                                  ? "amber"
                                  : t.type === "regression"
                                    ? "zinc"
                                    : "green"
                              }
                            >
                              {t.type}
                            </Badge>
                          )}
                          <span className="font-medium">{t?.scenario}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
                          {t?.steps}
                        </p>
                        {t?.expectedResult && (
                          <p className="mt-1">
                            <span className="font-medium">Expected:</span>{" "}
                            {t.expectedResult}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {a.risks && a.risks.length > 0 && (
                <Card title="Risks & side effects">
                  <ul className="list-disc space-y-1 pl-5">
                    {a.risks.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </Card>
              )}

              {a.changeLog && (
                <Card
                  title="Change log / documentation"
                  actions={<CopyButton text={a.changeLog} />}
                >
                  <Prose text={a.changeLog} />
                </Card>
              )}

              <p className="text-xs text-zinc-500">
                AI-generated. Review all code and test in a development system
                before transporting.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
