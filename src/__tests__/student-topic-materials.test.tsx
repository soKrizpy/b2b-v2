import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TopicPage from '@/app/student/lessons/topic/[topicId]/page';

const state = vi.hoisted(() => ({
  challengeReads: 0,
  isUnlocked: true,
  challenges: [] as Array<{ id: number; title: string; instructions: string | null; submission: null }>,
  lessonContent: { learningPath: [{ id: 'lesson-1', type: 'lesson', title: 'Konsep awal', explanation: 'Materi tetap terlihat.' }] } as Record<string, unknown>,
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: async () => ({ ok: true, role: 'student', user: { id: 'student-1' } }),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: { module_id: 5 }, error: null }) }),
          }),
        }),
      }),
    }),
  }),
}));
vi.mock('@/features/curriculum/queries', () => ({
  getTopicById: async () => ({
    id: 12,
    module_id: 5,
    title: 'Topik materi parsial',
    description: null,
    project_link: null,
    status: 'published',
    lesson_content: state.lessonContent,
  }),
  getStudentModulesWithTopics: async () => [{ id: 5, topics: [] }],
}));
vi.mock('@/features/quiz/questMapQueries', () => ({
  getQuestMapData: async () => ({ nodes: [{ topic: { id: 12 }, isUnlocked: state.isUnlocked, status: state.isUnlocked ? 'ACTIVE_NEXT' : 'LOCKED' }] }),
}));
vi.mock('@/features/challenges/queries', () => ({
  getChallengesWithSubmissions: async () => {
    state.challengeReads += 1;
    return state.challenges;
  },
}));
vi.mock('@/features/challenges/components/SubmitChallengeForm', () => ({
  SubmitChallengeForm: ({ challenge }: { challenge: { title: string } }) => <div>{challenge.title}</div>,
}));
vi.mock('@/features/quiz/queries', () => ({
  getTopicQuizState: async () => ({ questions: [], attempts: 0, isUnlocked: false, isLocked: false, bestScore: null }),
}));
vi.mock('@/features/curriculum/components/LessonNodeWalker', () => ({
  LessonNodeWalker: ({ nodes }: { nodes: Array<{ explanation?: string }> }) => <div>{nodes[0]?.explanation}</div>,
}));
vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('notFound'); },
  redirect: () => { throw new Error('redirect'); },
}));
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }));

describe('student topic materials', () => {
  beforeEach(() => {
    state.challengeReads = 0;
    state.isUnlocked = true;
    state.challenges = [{ id: 7, title: 'Challenge dari topik', instructions: 'Kerjakan tugas sumber.', submission: null }];
    state.lessonContent = { learningPath: [{ id: 'lesson-1', type: 'lesson', title: 'Konsep awal', explanation: 'Materi tetap terlihat.' }] };
  });

  it('renders authored materials and available challenges without requiring filler slides', async () => {
    render(await TopicPage({ params: Promise.resolve({ topicId: '12' }) }));

    expect(screen.getByText('Materi tetap terlihat.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Materi memiliki 1 slide instruksional');
    expect(screen.getAllByText('Challenge dari topik')).toHaveLength(2);
    expect(state.challengeReads).toBe(1);
    expect(screen.getByRole('link', { name: /Kembali ke Quest Map/ })).toHaveAttribute('href', '/student/lessons');
  });

  it('blocks a direct topic URL before its assigned meeting starts', async () => {
    state.isUnlocked = false;
    await expect(TopicPage({ params: Promise.resolve({ topicId: '12' }) })).rejects.toThrow('notFound');
    expect(state.challengeReads).toBe(0);
  });

  it.each([
    ['an empty learningPath', { learningPath: [] }],
    ['a missing learningPath', {}],
  ])('shows a clear empty-material status for %s', async (_label, lessonContent) => {
    state.lessonContent = lessonContent;
    state.challenges = [];
    render(await TopicPage({ params: Promise.resolve({ topicId: '12' }) }));

    expect(screen.getByRole('status')).toHaveTextContent('0/10');
    expect(screen.getByRole('status')).toHaveTextContent('Materi topik ini belum memiliki slide instruksional');
    expect(state.challengeReads).toBe(0);
  });
});
