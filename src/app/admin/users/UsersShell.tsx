'use client';
// src/app/admin/users/UsersShell.tsx
// Admin user management — mobile card view + search + pagination.

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { AddStudentForm } from '@/features/users/components/AddStudentForm';
import { AddTeacherForm } from '@/features/users/components/AddTeacherForm';
import { DeleteUserButton } from '@/features/users/components/DeleteUserButton';
import { StudentDetailModal } from '@/features/users/components/StudentDetailModal';
import { TeacherDetailModal } from '@/features/users/components/TeacherDetailModal';
import type { StudentRecord, TeacherRecord } from '@/features/users/queries';
import type { ModuleRow } from '@/types/database';

type Tab = 'students' | 'teachers';

interface Props {
  students:   StudentRecord[];
  teachers:   TeacherRecord[];
  allModules: ModuleRow[];
}

const PAGE_SIZE = 10;

// ── Helpers ────────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}


function ColHeader({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider
      text-slate-500 dark:text-slate-400 whitespace-nowrap">
      {children}
    </th>
  );
}

function ModuleBadges({ titles }: { titles: string[] }) {
  if (titles.length === 0) {
    return <span className="text-xs italic text-slate-400 dark:text-slate-500">Belum ada modul</span>;
  }
  const first = titles[0];
  const rest  = titles.length - 1;
  return (
    <div className="flex flex-col gap-1">
      <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold
        bg-indigo-500/10 text-indigo-700 border border-indigo-500/25
        dark:bg-indigo-500/[0.15] dark:text-indigo-300 dark:border-indigo-500/30
        max-w-[180px] truncate">
        {first}
      </span>
      {rest > 0 && (
        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 pl-0.5">
          +{rest} lainnya
        </span>
      )}
    </div>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl
      border-2 border-dashed border-slate-200/90 dark:border-purple-500/30
      bg-white dark:bg-[#0B0F19] py-16 px-6 text-center">
      <span className="text-4xl mb-3" aria-hidden="true">{icon}</span>
      <p className="font-bold text-slate-700 dark:text-slate-100 text-sm">{message}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
        Klik tombol &ldquo;Tambah&rdquo; di atas untuk menambahkan.
      </p>
    </div>
  );
}

// ── Pagination controls ──────────────────────────────────────────────────────────────────────

function Pagination({
  page, totalPages, onPrev, onNext,
}: {
  page: number; totalPages: number;
  onPrev: () => void; onNext: () => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
        Halaman {page} dari {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={page === 1}
          className="px-3 py-1.5 text-xs font-bold rounded-xl
            bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300
            border border-slate-200 dark:border-white/10
            hover:bg-slate-200 dark:hover:bg-white/[0.15]
            disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          ← Sebelumnya
        </button>
        <button
          onClick={onNext}
          disabled={page === totalPages}
          className="px-3 py-1.5 text-xs font-bold rounded-xl
            bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300
            border border-slate-200 dark:border-white/10
            hover:bg-slate-200 dark:hover:bg-white/[0.15]
            disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          Berikutnya →
        </button>
      </div>
    </div>
  );
}

// ── Mobile student card ────────────────────────────────────────────────────────────────────────

function StudentCard({
  s, onDetail,
}: { s: StudentRecord; onDetail: (s: StudentRecord) => void }) {
  return (
    <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border-2 border-blue-400/40 dark:border-purple-500/40
      shadow-sm dark:shadow-[0_0_20px_rgba(168,85,247,0.18)] dark:ring-1 dark:ring-purple-500/25 p-4 flex flex-col gap-3 hover:shadow-neon-blue dark:hover:shadow-neon-purple
      hover:border-blue-500 dark:hover:border-purple-400 hover:scale-[1.02] hover:-translate-y-0.5
      transition-all duration-300 ease-out cursor-pointer">

      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0
          text-base font-black
          bg-[#7cc62f]/[0.15] text-[#5fa31f] dark:bg-[#7cc62f]/25 dark:text-[#a3e05a]">
          {s.full_name[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-slate-900 dark:text-white text-sm leading-snug truncate">
            {s.full_name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {s.email_or_phone}
          </p>
        </div>
        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 flex-shrink-0 mt-0.5">
          {formatDate(s.created_at)}
        </span>
      </div>

      {/* Chips row */}
      <div className="flex flex-wrap gap-1.5">
        {s.grade && (
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold
            bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-slate-200
            border border-slate-200/60 dark:border-white/[0.08]">
            📌 {s.grade}
          </span>
        )}
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold
          bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-100
          border border-transparent dark:border-white/5">
          🔑 {s.mpin}
        </span>
      </div>

      {/* Modules */}
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Modul Aktif
        </p>
        <ModuleBadges titles={s.module_titles} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
        <button
          type="button"
          onClick={() => onDetail(s)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl
            text-xs font-bold
            bg-indigo-500/10 text-indigo-700 border border-indigo-500/25
            dark:bg-indigo-500/[0.15] dark:text-indigo-300 dark:border-indigo-500/30
            hover:bg-indigo-500/20 dark:hover:bg-indigo-500/25
            active:scale-95 transition-all duration-150"
        >
          👁 Detail
        </button>
        <DeleteUserButton userId={s.id} role="student" name={s.full_name} />
      </div>
    </div>
  );
}

// ── Mobile teacher card ────────────────────────────────────────────────────────────────────────

function TeacherCard({
  t, onDetail,
}: { t: TeacherRecord; onDetail: (t: TeacherRecord) => void }) {
  return (
    <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border-2 border-blue-400/40 dark:border-purple-500/40
      shadow-sm dark:shadow-[0_0_20px_rgba(168,85,247,0.18)] dark:ring-1 dark:ring-purple-500/25 p-4 flex flex-col gap-3 hover:shadow-neon-blue dark:hover:shadow-neon-purple
      hover:border-blue-500 dark:hover:border-purple-400 hover:scale-[1.02] hover:-translate-y-0.5
      transition-all duration-300 ease-out cursor-pointer">

      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0
          bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300
          text-base font-black">
          {(t.full_name ?? '?')[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-slate-900 dark:text-white text-sm leading-snug truncate">
            {t.full_name ?? '—'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {t.email ?? 'Email tidak tersedia'}
          </p>
        </div>
        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 flex-shrink-0 mt-0.5">
          {formatDate(t.created_at)}
        </span>
      </div>

      {/* Session & Student chips */}
      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl
          text-xs font-bold tabular-nums
          bg-violet-500/10 text-violet-700 border border-violet-500/25
          dark:bg-violet-500/[0.15] dark:text-violet-300 dark:border-violet-500/30">
          📅 {t.session_count} sesi
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl
          text-xs font-bold tabular-nums
          bg-indigo-500/10 text-indigo-700 border border-indigo-500/25
          dark:bg-indigo-500/[0.15] dark:text-indigo-300 dark:border-indigo-500/30">
          🎓 {t.student_count} siswa
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
        <button
          type="button"
          onClick={() => onDetail(t)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl
            text-xs font-bold
            bg-violet-500/10 text-violet-700 border border-violet-500/25
            dark:bg-violet-500/[0.15] dark:text-violet-300 dark:border-violet-500/30
            hover:bg-violet-500/20 dark:hover:bg-violet-500/25
            active:scale-95 transition-all duration-150"
        >
          👁 Detail
        </button>
        <DeleteUserButton userId={t.id} role="teacher" name={t.full_name ?? t.email ?? t.id} />
      </div>
    </div>
  );
}

// ── Student table (desktop) ─────────────────────────────────────────────────────────────

function StudentDesktopTable({
  students, onDetail,
}: { students: StudentRecord[]; onDetail: (s: StudentRecord) => void }) {
  return (
    <div className="rounded-2xl overflow-hidden border-2 border-blue-400/40 dark:border-purple-500/40 shadow-sm dark:shadow-[0_0_30px_rgba(168,85,247,0.18)] dark:ring-1 dark:ring-purple-500/25">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-blue-50/70 dark:bg-purple-950/40 border-b border-blue-200/80 dark:border-purple-500/25">
            <tr>
              <ColHeader>Nama &amp; Kontak</ColHeader>
              <ColHeader>Kelas &amp; Akses</ColHeader>
              <ColHeader>Modul Aktif</ColHeader>
              <ColHeader>Terdaftar</ColHeader>
              <ColHeader>Aksi</ColHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-100 dark:divide-purple-500/20">
            {students.map((s) => (
              <tr key={s.id}
                className="bg-white dark:bg-[#0B0F19]
                  hover:bg-slate-50 dark:hover:bg-purple-950/25
                  transition-colors duration-150 group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                      text-sm font-black
                      bg-[#7cc62f]/[0.15] text-[#5fa31f] dark:bg-[#7cc62f]/25 dark:text-[#a3e05a]">
                      {s.full_name[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate max-w-[140px]">{s.full_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[140px]">{s.email_or_phone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {s.grade && <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">{s.grade}</p>}
                  <div className="inline-flex items-center gap-1.5
                    bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-lg
                    border border-transparent dark:border-white/5">
                    <span className="text-[10px] text-slate-400">🔑</span>
                    <span className="text-xs font-mono font-bold tracking-widest text-slate-800 dark:text-slate-100">{s.mpin}</span>
                  </div>
                </td>
                <td className="px-4 py-3"><ModuleBadges titles={s.module_titles} /></td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{formatDate(s.created_at)}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 flex-nowrap">
                    <button type="button" onClick={() => onDetail(s)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold
                        bg-indigo-500/10 text-indigo-700 border border-indigo-500/25
                        dark:bg-indigo-500/[0.15] dark:text-indigo-300 dark:border-indigo-500/30
                        hover:bg-indigo-500/20 dark:hover:bg-indigo-500/25
                        active:scale-95 transition-all duration-150 whitespace-nowrap">
                      👁 Detail
                    </button>
                    <DeleteUserButton userId={s.id} role="student" name={s.full_name} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Teacher table (desktop) ─────────────────────────────────────────────────────────────

function TeacherDesktopTable({
  teachers, onDetail,
}: { teachers: TeacherRecord[]; onDetail: (t: TeacherRecord) => void }) {
  return (
    <div className="rounded-2xl overflow-hidden border-2 border-blue-400/40 dark:border-purple-500/40 shadow-sm dark:shadow-[0_0_30px_rgba(168,85,247,0.18)] dark:ring-1 dark:ring-purple-500/25">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-blue-50/70 dark:bg-purple-950/40 border-b border-blue-200/80 dark:border-purple-500/25">
            <tr>
              <ColHeader>Nama &amp; Email</ColHeader>
              <ColHeader>Sesi &amp; Siswa</ColHeader>
              <ColHeader>Terdaftar</ColHeader>
              <ColHeader>Aksi</ColHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-100 dark:divide-purple-500/20">
            {teachers.map((t) => (
              <tr key={t.id}
                className="bg-white dark:bg-[#0B0F19]
                  hover:bg-slate-50 dark:hover:bg-purple-950/25
                  transition-colors duration-150">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                      text-sm font-black
                      bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                      {(t.full_name ?? '?')[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate max-w-[160px]">{t.full_name ?? '—'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[160px]">{t.email ?? 'Email tidak tersedia'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl
                      text-xs font-bold tabular-nums
                      bg-violet-500/10 text-violet-700 border border-violet-500/25
                      dark:bg-violet-500/[0.15] dark:text-violet-300 dark:border-violet-500/30">
                      📅 {t.session_count} sesi
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl
                      text-xs font-bold tabular-nums
                      bg-indigo-500/10 text-indigo-700 border border-indigo-500/25
                      dark:bg-indigo-500/[0.15] dark:text-indigo-300 dark:border-indigo-500/30">
                      🎓 {t.student_count} siswa
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{formatDate(t.created_at)}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 flex-nowrap">
                    <button type="button" onClick={() => onDetail(t)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold
                        bg-violet-500/10 text-violet-700 border border-violet-500/25
                        dark:bg-violet-500/[0.15] dark:text-violet-300 dark:border-violet-500/30
                        hover:bg-violet-500/20 dark:hover:bg-violet-500/25
                        active:scale-95 transition-all duration-150 whitespace-nowrap">
                      👁 Detail
                    </button>
                    <DeleteUserButton userId={t.id} role="teacher" name={t.full_name ?? t.email ?? t.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Shell ────────────────────────────────────────────────────────────────────────────────

export function UsersShell({ students, teachers, allModules }: Props) {
  const [tab,           setTab]    = useState<Tab>('students');
  const [showAdd,       setShowAdd] = useState(false);
  const [search,        setSearch]  = useState('');
  const [page,          setPage]    = useState(1);
  const [detailStudent, setDetail]  = useState<StudentRecord | null>(null);
  const [detailTeacher, setDetailTeacher] = useState<TeacherRecord | null>(null);

  const currentDetailStudent = useMemo(() => {
    if (!detailStudent) return null;
    return students.find((s) => s.id === detailStudent.id) ?? detailStudent;
  }, [students, detailStudent]);

  const currentDetailTeacher = useMemo(() => {
    if (!detailTeacher) return null;
    return teachers.find((t) => t.id === detailTeacher.id) ?? detailTeacher;
  }, [teachers, detailTeacher]);

  // ─ Filter
  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return students;
    return students.filter((s) =>
      s.full_name.toLowerCase().includes(q) ||
      (s.email_or_phone ?? '').toLowerCase().includes(q),
    );
  }, [students, search]);

  const filteredTeachers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return teachers;
    return teachers.filter((t) =>
      (t.full_name ?? '').toLowerCase().includes(q) ||
      (t.email ?? '').toLowerCase().includes(q),
    );
  }, [teachers, search]);

  // ─ Pagination (reset to page 1 when tab/search changes)
  const activeList = tab === 'students' ? filteredStudents : filteredTeachers;
  const totalPages = Math.max(1, Math.ceil(activeList.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);

  const pagedStudents = filteredStudents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pagedTeachers = filteredTeachers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleTabChange(t: Tab) {
    setTab(t);
    setSearch('');
    setPage(1);
    setShowAdd(false);
  }

  function handleSearchChange(q: string) {
    setSearch(q);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── Top bar: tabs + CTA ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Tab switcher */}
        <div className="flex items-center gap-1
          bg-slate-100 dark:bg-[#0B0F19] p-1 rounded-xl
          border-2 border-slate-200/60 dark:border-purple-500/30 dark:shadow-[0_0_15px_rgba(168,85,247,0.12)]">
          {([
            { id: 'students', label: 'Siswa', count: students.length },
            { id: 'teachers', label: 'Guru',  count: teachers.length },
          ] as const).map(({ id, label, count }) => (
            <button key={id} type="button"
              onClick={() => handleTabChange(id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200
                flex items-center gap-1.5
                ${tab === id
                  ? 'bg-white dark:bg-purple-950/60 text-slate-900 dark:text-purple-200 shadow-sm border border-slate-200/80 dark:border-purple-500/40'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5'
                }`}>
              {label}
              <span className={`tabular-nums text-[10px] px-1.5 py-0.5 rounded-full font-bold
                ${tab === id
                  ? 'bg-slate-100 dark:bg-white/20 text-slate-700 dark:text-white'
                  : 'bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                }`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* CTA */}
        <button type="button" onClick={() => setShowAdd((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-extrabold
            transition-all duration-200 shadow-sm active:scale-95
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
            ${tab === 'students'
              ? 'bg-[#7cc62f] hover:bg-[#5fa31f] text-white focus-visible:ring-[#7cc62f]'
              : 'bg-violet-600 hover:bg-violet-700 text-white focus-visible:ring-violet-500'
            }`}>
          {showAdd
            ? '✕ Tutup Form'
            : tab === 'students' ? '+ Tambah Siswa' : '+ Tambah Guru'
          }
        </button>
      </div>

      {/* ── Search bar ── */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={tab === 'students' ? 'Cari nama atau kontak siswa…' : 'Cari nama atau email guru…'}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm
            bg-white dark:bg-[#0B0F19]
            border-2 border-slate-200/90 dark:border-purple-500/40
            text-slate-900 dark:text-white
            placeholder:text-slate-400 dark:placeholder:text-slate-500
            focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-purple-500/50
            transition-all"
        />
        {search && (
          <button
            type="button"
            onClick={() => handleSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2
              w-5 h-5 rounded-full flex items-center justify-center
              bg-slate-200 dark:bg-white/[0.15] text-slate-500 dark:text-slate-400
              hover:bg-slate-300 dark:hover:bg-white/20 text-xs font-bold transition-all"
            aria-label="Hapus pencarian"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Search result info ── */}
      {search && (
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 -mt-2">
          {activeList.length === 0
            ? 'Tidak ada hasil untuk '
            : `${activeList.length} hasil untuk `}
          <span className="font-bold text-slate-700 dark:text-slate-200">&ldquo;{search}&rdquo;</span>
        </p>
      )}

      {/* ── Collapsible add form ── */}
      {showAdd && (
        <div className="bg-white dark:bg-[#0B0F19] rounded-2xl
          border-2 border-slate-200/90 dark:border-purple-500/40 shadow-sm dark:shadow-[0_0_25px_rgba(168,85,247,0.18)] p-5 animate-fade-in-up">
          <h2 className="text-sm font-extrabold text-slate-800 dark:text-white mb-4">
            {tab === 'students' ? '🎓 Tambah Siswa Baru' : '📚 Tambah Guru Baru'}
          </h2>
          {tab === 'students'
            ? <AddStudentForm onSuccess={() => setShowAdd(false)} />
            : <AddTeacherForm onSuccess={() => setShowAdd(false)} />
          }
        </div>
      )}

      {/* ── Student list ── */}
      {tab === 'students' && (
        pagedStudents.length === 0
          ? <EmptyState icon="🎓" message={search ? 'Tidak ada siswa yang cocok.' : 'Belum ada siswa terdaftar.'} />
          : (
            <>
              {/* Mobile: card grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
                {pagedStudents.map((s) => (
                  <StudentCard key={s.id} s={s} onDetail={setDetail} />
                ))}
              </div>
              {/* Desktop: table */}
              <div className="hidden md:block">
                <StudentDesktopTable students={pagedStudents} onDetail={setDetail} />
              </div>
            </>
          )
      )}

      {/* ── Teacher list ── */}
      {tab === 'teachers' && (
        pagedTeachers.length === 0
          ? <EmptyState icon="📚" message={search ? 'Tidak ada guru yang cocok.' : 'Belum ada guru terdaftar.'} />
          : (
            <>
              {/* Mobile: card grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
                {pagedTeachers.map((t) => (
                  <TeacherCard key={t.id} t={t} onDetail={setDetailTeacher} />
                ))}
              </div>
              {/* Desktop: table */}
              <div className="hidden md:block">
                <TeacherDesktopTable teachers={pagedTeachers} onDetail={setDetailTeacher} />
              </div>
            </>
          )
      )}

      {/* ── Pagination ── */}
      <Pagination
        page={safePage}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
      />

      {/* ── Student detail modal ── */}
      {currentDetailStudent && (
        <StudentDetailModal
          student={currentDetailStudent}
          allModules={allModules}
          allTeachers={teachers}
          onClose={() => setDetail(null)}
        />
      )}

      {/* ── Teacher detail modal ── */}
      {currentDetailTeacher && (
        <TeacherDetailModal
          teacher={currentDetailTeacher}
          allStudents={students}
          onClose={() => setDetailTeacher(null)}
        />
      )}
    </div>
  );
}
