// src/app/api/auth/callback/route.ts
// Handles the Supabase PKCE OAuth code exchange.
// After exchange, redirects to /login (the middleware handles role routing from there).

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code     = searchParams.get("code");
  const next     = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const redirectUrl = new URL(next, origin);
      const response = NextResponse.redirect(redirectUrl);
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    }
  }

  // Exchange failed — redirect back to login with error param
  return NextResponse.redirect(new URL("/login?error=auth", origin));
}
