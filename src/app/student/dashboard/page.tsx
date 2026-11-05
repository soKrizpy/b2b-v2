// src/app/student/dashboard/page.tsx
// Student dashboard — all data fetched in parallel.
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSessionsForStudent, getUpcomingMeetingForStudent } from "@/features/sessions/queries";
import { getStudentModulesWithTopics, getStudentCompletedTopics } from "@/features/curriculum/queries";
import { getStudentGamificationData } from "@/features/pet/lib/petQueries";
import { getStudentCertificates } from "@/features/certificates/queries";
import { getQuestMapData } from "@/features/quiz/questMapQueries";
import { isUpcoming } from "@/lib/formatDate";
import { isFeatureEnabled } from "@/lib/featureConfig";
import { StudentDashboardShell } from "@/features/dashboard/student/StudentDashboardShell";
import type { InvoiceRow } from "@/types/database";

export const metadata: Metadata = { title: "Dasbor Siswa — Bits2Bytes" };
export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const studentName: string =
    user.user_metadata?.full_name?.split(" ")[0] ?? "Kamu";

  // Fetch core + always-on extensions in parallel
  const [meetings, allModules, completedTopics, gamData, certificates, townSquareMeeting] =
    await Promise.all([
      getSessionsForStudent(user.id),
      getStudentModulesWithTopics(user.id),
      getStudentCompletedTopics(user.id),
      getStudentGamificationData(user.id),
      getStudentCertificates(user.id),
      getUpcomingMeetingForStudent(user.id),
    ]);

  const upcoming = meetings.filter((m) => !m.is_completed && isUpcoming(m.meeting_date));
  const past     = meetings.filter((m) =>  m.is_completed || !isUpcoming(m.meeting_date));

  const accessibleModules = allModules.filter(
    (m) => m.enrollmentStatus === 'active' || m.topics.length > 0
  );

  // Billing: still flag-gated
  let invoices: InvoiceRow[] = [];
  if (isFeatureEnabled("billing")) {
    const { getStudentInvoices } = await import("@/features/invoices/queries");
    invoices = await getStudentInvoices(user.id);
  }

  // NEEDS_QUIZ topics from the active module
  const needsQuizTopics: Array<{ id: number; title: string }> = [];
  const activeMod = accessibleModules.find((m) => m.enrollmentStatus === 'active') ?? null;
  if (activeMod) {
    const questData = await getQuestMapData(user.id, activeMod);
    for (const node of questData.needsQuizTopics) {
      needsQuizTopics.push({ id: node.topic.id, title: node.topic.title });
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
      gamData={gamData}
      certificates={certificates}
      townSquareMeeting={townSquareMeeting}
      invoices={invoices}
    />
  );
}
