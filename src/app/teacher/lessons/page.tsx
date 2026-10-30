import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Materi Pertemuan — Bits2Bytes' };
export const dynamic = 'force-dynamic';

/**
 * Keep the legacy guide URL schedule-first: teachers and admins should open
 * the relevant meeting from their own dashboard instead of browsing the
 * entire curriculum catalogue.
 */
export default async function TeacherLessonsPage() {
  const auth = await getAuthUser();
  if (!auth.ok) redirect('/login');
  if (auth.role === 'admin') redirect('/admin/dashboard');
  if (auth.role === 'teacher') redirect('/teacher/dashboard');
  redirect('/');
}
