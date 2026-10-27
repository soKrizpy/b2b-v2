import { beforeEach, describe, expect, it, vi } from 'vitest';
import { submitChallenge } from '@/features/challenges/actions';

type Row = Record<string, unknown>;

const state = vi.hoisted(() => ({
  role: 'student',
  userId: 'student-1',
  challenge: { id: 501, topic_id: 12 },
  topic: { id: 12, module_id: 5, status: 'published', lesson_content: { activeChallengeIds: [501] } as unknown },
  enrollment: { module_id: 5, student_id: 'student-1', status: 'active' } as Row | null,
  submissions: [] as Row[],
  insertCount: 0,
  submissionReadError: false,
  submissionInsertError: null as 'pending-conflict' | 'other-conflict' | 'other-error' | null,
  pendingLookupError: false,
  concurrentSubmissionReads: false,
  submissionReadArrivals: 0,
  submissionReadResolvers: [] as Array<() => void>,
  simulatePendingUniqueIndex: false,
  topicUnlocked: true,
  reportSubmitted: true,
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  getAuthUser: async () => ({ ok: true, role: state.role, user: { id: state.userId } }),
  requireAdmin: async () => ({ ok: true }),
  requireRole: async () => ({ ok: true, user: { id: state.userId } }),
}));
vi.mock('@/features/pet/lib/rewardActions', () => ({ awardRewardEvent: vi.fn() }));
vi.mock('@/features/curriculum/queries', () => ({
  getStudentModulesWithTopics: async () => [{ id: 5, topics: [] }],
}));
vi.mock('@/features/quiz/questMapQueries', () => ({
  getQuestMapData: async () => ({ nodes: [{ topic: { id: 12 }, isUnlocked: state.topicUnlocked, status: state.topicUnlocked ? 'ACTIVE_NEXT' : 'LOCKED' }] }),
}));
vi.mock('@/features/quiz/queries', () => ({
  getTopicQuizState: async () => ({ isUnlocked: state.reportSubmitted }),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      const filters: Array<(row: Row) => boolean> = [];
      let isPendingLookup = false;
      let operation: 'select' | 'insert' = 'select';
      let values: Row = {};
      let single = false;
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => {
          filters.push((row) => row[column] === value);
          if (column === 'status' && value === 'pending') isPendingLookup = true;
          return query;
        },
        order: () => query,
        limit: () => query,
        insert: (input: Row) => { operation = 'insert'; values = input; return query; },
        single: () => { single = true; return query; },
        maybeSingle: async () => {
          single = true;
          const result = await query as { data: Row | null; error: null };
          return result;
        },
        then: (resolve: (value: { data: Row[] | Row | null; error: { code?: string; message: string } | null }) => unknown) => {
          let rows: Row[];
          if (table === 'challenges') rows = [state.challenge as unknown as Row];
          else if (table === 'topics') rows = [state.topic as unknown as Row];
          else if (table === 'student_modules') rows = state.enrollment ? [state.enrollment] : [];
          else if (table === 'challenge_submissions') rows = state.submissions;
          else rows = state.submissions;

          rows = rows.filter((row) => filters.every((filter) => filter(row)));
          let data: Row[] | Row | null;
          if (operation === 'insert') {
            if (table === 'challenge_submissions' && state.submissionInsertError) {
              if (state.submissionInsertError === 'pending-conflict') {
                state.submissions.push({ id: 899, status: 'pending', ...values });
              }
              const error = state.submissionInsertError === 'other-error'
                ? { code: 'XX000', message: 'insert failed' }
                : { code: '23505', message: 'unique constraint violation' };
              return Promise.resolve(resolve({ data: null, error }));
            }
            if (
              table === 'challenge_submissions'
              && state.simulatePendingUniqueIndex
              && state.submissions.some((row) =>
                row.challenge_id === values.challenge_id
                && row.student_id === values.student_id
                && row.status === 'pending'
              )
            ) {
              return Promise.resolve(resolve({ data: null, error: { code: '23505', message: 'duplicate pending submission' } }));
            }
            const row = { id: 900 + state.insertCount++, status: 'pending', ...values };
            state.submissions.push(row);
            data = row;
          } else {
            if (table === 'challenge_submissions' && (state.submissionReadError || (isPendingLookup && state.pendingLookupError))) {
              return Promise.resolve(resolve({ data: null, error: { message: 'read unavailable' } }));
            }
            data = single ? rows[0] ?? null : rows;
          }
          if (table === 'challenge_submissions' && operation === 'select' && state.concurrentSubmissionReads && !isPendingLookup) {
            // Force two in-flight requests to finish the lookup from the same
            // empty snapshot before either is allowed to insert.
            return new Promise<void>((resolveBarrier) => {
              state.submissionReadArrivals++;
              state.submissionReadResolvers.push(resolveBarrier);
              if (state.submissionReadArrivals === 2) {
                state.submissionReadResolvers.forEach((resolveRead) => resolveRead());
              }
            }).then(() => resolve({ data, error: null }));
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
    state.topic = { id: 12, module_id: 5, status: 'published', lesson_content: { activeChallengeIds: [501] } };
    state.enrollment = { module_id: 5, student_id: 'student-1', status: 'active' };
    state.submissions = [];
    state.insertCount = 0;
    state.submissionReadError = false;
    state.submissionInsertError = null;
    state.pendingLookupError = false;
    state.concurrentSubmissionReads = false;
    state.submissionReadArrivals = 0;
    state.submissionReadResolvers = [];
    state.simulatePendingUniqueIndex = false;
    state.topicUnlocked = true;
    state.reportSubmitted = true;
  });

  it('allows a submission for an active challenge', async () => {
    const result = await submitChallenge(null, form());
    expect(result).toMatchObject({ success: true });
    expect(state.submissions).toHaveLength(1);
  });

  it('rejects submissions before the assigned meeting starts', async () => {
    state.topicUnlocked = false;
    await expect(submitChallenge(null, form())).resolves.toMatchObject({
      success: false,
      error: 'Challenge akan terbuka saat sesi topik ini dimulai.',
    });
    expect(state.submissions).toHaveLength(0);
  });


  it('rejects project submissions until the admin/teacher report unlocks the topic', async () => {
    state.reportSubmitted = false;
    await expect(submitChallenge(null, form())).resolves.toMatchObject({
      success: false,
      error: 'Proyek challenge akan terbuka setelah guru/admin mengirim laporan sesi topik ini.',
    });
    expect(state.submissions).toHaveLength(0);
  });

  it('fails closed when the previous-submission query errors', async () => {
    state.submissionReadError = true;
    await expect(submitChallenge(null, form())).resolves.toMatchObject({
      success: false,
      error: 'Gagal memeriksa submission sebelumnya. Coba lagi.',
    });
    expect(state.submissions).toHaveLength(0);
  });

  it('rejects a repeated pending submission in sequential requests', async () => {
    await expect(submitChallenge(null, form())).resolves.toMatchObject({ success: true });
    await expect(submitChallenge(null, form())).resolves.toMatchObject({
      success: false,
      error: 'Kamu sudah punya submission yang sedang ditinjau. Tunggu hasilnya dulu.',
    });
    expect(state.submissions).toHaveLength(1);
  });

  it('reports a pending duplicate only when the conflicting pending row is found', async () => {
    state.submissionInsertError = 'pending-conflict';
    await expect(submitChallenge(null, form())).resolves.toMatchObject({
      success: false,
      error: 'Kamu sudah punya submission yang sedang ditinjau. Tunggu hasilnya dulu.',
    });
    expect(state.submissions).toHaveLength(1);
  });

  it('does not label an unrelated unique conflict as a pending duplicate', async () => {
    state.submissionInsertError = 'other-conflict';
    await expect(submitChallenge(null, form())).resolves.toMatchObject({
      success: false,
      error: 'Gagal menyimpan submission. Coba lagi.',
    });
    expect(state.submissions).toHaveLength(0);
  });

  it('returns a generic storage error if the conflict lookup fails', async () => {
    state.submissionInsertError = 'pending-conflict';
    state.pendingLookupError = true;
    await expect(submitChallenge(null, form())).resolves.toMatchObject({
      success: false,
      error: 'Gagal menyimpan submission. Coba lagi.',
    });
    expect(state.submissions).toHaveLength(1);
  });

  it('returns a generic storage error for insert failures other than unique conflicts', async () => {
    state.submissionInsertError = 'other-error';
    await expect(submitChallenge(null, form())).resolves.toMatchObject({
      success: false,
      error: 'Gagal menyimpan submission. Coba lagi.',
    });
    expect(state.submissions).toHaveLength(0);
  });

  it('allows a resubmission after the previous attempt needs revision', async () => {
    state.submissions = [{
      id: 700,
      challenge_id: 501,
      student_id: 'student-1',
      status: 'needs_revision',
      submitted_at: '2026-10-24T10:00:00.000Z',
    }];
    await expect(submitChallenge(null, form())).resolves.toMatchObject({ success: true });
    expect(state.submissions).toHaveLength(2);
    expect(state.submissions.map((submission) => submission.status)).toEqual(['needs_revision', 'pending']);
  });

  it('handles simultaneous requests when the database enforces the pending-row unique index', async () => {
    state.concurrentSubmissionReads = true;
    state.simulatePendingUniqueIndex = true;

    const results = await Promise.all([
      submitChallenge(null, form()),
      submitChallenge(null, form()),
    ]);

    expect(results.filter((result) => result.success)).toHaveLength(1);
    expect(results.filter((result) => !result.success)).toHaveLength(1);
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
    state.topic.lesson_content = { learningPath: [] };
    await expect(submitChallenge(null, form())).resolves.toMatchObject({ success: true });
  });
});
