import { describe, expect, it } from 'vitest';
import { getActiveChallengeIds, isValidActiveChallengeIds } from '@/features/challenges/activeChallengeIds';

describe('getActiveChallengeIds', () => {
  it('keeps legacy compatibility only when the property is absent', () => {
    expect(getActiveChallengeIds({ learningPath: [] })).toBeUndefined();
    expect(isValidActiveChallengeIds({ learningPath: [] })).toBe(true);
  });

  it.each([
    ['mixed values', [501, '502']],
    ['duplicate IDs', [501, 501]],
    ['non-array metadata', '501'],
  ])('fails closed for %s', (_label, value) => {
    expect(getActiveChallengeIds({ activeChallengeIds: value })).toEqual([]);
    expect(isValidActiveChallengeIds({ activeChallengeIds: value })).toBe(false);
  });

  it('preserves an explicit empty list', () => {
    expect(getActiveChallengeIds({ activeChallengeIds: [] })).toEqual([]);
    expect(isValidActiveChallengeIds({ activeChallengeIds: [] })).toBe(true);
  });
});
