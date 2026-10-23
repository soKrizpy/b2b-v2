'use client';
// src/features/quiz/components/SimplifiedWaypointHistory.tsx
// Riwayat Waypoint Pembelajaran yang Disederhanakan:
// - Menampilkan seluruh topik perjalanan belajar sebagai riwayat kronologis yang rapi dan mudah diakses
// - Filter cepat: Semua, Selesai Ditaklukkan, Siap Kuis, Sedang Berlangsung, Terkunci
// - Live search instan berdasarkan judul topik atau nomor pertemuan
// - Aksi langsung: Pelajari Materi, Kerjakan Kuis, Ulangi Kuis, serta Ujian Akhir (Boss Trial)

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Lock,
  Zap,
  Play,
  RotateCcw,
  BookOpen,
  Search,
  Crown,
  Sparkles,
  Calendar,
  Flame,
  Award,
} from 'lucide-react';
import type { QuestTopicNode } from '@/features/quiz/questMapQueries';
import type { CertificateWithModule } from '@/features/certificates/queries';

interface Props {
  moduleTitle: string;
  moduleId: number;
  nodes: QuestTopicNode[];
  activeNode?: QuestTopicNode;
  moduleComplete?: boolean;
  hasFinal?: boolean;
  cert?: { tier: string; score: number; certificate_number: string } | CertificateWithModule | null;
  onOpenQuiz: (node: QuestTopicNode) => void;
  onSelectFinalBoss: () => void;
}

export function SimplifiedWaypointHistory({
  moduleTitle,
  moduleId,
  nodes,
  activeNode,
  moduleComplete,
  hasFinal,
  cert,
  onOpenQuiz,
  onSelectFinalBoss,
}: Props) {
  const [filter, setFilter] = useState<'all' | 'completed' | 'needs_quiz' | 'active' | 'locked'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Counts for filter pills
  const completedCount = nodes.filter((n) => n.status === 'COMPLETED').length;
  const needsQuizCount = nodes.filter((n) => n.status === 'NEEDS_QUIZ').length;
  const activeCount    = nodes.filter((n) => n.status === 'ACTIVE_NEXT').length;
  const lockedCount    = nodes.filter((n) => n.status === 'LOCKED').length;

  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      // Status filter
      if (filter === 'completed' && node.status !== 'COMPLETED') return false;
      if (filter === 'needs_quiz' && node.status !== 'NEEDS_QUIZ') return false;
      if (filter === 'active' && node.status !== 'ACTIVE_NEXT') return false;
      if (filter === 'locked' && node.status !== 'LOCKED') return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = node.topic.title.toLowerCase().includes(q);
        const sessionMatch = `pertemuan ${node.sessionNumber}`.includes(q) || `sesi ${node.sessionNumber}`.includes(q);
        if (!titleMatch && !sessionMatch) return false;
      }

      return true;
    });
  }, [nodes, filter, searchQuery]);

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* ── Riwayat Header & Quick Stats ── */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                RIWAYAT LENGKAP PEMBELAJARAN
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white">
              Riwayat Perjalanan: {moduleTitle}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Akses cepat seluruh riwayat topik, catatan kelulusan materi, serta kuis yang telah dan akan dipelajari.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-center">
              <p className="text-[10px] font-bold uppercase text-emerald-400 font-mono">Ditaklukkan</p>
              <p className="text-sm font-black text-white font-mono">{completedCount}/{nodes.length}</p>
            </div>
            {needsQuizCount > 0 && (
              <div className="px-3.5 py-2 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-center animate-pulse">
                <p className="text-[10px] font-bold uppercase text-amber-300 font-mono">Perlu Kuis</p>
                <p className="text-sm font-black text-amber-200 font-mono">{needsQuizCount}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Search Bar & Filter Chips ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Live Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari topik atau nomor pertemuan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Semua ({nodes.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                filter === 'completed'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Ditaklukkan ({completedCount})
            </button>
            {needsQuizCount > 0 && (
              <button
                type="button"
                onClick={() => setFilter('needs_quiz')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                  filter === 'needs_quiz'
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/30'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Siap Kuis ({needsQuizCount})
              </button>
            )}
            <button
              type="button"
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                filter === 'active'
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Aktif ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('locked')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                filter === 'locked'
                  ? 'bg-slate-700 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Terkunci ({lockedCount})
            </button>
          </div>
        </div>
      </div>

      {/* ── Chronological Waypoint Timeline List ── */}
      <div className="space-y-3">
        {filteredNodes.length === 0 ? (
          <div className="text-center py-12 rounded-3xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs">
            Tidak ada topik riwayat yang cocok dengan filter atau kata kunci pencarian.
          </div>
        ) : (
          filteredNodes.map((node) => {
            const globalIndex = nodes.indexOf(node);
            const isCompleted = node.status === 'COMPLETED';
            const isNeedsQuiz = node.status === 'NEEDS_QUIZ';
            const isActive    = node.status === 'ACTIVE_NEXT';
            const isLocked    = node.status === 'LOCKED';
            const isCurrentHeroLocation = activeNode?.topic.id === node.topic.id;

            return (
              <div
                key={node.topic.id}
                className={`rounded-2xl p-4 sm:p-5 transition-all duration-200 border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isCurrentHeroLocation
                    ? 'bg-gradient-to-r from-cyan-950/60 via-slate-900 to-indigo-950/60 border-cyan-400/80 shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-400/30'
                    : isCompleted
                    ? 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/40'
                    : isNeedsQuiz
                    ? 'bg-gradient-to-r from-amber-950/40 to-slate-900 border-amber-500/50 shadow-md shadow-amber-950/30'
                    : isActive
                    ? 'bg-slate-900/90 border-cyan-500/40'
                    : 'bg-slate-950/50 border-slate-800/60 opacity-80'
                }`}
              >
                {/* Left: Milestone Badge & Topic Details */}
                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Waypoint Number Pill */}
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black font-mono text-sm flex-shrink-0 shadow-md ${
                    isCompleted
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
                      : isNeedsQuiz
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 animate-pulse'
                      : isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}>
                    {isCompleted ? '✓' : globalIndex + 1}
                  </div>

                  <div className="min-w-0 space-y-1">
                    {/* Status Pill & Metadata */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400 font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        Pertemuan #{node.sessionNumber}
                      </span>
                      <span>·</span>

                      {/* Status Badges */}
                      {isCompleted ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Ditaklukkan {node.bestScore > 0 ? `· Nilai ${node.bestScore}` : ''}
                        </span>
                      ) : isNeedsQuiz ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-400" />
                          Siap Kuis Pemahaman
                        </span>
                      ) : isActive ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          Materi Aktif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Terkunci
                        </span>
                      )}

                      {/* Stars */}
                      {isCompleted && (
                        <span className="text-amber-400 text-xs tracking-widest font-mono">
                          {'★'.repeat(node.stars || 3)}
                        </span>
                      )}
                    </div>

                    {/* Topic Title */}
                    <h4 className="text-sm sm:text-base font-extrabold text-white leading-snug">
                      {node.topic.title}
                    </h4>

                    {/* Subtitle helper */}
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-1">
                      {isCompleted
                        ? 'Materi telah dipelajari tuntas dan kuis pemahaman berhasil diselesaikan.'
                        : isNeedsQuiz
                        ? 'Guru telah menyelesaikan sesi ini! Kerjakan kuis untuk mendapatkan bintang dan EXP.'
                        : isActive
                        ? 'Pelajari materi persiapan sebelum sesi atau review materi bersama guru.'
                        : 'Materi topik ini akan terbuka secara otomatis pada pertemuan mendatang.'}
                    </p>
                  </div>
                </div>

                {/* Right: Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                  {/* Buka Materi Pelajaran */}
                  <Link
                    href={`/student/lessons/topic/${node.topic.id}`}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isLocked
                        ? 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/60'
                        : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-600'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Buka Materi</span>
                  </Link>

                  {/* Kuis Actions */}
                  {isNeedsQuiz ? (
                    <button
                      type="button"
                      onClick={() => onOpenQuiz(node)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-slate-950
                        bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300
                        shadow-md shadow-amber-500/30 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Mulai Kuis</span>
                    </button>
                  ) : isCompleted && node.hasQuiz && node.attemptsUsed < 2 ? (
                    <button
                      type="button"
                      onClick={() => onOpenQuiz(node)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-950/40 hover:bg-amber-900/40 border border-amber-500/30 transition-colors"
                      title="Ulangi kuis untuk memperbaiki nilai (maks 2x percobaan)"
                    >
                      <RotateCcw className="w-3 h-3 text-amber-400" />
                      <span>Ulangi ({2 - node.attemptsUsed}x)</span>
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}

        {/* ── Final Boss Assessment Milestone in History ── */}
        {hasFinal && (
          <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-red-950/40 via-amber-950/30 to-slate-900 border-2 border-red-500/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-400/40 flex items-center justify-center text-2xl flex-shrink-0">
                👑
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 font-mono flex items-center gap-1">
                    <Flame className="w-3 h-3 text-red-400" />
                    PUNCAK KELULUSAN
                  </span>
                  {cert && (
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-mono">
                      SERTIFIKAT TIER {cert.tier.toUpperCase()} DIRAIH
                    </span>
                  )}
                </div>
                <h4 className="text-sm sm:text-base font-black text-white">
                  Ujian Akhir Modul &amp; Sertifikat Kelulusan
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {cert
                    ? `Selamat! Kamu telah lulus modul ini dengan nilai ${cert.score}. Nomor sertifikat: ${cert.certificate_number}`
                    : moduleComplete
                    ? 'Semua topik telah ditaklukkan! Ujian akhir siap dikerjakan untuk mengklaim sertifikat kelulusan resmimu.'
                    : 'Selesaikan seluruh topik di atas untuk membuka gerbang ujian akhir modul.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center flex-shrink-0">
              {cert ? (
                <Link
                  href="/student/achievements"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 shadow-md shadow-amber-500/25 transition-all"
                >
                  <Award className="w-4 h-4 text-slate-950" />
                  <span>Lihat Sertifikat</span>
                </Link>
              ) : moduleComplete ? (
                <Link
                  href={`/student/assessment/${moduleId}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-lg shadow-red-600/30 animate-pulse transition-all"
                >
                  <Crown className="w-4 h-4" />
                  <span>Mulai Ujian Akhir</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onSelectFinalBoss}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-400 bg-slate-800/60 border border-slate-700/60"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Detail Syarat Kelulusan</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
