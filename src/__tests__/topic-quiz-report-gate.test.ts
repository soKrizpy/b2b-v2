import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTopicQuizState } from '@/features/quiz/queries';

const state = vi.hoisted(() => ({
  meeting: {
    meeting_id: 70,
    has_joined: true,
    meetings: {
      module_id: 5,
      is_completed: false,
      session_number: 1,
      progress_report: null as string | null,
    },
  },
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      let isSingle = false;
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => { filters[column] = value; return query; },
        order: () => query,
        maybeSingle: async () => {
          isSingle = true;
          return table === 'topics'
            ? { data: { id: 12, module_id: 5, order_index: 0, lesson_content: { quiz: [{ question: 'Q?' }] } }, error: null }
            : { data: null, error: null };
        },
        then: (resolve: (result: { data: unknown; error: null }) => unknown, reject?: (error: unknown) => unknown) => {
          let data: unknown = [];
          if (table === 'meeting_students') data = [state.meeting];
          if (table === 'topics' && !isSingle && filters.module_id === 5) {
            data = [{ id: 12, order_index: 0 }];
          }
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  }),
}));

describe('topic quiz teacher-report gate', () => {
  beforeEach(() => {
    state.meeting = {
      meeting_id: 70,
      has_joined: true,
      meetings: { module_id: 5, is_completed: false, session_number: 1, progress_report: null },
    };
  });

  it('keeps the quiz locked until the matching attended session is completed with a report', async () => {
    const beforeReport = await getTopicQuizState(12, 'student-1');
    expect(beforeReport.isUnlocked).toBe(false);

    state.meeting.meetings = {
      module_id: 5,
      is_completed: true,
      session_number: 1,
      progress_report: 'Sesi dan materi telah dibahas.',
    };
    const afterReport = await getTopicQuizState(12, 'student-1');
    expect(afterReport.isUnlocked).toBe(true);
  });
});
