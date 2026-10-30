import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { getTeacherModulesWithTopics } from '@/features/curriculum/queries';

export const metadata: Metadata = { title: 'Panduan Mengajar — Bits2Bytes' };
export const dynamic = 'force-dynamic';

export default async function TeacherGuidePage() {
  const auth = await getAuthUser();
  if (!auth.ok) redirect('/login');
  if (auth.role !== 'teacher') redirect('/login');

  const modules = await getTeacherModulesWithTopics(auth.user.id);
  const totalTopics = modules.reduce((total, module) => total + module.topics.length, 0);

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <header>
        <p className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-purple-400 mb-1">
          Pegangan Mengajar
        </p>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          Panduan Guru
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
          Topik di sini mengikuti kurikulum aktif yang sedang dipelajari siswa bimbinganmu.
          Gunakan sebagai acuan saat kelas live, lalu dampingi siswa ketika berlatih.
        </p>
      </header>

      <section className="rounded-2xl border border-blue-200 dark:border-purple-500/30 bg-blue-50/70 dark:bg-purple-950/20 p-4 sm:p-5">
        <h2 className="font-extrabold text-slate-900 dark:text-white">Cara menggunakan panduan</h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
          <li className="rounded-xl bg-white/80 dark:bg-slate-950/50 p-3">
            <span className="font-black text-blue-700 dark:text-purple-300">01 · Sebelum kelas</span>
            <p className="mt-1 text-slate-600 dark:text-slate-300">Baca fokus topik dan buka sumber materi yang tersedia.</p>
          </li>
          <li className="rounded-xl bg-white/80 dark:bg-slate-950/50 p-3">
            <span className="font-black text-blue-700 dark:text-purple-300">02 · Saat kelas live</span>
            <p className="mt-1 text-slate-600 dark:text-slate-300">Jelaskan dan demonstrasikan materi, lalu ajak siswa mencoba.</p>
          </li>
          <li className="rounded-xl bg-white/80 dark:bg-slate-950/50 p-3">
            <span className="font-black text-blue-700 dark:text-purple-300">03 · Setelah kelas</span>
            <p className="mt-1 text-slate-600 dark:text-slate-300">Arahkan siswa ke tantangan praktik dan tinjau hasil pekerjaannya.</p>
          </li>
        </ol>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Panduan ini menampilkan informasi yang memang tersedia di kurikulum; tujuan rinci,
          demonstrasi, dan kriteria penilaian tambahan belum ditampilkan jika belum dicatat pada materi.
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
        <span>{modules.length} modul aktif</span>
        <span aria-hidden="true">·</span>
        <span>{totalTopics} topik dipublikasikan</span>
      </div>

      {modules.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center">
          <p className="font-bold text-slate-800 dark:text-white">Belum ada kurikulum aktif untuk siswa bimbinganmu</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Modul akan muncul setelah siswa terhubung denganmu dan memiliki modul aktif.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {modules.map((module) => (
            <section key={module.id} className="overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm">
              <div className="border-b border-slate-100 dark:border-zinc-800 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  {module.level && (
                    <span className="rounded-full bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-300">{module.level}</span>
                  )}
                  <span className="text-xs text-slate-500 dark:text-slate-400">{module.topics.length} topik</span>
                </div>
                <h2 className="mt-2 text-lg font-black text-slate-900 dark:text-white">{module.title ?? 'Modul tanpa judul'}</h2>
                {module.description && (
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">{module.description}</p>
                )}
              </div>

              {module.topics.length === 0 ? (
                <p className="p-4 text-sm text-slate-500 dark:text-slate-400">Belum ada topik yang dipublikasikan pada modul ini.</p>
              ) : (
                <ol className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {module.topics.map((topic) => (
                    <li key={topic.id} className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-zinc-800 text-sm font-black text-slate-600 dark:text-slate-300">
                          {topic.order_index}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-extrabold text-slate-900 dark:text-white">{topic.title}</h3>
                          {topic.description && (
                            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">{topic.description}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            {topic.challenge_count > 0 && (
                              <span className="rounded-lg bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 font-semibold text-amber-800 dark:text-amber-300">
                                {topic.challenge_count} tantangan praktik
                              </span>
                            )}
                            {topic.topic_link && (
                              <a href={topic.topic_link} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-blue-200 dark:border-blue-800 px-2.5 py-1 font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40">
                                Buka materi
                              </a>
                            )}
                            {topic.project_link && (
                              <a href={topic.project_link} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
                                Buka proyek
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>
      )}

      <div>
        <Link href="/teacher/dashboard" className="text-sm font-bold text-blue-700 dark:text-purple-300 hover:underline">
          ← Kembali ke dasbor guru
        </Link>
      </div>
    </div>
  );
}
