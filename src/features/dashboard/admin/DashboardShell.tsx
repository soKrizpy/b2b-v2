'use client';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { CreateSessionModal } from '@/features/sessions/components/CreateSessionModal';
import { AdminSessionActions } from '@/features/sessions/components/AdminSessionActions';
import type {
  MeetingWithStudents,
  TeacherOption,
  StudentOption,
} from '@/features/sessions/queries';
import { computeAdminMetrics, type AdminMetrics } from '@/features/dashboard/admin/metrics';
import { APP_TIME_ZONE, isLive, isToday, formatDate, formatTime } from '@/lib/formatDate';
import { AnnouncementManager } from '@/features/announcements/components/AnnouncementManager';

interface Props {
  meetings: MeetingWithStudents[];
  teachers: TeacherOption[];
  students: StudentOption[];
  metrics?: AdminMetrics;
  renderTimestamp: number;
}

const ITEMS_PER_PAGE = 9;

function activityLabel(m: MeetingWithStudents, now: Date): string {
  if (m.is_completed) return `Kelas "${m.title}" selesai`;
  if (isLive(m.meeting_date, now)) return `Kelas "${m.title}" sedang berlangsung`;
  return `Jadwal: "${m.title}"`;
}

function activityIcon(m: MeetingWithStudents, now: Date): string {
  if (m.is_completed)         return '✓';
  if (isLive(m.meeting_date, now)) return '🔴';
  return '📅';
}

function getTimeUntil(dateIso: string, now: Date): string {
  const target = new Date(dateIso).getTime();
  const diffMs = target - now.getTime();

  if (diffMs <= 0) return 'Mulai sebentar lagi';

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `Mulai dlm ${days}h`;
  }
  if (hours > 0) {
    return `Mulai dlm ${hours}j ${mins}m`;
  }
  return `Mulai dlm ${mins}m`;
}

function formatTimeRange(dateIso: string): string {
  const start = new Date(dateIso);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const format = (d: Date) =>
    d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: APP_TIME_ZONE,
    });
  return `${format(start)} - ${format(end)} WIB`;
}

export function DashboardShell({
  meetings,
  teachers,
  students,
  metrics: propMetrics,
  renderTimestamp,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [clockNow, setClockNow] = useState(renderTimestamp);
  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const renderNow = useMemo(() => new Date(clockNow), [clockNow]);

  const metrics = useMemo(() => {
    return propMetrics ?? computeAdminMetrics(meetings, renderNow);
  }, [propMetrics, meetings, renderNow]);

  const teacherMap = useMemo(() => {
    const map = new Map<string, string>();
    teachers.forEach((t) => {
      if (t.full_name) map.set(t.id, t.full_name);
    });
    return map;
  }, [teachers]);

  const todayMeetings = useMemo(() => {
    return meetings.filter((m) => isToday(m.meeting_date, renderNow));
  }, [meetings, renderNow]);

  const filteredToday = useMemo(() => {
    if (!searchQuery.trim()) return todayMeetings;
    const q = searchQuery.toLowerCase();
    return todayMeetings.filter((m) => {
      const titleMatch = m.title.toLowerCase().includes(q);
      const notesMatch = m.notes?.toLowerCase().includes(q) ?? false;
      const studentMatch = m.meeting_students.some(
        (ms) => ms.students?.full_name.toLowerCase().includes(q)
      );
      return titleMatch || notesMatch || studentMatch;
    });
  }, [todayMeetings, searchQuery]);

  const totalPages = Math.ceil(filteredToday.length / ITEMS_PER_PAGE) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filteredToday.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredToday, currentPage]
  );

  const recentActivity = useMemo(() => {
    return [...meetings]
      .sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime())
      .slice(0, 5);
  }, [meetings]);

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* Header & Search / Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Pusat Kontrol Operasional Admin
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-200 mt-1 font-medium">
            Pantau jadwal, kelas live, dan aktivitas pembelajaran secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 sm:flex-initial min-w-[260px]">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-400 text-sm">
              <i className="fa-solid fa-magnifying-glass" />
            </span>
            <input
              type="text"
              placeholder="Cari Murid/Guru/Topik Hari Ini..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-8 py-2.5 text-xs rounded-2xl bg-white dark:bg-zinc-950 border border-blue-500/50 dark:border-purple-500/40 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-purple-400 focus:border-blue-400 dark:focus:border-purple-400 shadow-sm transition-all duration-200"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setPage(1); }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded-lg"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>

          <CreateSessionModal teachers={teachers} students={students} />
        </div>
      </div>

      {/* KPI Stat Cards Grid — Modern solid backgrounds with thicker borders in light mode and majestic neon glow in dark mode */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-[#0B0F19] border-2 border-emerald-500/40 dark:border-emerald-500/50 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-[0_0_25px_rgba(16,185,129,0.22)] ring-1 ring-emerald-500/20 dark:ring-emerald-500/30 hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-2">
              <i className="fa-solid fa-video text-rose-500 animate-pulse" />
              LIVE SEKARANG
            </span>
          </div>
          <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-3 tabular-nums tracking-tight">
            {metrics.liveNowCount}
          </p>
        </div>

        <div className="bg-white dark:bg-[#0B0F19] border-2 border-blue-500/40 dark:border-blue-500/50 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-[0_0_25px_rgba(59,130,246,0.22)] ring-1 ring-blue-500/20 dark:ring-blue-500/30 hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200">
          <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300 inline-flex items-center gap-2">
            <i className="fa-solid fa-calendar-days text-blue-500 dark:text-blue-400" />
            TOTAL HARI INI
          </span>
          <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-3 tabular-nums tracking-tight">
            {metrics.todayTotalCount}
          </p>
        </div>

        <div className="bg-white dark:bg-[#0B0F19] border-2 border-purple-500/40 dark:border-purple-500/50 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-[0_0_25px_rgba(168,85,247,0.22)] ring-1 ring-purple-500/20 dark:ring-purple-500/30 hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200">
          <span className="text-xs font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-300 inline-flex items-center gap-2">
            <i className="fa-solid fa-user-graduate text-purple-500 dark:text-purple-400" />
            MURID AKTIF
          </span>
          <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-3 tabular-nums tracking-tight">
            {metrics.activeStudentsCount}
          </p>
        </div>

        <div className="bg-white dark:bg-[#0B0F19] border-2 border-amber-500/40 dark:border-amber-500/50 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-[0_0_25px_rgba(245,158,11,0.22)] ring-1 ring-amber-500/20 dark:ring-amber-500/30 hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200">
          <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300 inline-flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation text-amber-500 dark:text-amber-400" />
            PERLU TINDAKAN
          </span>
          <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-3 tabular-nums tracking-tight">
            {metrics.needsAttentionCount} <span className="text-xs font-bold text-amber-600 dark:text-amber-300">(No Link)</span>
          </p>
        </div>
      </div>

      {/* Main Today's Schedule Card */}
      <div className="bg-white dark:bg-[#0B0F19] border-2 border-blue-400/40 dark:border-purple-500/40 rounded-3xl shadow-sm dark:shadow-[0_0_30px_rgba(168,85,247,0.18)] dark:ring-1 dark:ring-purple-500/25 overflow-hidden space-y-0">
        <div className="p-4 sm:p-6 border-b border-slate-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/70 dark:bg-zinc-900/60">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white inline-flex items-center gap-2">
              <i className="fa-solid fa-calendar-day text-blue-500 dark:text-cyan-400" /> Jadwal Kelas Hari Ini
            </h2>
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-blue-500/10 dark:bg-cyan-500/15 text-blue-700 dark:text-cyan-300 border border-blue-500/20 dark:border-cyan-500/30 tabular-nums">
              {todayMeetings.length} Sesi Hari Ini
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {metrics.liveNowCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                {metrics.liveNowCount} Sesi Sedang Berlangsung
              </span>
            )}
            <Link
              href="/teacher/lessons"
              className="text-xs font-extrabold text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 inline-flex items-center gap-1 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded-lg px-1"
            >
              Panduan Mengajar & Topik →
            </Link>
            <Link
              href="/admin/sessions"
              className="text-xs font-extrabold text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 inline-flex items-center gap-1 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded-lg px-1"
            >
              Lihat Seluruh Jadwal →
            </Link>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {filteredToday.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 py-14 px-6 text-center">
              <div className="text-3xl mb-2">📅</div>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                Tidak ada jadwal kelas hari ini.
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-sm">
                {searchQuery
                  ? `Tidak ada sesi hari ini yang cocok dengan "${searchQuery}".`
                  : 'Belum ada sesi yang dijadwalkan untuk hari ini. Klik "Buat Jadwal Baru" untuk menambahkan.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {paginated.map((m) => {
                const live = isLive(m.meeting_date, renderNow);
                const teacherName = m.teacher_id ? teacherMap.get(m.teacher_id) ?? null : null;

                return (
                  <div
                    key={m.id}
                    className={`rounded-2xl border-2 p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-md ${
                      live
                        ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-400 dark:border-rose-600 ring-1 ring-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                        : m.is_completed
                        ? 'bg-slate-50/80 dark:bg-[#0B0F19]/80 border-slate-200/90 dark:border-zinc-800 opacity-85'
                        : 'bg-white dark:bg-[#0B0F19] border-blue-400/40 dark:border-purple-500/40 hover:border-blue-500 dark:hover:border-purple-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.18)] dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.22)] dark:shadow-[0_0_15px_rgba(168,85,247,0.12)]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        {live ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-sm shadow-rose-500/30 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE
                          </span>
                        ) : m.is_completed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                            ✓ Selesai
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/10 dark:bg-cyan-500/15 text-blue-700 dark:text-cyan-300 border border-blue-500/20 dark:border-cyan-500/30">
                            {getTimeUntil(m.meeting_date, renderNow)}
                          </span>
                        )}

                        {m.session_count > 1 && (
                          <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 font-mono">
                            Sesi {m.session_number}/{m.session_count}
                          </span>
                        )}
                      </div>

                      <h3 className="font-black text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug">
                        {m.title}
                      </h3>

                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1.5">
                        {formatTimeRange(m.meeting_date)}
                      </p>

                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 inline-flex items-center gap-1 truncate">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Guru:</span>
                        <strong className="font-extrabold text-slate-800 dark:text-slate-200">
                          {teacherName ?? 'Belum ditentukan'}
                        </strong>
                      </p>

                      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                          Siswa ({m.meeting_students.length})
                        </p>
                        {m.meeting_students.length === 0 ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400 italic">Belum ada siswa.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {m.meeting_students.map((ms) => (
                              <span
                                key={ms.student_id}
                                className="text-[11px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 px-2 py-0.5 rounded-lg truncate max-w-[130px]"
                              >
                                {ms.students?.full_name ?? 'Siswa'}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {(() => {
                            const startsAt = new Date(m.meeting_date).getTime();
                            const opensAt = startsAt - 10 * 60 * 1000;
                            const endsAt = startsAt + 60 * 60 * 1000;
                            const remaining = Math.max(0, opensAt - clockNow);
                            const canJoin = Boolean(m.link_url) && !m.is_completed && clockNow >= opensAt && clockNow < endsAt;
                            const countdown = (() => {
                              const totalSeconds = Math.ceil(remaining / 1000);
                              const hours = Math.floor(totalSeconds / 3600);
                              const minutes = Math.floor((totalSeconds % 3600) / 60);
                              const seconds = totalSeconds % 60;
                              return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
                            })();

                            if (!m.link_url || m.is_completed || clockNow >= endsAt) return null;

                            return canJoin ? (
                              <a href={m.link_url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex h-8 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 px-3 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors">
                                Masuk Kelas
                              </a>
                            ) : (
                              <span aria-label={`Masuk kelas dalam ${countdown}`}
                                className="inline-flex h-8 items-center justify-center rounded-xl bg-slate-50 dark:bg-zinc-800/80 px-2.5 font-mono text-[10px] font-black tabular-nums text-slate-600 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-white/15">
                                {countdown}
                              </span>
                            );
                          })()}
                        </div>
                        <AdminSessionActions meeting={m} teachers={teachers} students={students} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-slate-100 dark:border-zinc-800 pt-4 text-xs">
              <span className="text-slate-600 dark:text-slate-300">
                Menampilkan halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong> ({filteredToday.length} total sesi hari ini)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3.5 py-1.5 rounded-xl border border-blue-500/40 dark:border-zinc-800 font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3.5 py-1.5 rounded-xl border border-blue-500/40 dark:border-zinc-800 font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid Split: Recent Activity & Operational Quick Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-[#0B0F19] border-2 border-blue-400/40 dark:border-purple-500/40 rounded-3xl p-6 shadow-sm dark:shadow-[0_0_30px_rgba(168,85,247,0.18)] dark:ring-1 dark:ring-purple-500/25">
          <h2 className="text-base font-black text-slate-900 dark:text-white inline-flex items-center gap-2 mb-4">
            <i className="fa-solid fa-clock-rotate-left text-blue-500 dark:text-cyan-400" /> Aktivitas Terkini
          </h2>

          <div className="space-y-3">
            {recentActivity.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/70 dark:bg-zinc-900/60 border border-blue-100 dark:border-zinc-800/80 hover:border-blue-400 dark:hover:border-purple-500/50 transition-colors duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base">{activityIcon(m, renderNow)}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">
                      {activityLabel(m, renderNow)}
                    </p>
                    <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mt-0.5">
                      {formatDate(m.meeting_date)} · {formatTime(m.meeting_date)}
                    </p>
                  </div>
                </div>

                <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full flex-shrink-0 border ${
                  m.is_completed
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                    : 'bg-blue-500/10 dark:bg-purple-500/15 text-blue-700 dark:text-purple-300 border-blue-500/20 dark:border-purple-500/30'
                }`}>
                  {m.is_completed ? 'Selesai' : 'Dijadwalkan'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Announcement / Banner Manager */}
        <div>
          <AnnouncementManager />
        </div>
      </div>
    </div>
  );
}
