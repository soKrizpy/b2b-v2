// src/app/student/achievements/page.tsx
// Dedicated student tab for Achievement Badges, Module Targets, and Learning Progress.
// Situated in the student navigation between Quest Map (/student/lessons) and Parent Hub (/student/parent-hub).

import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getStudentGamificationData } from '@/features/pet/lib/petQueries';
import { getStudentCertificates } from '@/features/certificates/queries';
import { getStudentModulesWithTopics, getStudentCompletedTopics, getPublishedTopicCountsByModules } from '@/features/curriculum/queries';
import { StudentAchievementsShell } from './StudentAchievementsShell';

export const metadata: Metadata = {
  title: 'Lencana & Target Modul — Bits2Bytes',
  description: 'Galeri lencana pencapaian, sertifikat kelulusan, grafik progres belajar, dan target mingguan siswa di Bits2Bytes LMS.',
};

export const dynamic = 'force-dynamic';

export default async function StudentAchievementsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const studentName: string =
    user.user_metadata?.full_name?.split(' ')[0] ?? 'Petualang';

  const [gamData, certificates, allModules, completedTopics] = await Promise.all([
    getStudentGamificationData(user.id),
    getStudentCertificates(user.id),
    getStudentModulesWithTopics(user.id),
    getStudentCompletedTopics(user.id),
  ]);

  // Fetch full published topic counts independently of enrollment status so that
  // the mastery percentage denominator stays accurate even when modules are paused
  // (paused modules only return completed topics in allModules, which would inflate the %).
  const moduleTopicCounts = await getPublishedTopicCountsByModules(allModules.map((m) => m.id));

  return (
    <StudentAchievementsShell
      studentName={studentName}
      gamData={gamData}
      certificates={certificates}
      completedTopics={completedTopics}
      allModules={allModules}
      moduleTopicCounts={moduleTopicCounts}
    />
  );
}
