// src/features/parent-report/components/ParentReportView.tsx
// Server Component — renders the parent report for a validated token.
// No auth required; data is already validated and token-gated by the page.

import { formatDate, formatDateTime } from '@/lib/formatDate';
import { CertificateBadge } from '@/features/certificates/components/CertificateBadge';
import { ShieldCheck, GraduationCap, CheckCircle2, BookOpen, Star, Award, CalendarDays } from 'lucide-react';
import type { ParentReportData, InvoiceSummary } from '../queries';

interface ParentReportViewProps {
  data: ParentReportData;
}

// ── Billing card ──────────────────────────────────────────────────────────────

function BillingCard({ invoice, attendedCount }: {
  invoice: InvoiceSummary;
  attendedCount: number;
}) {
  const isPaid    = invoice.status === 'paid';
  const isDraft   = invoice.status === 'draft';
  const skipped   = invoice.total_meetings - invoice.attended_meetings;

  const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

  return (
    <section aria-label="Tagihan bulan ini">
      <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">🧾</span> Tagihan — {invoice.month_year}
      </h2>

      <div className={`rounded-2xl overflow-hidden ring-1 shadow-sm
        ${isPaid
          ? 'ring-emerald-200 bg-white'
          : 'ring-indigo-200 bg-white'}`}>

        {/* Status header */}
        <div className={`px-5 py-3 flex items-center justify-between
          ${isPaid
            ? 'bg-emerald-50 border-b border-emerald-100'
            : isDraft
            ? 'bg-slate-50 border-b border-slate-100'
            : 'bg-indigo-600 text-white'}`}>
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden="true">
              {isPaid ? '✅' : isDraft ? '📋' : '📨'}
            </span>
            <span className={`text-sm font-bold
              ${isPaid ? 'text-emerald-800' : isDraft ? 'text-slate-600' : 'text-white'}`}>
              {isPaid ? 'Tagihan Lunas' : isDraft ? 'Tagihan Sedang Disiapkan' : `Tagihan Bulan ${invoice.month_year}`}
            </span>
          </div>
          <span className={`text-xs font-extrabold px-3 py-1 rounded-full ring-1
            ${isPaid
              ? 'bg-emerald-100 text-emerald-700 ring-emerald-300'
              : isDraft
              ? 'bg-slate-100 text-slate-500 ring-slate-300'
              : 'bg-white/20 text-white ring-white/30'}`}>
            {isPaid ? 'LUNAS' : isDraft ? 'DRAFT' : 'BELUM DIBAYAR'}
          </span>
        </div>

        {/* Billing breakdown table */}
        <div className="px-5 py-4 space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">
            Rincian Kehadiran
          </p>

          {/* Row: attended */}
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[10px]">✓</span>
              Hadir ({invoice.attended_meetings} sesi)
            </span>
            <span className="font-semibold text-slate-800 tabular-nums">
              {invoice.attended_meetings} × {fmt(invoice.price_per_meeting)}
              {' = '}
              <span className="text-emerald-700">{fmt(invoice.attended_meetings * invoice.price_per_meeting)}</span>
            </span>
          </div>

          {/* Row: skipped */}
          {skipped > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">–</span>
                Tidak Hadir / Izin ({skipped} sesi)
              </span>
              <span className="font-semibold text-slate-400 tabular-nums">
                Rp 0
              </span>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-slate-100 my-1" />

          {/* Total */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">Total Tagihan</span>
            <span className="text-xl font-extrabold text-slate-900 tabular-nums">
              {fmt(invoice.total_amount)}
            </span>
          </div>

          {/* Rate note */}
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Tarif per sesi: {fmt(invoice.price_per_meeting)} ·
            Total sesi terjadwal bulan ini: {invoice.total_meetings}
          </p>
        </div>

        {/* Payment instructions — only when sent/unpaid */}
        {!isPaid && !isDraft && invoice.bank_account && (
          <div className="px-5 pb-5">
            <div className="rounded-xl bg-indigo-50 ring-1 ring-indigo-200 px-4 py-3.5">
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-600 mb-2">
                Transfer ke Rekening
              </p>
              <p className="text-sm font-semibold text-indigo-900 break-all">
                {invoice.bank_account}
              </p>
              <p className="text-[11px] text-indigo-500 mt-2 leading-relaxed">
                Mohon transfer sesuai nominal di atas dan konfirmasi pembayaran ke admin.
                Model pembayaran kami adalah <strong>post-paid</strong> — bayar setelah sesi berlangsung.
              </p>
            </div>
          </div>
        )}

        {/* Paid confirmation */}
        {isPaid && (
          <div className="px-5 pb-5">
            <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 px-4 py-3 text-sm text-emerald-700 font-medium flex items-center gap-2">
              <span>🎉</span> Terima kasih! Pembayaran bulan {invoice.month_year} sudah diterima.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ParentReportView({ data }: ParentReportViewProps) {
  const {
    studentName,
    completedSessions,
    completedTopics,
    totalSessions,
    totalTopics,
    totalXp,
    attendedCount,
    invoice,
    certificates,
  } = data;

  const totalScheduled = completedSessions.length;
  const attendanceRate = totalScheduled > 0
    ? Math.round((attendedCount / totalScheduled) * 100)
    : 0;

  return (
    <div className="space-y-8">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 p-7 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="w-5 h-5 text-violet-300" aria-hidden="true" />
          <p className="text-indigo-200 text-sm font-medium">Laporan Perkembangan Terverifikasi</p>
        </div>
        <h1 className="text-2xl font-extrabold">{studentName}</h1>
        <p className="mt-1 text-indigo-100 text-sm">
          Dibagikan secara aman · Hanya dapat diakses dengan tautan khusus ini
        </p>

        {/* Summary strip */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Kelas Selesai', value: totalSessions,   Icon: GraduationCap, color: 'text-violet-200' },
            { label: 'Kehadiran',     value: `${attendedCount}/${totalScheduled}`, Icon: CheckCircle2, color: 'text-emerald-200' },
            { label: 'Materi',        value: totalTopics,     Icon: BookOpen,      color: 'text-sky-200' },
            { label: 'Total XP',      value: totalXp,         Icon: Star,          color: 'text-amber-200' },
          ].map(({ label, value, Icon, color }) => (
            <div key={label} className="bg-white/15 rounded-xl px-3 py-3 text-center backdrop-blur-sm">
              <Icon className={`w-5 h-5 ${color} mb-1 mx-auto`} aria-hidden="true" />
              <div className="text-xl font-extrabold leading-tight">{value}</div>
              <div className="text-xs text-indigo-100 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Billing card ─────────────────────────────────────────────────── */}
      {invoice && (
        <BillingCard invoice={invoice} attendedCount={attendedCount} />
      )}

      {/* ── Session history ───────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-indigo-500" aria-hidden="true" /> Riwayat Kelas
        </h2>

        {completedSessions.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white py-10 text-center">
            <p className="text-slate-400 text-sm">Belum ada kelas yang selesai.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedSessions.map((session) => (
              <div key={session.id}
                className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 text-sm truncate">{session.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(session.meeting_date)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Attendance badge */}
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1
                      ${session.has_joined
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                        : 'bg-red-50 text-red-600 ring-red-200'}`}>
                      {session.has_joined ? '✓ Hadir' : '✗ Tidak Hadir'}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      ✓ Selesai
                    </span>
                  </div>
                </div>

                {session.progress_report && (
                  <div className="px-5 py-3 bg-slate-50/60">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      Catatan Guru
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {session.progress_report}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Completed topics ──────────────────────────────────────────────── */}
      {completedTopics.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-sky-500" aria-hidden="true" /> Materi Interaktif          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {completedTopics.map((topic) => (
              <div key={topic.engine_topic_id}
                className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm px-5 py-4 flex items-center gap-4 group hover:ring-amber-200 transition-all">
                <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-amber-50 ring-1 ring-amber-200 flex items-center justify-center text-amber-500 text-lg group-hover:scale-110 transition-transform"
                  aria-hidden="true">
                  <Star className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 text-sm truncate">{topic.topic_title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDate(topic.completed_at)} · XP {topic.xp_earned} · Quiz {topic.best_quiz_score}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Certificates ──────────────────────────────────────────────── */}
      {certificates.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" aria-hidden="true" /> Sertifikat
          </h2>
          <div className="flex flex-col gap-3">
            {certificates.map((cert) => (
              <CertificateBadge key={cert.id} cert={cert} variant="full" />
            ))}
          </div>
        </section>
      )}

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="text-center text-xs text-slate-400 pt-4 pb-8 border-t border-slate-100">
        <p>
          Laporan ini dibuat otomatis oleh{' '}
          <span className="font-semibold text-slate-600">Bits2Bytes LMS</span>.
        </p>
        <p className="mt-1">Hanya dapat diakses dengan tautan khusus yang dikirim oleh pengajar.</p>
      </footer>
    </div>
  );
}

