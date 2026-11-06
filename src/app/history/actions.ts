"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/server";
import { deleteAnalysis } from "@/lib/data";

export async function deleteAnalysisAction(id: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/history");
  await deleteAnalysis(user.id, id);
  revalidatePath("/history");
  redirect("/history");
}
