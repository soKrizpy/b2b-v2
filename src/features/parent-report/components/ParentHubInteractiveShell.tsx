'use client';
// src/features/parent-report/components/ParentHubInteractiveShell.tsx
// Interactive Client Shell for Parent Hub:
//   - Tabbed view switcher (Semua, Ringkasan & Kuis, Riwayat & Catatan Guru, Portofolio & Sertifikat)
//   - Executive Insight Spotlight with WhatsApp & copy summary
//   - Integrated MonthlyReportCard, MonthlyQuizChart, RiwayatAccordion, Portfolio & Certificates
//   - Clean responsive layout for parents on phone and desktop

import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Sparkles,
  BarChart3,
  Clock,
  Award,
  Layers,
  Palette,
  ExternalLink,
  CheckCircle2,
  Calendar,
  BookOpen,
} from 'lucide-react';
import type {
  MonthlyRecap,
  MonthlySnapshot,
  PortfolioItem,
  RiwayatModule,
} from '@/features/parent-report/queries.student';
import type { CertificateWithModule } from '@/features/certificates/queries';
import { TIER_CONFIG } from '@/features/certificates/queries';
import { PrintCertificateButton } from '@/features/certificates/components/PrintCertificateButton';
import { formatDate } from '@/lib/formatDate';
import { MonthlyReportCard } from './MonthlyReportCard';
import { MonthlyQuizChart } from './MonthlyQuizChart';
import { RiwayatAccordion } from './RiwayatAccordion';
import {
  ParentExecutiveInsightCard,
  type LatestTeacherNote,
} from './ParentExecutiveInsightCard';

interface Props {
  studentName: string;
  monthly: MonthlyRecap;
  snapshots: MonthlySnapshot[];
  portfolio: PortfolioItem[];
  certificates: CertificateWithModule[];
  riwayat: RiwayatModule[];
  totalCompletedSessions: number;
  latestTeacherNote: LatestTeacherNote | null;
}

type TabKey = 'all' | 'overview' | 'history' | 'portfolio' | 'certificates';

// ── Section Divider ───────────────────────────────────────────────────────────

function SectionDivider({
  icon,
  label,
  count,
}: {
  icon: ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-gradient-to-r from-zinc-200 via-purple-300/40 dark:from-zinc-800 dark:via-purple-500/20 to-transparent" />
      <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 whitespace-nowrap flex items-center gap-2">
        <span className="text-purple-600 dark:text-purple-400">{icon}</span>
        <span>{label}</span>
        {count !== undefined && (
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-mono">
            {count}
          </span>
        )}
      </h2>
      <div className="flex-1 h-px bg-gradient-to-l from-zinc-200 via-purple-300/40 dark:from-zinc-800 dark:via-purple-500/20 to-transparent" />
    </div>
  );
}

// ── Enhanced Portfolio Section ────────────────────────────────────────────────

function PortfolioSection({ items }: { items: PortfolioItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 py-12 text-center">
        <span className="text-4xl mb-3 block select-none">🎨</span>
        <p className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">
          Belum Ada Portofolio Challenge
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
          Karya yang diselesaikan siswa dan telah disetujui guru akan tampil secara otomatis di galeri ini.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <div
          key={item.submissionId}
          className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm
            hover:border-purple-400/60 dark:hover:border-purple-500/50 hover:shadow-md
            transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/80 flex items-center justify-center text-xl select-none group-hover:scale-105 transition-transform">
                🎨
              </div>
              <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${item.status === 'approved' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : item.status === 'needs_revision' ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'}`}>
                {item.status === 'approved' ? <CheckCircle2 className="w-3 h-3" /> : null}
                {item.status === 'approved' ? 'Disetujui' : item.status === 'needs_revision' ? 'Perlu Revisi' : 'Menunggu Review'}
              </span>
            </div>

            <p className="font-extrabold text-zinc-900 dark:text-zinc-100 text-sm leading-snug group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {item.challengeTitle}
            </p>

            {item.topicTitle && (
              <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mt-1.5 flex items-center gap-1">
                <BookOpen className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{item.topicTitle}</span>
              </p>
            )}

            {item.submittedAt && (
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Dikirim {formatDate(item.submittedAt)}{item.approvedAt ? ` · Disetujui ${formatDate(item.approvedAt)}` : ''}
              </p>
            )}
          </div>

          <div className="mt-4 pt-3.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            {item.submissionUrl ? (
              <a
                href={item.submissionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
              >
                <span>Buka Proyek Siswa</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <span className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                Link tersimpan di sistem
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Enhanced Certificate Cards ────────────────────────────────────────────────

function CertificateCards({ certs }: { certs: CertificateWithModule[] }) {
  if (certs.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 py-12 text-center">
        <span className="text-4xl mb-3 block select-none">🎖</span>
        <p className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">
          Belum Ada Sertifikat Kelulusan
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
          Siswa akan memperoleh sertifikat resmi setelah menuntaskan seluruh materi modul dan ujian akhir kompetensi.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {certs.map((cert) => {
        const cfg = TIER_CONFIG[cert.tier as keyof typeof TIER_CONFIG];
        return (
          <div
            key={cert.id}
            className="bg-gradient-to-r from-amber-50/80 via-white to-purple-50/80
              dark:from-amber-950/20 dark:via-zinc-900 dark:to-purple-950/20
              border border-amber-200 dark:border-amber-700/50 rounded-3xl p-6 shadow-sm
              hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-4xl select-none">{cfg.medal}</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-mono">
                  #{cert.certificate_number}
                </span>
              </div>
              <div className="mt-3">
                <p className={`font-black text-lg ${cfg.color}`}>
                  {cfg.label} Certificate
                </p>
                {cert.module_title && (
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 mt-1 truncate">
                    {cert.module_title}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span className={`text-2xl font-black font-mono tabular-nums ${cfg.color}`}>
                  {cert.score}
                  <span className="text-xs font-normal opacity-60">/100</span>
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(cert.issued_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <p className={`text-xs mt-2 ${cfg.color} opacity-85 leading-relaxed font-medium`}>
                {cfg.description}
              </p>
            </div>

            <div className="mt-5 pt-3.5 border-t border-amber-100 dark:border-zinc-800 flex items-center justify-end">
              <PrintCertificateButton label={cfg.label} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Shell Component ──────────────────────────────────────────────────────

export function ParentHubInteractiveShell({
  studentName,
  monthly,
  snapshots,
  portfolio,
  certificates,
  riwayat,
  totalCompletedSessions,
  latestTeacherNote,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  return (
    <div className="flex flex-col gap-6">
      {/* ── Executive Insight Card (WhatsApp, Quick Copy, Teacher Note Spotlight) ── */}
      <ParentExecutiveInsightCard
        studentName={studentName}
        monthly={monthly}
        totalCompletedSessions={totalCompletedSessions}
        certCount={certificates.length}
        portfolioCount={portfolio.length}
        latestTeacherNote={latestTeacherNote}
        onJumpToTab={(tab) => {
          if (tab === 'achievements') setActiveTab('portfolio');
          else if (tab === 'history') setActiveTab('history');
          else if (tab === 'chart') setActiveTab('overview');
          else setActiveTab('all');
        }}
      />

      {/* ── Sticky / Fast View Switcher Tabs ── */}
      <div className="sticky top-2 z-20 p-1.5 rounded-2xl bg-white/90 dark:bg-zinc-900/90 border border-zinc-200/90 dark:border-zinc-800/90 shadow-md backdrop-blur-md flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Semua Bagian</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Ringkasan & Grafik Kuis</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Riwayat & Catatan Guru</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-mono">
            {totalCompletedSessions}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('portfolio')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'portfolio'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Portofolio Karya</span>
          {portfolio.length > 0 && <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-mono">{portfolio.length}</span>}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('certificates')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'certificates'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Sertifikat</span>
          {certificates.length > 0 && <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-mono">{certificates.length}</span>}
        </button>
      </div>

      {/* ── Content Sections ── */}

      {/* Section 1: Ringkasan Bulan Ini & Grafik Kuis */}
      {(activeTab === 'all' || activeTab === 'overview') && (
        <section className="space-y-4">
          <SectionDivider
            icon={<BarChart3 className="w-4 h-4" />}
            label="Ringkasan Bulan Ini & Analitik"
          />
          <MonthlyReportCard
            snapshots={snapshots}
            studentName={studentName}
            totalCompletedSessions={totalCompletedSessions}
            moduleStatus={monthly.moduleStatus}
            certCount={certificates.length}
          >
            {/* ── Grafik Kuis Bulanan ── */}
            <div className="pt-2">
              <MonthlyQuizChart snapshots={snapshots} />
            </div>

            {/* If in 'all' view, Riwayat Kelas is rendered below or here */}
            {activeTab === 'all' && (
              <div className="pt-4">
                <SectionDivider
                  icon={<Clock className="w-4 h-4" />}
                  label="Riwayat Kelas & Evaluasi Guru"
                  count={totalCompletedSessions}
                />
                <div className="mt-4">
                  <RiwayatAccordion modules={riwayat} />
                </div>
              </div>
            )}
          </MonthlyReportCard>
        </section>
      )}

      {/* Section 2: Dedicated Riwayat Kelas view */}
      {activeTab === 'history' && (
        <section className="space-y-4">
          <SectionDivider
            icon={<Clock className="w-4 h-4" />}
            label="Riwayat Kelas & Catatan Evaluasi Guru"
            count={totalCompletedSessions}
          />
          <RiwayatAccordion modules={riwayat} />
        </section>
      )}

      {/* Section 3: Portofolio Challenge */}
      {(activeTab === 'all' || activeTab === 'portfolio') && (
        <section className="space-y-4">
          <SectionDivider
            icon={<Palette className="w-4 h-4" />}
            label="Portofolio Karya Siswa"
            count={portfolio.length}
          />
          <PortfolioSection items={portfolio} />
        </section>
      )}

      {/* Section 4: Sertifikat Kelulusan */}
      {(activeTab === 'all' || activeTab === 'certificates') && (
        <section className="space-y-4">
          <SectionDivider
            icon={<Award className="w-4 h-4" />}
            label="Sertifikat Kelulusan Resmi"
            count={certificates.length}
          />
          <CertificateCards certs={certificates} />
        </section>
      )}
    </div>
  );
}
