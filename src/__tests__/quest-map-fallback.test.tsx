// src/__tests__/quest-map-fallback.test.tsx
// Quest Map is now always rendered (questMap flag removed).
// SimpleTopicList still exists but is no longer the fallback; QuestMapClient is always used.
// Tests verify SimpleTopicList renders correctly and lessons page always uses QuestMapClient.

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.PropsWithChildren<{ href: string }>) =>
    React.createElement('a', { href, ...props }, children),
}));

const PAGE_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', 'app', 'student', 'lessons', 'page.tsx'),
  'utf-8'
);

describe('lessons page — QuestMapClient always rendered', () => {
  it('does NOT gate QuestMapClient behind a questMap flag', () => {
    // questMap flag was removed — no isFeatureEnabled('questMap') check
    expect(PAGE_SOURCE).not.toMatch(/isFeatureEnabled\('questMap'\)/);
  });

  it('always uses QuestMapClient (not guarded by a flag)', () => {
    expect(PAGE_SOURCE).toMatch(/QuestMapClient/);
    // No isFeatureEnabled check around it
    expect(PAGE_SOURCE).not.toMatch(/isFeatureEnabled.*questMap/);
  });

  it('always fetches questMapData (core progression logic)', () => {
    expect(PAGE_SOURCE).toMatch(/getQuestMapData/);
  });

  it('always fetches certificates (no flag guard)', () => {
    expect(PAGE_SOURCE).toMatch(/getStudentCertificates/);
    expect(PAGE_SOURCE).not.toMatch(/isFeatureEnabled.*certificates/);
  });
});

// ── SimpleTopicList component tests ──────────────────────────────────────────

const makeNode = (id: number, title: string, status: 'COMPLETED' | 'NEEDS_QUIZ' | 'ACTIVE_NEXT' | 'LOCKED') => ({
  topic: {
    id, module_id: 1, title, order_index: id, description: null,
    project_link: null, topic_link: null, engine_topic_id: null,
    lesson_content: null, status: 'published' as const,
    published_at: null, created_at: null, challenge_count: 0,
  },
  status, hasQuiz: false, attemptsUsed: 0, bestScore: 0,
  stars: 0 as const, sessionNumber: id, isSessionReportSubmitted: false,
  quizUnlocked: false, isUnlocked: status !== 'LOCKED', meetingDate: null,
});

const QUEST_DATA = {
  mod: { id: 1, title: 'Python Dasar', description: null, level: 'Beginner', gamification_type: 'quest', is_active: true, created_at: null, topics: [] },
  nodes: [
    makeNode(1, 'Variabel & Tipe Data', 'COMPLETED'),
    makeNode(2, 'Kondisi If/Else', 'NEEDS_QUIZ'),
    makeNode(3, 'Looping', 'ACTIVE_NEXT'),
    makeNode(4, 'Fungsi', 'LOCKED'),
  ],
  moduleComplete: false, hasFinal: true, needsQuizTopics: [],
};

describe('SimpleTopicList — rendering', () => {
  it('renders all topic titles', async () => {
    const { SimpleTopicList } = await import('@/app/student/lessons/SimpleTopicList');
    render(React.createElement(SimpleTopicList, {
      questData: QUEST_DATA,
      allModules: [{ id: 1, title: 'Python Dasar', topicCount: 4, enrollmentStatus: 'active' as const }],
      currentModuleId: 1, accessibleCount: 1,
    }));
    expect(screen.getByText('Variabel & Tipe Data')).toBeDefined();
    expect(screen.getByText('Kondisi If/Else')).toBeDefined();
    expect(screen.getByText('Looping')).toBeDefined();
    expect(screen.getByText('Fungsi')).toBeDefined();
  });

  it('renders status labels correctly', async () => {
    const { SimpleTopicList } = await import('@/app/student/lessons/SimpleTopicList');
    render(React.createElement(SimpleTopicList, {
      questData: QUEST_DATA,
      allModules: [{ id: 1, title: 'Python Dasar', topicCount: 4, enrollmentStatus: 'active' as const }],
      currentModuleId: 1, accessibleCount: 1,
    }));
    expect(screen.getAllByText(/Selesai/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Kuis Siap/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Aktif/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Terkunci/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders final assessment entry when hasFinal is true', async () => {
    const { SimpleTopicList } = await import('@/app/student/lessons/SimpleTopicList');
    render(React.createElement(SimpleTopicList, {
      questData: QUEST_DATA,
      allModules: [{ id: 1, title: 'Python Dasar', topicCount: 4, enrollmentStatus: 'active' as const }],
      currentModuleId: 1, accessibleCount: 1,
    }));
    expect(screen.getAllByText('Ujian Akhir Modul').length).toBeGreaterThan(0);
  });

  it('renders progress percentage', async () => {
    const { SimpleTopicList } = await import('@/app/student/lessons/SimpleTopicList');
    render(React.createElement(SimpleTopicList, {
      questData: QUEST_DATA,
      allModules: [{ id: 1, title: 'Python Dasar', topicCount: 4, enrollmentStatus: 'active' as const }],
      currentModuleId: 1, accessibleCount: 1,
    }));
    expect(screen.getByText('25%')).toBeDefined();
  });
});
