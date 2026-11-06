import { beforeEach, describe, expect, it, vi } from 'vitest';
import { submitChallenge } from '@/features/challenges/actions';

type Row = Record<string, unknown>;

const state = vi.hoisted(() => ({
  role: 'student',
  userId: 'student-1',
  challenge: { id: 501, topic_id: 12 },
  topic: { id: 12, module_id: 5, status: 'published', lesson_content: { learningPath: [{ type: 'lesson', title: 'Materi', content: 'Isi materi' }], activeChallengeIds: [501] } as unknown },
  enrollment: { module_id: 5, student_id: 'student-1', status: 'active' } as Row | null,
  submissions: [] as Row[],
  insertCount: 0,
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  getAuthUser: async () => ({ ok: true, role: state.role, user: { id: state.userId } }),
  requireAdmin: async () => ({ ok: true }),
  requireRole: async () => ({ ok: true, user: { id: state.userId } }),
}));
vi.mock('@/features/pet/lib/rewardActions', () => ({ awardRewardEvent: vi.fn() }));
vi.mock('@/features/curriculum/queries', () => ({
  getStudentModulesWithTopics: async () => [{ id: 5, topics: [{ id: 12 }] }],
}));
vi.mock('@/features/quiz/questMapQueries', () => ({
  getQuestMapData: async () => ({ nodes: [{ topic: { id: 12 }, status: 'AVAILABLE', isUnlocked: true }] }),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      const filters: Array<(row: Row) => boolean> = [];
      let operation: 'select' | 'insert' = 'select';
      let values: Row = {};
      let single = false;
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => { filters.push((row) => row[column] === value); return query; },
        order: () => query,
        limit: () => query,
        insert: (input: Row) => { operation = 'insert'; values = input; return query; },
        single: () => { single = true; return query; },
        maybeSingle: async () => {
          single = true;
          const result = await query as { data: Row | null; error: null };
          return result;
        },
        then: (resolve: (value: { data: Row[] | Row | null; error: null }) => unknown) => {
          let rows: Row[];
          if (table === 'challenges') rows = [state.challenge as unknown as Row];
          else if (table === 'topics') rows = [state.topic as unknown as Row];
          else if (table === 'student_modules') rows = state.enrollment ? [state.enrollment] : [];
          else if (table === 'challenge_submissions') rows = state.submissions;
          else rows = state.submissions;

          rows = rows.filter((row) => filters.every((filter) => filter(row)));
          let data: Row[] | Row | null;
          if (operation === 'insert') {
            const row = { id: 900 + state.insertCount++, ...values };
            state.submissions.push(row);
            data = row;
          } else {
            data = single ? rows[0] ?? null : rows;
          }
          return Promise.resolve(resolve({ data, error: null }));
        },
      };
      return query;
    },
  }),
}));

function form(challengeId = 501): FormData {
  const data = new FormData();
  data.set('challenge_id', String(challengeId));
  data.set('submission_url', 'https://example.test/work');
  return data;
}

describe('submitChallenge active challenge authorization', () => {
  beforeEach(() => {
    state.role = 'student';
    state.userId = 'student-1';
    state.challenge = { id: 501, topic_id: 12 };
    state.topic = { id: 12, module_id: 5, status: 'published', lesson_content: { learningPath: [{ type: 'lesson', title: 'Materi', content: 'Isi materi' }], activeChallengeIds: [501] } };
    state.enrollment = { module_id: 5, student_id: 'student-1', status: 'active' };
    state.submissions = [];
    state.insertCount = 0;
  });

  it('allows a submission for an active challenge', async () => {
    const result = await submitChallenge(null, form());
    expect(result).toMatchObject({ success: true });
    expect(state.submissions).toHaveLength(1);
  });

  it('rejects an inactive challenge without inserting a submission', async () => {
    state.topic.lesson_content = { activeChallengeIds: [502] };
    await expect(submitChallenge(null, form())).resolves.toMatchObject({ success: false, error: 'Challenge ini sudah tidak aktif.' });
    expect(state.submissions).toHaveLength(0);
  });

  it('fails closed when active metadata contains a mixed valid and invalid ID', async () => {
    state.topic.lesson_content = { activeChallengeIds: [501, '502'] };
    await expect(submitChallenge(null, form())).resolves.toMatchObject({ success: false, error: 'Challenge ini sudah tidak aktif.' });
    expect(state.submissions).toHaveLength(0);
  });

  it('rejects a challenge that does not belong to the topic whose active list is checked', async () => {
    state.challenge = { id: 502, topic_id: 13 };
    state.topic = { id: 13, module_id: 5, status: 'published', lesson_content: { activeChallengeIds: [501] } };
    await expect(submitChallenge(null, form(502))).resolves.toMatchObject({ success: false });
    expect(state.submissions).toHaveLength(0);
  });

  it('keeps a legacy topic without metadata compatible', async () => {
    state.topic.lesson_content = { learningPath: [{ type: 'lesson', title: 'Materi', content: 'Isi materi' }] };
    await expect(submitChallenge(null, form())).resolves.toMatchObject({ success: true });
  });
});
