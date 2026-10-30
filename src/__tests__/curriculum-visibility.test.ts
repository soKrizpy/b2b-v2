import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStudentModulesWithTopics } from '@/features/curriculum/queries';
import { updateTopicAction } from '@/features/curriculum/actions';

const state = vi.hoisted(() => ({
  queries: [] as Array<{ table: string; filters: Array<[string, string, unknown]> }>,
  updates: 0,
  inserts: 0,
  topicLessonContent: null as unknown,
}));

vi.mock('@/lib/auth', () => ({
  requireAdmin: async () => ({ ok: true }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      const query = {
        filters: [] as Array<[string, string, unknown]>,
        select: () => query,
        eq: (column: string, value: unknown) => {
          query.filters.push(['eq', column, value]);
          return query;
        },
        in: (column: string, value: unknown) => {
          query.filters.push(['in', column, value]);
          return query;
        },
        order: () => query,
        update: () => {
          state.updates += 1;
          return query;
        },
        insert: () => {
          state.inserts += 1;
          return query;
        },
        maybeSingle: async () => ({
          data: { lesson_content: state.topicLessonContent },
          error: null,
        }),
        then: (
          resolve: (value: { data: unknown[]; error: null }) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => {
          state.queries.push({ table, filters: query.filters });
          const rowsByTable: Record<string, unknown[]> = {
            student_modules: [
              { student_id: 'student-1', module_id: 1, status: 'active' },
              { student_id: 'student-1', module_id: 2, status: 'paused' },
            ],
            modules: [
              {
                id: 1,
                title: 'Active module',
                description: null,
                level: 'beginner',
                gamification_type: 'mimo',
                is_active: true,
                created_at: '2026-01-01T00:00:00.000Z',
              },
              {
                id: 2,
                title: 'Paused module',
                description: null,
                level: 'beginner',
                gamification_type: 'mimo',
                is_active: true,
                created_at: '2026-01-02T00:00:00.000Z',
              },
            ],
            topics: [
              {
                id: 10,
                module_id: 1,
                title: 'Published topic',
                order_index: 1,
                description: null,
                project_link: null,
                topic_link: null,
                engine_topic_id: null,
                lesson_content: { learningPath: [{ id: 'node-1' }] },
                status: 'published',
                published_at: null,
                created_at: '2026-01-01T00:00:00.000Z',
              },
              {
                id: 11,
                module_id: 1,
                title: 'Draft topic',
                order_index: 2,
                description: null,
                project_link: null,
                topic_link: null,
                engine_topic_id: null,
                lesson_content: null,
                status: 'draft',
                published_at: null,
                created_at: '2026-01-02T00:00:00.000Z',
              },
            ],
            challenges: [],
          };

          const rows = (rowsByTable[table] ?? []).filter((row) =>
            query.filters.every(([operator, column, value]) => {
              const item = row as Record<string, unknown>;
              if (operator === 'eq') return item[column] === value;
              return Array.isArray(value) && value.includes(item[column]);
            }),
          );
          return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  }),
}));

describe('Quest Map and topic visibility', () => {
  beforeEach(() => {
    state.queries = [];
    state.updates = 0;
    state.inserts = 0;
    state.topicLessonContent = null;
  });

  it('loads only active enrollments and published topics without assigning modules', async () => {
    const modules = await getStudentModulesWithTopics('student-1');

    expect(modules).toHaveLength(1);
    expect(modules[0].id).toBe(1);
    expect(modules[0].topics.map((topic) => topic.title)).toEqual(['Published topic']);
    expect(state.queries).toContainEqual({
      table: 'student_modules',
      filters: [
        ['eq', 'student_id', 'student-1'],
        ['eq', 'status', 'active'],
      ],
    });
    expect(state.queries.find((query) => query.table === 'topics')?.filters).toContainEqual([
      'eq',
      'status',
      'published',
    ]);
    expect(state.inserts).toBe(0);
  });

  it('rejects publishing a topic without lesson nodes', async () => {
    const formData = new FormData();
    formData.set('id', '10');
    formData.set('module_id', '1');
    formData.set('title', 'No-node topic');
    formData.set('status', 'published');
    formData.set('order_index', '1');

    await expect(updateTopicAction(null, formData)).resolves.toEqual({
      success: false,
      error: 'Topik hanya boleh dipublikasikan jika memiliki 10–20 node pembelajaran valid (termasuk challenge). Saat ini: 0.',
    });
    expect(state.updates).toBe(0);
  });

  it('rejects publishing a topic with authored source content below the required 10-node minimum', async () => {
    const formData = new FormData();
    formData.set('id', '10');
    formData.set('module_id', '1');
    formData.set('title', 'Underfilled topic');
    formData.set('status', 'published');
    formData.set('order_index', '1');

    state.topicLessonContent = {
      learningPath: [{
        id: 'source-slide-1',
        type: 'lesson',
        title: 'Satu konsep dari sumber',
        content: 'Materi yang benar-benar tersedia dari sumber.',
      }],
      quiz: Array.from({ length: 5 }, (_, index) => ({
        question: `Question ${index + 1}`,
        options: ['A', 'B', 'C', 'D'],
        answer_index: 0,
        explanation: 'A',
      })),
    };
    await expect(updateTopicAction(null, formData)).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining('Saat ini: 1.'),
    });
    expect(state.updates).toBe(0);
  });

  it('allows publishing a topic with exactly ten valid instructional slides and five quiz questions', async () => {
    state.topicLessonContent = {
      learningPath: Array.from({ length: 10 }, (_, index) => ({
        id: `slide-${index + 1}`,
        type: 'lesson',
        title: `Materi ${index + 1}`,
        content: 'Penjelasan materi yang cukup.',
      })),
      quiz: Array.from({ length: 5 }, (_, index) => ({
        question: `Question ${index + 1}`,
        options: ['A', 'B', 'C', 'D'],
        answer_index: 0,
        explanation: 'A',
      })),
    };
    const formData = new FormData();
    formData.set('id', '10');
    formData.set('module_id', '1');
    formData.set('title', 'Ready topic');
    formData.set('status', 'published');
    formData.set('order_index', '1');

    await expect(updateTopicAction(null, formData)).resolves.toMatchObject({
      success: true,
    });
    expect(state.updates).toBe(1);
  });
});
