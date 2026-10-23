'use client';
// src/features/dashboard/student/StudentDashboardShell.tsx
// 2-Column Student Dashboard Shell.
// Col Left  (2/3): Hero Realm Banner (with inline profile strip & anime.js atmosphere) + Town Square Pod
// Col Right (1/3): Cyber Pet Companion - Misi Harian - Ringkasan Belajar - Koleksi Sertifikat

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TownSquarePod } from '@/features/dashboard/student/TownSquarePod';
import { CyberPetWidget } from '@/features/pet/components/CyberPetWidget';
import { BillingNoticeModal } from '@/features/invoices/components/BillingNoticeModal';
import { AnnouncementBanner } from '@/features/announcements/components/AnnouncementBanner';
import { LevelUpCelebrationModal, getAdventurerTitle } from '@/features/dashboard/student/LevelUpCelebrationModal';
import { calculateLevel } from '@/features/pet/lib/levelCalc';
import { isLive, formatDate, formatTime } from '@/lib/formatDate';
import { HeroAtmosphere } from '@/components/common/HeroAtmosphere';
import { LiveStatusIndicator } from '@/components/common/LiveStatusIndicator';
import { CosmeticShopModal } from '@/features/pet/components/CosmeticShopModal';
import type { TownSquareMeeting } from '@/features/sessions/queries';
import type { StudentGamificationData } from '@/features/pet/lib/petQueries';
import type { CertificateWithModule } from '@/features/certificates/queries';
import type { InvoiceRow } from '@/types/database';
import type { TopicProgressSummary, ModuleWithTopics } from '@/features/curriculum/queries';
import {
  Sparkles,
  ShoppingBag,
  Compass,
  CheckCircle2,
  Flame,
  Calendar,
  Clock,
  ChevronRight,
  Award,
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
  studentId:          string;
  studentName:        string;
  gamData:            StudentGamificationData | null;
  certificates:       CertificateWithModule[];
  townSquareMeeting:  TownSquareMeeting | null;
  invoices:           InvoiceRow[];
  upcoming:           SessionItem[];
  past:               SessionItem[];
  /** Topics with NEEDS_QUIZ status — drives the mission banner */
  needsQuizTopics:    Array<{ id: number; title: string }>;
  completedTopics?:   TopicProgressSummary[];
  allModules?:        ModuleWithTopics[];
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

// ── Needs-Quiz Mission Banner ─────────────────────────────────────────────────

function NeedsQuizBanner({
  topics,
}: {
  topics: Array<{ id: number; title: string }>;
}) {
  if (topics.length === 0) return null;
  const first = topics[0];

  return (
    <div className="rounded-2xl overflow-hidden ring-1
      ring-amber-400/60 dark:ring-amber-500/40
      bg-gradient-to-r from-amber-50 to-orange-50
      dark:from-amber-950/30 dark:to-orange-950/20
      shadow-md shadow-amber-200/40 dark:shadow-amber-900/30">
      <div className="px-5 py-4 flex items-center gap-4 flex-wrap">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30
          flex items-center justify-center text-xl flex-shrink-0">
          🔥
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest
            text-amber-600 dark:text-amber-400 mb-0.5 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            Misi Baru Terbuka
          </p>
          <p className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
            Ujian Rune <span className="text-amber-700 dark:text-amber-300">{first.title}</span> Siap Dikerjakan!
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tuntaskan untuk mengklaim EXP &amp; Koin Petualangan.
            {topics.length > 1 && ` +${topics.length - 1} kuis lainnya menunggu.`}
          </p>
        </div>

        <Link
          href="/student/lessons"
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5
            rounded-2xl text-xs font-extrabold text-white
            bg-gradient-to-r from-amber-500 to-orange-500
            shadow-md shadow-amber-400/30 hover:shadow-amber-400/50
            hover:-translate-y-0.5 active:scale-95 transition-all duration-150"
        >
          <span>Mulai Kuis</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

// ── Main Shell Component ─────────────────────────────────────────────────────

export function StudentDashboardShell({
  studentId,
  studentName,
  gamData,
  certificates,
  townSquareMeeting,
  invoices,
  upcoming,
  past,
  needsQuizTopics,
  completedTopics = [],
  allModules = [],
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const next = upcoming[0] ?? null;
  const hasLive = upcoming.some((m) => isLive(m.meeting_date));
  const lvl = gamData ? calculateLevel(gamData.totalXp) : null;
  const adventurerInfo = lvl ? getAdventurerTitle(lvl.currentLevel) : getAdventurerTitle(1);

  // Next 4 schedule items (excluding town square primary slot)
  const nextFour = upcoming.slice(1, 5);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ── Announcement Banner ── */}
      <AnnouncementBanner role="students" />

      {/* ── NEEDS_QUIZ Mission Banner ── */}
      <NeedsQuizBanner topics={needsQuizTopics} />

      {/* ══ 2-COLUMN LAYOUT ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── LEFT COL (2/3): Hero + Pod ── */}
        <div className="lg:col-span-2 space-y-6 order-1">

          {/* Hero Realm Welcome Card — seamless adaptive atmosphere */}
          <div className={`relative rounded-3xl overflow-hidden p-6 sm:p-7 text-white shadow-xl
            transition-all duration-500 hover:shadow-2xl
            ${hasLive
              ? 'bg-gradient-to-br from-rose-600 via-rose-700 to-indigo-800 border border-rose-400/50 shadow-rose-500/20 hover:border-rose-300/60 dark:from-slate-950 dark:via-rose-950 dark:to-slate-900 dark:border-rose-500/40 dark:shadow-rose-950/40'
              : 'bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-700 border border-blue-400/50 shadow-blue-500/20 hover:border-blue-300/60 dark:from-slate-950 dark:via-purple-950 dark:to-slate-900 dark:border-purple-500/40 dark:shadow-purple-950/40'
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
                    {past.length} Tuntas
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/20 dark:bg-sky-500/15 backdrop-blur-md text-white dark:text-sky-300
                    rounded-2xl px-3 py-1.5 text-xs font-black border border-white/30 dark:border-sky-500/25">
                    <Clock className="w-3.5 h-3.5 text-sky-200 dark:text-sky-400" />
                    {upcoming.length} Menanti
                  </div>
                </div>
              </div>

              {/* Profile inline strip */}
              {lvl && (
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/10">
                  {/* Level + title */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-sm font-black text-amber-300 shadow-inner">
                      ⭐
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-amber-300 uppercase tracking-wider leading-none">
                        Tingkat {lvl.currentLevel}
                      </p>
                      <p className="text-xs font-bold text-white/90 leading-none mt-0.5">
                        {gamData?.equippedCosmetics?.titleId ? (
                          <span>{adventurerInfo.title}</span>
                        ) : (
                          adventurerInfo.title
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Mini EXP bar */}
                  <div className="flex-1 min-w-[120px]">
                    <div className="flex justify-between text-[10px] text-white/60 mb-1">
                      <span>EXP</span>
                      <span className="font-mono">{lvl.xpInCurrentLevel}/{lvl.xpNeededThisLevel}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-indigo-300 to-purple-300 transition-all duration-500"
                        style={{ width: `${lvl.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Coins */}
                  <div className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-400/35 px-2.5 py-1 rounded-xl text-xs font-black text-amber-200">
                    🪙 {gamData?.coins ?? 0}
                  </div>

                  {/* Quick Cosmetic Shop button */}
                  <button
                    type="button"
                    onClick={() => setIsShopModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-white
                      bg-blue-500/25 hover:bg-blue-500/40 border border-white/30 dark:bg-purple-500/30 dark:hover:bg-purple-500/45 transition-all hover:scale-105 active:scale-95 shadow-sm"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Toko Kosmetik</span>
                  </button>

                  {/* Celebrate button */}
                  <button
                    type="button"
                    onClick={() => setIsCelebrationOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-white
                      bg-white/15 hover:bg-white/25 border border-white/25 transition-colors"
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    Rayakan
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Town Square Pod */}
          <div className="w-full">
            <TownSquarePod
              meeting={townSquareMeeting}
              gamData={gamData}
              currentStudentId={studentId}
            />
          </div>

        </div>

        {/* ── RIGHT COL (1/3): Pet + Misi Harian + Ringkasan + Certs ── */}
        <div className="lg:col-span-1 space-y-6 order-2">

          {/* Cyber Pet Companion Card */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-blue-400/40 dark:border-purple-500/40
            shadow-sm shadow-blue-500/5 dark:shadow-purple-500/5 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-black text-blue-600 dark:text-purple-300 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-purple-400" />
                Companion Pet
              </span>
              {lvl && (
                <span className="text-[10px] font-black text-blue-700 dark:text-purple-300
                  bg-blue-500/15 dark:bg-purple-500/15 px-2.5 py-0.5 rounded-full border border-blue-400/30 dark:border-purple-500/30 font-mono">
                  Lvl {lvl.currentLevel}
                </span>
              )}
            </div>
            {gamData ? (
              <div className="py-1">
                <CyberPetWidget {...gamData} />
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <div className="text-4xl select-none">🐾</div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Cyber Pet belum diaktifkan</p>
              </div>
            )}
          </div>

          {/* Misi Harian — moved here from left col */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-blue-400/40 dark:border-purple-500/40
            p-5 shadow-sm shadow-blue-500/5 dark:shadow-purple-500/5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-blue-600 dark:text-purple-400" />
                Misi Harian
              </span>
              <span className="text-[10px] font-bold text-slate-400">Pembaruan 24 Jam</span>
            </div>
            <div className="space-y-2">
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">Presensi &amp; Masuk Kelas</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{upcoming.length > 0 ? '1 Sesi dijadwalkan' : 'Belum ada sesi hari ini'}</p>
                </div>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-start gap-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${needsQuizTopics.length > 0 ? 'bg-amber-500/20 text-amber-500 animate-pulse' : 'bg-emerald-500/20 text-emerald-500'}`}>
                  {needsQuizTopics.length > 0 ? <Flame className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">Tuntaskan Ujian Rune</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{needsQuizTopics.length > 0 ? `${needsQuizTopics.length} kuis menanti` : 'Semua kuis tuntas!'}</p>
                </div>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-600 dark:bg-purple-500/20 dark:text-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Award className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">Cek Kondisi Companion Pet</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Beri energi dan rawat mood pet</p>
                </div>
              </div>
            </div>
            <Link href="/student/lessons" className="text-center block text-xs font-bold text-blue-600 dark:text-purple-400 hover:underline pt-1">
              Jelajahi Peta Quest Lengkap →
            </Link>
          </div>

          {/* Ringkasan Belajar */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-blue-400/40 dark:border-purple-500/40 p-5 shadow-sm shadow-blue-500/5 dark:shadow-purple-500/5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-cyan-500" />
                Ringkasan Belajar
              </span>
              <span className="text-[11px] font-mono text-cyan-500 font-bold">{completedTopics.length} Topik</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Modul Terbuka</span>
                <span className="font-bold">{allModules.length} Modul</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Sertifikat Diraih</span>
                <span className="font-bold text-amber-500">{certificates.length} Lencana</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Status Kuis</span>
                <span className={`font-bold ${needsQuizTopics.length > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {needsQuizTopics.length > 0 ? `${needsQuizTopics.length} Perlu Dikerjakan` : 'Tuntas Semua'}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <Link href="/student/achievements" className="text-[11px] font-bold text-blue-600 dark:text-cyan-400 hover:underline flex items-center justify-between">
                <span>Lihat Detail Target Modul</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Quick Certificates */}
          {certificates.length > 0 && (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-blue-400/40 dark:border-purple-500/40 p-5 shadow-sm shadow-blue-500/5 dark:shadow-purple-500/5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  Koleksi Utama
                </span>
                <span className="text-[10px] font-bold text-slate-400">{certificates.length} Diperoleh</span>
              </div>
              <div className="space-y-2">
                {certificates.slice(0, 2).map((cert) => (
                  <div key={cert.id} className="p-2.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300/40 dark:border-amber-500/30 flex items-center gap-2.5">
                    <span className="text-lg">🏆</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{cert.module_title || 'Sertifikat Kelulusan'}</p>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">Tier {cert.tier} · Nilai {cert.score}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <Link href="/student/achievements" className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center justify-between">
                  <span>Buka Semua Lencana</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

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

      {/* ── Billing Notice Modal ── */}
      <BillingNoticeModal invoices={invoices.filter((inv) => inv.status === 'sent')} />

      {/* ── Level-Up Celebration Modal ── */}
      <LevelUpCelebrationModal
        isOpen={isCelebrationOpen}
        onClose={() => setIsCelebrationOpen(false)}
        level={lvl?.currentLevel ?? 1}
        totalXp={gamData?.totalXp ?? 0}
        coins={gamData?.coins ?? 0}
        studentName={studentName}
      />

      {/* ── Cosmetic Shop & Dressing Room Modal ── */}
      {mounted && isShopModalOpen && gamData && (
        <CosmeticShopModal
          studentName={studentName}
          coins={gamData.coins}
          totalXp={gamData.totalXp}
          inventory={gamData.inventory ?? []}
          equippedCosmetics={gamData.equippedCosmetics}
          onClose={() => setIsShopModalOpen(false)}
        />
      )}
    </div>
  );
}
