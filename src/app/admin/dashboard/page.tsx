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
  const [meetings, teachers, students] = await Promise.all([
    getSessionsForAdmin(),
    getTeacherOptions(),
    getStudentOptions(),
  ]);
  const renderTimestamp = Date.now();
  const metrics = computeAdminMetrics(meetings, new Date(renderTimestamp));
  return (
    <DashboardShell
      meetings={meetings}
      teachers={teachers}
      students={students}
      metrics={metrics}
      renderTimestamp={renderTimestamp}
    />
  );
}
