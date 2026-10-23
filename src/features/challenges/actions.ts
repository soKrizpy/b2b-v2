// src/features/challenges/actions.ts
// Server Actions: challenge CRUD (admin), student submit, teacher review.
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireAdmin, requireRole, getAuthUser } from '@/lib/auth';
import { awardRewardEvent } from '@/features/pet/lib/rewardActions';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type ChallengeActionResult =
  | { success: true; id?: number; message: string }
  | { success: false; error: string; fields?: Record<string, string> };

// ── Schemas ───────────────────────────────────────────────────────────────────

const challengeSchema = z.object({
  topic_id:           z.coerce.number().int().positive('topic_id wajib diisi'),
  title:              z.string().min(1, 'Judul challenge wajib diisi').max(200),
  instructions:       z.string().max(5000).optional(),
  order_index:        z.coerce.number().int().min(0).default(0),
  allows_file_upload: z.coerce.boolean().default(false),
});

const submitSchema = z.object({
  challenge_id:    z.coerce.number().int().positive(),
  submission_url:  z.string().url('Link submission tidak valid').optional().or(z.literal('')),
  submission_note: z.string().max(1000).optional(),
});

const reviewSchema = z.object({
  submission_id: z.coerce.number().int().positive(),
  status:        z.enum(['approved', 'needs_revision']),
  review_note:   z.string().max(1000).optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function fromFD(fd: FormData, keys: string[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const k of keys) { const v = fd.get(k); if (v !== null) obj[k] = v; }
  return obj;
}

function flatErr(err: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const [k, msgs] of Object.entries(err.flatten().fieldErrors)) {
    if (Array.isArray(msgs) && msgs.length > 0) fields[k] = msgs[0] as string;
  }
  return fields;
}

async function isTeacherAssignedToStudent(
  db: ReturnType<typeof createSupabaseAdminClient>,
  teacherId: string,
  studentId: string
): Promise<boolean> {
  const { data: directAssignment, error: directError } = await db
    .from('teacher_students')
    .select('student_id')
    .eq('teacher_id', teacherId)
    .eq('student_id', studentId)
    .maybeSingle();
  if (directError) return false;
  if (directAssignment) return true;

  const { data: meetings, error: meetingError } = await db
    .from('meetings')
    .select('id')
    .eq('teacher_id', teacherId);
  if (meetingError || !meetings?.length) return false;

  const { data: meetingAssignment, error: meetingStudentError } = await db
    .from('meeting_students')
    .select('student_id')
    .eq('student_id', studentId)
    .in('meeting_id', meetings.map((meeting) => meeting.id))
    .limit(1);
  return !meetingStudentError && Boolean(meetingAssignment?.length);
}

function revalidateAll(topicId?: number, moduleId?: number) {
  revalidateTag('curriculum');
  revalidatePath('/admin/curriculum', 'layout');
  revalidatePath('/teacher/submissions', 'layout');
  if (topicId) revalidatePath(`/student/lessons/topic/${topicId}`, 'layout');
  if (moduleId) revalidatePath(`/admin/curriculum/${moduleId}`, 'layout');
}

// â”€â”€ Admin: challenge CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function createChallenge(
  _prev: ChallengeActionResult | null,
  formData: FormData
): Promise<ChallengeActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const raw = fromFD(formData, ['topic_id', 'title', 'instructions', 'order_index', 'allows_file_upload']);
  const parsed = challengeSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: 'Validasi gagal.', fields: flatErr(parsed.error) };

  const db = createSupabaseAdminClient();
  const { data, error } = await (db
    .from('challenges')
    .insert({ ...parsed.data, instructions: parsed.data.instructions ?? null } as never)
    .select('id')
    .single() as unknown as Promise<{ data: { id: number } | null; error: { message: string } | null }>);

  if (error) return { success: false, error: error.message };
  revalidateAll(parsed.data.topic_id);
  return { success: true, id: data!.id, message: 'Challenge berhasil dibuat.' };
}

export async function updateChallenge(
  _prev: ChallengeActionResult | null,
  formData: FormData
): Promise<ChallengeActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const id = Number(formData.get('id'));
  if (!id) return { success: false, error: 'ID challenge tidak valid.' };

  const raw = fromFD(formData, ['topic_id', 'title', 'instructions', 'order_index', 'allows_file_upload']);
  const parsed = challengeSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: 'Validasi gagal.', fields: flatErr(parsed.error) };

  const db = createSupabaseAdminClient();
  const { error } = await (db
    .from('challenges')
    .update({ ...parsed.data, instructions: parsed.data.instructions ?? null } as never)
    .eq('id', id) as unknown as Promise<{ error: { message: string } | null }>);

  if (error) return { success: false, error: error.message };
  revalidateAll(parsed.data.topic_id);
  return { success: true, message: 'Challenge berhasil diperbarui.' };
}

export async function deleteChallenge(
  _prev: ChallengeActionResult | null,
  formData: FormData
): Promise<ChallengeActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const id = Number(formData.get('id'));
  if (!id) return { success: false, error: 'ID challenge tidak valid.' };

  const db = createSupabaseAdminClient();
  // Remove submissions first (no CASCADE in DB between auth.users ref)
  await (db.from('challenge_submissions').delete().eq('challenge_id', id) as unknown as Promise<unknown>);
  const { error } = await (db
    .from('challenges').delete().eq('id', id) as unknown as Promise<{ error: { message: string } | null }>);

  if (error) return { success: false, error: error.message };
  revalidatePath('/admin/curriculum', 'layout');
  return { success: true, message: 'Challenge berhasil dihapus.' };
}

// â”€â”€ Student: submit challenge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function submitChallenge(
  _prev: ChallengeActionResult | null,
  formData: FormData
): Promise<ChallengeActionResult> {
  const auth = await getAuthUser();
  if (!auth.ok) return { success: false, error: auth.message };

  const raw = fromFD(formData, ['challenge_id', 'submission_url', 'submission_note']);
  const parsed = submitSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: 'Validasi gagal.', fields: flatErr(parsed.error) };

  const { challenge_id, submission_url, submission_note } = parsed.data;
  const studentId = auth.user.id;

  // Only students may submit
  if (auth.role !== 'student') return { success: false, error: 'Hanya siswa yang dapat submit challenge.' };

  const db = createSupabaseAdminClient();

  // Check whether an active (non-approved) submission already exists
  const { data: existing } = await (db
    .from('challenge_submissions')
    .select('id, status')
    .eq('challenge_id', challenge_id)
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false })
    .limit(1) as unknown as Promise<{ data: Array<{ id: number; status: string }> | null }>);

  const latest = existing?.[0];

  if (latest && latest.status === 'pending') {
    return { success: false, error: 'Kamu sudah punya submission yang sedang ditinjau. Tunggu hasilnya dulu.' };
  }

  if (latest && latest.status === 'approved') {
    return { success: false, error: 'Challenge ini sudah disetujui.' };
  }

  const { data, error } = await (db
    .from('challenge_submissions')
    .insert({
      challenge_id,
      student_id:      studentId,
      submission_url:  submission_url || null,
      submission_note: submission_note || null,
      submitted_at:    new Date().toISOString(),
    } as never)
    .select('id')
    .single() as unknown as Promise<{ data: { id: number } | null; error: { message: string } | null }>);

  if (error) return { success: false, error: `Gagal menyimpan submission: ${error.message}` };

  revalidatePath('/student/lessons', 'layout');
  revalidatePath('/teacher/submissions', 'layout');
  return { success: true, id: data!.id, message: 'Submission berhasil dikirim! Tunggu review dari guru.' };
}

// â”€â”€ Teacher: review submission â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function reviewSubmission(
  _prev: ChallengeActionResult | null,
  formData: FormData
): Promise<ChallengeActionResult> {
  const auth = await requireRole('teacher');
  if (!auth.ok) return { success: false, error: auth.message };

  const raw = fromFD(formData, ['submission_id', 'status', 'review_note']);
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: 'Validasi gagal.', fields: flatErr(parsed.error) };

  const { submission_id, status, review_note } = parsed.data;

  const db = createSupabaseAdminClient();
  const { data: targetSubmission, error: targetError } = await (db
    .from('challenge_submissions')
    .select('id, student_id')
    .eq('id', submission_id)
    .maybeSingle() as unknown as Promise<{ data: { id: number; student_id: string } | null; error: { message: string } | null }>);
  if (targetError || !targetSubmission) {
    return { success: false, error: 'Submission tidak ditemukan.' };
  }
  const isAssigned = await isTeacherAssignedToStudent(db, auth.user.id, targetSubmission.student_id);
  if (!isAssigned) {
    return { success: false, error: 'Kamu hanya dapat meninjau submission siswa yang ditugaskan kepadamu.' };
  }

  const { error } = await (db
    .from('challenge_submissions')
    .update({
      status,
      review_note:  review_note ?? null,
      reviewed_by:  auth.user.id,
      reviewed_at:  new Date().toISOString(),
    } as never)
    .eq('id', submission_id) as unknown as Promise<{ error: { message: string } | null }>);

  if (error) return { success: false, error: error.message };

  // Award XP + coins to the student when the teacher approves their submission
  if (status === 'approved') {
    // Fetch the student_id from the submission so we can reward the correct student
    const { data: sub } = await (db
      .from('challenge_submissions')
      .select('student_id')
      .eq('id', submission_id)
      .maybeSingle() as unknown as Promise<{ data: { student_id: string } | null }>);

    if (sub?.student_id) {
      // Non-fatal — reward failure should not block the review confirmation
      awardRewardEvent(sub.student_id, 'CHALLENGE_APPROVED').catch((err) => {
        console.error('[reviewSubmission] reward error:', err);
      });
    }
  }

  revalidatePath('/teacher/submissions', 'layout');
  revalidatePath('/student/lessons', 'layout');

  return {
    success: true,
    message: status === 'approved'
      ? 'Submission disetujui! Siswa mendapat +30 XP dan +10 koin 🎉'
      : 'Feedback telah dikirim ke siswa.',
  };
}

// ── Teacher: bulk approve submissions ─────────────────────────────────────────

export async function bulkApproveSubmissions(
  submissionIds: number[]
): Promise<ChallengeActionResult> {
  const auth = await requireRole('teacher');
  if (!auth.ok) return { success: false, error: auth.message };

  if (!submissionIds || submissionIds.length === 0) {
    return { success: false, error: 'Pilih minimal satu submission untuk disetujui.' };
  }

  const db = createSupabaseAdminClient();

  // Fetch submissions before update to extract student_id and verify existence
  const { data: subs, error: fetchErr } = await (db
    .from('challenge_submissions')
    .select('id, student_id, status')
    .in('id', submissionIds) as unknown as Promise<{
      data: Array<{ id: number; student_id: string; status: string }> | null;
      error: { message: string } | null;
    }>);

  if (fetchErr) return { success: false, error: fetchErr.message };
  if (!subs || subs.length === 0) {
    return { success: false, error: 'Submission tidak ditemukan.' };
  }

  for (const submission of subs) {
    if (!(await isTeacherAssignedToStudent(db, auth.user.id, submission.student_id))) {
      return { success: false, error: 'Pilihan berisi submission siswa yang tidak ditugaskan kepadamu. Tidak ada perubahan yang dilakukan.' };
    }
  }

  const validIds = subs.map((s) => s.id);

  const { error } = await (db
    .from('challenge_submissions')
    .update({
      status: 'approved',
      reviewed_by: auth.user.id,
      reviewed_at: new Date().toISOString(),
    } as never)
    .in('id', validIds) as unknown as Promise<{ error: { message: string } | null }>);

  if (error) return { success: false, error: error.message };

  // Award rewards for students whose submissions were previously pending
  for (const s of subs) {
    if (s.student_id && s.status !== 'approved') {
      awardRewardEvent(s.student_id, 'CHALLENGE_APPROVED').catch((err) => {
        console.error('[bulkApproveSubmissions] reward error:', err);
      });
    }
  }

  revalidatePath('/teacher/submissions', 'layout');
  revalidatePath('/student/lessons', 'layout');

  return {
    success: true,
    message: `${validIds.length} submission berhasil disetujui!`,
  };
}



