import { Suspense } from "react";
import Link from "next/link";
import { Cpu, LogOut } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

const linkCls =
  "rounded-md px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800";

export function Nav() {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Cpu className="h-5 w-5 text-blue-600" />
          ABAPilot
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Suspense fallback={<span className="h-8 w-20" />}>
            <NavLinks />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}

async function NavLinks() {
  const user = await getCurrentUser();
  return (
    <>
      {user ? (
        <>
          <Link href="/app" className={linkCls}>
            Workspace
          </Link>
          <Link href="/history" className={linkCls}>
            History
          </Link>
          <Link href="/settings" className={linkCls}>
            Settings
          </Link>
          <span
            className="hidden max-w-48 truncate px-2 text-xs text-zinc-500 md:inline"
            title={user.email ?? ""}
          >
            {user.email}
          </span>
          <form action={signOut}>
            <button
              className={`${linkCls} inline-flex items-center`}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </>
      ) : (
        <Link
          href="/login"
          className="rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
        >
          Sign in
        </Link>
      )}
    </>
  );
}
