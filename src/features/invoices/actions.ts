'use server';
// src/features/invoices/actions.ts
// Server Actions for invoice management (admin-only).
// Mirrors the bits2bytes-lms billing logic:
//   - Generate: attended_meetings × price_per_meeting = total_amount (post-paid)
//   - Status lifecycle: draft → sent → paid
//   - Parent link: insert parent_links row with invoice_id, return shareable URL

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { headers } from 'next/headers';

export type InvoiceActionResult =
  | { success: true;  message: string; data?: Record<string, unknown> }
  | { success: false; error: string };

const REVALIDATE = ['/admin/invoices', '/admin/dashboard'];
function revalidateAll() {
  REVALIDATE.forEach((p) => revalidatePath(p, 'layout'));
}

// ── generateInvoices ──────────────────────────────────────────────────────────
// Bulk-creates draft invoices for every student with meetings in the given month.
// If a draft already exists for a student it refreshes the meeting counts.
// Sent / paid invoices are never touched.

export async function generateInvoices(
  _prev: InvoiceActionResult | null,
  formData: FormData
): Promise<InvoiceActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const monthYear = (formData.get('month_year') as string | null)?.trim();
  if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) {
    return { success: false, error: 'Format bulan tidak valid. Gunakan YYYY-MM.' };
  }

  const db = createSupabaseAdminClient();
  const [year, month] = monthYear.split('-').map(Number);
  const startDate = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const endDate   = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();

  // 1. All meetings in the month + their student join rows
  const { data: meetings, error: meetErr } = await (db
    .from('meetings')
    .select('id, meeting_students ( student_id, has_joined )')
    .gte('meeting_date', startDate)
    .lte('meeting_date', endDate) as unknown as Promise<{
      data: Array<{
        id: number;
        meeting_students: Array<{ student_id: string; has_joined: boolean }>;
      }> | null;
      error: { message: string } | null;
    }>);

  if (meetErr) return { success: false, error: meetErr.message };

  // 2. Aggregate per student
  const statsMap = new Map<string, { total: number; attended: number }>();
  for (const m of meetings ?? []) {
    for (const ms of m.meeting_students) {
      const s = statsMap.get(ms.student_id) ?? { total: 0, attended: 0 };
      s.total++;
      if (ms.has_joined) s.attended++;
      statsMap.set(ms.student_id, s);
    }
  }

  if (statsMap.size === 0) {
    return { success: false, error: 'Tidak ada pertemuan yang ditemukan untuk bulan ini.' };
  }

  // 3. Existing invoices for this month
  const { data: existing } = await (db
    .from('invoices')
    .select('id, student_id, status, price_per_meeting')
    .eq('month_year', monthYear) as unknown as Promise<{
      data: Array<{ id: string; student_id: string; status: string; price_per_meeting: number }> | null;
      error: unknown;
    }>);

  const existingMap = new Map(
    (existing ?? []).map((inv) => [inv.student_id, inv])
  );

  // 4. Seed price + bank from the most recent invoice ever
  const { data: lastInv } = await (db
    .from('invoices')
    .select('price_per_meeting, bank_account')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle() as unknown as Promise<{
      data: { price_per_meeting: number; bank_account: string | null } | null;
      error: unknown;
    }>);

  const defaultPrice = lastInv?.price_per_meeting ?? 0;
  const defaultBank  = lastInv?.bank_account ?? '';

  // 5. Insert new / update draft
  const inserts: Record<string, unknown>[] = [];
  const updates: Promise<void>[]           = [];

  for (const [studentId, stats] of statsMap) {
    const ex = existingMap.get(studentId);

    if (!ex) {
      inserts.push({
        student_id:        studentId,
        month_year:        monthYear,
        total_meetings:    stats.total,
        attended_meetings: stats.attended,
        price_per_meeting: defaultPrice,
        total_amount:      stats.attended * defaultPrice,
        bank_account:      defaultBank,
        status:            'draft',
      });
    } else if (ex.status === 'draft') {
      const { id, price_per_meeting } = ex;
      updates.push((async () => {
        await (db
          .from('invoices')
          .update({
            total_meetings:    stats.total,
            attended_meetings: stats.attended,
            total_amount:      stats.attended * price_per_meeting,
          } as never)
          .eq('id', id) as unknown as Promise<unknown>);
      })());
    }
    // sent / paid → skip
  }

  if (inserts.length > 0) {
    const { error: insErr } = await (db
      .from('invoices')
      .insert(inserts as never) as unknown as Promise<{ error: { message: string } | null }>);
    if (insErr) return { success: false, error: insErr.message };
  }

  if (updates.length > 0) await Promise.all(updates);

  revalidateAll();
  return {
    success: true,
    message: `Selesai: ${inserts.length} invoice baru${updates.length ? `, ${updates.length} diperbarui` : ''}.`,
    data: { generated: inserts.length, updated: updates.length },
  };
}

// ── updateInvoice ─────────────────────────────────────────────────────────────
// Edit attended_meetings, price_per_meeting, bank_account and/or status.
// total_amount is always recalculated server-side.

export async function updateInvoice(
  _prev: InvoiceActionResult | null,
  formData: FormData
): Promise<InvoiceActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const id               = (formData.get('id') as string | null)?.trim();
  const status           = (formData.get('status') as string | null)?.trim();
  const bankAccount      = (formData.get('bank_account') as string | null) ?? '';
  const priceRaw         = formData.get('price_per_meeting');
  const attendedRaw      = formData.get('attended_meetings');
  const totalMeetingsRaw = formData.get('total_meetings');

  if (!id) return { success: false, error: 'Invoice ID wajib diisi.' };

  const price         = Number(priceRaw)         || 0;
  const attended      = Number(attendedRaw)       || 0;
  const totalMeetings = Number(totalMeetingsRaw)  || 0;

  // Cap attended to total_meetings
  const safeAttended  = Math.max(0, Math.min(attended, totalMeetings));
  const totalAmount   = safeAttended * price;

  const patch: Record<string, unknown> = {
    price_per_meeting: price,
    bank_account:      bankAccount,
    total_amount:      totalAmount,
    attended_meetings: safeAttended,
  };
  if (status) patch.status = status;

  const db = createSupabaseAdminClient();
  const { error } = await (db
    .from('invoices')
    .update(patch as never)
    .eq('id', id) as unknown as Promise<{ error: { message: string } | null }>);

  if (error) return { success: false, error: error.message };

  revalidateAll();
  return { success: true, message: 'Invoice berhasil diperbarui.' };
}

// ── createParentLink ──────────────────────────────────────────────────────────
// Creates a new parent_links row with invoice_id attached.
// Returns the shareable URL.

export async function createParentLink(
  _prev: InvoiceActionResult | null,
  formData: FormData
): Promise<InvoiceActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const studentId = (formData.get('student_id') as string | null)?.trim();
  const invoiceId = (formData.get('invoice_id') as string | null)?.trim() || null;

  if (!studentId) return { success: false, error: 'student_id wajib diisi.' };

  const db = createSupabaseAdminClient();

  const { data, error } = await (db
    .from('parent_links')
    .insert({ student_id: studentId, invoice_id: invoiceId } as never)
    .select('token')
    .single() as unknown as Promise<{
      data: { token: string } | null;
      error: { message: string } | null;
    }>);

  if (error || !data) {
    return { success: false, error: error?.message ?? 'Gagal membuat link.' };
  }

  // Build canonical URL
  const headersList = await headers();
  const host  = headersList.get('host') ?? 'localhost:3000';
  const proto = headersList.get('x-forwarded-proto') ?? 'https';
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? `${proto}://${host}`;
  const url = `${origin}/parent/report?token=${data.token}`;

  revalidatePath('/admin/invoices', 'layout');
  return { success: true, message: 'Link berhasil dibuat.', data: { url, token: data.token } };
}

// ── bulkUpdateInvoiceStatus ──────────────────────────────────────────────────
// Bulk-updates status for selected invoice IDs.

export async function bulkUpdateInvoiceStatus(
  invoiceIds: string[],
  newStatus: string
): Promise<InvoiceActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  if (!invoiceIds || invoiceIds.length === 0) {
    return { success: false, error: 'Tidak ada invoice yang dipilih.' };
  }

  const db = createSupabaseAdminClient();
  const { error } = await (db
    .from('invoices')
    .update({ status: newStatus } as never)
    .in('id', invoiceIds) as unknown as Promise<{ error: { message: string } | null }>);

  if (error) return { success: false, error: error.message };

  revalidateAll();
  return {
    success: true,
    message: `${invoiceIds.length} invoice berhasil diperbarui menjadi ${newStatus}.`,
  };
}


// ── getAttendanceForInvoiceAction ─────────────────────────────────────────────
// Admin-only server action used by the invoice attendance modal.
export async function getAttendanceForInvoiceAction(
  invoiceId: string
): Promise<import('./queries').AttendanceDetail[]> {
  const auth = await requireAdmin();
  if (!auth.ok) return [];

  if (!invoiceId || invoiceId.length > 128) return [];

  const db = createSupabaseAdminClient();
  const { data: inv, error: invoiceError } = await (db
    .from('invoices')
    .select('student_id, month_year')
    .eq('id', invoiceId)
    .maybeSingle() as unknown as Promise<{
      data: { student_id: string; month_year: string } | null;
      error: { message: string } | null;
    }>);

  if (invoiceError || !inv) return [];

  const [year, month] = inv.month_year.split('-').map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return [];
  }
  const startDate = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();

  const { data: rows, error } = await (db
    .from('meeting_students')
    .select('meeting_id, has_joined, meetings ( id, title, meeting_date )')
    .eq('student_id', inv.student_id) as unknown as Promise<{
      data: Array<{
        meeting_id: number;
        has_joined: boolean;
        meetings: { id: number; title: string; meeting_date: string } | null;
      }> | null;
      error: { message: string } | null;
    }>);

  if (error) return [];

  return (rows ?? [])
    .filter((row) => {
      const date = row.meetings?.meeting_date;
      return Boolean(date && date >= startDate && date <= endDate);
    })
    .map((row) => ({
      meeting_id: row.meeting_id,
      title: row.meetings?.title ?? '—',
      meeting_date: row.meetings?.meeting_date ?? '',
      has_joined: row.has_joined,
    }))
    .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date));
}
