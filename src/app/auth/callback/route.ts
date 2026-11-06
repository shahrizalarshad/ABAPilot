import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

/** The magic link lands here with ?code=…; exchange it for a session cookie. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  const err =
    searchParams.get("error_description") ??
    "The login link is invalid or has expired.";
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(err)}`, origin),
  );
}
