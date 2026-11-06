import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { getCurrentUser } from "@/lib/supabase/server";
import { getConventions } from "@/lib/data";
import { SettingsForm } from "./settings-form";

async function SettingsLoader() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings");
  const conventions = await getConventions(user.id);

  return (
    <>
      <SettingsForm initial={conventions} />
    </>
  );
}

export default function Page() {
  return (
    <PageShell>
      <SettingsLoader />
    </PageShell>
  );
}
