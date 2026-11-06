import { PageShell } from "@/components/page-shell";
import { getCurrentUser } from "@/lib/supabase/server";
import { getConventions } from "@/lib/data";
import { redirect } from "next/navigation";
import { Workspace } from "./workspace";

async function WorkspaceLoader() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/app");
  const conventions = await getConventions(user.id);

  return (
    <>
      <Workspace systemRelease={conventions.systemRelease} />
    </>
  );
}

export default function Page() {
  return (
    <PageShell>
      <WorkspaceLoader />
    </PageShell>
  );
}
