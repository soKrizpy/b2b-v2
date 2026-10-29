// src/app/parent/report/page.tsx
// Public token-gated parent report page.
// No authentication required — access is controlled by the token alone.
// Middleware PUBLIC_PATHS includes '/parent/report' so auth is bypassed.
//
// URL: /parent/report?token=<uuid-token>
//
// Next.js 15: searchParams is a Promise.

import type { Metadata } from 'next';
import { getParentReportData } from '@/features/parent-report/queries';
import { ParentReportView } from '@/features/parent-report/components/ParentReportView';
import { ParentReportMotion } from '@/features/parent-report/components/ParentReportMotion';

export const metadata: Metadata = { title: 'Laporan Perkembangan Siswa — Bits2Bytes' };

// Never cache this page — token validity is time-sensitive.
export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ token?: string }> };

export default async function ParentReportPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const data = await getParentReportData(token);

  // ── Invalid / expired token ────────────────────────────────────────────────
  if (!data) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#080d18] dark:text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-5 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 ring-1 ring-red-200 text-3xl mx-auto">
            🔒
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Tautan Tidak Valid</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Tautan laporan ini sudah kadaluarsa atau tidak valid.
              Silakan hubungi pengajar untuk mendapatkan tautan baru.
            </p>
          </div>
          {/* Do NOT expose any student data in the error state */}
        </div>
      </main>
    );
  }

  // ── Valid token — render report ────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#080d18] dark:text-slate-100">
      {/* Branded top bar (no navigation — public page) */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-xl dark:border-slate-700/70 dark:bg-[#0b1020]/90">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 h-14 flex items-center gap-2.5">
          <span className="text-xl">🎓</span>
          <span className="font-bold text-slate-900 text-sm">Bits2Bytes LMS</span>
          <span className="text-slate-300 text-xs ml-auto">Laporan Orang Tua</span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        <ParentReportView data={data} />
      </div>
    </main>
  );
}
