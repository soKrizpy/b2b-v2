/** Meeting assignment rows that can unlock their explicitly associated topic. */
export interface TopicMeetingSchedule {
  topic_id: number | null;
  session_number: number | null;
  meeting_date: string | null;
}

/** A topic unlocks once an assigned meeting associated with it starts. */
export function hasTopicMeetingStarted(
  meetings: readonly TopicMeetingSchedule[],
  topicId: number,
  now: Date = new Date(),
): boolean {
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs) || topicId <= 0) return false;

  const matching = meetings.filter((meeting) => meeting.topic_id === topicId);
  // Ambiguous topic mappings fail closed. Admins must resolve duplicate
  // schedules before either one can expose lesson content.
  if (
    matching.length !== 1
    || !Number.isInteger(matching[0].session_number)
    || matching[0].session_number! < 1
    || !matching[0].meeting_date
  ) return false;
  const meetingMs = Date.parse(matching[0].meeting_date);
  return Number.isFinite(meetingMs) && meetingMs <= nowMs;
}

/** Pick the nearest matching schedule for display on a locked map node. */
export function getTopicMeetingDate(
  meetings: readonly TopicMeetingSchedule[],
  topicId: number,
): string | null {
  const matching = meetings.filter((meeting) => meeting.topic_id === topicId);
  if (matching.length !== 1 || !Number.isInteger(matching[0].session_number) || matching[0].session_number! < 1) return null;
  const date = matching[0].meeting_date;
  return date && Number.isFinite(Date.parse(date)) ? date : null;
}

/** Keep the displayed session number stable when topics are reordered later. */
export function getTopicMeetingSessionNumber(
  meetings: readonly TopicMeetingSchedule[],
  topicId: number,
): number | null {
  const matching = meetings.filter((meeting) => meeting.topic_id === topicId);
  if (matching.length !== 1) return null;
  const sessionNumber = matching[0].session_number;
  return Number.isInteger(sessionNumber) && sessionNumber! > 0 ? sessionNumber : null;
}
