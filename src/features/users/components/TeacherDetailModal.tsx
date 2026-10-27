'use client';
// src/features/users/components/TeacherDetailModal.tsx
// Slide-over detail panel for a single teacher.
// Shows: stats (sessions, students), enrolled students list & enroll picker, email+access, and password reset.

import { useState, useActionState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff, UserPlus, Check, Search, X } from 'lucide-react';
import {
  resetTeacherPassword,
  enrollStudentsToTeacher,
  unenrollTeacherFromStudent,
  type ResetPasswordResult,
} from '@/features/users/actions';
import { DeleteUserButton } from '@/features/users/components/DeleteUserButton';
import type { TeacherRecord, StudentRecord } from '@/features/users/queries';

interface Props {
  teacher:      TeacherRecord;
  allStudents?: StudentRecord[];
  onClose:      () => void;
}

// ── Stat card ────────────────────────────────────────────────────────────────────

function StatCard({ value, label, icon }: { value: number | string; label: string; icon: string }) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0 py-3">
      <span className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
        {value}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 text-center leading-tight">
        {label}
      </span>
      <span className="text-base" aria-hidden="true">{icon}</span>
    </div>
  );
}

// ── Password reset form ────────────────────────────────────────────────────────────

function PasswordResetForm({ teacherId }: { teacherId: string }) {
  const [show, setShow] = useState(false);
  const [result, dispatch, pending] = useActionState<ResetPasswordResult | null, FormData>(
    resetTeacherPassword,
    null,
  );

  useEffect(() => {
    if (result?.success) {
      toast.success(result.message);
    } else if (result && !result.success) {
      toast.error(result.error);
    }
  }, [result]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500 px-1">
        Reset Password Akses
      </p>

      <form action={dispatch} className="flex flex-col gap-2">
        <input type="hidden" name="teacher_id" value={teacherId} />

        {/* Current password display (masked) */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl
          bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">🔒 Password</span>
          <span className="flex-1 font-mono text-sm text-slate-400 dark:text-slate-500 tracking-widest">
            &#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold
            bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400">
            Tersembunyi
          </span>
        </div>

        {/* New password input */}
        <div className="relative">
          <input
            name="new_password"
            type={show ? 'text' : 'password'}
            required
            minLength={8}
            placeholder="Password baru (min. 8 karakter)"
            className="w-full pr-10 pl-3 py-2.5 rounded-xl text-sm
              bg-white dark:bg-[#0f0f1a] text-slate-900 dark:text-white
              border border-slate-200 dark:border-white/[0.15]
              placeholder:text-slate-400 dark:placeholder:text-slate-500
              focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2
              text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white
              transition-colors"
            aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded-xl text-xs font-extrabold
            bg-violet-600 hover:bg-violet-700 text-white
            disabled:opacity-50 active:scale-95 transition-all duration-150"
        >
          {pending ? 'Menyimpan…' : '🔄 Perbarui Password'}
        </button>
      </form>

      {/* Feedback */}
      {result && (
        <p className={`text-xs px-3 py-2 rounded-xl border ${
          result.success
            ? 'bg-emerald-500/[0.08] text-emerald-700 border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30'
            : 'bg-red-500/[0.08] text-red-700 border-red-500/25 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30'
        }`}>
          {result.success ? `✓ ${result.message}` : `✗ ${result.error}`}
        </p>
      )}
    </div>
  );
}

// ── Enrolled Students Section ─────────────────────────────────────────────────────

function EnrolledStudentsSection({
  teacher,
  allStudents = [],
}: {
  teacher: TeacherRecord;
  allStudents?: StudentRecord[];
}) {
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const enrolled = teacher.enrolled_students ?? [];
  const enrolledIdSet = new Set(enrolled.map((s) => s.id));

  // Candidates to enroll
  const availableStudents = allStudents.filter(
    (s) =>
      !enrolledIdSet.has(s.id) &&
      (s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        s.email_or_phone.includes(search) ||
        (s.grade && s.grade.toLowerCase().includes(search.toLowerCase())))
  );

  function toggleStudent(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function handleEnrollSelected() {
    if (selectedIds.length === 0) return;
    startTransition(async () => {
      const res = await enrollStudentsToTeacher(teacher.id, selectedIds);
      if (res.success) {
        toast.success(res.message);
        setFeedback({ success: true, message: res.message });
        setSelectedIds([]);
        setShowPicker(false);
        router.refresh();
      } else {
        toast.error(res.error);
        setFeedback({ success: false, message: res.error });
      }
    });
  }

  function handleUnenroll(studentId: string, studentName: string) {
    if (!confirm(`Yakin ingin membatalkan enroll siswa ${studentName} dari guru ini?`)) return;
    startTransition(async () => {
      const res = await unenrollTeacherFromStudent(studentId, teacher.id);
      if (res.success) {
        toast.success(res.message);
        setFeedback({ success: true, message: res.message });
        router.refresh();
      } else {
        toast.error(res.error);
        setFeedback({ success: false, message: res.error });
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500 px-1">
            Siswa Bimbingan
          </p>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300">
            {enrolled.length} Siswa
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowPicker((v) => !v);
            setSelectedIds([]);
            setSearch('');
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold
            bg-violet-600 hover:bg-violet-700 text-white transition-all active:scale-95"
        >
          {showPicker ? '✕ Tutup' : '+ Enroll Siswa'}
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border ${
            feedback.success
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
              : 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/25'
          }`}
        >
          <span>{feedback.success ? `✓ ${feedback.message}` : `✗ ${feedback.message}`}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-xs ml-2 hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {/* Enrollment Picker Box */}
      {showPicker && (
        <div className="p-3.5 rounded-2xl bg-violet-500/5 dark:bg-white/5 border border-violet-500/20 dark:border-white/10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              Pilih Siswa untuk Di-enroll
            </p>
            {selectedIds.length > 0 && (
              <span className="text-xs font-extrabold text-violet-600 dark:text-violet-400">
                {selectedIds.length} dipilih
              </span>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, kelas, atau kontak siswa…"
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs
                bg-white dark:bg-[#0f0f1a] text-slate-900 dark:text-white
                border border-slate-200 dark:border-white/10
                focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          {/* List of candidates */}
          <div className="max-h-48 overflow-y-auto flex flex-col gap-1 pr-1">
            {availableStudents.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3 text-center">
                {allStudents.length === 0
                  ? 'Tidak ada data siswa.'
                  : 'Semua siswa yang cocok sudah terdaftar.'}
              </p>
            ) : (
              availableStudents.map((s) => {
                const checked = selectedIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    onClick={() => toggleStudent(s.id)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer text-xs transition-colors border ${
                      checked
                        ? 'bg-violet-500/[0.15] border-violet-500/30 text-violet-900 dark:text-violet-200'
                        : 'bg-white dark:bg-[#151522] border-slate-200/80 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate text-slate-900 dark:text-white">{s.full_name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                        {s.email_or_phone} {s.grade ? `· ${s.grade}` : ''}
                      </p>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowPicker(false);
                setSelectedIds([]);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={selectedIds.length === 0 || isPending}
              onClick={handleEnrollSelected}
              className="px-4 py-1.5 rounded-xl text-xs font-extrabold bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 active:scale-95 transition-all shadow-sm"
            >
              {isPending ? 'Mendaftarkan…' : `Enroll Terpilih (${selectedIds.length})`}
            </button>
          </div>
        </div>
      )}

      {/* Currently enrolled list */}
      {enrolled.length === 0 ? (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 text-center">
          <span className="text-2xl mb-1 block" aria-hidden="true">🎓</span>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
            Belum Ada Siswa Bimbingan
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            Klik tombol &ldquo;+ Enroll Siswa&rdquo; di atas untuk mendaftarkan siswa ke guru ini.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {enrolled.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border
                bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#7cc62f]/[0.15] text-[#5fa31f] dark:bg-[#7cc62f]/25 dark:text-[#a3e05a] font-black text-xs flex items-center justify-center flex-shrink-0">
                  {s.full_name[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {s.full_name}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                    {s.email_or_phone} {s.grade ? `· ${s.grade}` : ''} · {s.session_count} pertemuan
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isPending}
                onClick={() => handleUnenroll(s.id, s.full_name)}
                className="px-2 py-1 rounded-lg text-[10px] font-bold text-red-600 hover:text-red-700 hover:bg-red-500/10 dark:text-red-400 transition-all disabled:opacity-50"
              >
                Lepas
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────────────────

export function TeacherDetailModal({ teacher: t, allStudents = [], onClose }: Props) {
  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overscroll-contain
        bg-black/65 backdrop-blur-sm p-3 sm:p-4 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div
        className="relative w-full sm:max-w-md bg-white dark:bg-[#0B0F19]
          sm:rounded-3xl rounded-t-3xl shadow-2xl
          flex flex-col min-h-0 h-[min(44rem,calc(100dvh-1.5rem))] max-h-[calc(100dvh-1.5rem)] overflow-hidden
          border-2 border-slate-200/90 dark:border-purple-500/40
          dark:shadow-[0_0_35px_rgba(168,85,247,0.22)] dark:ring-1 dark:ring-purple-500/[0.35]
          animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start gap-4 px-5 pt-5 pb-4
          border-b border-slate-100 dark:border-white/[0.08] flex-shrink-0">

          {/* Avatar */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600
            flex items-center justify-center text-2xl font-black text-white flex-shrink-0 shadow-md">
            {(t.full_name ?? '?')[0]?.toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                {t.full_name ?? '—'}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                bg-violet-500/10 text-violet-700 border border-violet-500/25
                dark:bg-violet-500/[0.15] dark:text-violet-300 dark:border-violet-500/30">
                Guru
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.email ?? 'Email tidak tersedia'}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              Terdaftar: {t.created_at
                ? new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'
              }
            </p>
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-xl
              bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300
              hover:bg-slate-200 dark:hover:bg-white/20 hover:text-slate-900 dark:hover:text-white
              flex items-center justify-center text-sm font-bold transition-all duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {/* ── Stats row ── */}
        <div className="flex items-stretch divide-x divide-slate-100 dark:divide-white/8
          border-b border-slate-100 dark:border-white/[0.08] flex-shrink-0">
          <StatCard value={t.session_count} label="Sesi Ditugaskan" icon="📅" />
          <StatCard value={t.student_count} label="Siswa Terdaftar"  icon="🎓" />
        </div>

        {/* ── Content ── */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y px-5 pb-5 pt-4 flex flex-col gap-5"
          style={{ WebkitOverflowScrolling: 'touch' }}>

          {/* Access / Email row */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500 px-1">
              Akses Login
            </p>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl
              bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <span className="text-base" aria-hidden="true">📧</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Email</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {t.email ?? 'Tidak tersedia'}
                </p>
              </div>
            </div>
          </div>

          {/* Enrolled students section */}
          <EnrolledStudentsSection teacher={t} allStudents={allStudents} />

          {/* Password reset */}
          <PasswordResetForm teacherId={t.id} />

          {/* Danger zone */}
          <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 dark:border-white/[0.08]">
            <p className="text-[10px] font-black uppercase tracking-wide text-red-500/70 px-1">
              Zona Berbahaya
            </p>
            <div className="flex items-center gap-3">
              <DeleteUserButton
                userId={t.id}
                role="teacher"
                name={t.full_name ?? t.email ?? t.id}
              />
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Hapus akun guru secara permanen.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
