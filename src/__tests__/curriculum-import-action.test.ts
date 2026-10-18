import { beforeEach, describe, expect, it, vi } from 'vitest';
import { importCurriculumJsonForModule } from '@/features/curriculum/actions';

const state = vi.hoisted(() => ({
  existingTopics: [{ id: 5, title: 'Introduction' }],
  topicsReadError: null as { message: string } | null,
  topicUpdateError: null as { message: string } | null,
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
    from: () => {
      let operation: 'select' | 'update' | null = null;
      const query = {
        select: () => {
          operation = 'select';
          return query;
        },
        update: () => {
          operation = 'update';
          return query;
        },
        eq: () => query,
        then: (
          resolve: (value: unknown) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => {
          if (state.thrownError) {
            return Promise.reject(state.thrownError).then(resolve, reject);
          }
          const result = operation === 'select'
            ? { data: state.topicsReadError ? null : state.existingTopics, error: state.topicsReadError }
            : { error: state.topicUpdateError };
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

  it('returns a database update error instead of reporting a successful import', async () => {
    state.topicUpdateError = { message: 'update rejected' };

    await expect(importCurriculumJsonForModule(23, payload)).resolves.toEqual({
      success: false,
      error: 'Gagal memperbarui topik "Introduction": update rejected',
    });
  });

  it('logs and returns an error when the database request throws', async () => {
    state.thrownError = new Error('connection reset');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(importCurriculumJsonForModule(23, payload)).resolves.toEqual({
      success: false,
      error: 'Import gagal saat menyimpan kurikulum: connection reset. Sebagian perubahan mungkin sudah tersimpan.',
    });
    expect(errorSpy).toHaveBeenCalledWith('[importCurriculumJsonForModule] Import failed', {
      moduleId: 23,
      error: 'connection reset',
    });

    errorSpy.mockRestore();
  });
});
