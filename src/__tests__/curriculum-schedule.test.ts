import { describe, expect, it } from 'vitest';
import { assignTopicsToSessions, isCompleteModuleSchedule } from '@/features/sessions/curriculumSchedule';

describe('guided curriculum schedules', () => {
  it('pins each ordered published topic to its 1-based meeting number', () => {
    expect(assignTopicsToSessions([38, 12, 77])).toEqual([
      { topic_id: 38, session_number: 1 },
      { topic_id: 12, session_number: 2 },
      { topic_id: 77, session_number: 3 },
    ]);
  });

  it('requires exactly one meeting per published topic', () => {
    expect(isCompleteModuleSchedule(3, 3)).toBe(true);
    expect(isCompleteModuleSchedule(2, 3)).toBe(false);
    expect(isCompleteModuleSchedule(0, 0)).toBe(false);
    expect(isCompleteModuleSchedule(3, null)).toBe(false);
  });
});
