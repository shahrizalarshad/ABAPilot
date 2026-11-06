import Link from "next/link";
import { Cpu } from "lucide-react";

export function Nav() {
  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80 sticky top-0 z-20">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Cpu className="h-5 w-5 text-blue-600" />
          ABAPilot
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/app"
            className="rounded-md px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Workspace
          </Link>
          <Link
            href="/settings"
            className="rounded-md px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Settings
          </Link>
        </nav>
      </div>
    </header>
  );
}
