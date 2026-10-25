import { describe, expect, it } from 'vitest';
import {
  isTeacherReportSubmittedForTopic,
  type TeacherReportMeeting,
} from './sessionReportGate';

const validMeeting: TeacherReportMeeting = {
  module_id: 12,
  session_number: 2,
  has_joined: true,
  is_completed: true,
  progress_report: 'Siswa menyelesaikan latihan dengan baik.',
};

describe('isTeacherReportSubmittedForTopic', () => {
  it('unlocks only the matching attended, completed session with a report', () => {
    expect(isTeacherReportSubmittedForTopic(validMeeting, 12, 2)).toBe(true);
  });

  it.each([
    ['wrong module', { module_id: 99 }],
    ['wrong session', { session_number: 3 }],
    ['student absent', { has_joined: false }],
    ['session not completed', { is_completed: false }],
    ['report missing', { progress_report: null }],
    ['report blank', { progress_report: '  \n  ' }],
    ['module association missing', { module_id: null }],
    ['session number missing', { session_number: null }],
  ] as const)('keeps quiz locked when %s', (_reason, override) => {
    expect(
      isTeacherReportSubmittedForTopic(
        { ...validMeeting, ...override },
        12,
        2,
      ),
    ).toBe(false);
  });
});
