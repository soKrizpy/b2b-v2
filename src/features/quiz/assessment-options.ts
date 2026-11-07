/** Deterministic per-attempt option order; original option indices remain the scoring contract. */
export function createAssessmentOptionOrder(
  questionId: number,
  seed: string,
  optionCount = 4,
): number[] {
  const order = Array.from({ length: optionCount }, (_, index) => index);
  let hash = 2166136261;
  const input = `${seed}:${questionId}`;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  // Mulberry32 gives a reproducible pseudo-random stream for this attempt.
  let state = hash >>> 0;
  const random = () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  for (let index = order.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }
  return order;
}

export function isAssessmentChoiceCorrect(
  chosenOriginalIndex: number | undefined,
  correctOriginalIndex: number,
): boolean {
  return chosenOriginalIndex !== undefined
    && chosenOriginalIndex >= 0
    && chosenOriginalIndex === correctOriginalIndex;
}


export type PersistedAssessmentAnswer = 'A' | 'B' | 'C' | 'D' | null;

/** Store every official question, including unanswered items as null. */
export function buildPersistedAssessmentAnswers(
  questionIds: readonly number[],
  submittedAnswers: readonly { question_id: number; chosen_index: number }[],
): Record<string, PersistedAssessmentAnswer> {
  const answersByQuestion = new Map(
    submittedAnswers.map((answer) => [answer.question_id, answer.chosen_index]),
  );
  const optionKeys = ['A', 'B', 'C', 'D'] as const;

  return Object.fromEntries(
    questionIds.map((questionId) => {
      const chosenIndex = answersByQuestion.get(questionId);
      return [
        String(questionId),
        chosenIndex === undefined || chosenIndex === -1
          ? null
          : optionKeys[chosenIndex] ?? null,
      ];
    }),
  );
}

/** Calculate the next allowed attempt and the best score, or null after two attempts. */
export function getAssessmentAttemptSummary(
  existingAttempts: readonly { attempt_number: number; score: number }[],
  score: number,
): { attemptNumber: 1 | 2; bestScore: number } | null {
  const highestAttempt = existingAttempts.reduce(
    (highest, attempt) => Math.max(highest, attempt.attempt_number),
    0,
  );
  if (highestAttempt >= 2) return null;

  const bestPreviousScore = existingAttempts.reduce(
    (best, attempt) => Math.max(best, attempt.score),
    0,
  );

  return {
    attemptNumber: (highestAttempt + 1) as 1 | 2,
    bestScore: Math.max(bestPreviousScore, score),
  };
}
