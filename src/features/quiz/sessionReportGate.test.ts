import { describe, expect, it } from 'vitest';
import {
  isTeacherReportSubmittedForTopic,
  type TeacherReportMeeting,
} from './sessionReportGate';

const validMeeting: TeacherReportMeeting = {
  topic_id: 42,
  has_joined: true,
  is_completed: true,
  progress_report: 'Siswa menyelesaikan latihan dengan baik.',
};

describe('isTeacherReportSubmittedForTopic', () => {
  it('unlocks only the matching attended, completed topic meeting with a report', () => {
    expect(isTeacherReportSubmittedForTopic(validMeeting, 42)).toBe(true);
  });

  it.each([
    ['wrong topic association', { topic_id: 43 }],
    ['student absent', { has_joined: false }],
    ['session not completed', { is_completed: false }],
    ['report missing', { progress_report: null }],
    ['report blank', { progress_report: '  \n  ' }],
    ['topic association missing', { topic_id: null }],
  ] as const)('keeps quiz locked when %s', (_reason, override) => {
    expect(
      isTeacherReportSubmittedForTopic(
        { ...validMeeting, ...override },
        42,
      ),
    ).toBe(false);
  });

  it.each([0, -1])('keeps quiz locked for invalid topic id %i', (topicId) => {
    expect(isTeacherReportSubmittedForTopic(validMeeting, topicId)).toBe(false);
  });
});
