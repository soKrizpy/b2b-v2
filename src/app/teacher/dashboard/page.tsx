// src/app/teacher/dashboard/page.tsx
// Teacher dashboard — shows greeting hero with atmosphere and tabbed 3-column schedule.
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSessionsForTeacher } from "@/features/sessions/queries";
import { getStudentsForTeacher } from "@/features/users/queries";
import { TeacherScheduleCards } from "@/features/dashboard/teacher/TeacherScheduleCards";
import { isUpcoming, isLive, formatDateTime } from "@/lib/formatDate";
import { AnnouncementBanner } from "@/features/announcements/components/AnnouncementBanner";
import { HeroAtmosphere } from "@/components/common/HeroAtmosphere";
import Link from "next/link";

export const metadata: Metadata = { title: "Dasbor Guru — Bits2Bytes" };
export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [meetings, mentoredStudents] = await Promise.all([
    getSessionsForTeacher(user.id),
    getStudentsForTeacher(user.id),
  ]);

  const renderTimestamp = Date.now();
  const renderNow = new Date(renderTimestamp);
  const upcoming = meetings.filter(
    (m) => !m.is_completed && isUpcoming(m.meeting_date, renderNow)
  );

  const teacherName = user.user_metadata?.full_name?.split(" ")[0] ?? "Guru";
  const hasLive = upcoming.some((m) => isLive(m.meeting_date, renderNow));

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* ── Active Announcement Banners ──────────────────────── */}
      <AnnouncementBanner role="teachers" />

      {/* ── Greeting hero ("Today's Focus") with seamless theme atmosphere ── */}
      <div className={`relative rounded-3xl overflow-hidden p-6 sm:p-8 text-white shadow-xl transition-all duration-500
        ${hasLive
          ? "bg-gradient-to-br from-rose-600 via-rose-700 to-indigo-800 border border-rose-400/50 shadow-rose-500/20 hover:border-rose-300/60 dark:from-slate-950 dark:via-rose-950 dark:to-slate-900 dark:border-rose-500/40 dark:shadow-rose-950/40"
          : "bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 border border-blue-400/50 shadow-blue-500/20 hover:border-blue-300/60 dark:from-slate-950 dark:via-purple-950 dark:to-slate-900 dark:border-purple-500/40 dark:shadow-purple-950/40"
        }`}>
        {/* Seamless theme atmosphere: clouds & birds (light), stars & comets (dark) */}
        <HeroAtmosphere />

        <div className="relative z-10">
          {hasLive && (
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md text-white text-xs font-black px-3.5 py-1.5 rounded-full mb-4 ring-1 ring-white/30 shadow-md">
              <i className="fa-solid fa-tower-broadcast text-rose-200 fa-beat-fade" />
              KELAS SEDANG BERLANGSUNG!
            </div>
          )}

          <div className="flex items-center gap-2 text-blue-200 dark:text-purple-300 font-bold text-xs uppercase tracking-widest mb-1 font-mono">
            <i className="fa-solid fa-graduation-cap text-cyan-300 dark:text-purple-400" /> Focus Guru Hari Ini
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1 drop-shadow-sm">
            Selamat datang kembali, {teacherName}! 👋
          </h1>

          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white/20 dark:bg-black/30 backdrop-blur-md rounded-2xl px-4 py-2 text-xs font-black border border-white/30 dark:border-purple-400/30 text-white shadow-sm">
              <i className="fa-solid fa-user-graduate text-blue-200 dark:text-purple-300" />
              <span>{mentoredStudents.length} Siswa Bimbingan</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 dark:bg-black/30 backdrop-blur-md rounded-2xl px-4 py-2 text-xs font-black border border-white/30 dark:border-purple-400/30 text-white shadow-sm">
              <i className="fa-solid fa-calendar-day text-cyan-200 dark:text-cyan-300" />
              <span>{upcoming.length} Kelas Mendatang</span>
            </div>
            {upcoming.length > 0 && (
              <div className="flex items-center gap-2 bg-white/20 dark:bg-black/30 backdrop-blur-md rounded-2xl px-4 py-2 text-xs font-black border border-white/30 dark:border-purple-400/30 text-white shadow-sm">
                <i className="fa-solid fa-clock text-amber-300" />
                <span>Berikutnya: {formatDateTime(upcoming[0].meeting_date)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mentored Students Quick Link ─────────────────────── */}
      <Link
        href="/teacher/students"
        className="flex items-center gap-4 rounded-2xl px-5 py-4
          bg-white dark:bg-zinc-900/80 border border-blue-200/60 dark:border-purple-500/30
          hover:border-blue-400 dark:hover:border-purple-500/60 hover:shadow-md
          transition-all duration-200 group"
      >
        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 dark:bg-purple-500/20 flex items-center justify-center flex-shrink-0">
          <i className="fa-solid fa-user-graduate text-blue-600 dark:text-purple-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-sm text-slate-900 dark:text-white">
            Siswa Bimbingan Saya
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {mentoredStudents.length} siswa — lihat detail modul, badge, sertifikat & tugas
          </p>
        </div>
        <i className="fa-solid fa-chevron-right text-slate-400 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-purple-400 transition-colors" />
      </Link>

      {/* ── Jadwal Kelas (Tabbed 3-Column Grid) ─────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-white/10 to-transparent" />
          <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap flex items-center gap-2">
            <i className="fa-solid fa-calendar-days text-blue-500 dark:text-purple-400" /> Jadwal Kelas Guru
          </h2>
          <div className="flex-1 h-px bg-gradient-to-l from-slate-200 dark:from-white/10 to-transparent" />
        </div>
        <TeacherScheduleCards meetings={meetings} renderTimestamp={renderTimestamp} />
      </section>
    </div>
  );
}
