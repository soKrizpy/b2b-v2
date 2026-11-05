import { describe, expect, it } from 'vitest';
import { isTeacherReportSubmittedForTopic } from '@/features/quiz/sessionReportGate';

const report = {
  topic_id: 42,
  has_joined: true,
  is_completed: true,
  progress_report: 'Mengenal dasar materi',
};

describe('isTeacherReportSubmittedForTopic', () => {
  it('unlocks only the exact topic associated with the meeting', () => {
    expect(isTeacherReportSubmittedForTopic(report, 42)).toBe(true);
    expect(isTeacherReportSubmittedForTopic(report, 43)).toBe(false);
  });

  it('does not unlock when the student did not attend', () => {
    expect(isTeacherReportSubmittedForTopic({ ...report, has_joined: false }, 42)).toBe(false);
  });

  it('does not unlock when the session is incomplete', () => {
    expect(isTeacherReportSubmittedForTopic({ ...report, is_completed: false }, 42)).toBe(false);
  });

  it('requires a non-empty submitted report', () => {
    expect(isTeacherReportSubmittedForTopic({ ...report, progress_report: '' }, 42)).toBe(false);
    expect(isTeacherReportSubmittedForTopic({ ...report, progress_report: '  ' }, 42)).toBe(false);
    expect(isTeacherReportSubmittedForTopic({ ...report, progress_report: null }, 42)).toBe(false);
  });

  it('does not treat unlinked legacy meetings as evidence of a report', () => {
    expect(isTeacherReportSubmittedForTopic({ ...report, topic_id: null }, 42)).toBe(false);
  });
});
