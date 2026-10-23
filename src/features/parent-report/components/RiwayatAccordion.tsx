'use client';
// src/features/parent-report/components/RiwayatAccordion.tsx
// Two-level collapsible history with Parent Hub efficiency upgrades:
//   - Live search filter by session or topic title
//   - Filter chips: All, Attended Only, Has Teacher Note, Score >= 80
//   - Quick toggle to expand/collapse all teacher evaluation notes
//   - Level 1: Module accordion header (title, completed count, attendance fraction, mini progress bar)
//   - Level 2: Session list (title, date, topic, attendance, quiz score, teacher note quote block)

import { useState, useMemo } from 'react';
import type {
  RiwayatModule,
  RiwayatSession,
} from '@/features/parent-report/queries.student';
import { formatDate } from '@/lib/formatDate';
import {
  Search,
  Filter,
  MessageSquare,
  ChevronDown,
  CheckCircle2,
  Award,
  BookOpen,
} from 'lucide-react';

// ── Score helpers ─────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 70) return 'text-cyan-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-500';
}

function scoreLabel(score: number) {
  if (score >= 80) return 'Sangat Baik';
  if (score >= 70) return 'Baik';
  if (score >= 50) return 'Cukup';
  return 'Perlu Belajar Lagi';
}

function scoreBg(score: number) {
  if (score >= 80)
    return 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800';
  if (score >= 70)
    return 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800';
  if (score >= 50)
    return 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800';
  return 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800';
}

function attendanceLabel(status: RiwayatSession['attendance_status']) {
  if (status === 'telat') return '⏱ Telat';
  if (status === 'hadir') return '✓ Hadir';
  return '✗ Absen';
}

function attendanceStyle(status: RiwayatSession['attendance_status']) {
  if (status === 'telat') {
    return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
  }
  if (status === 'hadir') {
    return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
  }
  return 'bg-red-50 dark:bg-red-950/60 text-red-500 dark:text-red-400 border-red-200 dark:border-red-800';
}

// ── Session row ───────────────────────────────────────────────────────────────

function SessionRow({
  session,
  forceNoteOpen,
}: {
  session: RiwayatSession;
  forceNoteOpen?: boolean;
}) {
  const [localNoteOpen, setLocalNoteOpen] = useState(false);
  const hasNote = Boolean(session.progress_report?.trim());
  const isNoteOpen = forceNoteOpen || localNoteOpen;
  const score = session.quiz_score;

  return (
    <li className="flex flex-col gap-2 p-4 border-b border-zinc-100 dark:border-zinc-800/80 last:border-0 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
      {/* ── Top row: topic label + date + attendance ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {session.topic_title && (
            <p
              className="text-[10px] font-black uppercase tracking-wider
              text-purple-600 dark:text-purple-400 mb-0.5 flex items-center gap-1.5"
            >
              <BookOpen className="w-3 h-3 text-purple-500" />
              {session.topic_title}
            </p>
          )}
          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 leading-snug">
            {session.title}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
            {formatDate(session.meeting_date)}
          </p>
        </div>

        {/* Attendance badge */}
        <span
          className={`flex-shrink-0 text-[10px] font-black px-2.5 py-0.5 rounded-full border ${attendanceStyle(
            session.attendance_status
          )}`}
        >
          {attendanceLabel(session.attendance_status)}
        </span>
      </div>

      {/* ── Quiz score + teacher note toggle ── */}
      <div className="flex items-center justify-between gap-3 mt-1 flex-wrap">
        {/* Quiz score chip */}
        {score !== null ? (
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${scoreBg(
              score
            )}`}
          >
            <span className="text-[10px] font-black uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Nilai Kuis
            </span>
            <span
              className={`text-sm font-black tabular-nums ${scoreColor(score)}`}
            >
              {score}%
            </span>
            <span className={`text-[10px] font-semibold ${scoreColor(score)}`}>
              · {scoreLabel(score)}
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 italic">
            Kuis belum dikerjakan
          </span>
        )}

        {/* Toggle note button */}
        {hasNote && (
          <button
            type="button"
            onClick={() => setLocalNoteOpen((v) => !v)}
            title={isNoteOpen ? 'Tutup catatan guru' : 'Lihat catatan guru'}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl
              text-[11px] font-bold transition-all
              bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
            aria-expanded={isNoteOpen}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Catatan Guru</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isNoteOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        )}
      </div>

      {/* Collapsible teacher note quote block */}
      {isNoteOpen && hasNote && (
        <div className="bg-purple-50/90 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-xl p-3.5 text-xs text-purple-800 dark:text-purple-200 mt-2 shadow-inner">
          <p
            className="text-[10px] font-black uppercase tracking-wide
            text-purple-600 dark:text-purple-400 mb-1.5 flex items-center gap-1.5"
          >
            <MessageSquare className="w-3 h-3 text-purple-500" />
            Evaluasi Guru
          </p>
          <p className="text-xs text-purple-800 dark:text-purple-200 leading-relaxed whitespace-pre-wrap font-medium">
            {session.progress_report}
          </p>
        </div>
      )}
    </li>
  );
}

// ── Module accordion ──────────────────────────────────────────────────────────

function ModuleAccordion({
  module: mod,
  defaultOpen,
  forceNoteOpen,
}: {
  module: RiwayatModule;
  defaultOpen: boolean;
  forceNoteOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Compute avg quiz score for this module's sessions
  const scored = mod.sessions.filter((s) => s.quiz_score !== null);
  const avgScore =
    scored.length > 0
      ? Math.round(
          scored.reduce((s, r) => s + (r.quiz_score ?? 0), 0) / scored.length
        )
      : null;

  const pct = Math.round(
    (mod.completed_count / Math.max(mod.sessions.length, 1)) * 100
  );

  return (
    <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl transition-all hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4
          hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${
              open
                ? 'bg-purple-500 shadow-sm shadow-purple-400/50'
                : 'bg-zinc-300 dark:bg-zinc-700'
            }`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <p className="text-sm font-extrabold text-zinc-800 dark:text-zinc-100 truncate">
                {mod.module_title}
              </p>
              {/* Progress bar mini modul */}
              <div className="w-20 sm:w-28 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden flex-shrink-0 hidden sm:block">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {mod.sessions.length} Sesi ·{' '}
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {mod.completed_count} Hadir
              </span>
              {avgScore !== null && (
                <>
                  {' · '}
                  <span className={`font-bold ${scoreColor(avgScore)}`}>
                    Rata-Rata Kuis {avgScore}%
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span
            className="text-[10px] font-black px-2.5 py-0.5 rounded-full tabular-nums
            bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
          >
            {mod.completed_count}/{mod.sessions.length}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-zinc-100 dark:border-zinc-800">
          {mod.sessions.length === 0 ? (
            <p className="p-4 text-xs text-zinc-400 dark:text-zinc-500 italic">
              Belum ada sesi yang cocok dengan filter pada modul ini.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {mod.sessions.map((s) => (
                <SessionRow
                  key={s.meeting_id}
                  session={s}
                  forceNoteOpen={forceNoteOpen}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main export with Search & Filter Features ─────────────────────────────────

export function RiwayatAccordion({ modules }: { modules: RiwayatModule[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'hadir' | 'notes' | 'high_score'>('all');
  const [expandAllNotes, setExpandAllNotes] = useState(false);

  // Filter modules and their sessions
  const filteredModules = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return modules
      .map((mod) => {
        const filteredSessions = mod.sessions.filter((s) => {
          // Query check
          if (q) {
            const matchTitle = s.title.toLowerCase().includes(q);
            const matchTopic = s.topic_title?.toLowerCase().includes(q);
            const matchNote = s.progress_report?.toLowerCase().includes(q);
            if (!matchTitle && !matchTopic && !matchNote) return false;
          }

          // Status filter check
          if (statusFilter === 'hadir' && s.attendance_status !== 'hadir') return false;
          if (statusFilter === 'notes' && !s.progress_report?.trim()) return false;
          if (statusFilter === 'high_score' && (s.quiz_score === null || s.quiz_score < 80)) return false;

          return true;
        });

        return {
          ...mod,
          sessions: filteredSessions,
        };
      })
      .filter((mod) => mod.sessions.length > 0);
  }, [modules, searchQuery, statusFilter]);

  const totalMatchingSessions = useMemo(() => {
    return filteredModules.reduce((acc, m) => acc + m.sessions.length, 0);
  }, [filteredModules]);

  const totalNotesCount = useMemo(() => {
    return modules.reduce(
      (acc, m) => acc + m.sessions.filter((s) => s.progress_report?.trim()).length,
      0
    );
  }, [modules]);

  if (modules.length === 0) {
    return (
      <div
        className="rounded-2xl border border-dashed
        border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 py-12 text-center"
      >
        <span className="text-4xl mb-3 block select-none" aria-hidden="true">
          📋
        </span>
        <p className="font-bold text-zinc-700 dark:text-zinc-200 text-sm">
          Belum ada riwayat kelas
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
          Riwayat kelas yang sudah selesai akan muncul di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Search & Filter Controls Toolbar ── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari sesi, materi, atau kata kunci..."
            className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        {/* Filter Chips & Expand All */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            Semua
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('hadir')}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
              statusFilter === 'hadir'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Hadir</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('notes')}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
              statusFilter === 'notes'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
            title="Hanya sesi yang memiliki evaluasi guru"
          >
            <MessageSquare className="w-3 h-3" />
            <span>Ada Catatan ({totalNotesCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('high_score')}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
              statusFilter === 'high_score'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Award className="w-3 h-3" />
            <span>Kuis ≥ 80</span>
          </button>

          {/* Toggle Expand All Notes */}
          <button
            type="button"
            onClick={() => setExpandAllNotes((v) => !v)}
            className="ml-auto sm:ml-2 px-3 py-1.5 rounded-xl text-[11px] font-bold border border-purple-200 dark:border-purple-800/80 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
          >
            {expandAllNotes ? 'Tutup Catatan' : 'Buka Semua Catatan'}
          </button>
        </div>
      </div>

      {/* ── Active Filter Summary / Count ── */}
      {(searchQuery || statusFilter !== 'all') && (
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
          <span>
            Menampilkan <strong>{totalMatchingSessions}</strong> sesi yang sesuai
          </span>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            className="text-purple-600 dark:text-purple-400 hover:underline font-bold"
          >
            Reset Filter
          </button>
        </div>
      )}

      {/* ── Module List ── */}
      {filteredModules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 py-10 text-center">
          <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
            Tidak ada sesi yang cocok dengan kriteria pencarian
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            className="mt-3 px-4 py-1.5 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700"
          >
            Tampilkan Semua Sesi
          </button>
        </div>
      ) : (
        filteredModules.map((mod, idx) => (
          <ModuleAccordion
            key={mod.module_id ?? `ungrouped-${idx}`}
            module={mod}
            defaultOpen={idx === 0 || Boolean(searchQuery) || statusFilter !== 'all'}
            forceNoteOpen={expandAllNotes}
          />
        ))
      )}
    </div>
  );
}
