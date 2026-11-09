// src/app/api/auth/signin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  isSupabaseAdminConfigured,
  matchMockUserCredentials,
  MOCK_SESSION_COOKIE,
  setPreviewFallbackSession,
} from '@/lib/supabase/mock';
import { resolveUserRole } from '@/features/auth/lib/resolveRole';
import { ROLE_DASHBOARD_MAP, PROTECTED_PREFIXES } from '@/lib/constants';
import { signInSchema, isPhoneNumber, phoneToEmail } from '@/features/auth/validation';

function isSafeRedirect(path: string, role: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  const requiredRole = Object.entries(PROTECTED_PREFIXES).find(
    ([prefix]) => path.startsWith(prefix)
  )?.[1];
  return requiredRole === role;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const raw = {
      identifier: typeof body?.identifier === 'string' ? body.identifier.trim() : body?.identifier,
      password:   typeof body?.password === 'string'   ? body.password          : body?.password,
      redirectTo: body?.redirectTo ?? null,
    };

    const parsed = signInSchema.safeParse(raw);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return NextResponse.json(
        {
          success: false,
          error: 'Mohon periksa kembali isian formulir.',
          fields: {
            ...(flat.fieldErrors.identifier?.[0] && { identifier: flat.fieldErrors.identifier[0] }),
            ...(flat.fieldErrors.password?.[0]   && { password:   flat.fieldErrors.password[0] }),
          },
        },
        { status: 400 }
      );
    }

    const { identifier, password, redirectTo } = parsed.data;

    const email = isPhoneNumber(identifier)
      ? phoneToEmail(identifier)
      : identifier.trim();

    // On localhost (HTTP), SameSite=None requires Secure which isn't available.
    // Use Lax + no Secure flag so cookies work in dev without HTTPS.
    const isLocalhost =
      req.headers.get('host')?.startsWith('localhost') ||
      req.headers.get('host')?.startsWith('127.0.0.1');

    const cookieOpts = isLocalhost
      ? {
          path: '/',
          sameSite: 'lax' as const,
          secure: false,
          httpOnly: false,
          maxAge: 60 * 60 * 24 * 7,
        }
      : {
          path: '/',
          sameSite: 'none' as const,
          secure: true,
          partitioned: true,
          httpOnly: false,
          maxAge: 60 * 60 * 24 * 7,
        };

    const supabase = await createSupabaseServerClient({ forceRealIfConfigured: true });
    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // If student phone login failed and email is 08xxx@student.mylms.app or 8xxx@student.mylms.app,
    // retry with the alternate leading-zero format (e.g. 85721252529@student.mylms.app)
    if (
      (authError || !authData.user) &&
      email.endsWith('@student.mylms.app')
    ) {
      const altEmail = email.startsWith('08')
        ? email.slice(1)
        : email.startsWith('8')
        ? `0${email}`
        : null;
      if (altEmail) {
        const altAttempt = await supabase.auth.signInWithPassword({
          email: altEmail,
          password,
        });
        if (!altAttempt.error && altAttempt.data.user) {
          authData = altAttempt.data;
          authError = null;
        }
      }
    }

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
        // ignore and fall through
      }
    }

    // Fallback to built-in demo/admin/teacher/student accounts when real Supabase rejects or is unseeded
    if (authError || !authData.user) {
      const mockUser = matchMockUserCredentials(email, password);
      if (mockUser) {
        const role = mockUser.user_metadata.role ?? 'student';
        const destination = isSafeRedirect(redirectTo ?? '', role)
          ? redirectTo!
          : ROLE_DASHBOARD_MAP[role];

        setPreviewFallbackSession({
          user: mockUser,
          role,
          accessToken: null,
          isMock: true,
        });

        const sessionCookies = [
          { name: MOCK_SESSION_COOKIE, value: mockUser.id },
        ];

        const response = NextResponse.json({
          success: true,
          redirectTo: destination,
          sessionCookies,
        });
        response.cookies.set(MOCK_SESSION_COOKIE, mockUser.id, cookieOpts);
        return response;
      }
    }

    if (authError || !authData.user) {
      const errMsg = authError?.message ?? '';
      if (errMsg.toLowerCase().includes('email not confirmed')) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Email belum dikonfirmasi di Supabase. Silakan konfirmasi user di menu Supabase Authentication → Users, atau matikan "Confirm email" di Auth Providers.',
          },
          { status: 401 }
        );
      }
      if (errMsg.toLowerCase().includes('invalid api key') || errMsg.toLowerCase().includes('fetch failed')) {
        return NextResponse.json(
          {
            success: false,
            error: `Koneksi ke Supabase gagal (${errMsg}). Periksa NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.`,
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          error: 'Login gagal. Periksa kembali email/nomor dan password/PIN kamu.',
        },
        { status: 401 }
      );
    }

    const user = authData.user;
    const role = await resolveUserRole(user.id);

    if (!role) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          success: false,
          error: 'Akun ini belum dikonfigurasi. Hubungi administrator.',
        },
        { status: 403 }
      );
    }

    setPreviewFallbackSession({
      user,
      role,
      accessToken: authData.session?.access_token ?? null,
      isMock: false,
    });

    const destination = isSafeRedirect(redirectTo ?? '', role)
      ? redirectTo!
      : ROLE_DASHBOARD_MAP[role];

    const cookieStore = await cookies();
    const sbCookies = cookieStore
      .getAll()
      .filter((c) => c.name.startsWith('sb-'));

    const sessionCookies = sbCookies.map((c) => ({ name: c.name, value: c.value }));

    const response = NextResponse.json({
      success: true,
      redirectTo: destination,
      sessionCookies,
    });

    response.cookies.delete({
      name: MOCK_SESSION_COOKIE,
      path: '/',
      sameSite: 'none',
      secure: true,
      partitioned: true,
    });
    for (const c of sbCookies) {
      response.cookies.set(c.name, c.value, cookieOpts);
    }

    return response;
  } catch (err) {
    console.error('[api/auth/signin] unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Terjadi kesalahan saat masuk. Silakan coba lagi.',
      },
      { status: 500 }
    );
  }
}
