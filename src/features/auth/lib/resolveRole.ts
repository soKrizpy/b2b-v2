// src/features/auth/lib/resolveRole.ts
// Resolves a user's role from the trusted profile row, with app_metadata as a
// trusted provisioning fallback. Never trust user_metadata, cookies, or email patterns for authorization.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types/roles';

interface AuthUserLike {
  id?: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

function isValidRole(val: unknown): val is UserRole {
  return val === 'admin' || val === 'teacher' || val === 'student';
}

export async function resolveUserRole(
  userId: string,
  user?: AuthUserLike | null
): Promise<UserRole | null> {
  if (!userId) return null;

  // 1. Try reading from public.profiles using admin client (service role)
  const adminDb = createSupabaseAdminClient();
  const { data: adminProfile, error: adminErr } = (await adminDb
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()) as unknown as {
    data: { role: string } | null;
    error: { message: string } | null;
  };

  if (!adminErr && isValidRole(adminProfile?.role)) {
    return adminProfile.role;
  }

  // 2. Fallback: read from public.profiles using the user's authenticated session
  //    (handles cases where SUPABASE_SERVICE_ROLE_KEY is not set and RLS checks auth.uid() = id)
  try {
    const serverDb = await createSupabaseServerClient();
    const { data: userProfile } = (await serverDb
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()) as unknown as {
      data: { role: string } | null;
      error: { message: string } | null;
    };

    if (isValidRole(userProfile?.role)) {
      return userProfile.role;
    }
  } catch {
    // ignore
  }

  // Only app_metadata is managed by trusted server/admin flows. user_metadata and
  // email naming conventions are user-controlled and must never grant a role.
  const appRole = user?.app_metadata?.role;
  const inferredRole: UserRole | null = isValidRole(appRole) ? appRole : null;

  // Provision only when a trusted app_metadata role is explicitly present.
  if (inferredRole) {
    const fullName =
      (typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
      (user?.email ? user.email.split('@')[0] : 'Pengguna');

    try {
      await (adminDb
        .from('profiles')
        .upsert({ id: userId, role: inferredRole, full_name: fullName } as never, { onConflict: 'id' }) as unknown as Promise<unknown>);
    } catch {
      // ignore if RLS blocks without service role key
    }
  }

  return inferredRole;
}
