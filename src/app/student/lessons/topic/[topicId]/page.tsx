// src/app/student/lessons/topic/[topicId]/page.tsx
// Student topic viewer: content, challenges, and 2-attempt quiz engine.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { getTopicById } from '@/features/curriculum/queries';
import { getChallengesWithSubmissions } from '@/features/challenges/queries';
import { getTopicQuizState } from '@/features/quiz/queries';
import { SubmitChallengeForm } from '@/features/challenges/components/SubmitChallengeForm';
import { TopicQuizWidget } from '@/features/quiz/components/TopicQuizWidget';
import { LessonNodeWalker, type LearningNode } from '@/features/curriculum/components/LessonNodeWalker';

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

  const user = await getSessionUser();
  if (!user) redirect('/login');

  const [topic, challenges, quizState] = await Promise.all([
    getTopicById(id),
    getChallengesWithSubmissions(id, user.id),
    getTopicQuizState(id, user.id),
  ]);
  if (!topic) notFound();

  const completedCount  = challenges.filter((c) => c.submission?.status === 'approved').length;
  const progressPercent = challenges.length > 0
    ? Math.round((completedCount / challenges.length) * 100) : 0;

  // Extract learningPath nodes from lesson_content JSONB
  const lc = topic.lesson_content as Record<string, unknown> | null;
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
          <LessonNodeWalker nodes={learningPath} topicId={id} />
        </section>
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
              <div className="px-5 py-4 border-b border-slate-100 dark:border-white/8 flex items-start justify-between gap-3">
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
      {quizState.questions.length > 0 && (
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
