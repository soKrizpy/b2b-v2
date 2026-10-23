import { describe, expect, it } from 'vitest';
import {
  getInstructionalSlides,
  hasRequiredLessonSlideCount,
  MAX_LESSON_SLIDES,
  MIN_LESSON_SLIDES,
} from '@/features/curriculum/lessonSlides';

function slide(index: number) {
  return {
    id: `slide-${index}`,
    type: 'theory',
    title: `Materi ${index}`,
    content: `Penjelasan materi ${index} dengan isi yang ditulis.`,
  };
}

describe('instructional lesson slides', () => {
  it('returns no slides for missing or non-array learningPath data', () => {
    expect(getInstructionalSlides(null)).toEqual([]);
    expect(getInstructionalSlides({ learningPath: [] })).toEqual([]);
    expect(hasRequiredLessonSlideCount(getInstructionalSlides(undefined))).toBe(false);
  });

  it('does not count fewer than 10 authored instructional slides', () => {
    const slides = getInstructionalSlides(Array.from({ length: 9 }, (_, i) => slide(i)));
    expect(slides).toHaveLength(MIN_LESSON_SLIDES - 1);
    expect(hasRequiredLessonSlideCount(slides)).toBe(false);
  });

  it('accepts exactly 10 valid authored instructional slides', () => {
    const slides = getInstructionalSlides(Array.from({ length: 10 }, (_, i) => slide(i)));
    expect(slides).toHaveLength(MIN_LESSON_SLIDES);
    expect(hasRequiredLessonSlideCount(slides)).toBe(true);
  });

  it('accepts exactly 20 valid authored instructional slides', () => {
    const slides = getInstructionalSlides(Array.from({ length: 20 }, (_, i) => slide(i)));
    expect(slides).toHaveLength(MAX_LESSON_SLIDES);
    expect(hasRequiredLessonSlideCount(slides)).toBe(true);
  });

  it('caps more than 20 valid authored instructional slides at 20', () => {
    const slides = getInstructionalSlides(Array.from({ length: 25 }, (_, i) => slide(i)));
    expect(slides).toHaveLength(MAX_LESSON_SLIDES);
    expect(slides[0].id).toBe('slide-0');
    expect(slides[slides.length - 1]?.id).toBe('slide-19');
    expect(hasRequiredLessonSlideCount(slides)).toBe(true);
  });

  it('ignores quiz, challenge, unknown, malformed, and empty-content entries', () => {
    const learningPath = [
      ...Array.from({ length: 9 }, (_, i) => slide(i)),
      { type: 'quiz', title: 'Quiz', content: 'Not a lesson slide' },
      { type: 'challenge', title: 'Challenge', content: 'Not a lesson slide' },
      { type: 'surprise', title: 'Unknown', content: 'Unsupported type' },
      { type: 'theory', title: 'Title only', content: '   ' },
      { type: 'theory', title: '   ', content: 'Has body but blank title' },
      null,
      [],
    ];
    const slides = getInstructionalSlides(learningPath);
    expect(slides).toHaveLength(9);
    expect(hasRequiredLessonSlideCount(slides)).toBe(false);
  });

  it('requires practice nodes to have instructions, options, and a matching correct answer', () => {
    const validPractice = {
      type: 'practice',
      title: 'Latihan',
      instructions: 'Pilih jawaban yang benar.',
      options: ['A', 'B', 'C', 'D'],
      correctOption: 'B',
    };
    const invalidPractice = {
      ...validPractice,
      title: 'Latihan tidak lengkap',
      correctOption: 'E',
    };

    expect(getInstructionalSlides([validPractice])).toHaveLength(1);
    expect(getInstructionalSlides([invalidPractice])).toHaveLength(0);
  });

  it('accepts code slides with non-empty authored code even without prose', () => {
    expect(getInstructionalSlides([{
      type: 'code',
      title: 'Contoh kode',
      code: { language: 'html', content: '<h1>Halo</h1>' },
    }])).toHaveLength(1);
  });
});
