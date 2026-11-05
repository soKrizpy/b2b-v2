// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_PATHS, PROTECTED_PREFIXES, ROLE_DASHBOARD_MAP } from '@/lib/constants';
import type { UserRole } from '@/types/roles';

function isValidRole(val: unknown): val is UserRole {
  return val === 'admin' || val === 'teacher' || val === 'student';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never redirect Server Action POST requests — they handle their own auth.
  if (request.headers.has('next-action')) {
    return NextResponse.next();
  }

  // 1. Public-path passthrough
  const isPublicPath = PUBLIC_PATHS.some((p) =>
    p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(`${p}/`)
  );
  if (isPublicPath) {
    return NextResponse.next();
  }

  // 2. Pass x-pathname header for layouts to read the current route
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  // 3. Refresh Supabase session cookie
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, { ...options, httpOnly: false })
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 4. No session — pass through and let the layout redirect to /login
  if (!user) {
    return response;
  }

  // 5. Resolve role from the trusted profiles table
  let userRole: UserRole | null = null;
  try {
    const { data: profile } = await (supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as unknown as Promise<{ data: { role?: string } | null; error: unknown }>);
    if (isValidRole(profile?.role)) userRole = profile.role;
  } catch {
    // Fail closed below
  }

  if (!userRole) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 6. RBAC enforcement
  const matchedEntry = Object.entries(PROTECTED_PREFIXES).find(([prefix]) =>
    pathname.startsWith(prefix)
  );

  if (matchedEntry) {
    const [, requiredRole] = matchedEntry;
    if (userRole !== requiredRole) {
      const ownDashboard = new URL(ROLE_DASHBOARD_MAP[userRole], request.url);
      return NextResponse.redirect(ownDashboard);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
};
