// src/app/admin/sessions/page.tsx
import type { Metadata } from "next";
import {
  getSessionsForAdmin,
  getTeacherOptions,
  getStudentOptions,
} from "@/features/sessions/queries";
import { AdminSessionsShell } from "@/features/sessions/components/AdminSessionsShell";

export const metadata: Metadata = { title: "Kelola Jadwal — Bits2Bytes Admin" };
export const dynamic = "force-dynamic";

export default async function AdminSessionsPage() {
  try {
    const [meetings, teachers, students] = await Promise.all([
      getSessionsForAdmin(),
      getTeacherOptions(),
      getStudentOptions(),
    ]);
    return (
      <AdminSessionsShell
        meetings={meetings}
        teachers={teachers}
        students={students}
      />
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[AdminSessionsPage] CRASH:", msg, err instanceof Error ? err.stack : "");
    throw err;
  }
}
