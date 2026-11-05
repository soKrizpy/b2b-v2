// src/__tests__/challenge-reward-decoupling.test.ts
// Verifies that challenges/actions.ts no longer imports from the pet feature
// directly and that the neutral awardReward is used instead.

import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ACTIONS_PATH = path.resolve(
  __dirname,
  '..',
  'features',
  'challenges',
  'actions.ts'
);

describe('challenges → reward decoupling', () => {
  const source = fs.readFileSync(ACTIONS_PATH, 'utf-8');

  it('does not import from @/features/pet', () => {
    expect(source).not.toMatch(/@\/features\/pet/);
    expect(source).not.toMatch(/pet\/lib\/rewardActions/);
  });

  it('imports awardReward from the neutral @/lib/rewards module', () => {
    expect(source).toMatch(/import\s+\{[^}]*awardReward[^}]*\}\s+from\s+['"]@\/lib\/rewards['"]/);
  });

  it('does not reference the old awardRewardEvent function name', () => {
    expect(source).not.toMatch(/\bawardRewardEvent\b/);
  });

  it('calls awardReward with CHALLENGE_APPROVED at the review call sites', () => {
    // There should be calls to awardReward(studentId, 'CHALLENGE_APPROVED')
    const matches = source.match(/awardReward\([^,]+,\s*['"]CHALLENGE_APPROVED['"]\)/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(1);
  });
});
