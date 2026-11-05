import { describe, expect, it } from 'vitest';
import {
  getInstructionalSlides,
  isWithinSuggestedLessonSlideRange,
  MIN_LESSON_SLIDES,
} from '@/features/curriculum/lessonSlides';

function nodes(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    node_id: `lesson-${index + 1}`,
    type: 'lesson',
    title: `Materi ${index + 1}`,
    content: `Penjelasan ${index + 1}`,
  }));
}

describe('Quest Map lesson slide coverage', () => {
  it('excludes quiz and challenge nodes from lesson slides', () => {
    const slides = getInstructionalSlides([
      ...nodes(2),
      { type: 'quiz', title: 'Quiz' },
      { type: 'challenge', title: 'Challenge' },
    ]);

    expect(slides).toHaveLength(2);
    expect(slides.every((slide) => slide.type === 'lesson')).toBe(true);
  });

  it('requires at least 10 authored slides before the challenge is available', () => {
    expect(isWithinSuggestedLessonSlideRange(getInstructionalSlides(nodes(9)))).toBe(false);
    expect(isWithinSuggestedLessonSlideRange(getInstructionalSlides(nodes(10)))).toBe(true);
  });

  it('keeps lessons longer than the suggested range intact', () => {
    const slides = getInstructionalSlides(nodes(25));

    expect(slides).toHaveLength(25);
    expect(isWithinSuggestedLessonSlideRange(slides)).toBe(false);
    expect(MIN_LESSON_SLIDES).toBe(10);
  });

  it('handles missing or invalid learning paths without inventing slides', () => {
    expect(getInstructionalSlides(null)).toEqual([]);
    expect(getInstructionalSlides('not an array')).toEqual([]);
    expect(isWithinSuggestedLessonSlideRange([])).toBe(false);
  });
});
