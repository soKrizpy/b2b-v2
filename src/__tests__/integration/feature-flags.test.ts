// src/__tests__/integration/feature-flags.test.ts
// Integration: verifies the 3 remaining flags (billing, parentPortal, aiAssistant)
// and cross-cutting architecture constraints.

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { FEATURE_GROUP_KEYS, isFeatureEnabled, type FeatureGroup } from '@/lib/featureConfig';
import * as fs from 'fs';
import * as path from 'path';

const ENV_KEY: Record<FeatureGroup, string> = {
  billing:      'NEXT_PUBLIC_ENABLE_BILLING',
  parentPortal: 'NEXT_PUBLIC_ENABLE_PARENT_PORTAL',
  aiAssistant:  'NEXT_PUBLIC_ENABLE_AI',
};

const ORIGINAL: Record<string, string | undefined> = {};

beforeAll(() => {
  for (const key of Object.values(ENV_KEY)) ORIGINAL[key] = process.env[key];
});

afterAll(() => {
  for (const [key, value] of Object.entries(ORIGINAL)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function setAll(value: string | undefined) {
  for (const key of Object.values(ENV_KEY)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

// ── Scenario A: All flags on (default) ───────────────────────────────────────

describe('Scenario A — all flags on (default)', () => {
  afterEach(() => setAll(undefined));

  it('all 3 feature groups return true when no env vars set', () => {
    setAll(undefined);
    for (const group of FEATURE_GROUP_KEYS) {
      expect(isFeatureEnabled(group)).toBe(true);
    }
  });

  it('has exactly 3 feature groups: billing, parentPortal, aiAssistant', () => {
    expect(FEATURE_GROUP_KEYS).toHaveLength(3);
    expect(FEATURE_GROUP_KEYS).toContain('billing');
    expect(FEATURE_GROUP_KEYS).toContain('parentPortal');
    expect(FEATURE_GROUP_KEYS).toContain('aiAssistant');
  });
});

// ── Scenario B: billing off ───────────────────────────────────────────────────

describe('Scenario B — billing off', () => {
  afterEach(() => setAll(undefined));

  it('billing returns false, others return true', () => {
    process.env[ENV_KEY.billing] = 'false';
    expect(isFeatureEnabled('billing')).toBe(false);
    expect(isFeatureEnabled('parentPortal')).toBe(true);
    expect(isFeatureEnabled('aiAssistant')).toBe(true);
  });
});

// ── Scenario C: All flags off ─────────────────────────────────────────────────

describe('Scenario C — all flags off', () => {
  afterEach(() => setAll(undefined));

  it('all 3 features return false when set to "false"', () => {
    setAll('false');
    for (const group of FEATURE_GROUP_KEYS) {
      expect(isFeatureEnabled(group)).toBe(false);
    }
  });

  it('only "false" disables — "0" and "no" leave flags on', () => {
    process.env[ENV_KEY.billing]      = '0';
    process.env[ENV_KEY.parentPortal] = 'no';
    expect(isFeatureEnabled('billing')).toBe(true);
    expect(isFeatureEnabled('parentPortal')).toBe(true);
  });
});

// ── Cross-cutting: reward config ──────────────────────────────────────────────

describe('Cross-cutting — reward config integrity', () => {
  it('REWARDS config values are preserved', async () => {
    const { REWARDS } = await import('@/lib/rewards');
    expect(REWARDS.CHALLENGE_APPROVED).toEqual({ xp: 30, coins: 10 });
    expect(REWARDS.MODULE_COMPLETED).toEqual({ xp: 100, coins: 50 });
    expect(REWARDS.QUIZ_PERFECT).toEqual({ xp: 25, coins: 5 });
    expect(REWARDS.NODE_COMPLETED).toEqual({ xp: 10, coins: 2 });
  });

  it('levelCalc re-exports REWARDS for backward compat', async () => {
    const levelCalc = await import('@/features/pet/lib/levelCalc');
    expect(levelCalc.REWARDS).toBeDefined();
    expect(levelCalc.REWARDS.CHALLENGE_APPROVED).toEqual({ xp: 30, coins: 10 });
  });

  it('awardReward delegates to pet (gamification always on)', async () => {
    const { vi } = await import('vitest');
    vi.doMock('@/features/pet/lib/rewardActions', () => ({
      awardRewardEvent: vi.fn().mockResolvedValue({
        success: true, newXp: 130, newCoins: 40, message: '+30 XP',
      }),
    }));
    vi.resetModules();
    const { awardReward } = await import('@/lib/rewards');
    const result = await awardReward('student-1', 'CHALLENGE_APPROVED');
    expect(result.success).toBe(true);
    vi.doUnmock('@/features/pet/lib/rewardActions');
    vi.resetModules();
  });
});

// ── Cross-cutting: architecture constraints ───────────────────────────────────

describe('Cross-cutting — architecture constraints', () => {
  const challengesActionsSource = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'features', 'challenges', 'actions.ts'), 'utf-8'
  );
  const shellSource = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'components', 'DashboardAppShell.tsx'), 'utf-8'
  );
  const quizModalSource = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'features', 'quiz', 'components', 'QuizModal.tsx'), 'utf-8'
  );

  it('challenges/actions.ts does not import from @/features/pet', () => {
    expect(challengesActionsSource).not.toMatch(/@\/features\/pet/);
  });

  it('DashboardAppShell does not import from @/features/ai', () => {
    const topLevel = shellSource.split('\n').filter((l) => l.startsWith('import ')).join('\n');
    expect(topLevel).not.toMatch(/@\/features\/ai/);
  });

  it('QuizModal does not statically import @/features/ai', () => {
    const topLevel = quizModalSource.split('\n').filter((l) => l.startsWith('import ')).join('\n');
    expect(topLevel).not.toMatch(/@\/features\/ai/);
  });

  it('featureConfig has exactly 3 flags', () => {
    expect(FEATURE_GROUP_KEYS).toHaveLength(3);
  });

  it('gamification, certificates, announcements, questMap no longer exist as flag types', () => {
    // If these were still in FeatureGroup, TypeScript would have caught them at compile time.
    // At runtime, isFeatureEnabled should not accept them — but since TypeScript already
    // enforces this, we just verify the key count.
    expect(FEATURE_GROUP_KEYS).not.toContain('gamification');
    expect(FEATURE_GROUP_KEYS).not.toContain('certificates');
    expect(FEATURE_GROUP_KEYS).not.toContain('announcements');
    expect(FEATURE_GROUP_KEYS).not.toContain('questMap');
  });
});
