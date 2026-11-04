// src/features/pet/lib/levelCalc.ts
// XP level calculation — mirrors the existing production LMS curve
// (xpCalculator.ts in bits2bytes-lms) for backward compatibility.
// +30% progressive growth: L1 = 100 XP, L2 = 130, L3 = 169, …

// ── Core curve ────────────────────────────────────────────────────────────────

/** XP required to advance FROM `level` TO `level + 1`. */
export function xpNeededForLevel(level: number): number {
  if (level <= 1) return 100;
  return Math.round(100 * Math.pow(1.3, level - 1));
}

/** Cumulative XP required to *reach* `targetLevel` (i.e. minimum XP for that level). */
export function minXpForLevel(targetLevel: number): number {
  if (targetLevel <= 1) return 0;
  let total = 0;
  for (let l = 1; l < targetLevel; l++) total += xpNeededForLevel(l);
  return total;
}

// ── Derived helpers ───────────────────────────────────────────────────────────

export interface LevelProgress {
  /** Current level (1-based). */
  currentLevel: number;
  /** XP earned within the current level. */
  xpInCurrentLevel: number;
  /** XP needed to complete the current level and advance. */
  xpNeededThisLevel: number;
  /** 0–100 integer percentage to fill the progress bar. */
  progressPercent: number;
  /** Total XP accumulated. */
  totalXp: number;
}

/**
 * Derives full level-progress metrics from a raw XP total.
 * Safe for any non-negative integer.
 */
export function calculateLevel(totalXp: number): LevelProgress {
  const safeXp = Math.max(0, Math.floor(totalXp));

  let level = 1;
  let accumulated = 0;

  while (true) {
    const needed = xpNeededForLevel(level);
    if (safeXp < accumulated + needed) break;
    accumulated += needed;
    level++;
  }

  const xpNeededThisLevel  = xpNeededForLevel(level);
  const xpInCurrentLevel   = safeXp - accumulated;
  const progressPercent    = Math.min(100, Math.floor((xpInCurrentLevel / xpNeededThisLevel) * 100));

  return { currentLevel: level, xpInCurrentLevel, xpNeededThisLevel, progressPercent, totalXp: safeXp };
}

// ── Reward configuration ──────────────────────────────────────────────────────
// REWARDS and RewardEvent now live in the neutral @/lib/rewards module so
// core features can reference reward events without importing the pet feature.
// Re-exported here for backward compatibility with existing pet-internal imports.

export { REWARDS } from '@/lib/rewards/config';
export type { RewardEvent } from '@/lib/rewards/config';

// ── Status messages ───────────────────────────────────────────────────────────

/** Returns a mood string for the pet widget based on recent XP. */
export function getPetStatus(progressPercent: number, justLevelledUp: boolean): string {
  if (justLevelledUp) return "Level Up! 🎉";
  if (progressPercent >= 80) return "Hampir naik level! 🔥";
  if (progressPercent >= 50) return "Semangat belajar! ⚡";
  if (progressPercent >= 20) return "Terus berlatih! 💪";
  return "Mulai petualangan! 🚀";
}
