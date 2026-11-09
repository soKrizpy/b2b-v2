undefined

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
