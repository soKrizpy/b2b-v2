// src/app/teacher/students/[id]/page.tsx
// Individual student detail page for teacher — full learning profile.
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getTeacherStudentProfile } from '@/features/users/teacherStudentQueries';
import { getStudentsForTeacher } from '@/features/users/queries';
import { TeacherStudentDetail } from '@/features/teacher/students/TeacherStudentDetail';

export const metadata: Metadata = { title: 'Detail Siswa — Bits2Bytes' };
export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TeacherStudentDetailPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const { id } = await params;

  // Security check: ensure this student belongs to the teacher
  const [profile, mentoredStudents] = await Promise.all([
    getTeacherStudentProfile(id),
    getStudentsForTeacher(user.id),
  ]);

  const isAuthorized = mentoredStudents.some((s) => s.id === id);
  if (!profile || !isAuthorized) notFound();

  return <TeacherStudentDetail student={profile} />;
}
