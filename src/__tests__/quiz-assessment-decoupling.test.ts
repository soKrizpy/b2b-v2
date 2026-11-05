// src/__tests__/quiz-assessment-decoupling.test.ts
// Verifies quiz/actions.ts runs certificate award unconditionally (certificates always on)
// and quiz reward unconditionally (gamification always on).
// QuizModal: no static AI import, AI button gated behind FEATURE_FLAGS.aiAssistant.

import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ACTIONS_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', 'features', 'quiz', 'actions.ts'),
  'utf-8'
);

const QUIZ_MODAL_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', 'features', 'quiz', 'components', 'QuizModal.tsx'),
  'utf-8'
);

// ── actions.ts checks ─────────────────────────────────────────────────────────

describe('quiz/actions.ts — certificates always on', () => {
  it('does NOT gate certificate insert behind certificates flag', () => {
    expect(ACTIONS_SOURCE).not.toMatch(/isFeatureEnabled\('certificates'\)/);
  });

  it('always inserts a certificate_number on assessment completion', () => {
    expect(ACTIONS_SOURCE).toMatch(/certificate_number:/);
  });

  it('does NOT have a "Certificates disabled" fallback path', () => {
    expect(ACTIONS_SOURCE).not.toMatch(/Certificates disabled/);
  });
});

describe('quiz/actions.ts — gamification always on', () => {
  it('does NOT gate awardQuizReward behind gamification flag', () => {
    expect(ACTIONS_SOURCE).not.toMatch(/isFeatureEnabled\('gamification'\)/);
  });

  it('always calls the DB RPC for quiz reward', () => {
    expect(ACTIONS_SOURCE).toMatch(/claim_topic_quiz_reward/);
  });
});

// ── QuizModal.tsx checks ──────────────────────────────────────────────────────

describe('quiz/components/QuizModal.tsx — AI decoupling', () => {
  it('does not import explainQuizAnswer at module top level', () => {
    const topLevelImports = QUIZ_MODAL_SOURCE.split('\n')
      .filter((l) => l.startsWith('import '))
      .join('\n');
    expect(topLevelImports).not.toMatch(/@\/features\/ai/);
  });

  it('uses FEATURE_FLAGS from @/lib/featureConfig', () => {
    expect(QUIZ_MODAL_SOURCE).toMatch(/FEATURE_FLAGS/);
    expect(QUIZ_MODAL_SOURCE).toMatch(/@\/lib\/featureConfig/);
  });

  it('gates AI explain button behind FEATURE_FLAGS.aiAssistant', () => {
    expect(QUIZ_MODAL_SOURCE).toMatch(/FEATURE_FLAGS\.aiAssistant/);
    const flagIdx = QUIZ_MODAL_SOURCE.indexOf('FEATURE_FLAGS.aiAssistant');
    const buttonIdx = QUIZ_MODAL_SOURCE.indexOf('Jelaskan Lebih Dalam');
    expect(flagIdx).toBeGreaterThan(0);
    expect(buttonIdx).toBeGreaterThan(flagIdx);
  });

  it('uses dynamic import for AI explainer', () => {
    expect(QUIZ_MODAL_SOURCE).toMatch(/import\('@\/features\/ai\/actions'\)/);
    expect(QUIZ_MODAL_SOURCE).toMatch(/explainQuizAnswer/);
  });
});
