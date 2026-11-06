import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Card, CodeBlock } from "@/components/ui";
import { AnalysisView } from "@/components/analysis-view";
import { getCurrentUser } from "@/lib/supabase/server";
import { getAnalysis, getConventions } from "@/lib/data";
import { DeleteButton } from "./delete-button";

async function AnalysisDetail(props: PageProps<"/history/[id]">) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/history/${id}`);
  const [row, conventions] = await Promise.all([
    getAnalysis(user.id, id),
    getConventions(user.id),
  ]);
  if (!row) notFound();

  return (
    <>
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        <Link
          href="/history"
          className="inline-flex items-center gap-1 text-sm text-muted hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> History
        </Link>
        <h1 className="font-display text-[26px] leading-tight font-bold">
          {[row.ticketId, row.title].filter(Boolean).join(" — ") ||
            "Ticket analysis"}
        </h1>

        <details className="rounded-lg border border-line bg-surface text-sm">
          <summary className="cursor-pointer px-4 py-2.5 font-semibold">
            Original ticket
          </summary>
          <div className="space-y-3 border-t border-line p-4">
            <p className="whitespace-pre-wrap">{row.description}</p>
            {row.spec && (
              <details className="rounded-md border border-line">
                <summary className="cursor-pointer px-3 py-2 text-xs font-semibold">
                  Functional spec (FSD) · {row.spec.length.toLocaleString()}{" "}
                  chars
                </summary>
                <p className="max-h-96 overflow-y-auto whitespace-pre-wrap border-t border-line p-3 text-xs">
                  {row.spec}
                </p>
              </details>
            )}
            {row.code && (
              <CodeBlock code={row.code} changeId={row.changeId || undefined} />
            )}
          </div>
        </details>

        <AnalysisView
          a={row.result}
          ticketId={row.ticketId}
          title={row.title}
          actions={<DeleteButton id={row.id} />}
          exportMeta={{
            module: row.module,
            changeId: row.changeId,
            fsdVersion: row.fsdVersion,
            technicalAuthor: conventions.authorId,
          }}
        />
        <Card title="Details">
          <p className="text-xs text-muted">
            Model: {row.model}
            {row.inputTokens != null &&
              ` · ${row.inputTokens.toLocaleString()} input / ${(row.outputTokens ?? 0).toLocaleString()} output tokens`}
          </p>
        </Card>
      </main>
    </>
  );
}

export default function Page(props: PageProps<"/history/[id]">) {
  return (
    <PageShell>
      <AnalysisDetail {...props} />
    </PageShell>
  );
}
