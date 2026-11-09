// src/features/invoices/queries.ts
import 'server-only';
// Read-side helpers for the admin invoice management page.
// All queries use the admin client (bypasses RLS).

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { InvoiceRow } from '@/types/database';

// ── Result shapes ─────────────────────────────────────────────────────────────

export interface InvoiceWithStudent extends InvoiceRow {
  student_full_name:      string;
  student_email_or_phone: string;
}

export interface AttendanceDetail {
  meeting_id:   number;
  title:        string;
  meeting_date: string;
  has_joined:   boolean;
}

// ── getInvoicesByMonth ────────────────────────────────────────────────────────

export async function getInvoicesByMonth(
  monthYear: string
): Promise<InvoiceWithStudent[]> {
  const db = createSupabaseAdminClient();

  const { data, error } = await (db
    .from('invoices')
    .select('*, students ( full_name, email_or_phone )')
    .eq('month_year', monthYear)
    .order('created_at', { ascending: false }) as unknown as Promise<{
      data: Array<InvoiceRow & {
        students: { full_name: string; email_or_phone: string } | null;
      }> | null;
      error: { message: string } | null;
    }>);

  if (error) {
    console.error('[getInvoicesByMonth]', error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    ...row,
    student_full_name:      row.students?.full_name      ?? '—',
    student_email_or_phone: row.students?.email_or_phone ?? '—',
  }));
}

// ── getStudentInvoices ────────────────────────────────────────────────────────
// Returns only unpaid (sent) invoices for the student dashboard notice.

export async function getStudentInvoices(studentId: string): Promise<InvoiceRow[]> {
  const db = createSupabaseAdminClient();

  const { data, error } = await (db
    .from('invoices')
    .select('*')
    .eq('student_id', studentId)
    .eq('status', 'sent')
    .order('created_at', { ascending: false }) as unknown as Promise<{
      data: InvoiceRow[] | null;
      error: { message: string } | null;
    }>);

  if (error) {
    console.error('[getStudentInvoices]', error.message);
    return [];
  }
  return data ?? [];
}

// ── getAttendanceForInvoice ───────────────────────────────────────────────────
// Returns per-meeting has_joined breakdown for the attendance detail modal.

export async function getAttendanceForInvoice(
  invoiceId: string
): Promise<AttendanceDetail[]> {
  const db = createSupabaseAdminClient();

  // 1. Fetch invoice to get student_id and month_year
  const { data: inv } = await (db
    .from('invoices')
    .select('student_id, month_year')
    .eq('id', invoiceId)
    .maybeSingle() as unknown as Promise<{
      data: { student_id: string; month_year: string } | null;
      error: unknown;
    }>);

  if (!inv) return [];

  const [year, month] = inv.month_year.split('-').map(Number);
  const startDate = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const endDate   = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();

  // 2. Meetings in that month for this student via meeting_students!inner
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

  if (error) {
    console.error('[getAttendanceForInvoice]', error.message);
    return [];
  }

  return (rows ?? [])
    .filter((r) => {
      const d = r.meetings?.meeting_date;
      return d && d >= startDate && d <= endDate;
    })
    .map((r) => ({
      meeting_id:   r.meeting_id,
      title:        r.meetings?.title        ?? '—',
      meeting_date: r.meetings?.meeting_date ?? '',
      has_joined:   r.has_joined,
    }))
    .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date));
}
