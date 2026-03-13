import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Handles two Supabase flows:
 * 1. Email confirmation (user clicks the link in their inbox)
 * 2. OAuth social sign-in callbacks (Google, etc.)
 *
 * Supabase redirects here with a `code` query parameter.
 * We exchange it for a session, then forward the user into the app.
 * The middleware handles the final routing (backpack vs dashboard).
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      // Redirect to login with a readable error in the URL
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set(
        "error",
        "Linkul de confirmare a expirat sau este invalid. Te rugăm să te autentifici din nou."
      );
      return NextResponse.redirect(loginUrl);
    }
  }

  // The middleware will intercept this navigation and redirect to /backpack
  // if onboarding is incomplete, or allow /dashboard if the backpack is set.
  return NextResponse.redirect(new URL(next, request.url));
}
