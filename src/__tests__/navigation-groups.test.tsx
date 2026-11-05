// src/__tests__/navigation-groups.test.tsx
// Verifies grouped nav structure, feature-gated items, and 2-group layout for students.

import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies before importing the shell component.
import { vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/student/dashboard' }));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement('img', { src, alt }),
}));
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement('div', props, children),
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement('span', props, children),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<unknown>) =>
    React.createElement(React.Fragment, null, children),
}));
vi.mock('@/features/auth/components/SignOutButton', () => ({
  SignOutButton: () => React.createElement('button', null, 'Sign Out'),
}));
vi.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => React.createElement('div', null),
}));

const ORIGINAL_ENV = {
  billing: process.env.NEXT_PUBLIC_ENABLE_BILLING,
  parentPortal: process.env.NEXT_PUBLIC_ENABLE_PARENT_PORTAL,
};

function restoreEnv() {
  if (ORIGINAL_ENV.billing === undefined) delete process.env.NEXT_PUBLIC_ENABLE_BILLING;
  else process.env.NEXT_PUBLIC_ENABLE_BILLING = ORIGINAL_ENV.billing;
  if (ORIGINAL_ENV.parentPortal === undefined) delete process.env.NEXT_PUBLIC_ENABLE_PARENT_PORTAL;
  else process.env.NEXT_PUBLIC_ENABLE_PARENT_PORTAL = ORIGINAL_ENV.parentPortal;
}

// ── Source-level checks ───────────────────────────────────────────────────────

const SHELL_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', 'components', 'DashboardAppShell.tsx'),
  'utf-8'
);

describe('nav restructure — source structure', () => {
  it('uses NavGroup[] structure in ROLE_NAV', () => {
    expect(SHELL_SOURCE).toMatch(/NavGroup\[\]/);
  });

  it('student nav has a "Belajar" group', () => {
    expect(SHELL_SOURCE).toMatch(/Belajar/);
  });

  it('student nav has a "Profil" group', () => {
    expect(SHELL_SOURCE).toMatch(/Profil/);
  });

  it('admin nav has a "Kelola" group', () => {
    expect(SHELL_SOURCE).toMatch(/Kelola/);
  });

  it('admin nav has an "Operasional" group', () => {
    expect(SHELL_SOURCE).toMatch(/Operasional/);
  });

  it('teacher nav has a "Mengajar" group', () => {
    expect(SHELL_SOURCE).toMatch(/Mengajar/);
  });

  it('Invoice nav item is feature-gated by billing flag', () => {
    // The Invoice item should reference 'billing' as its feature
    expect(SHELL_SOURCE).toMatch(/['"]billing['"]/);
    expect(SHELL_SOURCE).toMatch(/invoices/i);
  });

  it('Parent Hub nav item is feature-gated by parentPortal flag', () => {
    expect(SHELL_SOURCE).toMatch(/['"]parentPortal['"]/);
    expect(SHELL_SOURCE).toMatch(/parent-hub/i);
  });
});

// ── Runtime render checks ─────────────────────────────────────────────────────

describe('nav restructure — runtime rendering', () => {
  afterEach(restoreEnv);

  it('renders Belajar group label for student', async () => {
    vi.resetModules();
    const { DashboardAppShell } = await import('@/components/DashboardAppShell');
    render(
      React.createElement(DashboardAppShell, {
        role: 'student' as const,
        fullName: 'Siswa Test',
        currentPath: '/student/dashboard',
      }, 'content')
    );
    expect(screen.getAllByText('Belajar').length).toBeGreaterThanOrEqual(1);
  });

  it('renders Profil group label for student', async () => {
    vi.resetModules();
    const { DashboardAppShell } = await import('@/components/DashboardAppShell');
    render(
      React.createElement(DashboardAppShell, {
        role: 'student' as const,
        fullName: 'Siswa Test',
        currentPath: '/student/lessons',
      }, 'content')
    );
    expect(screen.getAllByText('Profil').length).toBeGreaterThanOrEqual(1);
  });

  it('hides Invoice nav item when billing flag is off', async () => {
    process.env.NEXT_PUBLIC_ENABLE_BILLING = 'false';
    vi.resetModules();
    const { DashboardAppShell } = await import('@/components/DashboardAppShell');
    render(
      React.createElement(DashboardAppShell, {
        role: 'admin' as const,
        fullName: 'Admin Test',
        currentPath: '/admin/dashboard',
      }, 'content')
    );
    expect(screen.queryByText('Invoice')).toBeNull();
  });

  it('shows Invoice nav item when billing flag is on (default)', async () => {
    delete process.env.NEXT_PUBLIC_ENABLE_BILLING;
    vi.resetModules();
    const { DashboardAppShell } = await import('@/components/DashboardAppShell');
    render(
      React.createElement(DashboardAppShell, {
        role: 'admin' as const,
        fullName: 'Admin Test',
        currentPath: '/admin/dashboard',
      }, 'content')
    );
    expect(screen.getAllByText('Invoice').length).toBeGreaterThanOrEqual(1);
  });

  it('hides Parent Hub when parentPortal flag is off', async () => {
    process.env.NEXT_PUBLIC_ENABLE_PARENT_PORTAL = 'false';
    vi.resetModules();
    const { DashboardAppShell } = await import('@/components/DashboardAppShell');
    render(
      React.createElement(DashboardAppShell, {
        role: 'student' as const,
        fullName: 'Siswa Test',
        currentPath: '/student/dashboard',
      }, 'content')
    );
    expect(screen.queryByText('Parent Hub')).toBeNull();
  });
});
