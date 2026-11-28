// src/app/student/dashboard/page.tsx
// Student dashboard — core data always fetched; extension data (gamification,
// certificates, invoices, quest-map quiz status, announcements) fetched only
// when their respective feature flags are enabled.
import type { Metadata } from "next";
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

  // ── Dashboard data: overlap Quest Map with the other dashboard reads ────────
  // Quest Map only depends on the enrolled modules. Start it as soon as that
  // query resolves instead of waiting for meetings, progress, and optional cards.
  const allModulesPromise = getStudentModulesWithTopics(user.id);
  const needsQuestMap = isFeatureEnabled("questMap") || isFeatureEnabled("gamification");
  const needsQuizTopicsPromise = needsQuestMap
    ? allModulesPromise.then(async (modules) => {
        const activeMod = modules.find((m) => m.enrollmentStatus === 'active') ?? null;
        if (!activeMod) return [] as Array<{ id: number; title: string }>;

        const { getQuestMapData } = await import("@/features/quiz/questMapQueries");
        const questData = await getQuestMapData(user.id, activeMod);
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
    getSessionsForStudent(user.id),
    allModulesPromise,
    getStudentCompletedTopics(user.id),
    isFeatureEnabled("gamification")
      ? import("@/features/pet/lib/petQueries").then(({ getStudentGamificationData }) =>
          getStudentGamificationData(user.id)
        )
      : Promise.resolve(null),
    isFeatureEnabled("certificates")
      ? import("@/features/certificates/queries").then(({ getStudentCertificates }) =>
          getStudentCertificates(user.id)
        )
      : Promise.resolve([] as CertificateWithModule[]),
    isFeatureEnabled("billing")
      ? import("@/features/invoices/queries").then(({ getStudentInvoices }) =>
          getStudentInvoices(user.id)
        )
      : Promise.resolve([] as InvoiceRow[]),
    getUpcomingMeetingForStudent(user.id),
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
      studentId={user.id}
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
