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
}
