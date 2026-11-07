import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createAssessmentOptionOrder, isAssessmentChoiceCorrect } from '@/features/quiz/assessment-options';

describe('final assessment option order', () => {
  it('returns a stable permutation for the same attempt and question', () => {
    const first = createAssessmentOptionOrder(27, 'attempt-seed');
    const second = createAssessmentOptionOrder(27, 'attempt-seed');

    expect(first).toEqual(second);
    expect([...first].sort()).toEqual([0, 1, 2, 3]);
  });

  it('varies option order across question identities and attempt seeds', () => {
    const orders = [
      createAssessmentOptionOrder(1, 'attempt-a'),
      createAssessmentOptionOrder(2, 'attempt-a'),
      createAssessmentOptionOrder(1, 'attempt-b'),
    ];

    expect(new Set(orders.map((order) => order.join(','))).size).toBeGreaterThan(1);
    for (const order of orders) {
      expect([...order].sort()).toEqual([0, 1, 2, 3]);
    }
  });

  it('never treats an unanswered question as a correct answer', () => {
    expect(isAssessmentChoiceCorrect(-1, 0)).toBe(false);
    expect(isAssessmentChoiceCorrect(undefined, 0)).toBe(false);
    expect(isAssessmentChoiceCorrect(0, 0)).toBe(true);
    expect(isAssessmentChoiceCorrect(1, 0)).toBe(false);
  });

  it('keeps the Tinkercad answer key balanced and the revised prompts explicit', () => {
    const payload = JSON.parse(
      readFileSync('public/curriculum/tinkercad-3d-design.json', 'utf8').replace(/^\uFEFF/, ''),
    );
    const modulePayload = Array.isArray(payload) ? payload[0] : payload;
    const questions = modulePayload.final_assessment.questions;
    const distribution = [0, 0, 0, 0];

    for (const question of questions) distribution[question.answer_index]++;

    expect(questions).toHaveLength(20);
    expect(distribution).toEqual([5, 5, 5, 5]);
    expect(questions.find((question: { id: number }) => question.id === 11).question).toContain('FDM');
    expect(questions.find((question: { id: number }) => question.id === 15).question).toContain('paling umum didukung');
    expect(questions.find((question: { id: number }) => question.id === 18).question).toContain('clearance');
    expect(questions.find((question: { id: number }) => question.id === 19).question).toContain('Ruler');
    expect(questions.find((question: { id: number }) => question.id === 20).question).toContain('Setelah mengekspor');
  });
});
