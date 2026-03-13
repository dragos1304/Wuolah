import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/register");
  const isBackpackRoute = path.startsWith("/backpack");
  const isApiRoute = path.startsWith("/api/");

  // Always allow API routes and the landing page through
  if (isApiRoute || path === "/") {
    return supabaseResponse;
  }

  // Unauthenticated users: only allow auth routes
  if (!user) {
    if (isAuthRoute || isBackpackRoute) return supabaseResponse;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated: check onboarding status
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("onboarding_complete")
    .eq("id", user.id)
    .single();

  const onboardingComplete = profile?.onboarding_complete ?? false;

  // Redirect authenticated users away from auth routes
  if (isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = onboardingComplete ? "/dashboard" : "/backpack";
    return NextResponse.redirect(url);
  }

  // Force incomplete-onboarding users to /backpack
  if (!onboardingComplete && !isBackpackRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/backpack";
    return NextResponse.redirect(url);
  }

  // Don't let fully-onboarded users revisit /backpack (they can edit from Settings)
  if (onboardingComplete && isBackpackRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
