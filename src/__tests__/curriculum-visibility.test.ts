import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStudentModulesWithTopics } from '@/features/curriculum/queries';
import { updateTopicAction } from '@/features/curriculum/actions';

const state = vi.hoisted(() => ({
  queries: [] as Array<{ table: string; filters: Array<[string, string, unknown]> }>,
  updates: 0,
  inserts: 0,
  topicLessonContent: null as unknown,
  teacherRowsByTable: {} as Record<string, unknown[]>,
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
            ...state.teacherRowsByTable,
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
    state.teacherRowsByTable = {};
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
      error: 'Topik harus memiliki minimal satu node materi sebelum dipublikasikan.',
    });
    expect(state.updates).toBe(0);
  });
});


describe('teacher guide curriculum scope', () => {
  beforeEach(() => {
    state.queries = [];
    state.teacherRowsByTable = {
      meetings: [
        { id: 10, is_completed: true, teacher_id: 'teacher-1' },
        { id: 11, is_completed: false, teacher_id: 'teacher-1' },
      ],
      meeting_students: [
        { meeting_id: 10, student_id: 'former-student' },
        { meeting_id: 11, student_id: 'current-student' },
      ],
      teacher_students: [],
      student_modules: [
        { student_id: 'former-student', module_id: 2, status: 'active' },
        { student_id: 'current-student', module_id: 1, status: 'active' },
      ],
      modules: [
        {
          id: 1,
          title: 'Current module',
          description: null,
          level: 'beginner',
          gamification_type: 'mimo',
          is_active: true,
          created_at: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 2,
          title: 'Former module',
          description: null,
          level: 'beginner',
          gamification_type: 'mimo',
          is_active: true,
          created_at: '2026-01-02T00:00:00.000Z',
        },
      ],
      topics: [
        {
          id: 20,
          module_id: 1,
          title: 'Current published topic',
          order_index: 1,
          description: null,
          project_link: null,
          topic_link: null,
          engine_topic_id: null,
          lesson_content: null,
          status: 'published',
          published_at: null,
          created_at: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 21,
          module_id: 2,
          title: 'Former published topic',
          order_index: 1,
          description: null,
          project_link: null,
          topic_link: null,
          engine_topic_id: null,
          lesson_content: null,
          status: 'published',
          published_at: null,
          created_at: '2026-01-02T00:00:00.000Z',
        },
      ],
      challenges: [],
    };
  });

  it('does not expose curriculum through completed historical meetings', async () => {
    const { getTeacherModulesWithTopics } = await import('@/features/curriculum/queries');
    const modules = await getTeacherModulesWithTopics('teacher-1');

    expect(modules.map((module) => module.title)).toEqual(['Current module']);
    expect(modules[0].topics.map((topic) => topic.title)).toEqual([
      'Current published topic',
    ]);
    expect(state.queries.find((query) => query.table === 'meetings')?.filters).toContainEqual([
      'eq',
      'is_completed',
      false,
    ]);
  });
});
