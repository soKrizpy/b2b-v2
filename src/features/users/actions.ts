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
// Atomically sets one module as 'active' for a student and pauses all others.
// Creates the student_modules row if it doesn't exist yet.

export type SetModuleResult =
  | { success: true;  message: string }
  | { success: false; error: string; partialSuccess?: boolean };

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

  // 1. Set ALL existing enrollments for this student to 'paused'
  const { error: pauseErr } = await (db
    .from('student_modules')
    .update({ status: 'paused' } as never)
    .eq('student_id', studentId) as unknown as Promise<{ error: { message: string } | null }>);

  if (pauseErr) {
    return { success: false, error: `Gagal menonaktifkan modul lain: ${pauseErr.message}` };
  }

  // 2. Upsert the target module as 'active'
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
  return { success: true, message: 'Modul aktif berhasil diubah.' };
}

// ── resetTeacherPassword ──────────────────────────────────────────────────────

export type ResetPasswordResult =
  | { success: true;  message: string }
  | { success: false; error: string; partialSuccess?: boolean };

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
 * Enrolls a teacher as the student's long-term mentor.
 * This relation is independent from scheduled class assignments.
 */
export async function enrollTeacherToStudent(
  studentId: string,
  teacherId: string
): Promise<EnrollActionResult> {
  const auth = await requireAdminOrTeacher();
  if (!auth.ok) return { success: false, error: auth.message };

  if (auth.role === 'teacher' && auth.user.id !== teacherId) {
    return { success: false, error: 'Guru hanya dapat mendaftarkan siswa ke bimbingannya sendiri.' };
  }

  const sId = studentId?.trim();
  const tId = teacherId?.trim();
  if (!sId || !tId) return { success: false, error: 'Siswa dan guru wajib dipilih.' };

  const db = createSupabaseAdminClient();
  const [{ data: student, error: studentError }, { data: teacherProfile, error: teacherError }] = await Promise.all([
    db.from('students').select('id, full_name').eq('id', sId).maybeSingle() as unknown as Promise<{
      data: { id: string; full_name: string } | null;
      error: { message: string } | null;
    }>,
    db.from('profiles').select('id, full_name, role').eq('id', tId).eq('role', 'teacher').maybeSingle() as unknown as Promise<{
      data: { id: string; full_name: string | null; role: string } | null;
      error: { message: string } | null;
    }>,
  ]);

  if (studentError) return { success: false, error: `Gagal memeriksa siswa: ${studentError.message}` };
  if (teacherError) return { success: false, error: `Gagal memeriksa guru: ${teacherError.message}` };
  if (!student) return { success: false, error: 'Data siswa tidak ditemukan.' };
  if (!teacherProfile) return { success: false, error: 'Data guru tidak ditemukan.' };

  const { error: enrollmentError } = await (db
    .from('teacher_students')
    .upsert(
      { teacher_id: tId, student_id: sId } as never,
      { onConflict: 'teacher_id,student_id' }
    ) as unknown as Promise<{ error: { message: string } | null }>);

  if (enrollmentError) {
    return { success: false, error: `Gagal menyimpan relasi bimbingan: ${enrollmentError.message}` };
  }

  revalidateAll();
  revalidatePath('/teacher/dashboard', 'layout');
  revalidatePath('/teacher/students', 'layout');

  return {
    success: true,
    message: `Berhasil mendaftarkan ${student.full_name} sebagai siswa bimbingan ${teacherProfile.full_name ?? 'guru'}.`,
  };
}

/**
 * Removes only the long-term mentorship relation.
 * Scheduled classes and completed meeting history are left unchanged.
 */
export async function unenrollTeacherFromStudent(
  studentId: string,
  teacherId: string
): Promise<EnrollActionResult> {
  const auth = await requireAdminOrTeacher();
  if (!auth.ok) return { success: false, error: auth.message };

  if (auth.role === 'teacher' && auth.user.id !== teacherId) {
    return { success: false, error: 'Guru hanya dapat membatalkan siswa dari bimbingannya sendiri.' };
  }

  const sId = studentId?.trim();
  const tId = teacherId?.trim();
  if (!sId || !tId) return { success: false, error: 'Siswa dan guru wajib ditentukan.' };

  const db = createSupabaseAdminClient();
  const { error } = await (db
    .from('teacher_students')
    .delete()
    .eq('teacher_id', tId)
    .eq('student_id', sId) as unknown as Promise<{ error: { message: string } | null }>);

  if (error) {
    return { success: false, error: `Gagal menghapus relasi bimbingan: ${error.message}` };
  }

  revalidateAll();
  revalidatePath('/teacher/dashboard', 'layout');
  revalidatePath('/teacher/students', 'layout');

  return {
    success: true,
    message: 'Relasi guru dan siswa bimbingan berhasil dihapus. Jadwal dan riwayat kelas tetap utuh.',
  };
}

/**
 * Bulk enrolls multiple students and reports partial failures accurately.
 */
export async function enrollStudentsToTeacher(
  teacherId: string,
  studentIds: string[]
): Promise<EnrollActionResult> {
  const auth = await requireAdminOrTeacher();
  if (!auth.ok) return { success: false, error: auth.message };

  if (auth.role === 'teacher' && auth.user.id !== teacherId) {
    return { success: false, error: 'Guru hanya dapat mendaftarkan siswa ke bimbingannya sendiri.' };
  }

  const tId = teacherId?.trim();
  if (!tId) return { success: false, error: 'Guru wajib dipilih.' };
  if (!studentIds || studentIds.length === 0) {
    return { success: false, error: 'Pilih minimal satu siswa untuk di-enroll.' };
  }

  const results = await Promise.all(studentIds.map((sId) => enrollTeacherToStudent(sId, tId)));
  const failedCount = results.filter((result) => !result.success).length;
  if (failedCount > 0) {
    const failures = results
      .map((result, index) => result.success ? null : `${studentIds[index]}: ${result.error}`)
      .filter((failure): failure is string => Boolean(failure));
    const successCount = results.length - failedCount;
    return {
      success: false,
      error: `Berhasil: ${successCount}; gagal: ${failedCount}. Detail: ${failures.join(' | ')}`,
      partialSuccess: successCount > 0,
    };
  }

  return {
    success: true,
    message: `Berhasil mendaftarkan ${studentIds.length} siswa sebagai siswa bimbingan.`,
  };
}

