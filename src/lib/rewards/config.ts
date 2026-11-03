// src/lib/rewards/config.ts
// Reward event definitions — the canonical source of truth for XP/coin payouts.
// Moved from src/features/pet/lib/levelCalc.ts so core features can reference
// reward events without importing the gamification feature.

/** Configurable reward amounts by event type. Extend as needed. */
export const REWARDS = {
  /** A teacher approves a student's challenge submission. */
  CHALLENGE_APPROVED: { xp: 30, coins: 10 },
  /** A student completes a theory/code node (future: progress tracking). */
  NODE_COMPLETED: { xp: 10, coins: 2 },
  /** A student completes a quiz node with 100% correct answers. */
  QUIZ_PERFECT: { xp: 25, coins: 5 },
  /** A student completes all topics in a module. */
  MODULE_COMPLETED: { xp: 100, coins: 50 },
} as const;

export type RewardEvent = keyof typeof REWARDS;
