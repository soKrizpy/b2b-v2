export interface TeacherReportMeeting {
  module_id: number | null;
  session_number: number | null;
  has_joined: boolean;
  is_completed: boolean;
  progress_report: string | null;
}

/** A report unlocks only the attended, completed session for the matching module/topic position. */
export function isTeacherReportSubmittedForTopic(
  meeting: TeacherReportMeeting,
  moduleId: number,
  sessionNumber: number
): boolean {
  return meeting.module_id === moduleId
    && meeting.session_number === sessionNumber
    && meeting.has_joined
    && meeting.is_completed
    && Boolean(meeting.progress_report?.trim());
}
