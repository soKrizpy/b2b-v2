// src/app/admin/curriculum/page.tsx
// Admin curriculum hub — module list.
// Workflow: [+ Buat Modul Baru] → create module → [Edit & Build >] → builder page.
import type { Metadata } from 'next';
import { getAllModulesWithTopics } from '@/features/curriculum/queries';
import { CurriculumShell } from './CurriculumShell';
import { ModuleAccordion } from './ModuleAccordion';

export const metadata: Metadata = { title: 'Kurikulum — Admin Bits2Bytes' };
export const dynamic = 'force-dynamic';

export default async function AdminCurriculumPage() {
  const modules = await getAllModulesWithTopics();

  const totalTopics = modules.reduce((s, m) => s + m.topics.length, 0);

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">

      {/* Page header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#7cc62f] mb-1">
          Manajemen Kurikulum
        </p>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Kurikulum
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {modules.length} modul · {totalTopics} topik
        </p>
      </div>

      {/* Workflow hint */}
      <div className="flex items-start gap-3 bg-indigo-50 dark:bg-indigo-900/20
        rounded-2xl px-4 py-3.5 ring-1 ring-indigo-200 dark:ring-indigo-700/40 text-sm">
        <span className="text-lg flex-shrink-0" aria-hidden="true">💡</span>
        <p className="text-indigo-700 dark:text-indigo-300 leading-relaxed">
          <strong>Alur kerja:</strong> Buat modul terlebih dahulu →
          lalu klik <strong>Edit &amp; Build ›</strong> pada kartu modul untuk
          mengimpor JSON materi, topik, kuis, dan tryout ke dalam modul tersebut.
        </p>
      </div>

      {/* Shell: owns "Buat Modul Baru" modal */}
      <CurriculumShell>
        {modules.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl
            border-2 border-dashed border-slate-200 dark:border-white/10
            bg-white dark:bg-white/[0.03] py-24 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-white/5
              ring-1 ring-slate-200 dark:ring-white/10
              flex items-center justify-center mb-4 text-4xl">
              📚
            </div>
            <p className="font-bold text-slate-700 dark:text-slate-200 text-lg">
              Belum ada modul
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 max-w-xs">
              Klik <strong className="text-slate-600 dark:text-slate-300">+ Buat Modul Baru</strong> di atas untuk
              membuat modul pertama, kemudian tambahkan materi di dalam modul tersebut.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {modules.map((mod) => (
              <ModuleAccordion key={mod.id} module={mod} />
            ))}
          </div>
        )}
      </CurriculumShell>
    </div>
  );
}
