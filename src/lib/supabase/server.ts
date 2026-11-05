// src/lib/supabase/server.ts
// SSR Supabase client — reads/writes session cookies via next/headers.
// Use inside Server Components, Server Actions, and Route Handlers.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, { ...options, httpOnly: false });
            });
          } catch {
            // setAll called from a Server Component — cookies are read-only.
            // The session will be refreshed via middleware on the next request.
          }
        },
      },
    }
  );
}
