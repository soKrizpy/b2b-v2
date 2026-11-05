// src/__tests__/teacher-dashboard-decoupling.test.ts
// Static source checks verifying teacher-side decoupling.
// certificates flag removed — TeacherStudentDetail now shows certs unconditionally.
// announcements flag removed — TeacherDashboard still uses dynamic import for banner.
// aiAssistant flag still gates AI draft in session components.

import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const TEACHER_PAGE = fs.readFileSync(
  path.resolve(__dirname, '..', 'app', 'teacher', 'dashboard', 'page.tsx'),
  'utf-8'
);

const TEACHER_COMPLETE = fs.readFileSync(
  path.resolve(__dirname, '..', 'features', 'sessions', 'components', 'TeacherCompleteAction.tsx'),
  'utf-8'
);

const ADMIN_SESSION_ACTIONS = fs.readFileSync(
  path.resolve(__dirname, '..', 'features', 'sessions', 'components', 'AdminSessionActions.tsx'),
  'utf-8'
);

const TEACHER_STUDENT_DETAIL = fs.readFileSync(
  path.resolve(__dirname, '..', 'features', 'teacher', 'students', 'TeacherStudentDetail.tsx'),
  'utf-8'
);

// ── Teacher dashboard page ────────────────────────────────────────────────────

describe('teacher/dashboard/page.tsx — announcements', () => {
  it('does not statically import AnnouncementBanner', () => {
    const topLevelImports = TEACHER_PAGE.split('\n').filter((l) => l.startsWith('import ')).join('\n');
    expect(topLevelImports).not.toMatch(/AnnouncementBanner/);
  });

  it('renders AnnouncementBanner via async server component wrapper', () => {
    // announcements flag removed — banner always renders via TeacherAnnouncementBanner
    expect(TEACHER_PAGE).toMatch(/TeacherAnnouncementBanner/);
    expect(TEACHER_PAGE).toMatch(/AnnouncementBanner/);
  });
});

// ── TeacherCompleteAction — AI draft ─────────────────────────────────────────

describe('TeacherCompleteAction.tsx — AI draft decoupling', () => {
  it('does not statically import draftProgressReport', () => {
    const topLevel = TEACHER_COMPLETE.split('\n').filter((l) => l.startsWith('import ')).join('\n');
    expect(topLevel).not.toMatch(/@\/features\/ai/);
  });

  it('gates AI draft button behind FEATURE_FLAGS.aiAssistant', () => {
    expect(TEACHER_COMPLETE).toMatch(/FEATURE_FLAGS\.aiAssistant/);
    const flagIdx = TEACHER_COMPLETE.indexOf('FEATURE_FLAGS.aiAssistant');
    const btnIdx  = TEACHER_COMPLETE.indexOf('Bantu Tulis dengan AI');
    expect(flagIdx).toBeGreaterThan(0);
    expect(btnIdx).toBeGreaterThan(flagIdx);
  });

  it('uses dynamic import for draftProgressReport', () => {
    expect(TEACHER_COMPLETE).toMatch(/import\('@\/features\/ai\/actions'\)/);
  });
});

// ── AdminSessionActions — AI draft ───────────────────────────────────────────

describe('AdminSessionActions.tsx — AI draft decoupling', () => {
  it('does not statically import draftProgressReport', () => {
    const topLevel = ADMIN_SESSION_ACTIONS.split('\n').filter((l) => l.startsWith('import ')).join('\n');
    expect(topLevel).not.toMatch(/@\/features\/ai/);
  });

  it('gates AI draft button behind FEATURE_FLAGS.aiAssistant', () => {
    expect(ADMIN_SESSION_ACTIONS).toMatch(/FEATURE_FLAGS\.aiAssistant/);
    const flagIdx = ADMIN_SESSION_ACTIONS.indexOf('FEATURE_FLAGS.aiAssistant');
    const btnIdx  = ADMIN_SESSION_ACTIONS.indexOf('Bantu Tulis dengan AI');
    expect(flagIdx).toBeGreaterThan(0);
    expect(btnIdx).toBeGreaterThan(flagIdx);
  });
});

// ── TeacherStudentDetail — certificates always on ────────────────────────────

describe('TeacherStudentDetail.tsx — certificates always on', () => {
  it('does NOT import FEATURE_FLAGS (certificates flag removed)', () => {
    expect(TEACHER_STUDENT_DETAIL).not.toMatch(/FEATURE_FLAGS/);
  });

  it('does NOT gate certificate section behind a flag', () => {
    expect(TEACHER_STUDENT_DETAIL).not.toMatch(/FEATURE_FLAGS\.certificates/);
  });

  it('still renders CERTIFICATE_TIER_CONFIG for cert display', () => {
    expect(TEACHER_STUDENT_DETAIL).toMatch(/CERTIFICATE_TIER_CONFIG/);
  });
});
