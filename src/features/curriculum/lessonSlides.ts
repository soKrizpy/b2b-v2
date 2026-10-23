/** Minimum and maximum authored instructional slides shown before a topic challenge. */
export const MIN_LESSON_SLIDES = 10;
export const MAX_LESSON_SLIDES = 20;

export type LessonSlide = Record<string, unknown>;

/**
 * Normalize a topic's authored learningPath for the Quest Map lesson modal.
 * Quiz and challenge nodes belong to later stages of the flow, not lesson slides.
 */
export function getInstructionalSlides(learningPath: unknown): LessonSlide[] {
  if (!Array.isArray(learningPath)) return [];

  return learningPath
    .filter((item): item is LessonSlide =>
      Boolean(item) && typeof item === 'object' && !Array.isArray(item)
    )
    .filter((item) => item.type !== 'quiz' && item.type !== 'challenge')
    .slice(0, MAX_LESSON_SLIDES);
}

/** A topic lesson is ready to advance only when it has 10–20 authored slides. */
export function hasRequiredLessonSlideCount(slides: readonly unknown[]): boolean {
  return slides.length >= MIN_LESSON_SLIDES && slides.length <= MAX_LESSON_SLIDES;
}
