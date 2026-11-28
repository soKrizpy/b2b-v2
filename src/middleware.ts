// src/middleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_PATHS } from '@/lib/constants';
import {
  isSupabaseConfigured,
  getSupabaseUrl,
  getSupabaseAnonKey,
  createMockSupabaseClient,
  MOCK_SESSION_COOKIE,
  getMockStore,
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

  const isDevMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
  const cookieOptions = isDevMock
    ? { path: '/', sameSite: 'lax' as const, secure: false }
    : { path: '/', sameSite: 'none' as const, secure: true, partitioned: true };

  const mockUserId = request.cookies.get(MOCK_SESSION_COOKIE)?.value;
  const hasMockSession = Boolean(
    mockUserId && getMockStore().users.some((user) => user.id === mockUserId)
  );
  const useRealSupabase = isSupabaseConfigured() && !hasMockSession;

  const supabase = useRealSupabase
    ? createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet, cacheHeaders) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request: { headers: requestHeaders } });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, {
                ...options,
                ...cookieOptions,
                httpOnly: false,
              })
            );

            // @supabase/ssr >= 0.10 passes cache headers when auth cookies change.
            // Preserve them so a CDN cannot cache and replay a user's refreshed session.
            cacheHeaders?.forEach((value, key) => response.headers.set(key, value));
          },
        },
      })
    : createMockSupabaseClient({
        getCookie: (name) => request.cookies.get(name)?.value,
        setCookie: (name, value) => response.cookies.set(name, value, { ...cookieOptions, httpOnly: false }),
        deleteCookie: (name) => response.cookies.delete({ name, ...cookieOptions }),
      });

  // getClaims verifies the JWT signature and refreshes a near-expiry session.
  // For asymmetric signing keys this avoids the extra Auth network lookup of getUser.
  // Keep getUser for the in-memory mock client, which does not issue JWT claims.
  try {
    if (useRealSupabase) {
      const auth = supabase.auth as typeof supabase.auth & {
        getClaims?: () => Promise<unknown>;
      };
      if (auth.getClaims) {
        await auth.getClaims();
      } else {
        await auth.getUser();
      }
    } else {
      await supabase.auth.getUser();
    }
  } catch {
    // Protected layouts and every Server Action / Route Handler enforce auth.
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
};
