// src/lib/auth.ts
// Reusable auth guard helpers for Server Actions, Route Handlers, Layouts, and Pages.
// Uses React.cache() so multiple calls within the same server render (e.g., Layout + Page)
// only execute a single Supabase auth.getUser() round-trip.
//
// Fallback: if the session cookie read fails (e.g., old partitioned cookies), we attempt
// to verify auth via the service_role admin client using the raw access token from cookies.

import { cache } from 'react';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { resolveUserRole } from '@/features/auth/lib/resolveRole';
import type { UserRole } from '@/types/roles';
import type { User } from '@supabase/supabase-js';

export type AuthResult =
  | { ok: true;  user: User; role: UserRole }
  | { ok: false; status: 401 | 403; message: string };

function isValidRole(val: unknown): val is UserRole {
  return val === 'admin' || val === 'teacher' || val === 'student';
}

/** Extract JWT from cookie store (handles chunked and base64url-encoded tokens). */
async function extractAccessTokenFromCookies(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    // Find base token or first chunk
    const base = allCookies.find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));
    let rawValue = base?.value ?? '';
    if (!rawValue) {
      const chunkPrefix = allCookies
        .find(c => c.name.startsWith('sb-') && c.name.includes('-auth-token.0'))
        ?.name.replace(/\.0$/, '');
      if (chunkPrefix) {
        const chunks: string[] = [];
        for (let i = 0; i < 10; i++) {
          const chunk = allCookies.find(c => c.name === `${chunkPrefix}.${i}`);
          if (!chunk) break;
          chunks.push(chunk.value);
        }
        rawValue = chunks.join('');
      }
    }
    if (!rawValue) return null;
    let jsonStr = rawValue;
    if (jsonStr.startsWith('base64-')) {
      const b64 = jsonStr.slice(7).replace(/-/g, '+').replace(/_/g, '/');
      jsonStr = Buffer.from(b64, 'base64').toString('utf8');
    } else if (jsonStr.startsWith('%')) {
      jsonStr = decodeURIComponent(jsonStr);
    }
    const parsed = JSON.parse(jsonStr) as { access_token?: string } | [string];
    if (Array.isArray(parsed) && typeof parsed[0] === 'string') return parsed[0];
    if (parsed && typeof (parsed as { access_token?: string }).access_token === 'string') {
      return (parsed as { access_token: string }).access_token;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Per-request memoized user fetch.
 * First tries the SSR server client (uses session cookie normally).
 * If that returns null, tries to verify the raw JWT via the admin client as a fallback
 * (handles cases where cookies have mismatched attributes from an old deployment).
 */
export const getSessionUser = cache(async (): Promise<User | null> => {
  // Primary: use @supabase/ssr server client
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) return user;
  } catch {
    // fall through
  }

  // Fallback: manually decode the access token from cookies and verify via admin client
  try {
    const accessToken = await extractAccessTokenFromCookies();
    if (!accessToken) return null;
    const adminClient = createSupabaseAdminClient();
    // Use the admin client to get the user from the JWT directly
    const { data: { user }, error } = await (adminClient as unknown as {
      auth: { getUser: (jwt: string) => Promise<{ data: { user: User | null }; error: unknown }> }
    }).auth.getUser(accessToken);
    if (!error && user) return user;
  } catch {
    // ignore
  }

  return null;
});

/**
 * Returns the authenticated user and their role (memoized per request).
 */
export const getAuthUser = cache(async (): Promise<AuthResult> => {
  const user = await getSessionUser();

  if (!user) {
    return { ok: false, status: 401, message: 'Sesi tidak ditemukan. Silakan login kembali.' };
  }

  // Authorization roles must come from the trusted profile row (or trusted
  // server-managed app_metadata fallback), never from user-editable metadata
  // or the client-controlled b2b_role cookie.
  const role: UserRole | undefined = (await resolveUserRole(user.id, user)) ?? undefined;

  if (!role) {
    return { ok: false, status: 403, message: 'Akun ini belum memiliki hak akses.' };
  }

  return { ok: true, user, role };
});

export async function requireRole(required: UserRole): Promise<AuthResult> {
  const result = await getAuthUser();
  if (!result.ok) return result;
  if (result.role !== required) {
    return { ok: false, status: 403, message: `Aksi ini memerlukan hak akses ${required}.` };
  }
  return result;
}

export async function requireAdmin(): Promise<AuthResult> {
  return requireRole('admin');
}

export async function requireAnyRole(allowed: UserRole[]): Promise<AuthResult> {
  const result = await getAuthUser();
  if (!result.ok) return result;
  if (!allowed.includes(result.role)) {
    return { ok: false, status: 403, message: `Aksi ini memerlukan hak akses ${allowed.join(' atau ')}.` };
  }
  return result;
}

export async function requireAdminOrTeacher(): Promise<AuthResult> {
  return requireAnyRole(['admin', 'teacher']);
}
