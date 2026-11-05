// src/lib/supabase/browser.ts
// Browser-side Supabase client — used in Client Components ONLY.
// Uses the public anon key; all reads are still governed by RLS.

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createSupabaseBrowserClient() {
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: isHttps
        ? { path: '/', sameSite: 'none', secure: true }
        : { path: '/', sameSite: 'lax' },
    }
  );
}
