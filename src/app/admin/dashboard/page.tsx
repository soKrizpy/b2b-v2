// src/app/admin/dashboard/page.tsx
import type { Metadata } from "next";
import {
  getSessionsForAdmin,
  getTeacherOptions,
  getStudentOptions,
} from "@/features/sessions/queries";
import { computeAdminMetrics } from "@/features/dashboard/admin/metrics";
import { DashboardShell } from "@/features/dashboard/admin/DashboardShell";

export const metadata: Metadata = { title: "Dasbor Admin — Bits2Bytes" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  try {
    const [meetings, teachers, students] = await Promise.all([
      getSessionsForAdmin(),
      getTeacherOptions(),
      getStudentOptions(),
    ]);
    const metrics = computeAdminMetrics(meetings);
    return (
      <DashboardShell
        meetings={meetings}
        teachers={teachers}
        students={students}
        metrics={metrics}
      />
    );
  } catch (err) {
    // Surface the real error instead of a cryptic 500
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : '';
    console.error('[AdminDashboardPage] CRASH:', msg, stack);
    throw err; // re-throw so error boundary catches it
  }
}
