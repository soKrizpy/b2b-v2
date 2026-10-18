// src/app/admin/layout.tsx
import { headers } from "next/headers";
import { getAuthUser } from "@/lib/auth";
import { ROLE_DASHBOARD_MAP } from "@/lib/constants";
import { redirect } from "next/navigation";
import { DashboardAppShell } from "@/components/DashboardAppShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    const [auth, headersList] = await Promise.all([
      getAuthUser(),
      headers(),
    ]);
    if (!auth.ok) redirect("/login");
    if (auth.role !== "admin") redirect(ROLE_DASHBOARD_MAP[auth.role]);
    const { user } = auth;
    const pathname = headersList.get("x-pathname") ?? "";
    const fullName: string | null = user.user_metadata?.full_name ?? user.email ?? null;
    return (
      <DashboardAppShell role="admin" fullName={fullName} currentPath={pathname} maxWidthClass="max-w-7xl">
        {children}
      </DashboardAppShell>
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? (err.stack ?? '') : '';
    // Log full error to Vercel runtime logs
    console.error('[AdminLayout] RENDER ERROR:', msg);
    console.error('[AdminLayout] STACK:', stack);
    throw err;
  }
}
