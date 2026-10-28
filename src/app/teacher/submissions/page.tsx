// src/app/teacher/submissions/page.tsx
// Teacher: review student challenge submissions.
import type { Metadata } from 'next';
import { getAllSubmissions } from '@/features/challenges/queries';
import { requireRole } from '@/lib/auth';
import { TeacherSubmissionsClient } from './TeacherSubmissionsClient';

export const metadata: Metadata = { title: 'Review Submissions — Bits2Bytes' };
export const dynamic = 'force-dynamic';

export default async function TeacherSubmissionsPage() {
  const auth = await requireRole('teacher');
  if (!auth.ok) return null;
  const submissions = await getAllSubmissions(auth.user.id);

  return <TeacherSubmissionsClient submissions={submissions} />;
}

