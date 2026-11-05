// src/__tests__/student-dashboard-split.test.tsx
// Verifies StudentDashboardShell renders correctly with and without extension props,
// and that the dashboard page unconditionally fetches gamification + certificates
// (now always-on) while still flag-gating billing.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';

const PAGE_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', 'app', 'student', 'dashboard', 'page.tsx'),
  'utf-8'
);

const SHELL_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', 'features', 'dashboard', 'student', 'StudentDashboardShell.tsx'),
  'utf-8'
);

describe('student dashboard page — fetches', () => {
  it('always fetches gamification data (no flag guard)', () => {
    expect(PAGE_SOURCE).toMatch(/getStudentGamificationData/);
    expect(PAGE_SOURCE).not.toMatch(/isFeatureEnabled.*gamification/);
  });

  it('always fetches certificates (no flag guard)', () => {
    expect(PAGE_SOURCE).toMatch(/getStudentCertificates/);
    expect(PAGE_SOURCE).not.toMatch(/isFeatureEnabled.*certificates/);
  });

  it('still gates billing fetch behind billing flag', () => {
    expect(PAGE_SOURCE).toMatch(/isFeatureEnabled.*billing/);
    expect(PAGE_SOURCE).toMatch(/getStudentInvoices/);
  });

  it('always fetches core data (sessions, modules, completedTopics)', () => {
    expect(PAGE_SOURCE).toMatch(/getSessionsForStudent/);
    expect(PAGE_SOURCE).toMatch(/getStudentModulesWithTopics/);
    expect(PAGE_SOURCE).toMatch(/getStudentCompletedTopics/);
  });
});

describe('student dashboard shell — flags', () => {
  it('AnnouncementBanner is rendered unconditionally (announcements flag removed)', () => {
    // announcements flag removed — banner always renders
    expect(SHELL_SOURCE).toMatch(/AnnouncementBanner/);
    expect(SHELL_SOURCE).not.toMatch(/FEATURE_FLAGS\.announcements/);
  });

  it('still gates BillingNoticeModal behind billing flag', () => {
    expect(SHELL_SOURCE).toMatch(/FEATURE_FLAGS\.billing/);
    expect(SHELL_SOURCE).toMatch(/BillingNoticeModal/);
  });

  it('CosmeticShopModal renders unconditionally when gamData present (gamification always on)', () => {
    // gamification flag removed — CosmeticShopModal guarded only by gamData presence
    expect(SHELL_SOURCE).toMatch(/CosmeticShopModal/);
    expect(SHELL_SOURCE).not.toMatch(/FEATURE_FLAGS\.gamification/);
  });
});

// ── Runtime render checks ─────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({ usePathname: () => '/student/dashboard' }));
vi.mock('@/features/dashboard/student/TownSquarePod', () => ({
  TownSquarePod: () => React.createElement('div', { 'data-testid': 'town-square-pod' }),
}));
vi.mock('@/features/pet/components/CyberPetWidget', () => ({
  CyberPetWidget: () => React.createElement('div', { 'data-testid': 'cyber-pet' }),
}));
vi.mock('@/features/invoices/components/BillingNoticeModal', () => ({
  BillingNoticeModal: () => React.createElement('div', { 'data-testid': 'billing-modal' }),
}));
vi.mock('@/features/announcements/components/AnnouncementBanner', () => ({
  AnnouncementBanner: () => React.createElement('div', { 'data-testid': 'announcement-banner' }),
}));
vi.mock('@/features/dashboard/student/LevelUpCelebrationModal', () => ({
  LevelUpCelebrationModal: () => null,
  getAdventurerTitle: () => ({ title: 'Petualang', color: '#fff' }),
}));
vi.mock('@/features/pet/lib/levelCalc', () => ({ calculateLevel: () => null }));
vi.mock('@/lib/formatDate', () => ({ isLive: () => false, formatDate: (d: string) => d, formatTime: (d: string) => d }));
vi.mock('@/components/common/HeroAtmosphere', () => ({ HeroAtmosphere: () => null }));
vi.mock('@/components/common/LiveStatusIndicator', () => ({ LiveStatusIndicator: () => null }));
vi.mock('@/features/pet/components/CosmeticShopModal', () => ({ CosmeticShopModal: () => null }));

describe('StudentDashboardShell — runtime rendering', () => {
  afterEach(() => { vi.resetModules(); });

  it('renders without extension props (no crash)', async () => {
    const { StudentDashboardShell } = await import('@/features/dashboard/student/StudentDashboardShell');
    const { container } = render(React.createElement(StudentDashboardShell, {
      studentId: 'student-1', studentName: 'Adi',
      upcoming: [], past: [], needsQuizTopics: [],
    }));
    expect(container).toBeDefined();
    expect(container.textContent).toContain('Adi');
  });

  it('renders with all extension props (no crash)', async () => {
    const { StudentDashboardShell } = await import('@/features/dashboard/student/StudentDashboardShell');
    const { container } = render(React.createElement(StudentDashboardShell, {
      studentId: 'student-1', studentName: 'Budi',
      upcoming: [], past: [], needsQuizTopics: [],
      gamData: null, certificates: [], invoices: [], townSquareMeeting: null,
    }));
    expect(container.textContent).toContain('Budi');
  });
});
