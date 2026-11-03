'use server';
// src/lib/rewards/awardReward.ts
// Flag-gated reward action — only this file needs 'use server'.

import { isFeatureEnabled } from '@/lib/featureConfig';
import type { RewardEvent } from './config';
import type { RewardResult } from './types';

/**
 * Awards XP and coins for a named event.
 *
 * - Gamification ON: delegates to the pet reward implementation (atomic DB write).
 * - Gamification OFF: returns a no-op success with zero XP/coins.
 *
 * Errors from the pet implementation are returned (not thrown) so callers
 * can decide whether to treat reward failure as fatal.
 */
export async function awardReward(
  studentId: string,
  event: RewardEvent
): Promise<RewardResult> {
  if (!isFeatureEnabled('gamification')) {
    // Gamification disabled — skip reward silently.
    return {
      success: true,
      newXp: 0,
      newCoins: 0,
      message: '',
    };
  }

  // Delegate to the pet/gamification reward implementation.
  const { awardRewardEvent } = await import('@/features/pet/lib/rewardActions');
  return awardRewardEvent(studentId, event);
}
