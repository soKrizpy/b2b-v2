// src/middleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_PATHS } from '@/lib/constants';
import {
  isMockModeEnabled,
  isSupabaseConfigured,
  getSupabaseUrl,
  getSupabasePublishableKey,
  getSupabaseCookieOptions,
  createMockSupabaseClient,
} from '@/lib/supabase/mock';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Server Actions must perform their own authorization checks.
  if (request.headers.has('next-action')) {
    return NextResponse.next();
  }

  const isPublicPath = PUBLIC_PATHS.some((path) =>
    path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`)
  );
  if (isPublicPath) return NextResponse.next();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const mockMode = isMockModeEnabled();
  if (!mockMode && !isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase belum dikonfigurasi. Akses data dinonaktifkan.' },
      { status: 503 }
    );
  }

  if (mockMode) {
    const mockCookieOptions =
      process.env.NODE_ENV === 'production'
        ? { path: '/', sameSite: 'none' as const, secure: true, partitioned: true }
        : { path: '/', sameSite: 'lax' as const, secure: false };

    const mockSupabase = createMockSupabaseClient({
      getCookie: (name) => request.cookies.get(name)?.value,
      setCookie: (name, value) =>
        response.cookies.set(name, value, { ...mockCookieOptions, httpOnly: false }),
      deleteCookie: (name) => response.cookies.delete({ name, ...mockCookieOptions }),
    });

    try {
      await mockSupabase.auth.getUser();
    } catch {
      // Protected layouts and every Server Action / Route Handler enforce auth.
    }

    return response;
  }

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookieOptions: getSupabaseCookieOptions(),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, cacheHeaders) {
          // Keep request cookies in sync with refreshed credentials for this request.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          response = NextResponse.next({ request: { headers: requestHeaders } });

          // Preserve Supabase's cookie attributes instead of overriding SameSite/Secure.
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );

          // @supabase/ssr supplies these headers to prevent shared/CDN caching of sessions.
          Object.entries(cacheHeaders).forEach(([key, value]) =>
            response.headers.set(key, value)
          );
        },
      },
    }
  );

  // Validate the JWT with Supabase Auth. Do not trust decoded cookie claims.
  try {
    await supabase.auth.getUser();
  } catch {
    // Protected layouts and every Server Action / Route Handler enforce auth.
  }

  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
};
