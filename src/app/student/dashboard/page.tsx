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

  // ── Core fetches (always run) ──────────────────────────────────────────────
  const [meetings, allModules, completedTopics] = await Promise.all([
    getSessionsForStudent(user.id),
    getStudentModulesWithTopics(user.id),
    getStudentCompletedTopics(user.id),
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

  // ── Extension fetches (flag-gated) ─────────────────────────────────────────

  let gamData: StudentGamificationData | null = null;
  if (isFeatureEnabled("gamification")) {
    const { getStudentGamificationData } = await import("@/features/pet/lib/petQueries");
    gamData = await getStudentGamificationData(user.id);
  }

  let certificates: CertificateWithModule[] = [];
  if (isFeatureEnabled("certificates")) {
    const { getStudentCertificates } = await import("@/features/certificates/queries");
    certificates = await getStudentCertificates(user.id);
  }

  let invoices: InvoiceRow[] = [];
  if (isFeatureEnabled("billing")) {
    const { getStudentInvoices } = await import("@/features/invoices/queries");
    invoices = await getStudentInvoices(user.id);
  }

  // TownSquare enriches sessions with avatar seats (gamification context).
  // Still useful for the schedule pod even without gamification, but the
  // avatar cosmetics are stripped when gamification is off.
  let townSquareMeeting: TownSquareMeeting | null = null;
  const { getUpcomingMeetingForStudent: getTownSquare } = await import("@/features/sessions/queries");
  townSquareMeeting = await getTownSquare(user.id);

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
