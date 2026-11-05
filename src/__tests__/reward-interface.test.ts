// src/__tests__/reward-interface.test.ts
// Gamification is now always on — awardReward always delegates to pet.
// Tests verify REWARDS config values and unconditional delegation.

import { describe, expect, it, vi } from 'vitest';
import { REWARDS, type RewardEvent, type RewardResult } from '@/lib/rewards';

describe('reward config — values preserved after move', () => {
  it('has the same reward amounts as the original levelCalc definitions', () => {
    expect(REWARDS.CHALLENGE_APPROVED).toEqual({ xp: 30, coins: 10 });
    expect(REWARDS.NODE_COMPLETED).toEqual({ xp: 10, coins: 2 });
    expect(REWARDS.QUIZ_PERFECT).toEqual({ xp: 25, coins: 5 });
    expect(REWARDS.MODULE_COMPLETED).toEqual({ xp: 100, coins: 50 });
  });

  it('exposes all four reward event keys', () => {
    const keys = Object.keys(REWARDS) as RewardEvent[];
    expect(keys).toContain('CHALLENGE_APPROVED');
    expect(keys).toContain('NODE_COMPLETED');
    expect(keys).toContain('QUIZ_PERFECT');
    expect(keys).toContain('MODULE_COMPLETED');
    expect(keys).toHaveLength(4);
  });
});

describe('reward interface — awardReward always delegates to pet', () => {
  it('delegates to awardRewardEvent (gamification always on)', async () => {
    vi.doMock('@/features/pet/lib/rewardActions', () => ({
      awardRewardEvent: vi.fn().mockResolvedValue({
        success: true,
        newXp: 130,
        newCoins: 40,
        message: '+30 XP · +10 koin 🎉',
      } as RewardResult),
    }));
    vi.resetModules();
    const { awardReward } = await import('@/lib/rewards');
    const result = await awardReward('student-1', 'CHALLENGE_APPROVED');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.newXp).toBe(130);
      expect(result.newCoins).toBe(40);
    }

    vi.doUnmock('@/features/pet/lib/rewardActions');
    vi.resetModules();
  });

  it('awardReward.ts does not contain a gamification flag guard', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(
      path.resolve(__dirname, '..', 'lib', 'rewards', 'awardReward.ts'),
      'utf-8'
    );
    expect(src).not.toMatch(/isFeatureEnabled/);
    expect(src).not.toMatch(/gamification/);
  });
});
