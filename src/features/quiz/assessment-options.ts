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
    return ((value ^ (value >>> 14) >>> 0) / 4294967296);
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
