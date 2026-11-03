// src/lib/rewards/types.ts
// Neutral reward types shared across core and gamification features.
// Moved from src/features/pet/lib/levelCalc.ts and rewardActions.ts so that
// core features (challenges, quiz) can depend on a reward contract without
// importing the pet/gamification feature directly.

/**
 * Result of a reward award operation.
 * When gamification is disabled, `awardReward` returns a no-op success
 * with zero XP/coins so callers can treat it uniformly.
 */
export type RewardResult =
  | { success: true; newXp: number; newCoins: number; message: string }
  | { success: false; error: string };
