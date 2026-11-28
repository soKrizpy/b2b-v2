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

  // ── Dashboard data: run independent Supabase reads concurrently ────────────
  // Previously, optional sections and Town Square were fetched one after another
  // after the core queries. Their network latency accumulated on every page load.
  const [
    meetings,
    allModules,
    completedTopics,
    gamData,
    certificates,
    invoices,
    townSquareMeeting,
  ] = await Promise.all([
    getSessionsForStudent(user.id),
    getStudentModulesWithTopics(user.id),
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

  // NEEDS_QUIZ topics — only relevant when quest map progression is enabled.
  const needsQuizTopics: Array<{ id: number; title: string }> = [];
  if (isFeatureEnabled("questMap") || isFeatureEnabled("gamification")) {
    // Only active modules can have NEEDS_QUIZ topics; paused modules return needsQuizTopics: []
    const activeMod = accessibleModules.find((m) => m.enrollmentStatus === 'active') ?? null;
    if (activeMod) {
      const { getQuestMapData } = await import("@/features/quiz/questMapQueries");
      const questData = await getQuestMapData(user.id, activeMod);
      for (const node of questData.needsQuizTopics) {
        needsQuizTopics.push({ id: node.topic.id, title: node.topic.title });
      }
    }
  }

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
