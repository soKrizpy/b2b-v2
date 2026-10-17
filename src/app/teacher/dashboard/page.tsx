// src/app/teacher/dashboard/page.tsx
// Teacher dashboard — shows greeting hero, mentored students, and tabbed schedule.
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSessionsForTeacher } from "@/features/sessions/queries";
import { getStudentsForTeacher } from "@/features/users/queries";
import { TeacherStudentsWidget } from "@/features/dashboard/teacher/TeacherStudentsWidget";
import { TeacherScheduleCards } from "@/features/dashboard/teacher/TeacherScheduleCards";
import { isUpcoming, isLive, formatDateTime } from "@/lib/formatDate";
import { AnnouncementBanner } from "@/features/announcements/components/AnnouncementBanner";

export const metadata: Metadata = { title: "Dasbor Guru — Bits2Bytes" };
export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [meetings, mentoredStudents] = await Promise.all([
    getSessionsForTeacher(user.id),
    getStudentsForTeacher(user.id),
  ]);

  const upcoming = meetings.filter(
    (m) => !m.is_completed && isUpcoming(m.meeting_date)
  );

  const teacherName = user.user_metadata?.full_name?.split(" ")[0] ?? "Guru";
  const hasLive = upcoming.some((m) => isLive(m.meeting_date));

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* ── Active Announcement Banners ──────────────────────── */}
      <AnnouncementBanner role="teachers" />

      {/* ── Greeting hero ("Today's Focus") ───────────────────── */}
      <div className={`relative rounded-3xl overflow-hidden p-6 sm:p-8 text-white shadow-xl transition-all duration-300
        ${hasLive
          ? "bg-gradient-to-br from-red-600 via-rose-600 to-orange-600 shadow-rose-500/20"
          : "bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 shadow-indigo-500/10 border border-white/10"
        }`}>
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-32 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute inset-0 opacity-10"
            style={{backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px"}} />
        </div>

        <div className="relative z-10">
          {hasLive && (
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md text-white text-xs font-black px-3.5 py-1.5 rounded-full mb-4 ring-1 ring-white/30">
              <i className="fa-solid fa-tower-broadcast text-rose-200 fa-beat-fade" />
              KELAS SEDANG BERLANGSUNG!
            </div>
          )}

          <div className="flex items-center gap-2 text-indigo-300 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest mb-1">
            <i className="fa-solid fa-graduation-cap text-indigo-400 fa-fade" /> Focus Guru Hari Ini
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
            Halo kembali, {teacherName}! 👋
          </h1>

          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2 text-xs font-bold ring-1 ring-white/20">
              <i className="fa-solid fa-user-graduate text-violet-300" />
              <span>{mentoredStudents.length} Siswa Bimbingan</span>
            </div>
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2 text-xs font-bold ring-1 ring-white/20">
              <i className="fa-solid fa-calendar-day text-sky-300" />
              <span>{upcoming.length} Kelas Mendatang</span>
            </div>
            {upcoming.length > 0 && (
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2 text-xs font-bold ring-1 ring-white/20">
                <i className="fa-solid fa-clock text-amber-300" />
                <span>Berikutnya: {formatDateTime(upcoming[0].meeting_date)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mentored Students Widget ────────────────────────── */}
      <TeacherStudentsWidget students={mentoredStudents} />

      {/* ── Jadwal Kelas (tabbed) ──────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-white/10 to-transparent" />
          <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap flex items-center gap-2">
            <i className="fa-solid fa-calendar-days text-indigo-500" /> Jadwal Kelas
          </h2>
          <div className="flex-1 h-px bg-gradient-to-l from-slate-200 dark:from-white/10 to-transparent" />
        </div>
        <TeacherScheduleCards meetings={meetings} />
      </section>
    </div>
  );
}
