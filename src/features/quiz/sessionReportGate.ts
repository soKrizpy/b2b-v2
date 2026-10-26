export interface TeacherReportMeeting {
  topic_id: number | null;
  has_joined: boolean;
  is_completed: boolean;
  progress_report: string | null;
}

/** A report unlocks only the attended, completed meeting associated with this topic. */
export function isTeacherReportSubmittedForTopic(
  meeting: TeacherReportMeeting,
  topicId: number
): boolean {
  return topicId > 0
    && meeting.topic_id === topicId
    && meeting.has_joined
    && meeting.is_completed
    && Boolean(meeting.progress_report?.trim());
}
