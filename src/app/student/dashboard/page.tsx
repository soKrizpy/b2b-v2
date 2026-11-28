import type { Metadata } from "next";
import { Suspense } from "react";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSessionsForStudent } from "@/features/sessions/queries";
import { isUpcoming } from "@/lib/formatDate";
import { StudentDashboardShell } from "@/features/dashboard/student/StudentDashboardShell";
import {
  StudentAvatarDashboardContent,
  StudentNeedsQuizBannerContent,
  StudentLearningSummaryContent,
  StudentCertificatesDashboardContent,
  StudentBillingDashboardContent,
} from "@/features/dashboard/student/StudentDashboardDeferred";

export const metadata: Metadata = { title: "Dasbor Siswa — Bits2Bytes" };
export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const studentName = user.user_metadata?.full_name?.split(" ")[0] ?? "Kamu";
  return <Suspense fallback={<StudentDashboardFallback studentName={studentName} />}><StudentDashboardContent studentId={user.id} studentName={studentName} /></Suspense>;
}

function StudentDashboardFallback({ studentName }: { studentName: string }) {
  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-3xl border border-blue-400/50 bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-700 p-6 text-white shadow-xl dark:border-purple-500/40 dark:from-slate-950 dark:via-purple-950 dark:to-slate-900 sm:p-7">
      <div className="relative z-10"><span className="mb-2 inline-flex rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-bold text-white">Realm Belajar Coding Hari Ini</span><h1 className="text-xl font-black tracking-tight text-white drop-shadow-sm sm:text-2xl">Selamat berpetualang, {studentName}! 🚀</h1><p className="mt-2 text-xs text-blue-100/90">Menyiapkan jadwal dan ruang belajarmu…</p></div>
    </section>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3"><div className="h-36 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-900 lg:col-span-2" /><div className="h-36 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-900" /></div>
  </div>;
}

async function StudentDashboardContent({ studentId, studentName }: { studentId: string; studentName: string }) {
  // Critical path: only the class schedule. Progress, avatar, quizzes,
  // certificates, and billing stream independently after the shell.
  const meetings = await getSessionsForStudent(studentId);
  const upcoming = meetings.filter((meeting) => !meeting.is_completed && isUpcoming(meeting.meeting_date));
  const past = meetings.filter((meeting) => meeting.is_completed || !isUpcoming(meeting.meeting_date));
  return <StudentDashboardShell
    studentName={studentName}
    upcoming={upcoming}
    past={past}
    quizBanner={<Suspense fallback={null}><StudentNeedsQuizBannerContent studentId={studentId} /></Suspense>}
    avatarContent={<Suspense fallback={<div className="h-44 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />}><StudentAvatarDashboardContent studentId={studentId} /></Suspense>}
    learningSummaryContent={<Suspense fallback={<div className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />}><StudentLearningSummaryContent studentId={studentId} /></Suspense>}
    certificatesContent={<Suspense fallback={null}><StudentCertificatesDashboardContent studentId={studentId} /></Suspense>}
    billingContent={<Suspense fallback={null}><StudentBillingDashboardContent studentId={studentId} /></Suspense>}
  />;
}
