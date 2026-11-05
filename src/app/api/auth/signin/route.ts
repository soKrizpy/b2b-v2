// src/app/api/auth/signin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isValidServiceRoleJwt, getSupabaseServiceRoleKey } from '@/lib/supabase/env';
import { resolveUserRole } from '@/features/auth/lib/resolveRole';
import { ROLE_DASHBOARD_MAP, PROTECTED_PREFIXES } from '@/lib/constants';
import { signInSchema, isPhoneNumber, phoneToEmail } from '@/features/auth/validation';
import type { UserRole } from '@/types/roles';

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
    const isLocalhost =
      req.headers.get('host')?.startsWith('localhost') ||
      req.headers.get('host')?.startsWith('127.0.0.1');

    const cookieOpts = isLocalhost
      ? { path: '/', sameSite: 'lax' as const, secure: false, httpOnly: false, maxAge: 60 * 60 * 24 * 7 }
      : { path: '/', sameSite: 'none' as const, secure: true, partitioned: true, httpOnly: false, maxAge: 60 * 60 * 24 * 7 };

    const supabase = await createSupabaseServerClient();
    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Retry with alternate leading-zero format for student phone logins
    if ((authError || !authData.user) && email.endsWith('@student.mylms.app')) {
      const altEmail = email.startsWith('08')
        ? email.slice(1)
        : email.startsWith('8')
        ? `0${email}`
        : null;
      if (altEmail) {
        const altAttempt = await supabase.auth.signInWithPassword({ email: altEmail, password });
        if (!altAttempt.error && altAttempt.data.user) {
          authData = altAttempt.data;
          authError = null;
        }
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
          // ignore and fall through
        }
      }
    }

    if (authError || !authData.user) {
      const errMsg = authError?.message ?? '';
      if (errMsg.toLowerCase().includes('email not confirmed')) {
        return NextResponse.json(
          { success: false, error: 'Email belum dikonfirmasi di Supabase. Silakan konfirmasi user di menu Supabase Authentication → Users.' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Login gagal. Periksa kembali email/nomor dan password/PIN kamu.' },
        { status: 401 }
      );
    }

    const user = authData.user;
    const role = await resolveUserRole(user.id, user) as UserRole | undefined;

    if (!role) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { success: false, error: 'Akun ini belum dikonfigurasi. Hubungi administrator.' },
        { status: 403 }
      );
    }

    // Stamp role into user_metadata if missing
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
      console.error('[api/auth/signin] failed to stamp user_metadata.role:', err);
    }

    const destination = isSafeRedirect(redirectTo ?? '', role)
      ? redirectTo!
      : ROLE_DASHBOARD_MAP[role];

    const cookieStore = await cookies();
    const sbCookies = cookieStore.getAll().filter((c) => c.name.startsWith('sb-'));
    const sessionCookies = [
      ...sbCookies.map((c) => ({ name: c.name, value: c.value })),
      { name: 'b2b_role', value: role },
    ];

    const response = NextResponse.json({ success: true, redirectTo: destination, sessionCookies });
    for (const c of sbCookies) {
      response.cookies.set(c.name, c.value, cookieOpts);
    }
    response.cookies.set('b2b_role', role, cookieOpts);

    return response;
  } catch (err) {
    console.error('[api/auth/signin] unexpected error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan saat masuk. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
