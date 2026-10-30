'use client';
// src/features/users/components/StudentDetailModal.tsx
// Slide-over detail panel for a single student.
// Tabs: Learning Path (assign active module) | Riwayat | Pencapaian | Sertifikat

import { useState, useActionState, useTransition, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  setActiveStudentModule,
  enrollTeacherToStudent,
  unenrollTeacherFromStudent,
  type SetModuleResult,
} from '@/features/users/actions';
import type { StudentRecord, AssignedModule, TeacherRecord } from '@/features/users/queries';
import type { ModuleRow } from '@/types/database';

interface Props {
  student:     StudentRecord;
  allModules:  ModuleRow[];
  allTeachers?: TeacherRecord[];
  onClose:     () => void;
}

type Tab = 'path' | 'teacher' | 'history' | 'achievement' | 'certificate';

// ── helpers ───────────────────────────────────────────────────────────────────

const LEVEL_COLOR: Record<string, string> = {
  beginner:     'bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-700/40',
  intermediate: 'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-700/40',
  advanced:     'bg-red-100 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-700/40',
};

function LevelBadge({ level }: { level: string | null }) {
  const color = LEVEL_COLOR[level ?? ''] ?? 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/10 dark:text-slate-300 dark:ring-white/15';
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${color}`}>
      {level ?? 'N/A'}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ value, label, icon }: { value: number; label: string; icon: string }) {
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

// ── Tab: Learning Path (with module assign control) ──────────────────────────

function LearningPathTab({
  student,
  allModules,
}: {
  student: StudentRecord;
  allModules: ModuleRow[];
}) {
  const router = useRouter();
  const [result, dispatch, pending] = useActionState<SetModuleResult | null, FormData>(
    setActiveStudentModule,
    null,
  );

  // Refresh page data after successful assign
  useEffect(() => {
    if (result?.success) {
      toast.success(result.message);
      router.refresh();
    } else if (result && !result.success) {
      toast.error(result.error);
    }
  }, [result, router]);

  const activeModule = student.modules.find((m) => m.status === 'active');

  // Modules not yet assigned to this student at all
  const assignedIds = new Set(student.modules.map((m) => m.module_id));
  const unassigned  = allModules.filter((m) => !assignedIds.has(m.id));

  return (
    <div className="flex flex-col gap-4 py-2">

      {/* ── Currently assigned modules ── */}
      {student.modules.length > 0 ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide
            text-slate-400 dark:text-slate-500 mb-2 px-1">
            Modul Terdaftar · {student.modules.filter((m) => m.status === 'active').length} aktif
            {student.modules.some((m) => m.status !== 'active') &&
              ` · ${student.modules.filter((m) => m.status !== 'active').length} dijeda`}
          </p>
          <ul className="flex flex-col gap-2">
            {student.modules.map((m) => {
              const isActive = m.status === 'active';
              return (
                <li key={m.module_id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border
                    transition-all duration-150
                    ${isActive
                      ? 'bg-emerald-500/8 border-emerald-500/25 dark:bg-emerald-500/10 dark:border-emerald-500/30'
                      : 'bg-slate-50 border-slate-200 dark:bg-white/5 dark:border-white/10'
                    }`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0
                    ${isActive ? 'bg-emerald-400' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  <span className="flex-1 text-sm font-semibold text-slate-800 dark:text-white min-w-0 truncate">
                    {m.title}
                  </span>
                  <LevelBadge level={m.level} />
                  {isActive ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 flex-shrink-0
                      bg-emerald-100 text-emerald-700 ring-emerald-200
                      dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700/40 dark:text-emerald-300 dark:ring-emerald-700/40">
                      ✓ Aktif
                    </span>
                  ) : (
                    <>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 flex-shrink-0
                        bg-slate-100 text-slate-600 ring-slate-200
                        dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:text-slate-300 dark:ring-slate-700">
                        ⏸ Dijeda
                      </span>
                      <form action={dispatch}>
                        <input type="hidden" name="student_id" value={student.id} />
                        <input type="hidden" name="module_id"  value={m.module_id} />
                        <button
                          type="submit"
                          disabled={pending}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 flex-shrink-0
                            bg-white text-indigo-600 ring-indigo-200 hover:bg-indigo-50
                            dark:bg-white/5 dark:text-indigo-300 dark:ring-indigo-700/40 dark:text-indigo-400 dark:ring-indigo-700/40
                            dark:hover:bg-indigo-900/20
                            disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          {pending ? '…' : 'Aktifkan'}
                        </button>
                      </form>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="text-4xl" aria-hidden="true">📚</span>
          <p className="font-bold text-slate-700 dark:text-slate-100 text-sm">Belum Ada Modul</p>
          <p className="text-xs text-slate-400 dark:text-slate-400 max-w-[200px]">
            Pilih modul di bawah untuk mengaktifkan.
          </p>
        </div>
      )}

      {/* ── Assign new module (from unassigned list) ── */}
      {unassigned.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide
            text-slate-400 dark:text-slate-500 mb-2 px-1">
            Tambah &amp; Aktifkan Modul Baru
          </p>
          <form action={dispatch} className="flex items-center gap-2">
            <input type="hidden" name="student_id" value={student.id} />
            <select
              name="module_id"
              className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-white/15
                px-3 py-2 text-xs font-medium
                bg-white dark:bg-[var(--surface)] text-slate-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Pilih modul —</option>
              {unassigned.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} {m.level ? `(${m.level})` : ''}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={pending}
              className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold
                bg-indigo-600 hover:bg-indigo-700 text-white
                disabled:opacity-50 transition-colors"
            >
              {pending ? '…' : '+ Aktifkan'}
            </button>
          </form>
        </div>
      )}

      {/* ── Action feedback ── */}
      {result && (
        <p className={`text-xs px-3 py-2 rounded-xl ring-1 ${
          result.success
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/10 dark:text-emerald-300 dark:ring-emerald-700/40'
            : 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/10 dark:text-red-300 dark:ring-red-700/40'
        }`}>
          {result.success ? `✓ ${result.message}` : `✗ ${result.error}`}
        </p>
      )}

      {/* Note on active module behaviour */}
      {activeModule && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500 px-1 leading-relaxed">
          Quest Map siswa menampilkan modul aktif:{' '}
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            {activeModule.title}
          </span>. Mengaktifkan modul lain akan menjeda yang ini.
        </p>
      )}
    </div>
  );
}

// ── Tab: Guru Pembimbing (Enroll Teacher) ───────────────────────────────────

function EnrolledTeacherTab({
  student,
  allTeachers = [],
}: {
  student: StudentRecord;
  allTeachers?: TeacherRecord[];
}) {
  const router = useRouter();
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const enrolledTeachers = student.teachers ?? [];
  const enrolledIds = new Set(enrolledTeachers.map((t) => t.id));
  const availableTeachers = allTeachers.filter((t) => !enrolledIds.has(t.id));

  function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeacherId) return;

    startTransition(async () => {
      const res = await enrollTeacherToStudent(student.id, selectedTeacherId);
      if (res.success) {
        toast.success(res.message);
        setFeedback({ success: true, message: res.message });
        setSelectedTeacherId('');
        router.refresh();
      } else {
        toast.error(res.error);
        setFeedback({ success: false, message: res.error });
      }
    });
  }

  function handleUnenroll(teacherId: string) {
    if (!confirm('Yakin ingin membatalkan enroll guru ini dari siswa?')) return;
    startTransition(async () => {
      const res = await unenrollTeacherFromStudent(student.id, teacherId);
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
    <div className="flex flex-col gap-4 py-2">
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold border ${
            feedback.success
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
              : 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/25'
          }`}
        >
          <span>{feedback.success ? `✓ ${feedback.message}` : `✗ ${feedback.message}`}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs hover:opacity-70 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Currently Enrolled Teachers */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Guru Pembimbing Saat Ini
          </p>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300">
            {enrolledTeachers.length} Guru
          </span>
        </div>

        {enrolledTeachers.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 text-center">
            <span className="text-2xl mb-1 block" aria-hidden="true">👨‍🏫</span>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Belum Ada Guru Pembimbing
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Pilih guru di bawah untuk menugaskan ke siswa ini.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {enrolledTeachers.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border
                  bg-violet-500/5 border-violet-500/20 dark:bg-violet-500/10 dark:border-violet-500/25"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-violet-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                    {t.full_name?.[0]?.toUpperCase() ?? 'G'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                      {t.full_name ?? 'Guru'}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {t.session_count > 0 ? `${t.session_count} pertemuan terhubung` : 'Kelas terdaftar'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleUnenroll(t.id)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold
                    text-red-600 hover:text-red-700 hover:bg-red-500/10
                    dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/20
                    transition-all active:scale-95 disabled:opacity-50"
                >
                  Lepas Guru
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Form Enroll Guru Baru */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          + Enroll Guru Pembimbing
        </p>

        {availableTeachers.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">
            Semua guru yang terdaftar telah di-enroll ke siswa ini.
          </p>
        ) : (
          <form onSubmit={handleEnroll} className="flex flex-col gap-2.5">
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl text-xs font-medium
                bg-white dark:bg-[#0f0f1a] text-slate-900 dark:text-white
                border border-slate-200 dark:border-white/15
                focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <option value="">-- Pilih Guru Pembimbing --</option>
              {availableTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name ?? 'Guru'} ({t.email ?? 'Akun Guru'})
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={isPending || !selectedTeacherId}
              className="w-full py-2.5 rounded-xl text-xs font-extrabold
                bg-violet-600 hover:bg-violet-700 text-white
                disabled:opacity-50 active:scale-95 transition-all shadow-sm"
            >
              {isPending ? 'Mendaftarkan…' : '🎓 Enroll Guru ke Siswa Ini'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Placeholder tab ───────────────────────────────────────────────────────────

function PlaceholderTab({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <span className="text-5xl" aria-hidden="true">{icon}</span>
      <p className="font-bold text-slate-700 dark:text-white text-sm">{label}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Fitur ini akan segera tersedia.
      </p>
    </div>
  );
}

// ── Title badge (based on XP level) ──────────────────────────────────────────

function titleFromXp(xp: number): string {
  if (xp >= 5000) return 'Expert Coder';
  if (xp >= 2000) return 'Senior Coder';
  if (xp >= 800)  return 'Junior Coder';
  return 'Novice Coder';
}

// ── Main component ────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'path',        label: 'Learning Path', icon: '📖' },
  { id: 'teacher',     label: 'Guru',          icon: '👨‍🏫' },
  { id: 'history',     label: 'Riwayat',       icon: '📋' },
  { id: 'achievement', label: 'Pencapaian',    icon: '🏅' },
  { id: 'certificate', label: 'Sertifikat',    icon: '🎖' },
];

export function StudentDetailModal({ student: s, allModules, allTeachers, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('path');
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal((
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
          flex flex-col min-h-0 max-h-[calc(100dvh-1.5rem)] overflow-hidden
          border-2 border-slate-200/90 dark:border-purple-500/40
          dark:shadow-[0_0_35px_rgba(168,85,247,0.22)] dark:ring-1 dark:ring-purple-500/35
          animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start gap-4 px-5 pt-5 pb-4
          border-b border-slate-100 dark:border-white/8 flex-shrink-0">

          {/* Avatar */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600
            flex items-center justify-center text-2xl font-black text-white flex-shrink-0 shadow-md">
            {s.full_name[0]?.toUpperCase() ?? '?'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                {s.full_name}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                bg-violet-100 text-violet-700 ring-1 ring-violet-200
                dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-700/40">
                {titleFromXp(s.total_xp)}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {s.email_or_phone}
              {s.grade ? ` · ${s.grade}` : ''}
            </p>
            {/* MPIN visible */}
            <div className="mt-1.5 inline-flex items-center gap-1.5
              bg-slate-100 dark:bg-white/8 px-2.5 py-1 rounded-lg">
              <span className="text-[10px] text-slate-400 dark:text-slate-500">🔑 MPIN</span>
              <span className="text-xs font-mono font-bold tracking-widest
                text-slate-700 dark:text-slate-200">
                {s.mpin}
              </span>
            </div>
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
          border-b border-slate-100 dark:border-white/8 flex-shrink-0">
          <StatCard value={s.modules.length}  label="Modul"      icon="📖" />
          <StatCard value={s.session_count}   label="Pertemuan Hadir" icon="📅" />
          <StatCard value={s.quiz_count}      label="Quiz"       icon="🧠" />
          <StatCard value={s.cert_count}      label="Sertifikat" icon="🎖" />
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 px-4 pt-3 pb-0 overflow-x-auto flex-shrink-0">
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold
                whitespace-nowrap transition-all duration-150
                ${tab === id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-2">
          {tab === 'path'        && <LearningPathTab student={s} allModules={allModules} />}
          {tab === 'teacher'     && <EnrolledTeacherTab student={s} allTeachers={allTeachers} />}
          {tab === 'history'     && <PlaceholderTab icon="📋" label="Riwayat Pertemuan" />}
          {tab === 'achievement' && <PlaceholderTab icon="🏅" label="Pencapaian & Badge" />}
          {tab === 'certificate' && <PlaceholderTab icon="🎖" label="Sertifikat Siswa" />}
        </div>
      </div>
    </div>
  ), document.body);
}
