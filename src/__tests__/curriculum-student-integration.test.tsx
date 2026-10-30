import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { importCurriculumJson } from '@/features/curriculum/actions';
import TopicPage from '@/app/student/lessons/topic/[topicId]/page';

type Row = Record<string, unknown>;

const state = vi.hoisted(() => ({
  tables: {
    modules: [] as Row[],
    topics: [] as Row[],
    challenges: [] as Row[],
    challenge_submissions: [] as Row[],
    student_modules: [] as Row[],
  },
  nextId: 1,
}));

vi.mock('@/lib/auth', () => ({
  requireAdmin: async () => ({ ok: true }),
  getAuthUser: async () => ({ ok: true, role: 'student', user: { id: 'student-1' } }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('notFound'); },
  redirect: () => { throw new Error('redirect'); },
}));
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (table: keyof typeof state.tables) => {
      let operation: 'select' | 'insert' | 'update' = 'select';
      let values: Row = {};
      const filters: Array<(row: Row) => boolean> = [];
      let singleResult = false;
      const query = {
        select: () => query,
        insert: (input: Row) => { operation = 'insert'; values = input; return query; },
        update: (input: Row) => { operation = 'update'; values = input; return query; },
        eq: (column: string, value: unknown) => { filters.push((row) => row[column] === value); return query; },
        in: (column: string, valuesIn: unknown[]) => { filters.push((row) => valuesIn.includes(row[column])); return query; },
        order: (column: string, options?: { ascending?: boolean }) => {
          state.tables[table].sort((a, b) => {
            const compare = String(a[column] ?? '').localeCompare(String(b[column] ?? ''), undefined, { numeric: true });
            return options?.ascending === false ? -compare : compare;
          });
          return query;
        },
        single: () => { singleResult = true; return query; },
        maybeSingle: async () => {
          singleResult = true;
          const result = await query;
          return { data: result.data ?? null, error: null };
        },
        then: (resolve: (result: { data: Row[] | Row | null; error: null }) => unknown, reject?: (error: unknown) => unknown) => {
          try {
            let rows: Row[];
            if (operation === 'insert') {
              const inserted = { id: state.nextId++, ...values };
              state.tables[table].push(inserted);
              rows = [inserted];
            } else {
              rows = state.tables[table].filter((row) => filters.every((filter) => filter(row)));
              if (operation === 'update') rows.forEach((row) => Object.assign(row, values));
            }
            const data = singleResult ? rows[0] ?? null : rows;
            return Promise.resolve(resolve({ data, error: null })).catch(reject);
          } catch (error) {
            return Promise.reject(error).catch(reject);
          }
        },
      };
      return query;
    },
  }),
}));
vi.mock('@/features/curriculum/queries', () => ({
  getTopicById: async (id: number) => state.tables.topics.find((topic) => topic.id === id) ?? null,
  getStudentModulesWithTopics: async () => state.tables.modules.map((module) => ({
    ...module,
    topics: state.tables.topics.filter((topic) => topic.module_id === module.id),
  })),
  getAllModulesWithTopics: async () => state.tables.modules.map((module) => ({
    ...module,
    topics: state.tables.topics.filter((topic) => topic.module_id === module.id),
  })),
}));
vi.mock('@/features/quiz/questMapQueries', () => ({
  getQuestMapData: async (_studentId: string, module: { id: number }) => ({
    nodes: state.tables.topics
      .filter((topic) => topic.module_id === module.id)
      .map((topic) => ({ topic: { id: topic.id }, isUnlocked: true, status: 'ACTIVE_NEXT' })),
  }),
}));
vi.mock('@/features/quiz/queries', () => ({
  getTopicQuizState: async () => ({ questions: [], attempts: 0, isUnlocked: false, isLocked: false, bestScore: null }),
}));
vi.mock('@/features/curriculum/components/LessonNodeWalker', () => ({
  LessonNodeWalker: ({ nodes }: { nodes: Array<{ explanation?: string }> }) => (
    <div>{nodes.map((node, index) => <p key={index}>{node.explanation}</p>)}</div>
  ),
}));
vi.mock('@/features/challenges/components/SubmitChallengeForm', () => ({
  SubmitChallengeForm: ({ challenge }: { challenge: { title: string } }) => <div>{challenge.title}</div>,
}));

const lessonNodes = Array.from({ length: 10 }, (_, index) => ({
  node_id: `lesson-${index + 1}`,
  order: index,
  type: 'theory' as const,
  title: `Materi ${index + 1}`,
  content: `Isi impor ${index + 1}`,
}));
const topicQuiz = Array.from({ length: 5 }, (_, index) => ({
  question: `Pertanyaan ${index + 1}`,
  options: ['A', 'B', 'C', 'D'],
  answer_index: index % 4,
  explanation: `Penjelasan ${index + 1}`,
}));

describe('isolated curriculum import to student challenge flow', () => {
  beforeEach(() => {
    Object.values(state.tables).forEach((rows) => { rows.length = 0; });
    state.nextId = 1;
  });

  it('keeps old submissions while a replacement challenge becomes the only student-visible challenge', async () => {
    const originalPayload = [{
      module_title: 'Modul terisolasi',
      module_order: 0,
      topics: [{
        topic_title: 'Topik terisolasi',
        topic_order: 0,
        nodes: lessonNodes,
        quiz: topicQuiz,
        challenge: { title: 'Challenge lama', instructions: 'Versi lama', submission_type: 'link', xp: 20 },
      }],
    }];
    expect(await importCurriculumJson(originalPayload)).toMatchObject({ success: true });

    const createdModule = state.tables.modules[0];
    const topic = state.tables.topics[0];
    const oldChallenge = state.tables.challenges[0];
    state.tables.challenge_submissions.push({
      id: state.nextId++,
      challenge_id: oldChallenge.id,
      student_id: 'student-1',
      submission_url: 'https://example.test/old-work',
      submission_note: 'Submission historis',
      status: 'approved',
      review_note: null,
      reviewed_by: null,
      reviewed_at: null,
      submitted_at: '2026-01-01T00:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
    });

    const replacementPayload = [{
      ...originalPayload[0],
      topics: [{
        ...originalPayload[0].topics[0],
        challenge: { title: 'Challenge baru', instructions: 'Versi baru', submission_type: 'link' as const, xp: 40 },
      }],
    }];
    expect(await importCurriculumJson(replacementPayload)).toMatchObject({ success: true });
    state.tables.student_modules.push({ student_id: 'student-1', module_id: createdModule.id, status: 'active' });

    render(await TopicPage({ params: Promise.resolve({ topicId: String(topic.id) }) }));

    expect(screen.getByText('Isi impor 1')).toBeInTheDocument();
    expect(screen.getAllByText('Challenge baru')).toHaveLength(2);
    expect(screen.queryByText('Challenge lama')).not.toBeInTheDocument();
    expect(state.tables.challenges).toHaveLength(2);
    expect(state.tables.challenge_submissions).toHaveLength(1);
    expect(state.tables.challenge_submissions[0].challenge_id).toBe(oldChallenge.id);
  });
});
