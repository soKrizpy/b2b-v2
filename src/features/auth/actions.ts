// src/features/auth/actions.ts
'use server';

import { cookies, headers } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isValidServiceRoleJwt, getSupabaseServiceRoleKey } from '@/lib/supabase/env';
import { resolveUserRole } from './lib/resolveRole';
import { ROLE_DASHBOARD_MAP, PROTECTED_PREFIXES } from '@/lib/constants';
import { signInSchema, isPhoneNumber, phoneToEmail } from './validation';
import type { SignInInput } from './validation';
import type { UserRole } from '@/types/roles';

export type SignInResult =
  | { success: true;  redirectTo: string }
  | { success: false; error: string; fields?: Partial<Record<keyof SignInInput, string>> };

function isSafeRedirect(path: string, role: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  const requiredRole = Object.entries(PROTECTED_PREFIXES).find(
    ([prefix]) => path.startsWith(prefix)
  )?.[1];
  return requiredRole === role;
}

export async function signIn(
  _prevState: SignInResult | null,
  formData: FormData
): Promise<SignInResult> {
  try {
    const rawIdentifier = formData.get('identifier');
    const rawPassword   = formData.get('password');
    const rawRedirect   = formData.get('redirectTo');

    const raw = {
      identifier: typeof rawIdentifier === 'string' ? rawIdentifier.trim() : rawIdentifier,
      password:   typeof rawPassword === 'string'   ? rawPassword : rawPassword,
      redirectTo: rawRedirect,
    };

    const parsed = signInSchema.safeParse(raw);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return {
        success: false,
        error: 'Mohon periksa kembali isian formulir.',
        fields: {
          ...(flat.fieldErrors.identifier?.[0] && { identifier: flat.fieldErrors.identifier[0] }),
          ...(flat.fieldErrors.password?.[0]   && { password:   flat.fieldErrors.password[0] }),
        },
      };
    }

    const { identifier, password, redirectTo } = parsed.data;

    const email = isPhoneNumber(identifier)
      ? phoneToEmail(identifier)
      : identifier.trim();

    const supabase = await createSupabaseServerClient();
    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Retry with alternate leading-zero format for student phone logins
    if (authError && isPhoneNumber(identifier)) {
      const cleanDigits = identifier.replace(/\s+/g, '').replace(/^\+62/, '0');
      const altPhone = cleanDigits.startsWith('0') ? cleanDigits.slice(1) : `0${cleanDigits}`;
      const altEmail = `${altPhone}@student.mylms.app`;
      const retry = await supabase.auth.signInWithPassword({ email: altEmail, password });
      if (retry.data?.user) {
        authData = retry.data;
        authError = retry.error;
      }
    }

    // Auto-confirm email if service role key is available
    if (authError?.message?.toLowerCase().includes('email not confirmed')) {
      const serviceKey = getSupabaseServiceRoleKey();
      if (isValidServiceRoleJwt(serviceKey)) {
        try {
          const adminClient = createSupabaseAdminClient();
          const { data: listData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
          const targetUser = listData?.users?.find(
            (u) => u.email?.toLowerCase() === email.toLowerCase()
          );
          if (targetUser) {
            await adminClient.auth.admin.updateUserById(targetUser.id, { email_confirm: true });
            const retry = await supabase.auth.signInWithPassword({ email, password });
            authData = retry.data;
            authError = retry.error;
          }
        } catch {
          // ignore
        }
      }
    }

    if (authError || !authData.user) {
      const errMsg = authError?.message ?? '';
      if (errMsg.toLowerCase().includes('email not confirmed')) {
        return {
          success: false,
          error: 'Email belum dikonfirmasi di Supabase. Silakan konfirmasi user di menu Supabase Authentication → Users.',
        };
      }
      return {
        success: false,
        error: 'Login gagal. Periksa kembali email/nomor dan password/PIN kamu.',
      };
    }

    const user = authData.user;
    const role = await resolveUserRole(user.id, user) as UserRole | undefined;

    if (!role) {
      await supabase.auth.signOut();
      return { success: false, error: 'Akun ini belum dikonfigurasi. Hubungi administrator.' };
    }

    // Stamp role into user_metadata
    try {
      if (user.user_metadata?.role !== role) {
        await supabase.auth.updateUser({ data: { ...user.user_metadata, role } });
        const serviceKey = getSupabaseServiceRoleKey();
        if (isValidServiceRoleJwt(serviceKey)) {
          const adminClient = createSupabaseAdminClient();
          await adminClient.auth.admin.updateUserById(user.id, {
            user_metadata: { ...user.user_metadata, role },
          });
        }
      }
    } catch (err) {
      console.error('[signIn] failed to stamp user_metadata.role:', err);
    }

    // Set role cookie
    try {
      const cookieStore = await cookies();
      const headerStore = await headers();
      const proto = headerStore.get('x-forwarded-proto') ?? 'https';
      const isHttps = proto.includes('https') || process.env.NODE_ENV === 'production';
      cookieStore.set('b2b_role', role, {
        path: '/',
        sameSite: isHttps ? 'none' : 'lax',
        secure: isHttps,
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 7,
      });
    } catch {
      // ignore cookie errors
    }

    const destination = isSafeRedirect(redirectTo ?? '', role)
      ? redirectTo!
      : ROLE_DASHBOARD_MAP[role];

    return { success: true, redirectTo: destination };
  } catch (err) {
    console.error('[signIn] unexpected error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Terjadi kesalahan saat masuk. Silakan coba lagi.',
    };
  }
}

export async function signOut(): Promise<{ redirectTo: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    const cookieStore = await cookies();
    cookieStore.delete('b2b_role');
  } catch (err) {
    console.error('[signOut] error:', err);
  }
  return { redirectTo: '/login' };
}
