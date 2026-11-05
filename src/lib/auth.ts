// src/lib/auth.ts
// Reusable auth guard helpers for Server Actions, Route Handlers, Layouts, and Pages.
// Uses React.cache() so multiple calls within the same server render only execute
// a single Supabase auth.getUser() round-trip.

import { cache } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveUserRole } from '@/features/auth/lib/resolveRole';
import type { UserRole } from '@/types/roles';
import type { User } from '@supabase/supabase-js';

export type AuthResult =
  | { ok: true;  user: User; role: UserRole }
  | { ok: false; status: 401 | 403; message: string };

/**
 * Per-request memoized user fetch via the SSR server client.
 */
export const getSessionUser = cache(async (): Promise<User | null> => {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
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
