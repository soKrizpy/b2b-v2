// src/features/dashboard/admin/metrics.ts
// Derives operational KPI metrics from already-fetched meeting data.
// Pure functions — no extra DB calls.

import { isLive, isToday, isUpcoming } from '@/lib/formatDate';
import type { MeetingWithStudents } from '@/features/sessions/queries';

export interface AdminMetrics {
  /** Meetings currently in progress right now. */
  liveNowCount: number;
  /** Meetings scheduled for today (any time). */
  todayTotalCount: number;
  /** Distinct students with at least one upcoming session. */
  activeStudentsCount: number;
  /** Upcoming meetings that have no valid link_url. */
  needsAttentionCount: number;
}

function hasValidLink(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return false;
  try { new URL(url); return true; } catch { return false; }
}

export function computeAdminMetrics(
  meetings: MeetingWithStudents[],
  now: Date = new Date()
): AdminMetrics {
  const liveNowCount = meetings.filter((m) => isLive(m.meeting_date, now)).length;

  const todayTotalCount = meetings.filter((m) => isToday(m.meeting_date, now)).length;

  // Active students = distinct student_ids across all upcoming sessions
  const upcomingStudentIds = new Set<string>();
  meetings
    .filter((m) => !m.is_completed && isUpcoming(m.meeting_date, now))
    .forEach((m) =>
      m.meeting_students.forEach((ms) => upcomingStudentIds.add(ms.student_id))
    );
  const activeStudentsCount = upcomingStudentIds.size;

  const needsAttentionCount = meetings.filter(
    (m) => !m.is_completed && isUpcoming(m.meeting_date, now) && !hasValidLink(m.link_url)
  ).length;

  return { liveNowCount, todayTotalCount, activeStudentsCount, needsAttentionCount };
}
