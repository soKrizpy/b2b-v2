// src/app/student/dashboard/page.tsx
// Student dashboard — core data always fetched; extension data (gamification,
// certificates, invoices, quest-map quiz status, announcements) fetched only
// when their respective feature flags are enabled.
import type { Metadata } from "next";
import { Suspense } from "react";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSessionsForStudent, getUpcomingMeetingForStudent } from "@/features/sessions/queries";
import { getStudentModulesWithTopics, getStudentCompletedTopics } from "@/features/curriculum/queries";
import { isUpcoming } from "@/lib/formatDate";
import { isFeatureEnabled } from "@/lib/featureConfig";
import { StudentDashboardShell } from "@/features/dashboard/student/StudentDashboardShell";
import type { StudentGamificationData } from "@/features/pet/lib/petQueries";
import type { CertificateWithModule } from "@/features/certificates/queries";
import type { InvoiceRow } from "@/types/database";
import type { TownSquareMeeting } from "@/features/sessions/queries";

export const metadata: Metadata = { title: "Dasbor Siswa — Bits2Bytes" };
export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const studentName: string =
    user.user_metadata?.full_name?.split(" ")[0] ?? "Kamu";

  // Stream the dashboard data independently from the first visible heading.
  // The fallback is server-rendered immediately while the async content loads.
  return (
    <Suspense fallback={<StudentDashboardFallback studentName={studentName} />}>
      <StudentDashboardContent studentId={user.id} studentName={studentName} />
    </Suspense>
  );
}

function StudentDashboardFallback({ studentName }: { studentName: string }) {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-blue-400/50 bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-700 p-6 text-white shadow-xl dark:border-purple-500/40 dark:from-slate-950 dark:via-purple-950 dark:to-slate-900 sm:p-7">
        <div className="relative z-10">
          <div className="mb-2">
            <span className="inline-flex items-center rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-bold text-white">
              Realm Belajar Coding Hari Ini
            </span>
          </div>
          <h1 className="text-xl font-black tracking-tight text-white drop-shadow-sm sm:text-2xl">
            Selamat berpetualang, {studentName}! 🚀
          </h1>
        </div>
      </section>
    </div>
  );
}

async function StudentDashboardContent({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  // ── Dashboard data: overlap Quest Map with the other dashboard reads ────────
  // Quest Map only depends on the enrolled modules. Start it as soon as that
  // query resolves instead of waiting for meetings, progress, and optional cards.
  const allModulesPromise = getStudentModulesWithTopics(studentId);
  const needsQuestMap = isFeatureEnabled("questMap") || isFeatureEnabled("gamification");
  const needsQuizTopicsPromise = needsQuestMap
    ? allModulesPromise.then(async (modules) => {
        const activeMod = modules.find((m) => m.enrollmentStatus === 'active') ?? null;
        if (!activeMod) return [] as Array<{ id: number; title: string }>;

        const { getQuestMapData } = await import("@/features/quiz/questMapQueries");
        const questData = await getQuestMapData(studentId, activeMod);
        return questData.needsQuizTopics.map((node) => ({
          id: node.topic.id,
          title: node.topic.title,
        }));
      })
    : Promise.resolve([] as Array<{ id: number; title: string }>);

  const [
    meetings,
    allModules,
    completedTopics,
    gamData,
    certificates,
    invoices,
    townSquareMeeting,
    needsQuizTopics,
  ] = await Promise.all([
    getSessionsForStudent(studentId),
    allModulesPromise,
    getStudentCompletedTopics(studentId),
    isFeatureEnabled("gamification")
      ? import("@/features/pet/lib/petQueries").then(({ getStudentGamificationData }) =>
          getStudentGamificationData(studentId)
        )
      : Promise.resolve(null),
    isFeatureEnabled("certificates")
      ? import("@/features/certificates/queries").then(({ getStudentCertificates }) =>
          getStudentCertificates(studentId)
        )
      : Promise.resolve([] as CertificateWithModule[]),
    isFeatureEnabled("billing")
      ? import("@/features/invoices/queries").then(({ getStudentInvoices }) =>
          getStudentInvoices(studentId)
        )
      : Promise.resolve([] as InvoiceRow[]),
    getUpcomingMeetingForStudent(studentId),
    needsQuizTopicsPromise,
  ]);

  const upcoming = meetings.filter(
    (m) => !m.is_completed && isUpcoming(m.meeting_date)
  );
  const past = meetings.filter(
    (m) => m.is_completed || !isUpcoming(m.meeting_date)
  );

  // Accessible modules: active always + paused only when they have completed topics
  const accessibleModules = allModules.filter(
    (m) => m.enrollmentStatus === 'active' || m.topics.length > 0
  );

  return (
    <StudentDashboardShell
      studentId={studentId}
      studentName={studentName}
      upcoming={upcoming}
      past={past}
      allModules={accessibleModules}
      completedTopics={completedTopics}
      needsQuizTopics={needsQuizTopics}
      // Extension props — undefined when flag is off
      gamData={gamData}
      certificates={certificates}
      townSquareMeeting={townSquareMeeting}
      invoices={invoices}
    />
  );
}
