/** One guided series must cover every published topic exactly once in 1-based order. */
export function isCompleteModuleSchedule(
  sessionCount: number,
  publishedTopicCount: number | null | undefined
): boolean {
  return typeof publishedTopicCount === 'number'
    && publishedTopicCount > 0
    && sessionCount === publishedTopicCount;
}

export interface TopicSessionAssignment {
  topic_id: number;
  session_number: number;
}

/** Preserve the database's pre-sorted published-topic order in explicit assignments. */
export function assignTopicsToSessions(topicIds: readonly number[]): TopicSessionAssignment[] {
  return topicIds.map((topicId, index) => ({
    topic_id: topicId,
    session_number: index + 1,
  }));
}
