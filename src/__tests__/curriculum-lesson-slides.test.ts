import { describe, expect, it } from 'vitest';
import {
  getInstructionalSlides,
  hasAuthoredLessonContent,
  hasRenderableCurriculumContent,
  isWithinSuggestedLessonSlideRange,
  MAX_LESSON_SLIDES,
  MIN_LESSON_SLIDES,
} from '@/features/curriculum/lessonSlides';

function nodes(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `lesson-${index + 1}`,
    type: 'lesson',
    title: `Materi ${index + 1}`,
    content: `Penjelasan ${index + 1}`,
  }));
}

describe('JSON curriculum lesson readiness', () => {
  it('excludes quiz and challenge nodes from instructional slides', () => {
    const slides = getInstructionalSlides([
      ...nodes(2),
      { type: 'quiz', title: 'Quiz' },
      { type: 'challenge', title: 'Challenge' },
    ]);

    expect(slides).toHaveLength(2);
    expect(slides.every((slide) => slide.type === 'lesson')).toBe(true);
  });

  it('treats 10–20 slides as an authoring recommendation, not a publish requirement', () => {
    expect(isWithinSuggestedLessonSlideRange(getInstructionalSlides(nodes(9)))).toBe(false);
    expect(isWithinSuggestedLessonSlideRange(getInstructionalSlides(nodes(10)))).toBe(true);
    expect(hasAuthoredLessonContent(getInstructionalSlides(nodes(1)))).toBe(true);
    expect(MIN_LESSON_SLIDES).toBe(10);
    expect(MAX_LESSON_SLIDES).toBe(20);
  });

  it('does not silently truncate authored JSON content above the suggested range', () => {
    const slides = getInstructionalSlides(nodes(25));

    expect(slides).toHaveLength(25);
    expect(isWithinSuggestedLessonSlideRange(slides)).toBe(false);
  });

  it('handles missing or malformed JSON without inventing lesson slides', () => {
    expect(getInstructionalSlides(null)).toEqual([]);
    expect(getInstructionalSlides('not an array')).toEqual([]);
    expect(hasRenderableCurriculumContent(null)).toBe(false);
    expect(hasRenderableCurriculumContent({ learningPath: [] })).toBe(false);
    expect(hasRenderableCurriculumContent({ learningPath: nodes(1) })).toBe(true);
  });

  it('rejects malformed quiz or challenge payloads instead of treating them as absent', () => {
    expect(hasRenderableCurriculumContent({
      learningPath: nodes(1),
      quiz: [{ question: 'Quiz tanpa pilihan' }],
    })).toBe(false);
    expect(hasRenderableCurriculumContent({
      learningPath: nodes(1),
      challenge: { title: 'Challenge tanpa instruksi' },
    })).toBe(false);
  });
});
