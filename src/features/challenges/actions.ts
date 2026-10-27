// src/features/challenges/actions.ts
// Server Actions: challenge CRUD (admin), student submit, teacher review.
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireAdmin, requireRole, getAuthUser } from '@/lib/auth';
import { awardRewardEvent } from '@/features/pet/lib/rewardActions';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getActiveChallengeIds } from '@/features/challenges/activeChallengeIds';
import { getStudentModulesWithTopics } from '@/features/curriculum/queries';
import { getQuestMapData } from '@/features/quiz/questMapQueries';

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

  const { data: meetings, error: meetingError } = await (db
    .from('meetings')
    .select('id')
    .eq('teacher_id', teacherId) as unknown as Promise<{
      data: Array<{ id: number }> | null;
      error: { message: string } | null;
    }>);
  if (meetingError || !meetings?.length) return false;

  const { data: meetingAssignment, error: meetingStudentError } = await (db
    .from('meeting_students')
    .select('student_id')
    .eq('student_id', studentId)
    .in('meeting_id', meetings.map((meeting) => meeting.id))
    .limit(1) as unknown as Promise<{
      data: Array<{ student_id: string }> | null;
      error: { message: string } | null;
    }>);
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

  // Server-side assignment check: a student cannot submit against an arbitrary
  // challenge ID from a module they are not actively enrolled in.
  const { data: challenge, error: challengeError } = await (db
    .from('challenges')
    .select('id, topic_id')
    .eq('id', challenge_id)
    .maybeSingle() as unknown as Promise<{
      data: { id: number; topic_id: number } | null;
      error: { message: string } | null;
    }>);
  if (challengeError || !challenge) {
    return { success: false, error: 'Challenge tidak ditemukan.' };
  }

  const { data: topic, error: topicError } = await (db
    .from('topics')
    .select('id, module_id, status, lesson_content')
    .eq('id', challenge.topic_id)
    .maybeSingle() as unknown as Promise<{
      data: { id: number; module_id: number; status: string; lesson_content: unknown } | null;
      error: { message: string } | null;
    }>);
  if (topicError || !topic || topic.status !== 'published') {
    return { success: false, error: 'Topik challenge tidak tersedia.' };
  }

  const activeChallengeIds = getActiveChallengeIds(topic.lesson_content);
  if (activeChallengeIds !== undefined && !activeChallengeIds.includes(challenge_id)) {
    return { success: false, error: 'Challenge ini sudah tidak aktif.' };
  }

  const { data: enrollment, error: enrollmentError } = await (db
    .from('student_modules')
    .select('module_id')
    .eq('student_id', studentId)
    .eq('module_id', topic.module_id)
    .eq('status', 'active')
    .maybeSingle() as unknown as Promise<{
      data: { module_id: number } | null;
      error: { message: string } | null;
    }>);
  if (enrollmentError || !enrollment) {
    return { success: false, error: 'Kamu belum terdaftar aktif pada modul challenge ini.' };
  }

  // Enforce scheduled topic access server-side so a guessed challenge ID
  // cannot bypass the meeting start gate.
  const enrolledModules = await getStudentModulesWithTopics(studentId);
  const enrolledModule = enrolledModules.find((item) => item.id === topic.module_id);
  const questProgress = enrolledModule
    ? await getQuestMapData(studentId, enrolledModule)
    : null;
  const topicNode = questProgress?.nodes.find((node) => node.topic.id === topic.id);
  if (!topicNode || !topicNode.isUnlocked) {
    return { success: false, error: 'Challenge akan terbuka saat sesi topik ini dimulai.' };
  }

  // Check whether an active (non-approved) submission already exists
  const { data: existing, error: existingError } = await (db
    .from('challenge_submissions')
    .select('id, status')
    .eq('challenge_id', challenge_id)
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false })
    .limit(1) as unknown as Promise<{
      data: Array<{ id: number; status: string }> | null;
      error: { message: string } | null;
    }>);

  if (existingError) {
    console.error('[submitChallenge] previous submission lookup failed', existingError.message);
    return { success: false, error: 'Gagal memeriksa submission sebelumnya. Coba lagi.' };
  }

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
    .single() as unknown as Promise<{
      data: { id: number } | null;
      error: { code?: string; message: string } | null;
    }>);

  if (error?.code === '23505') {
    // PostgREST only tells us that some unique constraint failed. Confirm the
    // pending pair before presenting the duplicate-pending response.
    const { data: pendingSubmission, error: pendingLookupError } = await (db
      .from('challenge_submissions')
      .select('id')
      .eq('challenge_id', challenge_id)
      .eq('student_id', studentId)
      .eq('status', 'pending')
      .maybeSingle() as unknown as Promise<{
        data: { id: number } | null;
        error: { message: string } | null;
      }>);

    if (pendingLookupError) {
      console.error('[submitChallenge] pending-conflict lookup failed', pendingLookupError.message);
      return { success: false, error: 'Gagal menyimpan submission. Coba lagi.' };
    }
    if (pendingSubmission) {
      return { success: false, error: 'Kamu sudah punya submission yang sedang ditinjau. Tunggu hasilnya dulu.' };
    }
    return { success: false, error: 'Gagal menyimpan submission. Coba lagi.' };
  }
  if (error) return { success: false, error: 'Gagal menyimpan submission. Coba lagi.' };
  if (!data) return { success: false, error: 'Submission tidak tersimpan. Coba lagi.' };

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
    .select('id, student_id, status')
    .eq('id', submission_id)
    .maybeSingle() as unknown as Promise<{ data: { id: number; student_id: string; status: string } | null; error: { message: string } | null }>);
  if (targetError || !targetSubmission) {
    return { success: false, error: 'Submission tidak ditemukan.' };
  }
  if (targetSubmission.status === 'approved') {
    return { success: false, error: 'Submission ini sudah disetujui sebelumnya.' };
  }
  const isAssigned = await isTeacherAssignedToStudent(db, auth.user.id, targetSubmission.student_id);
  if (!isAssigned) {
    return { success: false, error: 'Kamu hanya dapat meninjau submission siswa yang ditugaskan kepadamu.' };
  }

  // Conditional transition prevents concurrent/replayed approvals from awarding twice.
  const { data: updatedSubmission, error } = await (db
    .from('challenge_submissions')
    .update({
      status,
      review_note:  review_note ?? null,
      reviewed_by:  auth.user.id,
      reviewed_at:  new Date().toISOString(),
    } as never)
    .eq('id', submission_id)
    .in('status', ['pending', 'needs_revision'])
    .select('id')
    .maybeSingle() as unknown as Promise<{
      data: { id: number } | null;
      error: { message: string } | null;
    }>);

  if (error) return { success: false, error: error.message };
  if (!updatedSubmission) {
    return { success: false, error: 'Submission sudah ditinjau oleh permintaan lain. Muat ulang halaman.' };
  }

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

  // Only transition reviewable submissions; concurrent approvals won't earn duplicate rewards.
  const { data: approvedRows, error } = await (db
    .from('challenge_submissions')
    .update({
      status: 'approved',
      reviewed_by: auth.user.id,
      reviewed_at: new Date().toISOString(),
    } as never)
    .in('id', validIds)
    .in('status', ['pending', 'needs_revision'])
    .select('id, student_id') as unknown as Promise<{
      data: Array<{ id: number; student_id: string }> | null;
      error: { message: string } | null;
    }>);

  if (error) return { success: false, error: error.message };
  if (!approvedRows?.length) {
    return { success: false, error: 'Tidak ada submission baru yang dapat disetujui.' };
  }

  // Award only rows this request actually transitioned to approved.
  for (const s of approvedRows) {
    if (s.student_id) {
      awardRewardEvent(s.student_id, 'CHALLENGE_APPROVED').catch((err) => {
        console.error('[bulkApproveSubmissions] reward error:', err);
      });
    }
  }

  revalidatePath('/teacher/submissions', 'layout');
  revalidatePath('/student/lessons', 'layout');

  return {
    success: true,
    message: `${approvedRows.length} submission berhasil disetujui!`,
  };
}



