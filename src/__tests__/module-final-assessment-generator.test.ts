import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateModuleFinalAssessment } from '@/features/ai/actions';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { generateContentWithFallback, hasGeminiApiKey } from '@/features/ai/gemini';
import { revalidatePath } from 'next/cache';

vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(),
  getAuthUser: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock('@/features/ai/gemini', () => ({
  ai: {},
  GEMINI_FLASH_MODEL: 'test-model',
  FALLBACK_GEMINI_MODELS: [],
  hasGeminiApiKey: vi.fn(),
  generateContentWithFallback: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const assessment = {
  title: 'Ujian Akhir Scratch',
  duration_minutes: 40,
  questions: Array.from({ length: 20 }, (_, index) => ({
    id: index + 1,
    question: `Pertanyaan ${index + 1}`,
    options: ['A', 'B', 'C', 'D'],
    answer_index: index % 4,
    explanation: 'Penjelasan jawaban benar.',
  })),
};

function query(result: unknown) {
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.order = () => chain;
  chain.update = () => chain;
  chain.maybeSingle = () => Promise.resolve(result);
  chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

function configureDatabase(topics: unknown[] = [{
  id: 1,
  title: 'Pengenalan Scratch',
  description: 'Konsep sprite dan event.',
  status: 'published',
  order_index: 0,
  lesson_content: {
    learningPath: [{ title: 'Mengenal sprite', content: 'Sprite adalah objek.' }],
    quiz: [{ question: 'Apa itu sprite?' }],
  },
}]) {
  const moduleRead = query({
    data: { id: 7, title: 'Scratch Beginner', description: 'Deskripsi modul lama' },
    error: null,
  });
  const topicRead = query({ data: topics, error: null });
  const moduleUpdate = query({ data: null, error: null });
  let moduleCalls = 0;

  vi.mocked(createSupabaseAdminClient).mockReturnValue({
    from: (table: string) => {
      if (table === 'topics') return topicRead;
      moduleCalls += 1;
      return moduleCalls === 1 ? moduleRead : moduleUpdate;
    },
  } as never);

  return { moduleUpdate };
}

describe('generateModuleFinalAssessment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ ok: true, role: 'admin' } as never);
    vi.mocked(hasGeminiApiKey).mockReturnValue(true);
    configureDatabase();
  });

  it('generates, validates, and saves exactly 20 questions from published topics', async () => {
    vi.mocked(generateContentWithFallback).mockResolvedValue(JSON.stringify(assessment));

    const result = await generateModuleFinalAssessment(7);

    expect(result).toEqual({
      success: true,
      data: { topicCount: 1, questionCount: 20 },
    });
    expect(generateContentWithFallback).toHaveBeenCalledTimes(1);
    expect(vi.mocked(createSupabaseAdminClient).mock.results[0].value).toBeDefined();
    expect(revalidatePath).toHaveBeenCalledWith('/student/lessons', 'layout');
  });

  it('rejects Gemini output that does not contain exactly 20 questions', async () => {
    vi.mocked(generateContentWithFallback).mockResolvedValue(JSON.stringify({
      ...assessment,
      questions: assessment.questions.slice(0, 19),
    }));

    const result = await generateModuleFinalAssessment(7);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('tepat 20 soal');
  });

  it('does not call Gemini when the module has no published topics', async () => {
    configureDatabase([]);
    const result = await generateModuleFinalAssessment(7);

    expect(result.success).toBe(false);
    expect(generateContentWithFallback).not.toHaveBeenCalled();
  });

  it('rejects non-admin callers before reading module data', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: false, message: 'Akses ditolak.' } as never);

    const result = await generateModuleFinalAssessment(7);

    expect(result).toEqual({ success: false, error: 'Akses ditolak.' });
    expect(createSupabaseAdminClient).not.toHaveBeenCalled();
  });
});
