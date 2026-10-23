/** One guided series must cover every published topic exactly once in 1-based order. */
export function isCompleteModuleSchedule(
  sessionCount: number,
  publishedTopicCount: number | null | undefined
): boolean {
  return typeof publishedTopicCount === 'number'
    && publishedTopicCount > 0
    && sessionCount === publishedTopicCount;
}
