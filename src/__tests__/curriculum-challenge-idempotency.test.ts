import { beforeEach, describe, expect, it, vi } from 'vitest';
import { importCurriculumJson } from '@/features/curriculum/actions';

type Row = Record<string, unknown>;

const state = vi.hoisted(() => ({
  tables: {
    modules: [] as Row[],
    topics: [] as Row[],
    challenges: [] as Row[],
    challenge_submissions: [] as Row[],
  },
  writes: [] as string[],
  nextId: 1,
}));

vi.mock('@/lib/auth', () => ({ requireAdmin: async () => ({ ok: true }) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock('@/features/curriculum/queries', () => ({ getAllModulesWithTopics: async () => [] }));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (table: keyof typeof state.tables) => {
      let operation: 'select' | 'insert' | 'update' = 'select';
      let values: Row = {};
      const filters: Array<(row: Row) => boolean> = [];
      let single = false;
      const query = {
        select: () => query,
        insert: (input: Row) => { operation = 'insert'; values = input; return query; },
        update: (input: Row) => { operation = 'update'; values = input; return query; },
        eq: (column: string, value: unknown) => { filters.push((row) => row[column] === value); return query; },
        order: (column: string, options?: { ascending?: boolean }) => {
          state.tables[table].sort((a, b) => {
            const av = Number(a[column] ?? 0);
            const bv = Number(b[column] ?? 0);
            return options?.ascending === false ? bv - av : av - bv;
          });
          return query;
        },
        single: () => { single = true; return query; },
        then: (resolve: (value: { data: Row[] | Row | null; error: null }) => unknown) => {
          let rows: Row[];
          if (operation === 'insert') {
            state.writes.push(`${table}:insert`);
            const row = { id: state.nextId++, ...values };
            state.tables[table].push(row);
            rows = [row];
          } else {
            rows = state.tables[table].filter((row) => filters.every((filter) => filter(row)));
            if (operation === 'update') {
              state.writes.push(`${table}:update`);
              rows.forEach((row) => Object.assign(row, values));
            }
          }
          const data = single ? rows[0] ?? null : rows;
          return Promise.resolve(resolve({ data, error: null }));
        },
      };
      return query;
    },
  }),
}));

const challenge = {
  title: 'Challenge tunggal',
  instructions: 'Kirim hasil pekerjaan.',
  submission_type: 'link',
  xp: 35,
};
const payload = [{
  module_title: 'Modul idempoten',
  module_order: 0,
  topics: [{ topic_title: 'Topik idempoten', topic_order: 0, nodes: [], challenge }],
}];

describe('curriculum challenge import idempotency', () => {
  beforeEach(() => {
    Object.values(state.tables).forEach((rows) => { rows.length = 0; });
    state.writes = [];
    state.nextId = 1;
  });

  it('reuses the same challenge row on identical re-import and preserves submissions', async () => {
    await expect(importCurriculumJson(payload)).resolves.toMatchObject({ success: true });
    const firstChallenge = state.tables.challenges[0];
    const submission = {
      id: 800,
      challenge_id: firstChallenge.id,
      student_id: 'student-1',
      submission_url: 'https://example.test/work',
      status: 'approved',
      review_note: 'Tetap tersimpan',
    };
    state.tables.challenge_submissions.push(submission);

    await expect(importCurriculumJson(payload)).resolves.toMatchObject({ success: true });

    expect(state.tables.modules).toHaveLength(1);
    expect(state.tables.topics).toHaveLength(1);
    expect(state.tables.challenges).toHaveLength(1);
    expect(state.tables.challenge_submissions).toEqual([submission]);
  });

  it('rejects duplicate definitions before any write', async () => {
    const duplicatePayload = [{
      ...payload[0],
      topics: [{
        ...payload[0].topics[0],
        challenge: [challenge, { ...challenge, xp: 99 }],
      }],
    }];

    const result = await importCurriculumJson(duplicatePayload);

    expect(result).toMatchObject({ success: false });
    if (!result.success) expect(result.error).toContain('Definisi challenge duplikat');
    expect(state.writes).toEqual([]);
  });

  it('treats challenge: [] as an explicit request to disable challenges without deleting history', async () => {
    await importCurriculumJson(payload);
    const challengeId = state.tables.challenges[0].id;
    state.tables.challenge_submissions.push({ id: 801, challenge_id: challengeId, student_id: 'student-1' });

    const emptyPayload = [{
      ...payload[0],
      topics: [{ ...payload[0].topics[0], challenge: [] }],
    }];
    await expect(importCurriculumJson(emptyPayload)).resolves.toMatchObject({ success: true });

    expect(state.tables.challenges).toHaveLength(1);
    expect(state.tables.challenge_submissions).toHaveLength(1);
    expect(state.tables.topics[0].lesson_content).toMatchObject({ activeChallengeIds: [], challenge: [] });
  });
});
