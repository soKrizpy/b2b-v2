// src/__tests__/quest-map-fallback.test.tsx
// Tests for the Quest Map presentation decoupling.
// SimpleTopicList renders correctly with different node statuses.
// The lessons page gates QuestMapClient behind the questMap flag.

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.PropsWithChildren<{ href: string }>) =>
    React.createElement('a', { href, ...props }, children),
}));

// ── Source-level checks ───────────────────────────────────────────────────────

const PAGE_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', 'app', 'student', 'lessons', 'page.tsx'),
  'utf-8'
);

describe('lessons page — quest map gating', () => {
  it('imports isFeatureEnabled from @/lib/featureConfig', () => {
    expect(PAGE_SOURCE).toMatch(/isFeatureEnabled/);
    expect(PAGE_SOURCE).toMatch(/@\/lib\/featureConfig/);
  });

  it('gates QuestMapClient behind questMap flag', () => {
    expect(PAGE_SOURCE).toMatch(/isFeatureEnabled\('questMap'\)/);
    expect(PAGE_SOURCE).toMatch(/QuestMapClient/);
    // The last reference to QuestMapClient (in the rendering code) must be
    // after the questMap flag check — use lastIndexOf to skip the dynamic import string.
    const flagIdx = PAGE_SOURCE.indexOf("isFeatureEnabled('questMap')");
    const clientIdx = PAGE_SOURCE.lastIndexOf('QuestMapClient');
    expect(flagIdx).toBeGreaterThan(0);
    expect(clientIdx).toBeGreaterThan(flagIdx);
  });

  it('imports QuestMapClient dynamically (not at module top level)', () => {
    // Dynamic import
    expect(PAGE_SOURCE).toMatch(/import\('@\/app\/student\/lessons\/QuestMapClient'\)/);
    // No static import of QuestMapClient at the top
    const topLevelImports = PAGE_SOURCE
      .split('\n')
      .filter((l) => l.startsWith('import '))
      .join('\n');
    expect(topLevelImports).not.toMatch(/QuestMapClient/);
  });

  it('always renders SimpleTopicList when questMap is off', () => {
    expect(PAGE_SOURCE).toMatch(/SimpleTopicList/);
    // SimpleTopicList is the fallback (no flag guard around it)
    expect(PAGE_SOURCE).toMatch(/return[\s\S]*?SimpleTopicList/m);
  });

  it('always fetches questMapData (core progression logic)', () => {
    expect(PAGE_SOURCE).toMatch(/getQuestMapData/);
    // Not inside a feature flag block — it's called unconditionally
    const flagIdx = PAGE_SOURCE.indexOf("isFeatureEnabled('questMap')");
    const questDataIdx = PAGE_SOURCE.indexOf('getQuestMapData');
    // questMapData fetch appears BEFORE the questMap flag check
    expect(questDataIdx).toBeGreaterThan(0);
    expect(questDataIdx).toBeLessThan(flagIdx);
  });
});

// ── SimpleTopicList component tests ──────────────────────────────────────────

// Minimal QuestMapData fixture
const makeNode = (
  id: number,
  title: string,
  status: 'COMPLETED' | 'NEEDS_QUIZ' | 'ACTIVE_NEXT' | 'LOCKED'
) => ({
  topic: {
    id,
    module_id: 1,
    title,
    order_index: id,
    description: null,
    project_link: null,
    topic_link: null,
    engine_topic_id: null,
    lesson_content: null,
    status: 'published' as const,
    published_at: null,
    created_at: null,
    challenge_count: 0,
  },
  status,
  hasQuiz: false,
  attemptsUsed: 0,
  bestScore: 0,
  stars: 0 as const,
  sessionNumber: id,
  isSessionReportSubmitted: false,
  quizUnlocked: false,
  isUnlocked: status !== 'LOCKED',
  meetingDate: null,
});

const QUEST_DATA = {
  mod: {
    id: 1,
    title: 'Python Dasar',
    description: null,
    level: 'Beginner',
    gamification_type: 'quest',
    is_active: true,
    created_at: null,
    topics: [],
  },
  nodes: [
    makeNode(1, 'Variabel & Tipe Data', 'COMPLETED'),
    makeNode(2, 'Kondisi If/Else', 'NEEDS_QUIZ'),
    makeNode(3, 'Looping', 'ACTIVE_NEXT'),
    makeNode(4, 'Fungsi', 'LOCKED'),
  ],
  moduleComplete: false,
  hasFinal: true,
  needsQuizTopics: [],
};

describe('SimpleTopicList — rendering', () => {
  it('renders all topic titles', async () => {
    const { SimpleTopicList } = await import(
      '@/app/student/lessons/SimpleTopicList'
    );
    render(
      React.createElement(SimpleTopicList, {
        questData: QUEST_DATA,
        allModules: [{ id: 1, title: 'Python Dasar', topicCount: 4, enrollmentStatus: 'active' as const }],
        currentModuleId: 1,
        accessibleCount: 1,
      })
    );
    expect(screen.getByText('Variabel & Tipe Data')).toBeDefined();
    expect(screen.getByText('Kondisi If/Else')).toBeDefined();
    expect(screen.getByText('Looping')).toBeDefined();
    expect(screen.getByText('Fungsi')).toBeDefined();
  });

  it('renders status labels correctly', async () => {
    const { SimpleTopicList } = await import(
      '@/app/student/lessons/SimpleTopicList'
    );
    render(
      React.createElement(SimpleTopicList, {
        questData: QUEST_DATA,
        allModules: [{ id: 1, title: 'Python Dasar', topicCount: 4, enrollmentStatus: 'active' as const }],
        currentModuleId: 1,
        accessibleCount: 1,
      })
    );
    // Labels are rendered alongside emoji inside a span — use regex matcher
    expect(screen.getAllByText(/Selesai/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Kuis Siap/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Aktif/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Terkunci/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders final assessment entry when hasFinal is true', async () => {
    const { SimpleTopicList } = await import(
      '@/app/student/lessons/SimpleTopicList'
    );
    render(
      React.createElement(SimpleTopicList, {
        questData: QUEST_DATA,
        allModules: [{ id: 1, title: 'Python Dasar', topicCount: 4, enrollmentStatus: 'active' as const }],
        currentModuleId: 1,
        accessibleCount: 1,
      })
    );
    expect(screen.getAllByText('Ujian Akhir Modul').length).toBeGreaterThan(0);
  });

  it('renders progress percentage', async () => {
    const { SimpleTopicList } = await import(
      '@/app/student/lessons/SimpleTopicList'
    );
    render(
      React.createElement(SimpleTopicList, {
        questData: QUEST_DATA,
        allModules: [{ id: 1, title: 'Python Dasar', topicCount: 4, enrollmentStatus: 'active' as const }],
        currentModuleId: 1,
        accessibleCount: 1,
      })
    );
    // 1 completed out of 4 = 25%
    expect(screen.getByText('25%')).toBeDefined();
  });
});
