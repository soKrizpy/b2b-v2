// src/app/api/auth/signout/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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

  // Clear role cookie
  response.cookies.delete('b2b_role');

  return response;
}
