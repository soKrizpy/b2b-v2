import Link from 'next/link';
import { cache } from 'react';
import { getStudentModulesWithTopics, getStudentCompletedTopics } from '@/features/curriculum/queries';
import { isFeatureEnabled } from '@/lib/featureConfig';
import { getStudentGamificationData } from '@/features/pet/lib/petQueries';
import { StudentAvatarCard } from '@/features/dashboard/student/StudentAvatarCard';
import { getStudentCertificates } from '@/features/certificates/queries';
import { getStudentInvoices } from '@/features/invoices/queries';
import { BillingNoticeModal } from '@/features/invoices/components/BillingNoticeModal';
import { calculateLevel } from '@/features/pet/lib/levelCalc';
import { getAdventurerTitle } from '@/features/dashboard/student/adventurerTitle';

const getCachedModules = cache((studentId: string) => getStudentModulesWithTopics(studentId));
const getCachedCompletedTopics = cache((studentId: string) => getStudentCompletedTopics(studentId));

export async function StudentAvatarDashboardContent({ studentId }: { studentId: string }) {
  if (!isFeatureEnabled('gamification')) return null;
  const gamData = await getStudentGamificationData(studentId);
  if (!gamData) return <p className="py-6 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">Data avatar belum tersedia.</p>;
  const level = calculateLevel(gamData.totalXp);
  const title = getAdventurerTitle(level.currentLevel);
  return <div className="space-y-3">
    <div className="flex items-center justify-between gap-2"><span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-2.5 py-1 text-[10px] font-black text-blue-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300">Level {level.currentLevel}</span><span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{title.title}</span></div>
    <StudentAvatarCard {...gamData} />
  </div>;
}

export async function StudentNeedsQuizBannerContent({ studentId }: { studentId: string }) {
  if (!isFeatureEnabled('questMap') && !isFeatureEnabled('gamification')) return null;
  const modules = await getCachedModules(studentId);
  const activeModule = modules.find((module) => module.enrollmentStatus === 'active') ?? null;
  if (!activeModule) return null;
  const { getQuestMapData } = await import('@/features/quiz/questMapQueries');
  const questData = await getQuestMapData(studentId, activeModule);
  const topics = questData.needsQuizTopics.map((node) => node.topic.title);
  if (topics.length === 0) return null;
  return <section className="rounded-2xl border border-amber-400/50 bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:border-amber-500/30 dark:from-amber-950/30 dark:to-orange-950/20">
    <div className="flex flex-wrap items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-xl">🔥</span><div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">Misi Baru Terbuka</p><p className="text-sm font-extrabold text-slate-900 dark:text-white">Ada {topics.length} ujian modul yang menunggu.</p><p className="text-xs text-slate-600 dark:text-slate-400">{topics.slice(0, 2).join(' · ')}{topics.length > 2 ? ' · +' + (topics.length - 2) + ' lainnya' : ''}</p></div><Link href="/student/lessons" className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-extrabold text-white hover:bg-amber-600">Mulai Kuis</Link></div>
  </section>;
}

export async function StudentLearningSummaryContent({ studentId }: { studentId: string }) {
  const [modules, completedTopics] = await Promise.all([getCachedModules(studentId), getCachedCompletedTopics(studentId)]);
  const accessibleModules = modules.filter((module) => module.enrollmentStatus === 'active' || module.topics.length > 0);
  return <section className="space-y-3 rounded-3xl border border-blue-400/40 bg-white p-5 shadow-sm dark:border-purple-500/40 dark:bg-slate-900">
    <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800"><span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">▦ Ringkasan Belajar</span><span className="font-mono text-[11px] font-bold text-cyan-600 dark:text-cyan-400">{completedTopics.length} Topik</span></div>
    <div className="space-y-2 text-xs"><div className="flex justify-between text-slate-600 dark:text-slate-300"><span>Modul Terbuka</span><strong>{accessibleModules.length} Modul</strong></div><div className="flex justify-between text-slate-600 dark:text-slate-300"><span>Topik Terselesaikan</span><strong>{completedTopics.length} Topik</strong></div></div>
    <div className="border-t border-slate-100 pt-2 dark:border-slate-800"><Link href="/student/achievements" className="flex items-center justify-between text-[11px] font-bold text-blue-600 hover:underline dark:text-cyan-400"><span>Lihat Detail Target Modul</span><span>›</span></Link></div>
  </section>;
}

export async function StudentCertificatesDashboardContent({ studentId }: { studentId: string }) {
  if (!isFeatureEnabled('certificates')) return null;
  const certificates = await getStudentCertificates(studentId);
  if (certificates.length === 0) return null;
  return <section className="space-y-3 rounded-3xl border border-blue-400/40 bg-white p-5 shadow-sm dark:border-purple-500/40 dark:bg-slate-900">
    <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800"><span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">🏆 Koleksi Utama</span><span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{certificates.length} Diperoleh</span></div>
    <div className="space-y-2">{certificates.slice(0, 2).map((certificate) => <div key={certificate.id} className="flex items-center gap-2.5 rounded-2xl border border-amber-300/40 bg-amber-50/50 p-2.5 dark:border-amber-500/30 dark:bg-amber-950/20"><span className="text-lg">🏆</span><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-900 dark:text-white">{certificate.module_title || 'Sertifikat Kelulusan'}</p><p className="font-mono text-[10px] text-amber-600 dark:text-amber-400">Tier {certificate.tier} · Nilai {certificate.score}</p></div></div>)}</div>
    <Link href="/student/achievements" className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-bold text-amber-600 hover:underline dark:border-slate-800 dark:text-amber-400"><span>Buka Semua Lencana</span><span>›</span></Link>
  </section>;
}

export async function StudentBillingDashboardContent({ studentId }: { studentId: string }) {
  if (!isFeatureEnabled('billing')) return null;
  const invoices = await getStudentInvoices(studentId);
  const unpaidInvoices = invoices.filter((invoice) => invoice.status === 'sent');
  if (unpaidInvoices.length === 0) return null;
  return <BillingNoticeModal invoices={unpaidInvoices} />;
}
