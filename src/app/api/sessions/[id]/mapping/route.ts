import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { apiError, apiForbidden, apiInternalError, apiUnauthorized } from '@/lib/errors';

const mappingSchema = z.object({
  module_id: z.coerce.number().int().positive(),
  session_number: z.coerce.number().int().positive(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.status === 401 ? apiUnauthorized() : apiForbidden();

  // The hosted series trigger must be forward-fixed before this mutation is exposed.
  // Keep the endpoint closed unless an operator explicitly enables it server-side.
  if (process.env.LEGACY_MEETING_MAPPING_ENABLED !== 'true') {
    return apiError(503, 'Pemetaan jadwal lama belum diaktifkan.', undefined, 'FEATURE_DISABLED');
  }

  const { id: rawId } = await params;
  const meetingId = Number(rawId);
  if (!Number.isSafeInteger(meetingId) || meetingId <= 0) {
    return apiError(400, 'ID jadwal tidak valid.', undefined, 'INVALID_ID');
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return apiError(400, 'Request body harus berformat JSON.');
  }
  const parsed = mappingSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiError(422, 'Pilih modul dan sesi topik yang valid.', undefined, 'INVALID_MAPPING');
  }

  try {
    const db = createSupabaseAdminClient();
    const rpc = db.rpc as unknown as (
      name: 'map_legacy_meeting_to_topic',
      args: { p_meeting_id: number; p_module_id: number; p_session_number: number }
    ) => Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
    const { data, error } = await rpc('map_legacy_meeting_to_topic', {
      p_meeting_id: meetingId,
      p_module_id: parsed.data.module_id,
      p_session_number: parsed.data.session_number,
    });

    if (error) {
      if (error.code === '23505') {
        return apiError(409, 'Satu atau lebih siswa sudah terdaftar pada jadwal lain untuk topik ini. Periksa roster sebelum memetakan.', undefined, 'DUPLICATE_STUDENT_TOPIC_ASSIGNMENT');
      }
      if (error.code === '23514' || error.code === '22023') {
        return apiError(422, error.message, undefined, 'INVALID_MAPPING');
      }
      if (error.code === 'P0002') return apiError(404, 'Jadwal tidak ditemukan.', undefined, 'NOT_FOUND');
      console.error('[POST /api/sessions/:id/mapping]', error.message);
      return apiInternalError();
    }

    return Response.json({ success: true, mapping: data }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return apiInternalError(String(error));
  }
}
