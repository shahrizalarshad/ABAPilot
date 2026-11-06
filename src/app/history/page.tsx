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
          <h1 className="font-display text-[26px] leading-tight font-bold">
            History
          </h1>
          <Link
            href="/app"
            className="inline-flex items-center gap-1 rounded-md bg-spruce px-3 py-1.5 text-sm font-medium text-on-spruce hover:bg-spruce-hover"
          >
            <Plus className="h-4 w-4" /> New ticket
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line-strong p-10 text-center text-sm text-muted">
            No analyses yet. Your analysed tickets will appear here.
          </div>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/history/${r.id}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-paper"
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
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
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                      {r.result.ticketType && (
                        <Badge tone="blue">
                          {sentence(r.result.ticketType.replace("_", " "))}
                        </Badge>
                      )}
                      {(r.module || r.result.sapModule) && (
                        <Badge>{r.module || r.result.sapModule}</Badge>
                      )}
                      {r.result.estimatedHours != null && (
                        <span className="tabular-nums">
                          ≈ {r.result.estimatedHours} h
                        </span>
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

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Page() {
  return (
    <PageShell>
      <HistoryList />
    </PageShell>
  );
}
