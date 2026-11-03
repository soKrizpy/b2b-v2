// src/app/student/lessons/page.tsx
// Materi — topic progression list.
// When questMap flag is enabled, renders the pixel-art QuestMapClient.
// When disabled, renders SimpleTopicList (same progression data, plain UI).
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getStudentModulesWithTopics } from '@/features/curriculum/queries';
import { getQuestMapData } from '@/features/quiz/questMapQueries';
import { isFeatureEnabled } from '@/lib/featureConfig';
import { SimpleTopicList } from '@/app/student/lessons/SimpleTopicList';

export const metadata: Metadata = { title: 'Materi — Bits2Bytes' };
export const dynamic = 'force-dynamic';

type Props = { searchParams?: Promise<{ moduleId?: string }> };

export default async function LessonsPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const resolvedParams = searchParams ? await searchParams : undefined;

  // Core: always fetch modules (needed for both presentations).
  const allModules = await getStudentModulesWithTopics(user.id);

  if (allModules.length === 0) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in-up">
        <LessonsHeader />
        <EmptyState />
      </div>
    );
  }

  // Accessible modules: active always + paused only when they have completed topics
  const accessibleModules = allModules.filter(
    (m) => m.enrollmentStatus === 'active' || m.topics.length > 0
  );

  if (accessibleModules.length === 0) {
    // All enrolled modules are paused with no completed topics
    return (
      <div className="flex flex-col gap-6 animate-fade-in-up">
        <LessonsHeader />
        <EmptyState />
      </div>
    );
  }

  const selectedModId = resolvedParams?.moduleId
    ? Number(resolvedParams.moduleId)
    : accessibleModules[0]?.id;

  const mod = allModules.find((m) => m.id === selectedModId) ?? accessibleModules[0];

  // questMapData is core — used by both presentations AND by topic/assessment
  // pages for unlock checks. Always computed here.
  const questData = await getQuestMapData(user.id, mod);

  const allModulesMeta = allModules.map((m) => ({
    id: m.id,
    title: m.title ?? 'Modul',
    topicCount: m.topics.length,
    enrollmentStatus: m.enrollmentStatus,
  }));
  const accessibleCount = accessibleModules.length;

  // ── Quest Map (pixel-art presentation — flag-gated) ──────────────────────
  if (isFeatureEnabled('questMap')) {
    // Certificates are only needed for the pixel-art map (cert display on nodes).
    let cert: { tier: string; score: number; certificate_number: string } | null = null;
    if (isFeatureEnabled('certificates')) {
      const { getStudentCertificates } = await import('@/features/certificates/queries');
      const certificates = await getStudentCertificates(user.id);
      cert = certificates.find((c) => c.module_id === mod.id) ?? null;
    }

    const { QuestMapClient } = await import('@/app/student/lessons/QuestMapClient');

    return (
      <div className="flex flex-col gap-6 animate-fade-in-up">
        <LessonsHeader isQuestMap />
        <QuestMapClient
          questData={questData}
          cert={cert}
          studentId={user.id}
          allModules={allModulesMeta}
          currentModuleId={mod.id}
          accessibleCount={accessibleCount}
        />
      </div>
    );
  }

  // ── Simple topic list (fallback presentation) ─────────────────────────────
  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <LessonsHeader />
      <SimpleTopicList
        questData={questData}
        allModules={allModulesMeta}
        currentModuleId={mod.id}
        accessibleCount={accessibleCount}
      />
    </div>
  );
}

// ── Static sub-components ─────────────────────────────────────────────────────

function LessonsHeader({ isQuestMap = false }: { isQuestMap?: boolean }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-widest
        text-cyan-600 dark:text-cyan-400 mb-1 flex items-center gap-1.5">
        {isQuestMap ? (
          <><i className="fa-solid fa-map-location-dot text-cyan-400" /> Quest Map</>
        ) : (
          '📖 Materi Belajar'
        )}
      </p>
      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
        {isQuestMap ? 'Perjalanan Belajarmu' : 'Topik & Materi'}
      </h1>
      <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mt-0.5">
        Setiap topik terbuka saat sesi bersama gurumu dimulai.
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed
      border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-16 px-6 text-center shadow-sm">
      <span className="text-6xl select-none">🗺️</span>
      <div>
        <p className="font-black text-slate-800 dark:text-white text-lg">
          Belum ada modul aktif
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto font-medium">
          Gurumu belum mengaktifkan modul untukmu. Petualanganmu segera dimulai!
        </p>
      </div>
    </div>
  );
}
