// src/app/teacher/layout.tsx
// Role enforcement is done exclusively in middleware. This layout checks session
// and delegates rendering to DashboardAppShell with sidebar & mobile bottom bar.

import { headers } from "next/headers";
import { getAuthUser } from "@/lib/auth";
import { ROLE_DASHBOARD_MAP } from "@/lib/constants";
import { redirect } from "next/navigation";
import { DashboardAppShell } from "@/components/DashboardAppShell";
import { isFeatureEnabled } from "@/lib/featureConfig";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const [auth, headersList] = await Promise.all([
    getAuthUser(),
    headers(),
  ]);

  if (!auth.ok) {
    redirect("/login");
  }

  if (auth.role !== "teacher") {
    redirect(ROLE_DASHBOARD_MAP[auth.role]);
  }

  const { user } = auth;
  const pathname = headersList.get("x-pathname") ?? "";
  const fullName: string | null = user.user_metadata?.full_name ?? user.email ?? null;

  // Inject AI chatbot via slot so the shared shell stays feature-agnostic.
  let headerExtras: React.ReactNode = null;
  if (isFeatureEnabled("aiAssistant")) {
    const { TeacherAdminChatbot } = await import("@/features/ai/components/TeacherAdminChatbot");
    headerExtras = <TeacherAdminChatbot role="teacher" />;
  }

  return (
    <DashboardAppShell
      role="teacher"
      fullName={fullName}
      currentPath={pathname}
      maxWidthClass="max-w-5xl"
      headerExtras={headerExtras}
    >
      {children}
    </DashboardAppShell>
  );
}
