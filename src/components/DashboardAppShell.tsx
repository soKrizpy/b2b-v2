'use client';
// src/components/DashboardAppShell.tsx
// Responsive layout: fixed sidebar (desktop) + sticky bottom nav (mobile).
// CSS-only transitions — no motion/react dependency.

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Users,
  Receipt,
  FileCheck2,
  Sparkles,
  Map,
  Trophy,
  HeartHandshake,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SignOutButton } from '@/features/auth/components/SignOutButton';
import { isFeatureEnabled, type FeatureGroup } from '@/lib/featureConfig';
import type { UserRole } from '@/types/roles';

// ── Role labels & pill classes ────────────────────────────────────────────────

const ROLE_LABEL: Record<UserRole, string> = {
  admin:   'ADMIN',
  teacher: 'GURU',
  student: 'SISWA',
};

const ROLE_PILL_CLASS: Record<UserRole, string> = {
  admin:   'bg-[#7cc62f]/15 text-[#5fa31f] border-emerald-500/30 dark:bg-[#7cc62f]/20 dark:text-[#a3e05a]',
  teacher: 'bg-sky-500/10 text-sky-700 border-sky-500/30 dark:bg-sky-500/20 dark:text-sky-300',
  student: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-300',
};

// ── Navigation structure (grouped + feature-gated) ────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  feature?: FeatureGroup;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const ROLE_NAV: Record<UserRole, NavGroup[]> = {
  admin: [
    {
      label: 'Kelola',
      items: [
        { href: '/admin/dashboard',  label: 'Dasbor',    icon: LayoutDashboard },
        { href: '/admin/curriculum', label: 'Kurikulum', icon: BookOpen },
        { href: '/admin/sessions',   label: 'Jadwal',    icon: Calendar },
        { href: '/admin/users',      label: 'Pengguna',  icon: Users },
      ],
    },
    {
      label: 'Operasional',
      items: [
        { href: '/admin/invoices', label: 'Invoice', icon: Receipt, feature: 'billing' },
      ],
    },
  ],
  teacher: [
    {
      label: 'Mengajar',
      items: [
        { href: '/teacher/dashboard',   label: 'Dasbor',      icon: LayoutDashboard },
        { href: '/teacher/students',    label: 'Siswa Saya',  icon: GraduationCap },
        { href: '/teacher/submissions', label: 'Tugas Siswa', icon: FileCheck2 },
      ],
    },
  ],
  student: [
    {
      label: 'Belajar',
      items: [
        { href: '/student/dashboard', label: 'Jadwal', icon: Sparkles },
        { href: '/student/lessons',   label: 'Materi', icon: Map },
      ],
    },
    {
      label: 'Profil',
      items: [
        { href: '/student/achievements', label: 'Pencapaian', icon: Trophy },
        { href: '/student/parent-hub',   label: 'Parent Hub', icon: HeartHandshake, feature: 'parentPortal' },
      ],
    },
  ],
};

// ── Props ──────────────────────────────────────────────────────────────────────

interface DashboardAppShellProps {
  role: UserRole;
  fullName: string | null;
  currentPath: string;
  children?: React.ReactNode;
  maxWidthClass?: string;
  /** Optional slot for AI chatbot or other extras injected by the layout. */
  headerExtras?: React.ReactNode;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DashboardAppShell({
  role,
  fullName,
  currentPath,
  children,
  maxWidthClass = 'max-w-7xl',
  headerExtras,
}: DashboardAppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted,   setMounted]   = useState(false);
  const clientPathname = usePathname();

  useEffect(() => { setMounted(true); }, []);

  // Compute visible nav groups (filter disabled features)
  const navGroups = useMemo(
    () =>
      ROLE_NAV[role]
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !item.feature || isFeatureEnabled(item.feature)),
        }))
        .filter((group) => group.items.length > 0),
    [role]
  );

  const navItems = useMemo(() => navGroups.flatMap((g) => g.items), [navGroups]);
  const pillClass = ROLE_PILL_CLASS[role];

  const activePath = mounted
    ? (clientPathname || currentPath)
    : (currentPath || navItems[0]?.href);

  const activeItem = useMemo(
    () => navItems.find((item) => activePath.startsWith(item.href)) ?? navItems[0],
    [navItems, activePath]
  );

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex">

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-40
          bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-xl
          border-r border-slate-200 dark:border-slate-700/60
          shadow-sm transition-all duration-300 ease-in-out ${collapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-slate-200 dark:border-slate-700/60 justify-between">
          <Link href={navItems[0]?.href ?? '/'} className="flex items-center gap-3 overflow-hidden">
            <Image src="/b2blight.webp" alt="bits2bytes" width={34} height={34} className="dark:hidden rounded-lg flex-shrink-0" priority />
            <Image src="/b2bdark.webp"  alt="bits2bytes" width={34} height={34} className="hidden dark:block rounded-lg flex-shrink-0" priority />
            {!collapsed && (
              <div className="flex flex-col min-w-0 animate-fade-in">
                <span className="text-sm font-black tracking-tight leading-none text-slate-900 dark:text-slate-50">
                  bits<span className="text-[#7cc62f]">2</span>bytes
                </span>
                <span className={`text-[9px] font-extrabold tracking-widest uppercase mt-1 px-1.5 py-0.5 rounded-full border self-start ${pillClass}`}>
                  {ROLE_LABEL[role]}
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
          {navGroups.map((group, groupIdx) => (
            <div key={group.label}>
              {groupIdx > 0 && (
                <div className="my-2 flex items-center gap-2 px-1">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/40" />
                  {!collapsed && (
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-600 whitespace-nowrap">
                      {group.label}
                    </span>
                  )}
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/40" />
                </div>
              )}
              {groupIdx === 0 && !collapsed && (
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-600 px-3.5 pt-1 pb-1.5">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const active = activePath.startsWith(item.href);
                const Icon   = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-extrabold
                      transition-colors duration-150 group
                      ${active
                        ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-400/40 dark:border-indigo-500/40'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                      } ${collapsed ? 'justify-center px-0' : ''}`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-150 group-hover:scale-110 ${active ? 'text-indigo-600 dark:text-indigo-300' : ''}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {active && !collapsed && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#7cc62f] shadow-sm" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-2xl text-xs font-bold
              bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-slate-700/60
              text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white
              hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-95"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : (
              <><ChevronLeft className="w-4 h-4" /><span>Ciutkan</span></>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${collapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 border-b bg-white/90 dark:bg-slate-950/90 border-slate-200 dark:border-slate-700/60 backdrop-blur-xl shadow-xs">
          <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
            {/* Left: mobile logo + page title */}
            <div className="flex items-center gap-3">
              <Link href={navItems[0]?.href ?? '/'} className="md:hidden flex items-center gap-2">
                <Image src="/b2blight.webp" alt="bits2bytes" width={30} height={30} className="dark:hidden rounded-lg" priority />
                <Image src="/b2bdark.webp"  alt="bits2bytes" width={30} height={30} className="hidden dark:block rounded-lg" priority />
              </Link>
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {ROLE_LABEL[role]}
                </span>
                <span className="text-xs text-slate-300 dark:text-slate-700">/</span>
                <span
                  suppressHydrationWarning
                  className="text-sm font-extrabold text-slate-900 dark:text-slate-50"
                >
                  {activeItem?.label}
                </span>
              </div>
            </div>

            {/* Right: theme toggle + user pill + sign-out */}
            <div className="flex items-center gap-2.5">
              <ThemeToggle />
              <div className="hidden sm:flex items-center gap-2 rounded-xl px-3 py-1.5 border bg-slate-50 border-slate-200 dark:bg-[#0B0F19] dark:border-slate-700/60 shadow-xs">
                <div className="w-5 h-5 rounded-md bg-[#7cc62f] flex items-center justify-center flex-shrink-0">
                  <span suppressHydrationWarning className="text-[10px] text-white font-black">
                    {(fullName ?? '?')[0].toUpperCase()}
                  </span>
                </div>
                <span suppressHydrationWarning className="text-xs font-bold text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
                  {fullName ?? '–'}
                </span>
              </div>
              <SignOutButton />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={`flex-1 mx-auto w-full ${maxWidthClass} px-4 sm:px-6 lg:px-8 pt-6 pb-24 md:pb-12 text-[var(--foreground)]`}>
          <div key={activePath} className="animate-slide-in">
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 h-16
          bg-white/95 dark:bg-[#020617]/95 backdrop-blur-2xl
          border-t border-slate-200 dark:border-slate-700/60
          px-4 flex items-center justify-around gap-1
          pb-[calc(0.25rem+env(safe-area-inset-bottom))]"
        aria-label="Mobile navigation"
      >
        {navItems.map((item) => {
          const active = activePath.startsWith(item.href);
          const Icon   = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className={`relative flex items-center justify-center p-2.5 rounded-2xl transition-colors duration-150 active:scale-95 ${
                active
                  ? 'text-indigo-600 dark:text-indigo-300 bg-indigo-500/10 border border-indigo-400/40'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-100'
              }`}
            >
              {active && (
                <span className="absolute -top-2.5 w-6 h-1 rounded-full bg-[#7cc62f] shadow-sm" />
              )}
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
      </nav>

      {/* Optional extras slot (AI chatbot, etc.) */}
      {headerExtras}
    </div>
  );
}
