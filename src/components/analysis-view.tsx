"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { DeepPartial } from "ai";
import { ChevronDown, FileDown, FileText, Loader2 } from "lucide-react";
import type { ExportMeta } from "@/lib/docx-export";
import { Badge, Card, CopyButton, Prose } from "@/components/ui";
import { CodeChange } from "@/components/code-change";
import { hasRealLineNumbers, indexSource } from "@/lib/code-diff";
import { analysisToMarkdown } from "@/lib/markdown";
import type { Analysis } from "@/lib/schema";

type Props = {
  a: DeepPartial<Analysis>;
  ticketId?: string;
  title?: string;
  isLoading?: boolean;
  /** Extra buttons shown next to Copy / .md (e.g. "Saved to history", Delete). */
  actions?: ReactNode;
  /** Ticket context for the Word export header. */
  exportMeta?: ExportMeta;
  /** The uploaded program, to check each change's original lines against. */
  sourceCode?: string;
};

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Renders a (possibly still streaming) analysis. Used by the workspace and the history page. */
export function AnalysisView({
  a,
  ticketId,
  title,
  isLoading,
  actions,
  exportMeta,
  sourceCode,
}: Props) {
  const source = useMemo(
    () => (sourceCode?.trim() ? indexSource(sourceCode) : null),
    [sourceCode],
  );
  const exactLines = !!sourceCode && hasRealLineNumbers(sourceCode);
  const md = analysisToMarkdown(a, ticketId, title, { source, exactLines });
  const [exporting, setExporting] = useState(false);

  const exportWord = async () => {
    setExporting(true);
    try {
      const { downloadTechSpec } = await import("@/lib/docx-export");
      await downloadTechSpec(
        a,
        { ticketId, title, ...exportMeta },
        { source, exactLines },
      );
    } finally {
      setExporting(false);
    }
  };

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {a.ticketType && (
          <Badge tone="blue">{sentence(a.ticketType.replace("_", " "))}</Badge>
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
            {sentence(a.complexity)} complexity
          </Badge>
        )}
        {a.estimatedHours != null && <Badge>≈ {a.estimatedHours} h</Badge>}
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {actions}
          <details className="relative">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md border border-line-strong px-2 py-1 text-xs hover:bg-sunken [&::-webkit-details-marker]:hidden">
              Export <ChevronDown className="h-3.5 w-3.5" />
            </summary>
            <div className="absolute right-0 z-10 mt-1 grid w-48 gap-1 rounded-md border border-line bg-surface p-1.5 shadow-lg">
              <CopyButton text={md} label="Copy all (Markdown)" />
              <button
                onClick={download}
                className="inline-flex items-center gap-1 rounded-md border border-line-strong px-2 py-1 text-xs hover:bg-sunken"
              >
                <FileDown className="h-3.5 w-3.5" /> Download .md
              </button>
            </div>
          </details>
          <button
            onClick={exportWord}
            disabled={isLoading || exporting}
            title="Technical specification in Word format"
            className="inline-flex items-center gap-1 rounded-md bg-spruce px-2.5 py-1 text-xs font-semibold text-on-spruce hover:bg-spruce-hover disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
            Word (.docx)
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
              text={a.clarifyingQuestions.map((q) => `- ${q}`).join("\n")}
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
              <thead className="text-xs text-muted">
                <tr>
                  <th className="pb-2 pr-3">Object</th>
                  <th className="pb-2 pr-3">Type</th>
                  <th className="pb-2 pr-3">Action</th>
                  <th className="pb-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {a.affectedObjects.map((o, i) => (
                  <tr key={i} className="border-t border-line align-top">
                    <td className="py-2 pr-3 font-mono text-xs">{o?.name}</td>
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
        <CodeChange
          key={i}
          c={c}
          source={source}
          exactLines={exactLines}
          changeId={exportMeta?.changeId}
          isLoading={isLoading}
        />
      ))}

      {a.testCases && a.testCases.length > 0 && (
        <Card title="Test cases">
          <div className="space-y-3">
            {a.testCases.map((t, i) => (
              <div key={i} className="rounded-md border border-line p-3">
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
                <p className="whitespace-pre-wrap text-muted">{t?.steps}</p>
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

      <p className="text-xs text-muted">
        AI-generated. Review all code and test in a development system before
        transporting.
      </p>
    </div>
  );
}
