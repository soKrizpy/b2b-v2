// src/features/auth/lib/resolveRole.ts
// The profiles row is the single source of truth for application authorization.
// Auth metadata, cookies, and email patterns must never grant or provision a role.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { UserRole } from '@/types/roles';

function isValidRole(value: unknown): value is UserRole {
  return value === 'admin' || value === 'teacher' || value === 'student';
}

/**
 * Resolve a role only from public.profiles.
 *
 * The lookup uses the server-side privileged client because the current
 * production profiles table has no SELECT policy. Any lookup/configuration
 * error fails closed; it must not fall back to user-controlled metadata.
 */
export async function resolveUserRole(userId: string): Promise<UserRole | null> {
  if (!userId) return null;

  try {
    const db = createSupabaseAdminClient();
    const { data, error } = (await db
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()) as unknown as {
      data: { role: unknown } | null;
      error: { message: string } | null;
    };

    if (error || !isValidRole(data?.role)) return null;
    return data.role;
  } catch {
    return null;
  }
}
