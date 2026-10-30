import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { curriculumJsonSchema, topicImportSchema } from '@/features/curriculum/validation';
import { exportCurriculumJson, importCurriculumJson, importCurriculumJsonForModule } from '@/features/curriculum/actions';

type WriteRecord = { table: string; operation: string; values: unknown };

const state = vi.hoisted(() => ({
  writes: [] as WriteRecord[],
  appliedWrites: [] as WriteRecord[],
  exportModules: [] as unknown[],
  challengeRows: [] as unknown[],
  failWriteOn: '' as string,
  nextModuleId: 41,
  nextTopicId: 81,
  nextChallengeId: 501,
}));

vi.mock('@/lib/auth', () => ({ requireAdmin: async () => ({ ok: true }) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock('@/features/curriculum/queries', () => ({
  getAllModulesWithTopics: async () => state.exportModules,
}));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      let operation = '';
      let values: unknown;
      const query = {
        select: () => {
          if (!operation) operation = 'select';
          return query;
        },
        insert: (input: unknown) => {
          operation = 'insert';
          values = input;
          state.writes.push({ table, operation, values });
          return query;
        },
        update: (input: unknown) => {
          operation = 'update';
          values = input;
          state.writes.push({ table, operation, values });
          return query;
        },
        eq: () => query,
        in: () => query,
        order: () => query,
        single: () => query,
        then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
          let result: unknown = { data: [], error: null };
          if (operation !== 'select' && state.failWriteOn === `${table}:${operation}`) {
            result = { data: null, error: { message: 'simulated write failure' } };
          }
          else if (operation === 'insert' && table === 'modules') {
            state.appliedWrites.push({ table, operation, values });
            result = { data: { id: state.nextModuleId }, error: null };
          } else if (operation === 'insert' && table === 'topics') {
            state.appliedWrites.push({ table, operation, values });
            result = { data: { id: state.nextTopicId }, error: null };
          } else if (operation === 'insert' && table === 'challenges') {
            state.appliedWrites.push({ table, operation, values });
            result = { data: { id: state.nextChallengeId++ }, error: null };
          } else if (operation === 'select' && table === 'challenges') {
            result = { data: state.challengeRows, error: null };
          } else if (operation === 'insert' || operation === 'update') {
            state.appliedWrites.push({ table, operation, values });
          }
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return query;
    },
  }),
}));

const finalAssessment = {
  title: 'Tryout modul',
  duration_minutes: 20,
  questions: Array.from({ length: 20 }, (_, index) => ({
    id: index + 1,
    question: `Soal ${index + 1}`,
    options: ['A', 'B', 'C', 'D'],
    answer_index: 0,
    explanation: 'Jawaban A',
  })),
};

const lessonNodes = Array.from({ length: 10 }, (_, index) => ({
  node_id: `lesson-${index + 1}`,
  order: index + 3,
  type: 'theory' as const,
  title: `Materi ${index + 1}`,
  content: `Isi materi ${index + 1}`,
}));
const validQuiz = Array.from({ length: 5 }, (_, index) => ({
  question: `Pertanyaan ${index + 1}`,
  options: ['A', 'B', 'C', 'D'],
  answer_index: index % 4,
  explanation: `Penjelasan ${index + 1}`,
}));

describe('curriculum JSON round-trip workflow', () => {
  beforeEach(() => {
    state.writes = [];
    state.appliedWrites = [];
    state.exportModules = [];
    state.challengeRows = [];
    state.failWriteOn = '';
    state.nextModuleId = 41;
    state.nextTopicId = 81;
    state.nextChallengeId = 501;
  });

  it('rejects missing or unknown content before any database write', async () => {
    const invalidPayload = [{
      module_title: 'Modul',
      module_order: 1,
      topics: [{ topic_title: 'Topik', topic_order: 1, nodes: [], slides: ['must not be discarded'] }],
    }];

    expect(curriculumJsonSchema.safeParse(invalidPayload).success).toBe(false);
    await expect(importCurriculumJson(invalidPayload)).resolves.toMatchObject({ success: false });
    expect(state.writes).toEqual([]);
  });

  it('imports every module and topic in a valid global payload', async () => {
    const result = await importCurriculumJson([
      {
        module_title: 'Modul A',
        module_order: 0,
        topics: [
          { topic_title: 'Topik A1', topic_order: 0, nodes: lessonNodes, quiz: validQuiz },
          { topic_title: 'Topik A2', topic_order: 1, nodes: lessonNodes, quiz: validQuiz },
        ],
      },
      {
        module_title: 'Modul B',
        module_order: 1,
        topics: [{ topic_title: 'Topik B1', topic_order: 0, nodes: lessonNodes, quiz: validQuiz }],
      },
    ]);

    expect(result).toMatchObject({ success: true, stats: { modules: 2, topics: 3 } });
    expect(state.appliedWrites.filter((write) => write.table === 'modules')).toHaveLength(2);
    expect(state.appliedWrites.filter((write) => write.table === 'topics')).toHaveLength(3);
  });

  it('rejects a topic with fewer than ten authored nodes instead of inventing filler', async () => {
    const result = await importCurriculumJson([{
      module_title: 'Modul sumber ringkas',
      module_order: 0,
      topics: [{
        topic_title: 'Satu topik dari sumber',
        topic_order: 0,
        nodes: [{ node_id: 'source-1', order: 0, type: 'theory', title: 'Konsep autentik', content: 'Penjelasan yang bersumber.' }],
        quiz: validQuiz,
      }],
    }]);

    expect(result.success).toBe(false);
    expect(state.writes).toEqual([]);
  });

  it('stores lesson, quiz, assessment, and structured challenge payloads without losing authored node order', async () => {
    const payload = [{
      module_title: 'Scratch Dasar',
      module_order: 1,
      final_assessment: finalAssessment,
      topics: [{
        topic_title: 'Gerak Sprite',
        topic_order: 1,
        nodes: lessonNodes,
        quiz: validQuiz,
        challenge: {
          title: 'Buat animasi',
          instructions: 'Kirim tautan project.',
          submission_type: 'link' as const,
          xp: 45,
        },
      }],
    }];

    await expect(importCurriculumJson(payload)).resolves.toMatchObject({
      success: true,
      stats: { modules: 1, topics: 1 },
    });

    const moduleInsert = state.writes.find((write) => write.table === 'modules');
    expect(moduleInsert?.values).toMatchObject({ description: expect.stringContaining('FINAL_ASSESSMENT:') });
    const topicInsert = state.writes.find((write) => write.table === 'topics');
    expect(topicInsert?.values).toMatchObject({
      lesson_content: {
        learningPath: [
          { id: 'lesson-1', order: 3, type: 'lesson', title: 'Materi 1', content: 'Isi materi 1' },
          ...Array.from({ length: 9 }, () => expect.any(Object)),
        ],
        quiz: payload[0].topics[0].quiz,
        challenge: [payload[0].topics[0].challenge],
      },
    });
    expect(state.writes.find((write) => write.table === 'challenges')?.values).toEqual({
      topic_id: 81,
      title: 'Buat animasi',
      instructions: 'Kirim tautan project.',
      order_index: 0,
      allows_file_upload: false,
    });
    expect((topicInsert?.values as { lesson_content: { learningPath: Array<{ order: number }> } }).lesson_content.learningPath.map((node) => node.order))
      .toEqual(lessonNodes.map((node) => node.order));
  });

  it('exports final assessment, quiz, challenge rows, xp sidecar, and original node ordering', async () => {
    const quiz = [{ question: 'Soal?', options: ['A', 'B', 'C', 'D'], answer_index: 1, explanation: 'B benar' }];
    state.exportModules = [{
      id: 41,
      title: 'Scratch Dasar',
      description: `FINAL_ASSESSMENT:${JSON.stringify(finalAssessment)}`,
      level: 'beginner',
      gamification_type: 'mimo',
      topics: [{
        id: 81,
        title: 'Gerak Sprite',
        order_index: 1,
        description: null,
        project_link: null,
        lesson_content: {
          learningPath: [{ id: 'authored-8', type: 'lesson', title: 'Kedelapan', order: 8, explanation: 'Materi 8' }],
          quiz,
          challenge: [{ xp: 45 }],
        },
      }],
    }];
    state.challengeRows = [{
      id: 501,
      topic_id: 81,
      title: 'Buat animasi',
      instructions: 'Kirim project.',
      order_index: 0,
      allows_file_upload: false,
    }];

    const result = await exportCurriculumJson();
    expect(result.success).toBe(true);
    if (!result.success) return;
    const [module] = result.data as Array<Record<string, unknown>>;
    expect(module.final_assessment).toEqual(finalAssessment);
    const [topic] = module.topics as Array<Record<string, unknown>>;
    expect(topic.quiz).toEqual(quiz);
    expect((topic.nodes as Array<{ order: number }>)[0].order).toBe(8);
    expect(topic.challenge).toEqual({
      title: 'Buat animasi',
      instructions: 'Kirim project.',
      submission_type: 'link',
      xp: 45,
    });
  });

  it('round-trips imported topic materials, quiz, challenge, and final assessment through export', async () => {
    const quiz = validQuiz;
    const challenge = { title: 'Kirim project', instructions: 'Lampirkan tautan.', submission_type: 'link' as const, xp: 55 };
    const importPayload = [{
      module_title: 'Round-trip module',
      module_order: 7,
      final_assessment: finalAssessment,
      topics: [{ topic_title: 'Round-trip topic', topic_order: 4, nodes: lessonNodes, quiz, challenge }],
    }];

    const imported = await importCurriculumJson(importPayload);
    expect(imported.success).toBe(true);

    const importedModule = state.appliedWrites.find((write) => write.table === 'modules')?.values as Record<string, unknown>;
    const topicWrites = state.appliedWrites.filter((write) => write.table === 'topics');
    const importedTopic = Object.assign({}, ...topicWrites.map((write) => write.values)) as Record<string, unknown>;
    const storedChallenge = state.appliedWrites.find((write) => write.table === 'challenges')?.values as Record<string, unknown>;
    state.exportModules = [{
      id: 41,
      ...importedModule,
      topics: [{ id: 81, ...importedTopic }],
    }];
    state.challengeRows = [{ id: 501, ...storedChallenge }];

    const exported = await exportCurriculumJson();
    expect(exported.success).toBe(true);
    if (!exported.success) return;
    const [module] = exported.data as Array<{ final_assessment: unknown; topics: Array<Record<string, unknown>> }>;
    const [topic] = module.topics;
    expect(module.final_assessment).toEqual(finalAssessment);
    expect(topic.topic_title).toBe('Round-trip topic');
    expect(topic.topic_order).toBe(4);
    expect(topic.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ node_id: 'lesson-1', order: 3, content: 'Isi materi 1' }),
    ]));
    expect(topic.quiz).toEqual(quiz);
    expect(topic.challenge).toEqual(challenge);
  });

  it('blocks the legacy Scratch module until every topic meets the 10–20 node rule', async () => {
    const payload: unknown = JSON.parse(readFileSync('public/curriculum/scratch-game-development.json', 'utf8'));
    const [module] = payload as Array<{ topics: unknown[] }>;
    expect(module.topics).toHaveLength(10);
    expect(topicImportSchema.safeParse(module.topics[0]).success).toBe(true);
    expect(module.topics.slice(1).some((topic) => !topicImportSchema.safeParse(topic).success)).toBe(true);

    const result = await importCurriculumJson(payload);
    expect(result.success).toBe(false);
    expect(state.writes).toEqual([]);
  });

  it('rejects multi-module arrays in an import scoped to one module instead of importing only the first', async () => {
    const result = await importCurriculumJsonForModule(41, [
      { topics: [{ topic_title: 'A', topic_order: 0, nodes: [] }] },
      { topics: [{ topic_title: 'B', topic_order: 1, nodes: [] }] },
    ]);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('tidak ada modul yang diabaikan');
    expect(state.writes).toEqual([]);
  });

  it('returns failure when a topic write fails instead of reporting a successful import', async () => {
    state.failWriteOn = 'topics:insert';
    const result = await importCurriculumJson([{
      module_title: 'Modul gagal',
      module_order: 0,
      topics: [{ topic_title: 'Topik gagal', topic_order: 0, nodes: lessonNodes, quiz: validQuiz }],
    }]);
    expect(result).toMatchObject({ success: false });
    if (!result.success) expect(result.error).toContain('parsial mungkin sudah tersimpan');
    expect(state.appliedWrites.map((write) => write.table)).toContain('modules');
    expect(state.appliedWrites.map((write) => write.table)).not.toContain('topics');
    expect(state.writes.map((write) => write.table)).toContain('topics');
  });

  it('stops after a failed module insert and explicitly reports possible commit ambiguity', async () => {
    state.failWriteOn = 'modules:insert';
    const result = await importCurriculumJson([{
      module_title: 'Modul gagal dibuat',
      module_order: 0,
      topics: [{ topic_title: 'Topik tidak ditulis', topic_order: 0, nodes: lessonNodes, quiz: validQuiz }],
    }]);

    expect(result).toMatchObject({ success: false });
    if (!result.success) expect(result.error).toContain('perubahan parsial mungkin sudah tersimpan');
    expect(state.writes.map((write) => `${write.table}:${write.operation}`)).toEqual(['modules:insert']);
    expect(state.appliedWrites).toEqual([]);
  });

  it('reports when a challenge write fails after its module and topic were stored', async () => {
    state.failWriteOn = 'challenges:insert';
    const result = await importCurriculumJson([{
      module_title: 'Modul challenge gagal',
      module_order: 0,
      topics: [{
        topic_title: 'Topik challenge gagal',
        topic_order: 0,
        nodes: lessonNodes,
        quiz: validQuiz,
        challenge: { title: 'Challenge', instructions: 'Kirim link', submission_type: 'link' },
      }],
    }]);

    expect(result).toMatchObject({ success: false });
    if (!result.success) expect(result.error).toContain('parsial mungkin sudah tersimpan');
    expect(state.appliedWrites.map((write) => write.table)).toEqual(['modules', 'topics']);
    expect(state.writes.map((write) => write.table)).toContain('challenges');
  });

  it('reports when the active-challenge sidecar write fails after inserting the replacement challenge', async () => {
    state.failWriteOn = 'topics:update';
    const result = await importCurriculumJson([{
      module_title: 'Modul sidecar gagal',
      module_order: 0,
      topics: [{
        topic_title: 'Topik sidecar gagal',
        topic_order: 0,
        nodes: lessonNodes,
        quiz: validQuiz,
        challenge: { title: 'Challenge', instructions: 'Kirim link', submission_type: 'link' },
      }],
    }]);

    expect(result).toMatchObject({ success: false });
    if (!result.success) expect(result.error).toContain('parsial mungkin sudah tersimpan');
    expect(state.appliedWrites.map((write) => write.table)).toEqual(['modules', 'topics', 'challenges']);
  });

  it('rejects export when a legacy final assessment is malformed instead of silently dropping it', async () => {
    state.exportModules = [{
      id: 41,
      title: 'Modul rusak',
      description: 'FINAL_ASSESSMENT:{"questions":[]}',
      topics: [],
    }];
    const result = await exportCurriculumJson();
    expect(result).toMatchObject({ success: false });
  });

  it('preserves explicit no-active-challenge metadata as challenge: [] on export', async () => {
    state.exportModules = [{
      id: 41,
      title: 'Modul tanpa challenge aktif',
      topics: [{
        id: 81,
        title: 'Topik tanpa challenge aktif',
        order_index: 0,
        lesson_content: {
          learningPath: lessonNodes.map((node) => ({
            id: node.node_id, order: node.order, type: node.type,
            title: node.title, content: node.content,
          })),
          quiz: validQuiz,
          activeChallengeIds: [],
        },
      }],
    }];
    state.challengeRows = [{ id: 501, topic_id: 81, title: 'Challenge lama', instructions: 'Riwayat', allows_file_upload: false }];

    const result = await exportCurriculumJson();

    expect(result.success).toBe(true);
    if (!result.success) return;
    const [module] = result.data as Array<{ topics: Array<Record<string, unknown>> }>;
    expect(module.topics[0].challenge).toEqual([]);
  });

  it('stops export when active-challenge metadata is malformed instead of normalizing it silently', async () => {
    state.exportModules = [{
      id: 41,
      title: 'Modul metadata rusak',
      topics: [{
        id: 81,
        title: 'Topik metadata rusak',
        order_index: 0,
        lesson_content: { learningPath: [], activeChallengeIds: [501, '502'] },
      }],
    }];

    await expect(exportCurriculumJson()).resolves.toMatchObject({ success: false });
  });
});
