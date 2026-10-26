import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { extractFinalAssessment } from '@/features/curriculum/validation';
import { submitFinalAssessment } from '@/features/quiz/actions';
import AssessmentPage from '@/app/student/assessment/[moduleId]/page';

const state = vi.hoisted(() => ({
  description: null as string | null,
  jsonbAssessment: null as unknown,
  moduleComplete: true,
  certificates: [] as Array<Record<string, unknown>>,
  selectedColumns: [] as string[],
  certificateCountReads: 0,
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: async () => ({ ok: true, role: 'student', user: { id: 'synthetic-student' } }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('notFound'); },
  redirect: (path: string) => { throw new Error(`redirect:${path}`); },
}));
vi.mock('next/link', () => ({ default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock('@/app/student/assessment/[moduleId]/TryoutClient', () => ({
  TryoutClient: ({ assessment }: { assessment: { questions: Array<{ question: string }> } }) =>
    <div data-testid="tryout-client">{assessment.questions[0]?.question}</div>,
}));
vi.mock('@/features/curriculum/queries', () => ({
  getStudentModulesWithTopics: async () => [{ id: 7, topics: [{ id: 11 }] }],
}));
vi.mock('@/features/quiz/questMapQueries', () => ({
  getQuestMapData: async () => ({ moduleComplete: state.moduleComplete }),
}));
vi.mock('@/features/certificates/queries', () => ({
  getCertificateByModuleAndStudent: async () => null,
  TIER_CONFIG: {
    excellent: { medal: '🏆', label: 'Excellent', description: '', scoreRange: '86–100' },
    achievement: { medal: '🥈', label: 'Achievement', description: '', scoreRange: '75–85' },
    completion: { medal: '🎖️', label: 'Participant', description: '', scoreRange: '<75' },
  },
}));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      let operation = 'select';
      let columns = '';
      let values: Record<string, unknown> | null = null;
      let headCount = false;
      const query: Record<string, unknown> = {
        select: (selection: string, options?: { head?: boolean }) => {
          columns = selection;
          if (table === 'certificates' && options?.head) headCount = true;
          state.selectedColumns.push(`${table}:${selection}`);
          return query;
        },
        insert: (input: Record<string, unknown>) => { operation = 'insert'; values = input; return query; },
        eq: () => query,
        maybeSingle: async () => {
          if (table === 'student_modules') return { data: { module_id: 7 }, error: null };
          if (table === 'modules') {
            const source = { id: 7, title: 'Synthetic module', description: state.description, final_assessment: state.jsonbAssessment };
            const projected = Object.fromEntries(columns.split(',').map((column) => [column.trim(), source[column.trim() as keyof typeof source]]));
            return { data: projected, error: null };
          }
          if (table === 'certificates') return { data: null, error: null };
          return { data: null, error: null };
        },
        then: (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) => {
          if (table === 'certificates' && operation === 'insert') {
            state.certificates.push(values ?? {});
            return Promise.resolve({ error: null }).then(resolve, reject);
          }
          if (table === 'certificates' && headCount) state.certificateCountReads++;
          return Promise.resolve({ count: state.certificates.length, data: null, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  }),
}));

const makeAssessment = (title: string, answerIndex = 0) => ({
  title,
  duration_minutes: 20,
  questions: Array.from({ length: 20 }, (_, index) => ({
    id: index + 1,
    question: `${title} question ${index + 1}`,
    options: ['A', 'B', 'C', 'D'],
    answer_index: answerIndex,
    explanation: 'Synthetic test explanation',
  })),
});

const makeFormData = (chosenIndices: number[] = Array(20).fill(0)) => {
  const formData = new FormData();
  formData.set('module_id', '7');
  formData.set('answers', JSON.stringify(Array.from({ length: 20 }, (_, index) => ({
    question_id: index + 1,
    chosen_index: chosenIndices[index] ?? 0,
  }))));
  return formData;
};

describe('final assessment storage contract', () => {
  beforeEach(() => {
    state.description = null;
    state.jsonbAssessment = null;
    state.moduleComplete = true;
    state.certificates = [];
    state.selectedColumns = [];
    state.certificateCountReads = 0;
  });

  it('reads the marker on the student assessment page and in submission', async () => {
    const markerAssessment = makeAssessment('Marker assessment');
    state.description = `FINAL_ASSESSMENT:${JSON.stringify(markerAssessment)}`;

    render(await AssessmentPage({ params: Promise.resolve({ moduleId: '7' }) }));
    expect(screen.getByRole('heading', { name: 'Marker assessment' })).toBeTruthy();
    expect(screen.getByTestId('tryout-client').textContent).toContain('Marker assessment question 1');

    const result = await submitFinalAssessment(null, makeFormData());
    expect(result).toMatchObject({ success: true, score: 100, tier: 'excellent' });
    expect(state.certificates).toHaveLength(1);
    expect(state.certificates[0]).toMatchObject({ score: 100, tier: 'excellent' });
  });

  it('requires exactly 20 submitted answers before reaching certificate logic', async () => {
    state.description = `FINAL_ASSESSMENT:${JSON.stringify(makeAssessment('Exactly twenty'))}`;
    const formData = makeFormData();
    const nineteenAnswers = Array.from({ length: 19 }, (_, index) => ({
      question_id: index + 1,
      chosen_index: 0,
    }));
    formData.set('answers', JSON.stringify(nineteenAnswers));

    const result = await submitFinalAssessment(null, formData);
    expect(result).toEqual({ success: false, error: 'Harus menjawab semua 20 soal' });
    expect(state.certificates).toEqual([]);
    expect(state.selectedColumns).toEqual([]);
  });

  it('issues a Participant certificate when the score is below 75', async () => {
    state.description = `FINAL_ASSESSMENT:${JSON.stringify(makeAssessment('Participant assessment', 1))}`;

    const result = await submitFinalAssessment(null, makeFormData());

    expect(result).toMatchObject({ success: true, score: 0, tier: 'completion' });
    expect(result).toMatchObject({ message: expect.stringContaining('Participant Certificate') });
    expect(state.certificates).toHaveLength(1);
    expect(state.certificates[0]).toMatchObject({ score: 0, tier: 'completion' });
  });

  it('classifies a score of 85 as Achievement at the upper boundary', async () => {
    state.description = `FINAL_ASSESSMENT:${JSON.stringify(makeAssessment('Achievement boundary'))}`;
    const answers = Array.from({ length: 20 }, (_, index) => index < 17 ? 0 : 1);

    const result = await submitFinalAssessment(null, makeFormData(answers));

    expect(result).toMatchObject({ success: true, score: 85, tier: 'achievement' });
    expect(state.certificates[0]).toMatchObject({ score: 85, tier: 'achievement' });
  });

  it('does not read JSONB-only assessment in the current student page or submit action', async () => {
    state.jsonbAssessment = makeAssessment('JSONB-only assessment');

    render(await AssessmentPage({ params: Promise.resolve({ moduleId: '7' }) }));
    expect(screen.getByText('Modul ini belum memiliki soal tryout.')).toBeTruthy();
    expect(state.selectedColumns).toContain('modules:id, title, description');
    expect(state.selectedColumns).not.toContain('modules:description, final_assessment');

    const result = await submitFinalAssessment(null, makeFormData());
    expect(result).toEqual({ success: false, error: 'Modul ini belum memiliki soal tryout.' });
    expect(state.certificates).toEqual([]);
    expect(state.certificateCountReads).toBe(0);

    // The shared parser itself accepts valid structured JSONB, but current page/action callers do not pass it.
    expect(extractFinalAssessment(null, state.jsonbAssessment)).toEqual(state.jsonbAssessment);
  });

  it('rejects a malformed marker consistently in the student page and submit action', async () => {
    state.description = 'FINAL_ASSESSMENT:{not valid json';

    render(await AssessmentPage({ params: Promise.resolve({ moduleId: '7' }) }));
    expect(screen.getByText('Modul ini belum memiliki soal tryout.')).toBeTruthy();

    const result = await submitFinalAssessment(null, makeFormData());
    expect(result).toEqual({ success: false, error: 'Modul ini belum memiliki soal tryout.' });
    expect(state.certificates).toEqual([]);
    expect(state.certificateCountReads).toBe(0);
  });

  it('uses the description marker in current page and action when marker and JSONB conflict', async () => {
    const markerAssessment = makeAssessment('Marker wins in current callers', 0);
    state.description = `FINAL_ASSESSMENT:${JSON.stringify(markerAssessment)}`;
    state.jsonbAssessment = makeAssessment('Structured JSONB alternative', 1);

    render(await AssessmentPage({ params: Promise.resolve({ moduleId: '7' }) }));
    expect(screen.getByRole('heading', { name: 'Marker wins in current callers' })).toBeTruthy();

    const result = await submitFinalAssessment(null, makeFormData());
    expect(result).toMatchObject({ success: true, score: 100 });
    expect(state.certificates[0]).toMatchObject({ score: 100, tier: 'excellent' });

    // The helper's explicit structured argument instead prefers valid JSONB.
    expect(extractFinalAssessment(state.description, state.jsonbAssessment)?.title).toBe('Structured JSONB alternative');
  });

  it('rejects submission before all published topics are complete without issuing a certificate', async () => {
    state.description = `FINAL_ASSESSMENT:${JSON.stringify(makeAssessment('Locked assessment'))}`;
    state.moduleComplete = false;

    const result = await submitFinalAssessment(null, makeFormData());
    expect(result).toEqual({
      success: false,
      error: 'Selesaikan semua topik modul terlebih dahulu sebelum mengikuti ujian akhir.',
    });
    expect(state.certificates).toEqual([]);
    expect(state.certificateCountReads).toBe(0);
  });
});
