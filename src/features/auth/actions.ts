// src/features/auth/actions.ts
'use server';

import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  isSupabaseAdminConfigured,
  matchMockUserCredentials,
  MOCK_SESSION_COOKIE,
} from '@/lib/supabase/mock';
import { resolveUserRole } from './lib/resolveRole';
import { ROLE_DASHBOARD_MAP, PROTECTED_PREFIXES } from '@/lib/constants';
import { signInSchema, isPhoneNumber, phoneToEmail } from './validation';
import type { SignInInput } from './validation';

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
    // 1. Validate
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

    // 2. Resolve email -- phone numbers use the synthetic email pattern
    //    {phone}@student.mylms.app  (set during student account creation)
    const email = isPhoneNumber(identifier)
      ? phoneToEmail(identifier)
      : identifier.trim();

    // 3. Authenticate
    const supabase = await createSupabaseServerClient({ forceRealIfConfigured: true });
    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // If phone login failed, try alternate phone normalization (with or without leading zero)
    if (authError && isPhoneNumber(identifier)) {
      const cleanDigits = identifier.replace(/\s+/g, '').replace(/^\+62/, '0');
      const altPhone = cleanDigits.startsWith('0') ? cleanDigits.slice(1) : `0${cleanDigits}`;
      const altEmail = `${altPhone}@student.mylms.app`;
      const retry = await supabase.auth.signInWithPassword({
        email: altEmail,
        password,
      });
      if (retry.data?.user) {
        authData = retry.data;
        authError = retry.error;
      }
    }

    // Auto-confirm email if Supabase rejected login only because "Email not confirmed"
    // and SUPABASE_SERVICE_ROLE_KEY is configured
    if (
      authError?.message?.toLowerCase().includes('email not confirmed') &&
      isSupabaseAdminConfigured()
    ) {
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
        // ignore and fall through to error message below
      }
    }

    if (authError || !authData.user) {
      const mockUser = matchMockUserCredentials(email, password);
      if (mockUser) {
        const role = mockUser.user_metadata.role ?? 'student';
        try {
          const cookieStore = await cookies();
          const headerStore = await headers();
          const proto = headerStore.get('x-forwarded-proto') ?? 'https';
          const isHttps = proto.includes('https') || process.env.NODE_ENV === 'production';
          const cookieOpts = {
            path: '/',
            sameSite: (isHttps ? 'none' : 'lax') as 'none' | 'lax',
            secure: isHttps,
            httpOnly: false,
            maxAge: 60 * 60 * 24 * 7,
          };
          cookieStore.set(MOCK_SESSION_COOKIE, mockUser.id, cookieOpts);
          cookieStore.set('b2b_role', role, cookieOpts);
        } catch {
          // ignore cookie errors in non-request environments
        }

        const destination = isSafeRedirect(redirectTo ?? '', role)
          ? redirectTo!
          : ROLE_DASHBOARD_MAP[role];

        return {
          success: true,
          redirectTo: destination,
        };
      }
    }

    if (authError || !authData.user) {
      const errMsg = authError?.message ?? '';
      if (errMsg.toLowerCase().includes('email not confirmed')) {
        return {
          success: false,
          error:
            'Email belum dikonfirmasi di Supabase. Silakan konfirmasi user di menu Supabase Authentication → Users, atau matikan "Confirm email" di Auth Providers.',
        };
      }
      if (errMsg.toLowerCase().includes('invalid api key') || errMsg.toLowerCase().includes('fetch failed')) {
        return {
          success: false,
          error: `Koneksi ke Supabase gagal (${errMsg}). Periksa NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.`,
        };
      }
      return {
        success: false,
        error: 'Login gagal. Periksa kembali email/nomor dan password/PIN kamu.',
      };
    }

    const user = authData.user;

    // 4. Resolve role (queries public.profiles, falls back to metadata or auto-provisions profile)
    const role = await resolveUserRole(user.id);

    if (!role) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Akun ini belum dikonfigurasi. Hubungi administrator.',
      };
    }

    // The role is stored in public.profiles and must not be copied into
    // user-editable metadata or a client-readable authorization cookie.
    try {
      const cookieStore = await cookies();
      cookieStore.delete(MOCK_SESSION_COOKIE);
    } catch {
      // ignore cookie errors
    }

    // 6. Return redirect target to client (avoids Server Action redirect RSC payload errors in iframes)
    const destination = isSafeRedirect(redirectTo ?? '', role)
      ? redirectTo!
      : ROLE_DASHBOARD_MAP[role];

    return {
      success: true,
      redirectTo: destination,
    };
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
    cookieStore.delete(MOCK_SESSION_COOKIE);
  } catch (err) {
    console.error('[signOut] error:', err);
  }
  return { redirectTo: '/login' };
}
