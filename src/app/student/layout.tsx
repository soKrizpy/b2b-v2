// src/app/student/layout.tsx
// Role enforcement is done exclusively in middleware. This layout checks session
// and delegates rendering to DashboardAppShell with sidebar & mobile bottom bar.

import { headers } from "next/headers";
import { preload } from "react-dom";
import { getAuthUser } from "@/lib/auth";
import { ROLE_DASHBOARD_MAP } from "@/lib/constants";
import { redirect } from "next/navigation";
import { DashboardAppShell } from "@/components/DashboardAppShell";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  // Start fetching the Font Awesome solid font while auth/layout work is in progress.
  // The global stylesheet already references this exact CDN font URL.
  preload(
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.woff2",
    { as: "font", crossOrigin: "anonymous", type: "font/woff2" }
  );

  const [auth, headersList] = await Promise.all([
    getAuthUser(),
    headers(),
  ]);

  if (!auth.ok) {
    redirect("/login");
  }

  if (auth.role !== "student") {
    redirect(ROLE_DASHBOARD_MAP[auth.role]);
  }

  const { user } = auth;
  const pathname = headersList.get("x-pathname") ?? "";
  const fullName: string | null = user.user_metadata?.full_name ?? user.email ?? null;

  return (
    <DashboardAppShell role="student" fullName={fullName} currentPath={pathname} maxWidthClass="max-w-5xl">
      {children}
    </DashboardAppShell>
  );
}
