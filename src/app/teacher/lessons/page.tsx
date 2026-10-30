import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { getAllModulesWithTopics } from '@/features/curriculum/queries';

export const metadata: Metadata = { title: 'Panduan Mengajar & Topik — Bits2Bytes' };
export const dynamic = 'force-dynamic';

export default async function TeacherLessonsPage() {
  const auth = await getAuthUser();
  if (!auth.ok) redirect('/login');
  if (auth.role !== 'teacher') redirect('/');

  const modules = await getAllModulesWithTopics();
  const publishedModules = modules
    .filter((moduleRecord) => moduleRecord.is_active)
    .map((moduleRecord) => ({
      ...moduleRecord,
      topics: moduleRecord.topics.filter((topic) => topic.status === 'published'),
    }))
    .filter((moduleRecord) => moduleRecord.topics.length > 0);

  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href="/teacher/dashboard" className="text-sm font-semibold text-slate-600 hover:text-blue-700 dark:text-slate-300 dark:hover:text-purple-300">
          ← Kembali ke Dashboard Guru
        </Link>
        <p className="mt-5 text-xs font-black uppercase tracking-widest text-blue-600 dark:text-purple-300">Pusat Referensi Guru</p>
        <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">Panduan Mengajar & Topik</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Pilih modul dan topik untuk mempelajari alur materi yang sama dengan siswa, beserta panduan persiapan dan pelaksanaan kelas.
        </p>
      </div>

      {publishedModules.length > 0 ? (
        <div className="space-y-5">
          {publishedModules.map((moduleRecord) => (
            <section key={moduleRecord.id} className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm dark:border-purple-500/30 dark:bg-zinc-900">
              <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950/60">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-black text-slate-900 dark:text-white">{moduleRecord.title}</h2>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 dark:bg-purple-500/15 dark:text-purple-200">
                    {moduleRecord.topics.length} topik
                  </span>
                </div>
                {moduleRecord.description && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{moduleRecord.description}</p>
                )}
              </div>
              <ol className="divide-y divide-slate-100 dark:divide-zinc-800">
                {moduleRecord.topics.map((topic) => (
                  <li key={topic.id}>
                    <Link href={`/teacher/lessons/topic/${topic.id}`} className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-blue-50 dark:hover:bg-purple-950/20">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm font-black text-blue-700 dark:bg-purple-500/15 dark:text-purple-200">
                        {topic.order_index}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-slate-800 dark:text-slate-100">{topic.title}</span>
                        {topic.description && <span className="mt-0.5 block line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{topic.description}</span>}
                      </span>
                      <span className="shrink-0 text-xs font-bold text-blue-700 group-hover:underline dark:text-purple-300">Lihat materi <span aria-hidden="true">→</span></span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="font-bold text-slate-800 dark:text-white">Belum ada topik yang diterbitkan</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Topik akan muncul di sini setelah modul diaktifkan dan topiknya berstatus diterbitkan.</p>
        </div>
      )}
    </main>
  );
}
