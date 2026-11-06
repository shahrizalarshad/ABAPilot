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
        <div className="rounded-lg border border-line bg-surface p-6 shadow-sm">
          <h1 className="mb-1 font-display text-[26px] leading-tight font-bold">
            Sign in to ABAPilot
          </h1>
          <p className="mb-6 text-sm text-muted">
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
