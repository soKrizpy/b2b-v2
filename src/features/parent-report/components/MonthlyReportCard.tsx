'use client';
// src/features/parent-report/components/MonthlyReportCard.tsx
// Interactive monthly report card for the Parent Hub.
//
// Sections:
//   1. Month selector dropdown + Unduh button
//   2. 4 metric cards (reactive to selected month): Kehadiran, Rata-rata Kuis, Topik Selesai, XP
//   3. Attendance progress bar
//   4. Archive download list: every month with sessions → "Unduh Laporan" print button

import { useState, useCallback } from 'react';
import type { MonthlySnapshot } from '@/features/parent-report/queries.student';
import type { ReactNode } from 'react';

interface Props {
  snapshots: MonthlySnapshot[];
  studentName: string;
  /** All-time completed session count (from riwayat) — shown in the Sesi Selesai card */
  totalCompletedSessions: number;
  /** Active module status string e.g. "Tinkercad · 3/5 topik" */
  moduleStatus: string;
  /** Number of earned certificates */
  certCount: number;
  /** Optional slot rendered between attendance bar and archive table */
  children?: ReactNode;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreLabel(score: number) {
  if (score >= 80) return 'Sangat Baik';
  if (score >= 70) return 'Baik';
  if (score >= 50) return 'Cukup';
  return 'Perlu Peningkatan';
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 70) return 'text-cyan-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-500';
}

function rateColor(rate: number) {
  if (rate >= 80) return 'bg-emerald-500';
  if (rate >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

// ── Print report (opens print dialog pre-populated with the month's content) ──

function printMonthReport(snap: MonthlySnapshot, studentName: string) {
  const fmtDateShort = (iso: string) =>
    new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  // Compute engagement score (weighted: 60% attendance + 40% quiz)
  const engagementScore =
    snap.totalScheduled > 0
      ? Math.round(
          snap.attendanceRate * 0.6 +
            (snap.avgQuizScore > 0 ? snap.avgQuizScore : snap.attendanceRate) *
              0.4
        )
      : 0;
  const engagementLabel =
    engagementScore >= 80
      ? 'Sangat Baik'
      : engagementScore >= 60
        ? 'Baik'
        : engagementScore >= 40
          ? 'Cukup'
          : 'Perlu Peningkatan';
  const engagementColor =
    engagementScore >= 80
      ? '#16a34a'
      : engagementScore >= 60
        ? '#eab308'
        : engagementScore >= 40
          ? '#f97316'
          : '#dc2626';

  // SVG semi-circle gauge
  const gaugeRadius = 70;
  const gaugeCircumference = Math.PI * gaugeRadius;
  const gaugeFill = (engagementScore / 100) * gaugeCircumference;
  const gaugeSvg = `
    <svg width="180" height="110" viewBox="0 0 180 110" style="display:block;margin:0 auto;">
      <defs>
        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#dc2626"/>
          <stop offset="35%" style="stop-color:#f97316"/>
          <stop offset="65%" style="stop-color:#eab308"/>
          <stop offset="100%" style="stop-color:#16a34a"/>
        </linearGradient>
      </defs>
      <path d="M 20 100 A 70 70 0 0 1 160 100" fill="none" stroke="#e5e7eb" stroke-width="12" stroke-linecap="round"/>
      <path d="M 20 100 A 70 70 0 0 1 160 100" fill="none" stroke="url(#gaugeGrad)" stroke-width="12" stroke-linecap="round"
        stroke-dasharray="${gaugeFill} ${gaugeCircumference}" />
      <text x="90" y="82" text-anchor="middle" font-size="32" font-weight="900" fill="#1e293b">${engagementScore}%</text>
      <text x="90" y="102" text-anchor="middle" font-size="12" fill="${engagementColor}" font-weight="700">${engagementLabel}</text>
    </svg>`;

  // Teacher feedback snippets
  const teacherNotes = snap.sessions
    .filter((s) => s.progress_report && s.progress_report.trim().length > 0)
    .slice(0, 3);

  const rows = snap.sessions
    .map(
      (s, i) => `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">
        <td style="padding:12px 10px;font-weight:600;color:#64748b;text-align:center;width:36px">${i + 1}</td>
        <td style="padding:12px 10px">
          <div style="font-weight:600;color:#1e293b;font-size:13px">${s.title}</div>
          ${s.topic_title ? `<div style="font-size:11px;color:#7c3aed;margin-top:2px">📘 ${s.topic_title}</div>` : ''}
        </td>
        <td style="padding:12px 10px;color:#475569;font-size:12px;white-space:nowrap">${fmtDateShort(s.meeting_date)}</td>
        <td style="padding:12px 10px;text-align:center">
          <span style="display:inline-block;padding:3px 14px;border-radius:99px;font-size:11px;font-weight:700;
            background:${s.attendance_status === 'hadir' ? '#dcfce7' : s.attendance_status === 'telat' ? '#fef3c7' : '#fef2f2'};
            color:${s.attendance_status === 'hadir' ? '#15803d' : s.attendance_status === 'telat' ? '#b45309' : '#dc2626'};
            border:1px solid ${s.attendance_status === 'hadir' ? '#bbf7d0' : s.attendance_status === 'telat' ? '#fcd34d' : '#fecaca'}">
            ${s.attendance_status === 'hadir' ? '✓ Hadir' : s.attendance_status === 'telat' ? '⏱ Telat' : '✗ Absen'}
          </span>
        </td>
        <td style="padding:12px 10px;text-align:center;font-weight:700;font-size:14px;
          color:${s.quiz_score !== null ? (s.quiz_score >= 80 ? '#16a34a' : s.quiz_score >= 60 ? '#eab308' : '#dc2626') : '#cbd5e1'}">
          ${s.quiz_score !== null ? `${s.quiz_score}` : '—'}
        </td>
      </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Laporan Belajar ${studentName} — ${snap.monthLabel}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1e293b; background: #ffffff; }
    @media print {
      body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .page-break { page-break-after: always; }
    }
  </style>
</head>
<body>
  <!-- ═══ HEADER BAR ═══ -->
  <div style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#4338ca 100%);padding:28px 36px;display:flex;align-items:center;justify-content:space-between">
    <div>
      <div style="font-size:22px;font-weight:900;letter-spacing:1px">
        <span style="color:#ffffff">BITS</span><span style="color:#34d399">2</span><span style="color:#ffffff">BYTES</span>
      </div>
      <div style="color:#c7d2fe;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-top:3px">Laporan Kemajuan Belajar</div>
    </div>
    <div style="text-align:right">
      <div style="color:#ffffff;font-size:15px;font-weight:700">${snap.monthLabel}</div>
      <div style="color:#a5b4fc;font-size:11px;margin-top:2px">Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    </div>
  </div>

  <!-- ═══ STUDENT GREETING ═══ -->
  <div style="padding:24px 36px 8px;border-bottom:1px solid #e2e8f0">
    <div style="font-size:20px;font-weight:800;color:#1e293b">Hello, Orang Tua <span style="color:#4f46e5">${studentName}</span> 👋</div>
    <div style="font-size:13px;color:#64748b;margin-top:4px">Berikut ringkasan kemajuan belajar ${studentName} di Bits2Bytes selama bulan <strong>${snap.monthLabel}</strong>.</div>
  </div>

  <!-- ═══ OVERVIEW: GAUGE + METRICS ═══ -->
  <div style="padding:24px 36px;display:flex;gap:32px;align-items:flex-start">
    <!-- Engagement Gauge -->
    <div style="flex:0 0 220px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:20px 16px;text-align:center">
      <div style="font-size:13px;font-weight:800;color:#1e293b;margin-bottom:12px;letter-spacing:.5px">Overall Engagement</div>
      ${gaugeSvg}
    </div>

    <!-- Metric Cards -->
    <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <!-- Attendance -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:16px 18px">
        <div style="font-size:11px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">📅 Kehadiran</div>
        <div style="font-size:28px;font-weight:900;color:#166534">${snap.attendedCount}<span style="font-size:16px;font-weight:600;color:#4ade80">/${snap.totalScheduled}</span></div>
        <div style="font-size:12px;color:#16a34a;font-weight:600;margin-top:2px">${snap.attendanceRate}% tingkat hadir</div>
      </div>
      <!-- Quiz Score -->
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:14px;padding:16px 18px">
        <div style="font-size:11px;font-weight:700;color:#a16207;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">🧠 Rata-Rata Kuis</div>
        <div style="font-size:28px;font-weight:900;color:#854d0e">${snap.avgQuizScore > 0 ? `${snap.avgQuizScore}%` : '—'}</div>
        <div style="font-size:12px;color:#a16207;font-weight:600;margin-top:2px">${snap.avgQuizScore >= 80 ? 'Sangat Baik ⭐' : snap.avgQuizScore >= 60 ? 'Baik 👍' : snap.avgQuizScore > 0 ? 'Cukup' : 'Belum ada kuis'}</div>
      </div>
      <!-- Topics Completed -->
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:16px 18px">
        <div style="font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">📖 Topik Selesai</div>
        <div style="font-size:28px;font-weight:900;color:#1e40af">${snap.topicsCompleted}</div>
        <div style="font-size:12px;color:#2563eb;font-weight:600;margin-top:2px">topik bulan ini</div>
      </div>
      <!-- XP Earned -->
      <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:14px;padding:16px 18px">
        <div style="font-size:11px;font-weight:700;color:#7e22ce;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">⚡ XP Diperoleh</div>
        <div style="font-size:28px;font-weight:900;color:#6b21a8">${snap.xpEarned}</div>
        <div style="font-size:12px;color:#7e22ce;font-weight:600;margin-top:2px">experience points</div>
      </div>
    </div>
  </div>

  ${
    teacherNotes.length > 0
      ? `
  <!-- ═══ TEACHER FEEDBACK ═══ -->
  <div style="margin:0 36px 20px;background:linear-gradient(135deg,#faf5ff,#f5f3ff);border:1px solid #e9d5ff;border-radius:14px;padding:18px 22px">
    <div style="font-size:12px;font-weight:800;color:#7e22ce;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">💬 Catatan Guru</div>
    ${teacherNotes
      .map(
        (n) => `
      <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:10px">
        <div style="color:#c084fc;font-size:22px;line-height:1;flex-shrink:0;margin-top:2px">❝</div>
        <div>
          <div style="font-size:12px;color:#1e293b;line-height:1.6;font-style:italic">${n.progress_report}</div>
          <div style="font-size:10px;color:#94a3b8;margin-top:3px">— Sesi: ${n.title}</div>
        </div>
      </div>
    `
      )
      .join('')}
  </div>`
      : ''
  }

  <!-- ═══ SESSION TABLE ═══ -->
  <div style="padding:0 36px 20px">
    <div style="font-size:13px;font-weight:800;color:#1e293b;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #4f46e5;display:inline-block;letter-spacing:.5px">
      📋 Detail Sesi Bulan Ini
    </div>
    ${
      snap.sessions.length === 0
        ? '<div style="text-align:center;padding:40px;color:#94a3b8;font-style:italic;background:#f8fafc;border-radius:12px;border:1px dashed #e2e8f0">Tidak ada sesi pada bulan ini.</div>'
        : `<table style="width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
        <thead>
          <tr style="background:linear-gradient(90deg,#4338ca,#6366f1)">
            <th style="padding:12px 10px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#e0e7ff;font-weight:800;width:36px">#</th>
            <th style="padding:12px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#e0e7ff;font-weight:800">Judul Sesi / Topik</th>
            <th style="padding:12px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#e0e7ff;font-weight:800">Tanggal</th>
            <th style="padding:12px 10px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#e0e7ff;font-weight:800">Status</th>
            <th style="padding:12px 10px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#e0e7ff;font-weight:800">Kuis</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`
    }
  </div>

  <!-- ═══ FOOTER ═══ -->
  <div style="margin:12px 36px 0;padding:16px 0;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:10px;color:#94a3b8">
      Laporan ini dibuat otomatis oleh <strong style="color:#4f46e5">Bits2Bytes LMS</strong> · bits2bytes.id
    </div>
    <div style="font-size:10px;color:#94a3b8;display:flex;align-items:center;gap:6px">
      <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#34d399"></span>
      Data diperbarui secara real-time
    </div>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 400);
}

// ── Metric card (replaces old StatTile) ──────────────────────────────────────

function MetricCard({
  icon,
  iconColor,
  iconBg,
  value,
  label,
  sub,
}: {
  icon: string;
  iconColor: string;
  iconBg: string;
  value: string;
  label: string;
  sub?: string;
}) {
  return (
    <div
      className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm
      hover:border-purple-400/50 dark:hover:border-purple-500/50 hover:shadow-md transition-all flex flex-col justify-between min-w-0"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${iconBg}`}
        >
          <i className={`${icon} ${iconColor}`} />
        </div>
        {sub && (
          <span
            className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border
            border-zinc-200 dark:border-zinc-700 px-2.5 py-1 rounded-full text-right truncate max-w-[130px]"
          >
            {sub}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums leading-none">
          {value}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mt-2 font-medium">
          {label}
        </p>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function MonthlyReportCard({
  snapshots,
  studentName,
  totalCompletedSessions,
  moduleStatus,
  certCount,
  children,
}: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  const snap = snapshots[selectedIdx];

  const handlePrint = useCallback(() => {
    if (snap) printMonthReport(snap, studentName);
  }, [snap, studentName]);

  if (!snap) return null;

  const archiveMonths = snapshots.filter((s) => s.totalScheduled > 0);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Month selector + print ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <label
          htmlFor="month-select"
          className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 whitespace-nowrap"
        >
          <i className="fa-solid fa-calendar-days text-purple-500 dark:text-purple-400 mr-1.5" />
          Pilih Bulan
        </label>
        <select
          id="month-select"
          value={selectedIdx}
          onChange={(e) => setSelectedIdx(Number(e.target.value))}
          className="flex-1 max-w-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100
            text-sm px-3.5 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
          {snapshots.map((s, i) => (
            <option
              key={s.monthYear}
              value={i}
              className="dark:bg-zinc-800 dark:text-zinc-100"
            >
              {s.monthLabel}
              {i === 0 ? ' (Bulan Ini)' : ''}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold
            text-white bg-gradient-to-r from-purple-600 to-indigo-600
            shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40
            hover:-translate-y-0.5 active:scale-95 transition-all duration-150 whitespace-nowrap"
        >
          <i className="fa-solid fa-print text-[10px]" />
          Unduh / Cetak
        </button>
      </div>

      {/* ── 4 Metric cards — reactive to selected month ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon="fa-solid fa-calendar-check"
          iconColor="text-cyan-600 dark:text-cyan-400"
          iconBg="bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800"
          value={`${snap.attendanceRate}%`}
          label="Tingkat Kehadiran"
          sub={`${snap.attendedCount}/${snap.totalScheduled} Sesi`}
        />
        <MetricCard
          icon="fa-solid fa-award"
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800"
          value={snap.avgQuizScore > 0 ? `${snap.avgQuizScore}%` : '—'}
          label="Rata-Rata Kuis"
          sub={
            snap.avgQuizScore > 0
              ? scoreLabel(snap.avgQuizScore)
              : 'Belum Ada Kuis'
          }
        />
        <MetricCard
          icon="fa-solid fa-circle-check"
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800"
          value={String(totalCompletedSessions)}
          label="Sesi Selesai"
          sub="Semua Waktu"
        />
        <MetricCard
          icon="fa-solid fa-rocket"
          iconColor="text-purple-600 dark:text-purple-400"
          iconBg="bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800"
          value={certCount > 0 ? `${certCount} Sertifikat` : 'Aktif'}
          label="Status Modul"
          sub={moduleStatus}
        />
      </div>

      {/* ── Attendance bar ── */}
      {snap.totalScheduled > 0 && (
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5">
            <span>Tingkat Kehadiran · {snap.monthLabel}</span>
            <span className={scoreColor(snap.attendanceRate)}>
              {snap.attendanceRate}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${rateColor(snap.attendanceRate)}`}
              style={{ width: `${snap.attendanceRate}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
            {snap.attendedCount} hadir ·{' '}
            {snap.totalScheduled - snap.attendedCount} tidak hadir
            {snap.xpEarned > 0 && ` · ⭐ ${snap.xpEarned} XP`}
            {snap.topicsCompleted > 0 &&
              ` · 📖 ${snap.topicsCompleted} topik selesai`}
          </p>
        </div>
      )}

      {snap.totalScheduled === 0 && (
        <div
          className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800
          bg-zinc-50 dark:bg-zinc-900/40 py-8 text-center text-sm text-zinc-400 dark:text-zinc-500"
        >
          Tidak ada sesi terjadwal pada {snap.monthLabel}.
        </div>
      )}

      {/* ── Injected children (e.g. Riwayat Kelas) ── */}
      {children}

      {/* ── Archive download list ── */}
      {archiveMonths.length > 0 && (
        <div>
          <p className="text-sm font-extrabold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-file-lines text-purple-500 dark:text-purple-400" />
            Arsip Laporan {studentName}
          </p>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 overflow-hidden shadow-sm">
            {/* Table header */}
            <div
              className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3
              border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60"
            >
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                Bulan
              </span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center w-24">
                Kehadiran
              </span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center w-16">
                Nilai
              </span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center w-28">
                Laporan
              </span>
            </div>
            {/* Table rows */}
            {archiveMonths.map((s) => {
              const grade =
                s.avgQuizScore >= 90
                  ? 'A+'
                  : s.avgQuizScore >= 80
                    ? 'A'
                    : s.avgQuizScore >= 70
                      ? 'B+'
                      : s.avgQuizScore >= 60
                        ? 'B'
                        : s.avgQuizScore > 0
                          ? 'C'
                          : '—';
              return (
                <div
                  key={s.monthYear}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3.5
                    border-b border-zinc-100 dark:border-zinc-800/80 last:border-b-0
                    hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors"
                >
                  <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">
                    {s.monthLabel}
                  </span>
                  <span className="w-24 text-center">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-[10px] font-extrabold
                      ${
                        s.attendanceRate >= 80
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : s.attendanceRate >= 50
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                      }`}
                    >
                      {s.attendanceRate}% hadir
                    </span>
                  </span>
                  <span
                    className={`w-16 text-center text-base font-black
                    ${
                      s.avgQuizScore >= 80
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : s.avgQuizScore >= 60
                          ? 'text-amber-600 dark:text-amber-400'
                          : s.avgQuizScore > 0
                            ? 'text-red-500 dark:text-red-400'
                            : 'text-zinc-300 dark:text-zinc-600'
                    }`}
                  >
                    {grade}
                  </span>
                  <span className="w-28 text-center">
                    <button
                      type="button"
                      onClick={() => printMonthReport(s, studentName)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5
                        rounded-lg text-[10px] font-extrabold
                        text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/80
                        hover:bg-purple-100 dark:hover:bg-purple-900/50 hover:text-purple-700 dark:hover:text-purple-200
                        hover:scale-[1.02] active:scale-95 transition-all whitespace-nowrap"
                    >
                      <i className="fa-solid fa-download text-[9px]" />
                      Download
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
