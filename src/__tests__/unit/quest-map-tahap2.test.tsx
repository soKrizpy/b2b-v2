import { describe, it, expect } from 'vitest';
import { scoreToCertificateTier } from '@/features/curriculum/validation';
import { TIER_CONFIG } from '@/features/certificates/queries';

describe('Tahap 2: Quest Map & Certificate Tier Validation', () => {
  it('correctly maps final assessment scores to certificate tiers according to requirements', () => {
    // Requirements:
    // 86-100 = Excellent
    // >= 75 = Achievement
    // < 75 = Participant
    expect(scoreToCertificateTier(100)).toBe('excellent');
    expect(scoreToCertificateTier(86)).toBe('excellent');
    expect(scoreToCertificateTier(85)).toBe('achievement');
    expect(scoreToCertificateTier(84)).toBe('achievement');
    expect(scoreToCertificateTier(75)).toBe('achievement');
    expect(scoreToCertificateTier(74)).toBe('completion');
    expect(scoreToCertificateTier(50)).toBe('completion');
    expect(scoreToCertificateTier(0)).toBe('completion');
  });

  it('provides medal and label in TIER_CONFIG for all three tiers', () => {
    expect(TIER_CONFIG.excellent).toBeDefined();
    expect(TIER_CONFIG.excellent.label).toBe('Excellent');
    expect(TIER_CONFIG.excellent.medal).toBe('🏆');

    expect(TIER_CONFIG.achievement).toBeDefined();
    expect(TIER_CONFIG.achievement.label).toBe('Achievement');
    expect(TIER_CONFIG.achievement.medal).toBe('🥈');
    expect(TIER_CONFIG.achievement.scoreRange).toBe('75–85');

    expect(TIER_CONFIG.completion).toBeDefined();
    expect(TIER_CONFIG.completion.label).toBe('Participant');
    expect(TIER_CONFIG.completion.medal).toBe('🎖️');
    expect(TIER_CONFIG.completion.scoreRange).toBe('<75');
  });
});
