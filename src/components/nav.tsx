import { Suspense } from "react";
import Link from "next/link";
import { LogOut, Menu } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { Logo } from "@/components/logo";

const linkCls = "rounded-md px-3 py-1.5 text-ink hover:bg-sunken";

export function Nav() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4">
        <Link href="/" aria-label="ABAPilot home">
          <Logo />
        </Link>
        <nav className="flex items-center text-sm">
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
  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-md bg-spruce px-3 py-1.5 font-medium text-on-spruce hover:bg-spruce-hover"
      >
        Sign in
      </Link>
    );
  }

  const links = (
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
    </>
  );

  return (
    <>
      {/* Desktop and tablet: everything inline. */}
      <div className="hidden items-center gap-1 md:flex">
        {links}
        <span
          className="max-w-48 truncate px-2 text-xs text-muted"
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
      </div>

      {/* Phones: one menu button, so nothing is pushed off-screen. */}
      <details className="relative md:hidden">
        <summary
          className="flex cursor-pointer list-none items-center gap-1 rounded-md border border-line-strong px-2.5 py-1.5 text-ink [&::-webkit-details-marker]:hidden"
          aria-label="Menu"
        >
          <Menu className="h-4 w-4" /> Menu
        </summary>
        <div className="absolute right-0 mt-2 grid w-56 gap-1 rounded-lg border border-line bg-surface p-2 shadow-lg">
          {links}
          <p className="truncate border-t border-line px-3 pt-2 text-xs text-muted">
            {user.email}
          </p>
          <form action={signOut}>
            <button
              className={`${linkCls} flex w-full items-center gap-2 text-left`}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </form>
        </div>
      </details>
    </>
  );
}
