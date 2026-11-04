// src/components/AppHeader.tsx
// Shared top navigation bar — bits2bytes branding, dark/light mode, role pill.
// Server Component shell; ThemeToggle and SignOutButton are Client sub-components.

import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { isFeatureEnabled, type FeatureGroup } from "@/lib/featureConfig";
import type { UserRole } from "@/types/roles";

// ── Role config ───────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<UserRole, string> = {
  admin:   "ADMIN",
  teacher: "GURU",
  student: "SISWA",
};

const ROLE_PILL_CLASS: Record<UserRole, string> = {
  admin:   "bg-[#7cc62f]/15 text-[#5fa31f] ring-[#7cc62f]/40 dark:bg-[#7cc62f]/20 dark:text-[#a3e05a]",
  teacher: "bg-sky-100/80 text-sky-700 ring-sky-300/60 dark:bg-sky-900/30 dark:text-sky-300",
  student: "bg-indigo-100/80 text-indigo-700 ring-indigo-300/60 dark:bg-indigo-900/30 dark:text-indigo-300",
};

const ROLE_ICON: Record<UserRole, string> = {
  admin:   "⚙️",
  teacher: "📚",
  student: "🎮",
};

const ROLE_ACTIVE: Record<UserRole, string> = {
  admin:   "bg-[#7cc62f]/10 text-slate-900 dark:bg-[#7cc62f]/15 dark:text-white ring-1 ring-[#7cc62f]/30",
  teacher: "bg-sky-50 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200 ring-1 ring-sky-200/60",
  student: "bg-indigo-50 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200 ring-1 ring-indigo-200/60",
};

// ── Navigation structure (grouped + feature-gated) ────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** When set, the item only renders if this feature flag is enabled. */
  feature?: FeatureGroup;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const ROLE_NAV: Record<UserRole, NavGroup[]> = {
  admin: [
    {
      label: "Kelola",
      items: [
        { href: "/admin/dashboard",  label: "Dasbor",    icon: "🏠" },
        { href: "/admin/curriculum", label: "Kurikulum", icon: "📖" },
        { href: "/admin/sessions",   label: "Jadwal",    icon: "📅" },
        { href: "/admin/users",      label: "Pengguna",  icon: "👥" },
      ],
    },
    {
      label: "Operasional",
      items: [
        { href: "/admin/invoices", label: "Invoice", icon: "🧾", feature: "billing" },
      ],
    },
  ],
  teacher: [
    {
      label: "Mengajar",
      items: [
        { href: "/teacher/dashboard",    label: "Dasbor",       icon: "🏠" },
        { href: "/teacher/students",     label: "Siswa Saya",   icon: "🎓" },
        { href: "/teacher/submissions",  label: "Tugas Siswa",  icon: "📝" },
      ],
    },
  ],
  student: [
    {
      label: "Belajar",
      items: [
        { href: "/student/dashboard", label: "Jadwal", icon: "📅" },
        { href: "/student/lessons",   label: "Materi", icon: "🗺️" },
      ],
    },
    {
      label: "Profil",
      items: [
        { href: "/student/achievements", label: "Pencapaian", icon: "🏆" },
        { href: "/student/parent-hub",   label: "Parent Hub", icon: "👨‍👩‍👧", feature: "parentPortal" },
      ],
    },
  ],
};

// ── Component ─────────────────────────────────────────────────────────────────

interface AppHeaderProps {
  role: UserRole;
  fullName: string | null;
  currentPath?: string;
}

export function AppHeader({ role, fullName, currentPath }: AppHeaderProps) {
  // Filter each group's items by feature flag, drop empty groups.
  const navGroups = ROLE_NAV[role]
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.feature || isFeatureEnabled(item.feature)
      ),
    }))
    .filter((group) => group.items.length > 0);

  // Flatten for active-state lookup and mobile nav.
  const navItems = navGroups.flatMap((g) => g.items);

  const pillClass   = ROLE_PILL_CLASS[role];
  const activeClass = ROLE_ACTIVE[role];

  return (
    <header
      className="sticky top-0 z-40 border-b transition-colors
        bg-white/90 dark:bg-slate-950/90
        border-blue-400/40 dark:border-purple-500/40
        backdrop-blur-xl shadow-sm dark:shadow-purple-950/30"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* ── Brand + role pill + nav ─────────────────────── */}
          <div className="flex items-center gap-5">

            {/* Logo */}
            <Link href={navItems[0]?.href ?? "/"} className="flex items-center gap-2.5 group flex-shrink-0">
              <Image
                src="/b2blight.webp"
                alt="bits2bytes"
                width={36}
                height={36}
                className="dark:hidden rounded-lg"
                priority
              />
              <Image
                src="/b2bdark.webp"
                alt="bits2bytes"
                width={36}
                height={36}
                className="hidden dark:block rounded-lg"
                priority
              />
              <span className="hidden sm:block text-sm font-black tracking-tight select-none">
                <span className="text-slate-900 dark:text-purple-50">bits</span>
                <span className="text-[#7cc62f]">2</span>
                <span className="text-slate-900 dark:text-purple-50">bytes</span>
              </span>
              <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-extrabold
                uppercase tracking-widest px-2 py-0.5 rounded-full ring-1 ${pillClass}`}>
                {ROLE_ICON[role]} {ROLE_LABEL[role]}
              </span>
            </Link>

            <div className="hidden sm:block h-5 w-px bg-blue-300/40 dark:bg-purple-500/30" />

            {/* Nav — flat items (groups only shown in sidebar) */}
            <nav className="hidden sm:flex items-center gap-0.5" aria-label="Main navigation">
              {navItems.map(({ href, label, icon }) => {
                const active = currentPath?.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`relative px-3 py-1.5 rounded-xl text-sm font-medium
                      transition-all duration-200 flex items-center gap-1.5
                      ${active
                        ? activeClass
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-purple-50 hover:bg-blue-50/60 dark:hover:bg-purple-950/40"
                      }`}
                  >
                    <span className="text-base leading-none">{icon}</span>
                    {label}
                    {active && (
                      <span className="absolute -bottom-px left-3 right-3 h-0.5 rounded-full bg-[#7cc62f]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* ── Right side: theme toggle + user pill + sign-out ─ */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-2 rounded-xl px-3 py-1.5 border
              bg-white border-blue-400/40
              dark:bg-[#0B0F19] dark:border-purple-500/40 shadow-xs">
              <div className="w-5 h-5 rounded-md bg-[#7cc62f] flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] text-white font-bold">
                  {(fullName ?? "?")[0].toUpperCase()}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-purple-100
                max-w-[120px] truncate">
                {fullName ?? "–"}
              </span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </div>

      {/* ── Mobile Bottom Nav Bar ───────────────────────────────────────── */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50
          bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl
          border-t border-blue-400/40 dark:border-purple-500/40
          shadow-[0_-4px_20px_rgba(59,130,246,0.1)] dark:shadow-[0_-4px_25px_rgba(168,85,247,0.25)]
          px-3 py-2 flex items-center justify-around gap-1
          pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
        aria-label="Mobile navigation bar"
      >
        {navItems.map(({ href, label, icon }) => {
          const active = currentPath?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`relative flex flex-col items-center justify-center gap-0.5
                min-w-[3rem] px-2 py-1.5 rounded-2xl
                transition-all duration-200 active:scale-95
                ${active
                  ? `${activeClass} shadow-md scale-105`
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/8"
                }`}
            >
              {active && (
                <span className="absolute -top-1 w-2 h-2 rounded-full bg-[#7cc62f] shadow-sm shadow-[#7cc62f]" />
              )}
              <span className="text-xl leading-none">{icon}</span>
              <span className={`text-[9px] font-bold leading-tight tracking-wide
                ${active ? "text-slate-800 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
