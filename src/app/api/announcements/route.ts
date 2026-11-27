// src/app/api/announcements/route.ts
// Public reads use the user's SSR client and the table's public SELECT policy.
// All writes require an admin role and use the server-only privileged client.

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import type { Announcement, AnnouncementTarget, AnnouncementUrgency } from '@/features/announcements/types';

const DAY_MS = 24 * 60 * 60 * 1000;

function isTarget(value: unknown): value is AnnouncementTarget {
  return value === 'all' || value === 'students' || value === 'teachers';
}

function isUrgency(value: unknown): value is AnnouncementUrgency {
  return value === 'info' || value === 'warning' || value === 'urgent';
}

function parsePositiveId(value: unknown): number | null {
  const id = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parseExpiry(value: unknown, durationDays: number): string | null {
  if (value === null || value === undefined || value === '') {
    return new Date(Date.now() + durationDays * DAY_MS).toISOString();
  }

  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseDuration(value: unknown, fallback = 7): number | null {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 365 ? parsed : null;
}

function noStore<T>(payload: T, status = 200) {
  const response = NextResponse.json(payload, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function GET() {
  try {
    const db = await createSupabaseServerClient();
    const { data, error } = await db
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /api/announcements]', error.message);
      return noStore({ error: 'Pengumuman belum dapat dimuat dari Supabase.' }, 503);
    }

    return noStore({ announcements: (data ?? []) as Announcement[] });
  } catch (err) {
    console.error('[GET /api/announcements]', err);
    return noStore({ error: 'Koneksi Supabase tidak tersedia.' }, 503);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return noStore({ error: auth.message }, auth.status);
  }

  try {
    const body = (await req.json()) as Partial<Announcement>;
    const title = body.title?.trim() ?? '';
    const content = body.content?.trim() ?? '';

    if (!title || !content) {
      return noStore({ error: 'Judul dan isi pengumuman wajib diisi.' }, 400);
    }
    if (body.target !== undefined && !isTarget(body.target)) {
      return noStore({ error: 'Target pengumuman tidak valid.' }, 400);
    }
    if (body.urgency !== undefined && !isUrgency(body.urgency)) {
      return noStore({ error: 'Tingkat urgensi tidak valid.' }, 400);
    }

    const durationDays = parseDuration(body.duration_days);
    if (durationDays === null) {
      return noStore({ error: 'Durasi pengumuman harus 1 sampai 365 hari.' }, 400);
    }

    const expiresAt = parseExpiry(body.expires_at, durationDays);
    if (!expiresAt) {
      return noStore({ error: 'Tanggal kedaluwarsa tidak valid.' }, 400);
    }

    const db = createSupabaseAdminClient();
    const { data, error } = await db
      .from('announcements')
      .insert({
        title,
        content,
        image_url: body.image_url?.trim() || null,
        target: body.target ?? 'all',
        urgency: body.urgency ?? 'info',
        duration_days: durationDays,
        expires_at: expiresAt,
        is_active: body.is_active ?? true,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('[POST /api/announcements]', error?.message);
      return noStore({ error: error?.message ?? 'Pengumuman gagal disimpan.' }, 500);
    }

    return noStore({ announcement: data as Announcement }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal membuat pengumuman.';
    return noStore({ error: message }, 500);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return noStore({ error: auth.message }, auth.status);
  }

  try {
    const body = (await req.json()) as Partial<Announcement> & { id?: unknown };
    const id = parsePositiveId(body.id);
    if (id === null) {
      return noStore({ error: 'ID pengumuman tidak valid.' }, 400);
    }

    const updates: {
      title?: string;
      content?: string;
      image_url?: string | null;
      target?: AnnouncementTarget;
      urgency?: AnnouncementUrgency;
      duration_days?: number;
      expires_at?: string;
      is_active?: boolean;
    } = {};

    if (body.title !== undefined) {
      const title = body.title.trim();
      if (!title) return noStore({ error: 'Judul pengumuman wajib diisi.' }, 400);
      updates.title = title;
    }
    if (body.content !== undefined) {
      const content = body.content.trim();
      if (!content) return noStore({ error: 'Isi pengumuman wajib diisi.' }, 400);
      updates.content = content;
    }
    if (body.image_url !== undefined) {
      updates.image_url = body.image_url?.trim() || null;
    }
    if (body.target !== undefined) {
      if (!isTarget(body.target)) return noStore({ error: 'Target pengumuman tidak valid.' }, 400);
      updates.target = body.target;
    }
    if (body.urgency !== undefined) {
      if (!isUrgency(body.urgency)) return noStore({ error: 'Tingkat urgensi tidak valid.' }, 400);
      updates.urgency = body.urgency;
    }
    if (body.is_active !== undefined) {
      updates.is_active = body.is_active;
    }

    if (body.expires_at !== undefined || body.duration_days !== undefined) {
      const durationDays = parseDuration(body.duration_days);
      if (durationDays === null) {
        return noStore({ error: 'Durasi pengumuman harus 1 sampai 365 hari.' }, 400);
      }
      const expiresAt = parseExpiry(body.expires_at, durationDays);
      if (!expiresAt) return noStore({ error: 'Tanggal kedaluwarsa tidak valid.' }, 400);
      updates.duration_days = durationDays;
      updates.expires_at = expiresAt;
    }

    if (Object.keys(updates).length === 0) {
      return noStore({ error: 'Tidak ada perubahan yang dikirim.' }, 400);
    }

    const db = createSupabaseAdminClient();
    const { data, error } = await db
      .from('announcements')
      .update(updates)
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[PATCH /api/announcements]', error.message);
      return noStore({ error: error.message }, 500);
    }
    if (!data) return noStore({ error: 'Pengumuman tidak ditemukan.' }, 404);

    return noStore({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal memperbarui pengumuman.';
    return noStore({ error: message }, 500);
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return noStore({ error: auth.message }, auth.status);
  }

  try {
    const rawId = new URL(req.url).searchParams.get('id');
    const id = parsePositiveId(rawId);
    if (id === null) {
      return noStore({ error: 'ID pengumuman tidak valid.' }, 400);
    }

    const db = createSupabaseAdminClient();
    const { data, error } = await db
      .from('announcements')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[DELETE /api/announcements]', error.message);
      return noStore({ error: error.message }, 500);
    }
    if (!data) return noStore({ error: 'Pengumuman tidak ditemukan.' }, 404);

    return noStore({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus pengumuman.';
    return noStore({ error: message }, 500);
  }
}
