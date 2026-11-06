"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/server";
import { saveConventions } from "@/lib/data";

const conventionsSchema = z.object({
  authorId: z.string().trim().max(50),
  changeTagFormat: z.string().max(500),
  systemRelease: z.string().trim().max(100),
  namingRules: z.string().max(4000),
  extraRules: z.string().max(8000),
  language: z.enum(["English", "Bahasa Melayu", "German", "Chinese"]),
});

export async function saveConventionsAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const parsed = conventionsSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Some fields are too long or invalid." };

  try {
    await saveConventions(user.id, parsed.data);
    revalidatePath("/app");
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    console.error("[settings] save failed:", err);
    return { ok: false, error: "Could not save. Please try again." };
  }
}
