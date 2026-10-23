// src/app/api/sessions/[id]/route.ts
// GET    /api/sessions/[id] — fetch single meeting (any authenticated role)
// PATCH  /api/sessions/[id] — update meeting (admin only)
// DELETE /api/sessions/[id] — delete/cancel meeting (admin only)
//
// Next.js 15: params is a Promise — must be awaited.

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin, getAuthUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { apiError, apiUnauthorized, apiForbidden, apiInternalError } from '@/lib/errors';
import { validate, updateSessionSchema } from '@/features/sessions/validation';
import { parseStudentIdsInput } from '@/features/sessions/student-assignment-input';
import {
  getSessionsForAdmin,
  getSessionsForTeacher,
  getSessionsForStudent,
} from '@/features/sessions/queries';

type UpdateInput = z.infer<typeof updateSessionSchema>;
type RouteContext = { params: Promise<{ id: string }> };

const NO_STORE = { 'Cache-Control': 'no-store' };

function revalidateAll() {
  revalidatePath('/admin/sessions',    'layout');
  revalidatePath('/admin/dashboard',   'layout');
  revalidatePath('/teacher/dashboard', 'layout');
  revalidatePath('/student/dashboard', 'layout');
}

export async function GET(
  _request: Request,
  { params }: RouteContext
): Promise<Response> {
  const auth = await getAuthUser();
  if (!auth.ok) return auth.status === 401 ? apiUnauthorized() : apiForbidden();

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id) || id <= 0) return apiError(400, 'ID jadwal tidak valid.', undefined, 'INVALID_ID');

  try {
    // Scope the lookup before returning meeting links, notes, attendance, or student data.
    const sessions = auth.role === 'admin'
      ? await getSessionsForAdmin()
      : auth.role === 'teacher'
        ? await getSessionsForTeacher(auth.user.id)
        : await getSessionsForStudent(auth.user.id);
    const session = sessions.find((item) => item.id === id);
    if (!session) return apiError(404, 'Jadwal tidak ditemukan.', undefined, 'NOT_FOUND');
    return Response.json(session, { headers: NO_STORE });
  } catch (err) {
    return apiInternalError(String(err));
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
): Promise<Response> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.status === 401 ? apiUnauthorized() : apiForbidden();

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id) || id <= 0) return apiError(400, 'ID jadwal tidak valid.', undefined, 'INVALID_ID');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'Request body harus berformat JSON.');
  }

  const parsedAssignments = parseStudentIdsInput(body);
  if (!parsedAssignments.valid) {
    return apiError(400, parsedAssignments.error, undefined, 'INVALID_STUDENT_IDS');
  }

  const raw        = parsedAssignments.body;
  const editMode   = (raw.edit_mode   as string)   || 'single';
  const seriesId   = (raw.series_id   as string)   || null;
  const sessionNum = Number(raw.session_number ?? 1);
  // Omitted student_ids means "leave assignments unchanged"; an explicit
  // empty array means "clear all assignments".
  const { hasStudentIds, studentIds } = parsedAssignments;

  // Strip PATCH control fields before Zod validates only meeting-data fields
  const meetingFields = Object.fromEntries(
    Object.entries(raw).filter(([k]) => !["edit_mode","series_id","student_ids","session_number"].includes(k))
  );
  const v = validate(updateSessionSchema, meetingFields);
  if (!v.success) return apiError(422, v.error, v.fields, 'VALIDATION_ERROR');

  const patch = v.data as UpdateInput;
  const db    = createSupabaseAdminClient();

  try {
    if (editMode === 'series' && seriesId) {
      const { data: futures, error: fetchErr } = await (db
        .from('meetings')
        .select('id, session_number')
        .eq('series_id', seriesId)
        .gte('session_number', sessionNum)
        .order('session_number', { ascending: true }) as unknown as Promise<{
          data: Array<{ id: number; session_number: number }>;
          error: { message: string } | null;
        }>);

      if (fetchErr) return apiInternalError(fetchErr.message);

      const baseDate = patch.meeting_date ? new Date(patch.meeting_date) : null;

      for (let i = 0; i < futures.length; i++) {
        const m            = futures[i];
        const sessionPatch: Record<string, unknown> = { ...patch };

        if (baseDate) {
          const d = new Date(baseDate);
          d.setDate(d.getDate() + i * 7);
          sessionPatch.meeting_date = d.toISOString();
        }

        const { error: sessionUpdateError } = await (db
          .from('meetings')
          .update(sessionPatch as never)
          .eq('id', m.id) as unknown as Promise<{ error: { message: string } | null }>);
        if (sessionUpdateError) {
          return apiError(500, 'Seri jadwal hanya terperbarui sebagian. Periksa jadwal sebelum mengulangi perubahan.');
        }

        if (hasStudentIds) {
          const { error: assignmentDeleteError } = await (db
            .from('meeting_students')
            .delete()
            .eq('meeting_id', m.id) as unknown as Promise<{ error: { message: string } | null }>);
          if (assignmentDeleteError) {
            return apiError(500, 'Perubahan seri jadwal gagal: penugasan siswa tidak dapat diperbarui.');
          }
          if (studentIds.length > 0) {
            const rows = studentIds.map((sid) => ({ meeting_id: m.id, student_id: sid }));
            const { error: assignmentInsertError } = await (db
              .from('meeting_students')
              .insert(rows as never) as unknown as Promise<{ error: { message: string } | null }>);
            if (assignmentInsertError) {
              return apiError(500, 'Perubahan seri jadwal gagal: penugasan siswa tidak dapat disimpan.');
            }
          }
        }
      }
    } else {
      const { error: updateErr } = await (db
        .from('meetings')
        .update(patch as never)
        .eq('id', id) as unknown as Promise<{ error: { message: string } | null }>);

      if (updateErr) return apiError(500, `Gagal memperbarui jadwal: ${updateErr.message}`);

      if (hasStudentIds) {
        const { error: assignmentDeleteError } = await (db
          .from('meeting_students')
          .delete()
          .eq('meeting_id', id) as unknown as Promise<{ error: { message: string } | null }>);
        if (assignmentDeleteError) {
          return apiError(500, 'Jadwal diperbarui, tetapi penugasan siswa gagal dihapus. Periksa penugasan sebelum mencoba lagi.');
        }
        if (studentIds.length > 0) {
          const rows = studentIds.map((sid) => ({ meeting_id: id, student_id: sid }));
          const { error: assignErr } = await (db
            .from('meeting_students')
            .insert(rows as never) as unknown as Promise<{ error: { message: string } | null }>);
          if (assignErr) {
            return apiError(500, 'Jadwal diperbarui, tetapi penugasan siswa gagal disimpan. Periksa penugasan sebelum mencoba lagi.');
          }
        }
      }
    }

    revalidateAll();
    return Response.json({ success: true, message: 'Jadwal berhasil diperbarui.' }, { headers: NO_STORE });
  } catch (err) {
    return apiInternalError(String(err));
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext
): Promise<Response> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.status === 401 ? apiUnauthorized() : apiForbidden();

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id) || id <= 0) return apiError(400, 'ID jadwal tidak valid.', undefined, 'INVALID_ID');

  const url        = new URL(request.url);
  const editMode   = url.searchParams.get('edit_mode')      || 'single';
  const seriesId   = url.searchParams.get('series_id');
  const sessionNum = Number(url.searchParams.get('session_number') ?? 1);

  const db = createSupabaseAdminClient();

  try {
    if (editMode === 'series' && seriesId) {
      const { data: targets, error: targetErr } = await (db
        .from('meetings')
        .select('id')
        .eq('series_id', seriesId)
        .gte('session_number', sessionNum) as unknown as Promise<{
          data: Array<{ id: number }> | null;
          error: { message: string } | null;
        }>);

      if (targetErr) return apiInternalError(targetErr.message);
      const targetIds = (targets ?? []).map((m) => m.id);

      if (targetIds.length > 0) {
        const { error: assignmentDeleteError } = await (db
          .from('meeting_students')
          .delete()
          .in('meeting_id', targetIds) as unknown as Promise<{ error: { message: string } | null }>);
        if (assignmentDeleteError) return apiError(500, `Gagal menghapus penugasan siswa: ${assignmentDeleteError.message}`);

        const { error: delErr } = await (db
          .from('meetings')
          .delete()
          .in('id', targetIds) as unknown as Promise<{ error: { message: string } | null }>);

        if (delErr) return apiError(500, `Gagal menghapus seri: ${delErr.message}`);
      }
    } else {
      const { error: assignmentDeleteError } = await (db
        .from('meeting_students')
        .delete()
        .eq('meeting_id', id) as unknown as Promise<{ error: { message: string } | null }>);
      if (assignmentDeleteError) return apiError(500, `Gagal menghapus penugasan siswa: ${assignmentDeleteError.message}`);

      const { error: delErr } = await (db
        .from('meetings')
        .delete()
        .eq('id', id) as unknown as Promise<{ error: { message: string } | null }>);
      if (delErr) return apiError(500, `Gagal menghapus jadwal: ${delErr.message}`);
    }

    revalidateAll();
    return Response.json({ success: true, message: 'Jadwal berhasil dihapus.' }, { headers: NO_STORE });
  } catch (err) {
    return apiInternalError(String(err));
  }
}

