// src/app/teacher/students/page.tsx
// "Siswa Saya" — list of mentored students for the logged-in teacher.
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getStudentsForTeacher } from '@/features/users/queries';
import { TeacherStudentsList } from '@/features/teacher/students/TeacherStudentsList';

export const metadata: Metadata = { title: 'Siswa Saya — Bits2Bytes' };
export const dynamic = 'force-dynamic';

export default async function TeacherStudentsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const students = await getStudentsForTeacher(user.id);

  return <TeacherStudentsList students={students} />;
}
