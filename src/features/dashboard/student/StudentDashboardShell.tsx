'use client';
// src/features/dashboard/student/StudentDashboardShell.tsx
// 2-Column Student Dashboard Shell.
// Col Left: Hero Realm Banner + Misi Harian - Ringkasan Belajar - Koleksi Sertifikat
// Col Right: Student Avatar & Progress

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { AnnouncementBanner } from '@/features/announcements/components/AnnouncementBanner';
import { isLive, formatDate, formatTime } from '@/lib/formatDate';
import { HeroAtmosphere } from '@/components/common/HeroAtmosphere';
import { LiveStatusIndicator } from '@/components/common/LiveStatusIndicator';
import { FEATURE_FLAGS } from '@/lib/featureConfig';

import {
  Sparkles,
  Compass,
  CheckCircle2,
  Calendar,
  Clock,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface SessionItem {
  id: number | string;
  title: string;
  meeting_date: string;
  is_completed: boolean;
  session_count: number;
  session_number: number;
  progress_report?: string | null;
}

interface Props {
  studentName: string;
  upcoming: SessionItem[];
  upcomingCount: number;
  pastCount: number;
  quizBanner?: ReactNode;
  avatarContent?: ReactNode;
  learningSummaryContent?: ReactNode;
  certificatesContent?: ReactNode;
  billingContent?: ReactNode;
}

// ── Section Header Component ─────────────────────────────────────────────────

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-white/10 to-transparent" />
      <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest
        whitespace-nowrap flex items-center gap-2">
        <span className="text-blue-500 dark:text-purple-500">{icon}</span>
        {label}
      </h2>
      <div className="flex-1 h-px bg-gradient-to-l from-slate-200 dark:from-white/10 to-transparent" />
    </div>
  );
}

// ── Main Shell Component ─────────────────────────────────────────────────────

export function StudentDashboardShell({
  studentName,
  upcoming,
  upcomingCount,
  pastCount,
  quizBanner,
  avatarContent,
  learningSummaryContent,
  certificatesContent,
  billingContent,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const next = upcoming[0] ?? null;
  const hasLive = upcoming.some((m) => isLive(m.meeting_date));
  // Keep the first upcoming session in the hero and show the next four below.
  const nextFour = upcoming.slice(1, 5);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ── Announcement Banner ── */}
      {FEATURE_FLAGS.announcements && <AnnouncementBanner role="students" />}

      {quizBanner}

      {/* ══ 2-COLUMN LAYOUT ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── LEFT COL (2/3): Hero + Pod ── */}
        <div className="lg:col-span-2 space-y-6 order-1">

          {/* Hero Realm Welcome Card — seamless adaptive atmosphere */}
          <div className={`relative rounded-3xl overflow-hidden p-6 sm:p-7 text-white shadow-xl
            transition-all duration-500 hover:shadow-2xl
            ${hasLive
              ? 'bg-gradient-to-br from-rose-600 via-rose-700 to-indigo-800 border border-rose-400/50 shadow-rose-500/20 hover:border-rose-300/60 dark:from-slate-950 dark:via-rose-950 dark:to-slate-900 dark:border-rose-500/40 dark:hover:border-rose-400/60 dark:shadow-rose-950/40'
              : 'bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-700 border border-blue-400/50 shadow-blue-500/20 hover:border-blue-300/60 dark:from-slate-950 dark:via-purple-950 dark:to-slate-900 dark:border-purple-500/40 dark:hover:border-purple-400/60 dark:shadow-purple-950/40'
            }`}>
            {/* Ambient seamless atmosphere: drifting clouds & soaring birds (light mode), twinkling stars & comet (dark mode) */}
            <HeroAtmosphere />

            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div
                className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 dark:bg-purple-500/15 blur-3xl"
                style={{ animation: 'heroAmbientBreathing 6s ease-in-out infinite' }}
              />
              <div
                className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-indigo-400/15 dark:bg-indigo-600/15 blur-3xl"
                style={{ animation: 'heroAmbientBreathing 8s ease-in-out infinite 2s' }}
              />
            </div>

            <div className="relative z-10 space-y-4">
              {/* Top: status badge + greeting */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="mb-2">
                    <LiveStatusIndicator
                      isLive={hasLive}
                      liveLabel="KELAS SEDANG BERLANGSUNG!"
                      offlineLabel="Realm Belajar Coding Hari Ini"
                      className="bg-white/15 dark:bg-slate-900/40 border-white/25 dark:border-purple-500/30 text-white"
                    />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm">
                    Selamat berpetualang, {studentName}! {hasLive ? '🔥' : '🚀'}
                  </h1>
                  {next && (
                    <p className="text-xs text-blue-100 dark:text-slate-300 mt-1 font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-200 dark:text-purple-400" />
                      {hasLive ? 'Sedang berlangsung:' : 'Jadwal kelas:'}{' '}
                      <strong className="text-white" suppressHydrationWarning>
                        {mounted ? formatDate(next.meeting_date) : 'Memuat...'}
                      </strong>
                      {' pukul '}
                      <strong className="text-white" suppressHydrationWarning>
                        {mounted ? formatTime(next.meeting_date) : '--:--'}
                      </strong>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-emerald-500/20 backdrop-blur-md text-emerald-200 dark:text-emerald-300
                    rounded-2xl px-3 py-1.5 text-xs font-black border border-emerald-400/30 dark:border-emerald-500/25">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 dark:text-emerald-400" />
                    {pastCount} Tuntas
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/20 dark:bg-sky-500/15 backdrop-blur-md text-white dark:text-sky-300
                    rounded-2xl px-3 py-1.5 text-xs font-black border border-white/30 dark:border-sky-500/25">
                    <Clock className="w-3.5 h-3.5 text-sky-200 dark:text-sky-400" />
                    {upcomingCount} Menanti
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* ── RIGHT COL (1/3): Pet + Misi Harian + Ringkasan + Certs ── */}
        <div className="lg:col-span-1 space-y-6 order-2">

          {/* Student Avatar & Progress Card */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-blue-400/40 dark:border-purple-500/40
            shadow-sm shadow-blue-500/5 dark:shadow-purple-500/5 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-black text-blue-600 dark:text-purple-300 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-purple-400" />
                Avatar Petualang
              </span>

            </div>
            {avatarContent ?? <div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />}
          </div>

          {/* Misi Harian */}
          <div className="rounded-3xl border border-blue-400/40 bg-white p-5 shadow-sm dark:border-purple-500/40 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white"><Compass className="h-3.5 w-3.5 text-blue-600 dark:text-purple-400" /> Misi Harian</span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Aktivitas belajar</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200/60 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><div><p className="text-xs font-bold text-slate-800 dark:text-slate-200">Presensi &amp; Masuk Kelas</p><p className="text-[10px] text-slate-500 dark:text-slate-400">{upcoming.length > 0 ? 'Ada sesi yang menanti' : 'Belum ada sesi mendatang'}</p></div></div>
              <Link href="/student/lessons" className="flex items-center gap-2 rounded-2xl border border-blue-200/70 bg-blue-50/70 p-3 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:border-purple-500/20 dark:bg-purple-950/20 dark:text-purple-300 dark:hover:bg-purple-950/40"><BookOpen className="h-4 w-4" /> Lanjutkan belajar coding <ChevronRight className="ml-auto h-4 w-4" /></Link>
            </div>
          </div>

          {learningSummaryContent ?? <div className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />}
          {certificatesContent}

        </div>
      </div>

      {/* ── Quick Teleport Banner: Lencana & Target Modul Tab ── */}
      <section className="rounded-3xl bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-sky-50 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-slate-900 border border-blue-400/40 dark:border-purple-500/30 p-5 sm:p-6 shadow-md shadow-blue-500/5 dark:shadow-purple-950/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 dark:bg-purple-500/20 border border-blue-400/35 dark:border-purple-400/40 flex items-center justify-center text-2xl flex-shrink-0">
              🏆
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-purple-400 font-mono">
                  Tab Baru Siswa
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-mono">
                  TERPISAH &amp; RAPI
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Lencana Pencapaian, Progres Belajar &amp; Target Modul
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 max-w-xl">
                Seluruh galeri lencana prestasi, sertifikat kelulusan modul, grafik progres belajar, dan target mingguan kini telah dipisahkan ke tab khusus antara Quest Map dan Parent Hub.
              </p>
            </div>
          </div>

          <Link
            href="/student/achievements"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl
              text-xs font-black text-white self-start sm:self-center
              bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-600/30
              dark:from-purple-600 dark:via-indigo-600 dark:to-purple-700 dark:hover:from-purple-500 dark:hover:to-indigo-500 dark:shadow-purple-600/30
              hover:scale-[1.02] active:scale-95 transition-all flex-shrink-0 font-mono"
          >
            <span>Buka Lencana &amp; Target</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Upcoming Sessions (2nd–5th) ── */}
      {nextFour.length > 0 && (
        <section className="space-y-4">
          <SectionHeader icon={<Calendar className="w-4 h-4 text-blue-500 dark:text-purple-400" />} label="Jadwal Berikutnya" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {nextFour.map((m) => (
              <div
                key={m.id}
                className="h-full flex flex-col justify-between bg-white dark:bg-zinc-900 rounded-2xl
                  border border-blue-400/35 dark:border-purple-500/35 p-4 shadow-sm
                  transition-all duration-300 hover:scale-[1.02] cursor-pointer
                  hover:border-blue-500 dark:hover:border-purple-400
                  hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] animate-fade-in-up"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:bg-purple-500/15 dark:text-purple-400
                      flex items-center justify-center text-sm font-bold">
                      <Calendar className="w-4 h-4" />
                    </div>
                    {m.session_count > 1 && (
                      <span className="text-[10px] font-black text-blue-700 dark:text-purple-400
                        bg-blue-500/10 dark:bg-purple-500/15 px-2.5 py-0.5 rounded-full border border-blue-400/30 dark:border-purple-500/30">
                        Sesi {m.session_number}/{m.session_count}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-black text-slate-900 dark:text-white leading-snug line-clamp-2 mb-3">
                    {m.title}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl
                    bg-blue-500/10 border border-blue-400/30 text-blue-700 dark:bg-purple-500/10 dark:border-purple-500/30 dark:text-purple-300 font-extrabold text-xs">
                    <Clock className="w-3 h-3 text-blue-500 dark:text-purple-400" />
                    <span suppressHydrationWarning>{mounted ? formatDate(m.meeting_date) : '...'}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold pl-0.5" suppressHydrationWarning>
                    Pukul {mounted ? formatTime(m.meeting_date) : '--:--'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {billingContent}

    </div>
  );
}
