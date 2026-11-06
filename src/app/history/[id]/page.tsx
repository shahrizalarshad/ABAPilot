import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui";
import { AnalysisView } from "@/components/analysis-view";
import { getCurrentUser } from "@/lib/supabase/server";
import { getAnalysis } from "@/lib/data";
import { DeleteButton } from "./delete-button";

async function AnalysisDetail(props: PageProps<"/history/[id]">) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/history/${id}`);
  const row = await getAnalysis(user.id, id);
  if (!row) notFound();

  return (
    <>
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        <Link
          href="/history"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> History
        </Link>
        <h1 className="text-xl font-semibold">
          {[row.ticketId, row.title].filter(Boolean).join(" — ") ||
            "Ticket analysis"}
        </h1>

        <details className="rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <summary className="cursor-pointer px-4 py-2.5 font-semibold">
            Original ticket
          </summary>
          <div className="space-y-3 border-t border-zinc-200 p-4 dark:border-zinc-800">
            <p className="whitespace-pre-wrap">{row.description}</p>
            {row.spec && (
              <details className="rounded-md border border-zinc-200 dark:border-zinc-800">
                <summary className="cursor-pointer px-3 py-2 text-xs font-semibold">
                  Functional spec (FSD) · {row.spec.length.toLocaleString()}{" "}
                  chars
                </summary>
                <p className="max-h-96 overflow-y-auto whitespace-pre-wrap border-t border-zinc-200 p-3 text-xs dark:border-zinc-800">
                  {row.spec}
                </p>
              </details>
            )}
            {row.code && (
              <pre className="overflow-x-auto rounded-md bg-zinc-950 p-3 font-mono text-xs text-zinc-100">
                {row.code}
              </pre>
            )}
          </div>
        </details>

        <AnalysisView
          a={row.result}
          ticketId={row.ticketId}
          title={row.title}
          actions={<DeleteButton id={row.id} />}
        />
        <Card title="Details">
          <p className="text-xs text-zinc-500">
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
