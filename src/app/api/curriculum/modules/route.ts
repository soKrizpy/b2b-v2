import { requireAdmin } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { apiUnauthorized, apiForbidden, apiInternalError } from '@/lib/errors';

export async function GET(): Promise<Response> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.status === 401 ? apiUnauthorized() : apiForbidden();

  try {
    const db = createSupabaseAdminClient();
    const { data, error } = await db
      .from('modules')
      .select('id, title, level')
      .eq('is_active', true)
      .order('title', { ascending: true });

    if (error) return apiInternalError('Gagal memuat modul kurikulum.');
    return Response.json(data ?? [], {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return apiInternalError('Gagal memuat modul kurikulum.');
  }
}
