import { Suspense, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Nav } from "@/components/nav";

/**
 * Static page frame (prerendered) with the user-specific content streamed in.
 * With Cache Components, anything that reads cookies must sit inside <Suspense>.
 */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Nav />
      <Suspense
        fallback={
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        }
      >
        {children}
      </Suspense>
    </div>
  );
}
