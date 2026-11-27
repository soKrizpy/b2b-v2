// src/lib/supabase/server.ts
// Request-scoped Supabase SSR client for Server Components, Server Actions and Route Handlers.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';
import {
  isMockModeEnabled,
  isSupabaseConfigured,
  getSupabaseUrl,
  getSupabasePublishableKey,
  markSupabaseKeyInvalid,
  createMockSupabaseClient,
} from './mock';

const MOCK_COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax' as const,
  secure: false,
  httpOnly: false,
};

export async function createSupabaseServerClient(
  _options?: { forceRealIfConfigured?: boolean }
) {
  const cookieStore = await cookies();

  // Mock data is an opt-in local-development feature only. It is disabled in
  // production, even if NEXT_PUBLIC_USE_MOCK is accidentally configured.
  if (isMockModeEnabled()) {
    return createMockSupabaseClient({
      getCookie: (name) => cookieStore.get(name)?.value,
      setCookie: (name, value) => {
        try {
          cookieStore.set(name, value, MOCK_COOKIE_OPTIONS);
        } catch {
          // Server Components expose a read-only cookie store.
        }
      },
      deleteCookie: (name) => {
        try {
          cookieStore.delete({ name, ...MOCK_COOKIE_OPTIONS });
        } catch {
          // Server Components expose a read-only cookie store.
        }
      },
    }) as unknown as ReturnType<typeof createServerClient<Database>>;
  }

  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    );
  }

  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, _cacheHeaders) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              httpOnly: false,
            });
          });
        } catch {
          // Server Components cannot write cookies. The middleware refreshes
          // sessions and applies @supabase/ssr cache headers to the response.
        }
      },
    },
    global: {
      fetch: async (fetchUrl, fetchOptions) => {
        const response = await fetch(fetchUrl, {
          ...fetchOptions,
          cache: 'no-store',
        });
        if (response.status === 401 || response.status === 403) {
          try {
            const body = await response.clone().text();
            if (body.toLowerCase().includes('invalid api key')) {
              markSupabaseKeyInvalid(publishableKey);
            }
          } catch {
            // Ignore diagnostic body read errors.
          }
        }
        return response;
      },
    },
  });
}
