import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Plus } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui";
import { getCurrentUser } from "@/lib/supabase/server";
import { listAnalyses } from "@/lib/data";

const dateFmt = new Intl.DateTimeFormat("en-MY", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kuala_Lumpur",
});

async function HistoryList() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/history");
  const rows = await listAnalyses(user.id);

  return (
    <>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold">History</h1>
          <Link
            href="/app"
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> New analysis
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No analyses yet. Your analysed tickets will appear here.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/history/${r.id}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {r.ticketId && (
                        <span className="font-mono text-xs font-semibold">
                          {r.ticketId}
                        </span>
                      )}
                      <span className="truncate font-medium">
                        {r.title ||
                          r.result.summary?.slice(0, 90) ||
                          "Untitled ticket"}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      {r.result.ticketType && (
                        <Badge tone="blue">
                          {r.result.ticketType.replace("_", " ")}
                        </Badge>
                      )}
                      {(r.module || r.result.sapModule) && (
                        <Badge>{r.module || r.result.sapModule}</Badge>
                      )}
                      {r.result.estimatedHours != null && (
                        <span>~{r.result.estimatedHours} h</span>
                      )}
                      <span>{dateFmt.format(r.createdAt)}</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

export default function Page() {
  return (
    <PageShell>
      <HistoryList />
    </PageShell>
  );
}
