// src/features/auth/components/SignOutButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    try {
      const res = await fetch("/api/auth/signout", { method: "POST" });
      const data = await res.json().catch(() => ({ redirectTo: "/login" }));
      if (typeof document !== "undefined") {
        document.cookie = "b2b_role=; path=/; max-age=0; SameSite=None; Secure; Partitioned";
        document.cookie = "b2b_mock_user_id=; path=/; max-age=0; SameSite=None; Secure; Partitioned";
      }
      if (typeof window !== "undefined") {
        window.location.href = data.redirectTo || "/login";
      } else {
        router.replace(data.redirectTo || "/login");
        router.refresh();
      }
    } catch {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      } else {
        router.replace("/login");
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium
        text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30
        transition-all duration-150 disabled:opacity-50 active:scale-95 group"
      title="Keluar"
    >
      <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M6 10a.75.75 0 01.75-.75h9.546l-1.048-.943a.75.75 0 111.004-1.114l2.5 2.25a.75.75 0 010 1.114l-2.5 2.25a.75.75 0 11-1.004-1.114l1.048-.943H6.75A.75.75 0 016 10z" clipRule="evenodd" />
      </svg>
      <span className="hidden sm:inline">{pending ? "Keluar…" : "Keluar"}</span>
    </button>
  );
}
