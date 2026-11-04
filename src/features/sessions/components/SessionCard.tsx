// src/features/sessions/components/SessionCard.tsx
// Read-only card displaying one meeting's core info.
// Used across all three role dashboards.

import { formatDate, formatTime } from "@/lib/formatDate";
import { isLive, isUpcoming } from "@/lib/formatDate";
import type { MeetingWithStudents } from "@/features/sessions/queries";

interface SessionCardProps {
  meeting: MeetingWithStudents;
  /** Slot for role-specific action buttons (Join, Edit, Cancel, Complete…) */
  actions?: React.ReactNode;
  /** Whether to show enrolled student chips */
  showStudents?: boolean;
}

/** Generate initials + deterministic colour from a name string */
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const colours = [
    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  ];
  const colour = colours[name.charCodeAt(0) % colours.length];

  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full
        text-[10px] font-bold flex-shrink-0 ${colour}`}
    >
      {initials}
    </span>
  );
}

export function SessionCard({ meeting, actions, showStudents = false }: SessionCardProps) {
  const live     = isLive(meeting.meeting_date);
  const upcoming = isUpcoming(meeting.meeting_date);
  const done     = meeting.is_completed;

  /* ── Status badge ──────────────────────────────────────────── */
  const statusBadge = done ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold
      bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full ring-1 ring-slate-200/80
      dark:bg-white/10 dark:text-slate-400 dark:ring-white/15">
      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
        <path d="M10.28 2.28a.75.75 0 00-1.06 0L4.5 7l-1.72-1.72a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l5.25-5.25a.75.75 0 000-1.06z"/>
      </svg>
      Selesai
    </span>
  ) : live ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold
      bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full ring-1 ring-emerald-200
      dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700/40">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      LIVE NOW
    </span>
  ) : upcoming ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold
      bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full ring-1 ring-sky-200/80
      dark:bg-sky-900/20 dark:text-sky-300 dark:ring-sky-700/40">
      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
        <path d="M1 4.5A2.5 2.5 0 013.5 2h5A2.5 2.5 0 0111 4.5v5A2.5 2.5 0 018.5 12h-5A2.5 2.5 0 011 9.5v-5zm2-1.5v.5h-.5a1 1 0 00-1 1V9.5a1 1 0 001 1h5a1 1 0 001-1V4.5a1 1 0 00-1-1H3V3a.5.5 0 00-1 0zM8.5 3v.5H3.5V3h5z"/>
      </svg>
      Mendatang
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold
      bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full ring-1 ring-amber-200/80
      dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700/40">
      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
        <path d="M6 1a5 5 0 100 10A5 5 0 006 1zm.5 2.75a.5.5 0 00-1 0V6a.5.5 0 00.146.354l1.5 1.5a.5.5 0 10.708-.708L6.5 5.793V3.75z"/>
      </svg>
      Terlewat
    </span>
  );

  return (
    <div className={`group bg-white dark:bg-[var(--surface)] rounded-2xl border shadow-sm flex flex-col
      transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 overflow-hidden
      ${live
        ? "border-emerald-200 shadow-emerald-100/60 dark:border-emerald-700/50 dark:shadow-emerald-900/30"
        : done
        ? "border-slate-200/60 opacity-80 hover:opacity-100 dark:border-white/10"
        : "border-slate-200/80 hover:border-indigo-200/70 dark:border-purple-500/30 dark:hover:border-purple-400/60"
      }`}>

      {/* ── Status accent bar ─────────────────────────────── */}
      <div className={`h-0.5 w-full flex-shrink-0 ${
        live  ? "bg-gradient-to-r from-emerald-400 to-teal-400"
        : done ? "bg-slate-200 dark:bg-white/10"
        : "bg-gradient-to-r from-indigo-400 to-violet-400"
      }`} />

      {/* ── Header ───────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3">
        {/* Badges row */}
        <div className="flex items-center gap-2 flex-wrap mb-2.5">
          {meeting.session_count > 1 && (
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50
              px-2 py-0.5 rounded-full ring-1 ring-indigo-200/80 tracking-tight
              dark:text-indigo-300 dark:bg-indigo-900/20 dark:ring-indigo-700/40">
              Sesi {meeting.session_number}/{meeting.session_count}
            </span>
          )}
          {statusBadge}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2 mb-2">
          {meeting.title}
        </h3>

        {/* Date & time */}
        <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5.5 0a.5.5 0 01.5.5V2h4V.5a.5.5 0 011 0V2h1a2 2 0 012 2v9a2 2 0 01-2 2H3a2 2 0 01-2-2V4a2 2 0 012-2h1V.5a.5.5 0 01.5-.5zM2 5v8a1 1 0 001 1h10a1 1 0 001-1V5H2z"/>
            </svg>
            {formatDate(meeting.meeting_date)}
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 3.5a.5.5 0 00-1 0V9a.5.5 0 00.252.434l3.5 2a.5.5 0 00.496-.868L8 8.71V3.5z"/>
              <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm7-8A7 7 0 111 8a7 7 0 0114 0z"/>
            </svg>
            {formatTime(meeting.meeting_date)}
          </span>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="px-5 pb-4 flex-1 space-y-3">

        {/* Meeting link */}
        {meeting.link_url && (
          <a
            href={meeting.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs group/link"
          >
            <div className="flex-shrink-0 w-5 h-5 rounded-md bg-indigo-50
              flex items-center justify-center ring-1 ring-indigo-100
              dark:bg-indigo-900/20 dark:ring-indigo-700/30">
              <svg className="h-3 w-3 text-indigo-500 dark:text-indigo-400" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6.22 8.72a.75.75 0 001.06 1.06l1.69-1.69a3 3 0 000-4.24l-.69-.69a3 3 0 00-4.24 0l-.69.69a3 3 0 000 4.24l.75.75a.75.75 0 001.06-1.06l-.75-.75a1.5 1.5 0 010-2.12l.69-.69a1.5 1.5 0 012.12 0l.69.69a1.5 1.5 0 010 2.12l-1.69 1.69z"/>
                <path d="M9.78 7.28a.75.75 0 00-1.06-1.06l-1.69 1.69a3 3 0 000 4.24l.69.69a3 3 0 004.24 0l.69-.69a3 3 0 000-4.24l-.75-.75a.75.75 0 00-1.06 1.06l.75.75a1.5 1.5 0 010 2.12l-.69.69a1.5 1.5 0 01-2.12 0l-.69-.69a1.5 1.5 0 010-2.12l1.69-1.69z"/>
              </svg>
            </div>
            <span className="truncate text-indigo-600 font-medium
              group-hover/link:underline group-hover/link:text-indigo-700
              dark:text-indigo-400 dark:group-hover/link:text-indigo-300">
              {meeting.link_url}
            </span>
          </a>
        )}

        {/* Notes */}
        {meeting.notes && (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic line-clamp-2 leading-relaxed">
            {meeting.notes}
          </p>
        )}

        {/* Student avatar chips */}
        {showStudents && meeting.meeting_students.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {meeting.meeting_students.map((ms) => (
              <span
                key={ms.student_id}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium
                  bg-slate-50 text-slate-600 px-2 py-1 rounded-lg ring-1 ring-slate-200/80
                  dark:bg-white/5 dark:text-slate-300 dark:ring-white/10"
              >
                <Avatar name={ms.students?.full_name ?? "?"} />
                <span className="truncate max-w-[80px]">{ms.students?.full_name ?? "–"}</span>
              </span>
            ))}
          </div>
        )}

        {/* Progress report */}
        {done && meeting.progress_report && (
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-3.5 py-2.5
            text-xs text-slate-600 leading-relaxed
            dark:bg-white/5 dark:border-white/10 dark:text-slate-300">
            <p className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider mb-1
              dark:text-slate-400">
              Catatan Progress
            </p>
            <p className="line-clamp-3">{meeting.progress_report}</p>
          </div>
        )}
      </div>

      {/* ── Footer actions ────────────────────────────────── */}
      {actions && (
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50
          flex items-center gap-2 flex-wrap rounded-b-2xl
          dark:border-white/8 dark:bg-white/3">
          {actions}
        </div>
      )}
    </div>
  );
}
