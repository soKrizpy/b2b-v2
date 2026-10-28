import { describe, expect, it } from 'vitest';
import { isTeacherReportSubmittedForTopic } from '@/features/quiz/sessionReportGate';

const report = {
  module_id: 10,
  session_number: 1,
  has_joined: true,
  is_completed: true,
  progress_report: 'Mengenal dasar materi',
};

describe('isTeacherReportSubmittedForTopic', () => {
  it('unlocks only the matching module and 1-based topic session', () => {
    expect(isTeacherReportSubmittedForTopic(report, 10, 1)).toBe(true);
    expect(isTeacherReportSubmittedForTopic(report, 11, 1)).toBe(false);
    expect(isTeacherReportSubmittedForTopic(report, 10, 2)).toBe(false);
  });

  it('does not unlock when the student did not attend', () => {
    expect(isTeacherReportSubmittedForTopic({ ...report, has_joined: false }, 10, 1)).toBe(false);
  });

  it('does not unlock when the session is incomplete', () => {
    expect(isTeacherReportSubmittedForTopic({ ...report, is_completed: false }, 10, 1)).toBe(false);
  });

  it('requires a non-empty submitted report', () => {
    expect(isTeacherReportSubmittedForTopic({ ...report, progress_report: '' }, 10, 1)).toBe(false);
    expect(isTeacherReportSubmittedForTopic({ ...report, progress_report: '  ' }, 10, 1)).toBe(false);
    expect(isTeacherReportSubmittedForTopic({ ...report, progress_report: null }, 10, 1)).toBe(false);
  });

  it('does not treat unlinked legacy meetings as evidence of a report', () => {
    expect(isTeacherReportSubmittedForTopic({ ...report, module_id: null }, 10, 1)).toBe(false);
  });
});
