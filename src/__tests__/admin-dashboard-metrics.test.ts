import { describe, expect, it } from 'vitest';
import { computeAdminMetrics } from '@/features/dashboard/admin/metrics';
import type { MeetingWithStudents } from '@/features/sessions/queries';

function meeting(
  id: number,
  meetingDate: string,
  options: Partial<MeetingWithStudents> = {}
): MeetingWithStudents {
  return {
    id,
    title: 'Kelas uji',
    meeting_date: meetingDate,
    link_url: null,
    notes: null,
    teacher_id: null,
    session_count: 1,
    session_number: 1,
    series_id: null,
    module_id: null,
    topic_id: null,
    is_completed: false,
    completion_status: null,
    progress_report: null,
    created_at: null,
    meeting_students: [],
    ...options,
  } as MeetingWithStudents;
}

describe('computeAdminMetrics', () => {
  const now = new Date('2026-10-30T03:00:00.000Z');

  it('uses roster totals for registered students and teachers', () => {
    const result = computeAdminMetrics([], now, {
      studentsCount: 12,
      teachersCount: 4,
    });

    expect(result.totalStudentsCount).toBe(12);
    expect(result.totalTeachersCount).toBe(4);
  });

  it('counts live, today, upcoming, and missing-link meetings from stored schedule rows', () => {
    const rows = [
      meeting(1, '2026-10-30T02:45:00.000Z'),
      meeting(2, '2026-10-30T04:00:00.000Z'),
      meeting(3, '2026-10-30T01:00:00.000Z', { is_completed: true }),
      meeting(4, '2026-10-31T04:00:00.000Z', {
        link_url: 'https://meet.example.test/class/4',
      }),
    ];

    const result = computeAdminMetrics(rows, now, {
      studentsCount: 8,
      teachersCount: 2,
    });

    expect(result.liveNowCount).toBe(1);
    expect(result.todayTotalCount).toBe(3);
    expect(result.upcomingSessionsCount).toBe(2);
    expect(result.needsAttentionCount).toBe(1);
  });

  it('does not treat non-http links as valid meeting links', () => {
    const rows = [
      meeting(1, '2026-10-30T04:00:00.000Z', {
        link_url: 'javascript:alert(1)',
      }),
    ];

    expect(computeAdminMetrics(rows, now).needsAttentionCount).toBe(1);
  });
});
