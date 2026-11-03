import { beforeEach, describe, expect, it, vi } from 'vitest';
import { importCurriculumJsonForModule } from '@/features/curriculum/actions';

const state = vi.hoisted(() => ({
  existingTopics: [{ id: 5, title: 'Introduction' }],
  topicsReadError: null as { message: string } | null,
  topicUpdateError: null as { message: string } | null,
  moduleUpdateError: null as { message: string } | null,
  challengeReadError: null as { message: string } | null,
  writes: [] as string[],
  thrownError: null as Error | null,
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
      let operation: 'select' | 'update' | null = null;
      const query = {
        select: () => {
          operation = 'select';
          return query;
        },
        update: () => {
          operation = 'update';
          state.writes.push(table);
          return query;
        },
        eq: () => query,
        order: () => query,
        then: (
          resolve: (value: unknown) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => {
          if (state.thrownError) {
            return Promise.reject(state.thrownError).then(resolve, reject);
          }
          const result = operation === 'select'
            ? table === 'challenges'
              ? { data: null, error: state.challengeReadError }
              : { data: state.topicsReadError ? null : state.existingTopics, error: state.topicsReadError }
            : { error: table === 'modules' ? state.moduleUpdateError : state.topicUpdateError };
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return query;
    },
  }),
}));

describe('module curriculum import action', () => {
  beforeEach(() => {
    state.existingTopics = [{ id: 5, title: 'Introduction' }];
    state.topicsReadError = null;
    state.topicUpdateError = null;
    state.moduleUpdateError = null;
    state.challengeReadError = null;
    state.writes = [];
    state.thrownError = null;
  });

  const payload = {
    topics: [{
      topic_title: 'Introduction',
      topic_order: 1,
      nodes: [{
        node_id: 'node-1',
        order: 0,
        type: 'lesson',
        title: 'First lesson',
        content: 'Lesson content',
      }],
    }],
  };

  it('returns a database read error instead of continuing with inserts', async () => {
    state.topicsReadError = { message: 'database unavailable' };

    await expect(importCurriculumJsonForModule(23, payload)).resolves.toEqual({
      success: false,
      error: 'Gagal membaca topik modul: database unavailable',
    });
  });

  it('preflights challenge reads before writing module assessment or topic changes', async () => {
    state.challengeReadError = { message: 'challenge table unavailable' };
    const topicWithChallenge = {
      ...payload.topics[0],
      challenge: { title: 'New challenge', instructions: 'Submit work', submission_type: 'link' as const },
    };
    const result = await importCurriculumJsonForModule(23, {
      ...payload,
      final_assessment: {
        title: 'Tryout',
        duration_minutes: 30,
        questions: Array.from({ length: 20 }, (_, index) => ({
          id: index + 1,
          question: `Question ${index + 1}`,
          options: ['A', 'B', 'C', 'D'],
          answer_index: 0,
          explanation: 'A',
        })),
      },
      topics: [topicWithChallenge],
    });

    expect(result).toEqual({ success: false, error: 'Gagal membaca challenge topik "Introduction": challenge table unavailable' });
    expect(state.writes).toEqual([]);
  });

  it('returns a database update error instead of reporting a successful import', async () => {
    state.topicUpdateError = { message: 'update rejected' };
    const result = await importCurriculumJsonForModule(23, payload);

    expect(result).toMatchObject({
      success: false,
      error: expect.stringContaining('Gagal memperbarui topik "Introduction": update rejected'),
    });
    if (!result.success) expect(result.error).toContain('perubahan parsial mungkin sudah tersimpan');
  });

  it('reports partial-write risk when the module assessment update fails before topic writes', async () => {
    state.moduleUpdateError = { message: 'assessment update rejected' };
    const finalAssessment = {
      title: 'Tryout',
      duration_minutes: 30,
      questions: Array.from({ length: 20 }, (_, index) => ({
        id: index + 1,
        question: `Question ${index + 1}`,
        options: ['A', 'B', 'C', 'D'],
        answer_index: 0,
        explanation: 'A',
      })),
    };

    const result = await importCurriculumJsonForModule(23, { ...payload, final_assessment: finalAssessment });
    expect(result).toMatchObject({ success: false });
    if (!result.success) {
      expect(result.error).toContain('Gagal memperbarui tryout modul: assessment update rejected');
      expect(result.error).toContain('perubahan parsial mungkin sudah tersimpan');
    }
    expect(state.writes).toEqual(['modules']);
  });

  it('logs and returns an error when the database request throws', async () => {
    state.thrownError = new Error('connection reset');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(importCurriculumJsonForModule(23, payload)).resolves.toEqual({
      success: false,
      error: 'Import gagal saat membaca data sebelum menyimpan: connection reset',
    });
    expect(errorSpy).toHaveBeenCalledWith('[importCurriculumJsonForModule] Import failed', {
      moduleId: 23,
      error: 'connection reset',
    });

    errorSpy.mockRestore();
  });
});
