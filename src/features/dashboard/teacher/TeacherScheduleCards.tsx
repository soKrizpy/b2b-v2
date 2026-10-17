'use client';
// src/features/dashboard/teacher/TeacherScheduleCards.tsx
// Tabbed schedule view for teacher: Today / Tomorrow / Past / Unreported

import { useState, useMemo } from 'react';
import type { MeetingWithStudents } from '@/features/sessions/queries';
import {
  isToday,
  isTomorrow,
  isLive,
  isUpcoming,
  formatDate,
  formatTime,
  formatDateTime,
} from '@/lib/formatDate';
import { TeacherCompleteAction } from '@/features/sessions/components/TeacherCompleteAction';

type Tab = 'today' | 'tomorrow' | 'past' | 'unreported';

interface Props {
  meetings: MeetingWithStudents[];
}

// ── Tab config ────────────────────────────────────────────────────────────────

interface TabConfig {
  key: Tab;
  label: string;
  badgeColor: string;
}

const TABS: TabConfig[] = [
  { key: 'today',      label: 'Hari Ini',       badgeColor: 'bg-amber-500 text-white' },
  { key: 'tomorrow',   label: 'Besok',           badgeColor: 'bg-sky-500 text-white' },
  { key: 'past',       label: 'Sebelumnya',      badgeColor: 'bg-slate-400 text-white dark:bg-slate-600' },
  { key: 'unreported', label: 'Belum Laporan',   badgeColor: '' /* dynamic */ },
];

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: Tab }) {
  const map: Record<Tab, { icon: string; text: string }> = {
    today:      { icon: 'fa-solid fa-calendar-day',    text: 'Tidak ada kelas hari ini.' },
    tomorrow:   { icon: 'fa-solid fa-calendar-plus',   text: 'Tidak ada kelas besok.' },
    past:       { icon: 'fa-solid fa-calendar-xmark',  text: 'Belum ada riwayat kelas.' },
    unreported: { icon: 'fa-solid fa-clipboard-check', text: 'Semua kelas sudah dilaporkan. ✓' },
  };
  const { icon, text } = map[tab];
  return (
    <div className="py-12 flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
      <i className={`${icon} text-3xl`} />
      <p className="text-sm font-semibold">{text}</p>
    </div>
  );
}

// ── Single meeting card ───────────────────────────────────────────────────────

function MeetingCard({ m, showUnreportedWarning }: { m: MeetingWithStudents; showUnreportedWarning?: boolean }) {
  const live      = isLive(m.meeting_date);
  const completed = m.is_completed;

  const studentNames = m.meeting_students
    .map((ms) => ms.students?.full_name ?? '')
    .filter(Boolean)
    .join(', ');

  const ringClass = completed
    ? 'border-l-4 border-l-emerald-500 ring-1 ring-slate-200/80 dark:ring-white/10'
    : live
    ? 'ring-2 ring-rose-400 dark:ring-rose-500/60'
    : showUnreportedWarning
    ? 'ring-2 ring-amber-400 dark:ring-amber-500/50'
    : 'ring-1 ring-slate-200/80 dark:ring-white/10';

  return (
    <div
      className={`bg-white dark:bg-[var(--surface)] rounded-3xl shadow-sm overflow-hidden
        transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 animate-fade-in-up
        ${ringClass}`}
    >
      {/* Live banner */}
      {live && !completed && (
        <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-black px-5 py-2.5 flex items-center gap-2.5">
          <i className="fa-solid fa-tower-broadcast fa-beat-fade text-rose-200 text-base" />
          <i className="fa-solid fa-video me-1" /> KELAS SEDANG BERLANGSUNG
        </div>
      )}

      {/* Top accent bar (upcoming, not live) */}
      {!live && !completed && (
        <div className={`h-1.5 bg-gradient-to-r ${showUnreportedWarning
          ? 'from-amber-400 via-orange-500 to-rose-500'
          : 'from-sky-400 via-indigo-500 to-violet-500'
        }`} />
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* Info */}
          <div className="min-w-0 flex-1 space-y-1.5">
            {/* Badge row */}
            <div className="flex items-center gap-2 flex-wrap">
              {m.session_count > 1 && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                  Sesi {m.session_number}/{m.session_count}
                </span>
              )}
              {live && !completed && (
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-500 text-white uppercase tracking-wide">
                  ● LIVE
                </span>
              )}
              {completed && (
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                  ✓ Selesai
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="font-black text-slate-900 dark:text-white text-base leading-snug">
              {m.title}
            </h3>

            {/* Date & time */}
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-calendar text-indigo-500" />
                {formatDate(m.meeting_date)}
              </span>
              <span className="text-slate-300 dark:text-white/20">•</span>
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-clock text-indigo-500" />
                {formatTime(m.meeting_date)}
              </span>
            </p>

            {/* Students */}
            {m.meeting_students.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {m.meeting_students.map((ms) => (
                  <span
                    key={ms.student_id}
                    className="inline-flex items-center gap-1.5 text-xs
                      bg-indigo-500/10 text-indigo-900 dark:text-indigo-300 px-3 py-1.5 rounded-2xl font-bold
                      border border-indigo-500/20"
                  >
                    <i className="fa-solid fa-user-graduate text-indigo-500 text-[11px]" />
                    {ms.students?.full_name ?? '–'}
                  </span>
                ))}
              </div>
            )}

            {/* Progress report snippet (completed) */}
            {completed && m.progress_report && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2 bg-slate-50 dark:bg-white/5 rounded-xl px-3 py-2">
                &ldquo;{m.progress_report.slice(0, 100)}{m.progress_report.length > 100 ? '…' : ''}&rdquo;
              </p>
            )}

            {/* Unreported warning chip */}
            {showUnreportedWarning && !completed && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold
                bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400
                border border-amber-200 dark:border-amber-500/30 px-3 py-1.5 rounded-xl">
                <i className="fa-solid fa-triangle-exclamation" />
                Belum ada laporan
              </div>
            )}
          </div>

          {/* Actions */}
          {!completed && (
            <div className="flex items-center gap-2.5 flex-shrink-0 flex-wrap">
              {m.link_url && (
                <a
                  href={m.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group inline-flex items-center gap-2 rounded-2xl px-4 py-2.5
                    text-xs font-black transition-all duration-150 shadow-md
                    hover:shadow-lg active:scale-95 hover:-translate-y-0.5
                    ${live
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 text-white shadow-rose-500/20'
                      : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 text-white shadow-indigo-500/20'
                    }`}
                >
                  <i className={`fa-solid fa-video ${live ? 'fa-beat-fade' : ''}`} />
                  {live ? 'Masuk Kelas' : 'Buka Meeting'}
                </a>
              )}
              <TeacherCompleteAction
                meetingId={m.id}
                meetingTitle={m.title}
                studentNames={studentNames}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TeacherScheduleCards({ meetings }: Props) {
  // Derive tab buckets
  const todayMeetings = useMemo(
    () => meetings.filter((m) => isToday(m.meeting_date)),
    [meetings]
  );

  const tomorrowMeetings = useMemo(
    () => meetings.filter((m) => isTomorrow(m.meeting_date)),
    [meetings]
  );

  const pastMeetings = useMemo(
    () =>
      meetings
        .filter(
          (m) =>
            !isUpcoming(m.meeting_date) &&
            !isToday(m.meeting_date) &&
            !isTomorrow(m.meeting_date)
        )
        .sort(
          (a, b) =>
            new Date(b.meeting_date).getTime() -
            new Date(a.meeting_date).getTime()
        )
        .slice(0, 20),
    [meetings]
  );

  const unreportedMeetings = useMemo(
    () =>
      meetings
        .filter(
          (m) =>
            !m.is_completed &&
            !isUpcoming(m.meeting_date) &&
            !isToday(m.meeting_date)
        )
        .sort(
          (a, b) =>
            new Date(b.meeting_date).getTime() -
            new Date(a.meeting_date).getTime()
        ),
    [meetings]
  );

  // Default active tab
  const defaultTab: Tab = useMemo(() => {
    if (todayMeetings.length > 0) return 'today';
    if (tomorrowMeetings.length > 0) return 'tomorrow';
    return 'past';
  }, [todayMeetings.length, tomorrowMeetings.length]);

  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);

  const countMap: Record<Tab, number> = {
    today:      todayMeetings.length,
    tomorrow:   tomorrowMeetings.length,
    past:       pastMeetings.length,
    unreported: unreportedMeetings.length,
  };

  const activeList: MeetingWithStudents[] = {
    today:      todayMeetings,
    tomorrow:   tomorrowMeetings,
    past:       pastMeetings,
    unreported: unreportedMeetings,
  }[activeTab];

  return (
    <div className="space-y-5">
      {/* ── Tab bar ─────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((tab) => {
          const isActive  = activeTab === tab.key;
          const count     = countMap[tab.key];
          const isUnrep   = tab.key === 'unreported';
          const badgeColor = isUnrep
            ? count > 0
              ? 'bg-rose-500 text-white'
              : 'bg-slate-400 text-white dark:bg-slate-600'
            : tab.badgeColor;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black
                transition-all duration-150 whitespace-nowrap
                ${isActive
                  ? isUnrep && count > 0
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-500/25'
                    : 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                }
              `}
            >
              {tab.label}
              <span className={`inline-flex items-center justify-center w-4.5 h-4.5 min-w-[1.1rem] px-1.5 rounded-full text-[10px] font-black ${
                isActive ? 'bg-white/25 text-white' : badgeColor
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Cards ────────────────────────────────────────────── */}
      {activeList.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <div className="space-y-4 stagger">
          {activeList.map((m) => (
            <MeetingCard
              key={m.id}
              m={m}
              showUnreportedWarning={activeTab === 'unreported'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
