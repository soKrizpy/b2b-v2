import { describe, expect, it } from 'vitest';
import {
  buildPersistedAssessmentAnswers,
  createAssessmentOptionOrder,
  getAssessmentAttemptSummary,
  isAssessmentChoiceCorrect,
} from './assessment-options';

describe('final assessment answer persistence', () => {
  it('preserves original option letters and stores unanswered questions as null', () => {
    expect(buildPersistedAssessmentAnswers(
      [11, 12, 13, 14],
      [
        { question_id: 11, chosen_index: 0 },
        { question_id: 12, chosen_index: 3 },
        { question_id: 13, chosen_index: -1 },
      ],
    )).toEqual({
      '11': 'A',
      '12': 'D',
      '13': null,
      '14': null,
    });
  });

  it('keeps option order deterministic for the same attempt seed', () => {
    expect(createAssessmentOptionOrder(7, 'attempt-1'))
      .toEqual(createAssessmentOptionOrder(7, 'attempt-1'));
  });

  it('scores unanswered choices as incorrect', () => {
    expect(isAssessmentChoiceCorrect(-1, 0)).toBe(false);
    expect(isAssessmentChoiceCorrect(0, 0)).toBe(true);
    expect(isAssessmentChoiceCorrect(1, 0)).toBe(false);
  });
});

describe('final assessment attempt history', () => {
  it('creates the first attempt and records its score as best', () => {
    expect(getAssessmentAttemptSummary([], 65)).toEqual({
      attemptNumber: 1,
      bestScore: 65,
    });
  });

  it('increments attempt number and preserves the highest score', () => {
    expect(getAssessmentAttemptSummary([
      { attempt_number: 1, score: 80 },
    ], 65)).toEqual({
      attemptNumber: 2,
      bestScore: 80,
    });
  });

  it('does not allow a third attempt', () => {
    expect(getAssessmentAttemptSummary([
      { attempt_number: 1, score: 80 },
      { attempt_number: 2, score: 90 },
    ], 95)).toBeNull();
  });
});
