/**
 * Active challenge IDs are stored in topics.lesson_content so old challenge
 * rows and their submissions can be retained without a schema migration.
 * Missing metadata means a legacy topic where every challenge row is active.
 */
export function getActiveChallengeIds(lessonContent: unknown): number[] | undefined {
  if (!lessonContent || typeof lessonContent !== 'object' || Array.isArray(lessonContent)) return undefined;
  const content = lessonContent as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(content, 'activeChallengeIds')) return undefined;
  if (!Array.isArray(content.activeChallengeIds)) return [];
  const ids = content.activeChallengeIds;
  if (!isValidActiveChallengeIds(lessonContent)) return [];
  return ids as number[];
}

/** True for legacy content without metadata, or for a fully valid metadata array. */
export function isValidActiveChallengeIds(lessonContent: unknown): boolean {
  if (!lessonContent || typeof lessonContent !== 'object' || Array.isArray(lessonContent)) return true;
  const content = lessonContent as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(content, 'activeChallengeIds')) return true;
  const ids = content.activeChallengeIds;
  return Array.isArray(ids)
    && ids.every((id) => typeof id === 'number' && Number.isSafeInteger(id) && id > 0)
    && new Set(ids).size === ids.length;
}
