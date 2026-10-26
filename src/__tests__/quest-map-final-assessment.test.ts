import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getQuestMapData } from '@/features/quiz/questMapQueries';
import type { ModuleWithTopics } from '@/features/curriculum/queries';

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        in: () => query,
        then: (resolve: (result: { data: never[]; error: null }) => unknown, reject?: (error: unknown) => unknown) =>
          Promise.resolve({ data: [], error: null }).then(resolve, reject),
      };
      return query;
    },
  }),
}));

const validAssessment = {
  title: 'Local test assessment',
  duration_minutes: 30,
  questions: Array.from({ length: 20 }, (_, index) => ({
    id: index + 1,
    question: `Question ${index + 1}`,
    options: ['A', 'B', 'C', 'D'],
    answer_index: 0,
    explanation: 'Explanation',
  })),
};

function moduleRow(description: string | null, jsonb?: unknown): ModuleWithTopics {
  return {
    id: 7,
    title: 'Scratch test module',
    description,
    level: 'beginner',
    gamification_type: 'quest',
    is_active: true,
    created_at: '',
    topics: [{
      id: 11,
      module_id: 7,
      order_index: 0,
      title: 'Topic 1',
      description: null,
      project_link: null,
      topic_link: null,
      engine_topic_id: null,
      lesson_content: {},
      status: 'published',
      published_at: null,
      created_at: '',
      challenge_count: 0,
    }],
    ...(jsonb ? { final_assessment: jsonb } : {}),
  } as unknown as ModuleWithTopics;
}

describe('Quest Map final assessment availability', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows Final Boss for a valid marker', async () => {
    const result = await getQuestMapData( 'student-1', moduleRow(`FINAL_ASSESSMENT:${JSON.stringify(validAssessment)}`));
    expect(result.hasFinal).toBe(true);
  });

  it('does not show Final Boss for a malformed marker', async () => {
    const result = await getQuestMapData('student-1', moduleRow('FINAL_ASSESSMENT:{broken'));
    expect(result.hasFinal).toBe(false);
  });

  it('does not show Final Boss for JSONB-only data unsupported by page and action', async () => {
    const result = await getQuestMapData('student-1', moduleRow(null, validAssessment));
    expect(result.hasFinal).toBe(false);
  });
});
