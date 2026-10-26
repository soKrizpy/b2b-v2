'use client';
// src/app/student/achievements/StudentAchievementsShell.tsx
// Dedicated student hub for Achievement Badges, Module Targets, and Learning Progress.
// Separated cleanly from the main Town Square dashboard into its own tab between Quest Map and Parent Hub.

import { useState } from 'react';
import Link from 'next/link';
import { StudentAchievementBadges } from '@/features/dashboard/student/StudentAchievementBadges';
import { LaurelWreathBadgeRack } from '@/features/dashboard/student/LaurelWreathBadgeRack';
import { StudentModuleProgressChart } from '@/features/dashboard/student/StudentModuleProgressChart';
import { CertificateBadge } from '@/features/certificates/components/CertificateBadge';
import { getAdventurerTitle } from '@/features/dashboard/student/LevelUpCelebrationModal';
import { calculateLevel } from '@/features/pet/lib/levelCalc';
import type { StudentGamificationData } from '@/features/pet/lib/petQueries';
import type { CertificateWithModule } from '@/features/certificates/queries';
import type { TopicProgressSummary, ModuleWithTopics } from '@/features/curriculum/queries';
import { HeroAtmosphere } from '@/components/common/HeroAtmosphere';
import {
  Trophy,
  Award,
  Target,
  Compass,
  Layers,
} from 'lucide-react';

interface Props {
  studentName:      string;
  gamData:          StudentGamificationData | null;
  certificates:     CertificateWithModule[];
  completedTopics:  TopicProgressSummary[];
  allModules:       ModuleWithTopics[];
}

export function StudentAchievementsShell({
  studentName,
  gamData,
  certificates,
  completedTopics,
  allModules,
}: Props) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'badges' | 'certs' | 'targets'>('all');

  const lvl = gamData ? calculateLevel(gamData.totalXp) : null;
  const currentLvl = lvl?.currentLevel ?? 1;
  const advTitle = getAdventurerTitle(currentLvl);

  const totalPossibleTopics = allModules.reduce((acc, m) => acc + (m.topics?.length || 0), 0);
  const masteryPercentage = totalPossibleTopics > 0
    ? Math.round((completedTopics.length / totalPossibleTopics) * 100)
    : 0;

  return (
    <div className="space-y-8 pb-12 animate-fade-in text-slate-900 dark:text-slate-100">

      {/* ── Hero Banner: Realm Prestis & Pencapaian Siswa ── */}
      <div className="relative rounded-3xl overflow-hidden
        bg-gradient-to-br from-blue-700 via-indigo-800 to-sky-900 dark:from-slate-950 dark:via-[#10142b] dark:to-[#0a0f1d]
        border border-blue-400/40 dark:border-purple-500/40 shadow-2xl p-6 sm:p-8 text-white">

        {/* Ambient background anime.js atmosphere + glow accents */}
        <HeroAtmosphere />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-blue-400/20 dark:bg-purple-500/20 blur-3xl animate-pulse" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-indigo-500/20 dark:bg-indigo-600/20 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(#60a5fa_1px,transparent_1px)] dark:bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-500/20 dark:bg-purple-500/15 backdrop-blur-md text-blue-100 dark:text-purple-300
                text-xs font-black px-3.5 py-1 rounded-full mb-2.5 border border-blue-300/30 dark:border-purple-500/30 font-mono">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>HALL OF GLORY · BITS2BYTES</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
                <span>Lencana Pencapaian &amp; Target Modul</span>
                <span className="text-2xl">🏆</span>
              </h1>
              <p className="text-xs sm:text-sm text-blue-100 dark:text-slate-300 mt-1 max-w-2xl font-medium">
                Selamat datang di galeri prestasimu, <strong className="text-white dark:text-purple-300">{studentName}</strong>! Pantau medali kelulusan, lencana keahlian, grafik progres belajar, dan raih target mingguanmu.
              </p>
            </div>

            {/* Quick Quest Map Jump Button */}
            <Link
              href="/student/lessons"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl
                text-xs font-black text-slate-950 self-start md:self-center
                bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-300
                hover:from-cyan-300 hover:to-indigo-200 shadow-lg shadow-cyan-500/25
                hover:scale-[1.02] active:scale-95 transition-all flex-shrink-0 font-mono"
            >
              <Compass className="w-4 h-4 text-slate-950" />
              <span>Buka Quest Map 🏝️</span>
            </Link>
          </div>

          {/* ── 4 Quick Metric Badges Grid ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-2">
            {/* 1. Level & Title */}
            <div className="rounded-2xl bg-blue-900/40 dark:bg-purple-950/40 border border-blue-300/30 dark:border-purple-500/30 p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/30 dark:bg-purple-500/20 border border-blue-300/40 dark:border-purple-400/40 flex items-center justify-center text-xl flex-shrink-0">
                {advTitle.icon}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-blue-200 dark:text-purple-300 font-bold uppercase tracking-wider">
                  Level {currentLvl}
                </p>
                <p className="text-xs font-black text-white truncate">
                  {advTitle.title}
                </p>
                <p className="text-[9px] text-blue-100/70 dark:text-slate-400 truncate">
                  {gamData?.totalXp ?? 0} Total EXP
                </p>
              </div>
            </div>

            {/* 2. Koin & Harta */}
            <div className="rounded-2xl bg-amber-950/40 border border-amber-500/30 p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-xl flex-shrink-0">
                🪙
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                  Koin Petualang
                </p>
                <p className="text-xs font-black text-white font-mono">
                  {gamData?.coins ?? 0} Koin Emas
                </p>
                <p className="text-[9px] text-slate-300 dark:text-slate-400 truncate">
                  {gamData?.inventory?.length ?? 0} Item Koleksi Pet 🎒
                </p>
              </div>
            </div>

            {/* 3. Sertifikat Kelulusan */}
            <div className="rounded-2xl bg-emerald-950/40 border border-emerald-500/30 p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-xl flex-shrink-0">
                📜
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
                  Sertifikat Modul
                </p>
                <p className="text-xs font-black text-white font-mono">
                  {certificates.length} Gelar Resmi
                </p>
                <p className="text-[9px] text-slate-300 dark:text-slate-400 truncate">
                  Terverifikasi Institusi
                </p>
              </div>
            </div>

            {/* 4. Penguasaan Kurikulum */}
            <div className="rounded-2xl bg-cyan-950/40 border border-cyan-500/30 p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-xl flex-shrink-0">
                💎
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider">
                  Topik Dikuasai
                </p>
                <p className="text-xs font-black text-white font-mono">
                  {completedTopics.length} / {totalPossibleTopics} Topik
                </p>
                <p className="text-[9px] text-slate-300 dark:text-slate-400 truncate font-mono">
                  {masteryPercentage}% Kurikulum
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sub-Tab Filter Pills ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 flex-shrink-0
            ${activeFilter === 'all'
              ? 'bg-blue-600 dark:bg-purple-600 text-white shadow-md shadow-blue-500/25 dark:shadow-purple-600/30 scale-105'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-blue-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-purple-400'
            }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Semua Bagian</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('badges')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 flex-shrink-0
            ${activeFilter === 'badges'
              ? 'bg-blue-600 dark:bg-purple-600 text-white shadow-md shadow-blue-500/25 dark:shadow-purple-600/30 scale-105'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-blue-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-purple-400'
            }`}
        >
          <Award className="w-3.5 h-3.5 text-amber-500" />
          <span>Lencana Pencapaian</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('certs')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 flex-shrink-0
            ${activeFilter === 'certs'
              ? 'bg-blue-600 dark:bg-purple-600 text-white shadow-md shadow-blue-500/25 dark:shadow-purple-600/30 scale-105'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-blue-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-purple-400'
            }`}
        >
          <Trophy className="w-3.5 h-3.5 text-emerald-500" />
          <span>Sertifikat ({certificates.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('targets')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 flex-shrink-0
            ${activeFilter === 'targets'
              ? 'bg-blue-600 dark:bg-purple-600 text-white shadow-md shadow-blue-500/25 dark:shadow-purple-600/30 scale-105'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-blue-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-purple-400'
            }`}
        >
          <Target className="w-3.5 h-3.5 text-cyan-500" />
          <span>Target &amp; Grafik Progres</span>
        </button>
      </div>

      {/* ── SECTION 1: Lencana Pencapaian (Badges Showcase) ── */}
      {(activeFilter === 'all' || activeFilter === 'badges') && (
        <section className="space-y-6">
          {/* 16-Bit Golden Laurel Wreath Badge Showcase */}
          <LaurelWreathBadgeRack
            completedCount={completedTopics.length}
            certificatesCount={certificates.length}
            totalPossibleCount={totalPossibleTopics}
          />

          {/* Gamification & Pet Milestone Badges */}
          <StudentAchievementBadges
            gamData={gamData}
            certificates={certificates}
            completedCount={completedTopics.length}
            totalPossibleCount={totalPossibleTopics}
          />
        </section>
      )}

      {/* ── SECTION 2: Sertifikat Kelulusan Resmi ── */}
      {(activeFilter === 'all' || activeFilter === 'certs') && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gradient-to-r from-blue-200 dark:from-purple-500/20 to-transparent" />
            <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest
              whitespace-nowrap flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Sertifikat Kelulusan Modul Resmi
            </h2>
            <div className="flex-1 h-px bg-gradient-to-l from-blue-200 dark:from-purple-500/20 to-transparent" />
          </div>

          {certificates.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {certificates.map((cert) => (
                <CertificateBadge key={cert.id} cert={cert} variant="full" />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-blue-200/80 dark:border-purple-500/30 p-8 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-3xl flex items-center justify-center mx-auto">
                📜
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Belum Ada Sertifikat Kelulusan
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Taklukkan seluruh lokasi di Quest Map kepulauan kode dan selesaikan Ujian Akhir Modul untuk mengklaim medali sertifikat pertamamu!
                </p>
              </div>
              <Link
                href="/student/lessons"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 shadow-md shadow-amber-500/25 transition-all"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Mulai Ekspedisi di Quest Map</span>
              </Link>
            </div>
          )}
        </section>
      )}

      {/* ── SECTION 3: Progres Belajar & Target Modul ── */}
      {(activeFilter === 'all' || activeFilter === 'targets') && (
        <section className="space-y-4">
          <StudentModuleProgressChart
            completedTopics={completedTopics}
            allModules={allModules}
          />
        </section>
      )}

    </div>
  );
}
