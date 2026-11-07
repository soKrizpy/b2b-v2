// src/features/users/actions.ts
// Admin Server Actions: create/delete students and teachers.
// Mirrors the proven 3-step flow from the existing bits2bytes-lms:
//   1. auth.admin.createUser  — creates the Supabase Auth user
//   2. INSERT public.profiles — stores the role
//   3. INSERT public.students (or nothing extra for teachers)
//   4. Rollback auth user on any failure
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin, requireAdminOrTeacher } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// ── Return type ───────────────────────────────────────────────────────────────

export type UserActionResult =
  | { success: true;  message: string; userId?: string }
  | { success: false; error: string; fields?: Record<string, string> };

// ── Schemas ───────────────────────────────────────────────────────────────────

// Student: identifies by WhatsApp/phone or email + 6-digit PIN
const createStudentSchema = z.object({
  full_name:      z.string().min(2,  'Nama lengkap minimal 2 karakter').max(100),
  contact:        z.string().min(6,  'Email atau nomor WhatsApp wajib diisi'),
  mpin:           z.string().length(6, 'MPIN harus tepat 6 digit').regex(/^\d{6}$/, 'MPIN harus 6 angka'),
  grade:          z.string().max(20).optional(),
  bio:            z.string().max(500).optional(),
});

// Teacher: identifies by email + regular password
const createTeacherSchema = z.object({
  full_name: z.string().min(2,  'Nama lengkap minimal 2 karakter').max(100),
  email:     z.email('Format email tidak valid'),
  password:  z.string().min(8,  'Password minimal 8 karakter'),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function flatErr(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, msgs] of Object.entries(err.flatten().fieldErrors)) {
    if (Array.isArray(msgs) && msgs.length) out[k] = msgs[0] as string;
  }
  return out;
}

const REVALIDATE = ['/admin/users', '/admin/dashboard'];
function revalidateAll() {
  REVALIDATE.forEach((p) => revalidatePath(p, 'layout'));
}

// ── createStudent ─────────────────────────────────────────────────────────────

export async function createStudent(
  _prev: UserActionResult | null,
  formData: FormData
): Promise<UserActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const raw = {
    full_name: formData.get('full_name'),
    contact:   formData.get('contact'),
    mpin:      formData.get('mpin'),
    grade:     formData.get('grade')  || undefined,
    bio:       formData.get('bio')    || undefined,
  };

  const parsed = createStudentSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: 'Periksa kembali isian formulir.', fields: flatErr(parsed.error) };
  }

  const { full_name, contact, mpin, grade, bio } = parsed.data;

  // Phone numbers get a synthetic email — matches existing production convention
  const email = contact.includes('@')
    ? contact.trim()
    : `${contact.trim()}@student.mylms.app`;

  const db = createSupabaseAdminClient();

  // 1. Create auth user
  const { data: authData, error: authErr } = await db.auth.admin.createUser({
    email,
    password: mpin,
    email_confirm: true,
    user_metadata: { full_name, role: 'student' },
  });

  if (authErr || !authData?.user) {
    const msg = authErr?.message?.includes('already been registered')
      ? 'Kontak ini sudah terdaftar.'
      : (authErr?.message ?? 'Gagal membuat akun.');
    return { success: false, error: msg };
  }

  const userId = authData.user.id;

  // 2. Insert public.profiles
  const { error: profileErr } = await (db
    .from('profiles')
    .insert({ id: userId, role: 'student', full_name, email } as never) as unknown as Promise<{ error: { message: string } | null }>);

  if (profileErr) {
    // Fallback if email column hasn't been migrated yet
    const { error: fallbackErr } = await (db
      .from('profiles')
      .insert({ id: userId, role: 'student', full_name } as never) as unknown as Promise<{ error: { message: string } | null }>);
    if (fallbackErr) {
      await db.auth.admin.deleteUser(userId);
      return { success: false, error: `Profile error: ${fallbackErr.message}` };
    }
  }

  // 3. Insert public.students
  const { error: studentErr } = await (db
    .from('students')
    .insert({
      id:             userId,
      email_or_phone: contact.trim(),
      full_name,
      grade:          grade  ?? null,
      bio:            bio    ?? null,
      mpin,
    } as never) as unknown as Promise<{ error: { message: string } | null }>);

  if (studentErr) {
    await db.auth.admin.deleteUser(userId);
    return { success: false, error: `DB error: ${studentErr.message}` };
  }

  revalidateAll();
  return { success: true, message: `Siswa "${full_name}" berhasil ditambahkan.`, userId };
}

// ── createTeacher ─────────────────────────────────────────────────────────────

export async function createTeacher(
  _prev: UserActionResult | null,
  formData: FormData
): Promise<UserActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const raw = {
    full_name: formData.get('full_name'),
    email:     formData.get('email'),
    password:  formData.get('password'),
  };

  const parsed = createTeacherSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: 'Periksa kembali isian formulir.', fields: flatErr(parsed.error) };
  }

  const { full_name, email, password } = parsed.data;

  const db = createSupabaseAdminClient();

  // 1. Create auth user
  const { data: authData, error: authErr } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: 'teacher' },
  });

  if (authErr || !authData?.user) {
    const msg = authErr?.message?.includes('already been registered')
      ? 'Email ini sudah terdaftar.'
      : (authErr?.message ?? 'Gagal membuat akun.');
    return { success: false, error: msg };
  }

  const userId = authData.user.id;

  // 2. Insert public.profiles (teachers only need profiles — no teachers table)
  const { error: profileErr } = await (db
    .from('profiles')
    .insert({ id: userId, role: 'teacher', full_name, email } as never) as unknown as Promise<{ error: { message: string } | null }>);

  if (profileErr) {
    const { error: fallbackErr } = await (db
      .from('profiles')
      .insert({ id: userId, role: 'teacher', full_name } as never) as unknown as Promise<{ error: { message: string } | null }>);
    if (fallbackErr) {
      await db.auth.admin.deleteUser(userId);
      return { success: false, error: `Profile error: ${fallbackErr.message}` };
    }
  }

  revalidateAll();
  return { success: true, message: `Guru "${full_name}" berhasil ditambahkan.`, userId };
}

// ── deleteUser ────────────────────────────────────────────────────────────────

export async function deleteUser(
  _prev: UserActionResult | null,
  formData: FormData
): Promise<UserActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const userId = formData.get('userId') as string | null;
  const role   = formData.get('role')   as string | null;
  if (!userId) return { success: false, error: 'User ID tidak ditemukan.' };

  const db = createSupabaseAdminClient();

  // Clean up role-specific tables before deleting auth user
  if (role === 'student') {
    await (db.from('student_modules').delete().eq('student_id', userId) as unknown as Promise<unknown>);
    await (db.from('students').delete().eq('id', userId)                as unknown as Promise<unknown>);
  }

  await (db.from('profiles').delete().eq('id', userId) as unknown as Promise<unknown>);

  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) return { success: false, error: error.message };

  revalidateAll();
  return { success: true, message: 'Akun berhasil dihapus.' };
}

// ── setActiveStudentModule ────────────────────────────────────────────────────
// Activates one module for a student without affecting any other enrollment.
// Creates the student_modules row if it doesn't exist yet.

export type SetModuleResult =
  | { success: true;  message: string }
  | { success: false; error: string };

export async function setActiveStudentModule(
  _prev: SetModuleResult | null,
  formData: FormData
): Promise<SetModuleResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const studentId = (formData.get('student_id') as string | null)?.trim();
  const moduleId  = Number(formData.get('module_id'));

  if (!studentId) return { success: false, error: 'student_id wajib diisi.' };
  if (!moduleId || isNaN(moduleId)) return { success: false, error: 'module_id tidak valid.' };

  const db = createSupabaseAdminClient();

  // Upsert the target module as 'active'. Other enrollments are left untouched.
  const { error: upsertErr } = await (db
    .from('student_modules')
    .upsert(
      { student_id: studentId, module_id: moduleId, status: 'active' } as never,
      { onConflict: 'student_id,module_id' }
    ) as unknown as Promise<{ error: { message: string } | null }>);

  if (upsertErr) {
    return { success: false, error: `Gagal mengaktifkan modul: ${upsertErr.message}` };
  }

  revalidatePath('/admin/users', 'layout');
  revalidatePath('/student/lessons', 'layout');
  return { success: true, message: 'Modul berhasil diaktifkan.' };
}

// ── pauseStudentModule ────────────────────────────────────────────────────────
// Independently pauses one module for a student without affecting any other enrollment.
// Creates the student_modules row if it doesn't exist yet.

export async function pauseStudentModule(
  _prev: SetModuleResult | null,
  formData: FormData
): Promise<SetModuleResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const studentId = (formData.get('student_id') as string | null)?.trim();
  const moduleId  = Number(formData.get('module_id'));

  if (!studentId) return { success: false, error: 'student_id wajib diisi.' };
  if (!moduleId || isNaN(moduleId)) return { success: false, error: 'module_id tidak valid.' };

  const db = createSupabaseAdminClient();

  const { error: upsertErr } = await (db
    .from('student_modules')
    .upsert(
      { student_id: studentId, module_id: moduleId, status: 'paused' } as never,
      { onConflict: 'student_id,module_id' }
    ) as unknown as Promise<{ error: { message: string } | null }>);

  if (upsertErr) {
    return { success: false, error: `Gagal menjeda modul: ${upsertErr.message}` };
  }

  revalidatePath('/admin/users', 'layout');
  revalidatePath('/student/lessons', 'layout');
  return { success: true, message: 'Modul berhasil dijeda.' };
}

// ── resetTeacherPassword ──────────────────────────────────────────────────────

export type ResetPasswordResult =
  | { success: true;  message: string }
  | { success: false; error: string };

export async function resetTeacherPassword(
  _prev: ResetPasswordResult | null,
  formData: FormData,
): Promise<ResetPasswordResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const userId      = (formData.get('teacher_id') as string | null)?.trim();
  const newPassword = (formData.get('new_password') as string | null)?.trim();

  if (!userId)      return { success: false, error: 'Teacher ID tidak ditemukan.' };
  if (!newPassword || newPassword.length < 8)
    return { success: false, error: 'Password baru minimal 8 karakter.' };

  const db = createSupabaseAdminClient();
  const { error } = await db.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) return { success: false, error: error.message };

  return { success: true, message: 'Password berhasil diperbarui.' };
}

// ── Teacher-Student Enrollment Actions ─────────────────────────────────────────

export type EnrollActionResult =
  | { success: true;  message: string }
  | { success: false; error: string };

/**
 * Enrolls a teacher to a student.
 * Links all existing meetings of the student to the teacher.
 * If no meeting exists, creates a dedicated mentorship class meeting.
 */
export async function enrollTeacherToStudent(
  studentId: string,
  teacherId: string
): Promise<EnrollActionResult> {
  const auth = await requireAdminOrTeacher();
  if (!auth.ok) return { success: false, error: auth.message };

  if (auth.role === 'teacher' && auth.user.id !== teacherId) {
    return { success: false, error: 'Guru hanya dapat mendaftarkan siswa ke kelasnya sendiri.' };
  }

  const sId = studentId?.trim();
  const tId = teacherId?.trim();
  if (!sId || !tId) return { success: false, error: 'Siswa dan guru wajib dipilih.' };

  const db = createSupabaseAdminClient();

  const [{ data: student }, { data: teacherProfile }] = await Promise.all([
    db.from('students').select('id, full_name').eq('id', sId).maybeSingle() as unknown as Promise<{
      data: { id: string; full_name: string } | null;
    }>,
    db.from('profiles').select('id, full_name, role').eq('id', tId).eq('role', 'teacher').maybeSingle() as unknown as Promise<{
      data: { id: string; full_name: string | null; role: string } | null;
    }>,
  ]);

  if (!student) return { success: false, error: 'Data siswa tidak ditemukan.' };
  if (!teacherProfile) return { success: false, error: 'Data guru tidak ditemukan.' };

  const teacherName = teacherProfile.full_name ?? 'Guru';

  // 0. Direct mentorship record in teacher_students table
  try {
    await (db
      .from('teacher_students')
      .upsert(
        { teacher_id: tId, student_id: sId } as never,
        { onConflict: 'teacher_id,student_id' }
      ) as unknown as Promise<unknown>);
  } catch {
    // Non-fatal if table not migrated yet
  }

  // 1. Fetch meeting IDs where student is a member
  const { data: studentMeetings } = await (db
    .from('meeting_students')
    .select('meeting_id')
    .eq('student_id', sId) as unknown as Promise<{
      data: Array<{ meeting_id: number }> | null;
    }>);

  const meetingIds = (studentMeetings ?? []).map((m) => m.meeting_id);

  if (meetingIds.length > 0) {
    // Assign teacher to all student meetings
    await (db
      .from('meetings')
      .update({ teacher_id: tId } as never)
      .in('id', meetingIds) as unknown as Promise<unknown>);
  }

  // 2. Ensure at least one active meeting exists linking teacher and student
  const { data: directMeetings } = await (db
    .from('meetings')
    .select('id, meeting_students!inner(student_id)')
    .eq('teacher_id', tId)
    .eq('meeting_students.student_id', sId)
    .limit(1) as unknown as Promise<{ data: unknown[] | null }>);

  if (!directMeetings || directMeetings.length === 0) {
    const meetingDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: newMeeting } = await (db
      .from('meetings')
      .insert({
        title: `Kelas Bimbingan: ${teacherName} - ${student.full_name}`,
        teacher_id: tId,
        meeting_date: meetingDate,
        link_url: 'https://meet.google.com',
        session_count: 1,
        session_number: 1,
        is_completed: false,
      } as never)
      .select('id')
      .single() as unknown as Promise<{ data: { id: number } | null }>);

    if (newMeeting) {
      await (db.from('meeting_students').insert({
        meeting_id: newMeeting.id,
        student_id: sId,
        has_joined: false,
      } as never) as unknown as Promise<unknown>);
    }
  }

  revalidateAll();
  revalidatePath('/admin/sessions', 'layout');
  revalidatePath('/teacher/dashboard', 'layout');
  revalidatePath('/student/dashboard', 'layout');

  return {
    success: true,
    message: `Berhasil mendaftarkan guru ${teacherName} ke siswa ${student.full_name}! 🎉`,
  };
}

/**
 * Unenrolls a teacher from a student by unlinking meetings where teacher_id matches.
 */
export async function unenrollTeacherFromStudent(
  studentId: string,
  teacherId: string
): Promise<EnrollActionResult> {
  const auth = await requireAdminOrTeacher();
  if (!auth.ok) return { success: false, error: auth.message };

  if (auth.role === 'teacher' && auth.user.id !== teacherId) {
    return { success: false, error: 'Guru hanya dapat membatalkan siswa dari kelasnya sendiri.' };
  }

  const sId = studentId?.trim();
  const tId = teacherId?.trim();
  if (!sId || !tId) return { success: false, error: 'Siswa dan guru wajib ditentukan.' };

  const db = createSupabaseAdminClient();

  // 0. Remove from teacher_students table
  try {
    await (db
      .from('teacher_students')
      .delete()
      .eq('teacher_id', tId)
      .eq('student_id', sId) as unknown as Promise<unknown>);
  } catch {
    // Non-fatal if table not migrated yet
  }

  const { data: studentMeetings } = await (db
    .from('meeting_students')
    .select('meeting_id')
    .eq('student_id', sId) as unknown as Promise<{
      data: Array<{ meeting_id: number }> | null;
    }>);

  const meetingIds = (studentMeetings ?? []).map((m) => m.meeting_id);
  if (meetingIds.length > 0) {
    await (db
      .from('meetings')
      .update({ teacher_id: null } as never)
      .in('id', meetingIds)
      .eq('teacher_id', tId) as unknown as Promise<unknown>);
  }

  revalidateAll();
  revalidatePath('/admin/sessions', 'layout');
  revalidatePath('/teacher/dashboard', 'layout');
  revalidatePath('/student/dashboard', 'layout');

  return {
    success: true,
    message: 'Berhasil membatalkan enroll guru dari siswa.',
  };
}

/**
 * Bulk enrolls multiple students to a teacher.
 */
export async function enrollStudentsToTeacher(
  teacherId: string,
  studentIds: string[]
): Promise<EnrollActionResult> {
  const auth = await requireAdminOrTeacher();
  if (!auth.ok) return { success: false, error: auth.message };

  if (auth.role === 'teacher' && auth.user.id !== teacherId) {
    return { success: false, error: 'Guru hanya dapat mendaftarkan siswa ke kelasnya sendiri.' };
  }

  const tId = teacherId?.trim();
  if (!tId) return { success: false, error: 'Guru wajib dipilih.' };
  if (!studentIds || studentIds.length === 0) {
    return { success: false, error: 'Pilih minimal satu siswa untuk di-enroll.' };
  }

  for (const sId of studentIds) {
    await enrollTeacherToStudent(sId, tId);
  }

  return {
    success: true,
    message: `Berhasil mendaftarkan ${studentIds.length} siswa ke guru terpilih! 🎉`,
  };
}



// ── Admin exam unlock & manual certificate ────────────────────────────────────

export type AdminExamActionResult =
  | { success: true; message: string; certificateNumber?: string }
  | { success: false; error: string };

const adminExamSchema = z.object({
  student_id: z.string().uuid(),
  module_id: z.coerce.number().int().positive(),
  reason: z.string().trim().max(500).optional(),
});

export async function setStudentAssessmentUnlock(
  studentId: string,
  moduleId: number,
  unlocked: boolean,
  reason = 'Dibuka manual oleh admin',
): Promise<AdminExamActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const parsed = adminExamSchema.safeParse({
    student_id: studentId,
    module_id: moduleId,
    reason,
  });
  if (!parsed.success) return { success: false, error: 'Siswa atau modul tidak valid.' };

  const db = createSupabaseAdminClient();
  const [{ data: student }, { data: enrollment }] = await Promise.all([
    db.from('students').select('id').eq('id', parsed.data.student_id).maybeSingle(),
    db.from('student_modules').select('module_id')
      .eq('student_id', parsed.data.student_id)
      .eq('module_id', parsed.data.module_id)
      .eq('status', 'active')
      .maybeSingle(),
  ]);

  if (!student) return { success: false, error: 'Data siswa tidak ditemukan.' };
  if (unlocked && !enrollment) {
    return { success: false, error: 'Aktifkan modul siswa terlebih dahulu sebelum membuka ujian.' };
  }

  const unlockDb = db as unknown as {
    from: (table: string) => {
      upsert: (values: unknown, options: unknown) => Promise<{ error: { message: string } | null }>;
      delete: () => { eq: (column: string, value: unknown) => { eq: (column: string, value: unknown) => Promise<{ error: { message: string } | null }> } };
    };
  };

  if (unlocked) {
    const { error } = await unlockDb.from('student_assessment_unlocks').upsert({
      student_id: parsed.data.student_id,
      module_id: parsed.data.module_id,
      unlocked_by: auth.user.id,
      reason: parsed.data.reason || 'Dibuka manual oleh admin',
    }, { onConflict: 'student_id,module_id' });
    if (error) return { success: false, error: `Gagal membuka ujian: ${error.message}` };
  } else {
    const { error } = await unlockDb.from('student_assessment_unlocks')
      .delete().eq('student_id', parsed.data.student_id).eq('module_id', parsed.data.module_id);
    if (error) return { success: false, error: `Gagal mencabut unlock: ${error.message}` };
  }

  revalidatePath('/admin/users', 'layout');
  revalidatePath('/student/lessons', 'layout');
  revalidatePath('/student/dashboard', 'layout');
  return {
    success: true,
    message: unlocked ? 'Ujian akhir berhasil dibuka untuk siswa ini.' : 'Unlock ujian berhasil dicabut.',
  };
}

const manualCertificateSchema = z.object({
  student_id: z.string().uuid(),
  module_id: z.coerce.number().int().positive(),
  score: z.coerce.number().int().min(0).max(100),
  admin_note: z.string().trim().min(5, 'Catatan minimal 5 karakter').max(500),
});

export async function issueManualStudentCertificate(
  studentId: string,
  moduleId: number,
  score: number,
  adminNote: string,
): Promise<AdminExamActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.message };

  const parsed = manualCertificateSchema.safeParse({
    student_id: studentId,
    module_id: moduleId,
    score,
    admin_note: adminNote,
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Data sertifikat tidak valid.' };
  }

  const db = createSupabaseAdminClient();
  const [{ data: student }, { data: moduleRow }, { data: existing }] = await Promise.all([
    db.from('students').select('id').eq('id', parsed.data.student_id).maybeSingle(),
    db.from('modules').select('id').eq('id', parsed.data.module_id).maybeSingle(),
    db.from('certificates').select('id')
      .eq('student_id', parsed.data.student_id)
      .eq('module_id', parsed.data.module_id)
      .maybeSingle(),
  ]);

  if (!student) return { success: false, error: 'Data siswa tidak ditemukan.' };
  if (!moduleRow) return { success: false, error: 'Modul tidak ditemukan.' };
  if (existing) return { success: false, error: 'Siswa sudah memiliki sertifikat untuk modul ini.' };

  const tier = parsed.data.score >= 86
    ? 'excellent'
    : parsed.data.score >= 75
      ? 'achievement'
      : 'completion';
  const now = new Date();
  const prefix = `B2B-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-M`;
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 4).toUpperCase();
  const certificateNumber = `${prefix}-${suffix}`;

  const certificateDb = db as unknown as {
    from: (table: string) => {
      insert: (values: unknown) => Promise<{ error: { message: string } | null }>;
    };
  };
  const { error } = await certificateDb.from('certificates').insert({
    student_id: parsed.data.student_id,
    module_id: parsed.data.module_id,
    score: parsed.data.score,
    tier,
    certificate_number: certificateNumber,
    issue_source: 'manual',
    issued_by: auth.user.id,
    admin_note: parsed.data.admin_note,
  });

  if (error) {
    return { success: false, error: error.code === '23505'
      ? 'Sertifikat untuk siswa dan modul ini sudah pernah diterbitkan.'
      : `Gagal menerbitkan sertifikat: ${error.message}` };
  }

  revalidatePath('/admin/users', 'layout');
  revalidatePath('/student/dashboard', 'layout');
  revalidatePath('/student/lessons', 'layout');
  return {
    success: true,
    certificateNumber,
    message: `Sertifikat manual berhasil diterbitkan (${certificateNumber}).`,
  };
}
