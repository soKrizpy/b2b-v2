/** Minimum and maximum authored instructional slides shown before a topic challenge. */
export const MIN_LESSON_SLIDES = 10;
export const MAX_LESSON_SLIDES = 20;

export type LessonSlide = Record<string, unknown>;

const INSTRUCTIONAL_TYPES = new Set(['lesson', 'theory', 'code', 'practice']);

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasCodeContent(item: LessonSlide): boolean {
  if (nonEmptyString(item.code_content)) return true;
  const code = item.code;
  return Boolean(
    code &&
    typeof code === 'object' &&
    !Array.isArray(code) &&
    nonEmptyString((code as Record<string, unknown>).content)
  );
}

function hasPracticeContent(item: LessonSlide): boolean {
  const options = item.options;
  if (!Array.isArray(options) || options.length < 2 || !options.every(nonEmptyString)) {
    return false;
  }

  const correct = nonEmptyString(item.correctOption)
    ? item.correctOption
    : item.correct_option;
  return nonEmptyString(correct) && options.includes(correct);
}

function isAuthoredInstructionalSlide(item: unknown): item is LessonSlide {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;

  const slide = item as LessonSlide;
  if (!INSTRUCTIONAL_TYPES.has(String(slide.type)) || !nonEmptyString(slide.title)) {
    return false;
  }

  const hasText = [slide.explanation, slide.content, slide.instructions].some(nonEmptyString);
  if (slide.type === 'practice') {
    return hasText && hasPracticeContent(slide);
  }
  if (slide.type === 'code') {
    return hasText || hasCodeContent(slide);
  }
  return hasText || hasCodeContent(slide);
}

/**
 * Normalize the authored learningPath for the Quest Map lesson modal.
 * Only supported instructional nodes with a title and substantive content count
 * as slides. Quiz/challenge markers, unknown types, and malformed/empty nodes do
 * not count toward the minimum. Valid authored slides are capped at 20.
 */
export function getInstructionalSlides(learningPath: unknown): LessonSlide[] {
  if (!Array.isArray(learningPath)) return [];

  return learningPath
    .filter(isAuthoredInstructionalSlide)
    .slice(0, MAX_LESSON_SLIDES);
}

/** A topic lesson is ready to advance only when 10–20 valid slides are shown. */
export function hasRequiredLessonSlideCount(slides: readonly unknown[]): boolean {
  return slides.length >= MIN_LESSON_SLIDES && slides.length <= MAX_LESSON_SLIDES;
}
