'use client';
// src/features/dashboard/teacher/TeacherScheduleCards.tsx
// Redesigned 3-Column Schedule Card Grid for Teacher Dashboard.
// Features:
//   - Tab bar: Hari Ini (today), Besok (tomorrow), Riwayat (past), Laporan Belum Selesai (unreported)
//   - 3-Column balanced responsive card grid (matching Student Dashboard layout)
//   - Zero color leaks: strict light/dark mode pairings with neon accents
//   - Progress report draft & completion actions

import { useState, useMemo, useEffect } from 'react';
import type { MeetingWithStudents } from '@/features/sessions/queries';
import {
  isToday,
  isTomorrow,
  isLive,
  isUpcoming,
  formatDate,
  formatTime,
} from '@/lib/formatDate';
import { TeacherCompleteAction } from '@/features/sessions/components/TeacherCompleteAction';

type Tab = 'today' | 'tomorrow' | 'past' | 'unreported';

interface Props {
  meetings: MeetingWithStudents[];
  renderTimestamp: number;
}

interface TabConfig {
  key: Tab;
  label: string;
  icon: string;
}

const TABS: TabConfig[] = [
  { key: 'today', label: 'Hari Ini', icon: 'fa-solid fa-calendar-day' },
  { key: 'tomorrow', label: 'Besok', icon: 'fa-solid fa-calendar-plus' },
  {
    key: 'past',
    label: 'Riwayat Kelas',
    icon: 'fa-solid fa-clock-rotate-left',
  },
  {
    key: 'unreported',
    label: 'Laporan Belum Selesai',
    icon: 'fa-solid fa-clipboard-question',
  },
];

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: Tab }) {
  const map: Record<Tab, { icon: string; title: string; subtitle: string }> = {
    today: {
      icon: 'fa-solid fa-calendar-check text-cyan-500 dark:text-cyan-400',
      title: 'Tidak Ada Kelas Hari Ini',
      subtitle:
        'Semua jadwal hari ini telah tuntas atau belum ada sesi yang dijadwalkan.',
    },
    tomorrow: {
      icon: 'fa-solid fa-calendar-plus text-sky-500 dark:text-sky-400',
      title: 'Tidak Ada Kelas Besok',
      subtitle: 'Nikmati waktu persiapan atau cek riwayat kelas sebelumnya.',
    },
    past: {
      icon: 'fa-solid fa-calendar-xmark text-slate-500 dark:text-slate-400',
      title: 'Belum Ada Riwayat Kelas',
      subtitle: 'Sesi yang telah selesai akan otomatis diarsipkan di sini.',
    },
    unreported: {
      icon: 'fa-solid fa-circle-check text-emerald-500 dark:text-emerald-400',
      title: 'Semua Laporan Telah Selesai! ✓',
      subtitle:
        'Hebat! Seluruh sesi kelas telah memiliki catatan progress siswa yang lengkap.',
    },
  };

  const { icon, title, subtitle } = map[tab];

  return (
    <div
      className="py-14 px-6 rounded-3xl border-2 border-dashed border-blue-400/30 dark:border-purple-500/30
      bg-white/60 dark:bg-zinc-900/50 backdrop-blur-sm flex flex-col items-center text-center gap-3 animate-fade-in-up"
    >
      <div
        className="w-14 h-14 rounded-2xl bg-blue-500/10 dark:bg-purple-500/15 border border-blue-400/20 dark:border-purple-400/20
        flex items-center justify-center text-2xl mb-1 shadow-sm"
      >
        <i className={icon} />
      </div>
      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
        {subtitle}
      </p>
    </div>
  );
}

// ── Single Meeting Card (3-Column Grid Layout) ────────────────────────────────

function MeetingCard({
  m,
  showUnreportedWarning,
  now,
}: {
  m: MeetingWithStudents;
  showUnreportedWarning?: boolean;
  now: Date;
}) {
  const live = isLive(m.meeting_date, now);
  const completed = m.is_completed;
  const hasReport = Boolean(
    m.progress_report && m.progress_report.trim().length > 0
  );

  const studentNames = m.meeting_students
    .map((ms) => ms.students?.full_name ?? '')
    .filter(Boolean)
    .join(', ');

  const ringStyle = live
    ? 'border-2 border-rose-500 shadow-rose-500/20 ring-2 ring-rose-400/50'
    : completed
      ? 'border border-emerald-500/40 dark:border-emerald-500/30 shadow-emerald-500/5'
      : showUnreportedWarning
        ? 'border-2 border-amber-400/80 dark:border-amber-500/60 shadow-amber-500/10'
        : 'border border-blue-400/35 dark:border-purple-500/35 hover:border-blue-500 dark:hover:border-purple-400';

  return (
    <div
      className={`h-full flex flex-col justify-between rounded-3xl bg-white dark:bg-zinc-900/90
        p-5 shadow-sm shadow-blue-500/5 dark:shadow-purple-500/5
        transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden
        ${ringStyle}`}
    >
      {/* Top ambient color bar indicator */}
      <div
        className={`absolute top-0 inset-x-0 h-1.5 ${
          live
            ? 'bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 animate-pulse'
            : completed
              ? 'bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500'
              : showUnreportedWarning
                ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500'
                : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500'
        }`}
      />

      <div className="space-y-3.5 pt-1">
        {/* Row 1: Session Tag & Status Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {m.session_count > 1 ? (
              <span
                className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full font-mono
                bg-blue-500/10 text-blue-700 dark:bg-purple-500/15 dark:text-purple-300
                border border-blue-400/30 dark:border-purple-500/30"
              >
                Sesi {m.session_number}/{m.session_count}
              </span>
            ) : (
              <span
                className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full font-mono
                bg-blue-500/10 text-blue-700 dark:bg-purple-500/15 dark:text-purple-300
                border border-blue-400/30 dark:border-purple-500/30"
              >
                Sesi Tunggal
              </span>
            )}

            {live && !completed && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full
                bg-rose-500 text-white shadow-sm shadow-rose-500/40 animate-pulse font-mono"
              >
                <i className="fa-solid fa-tower-broadcast text-[9px] fa-beat-fade" />
                LIVE
              </span>
            )}

            {completed && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full
                bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-mono"
              >
                <i className="fa-solid fa-check text-[9px]" />
                Selesai
              </span>
            )}
          </div>

          <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
            <i className="fa-solid fa-clock text-blue-500 dark:text-purple-400 text-[10px]" />
            <span>{formatTime(m.meeting_date)}</span>
          </div>
        </div>

        {/* Row 2: Title */}
        <div>
          <h3
            className="font-black text-slate-900 dark:text-white text-sm sm:text-base leading-snug line-clamp-2
            group-hover:text-blue-600 dark:group-hover:text-purple-300 transition-colors"
          >
            {m.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1 flex items-center gap-2">
            <i className="fa-solid fa-calendar-day text-blue-500 dark:text-purple-400 text-[11px]" />
            <span>{formatDate(m.meeting_date)}</span>
          </p>
        </div>

        {/* Row 3: Enrolled Students */}
        {m.meeting_students.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <i className="fa-solid fa-user-group text-[9px]" />
              Siswa Terdaftar ({m.meeting_students.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {m.meeting_students.map((ms) => (
                <span
                  key={ms.student_id}
                  className="inline-flex items-center gap-1 text-xs font-bold
                    bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-200 px-2.5 py-1 rounded-xl
                    border border-slate-200/80 dark:border-zinc-700/60 transition-colors"
                >
                  <i className="fa-solid fa-user-graduate text-[10px] text-blue-500 dark:text-purple-400" />
                  <span className="truncate max-w-[130px]">
                    {ms.students?.full_name?.split(' ')[0] ?? 'Siswa'}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Row 4: Progress Report Note or Unreported Warning */}
        {completed && hasReport && (
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <i className="fa-solid fa-clipboard-check text-[10px]" /> Catatan
              Progress:
            </p>
            <p className="italic line-clamp-2 leading-relaxed">
              &ldquo;{m.progress_report}&rdquo;
            </p>
          </div>
        )}

        {showUnreportedWarning && !hasReport && (
          <div className="p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-400/40 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation text-amber-500 dark:text-amber-400 text-sm flex-shrink-0" />
            <span className="leading-snug">
              Belum ada laporan progress siswa untuk sesi ini.
            </span>
          </div>
        )}
      </div>

      {/* Row 5: Curriculum access */}
      {m.topic_id != null && (
        <div className="pt-3 flex flex-wrap gap-2">
          <a href={`/teacher/lessons/topic/${m.topic_id}`} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/30 dark:hover:bg-purple-500/20 transition-colors">
            <i className="fa-solid fa-book-open" /> Lihat Materi
          </a>
          <a href={`/teacher/lessons/topic/${m.topic_id}#panduan-mengajar`} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-700 transition-colors">
            <i className="fa-solid fa-chalkboard-user" /> Panduan Mengajar
          </a>
        </div>
      )}

      {/* Row 6: Action Buttons */}
      <div className="pt-4 mt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-2.5 flex-wrap">
        {(() => {
          const startsAt = new Date(m.meeting_date).getTime();
          const joinOpensAt = startsAt - 10 * 60 * 1000;
          const reportOpensAt = startsAt + 20 * 60 * 1000;
          const canJoin = Boolean(m.link_url) && !completed && now.getTime() >= joinOpensAt;
          const showCountdown = Boolean(m.link_url) && !completed && now.getTime() < joinOpensAt;
          const canReport = completed || now.getTime() >= reportOpensAt;
          const remainingSeconds = Math.max(0, Math.ceil((joinOpensAt - now.getTime()) / 1000));
          const hours = Math.floor(remainingSeconds / 3600);
          const minutes = Math.floor((remainingSeconds % 3600) / 60);
          const seconds = remainingSeconds % 60;
          const countdown = [hours, minutes, seconds]
            .map((value) => String(value).padStart(2, '0'))
            .join(':');

          return (
            <>
              {showCountdown && (
                <span
                  aria-label={`Masuk kelas dalam ${countdown}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5
                    text-xs font-black font-mono tabular-nums bg-slate-100 dark:bg-zinc-800
                    text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700"
                >
                  <i className="fa-solid fa-clock" />
                  {countdown}
                </span>
              )}
              {canJoin && (
                <a
                  href={m.link_url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5
                    text-xs font-black transition-all duration-200 shadow-md active:scale-95
                    ${
                      live
                        ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-rose-500/25 ring-2 ring-rose-400/50'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 dark:from-purple-600 dark:to-indigo-600 dark:hover:from-purple-500 dark:hover:to-indigo-500 text-white shadow-blue-500/20 dark:shadow-purple-500/20'
                    }`}
                >
                  <i className={`fa-solid fa-video ${live ? 'fa-beat-fade' : ''}`} />
                  <span>Masuk Kelas</span>
                </a>
              )}
              {canReport && (
                <div className={m.link_url && !completed ? 'flex-shrink-0' : 'w-full'}>
                  <TeacherCompleteAction
                    meetingId={m.id}
                    meetingTitle={m.title}
                    studentNames={studentNames}
                    buttonText={completed ? '✏️ Edit Laporan' : 'Kirim Laporan'}
                    variant={completed ? 'secondary' : 'primary'}
                    className={m.link_url && !completed ? '' : 'w-full justify-center'}
                    initialReport={m.progress_report}
                    isCompleted={completed}
                    attendanceStudents={m.meeting_students.map((ms) => ({
                      studentId: ms.student_id,
                      studentName: ms.students?.full_name ?? 'Siswa',
                      status:
                        ms.attendance_status ?? (ms.has_joined ? 'hadir' : 'absen'),
                    }))}
                  />
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function TeacherScheduleCards({ meetings, renderTimestamp }: Props) {
  const [clockNow, setClockNow] = useState(renderTimestamp);
  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const now = useMemo(() => new Date(clockNow), [clockNow]);
  const nowMs = now.getTime();

  // Derive tab buckets
  const todayMeetings = useMemo(
    () => meetings.filter((m) => isToday(m.meeting_date, now)),
    [meetings, now]
  );

  const tomorrowMeetings = useMemo(
    () => meetings.filter((m) => isTomorrow(m.meeting_date, now)),
    [meetings, now]
  );

  const pastMeetings = useMemo(
    () =>
      meetings
        .filter(
          (m) =>
            !isUpcoming(m.meeting_date, now) &&
            !isToday(m.meeting_date, now) &&
            !isTomorrow(m.meeting_date, now)
        )
        .sort(
          (a, b) =>
            new Date(b.meeting_date).getTime() -
            new Date(a.meeting_date).getTime()
        ),
    [meetings, now]
  );

  // Unreported: past sessions or today's sessions that have ended or completed without a report
  const unreportedMeetings = useMemo(
    () =>
      meetings
        .filter((m) => {
          const mTime = new Date(m.meeting_date).getTime();
          const isPassedOrEnded = mTime < nowMs;
          const isMissingReport =
            !m.progress_report || m.progress_report.trim().length === 0;
          return isPassedOrEnded && (!m.is_completed || isMissingReport);
        })
        .sort(
          (a, b) =>
            new Date(b.meeting_date).getTime() -
            new Date(a.meeting_date).getTime()
        ),
    [meetings, nowMs]
  );

  // Default active tab: prioritize Today, then Tomorrow, then Unreported (if any), then Past
  const defaultTab: Tab = useMemo(() => {
    if (todayMeetings.length > 0) return 'today';
    if (tomorrowMeetings.length > 0) return 'tomorrow';
    if (unreportedMeetings.length > 0) return 'unreported';
    return 'past';
  }, [
    todayMeetings.length,
    tomorrowMeetings.length,
    unreportedMeetings.length,
  ]);

  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);

  const countMap: Record<Tab, number> = {
    today: todayMeetings.length,
    tomorrow: tomorrowMeetings.length,
    past: pastMeetings.length,
    unreported: unreportedMeetings.length,
  };

  const activeList: MeetingWithStudents[] = {
    today: todayMeetings,
    tomorrow: tomorrowMeetings,
    past: pastMeetings,
    unreported: unreportedMeetings,
  }[activeTab];

  return (
    <div className="space-y-6">
      {/* ── Modern Tabs Navigation with Counts ──────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = countMap[tab.key];
          const isUnrep = tab.key === 'unreported';

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black
                transition-all duration-200 whitespace-nowrap cursor-pointer select-none
                ${
                  isActive
                    ? isUnrep && count > 0
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/25 ring-2 ring-rose-400/40'
                      : 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 dark:bg-purple-600 dark:shadow-purple-500/25 ring-2 ring-blue-400/40 dark:ring-purple-400/40'
                    : 'bg-white dark:bg-zinc-900/90 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-blue-400/25 dark:border-purple-500/25'
                }
              `}
            >
              <i
                className={`${tab.icon} text-[11px] ${isActive ? 'text-white' : 'text-blue-500 dark:text-purple-400'}`}
              />
              <span>{tab.label}</span>
              <span
                className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-black ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : isUnrep && count > 0
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Schedule Cards Grid (3 Columns Like Student Dashboard) ──── */}
      {activeList.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
          {activeList.map((m) => (
            <MeetingCard
              key={m.id}
              m={m}
              now={now}
              showUnreportedWarning={
                activeTab === 'unreported' ||
                (!m.is_completed && new Date(m.meeting_date).getTime() < nowMs)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
