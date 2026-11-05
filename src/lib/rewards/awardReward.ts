'use server';
// src/lib/rewards/awardReward.ts
// Gamification is always on — delegates unconditionally to the pet reward system.

import type { RewardEvent } from './config';
import type { RewardResult } from './types';

export async function awardReward(
  studentId: string,
  event: RewardEvent
): Promise<RewardResult> {
  const { awardRewardEvent } = await import('@/features/pet/lib/rewardActions');
  return awardRewardEvent(studentId, event);
}
