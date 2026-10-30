// src/features/dashboard/admin/metrics.ts
// Derives operational KPI metrics from already-fetched database records.
// Pure functions — no extra DB calls.

import { isLive, isToday, isUpcoming } from '@/lib/formatDate';
import type { MeetingWithStudents } from '@/features/sessions/queries';

export interface AdminMetrics {
  liveNowCount: number;
  todayTotalCount: number;
  totalStudentsCount: number;
  totalTeachersCount: number;
  upcomingSessionsCount: number;
  needsAttentionCount: number;
}

export interface AdminRosterCounts {
  studentsCount: number;
  teachersCount: number;
}

function hasValidLink(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function computeAdminMetrics(
  meetings: MeetingWithStudents[],
  now: Date = new Date(),
  roster: AdminRosterCounts = { studentsCount: 0, teachersCount: 0 }
): AdminMetrics {
  const liveNowCount = meetings.filter((meeting) =>
    !meeting.is_completed && isLive(meeting.meeting_date, now)
  ).length;

  const todayTotalCount = meetings.filter((meeting) =>
    isToday(meeting.meeting_date, now)
  ).length;

  const upcomingMeetings = meetings.filter((meeting) =>
    !meeting.is_completed && isUpcoming(meeting.meeting_date, now)
  );

  const needsAttentionCount = upcomingMeetings.filter((meeting) =>
    !hasValidLink(meeting.link_url)
  ).length;

  return {
    liveNowCount,
    todayTotalCount,
    totalStudentsCount: roster.studentsCount,
    totalTeachersCount: roster.teachersCount,
    upcomingSessionsCount: upcomingMeetings.length,
    needsAttentionCount,
  };
}
