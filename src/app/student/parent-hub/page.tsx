// src/app/student/parent-hub/page.tsx
// 👨‍👩‍👧 Parent Hub — student progress report (billing moved to Town Square modal).
// Upgraded for high parent efficiency:
//   1. Hero header with child identity & active period
//   2. Executive Insight Spotlight: performance rating, latest teacher evaluation quote, 1-click WhatsApp share & copy summary
//   3. Fast tab navigation (Semua, Ringkasan & Kuis, Riwayat & Catatan Guru, Portofolio & Sertifikat)
//   4. Monthly Graphic Report Card + 12-month archive download + WhatsApp export
//   5. Riwayat Kelas with live search, filters (attendance, teacher notes, high quiz), and bulk note expander
//   6. Portofolio Challenge verified gallery & Certificate preview/print

import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getStudentHubBundle } from '@/features/parent-report/queries.student';
import {
  ParentHubInteractiveShell,
} from '@/features/parent-report/components/ParentHubInteractiveShell';
import type { LatestTeacherNote } from '@/features/parent-report/components/ParentExecutiveInsightCard';

export const metadata: Metadata = { title: '👨‍👩‍👧 Parent Hub — Bits2Bytes' };
export const dynamic = 'force-dynamic';

export default async function ParentHubPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  // Fetch unified bundle in 2 parallel batches
  const { hubData: hub, snapshots } = await getStudentHubBundle(user.id);

  const { studentName, monthly, portfolio, certificates, riwayat } = hub;
  // Count sessions the student actually attended, not every completed meeting assigned to them.
  const totalCompletedSessions = riwayat.reduce((sum, module) => sum + module.completed_count, 0);

  // Extract the latest teacher note from session history
  let latestTeacherNote: LatestTeacherNote | null = null;
  for (const mod of riwayat) {
    for (const s of mod.sessions) {
      if (s.progress_report && s.progress_report.trim().length > 0) {
        if (!latestTeacherNote || new Date(s.meeting_date) > new Date(latestTeacherNote.date)) {
          latestTeacherNote = {
            title: s.title,
            topicTitle: s.topic_title,
            date: s.meeting_date,
            note: s.progress_report.trim(),
            attendance: s.attendance_status,
          };
        }
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up pb-12">
      {/* ── Hero ── */}
      <div
        className="relative rounded-3xl overflow-hidden
        bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700
        border border-purple-400/30 p-6 sm:p-8 text-white
        shadow-xl shadow-purple-500/15"
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-purple-200 mb-1 flex items-center gap-1.5">
              <i className="fa-solid fa-users text-purple-200" /> Parent Hub
            </p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Laporan Perkembangan
            </h1>
            <p className="text-sm text-purple-100 mt-1 font-medium">
              {studentName} · {monthly.monthLabel}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-right">
              <p className="text-[10px] text-purple-200 font-bold uppercase tracking-wider">
                Total Sesi Dituntaskan
              </p>
              <p className="text-lg font-black text-white font-mono">
                {totalCompletedSessions} <span className="text-xs font-normal opacity-80">Sesi</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Interactive Shell with Fast Tabs, Executive Insights & Sub-sections ── */}
      <ParentHubInteractiveShell
        studentName={studentName}
        monthly={monthly}
        snapshots={snapshots}
        portfolio={portfolio}
        certificates={certificates}
        riwayat={riwayat}
        totalCompletedSessions={totalCompletedSessions}
        latestTeacherNote={latestTeacherNote}
      />
    </div>
  );
}
