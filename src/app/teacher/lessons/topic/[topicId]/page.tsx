import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getModuleById, getTopicById } from '@/features/curriculum/queries';
import { LessonNodeWalker, type LearningNode } from '@/features/curriculum/components/LessonNodeWalker';

export const metadata: Metadata = { title: 'Materi & Panduan Mengajar — Bits2Bytes' };
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ topicId: string }> };

export default async function TeacherTopicPage({ params }: Props) {
  const { topicId } = await params;
  const id = Number(topicId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const auth = await getAuthUser();
  if (!auth.ok) redirect('/login');
  if (auth.role !== 'teacher') redirect('/');

  const topic = await getTopicById(id);
  if (!topic || topic.status !== 'published') notFound();

  const module = await getModuleById(topic.module_id);

  const lessonContent = topic.lesson_content as Record<string, unknown> | null;
  const learningPath: LearningNode[] = Array.isArray(lessonContent?.learningPath)
    ? lessonContent.learningPath as LearningNode[]
    : [];

  return (
    <main className="mx-auto max-w-4xl space-y-6">
      <Link href="/teacher/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-700 dark:text-slate-300 dark:hover:text-purple-300">
        <span aria-hidden="true">←</span> Kembali ke Jadwal Guru
      </Link>

      <header className="rounded-3xl border border-blue-200 bg-white p-6 shadow-sm dark:border-purple-500/30 dark:bg-zinc-900 sm:p-8">
        <p className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-purple-300">Materi Pembelajaran Guru</p>
        <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{topic.title}</h1>
        {module?.title && <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Modul: {module.title}</p>}
        {topic.description && <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">{topic.description}</p>}
        {topic.project_link && <a href={topic.project_link} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex text-sm font-bold text-blue-700 hover:underline dark:text-purple-300">Buka tautan project ↗</a>}
      </header>

      <section id="panduan-mengajar" className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-white">
          <span aria-hidden="true">🎯</span> Panduan Mengajar
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Gunakan urutan materi di bawah sebagai alur mengajar. Sampaikan konsep, tampilkan demonstrasi, lalu beri kesempatan siswa mencoba dan menjelaskan kembali hasilnya.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <article className="rounded-xl bg-blue-50 p-4 dark:bg-blue-950/30">
            <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200">Sebelum kelas</h3>
            <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">Pelajari setiap langkah, siapkan aplikasi atau tautan project, dan uji contoh yang akan didemonstrasikan.</p>
          </article>
          <article className="rounded-xl bg-violet-50 p-4 dark:bg-violet-950/30">
            <h3 className="text-sm font-bold text-violet-900 dark:text-violet-200">Saat mengajar</h3>
            <p className="mt-1 text-sm text-violet-800 dark:text-violet-300">Jelaskan tujuan tiap langkah, demonstrasikan secara bertahap, lalu minta siswa mempraktikkan sendiri.</p>
          </article>
          <article className="rounded-xl bg-amber-50 p-4 dark:bg-amber-950/30">
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">Pertanyaan pemantik</h3>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">“Apa yang terjadi jika langkah ini diubah?” dan “Bagaimana kamu tahu hasilnya sudah sesuai?”</p>
          </article>
          <article className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
            <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Indikator keberhasilan</h3>
            <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">Siswa dapat menjelaskan konsep dengan kata-kata sendiri dan menyelesaikan latihan tanpa sekadar menyalin contoh.</p>
          </article>
        </div>
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Catatan: panduan ini merupakan kerangka pendamping. Materi dan urutan langkah tetap mengikuti konten kurikulum yang telah diterbitkan.</p>
      </section>

      <section id="materi" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Materi yang Dipelajari Siswa</h2>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 dark:bg-purple-500/15 dark:text-purple-200">{learningPath.length} langkah</span>
        </div>
        {learningPath.length > 0 ? (
          <LessonNodeWalker nodes={learningPath} topicId={id} />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-600 dark:border-zinc-700 dark:text-slate-300">
            Materi langkah demi langkah untuk topik ini belum tersedia. Silakan gunakan deskripsi topik dan tautan project sebagai referensi.
          </div>
        )}
      </section>
    </main>
  );
}
