// src/lib/supabase/browser.ts
// Browser-side Supabase client — used in Client Components ONLY.
// Uses the public anon key; all reads are still governed by RLS.

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import {
  isSupabaseConfigured,
  getSupabaseUrl,
  getSupabasePublishableKey,
  createMockSupabaseClient,
  isMockModeEnabled,
} from './mock';

export function createSupabaseBrowserClient() {
  if (isMockModeEnabled()) {
    return createMockSupabaseClient({
      getCookie: (name) => {
        if (typeof document === 'undefined') return undefined;
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : undefined;
      },
      setCookie: (name, value) => {
        if (typeof document === 'undefined') return;
        const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
        const sameSite = isHttps ? 'None; Secure' : 'Lax';
        document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=${sameSite}`;
      },
      deleteCookie: (name) => {
        if (typeof document === 'undefined') return;
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
      },
    }) as unknown as ReturnType<typeof createBrowserClient<Database>>;
  }

  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    );
  }

  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

  return createBrowserClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookieOptions: isHttps
        ? { path: '/', sameSite: 'none', secure: true }
        : { path: '/', sameSite: 'lax' },
    }
  );
}
