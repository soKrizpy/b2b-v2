'use client';
// src/features/parent-report/components/ParentExecutiveInsightCard.tsx
// Executive Summary & Quick Action Card for parents:
// - Performance health badge & attendance recap
// - Latest teacher evaluation highlight (so parents don't have to hunt in accordions)
// - WhatsApp sharing & 1-click clipboard summary copy
// - Next learning target & milestone motivation

import { useState } from 'react';
import {
  Sparkles,
  Share2,
  Copy,
  Check,
  MessageSquareQuote,
  TrendingUp,
  ShieldCheck,
  Award,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import type { MonthlyRecap } from '@/features/parent-report/queries.student';
import { formatDate } from '@/lib/formatDate';

export interface LatestTeacherNote {
  title: string;
  topicTitle: string | null;
  date: string;
  note: string;
  attendance: string;
}

interface Props {
  studentName: string;
  monthly: MonthlyRecap;
  totalCompletedSessions: number;
  certCount: number;
  portfolioCount: number;
  latestTeacherNote: LatestTeacherNote | null;
  onJumpToTab?: (tab: 'overview' | 'chart' | 'history' | 'achievements') => void;
}

export function ParentExecutiveInsightCard({
  studentName,
  monthly,
  totalCompletedSessions,
  certCount,
  portfolioCount,
  latestTeacherNote,
  onJumpToTab,
}: Props) {
  const [copied, setCopied] = useState(false);

  // Compute status headline
  const getStatusInsight = () => {
    if (monthly.attendanceRate >= 90 && monthly.avgQuizScore >= 80) {
      return {
        badge: 'Performa Unggul & Prima 🌟',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
        summary: `${studentName} menunjukkan kedisiplinan dan pemahaman konsep yang sangat tinggi pada modul saat ini.`,
      };
    }
    if (monthly.attendanceRate >= 75) {
      return {
        badge: 'Progres Sangat Baik 🚀',
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
        summary: `${studentName} konsisten mengikuti pembelajaran dan aktif menyelesaikan sesi secara teratur.`,
      };
    }
    return {
      badge: 'Perlu Pendampingan 💡',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
      summary: `Dukungan orang tua di rumah akan sangat membantu ${studentName} mengejar target modul yang tertunda.`,
    };
  };

  const insight = getStatusInsight();

  // Generate formatted WhatsApp & Copy text
  const generateShareText = () => {
    const lines = [
      `📊 *Laporan Perkembangan Belajar Bits2Bytes*`,
      `👤 *Siswa:* ${studentName}`,
      `📅 *Bulan:* ${monthly.monthLabel}`,
      `────────────────────────`,
      `✅ *Kehadiran:* ${monthly.attendanceRate}% (${monthly.attendedCount}/${monthly.totalScheduled} sesi)`,
      `🎯 *Rata-rata Kuis:* ${monthly.avgQuizScore > 0 ? `${monthly.avgQuizScore}/100` : 'Belum ada kuis'}`,
      `📘 *Status Modul:* ${monthly.moduleStatus}`,
      `⭐ *Total Sesi Selesai:* ${totalCompletedSessions} sesi`,
      `🏆 *Sertifikat & Portofolio:* ${certCount} Sertifikat · ${portfolioCount} Karya Challenge`,
    ];

    if (latestTeacherNote) {
      lines.push(
        `────────────────────────`,
        `💬 *Catatan Evaluasi Guru Terbaru:*`,
        `"${latestTeacherNote.note.replace(/\n+/g, ' ')}"`,
        `(${latestTeacherNote.title} · ${formatDate(latestTeacherNote.date)})`
      );
    }

    lines.push(
      `────────────────────────`,
      `Pantau detail laporan lengkap di portal Parent Hub Bits2Bytes.`
    );

    return lines.join('\n');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateShareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(generateShareText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="rounded-3xl border border-indigo-100 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 shadow-xl shadow-indigo-500/5 backdrop-blur-sm overflow-hidden p-6 sm:p-7 transition-all">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
            <Sparkles className="w-5 h-5 text-purple-100" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
                Sorotan Eksekutif Orang Tua
              </h2>
              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${insight.badgeColor}`}>
                {insight.badge}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Rangkuman terpadu kemajuan {studentName} periode {monthly.monthLabel}
            </p>
          </div>
        </div>

        {/* WhatsApp & Copy Quick Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold
              bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-emerald-600/30
              active:scale-95 transition-all"
            title="Kirim rangkuman rapi ke WhatsApp keluarga"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Kirim WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              copied
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-700'
            }`}
            title="Salin rangkuman teks ke clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Rangkuman</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Key Highlights Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
        {/* Card 1: Status Pembelajaran */}
        <div className="rounded-2xl p-4 bg-gradient-to-br from-indigo-50/70 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-100/80 dark:border-indigo-900/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400 mb-2">
              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" /> Fokus Belajar
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/80 dark:bg-zinc-800/80 border border-indigo-200 dark:border-indigo-800">
                Bulan Ini
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium mt-1">
              {insight.summary}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-indigo-100/60 dark:border-indigo-900/30 flex items-center justify-between text-[11px] text-indigo-900 dark:text-indigo-300 font-semibold">
            <span>Target modul:</span>
            <span className="truncate max-w-[140px] text-right font-bold">{monthly.moduleStatus}</span>
          </div>
        </div>

        {/* Card 2: Kehadiran & Nilai Sinergi */}
        <div className="rounded-2xl p-4 bg-gradient-to-br from-cyan-50/70 to-blue-50/50 dark:from-cyan-950/20 dark:to-blue-950/20 border border-cyan-100/80 dark:border-cyan-900/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-cyan-700 dark:text-cyan-400 mb-2">
              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Kedisiplinan Sesi
              </span>
              <span className="text-base font-extrabold font-mono text-cyan-800 dark:text-cyan-200">
                {monthly.attendanceRate}%
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300">
              <div className="flex justify-between">
                <span>Total Sesi Diikuti:</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-100 font-mono">
                  {monthly.attendedCount} dari {monthly.totalScheduled} Sesi
                </span>
              </div>
              <div className="flex justify-between">
                <span>Rata-Rata Kuis:</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-100 font-mono">
                  {monthly.avgQuizScore > 0 ? `${monthly.avgQuizScore}%` : 'Belum ada kuis'}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-cyan-100/60 dark:border-cyan-900/30 flex items-center justify-between text-[11px] text-cyan-900 dark:text-cyan-300 font-semibold">
            <span>Total Pengalaman:</span>
            <span className="font-bold font-mono">⭐ {monthly.xpThisMonth} XP didapat</span>
          </div>
        </div>

        {/* Card 3: Prestasi & Portofolio */}
        <div className="rounded-2xl p-4 bg-gradient-to-br from-amber-50/70 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-100/80 dark:border-amber-900/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-2">
              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4" /> Prestasi & Karya
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/80 dark:bg-zinc-800/80 border border-amber-200 dark:border-amber-800">
                Terverifikasi
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300">
              <div className="flex justify-between">
                <span>Sertifikat Kelulusan:</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-100 font-mono">{certCount} Terbit</span>
              </div>
              <div className="flex justify-between">
                <span>Karya Portofolio:</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-100 font-mono">{portfolioCount} Disetujui</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-amber-100/60 dark:border-amber-900/30 flex items-center justify-between text-[11px]">
            {onJumpToTab ? (
              <button
                type="button"
                onClick={() => onJumpToTab('achievements')}
                className="text-amber-800 dark:text-amber-300 hover:text-amber-900 font-bold inline-flex items-center gap-1 group"
              >
                <span>Lihat Sertifikat & Portofolio</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ) : (
              <span className="text-amber-800 dark:text-amber-300 font-medium">Koleksi karya siswa aktif</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Latest Teacher Note Highlight Box ── */}
      {latestTeacherNote ? (
        <div className="mt-5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/60 to-purple-50 dark:from-purple-950/30 dark:via-zinc-900 dark:to-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600/10 dark:bg-purple-400/10 border border-purple-300 dark:border-purple-700/60 flex items-center justify-center flex-shrink-0 text-purple-600 dark:text-purple-400 mt-0.5">
              <MessageSquareQuote className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/80 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                    Catatan Guru Terbaru
                  </span>
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                    {latestTeacherNote.title}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                  {formatDate(latestTeacherNote.date)}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed italic mt-2 bg-white/70 dark:bg-zinc-800/60 p-3 rounded-xl border border-purple-100 dark:border-purple-900/40">
                &ldquo;{latestTeacherNote.note}&rdquo;
              </p>
              {latestTeacherNote.topicTitle && (
                <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-2 flex items-center gap-1.5">
                  <span>Materi Pembahasan:</span>
                  <span className="underline decoration-purple-300 underline-offset-2">{latestTeacherNote.topicTitle}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-dashed border-zinc-200 dark:border-zinc-800 p-4 text-center">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Catatan guru untuk sesi mendatang akan ditampilkan secara otomatis di sini setelah pertemuan selesai.
          </p>
        </div>
      )}
    </div>
  );
}
