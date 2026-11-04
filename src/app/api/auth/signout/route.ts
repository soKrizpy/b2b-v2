// src/app/api/auth/signout/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { MOCK_SESSION_COOKIE, clearPreviewFallbackSession } from '@/lib/supabase/mock';

export async function POST() {
  clearPreviewFallbackSession();

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

  const isDevMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
  const deleteOpts = isDevMock
    ? { path: '/', sameSite: 'lax' as const, secure: false }
    : { path: '/', sameSite: 'none' as const, secure: true, partitioned: true };

  response.cookies.delete({ name: 'b2b_role', ...deleteOpts });
  response.cookies.delete({ name: MOCK_SESSION_COOKIE, ...deleteOpts });
  return response;
}
