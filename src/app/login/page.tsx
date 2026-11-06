import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { getCurrentUser } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "./login-form";

async function LoginContent(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = safeNext(sp.next);
  if (await getCurrentUser()) redirect(next);

  return (
    <>
      <main className="mx-auto max-w-sm px-4 py-16">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="mb-1 text-xl font-semibold">Sign in to ABAPilot</h1>
          <p className="mb-6 text-sm text-zinc-500">
            Your analyses and team conventions are saved to your account.
          </p>
          <LoginForm
            next={next}
            error={typeof sp.error === "string" ? sp.error : undefined}
          />
        </div>
      </main>
    </>
  );
}

export default function Page(props: PageProps<"/login">) {
  return (
    <PageShell>
      <LoginContent {...props} />
    </PageShell>
  );
}
