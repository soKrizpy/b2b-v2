import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTopicQuizState } from '@/features/quiz/queries';

const state = vi.hoisted(() => ({
  meetings: [{
    meeting_id: 70,
    has_joined: true,
    meetings: {
      module_id: 5,
      topic_id: 12,
      is_completed: false,
      progress_report: null as string | null,
    },
  }],
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => { filters[column] = value; return query; },
        order: () => query,
        maybeSingle: async () => {
          return table === 'topics'
            ? { data: { id: 12, module_id: 5, order_index: 0, lesson_content: { quiz: [{ question: 'Q?', options: ['A', 'B', 'C', 'D'], answer_index: 0, explanation: 'Reason' }] } }, error: null }
            : { data: null, error: null };
        },
        then: (resolve: (result: { data: unknown; error: null }) => unknown, reject?: (error: unknown) => unknown) => {
          let data: unknown = [];
          if (table === 'meeting_students') data = state.meetings;
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  }),
}));

describe('topic quiz teacher-report gate', () => {
  beforeEach(() => {
    state.meetings = [{
      meeting_id: 70,
      has_joined: true,
      meetings: { module_id: 5, topic_id: 12, is_completed: false, progress_report: null },
    }];
  });

  it('keeps the quiz locked until the matching attended session is completed with a report', async () => {
    const beforeReport = await getTopicQuizState(12, 'student-1');
    expect(beforeReport.isUnlocked).toBe(false);
    expect(beforeReport.questions).toEqual([]);

    state.meetings[0].meetings = {
      module_id: 5,
      topic_id: 12,
      is_completed: true,
      progress_report: 'Sesi dan materi telah dibahas.',
    };
    const afterReport = await getTopicQuizState(12, 'student-1');
    expect(afterReport.isUnlocked).toBe(true);
    expect(afterReport.questions).toHaveLength(1);
  });

  it('does not accept a report from a different module even if its topic id matches', async () => {
    state.meetings[0].meetings = {
      module_id: 99,
      topic_id: 12,
      is_completed: true,
      progress_report: 'Report from another module.',
    };
    const result = await getTopicQuizState(12, 'student-1');
    expect(result.isUnlocked).toBe(false);
    expect(result.questions).toEqual([]);
  });

  it('keeps the quiz locked when the student has duplicate mappings for the topic', async () => {
    const completedMeeting = {
      meeting_id: 70,
      has_joined: true,
      meetings: {
        module_id: 5,
        topic_id: 12,
        is_completed: true,
        progress_report: 'Teacher report submitted.',
      },
    };
    state.meetings = [completedMeeting, { ...completedMeeting, meeting_id: 71 }];

    const result = await getTopicQuizState(12, 'student-1');
    expect(result.isUnlocked).toBe(false);
    expect(result.questions).toEqual([]);
  });
});
