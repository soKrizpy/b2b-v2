// src/app/student/assessment/[moduleId]/page.tsx
// Final module tryout — 20 questions, countdown timer, certificate award.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { extractFinalAssessment } from '@/features/curriculum/validation';
import { getCertificateByModuleAndStudent, TIER_CONFIG } from '@/features/certificates/queries';
import { TryoutClient } from './TryoutClient';

export const metadata: Metadata = { title: 'Tryout Akhir — Bits2Bytes' };
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ moduleId: string }> };

export default async function AssessmentPage({ params }: Props) {
  const { moduleId } = await params;
  const id = Number(moduleId);
  if (!id) notFound();

  const auth = await getAuthUser();
  if (!auth.ok) redirect('/login');
  if (auth.role !== 'student') redirect('/');

  const db = createSupabaseAdminClient();
  const { data: enrollment, error: enrollmentError } = await (db
    .from('student_modules')
    .select('module_id')
    .eq('student_id', auth.user.id)
    .eq('module_id', id)
    .eq('status', 'active')
    .maybeSingle() as unknown as Promise<{
      data: { module_id: number } | null;
      error: { message: string } | null;
    }>);
  if (enrollmentError || !enrollment) notFound();

  const [{ data: moduleRow }, existingCert] = await Promise.all([
    db
      .from('modules')
      .select('id, title, description')
      .eq('id', id)
      .maybeSingle() as unknown as Promise<{
        data: { id: number; title: string | null; description: string | null } | null;
        error: unknown;
      }>,
    getCertificateByModuleAndStudent(auth.user.id, id),
  ]);

  if (!moduleRow) notFound();

  const assessment = extractFinalAssessment(moduleRow.description);
  if (!assessment) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <p className="text-4xl">📭</p>
        <p className="font-bold text-slate-800 dark:text-white">
          Modul ini belum memiliki soal tryout.
        </p>
        <Link href="/student/lessons"
          className="inline-block px-4 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600">
          Kembali
        </Link>
      </div>
    );
  }

  // If already certified, show existing certificate
  if (existingCert) {
    const cfg = TIER_CONFIG[existingCert.tier as keyof typeof TIER_CONFIG];
    return (
      <div className="max-w-xl mx-auto py-16 text-center flex flex-col items-center gap-5">
        <span className="text-7xl">{cfg.medal}</span>
        <div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {cfg.label} Certificate
          </p>
          <p className="text-3xl font-black tabular-nums mt-1">{existingCert.score}/100</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-1">
            #{existingCert.certificate_number}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {cfg.description}
          </p>
        </div>
        <Link href="/student/lessons"
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700">
          Kembali ke Pelajaran
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link href="/student/lessons"
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white">
            ← Kembali
          </Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {assessment.title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {moduleRow.title} · {assessment.questions.length} soal · {assessment.duration_minutes} menit
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['excellent', 'achievement', 'completion'] as const).map((tier) => {
            const cfg = TIER_CONFIG[tier];
            return (
              <div key={tier}
                className={`text-xs px-3 py-1.5 rounded-full ring-1 font-semibold ${cfg.bg} ${cfg.color} ${cfg.ring}`}>
                {cfg.medal} {cfg.label}: {tier === 'excellent' ? '≥85' : tier === 'achievement' ? '≥75' : '<75'}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tryout */}
      <TryoutClient moduleId={id} assessment={assessment} />
    </div>
  );
}
