// src/app/student/lessons/topic/[topicId]/page.tsx
// Student topic viewer: content, challenges, and 2-attempt quiz engine.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getStudentModulesWithTopics, getTopicById } from '@/features/curriculum/queries';
import { getChallengesWithSubmissions } from '@/features/challenges/queries';
import { getActiveChallengeIds } from '@/features/challenges/activeChallengeIds';
import { getTopicQuizState } from '@/features/quiz/queries';
import { getQuestMapData } from '@/features/quiz/questMapQueries';
import { SubmitChallengeForm } from '@/features/challenges/components/SubmitChallengeForm';
import { TopicQuizWidget } from '@/features/quiz/components/TopicQuizWidget';
import { LessonNodeWalker, type LearningNode } from '@/features/curriculum/components/LessonNodeWalker';
import { getInstructionalSlides, hasAuthoredLessonContent, isWithinSuggestedLessonSlideRange } from '@/features/curriculum/lessonSlides';

export const metadata: Metadata = { title: 'Topik — Bits2Bytes' };
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ topicId: string }> };

const STATUS_BADGE: Record<string, string> = {
  pending:        'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  approved:       'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  needs_revision: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};
const STATUS_LABEL: Record<string, string> = {
  pending:        'Menunggu Review',
  approved:       'Disetujui ✓',
  needs_revision: 'Perlu Revisi',
};

export default async function TopicPage({ params }: Props) {
  const { topicId } = await params;
  const id = Number(topicId);
  if (!id) notFound();

  const auth = await getAuthUser();
  if (!auth.ok) redirect('/login');
  if (auth.role !== 'student') redirect('/');

  const topic = await getTopicById(id);
  if (!topic || topic.status !== 'published') notFound();

  const db = createSupabaseAdminClient();
  const { data: enrollment, error: enrollmentError } = await (db
    .from('student_modules')
    .select('module_id')
    .eq('student_id', auth.user.id)
    .eq('module_id', topic.module_id)
    .eq('status', 'active')
    .maybeSingle() as unknown as Promise<{
      data: { module_id: number } | null;
      error: { message: string } | null;
    }>);
  if (enrollmentError || !enrollment) notFound();

  // The map is not a security boundary: block direct URLs for future locked topics.
  const enrolledModules = await getStudentModulesWithTopics(auth.user.id);
  const enrolledModule = enrolledModules.find((item) => item.id === topic.module_id);
  const questProgress = enrolledModule
    ? await getQuestMapData(auth.user.id, enrolledModule)
    : null;
  const topicNode = questProgress?.nodes.find((node) => node.topic.id === id);
  if (!topicNode || !topicNode.isUnlocked) notFound();

  // Keep the authored slide count visible as guidance without blocking source
  // material that legitimately contains fewer than ten steps.
  const lessonContent = topic.lesson_content as Record<string, unknown> | null;
  const lessonSlides = getInstructionalSlides(lessonContent?.learningPath);
  const lessonHasContent = hasAuthoredLessonContent(lessonSlides);
  const meetsSlideTarget = isWithinSuggestedLessonSlideRange(lessonSlides);
  const activeChallengeIds = getActiveChallengeIds(lessonContent);

  const quizState = await getTopicQuizState(id, auth.user.id, lessonContent);
  const hasQuiz = Array.isArray(lessonContent?.quiz) && lessonContent.quiz.length > 0;
  // Project challenges are available during the active topic session. The topic
  // itself is guarded above by topicNode.isUnlocked; only the quiz waits for report.
  const challenges = lessonHasContent
    ? await getChallengesWithSubmissions(id, auth.user.id, activeChallengeIds)
    : [];

  const completedCount  = challenges.filter((c) => c.submission?.status === 'approved').length;
  const progressPercent = challenges.length > 0
    ? Math.round((completedCount / challenges.length) * 100) : 0;

  // Extract learningPath nodes from lesson_content JSONB
  const lc = lessonContent;
  const learningPath: LearningNode[] = Array.isArray(lc?.learningPath)
    ? (lc!.learningPath as LearningNode[])
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <Link href="/student/lessons"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400
          hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
        ← Kembali ke Quest Map
      </Link>

      {/* Topic header */}
      <div className="bg-white dark:bg-[var(--surface)] rounded-2xl ring-1 ring-slate-200 dark:ring-white/10 px-5 py-5">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{topic.title}</h1>

        {challenges.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>Progress Challenge</span>
              <span>{completedCount}/{challenges.length}</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}

        {topic.description && (
          <div className="mt-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Instruksi</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {topic.description}
            </p>
          </div>
        )}

        {topic.project_link && (
          <a href={topic.project_link} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
            Buka Link Project →
          </a>
        )}
      </div>

      {/* ── Interactive node walker ─────────────────────────────────────── */}
      {learningPath.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-white/10 to-transparent" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 whitespace-nowrap">
              📖 Materi Pembelajaran
            </h2>
            <div className="flex-1 h-px bg-gradient-to-l from-slate-200 dark:from-white/10 to-transparent" />
          </div>
          <LessonNodeWalker nodes={learningPath} topicId={id} studentId={auth.user.id} />
        </section>
      )}

      {!meetsSlideTarget && (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          {lessonHasContent
            ? `Materi memiliki ${lessonSlides.length} slide instruksional. Target 10–20 slide disarankan jika sumber materi mendukung; challenge tetap tersedia setelah materi yang ada dipelajari.`
            : `Materi topik ini belum memiliki slide instruksional (${lessonSlides.length}/10 menuju target). Challenge akan tersedia setelah materi autentik ditambahkan; tidak ada slide pengisi yang dibuat.`}
        </div>
      )}

      {!quizState.isUnlocked && hasQuiz && (
        <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
          <h2 className="text-sm font-bold">🔒 Quiz Topik Terkunci</h2>
          <p className="mt-1 text-sm leading-relaxed">
            Quiz 5 soal pilihan ganda akan terbuka setelah guru atau admin mengirim laporan untuk sesi topik ini, sesi ditandai selesai, dan kehadiranmu tercatat. Proyek challenge tetap dapat dikerjakan selama pertemuan berlangsung.
          </p>
        </div>
      )}

      {/* ── Challenges ──────────────────────────────────────────────────────── */}
      {challenges.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="font-semibold text-slate-800 dark:text-white text-sm">
            Challenges ({challenges.length})
          </h2>
          {challenges.map((ch, idx) => (
            <div key={ch.id}
              className="bg-white dark:bg-[var(--surface)] rounded-2xl ring-1 ring-slate-200 dark:ring-white/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.08] flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white text-sm">{ch.title}</h3>
                    {ch.instructions && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed">
                        {ch.instructions}
                      </p>
                    )}
                  </div>
                </div>
                {ch.submission?.status && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${STATUS_BADGE[ch.submission.status]}`}>
                    {STATUS_LABEL[ch.submission.status]}
                  </span>
                )}
              </div>
              <div className="px-5 py-4">
                <SubmitChallengeForm challenge={ch} existingSubmission={ch.submission} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Quiz (2 attempts, explanations) ─────────────────────────────────── */}
      {quizState.isUnlocked && quizState.questions.length > 0 && (
        <div>
          <h2 className="font-semibold text-slate-800 dark:text-white text-sm mb-3">
            Quiz Topik ({quizState.questions.length} soal)
          </h2>
          <TopicQuizWidget
            topicId={id}
            questions={quizState.questions}
            attempts={quizState.attempts}
            isUnlocked={quizState.isUnlocked}
            isLocked={quizState.isLocked}
            bestScore={quizState.bestScore}
          />
        </div>
      )}
    </div>
  );
}
