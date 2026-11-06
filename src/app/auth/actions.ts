"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

export type LoginState = {
  status: "idle" | "sent" | "error";
  message?: string;
  email?: string;
};

export async function sendMagicLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim());
  if (!email.success)
    return { status: "error", message: "Please enter a valid email address." };

  const next = safeNext(formData.get("next"));
  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    h.get("origin") ??
    `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    const rateLimited = /rate limit|too many/i.test(error.message);
    return {
      status: "error",
      message: rateLimited
        ? "Too many emails sent. Please wait a few minutes and try again."
        : `Could not send the login link: ${error.message}`,
    };
  }
  return { status: "sent", email: email.data };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
