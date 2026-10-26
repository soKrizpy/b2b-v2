// src/features/sessions/actions.ts
// Server Actions for meeting CRUD operations.
// Most mutations are admin-only; markSessionComplete additionally accepts 'teacher'.
// Role is verified via requireAdmin() or requireAdminOrTeacher() before
// any DB write. revalidatePath() is called after each mutation so all three
// role dashboards reflect the change immediately.

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin, requireAdminOrTeacher } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';
import { ATTENDANCE_STATUSES } from '@/types/sessions';
import { assignTopicsToSessions, isCompleteModuleSchedule } from './curriculumSchedule';
import {
  validate,
  createSessionSchema,
  updateSessionSchema,
} from './validation';

export type ActionResult =
  | { success: true; message: string }
  | { success: false; error: string; fields?: Record<string, string> };

type CreateInput = z.infer<typeof createSessionSchema>;
type UpdateInput = z.infer<typeof updateSessionSchema>;

const attendanceInputSchema = z.array(
  z.object({
    student_id: z.string().min(1),
    status: z.enum(ATTENDANCE_STATUSES),
  })
);

const REVALIDATE_PATHS = [
  '/admin/dashboard',
  '/admin/sessions',
  '/teacher/dashboard',
  '/student/dashboard',
  '/student/parent-hub',
] as const;

function revalidateAll() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path, 'layout');
  }
}

// â”€â”€ createSession â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function createSession(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const teacherId = (formData.get('teacher_id') as string) || null;

  const raw = {
    title: formData.get('title'),
    meeting_date: formData.get('meeting_date'),
    link_url: formData.get('link_url'),
    notes: formData.get('notes') || undefined,
    session_count: formData.get('session_count') ?? 1,
    session_number: formData.get('session_number') ?? 1,
    module_id: formData.get('module_id'),
    student_ids: formData.getAll('student_ids'),
  };

  const v = validate(createSessionSchema, raw);
  if (!v.success) return { success: false, error: v.error, fields: v.fields };

  const { title, meeting_date, link_url, notes, session_count, student_ids, module_id } =
    v.data as CreateInput;

  const db = createSupabaseAdminClient();
  const { data: moduleRow, error: moduleError } = await db
    .from('modules').select('id').eq('id', module_id).eq('is_active', true).maybeSingle();
  if (moduleError || !moduleRow) return { success: false, error: 'Modul kurikulum tidak ditemukan atau tidak aktif.' };
  const { data: publishedTopics, error: topicsError } = await (db
    .from('topics').select('id')
    .eq('module_id', module_id).eq('status', 'published')
    .order('order_index', { ascending: true }).order('id', { ascending: true }) as unknown as Promise<{
      data: Array<{ id: number }> | null;
      error: { message: string } | null;
    }>);
  if (topicsError || !publishedTopics || !isCompleteModuleSchedule(session_count, publishedTopics.length)) {
    return { success: false, error: 'Jumlah sesi dalam satu seri harus sama dengan jumlah topik terpublikasi pada modul agar setiap topik memiliki sesi.' };
  }
  const topicAssignments = assignTopicsToSessions(publishedTopics.map((topic) => topic.id));
  const seriesId = session_count > 1 ? crypto.randomUUID() : null;
  const baseDate = new Date(meeting_date);
  const insertedIds: number[] = [];
  let failureReason: string | null = null;

  for (const assignment of topicAssignments) {
    const sessionDate = new Date(baseDate);
    sessionDate.setDate(sessionDate.getDate() + (assignment.session_number - 1) * 7);

    // Cast through unknown â€” hand-authored Database generic doesn't resolve
    // MeetingInsert through the Supabase client generic perfectly at compile time.
    const insertResult = await (db
      .from('meetings')
      .insert({
        title,
        meeting_date: sessionDate.toISOString(),
        link_url: link_url ?? null,
        notes: notes ?? null,
        session_count: topicAssignments.length,
        session_number: assignment.session_number,
        series_id: seriesId,
        module_id,
        topic_id: assignment.topic_id,
        teacher_id: teacherId,
      } as never)
      .select('id')
      .single() as unknown as Promise<{
      data: { id: number } | null;
      error: { message: string } | null;
    }>);

    const { data: meeting, error: meetingError } = await insertResult;

    if (meetingError || !meeting) {
      console.error('[createSession] insert error:', meetingError?.message);
      failureReason = 'Gagal menyimpan salah satu sesi.';
      break;
    }

    // Track immediately so a later assignment failure can roll this row back.
    insertedIds.push(meeting.id);

    if (student_ids.length > 0) {
      const rows = student_ids.map((sid: string) => ({
        meeting_id: meeting.id,
        student_id: sid,
      }));
      const { error: assignError } = await (db
        .from('meeting_students')
        .insert(rows as never) as unknown as Promise<{
        error: { message: string } | null;
      }>);
      if (assignError) {
        console.error(
          '[createSession] student assign error:',
          assignError.message
        );
        failureReason = 'Gagal menugaskan siswa ke salah satu sesi.';
        break;
      }
    }
  }

  if (failureReason || insertedIds.length !== session_count) {
    let rollbackFailed = false;
    if (insertedIds.length > 0) {
      const { error: assignmentCleanupError } = await (db
        .from('meeting_students')
        .delete()
        .in('meeting_id', insertedIds) as unknown as Promise<{ error: { message: string } | null }>);
      const { error: meetingCleanupError } = await (db
        .from('meetings')
        .delete()
        .in('id', insertedIds) as unknown as Promise<{ error: { message: string } | null }>);
      rollbackFailed = Boolean(assignmentCleanupError || meetingCleanupError);
      if (rollbackFailed) {
        console.error('[createSession] rollback failed:', assignmentCleanupError?.message, meetingCleanupError?.message);
      }
    }
    return {
      success: false,
      error: rollbackFailed
        ? 'Pembuatan sesi gagal dan pembersihan otomatis tidak tuntas. Periksa jadwal sebelum mencoba lagi.'
        : (failureReason ?? 'Gagal menyimpan seluruh jadwal. Tidak ada sesi yang dipertahankan.'),
    };
  }

  revalidateAll();
  const label = session_count > 1 ? `${insertedIds.length} sesi` : '1 jadwal';
  return { success: true, message: `Berhasil membuat ${label} kelas.` };
}

// â”€â”€ updateSession â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function updateSession(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const idRaw = formData.get('id');
  const id = idRaw ? Number(idRaw) : NaN;
  if (isNaN(id) || id <= 0) {
    return {
      success: false,
      error: 'ID jadwal tidak valid.',
      fields: { id: 'Wajib diisi.' },
    };
  }

  const editMode = (formData.get('edit_mode') as string) || 'single';
  const seriesId = (formData.get('series_id') as string) || null;
  const sessionNum = Number(formData.get('session_number') ?? 1);
  const studentIds = formData.getAll('student_ids') as string[];
  const teacherId = (formData.get('teacher_id') as string) || null;

  const raw = Object.fromEntries(
    [
      ['title', formData.get('title')],
      ['meeting_date', formData.get('meeting_date')],
      ['link_url', formData.get('link_url')],
      ['notes', formData.get('notes')],
      ['session_count', formData.get('session_count')],
      ['session_number', formData.get('session_number')],
      ['module_id', formData.get('module_id')],
    ].filter(([, v]) => v !== null && v !== '')
  );

  const v = validate(updateSessionSchema, raw);
  if (!v.success) return { success: false, error: v.error, fields: v.fields };

  const patch = v.data as UpdateInput;
  if (patch.module_id !== undefined) {
    const dbForModuleCheck = createSupabaseAdminClient();
    const { data: existingMeeting, error: existingMeetingError } = await (dbForModuleCheck
      .from('meetings').select('module_id').eq('id', id).maybeSingle() as unknown as Promise<{ data: { module_id: number | null } | null; error: unknown }>);
    if (existingMeetingError || !existingMeeting || existingMeeting.module_id !== patch.module_id) {
      return { success: false, error: 'Modul jadwal tidak dapat diubah saat edit. Buat seri baru untuk modul lain.' };
    }
  }
  // Merge teacher_id into the patch (not part of Zod schema â€” handled separately)
  const patchWithTeacher = { ...patch, teacher_id: teacherId } as Record<
    string,
    unknown
  >;
  const db = createSupabaseAdminClient();

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

    if (fetchErr)
      return { success: false, error: 'Gagal memuat data seri jadwal.' };

    const baseDate = patch.meeting_date ? new Date(patch.meeting_date) : null;

    for (let i = 0; i < futures.length; i++) {
      const m = futures[i];
      const sessionPatch: Record<string, unknown> = { ...patchWithTeacher };

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
        revalidateAll();
        return {
          success: false,
          error: 'Seri jadwal hanya terperbarui sebagian. Periksa jadwal sebelum mengulangi perubahan.',
        };
      }

      const { error: assignmentDeleteError } = await (db
        .from('meeting_students')
        .delete()
        .eq('meeting_id', m.id) as unknown as Promise<{ error: { message: string } | null }>);
      if (assignmentDeleteError) {
        revalidateAll();
        return {
          success: false,
          error: 'Perubahan seri jadwal tidak selesai: penugasan siswa gagal diperbarui. Periksa jadwal sebelum mengulangi perubahan.',
        };
      }

      if (studentIds.length > 0) {
        const rows = studentIds.map((sid) => ({
          meeting_id: m.id,
          student_id: sid,
        }));
        const { error: assignmentInsertError } = await (db
          .from('meeting_students')
          .insert(rows as never) as unknown as Promise<{ error: { message: string } | null }>);
        if (assignmentInsertError) {
          revalidateAll();
          return {
            success: false,
            error: 'Perubahan seri jadwal tidak selesai: penugasan siswa gagal disimpan. Periksa jadwal sebelum mengulangi perubahan.',
          };
        }
      }
    }
  } else {
    const { error: updateErr } = await (db
      .from('meetings')
      .update(patchWithTeacher as never)
      .eq('id', id) as unknown as Promise<{
      error: { message: string } | null;
    }>);

    if (updateErr) {
      return {
        success: false,
        error: `Gagal memperbarui jadwal: ${updateErr.message}`,
      };
    }

    const { error: assignmentDeleteError } = await (db
      .from('meeting_students')
      .delete()
      .eq('meeting_id', id) as unknown as Promise<{ error: { message: string } | null }>);
    if (assignmentDeleteError) {
      return {
        success: false,
        error: 'Jadwal diperbarui, tetapi penugasan siswa gagal dihapus. Periksa penugasan sebelum mencoba lagi.',
      };
    }

    if (studentIds.length > 0) {
      const rows = studentIds.map((sid) => ({
        meeting_id: id,
        student_id: sid,
      }));
      const { error: assignErr } = await (db
        .from('meeting_students')
        .insert(rows as never) as unknown as Promise<{ error: { message: string } | null }>);
      if (assignErr) {
        return {
          success: false,
          error: 'Jadwal diperbarui, tetapi penugasan siswa gagal disimpan. Periksa penugasan sebelum mencoba lagi.',
        };
      }
    }
  }

  revalidateAll();
  return { success: true, message: 'Jadwal berhasil diperbarui.' };
}

// â”€â”€ deleteSession â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function deleteSession(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const idRaw = formData.get('id');
  const id = idRaw ? Number(idRaw) : NaN;
  if (isNaN(id) || id <= 0) {
    return { success: false, error: 'ID jadwal tidak valid.' };
  }

  const editMode = (formData.get('edit_mode') as string) || 'single';
  const seriesId = (formData.get('series_id') as string) || null;
  const sessionNum = Number(formData.get('session_number') ?? 1);

  const db = createSupabaseAdminClient();

  if (editMode === 'series' && seriesId) {
    const { data: targets, error: targetErr } = await (db
      .from('meetings')
      .select('id')
      .eq('series_id', seriesId)
      .gte('session_number', sessionNum) as unknown as Promise<{
      data: Array<{ id: number }> | null;
      error: { message: string } | null;
    }>);

    if (targetErr) {
      return { success: false, error: `Gagal memuat seri jadwal: ${targetErr.message}` };
    }
    const targetIds = (targets ?? []).map((m) => m.id);

    if (targetIds.length > 0) {
      const { error: assignmentDeleteError } = await (db
        .from('meeting_students')
        .delete()
        .in('meeting_id', targetIds) as unknown as Promise<{ error: { message: string } | null }>);
      if (assignmentDeleteError) {
        return {
          success: false,
          error: `Gagal menghapus penugasan siswa: ${assignmentDeleteError.message}`,
        };
      }

      const { error: delErr } = await (db
        .from('meetings')
        .delete()
        .in('id', targetIds) as unknown as Promise<{ error: { message: string } | null }>);

      if (delErr)
        return {
          success: false,
          error: `Gagal menghapus seri jadwal: ${delErr.message}`,
        };
    }
  } else {
    const { error: assignmentDeleteError } = await (db
      .from('meeting_students')
      .delete()
      .eq('meeting_id', id) as unknown as Promise<{ error: { message: string } | null }>);
    if (assignmentDeleteError) {
      return {
        success: false,
        error: `Gagal menghapus penugasan siswa: ${assignmentDeleteError.message}`,
      };
    }

    const { error: delErr } = await (db
      .from('meetings')
      .delete()
      .eq('id', id) as unknown as Promise<{ error: { message: string } | null }>);

    if (delErr)
      return {
        success: false,
        error: `Gagal menghapus jadwal: ${delErr.message}`,
      };
  }

  revalidateAll();
  return { success: true, message: 'Jadwal berhasil dihapus.' };
}

// â”€â”€ markSessionComplete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function markSessionComplete(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireAdminOrTeacher();
  if (!auth.ok) return { success: false, error: auth.message };

  const idRaw = formData.get('id');
  const id = idRaw ? Number(idRaw) : NaN;
  if (isNaN(id) || id <= 0) {
    return { success: false, error: 'ID jadwal tidak valid.' };
  }

  return saveMeetingReport(id, formData, true, auth.user.id, auth.role === 'admin');
}

export async function updateSessionReport(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireAdminOrTeacher();
  if (!auth.ok) return { success: false, error: auth.message };

  const idRaw = formData.get('id');
  const id = idRaw ? Number(idRaw) : NaN;
  if (isNaN(id) || id <= 0) {
    return { success: false, error: 'ID jadwal tidak valid.' };
  }

  return saveMeetingReport(id, formData, false, auth.user.id, auth.role === 'admin');
}

async function saveMeetingReport(
  meetingId: number,
  formData: FormData,
  markCompleted: boolean,
  actorId: string,
  isAdmin: boolean
): Promise<ActionResult> {
  const rawAttendance = formData.get('attendance_statuses');
  let attendance: unknown;
  try {
    attendance = JSON.parse(String(rawAttendance ?? '[]'));
  } catch {
    return { success: false, error: 'Data kehadiran tidak valid.' };
  }

  const parsedAttendance = attendanceInputSchema.safeParse(attendance);
  if (!parsedAttendance.success) {
    return {
      success: false,
      error: 'Pilih status kehadiran untuk setiap siswa.',
    };
  }

  const db = createSupabaseAdminClient();

  // The RPC uses a privileged server client, so enforce teacher-to-meeting
  // ownership here before invoking it. Admins may manage any meeting.
  const { data: meeting, error: meetingError } = await (db
    .from('meetings')
    .select('teacher_id')
    .eq('id', meetingId)
    .maybeSingle() as unknown as Promise<{
      data: { teacher_id: string | null } | null;
      error: { message: string } | null;
    }>);
  if (meetingError || !meeting) {
    return { success: false, error: 'Jadwal tidak ditemukan.' };
  }
  if (!isAdmin && meeting.teacher_id !== actorId) {
    return { success: false, error: 'Guru hanya dapat memperbarui laporan kelas yang ditugaskan kepadanya.' };
  }

  const callSaveMeetingReport = db.rpc as unknown as (
    functionName: 'save_meeting_report',
    args: {
      p_meeting_id: number;
      p_progress_report: string;
      p_attendance: Json;
      p_mark_completed: boolean;
      p_completion_status: string | null;
    }
  ) => Promise<{ error: { message: string } | null }>;
  const { error } = await callSaveMeetingReport('save_meeting_report', {
    p_meeting_id: meetingId,
    p_progress_report: (formData.get('progress_report') as string) || '',
    p_attendance: parsedAttendance.data as Json,
    p_mark_completed: markCompleted,
    p_completion_status: markCompleted
      ? (formData.get('completion_status') as string) || 'selesai'
      : null,
  });

  if (error) {
    const action = markCompleted
      ? 'menyelesaikan kelas'
      : 'memperbarui laporan';
    return { success: false, error: `Gagal ${action}: ${error.message}` };
  }

  revalidateAll();
  return {
    success: true,
    message: markCompleted
      ? 'Kelas berhasil ditandai selesai.'
      : 'Laporan kelas berhasil diperbarui.',
  };
}
