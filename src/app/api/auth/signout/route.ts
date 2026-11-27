// src/app/api/auth/signout/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { MOCK_SESSION_COOKIE, getSupabaseCookieOptions } from '@/lib/supabase/mock';

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Ignore errors if session is already expired
  }

  const response = NextResponse.json({
    success: true,
    redirectTo: '/login',
  });

  const deleteOpts = getSupabaseCookieOptions();

  response.cookies.delete({ name: 'b2b_role', ...deleteOpts });
  response.cookies.delete({ name: MOCK_SESSION_COOKIE, ...deleteOpts });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
