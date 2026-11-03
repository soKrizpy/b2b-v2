// src/lib/rewards/index.ts
// Neutral reward entry point.
//
// Config and types are re-exported from their own files (no 'use server' needed).
// awardReward is a separate 'use server' export in awardReward.ts.
// Import from '@/lib/rewards' to get all three.

export { REWARDS } from './config';
export type { RewardEvent } from './config';
export type { RewardResult } from './types';
export { awardReward } from './awardReward';
