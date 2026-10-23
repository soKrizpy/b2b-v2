// src/app/student/lessons/page.tsx
// 🗺️ Quest Map — 4-state node progression with inline quiz trigger.
// Node states: COMPLETED | NEEDS_QUIZ | ACTIVE_NEXT | LOCKED | FINAL_BOSS
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getStudentModulesWithTopics } from '@/features/curriculum/queries';
import { getStudentCertificates } from '@/features/certificates/queries';
import { getQuestMapData } from '@/features/quiz/questMapQueries';
import { QuestMapClient } from '@/app/student/lessons/QuestMapClient';

export const metadata: Metadata = { title: '🗺️ Quest Map — Bits2Bytes' };
export const dynamic = 'force-dynamic';

type Props = { searchParams?: Promise<{ moduleId?: string }> };

export default async function QuestMapPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const resolvedParams = searchParams ? await searchParams : undefined;

  const [allModules, certificates] = await Promise.all([
    getStudentModulesWithTopics(user.id),
    getStudentCertificates(user.id),
  ]);

  if (allModules.length === 0) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in-up">
        <QuestHeader />
        <EmptyQuestState />
      </div>
    );
  }

  const selectedModId = resolvedParams?.moduleId
    ? Number(resolvedParams.moduleId)
    : allModules[0]?.id;

  const mod = allModules.find((m) => m.id === selectedModId) ?? allModules[0];
  const questData = await getQuestMapData(user.id, mod);
  const cert      = certificates.find((c) => c.module_id === mod.id) ?? null;

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <QuestHeader />

      {/* ── Quest Map client (handles modal open/close & full expedition view) ── */}
      <QuestMapClient
        questData={questData}
        cert={cert}
        studentId={user.id}
        allModules={allModules.map((m) => ({
          id: m.id,
          title: m.title ?? 'Modul',
          topicCount: m.topics.length,
        }))}
        currentModuleId={mod.id}
      />
    </div>
  );
}

// ── Static sub-components ─────────────────────────────────────────────────────

function QuestHeader() {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-widest
        text-cyan-600 dark:text-cyan-400 mb-1 flex items-center gap-1.5">
        <i className="fa-solid fa-map-location-dot text-cyan-400" /> Quest Map
      </p>
      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
        Perjalanan Belajarmu
      </h1>
      <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mt-0.5">
        Selesaikan setiap topik untuk membuka yang berikutnya.
      </p>
    </div>
  );
}

function EmptyQuestState() {
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
