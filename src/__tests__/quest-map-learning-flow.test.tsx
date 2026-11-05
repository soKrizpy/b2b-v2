import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestMapClient } from '@/app/student/lessons/QuestMapClient';
import type { QuestMapData, QuestTopicNode } from '@/features/quiz/questMapQueries';

const state = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: state.push, refresh: vi.fn() }),
}));
vi.mock('@/features/quiz/components/RetroPixelWorldMap', () => ({
  RetroPixelWorldMap: ({ nodes, onSelectNode }: { nodes: QuestTopicNode[]; onSelectNode: (node: QuestTopicNode) => void }) => (
    <div>
      {nodes.map((node) => (
        <button key={node.topic.id} type="button" onClick={() => onSelectNode(node)}>
          Open {node.topic.title}
        </button>
      ))}
    </div>
  ),
}));
vi.mock('@/features/quiz/components/SimplifiedWaypointHistory', () => ({ SimplifiedWaypointHistory: () => null }));
vi.mock('@/features/quiz/components/QuizModal', () => ({ QuizModal: () => null }));
vi.mock('@/features/dashboard/student/LevelUpCelebrationModal', () => ({ LevelUpCelebrationModal: () => null }));

function makeNode(status: QuestTopicNode['status']): QuestTopicNode {
  return {
    topic: {
      id: 12,
      title: 'Topik pertama',
      description: 'Materi sumber',
      module_id: 5,
      order_index: 0,
      status: 'published',
      lesson_content: { learningPath: [] },
    } as unknown as QuestTopicNode['topic'],
    status,
    hasQuiz: true,
    attemptsUsed: 0,
    bestScore: 0,
    stars: 0,
    sessionNumber: 1,
    isSessionReportSubmitted: false,
    quizUnlocked: false,
    isUnlocked: status !== 'LOCKED',
  };
}

function renderMap(status: QuestTopicNode['status']) {
  const node = makeNode(status);
  const questData = {
    mod: { id: 5, title: 'Modul petualangan', level: '1', topics: [node.topic] },
    nodes: [node],
    moduleComplete: false,
    hasFinal: false,
    needsQuizTopics: [],
  } as unknown as QuestMapData;
  return render(<QuestMapClient questData={questData} cert={null} allModules={[]} />);
}

describe('Quest Map learning entry', () => {
  beforeEach(() => state.push.mockClear());

  it.each(['ACTIVE_NEXT', 'NEEDS_QUIZ', 'COMPLETED'] as const)(
    'opens the full topic learning route directly for %s nodes',
    (status) => {
      renderMap(status);

      fireEvent.click(screen.getByRole('button', { name: 'Open Topik pertama' }));

      expect(state.push).toHaveBeenCalledWith('/student/lessons/topic/12');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    }
  );

  it('keeps locked nodes on the map and does not route around the meeting gate', () => {
    renderMap('LOCKED');

    fireEvent.click(screen.getByRole('button', { name: 'Open Topik pertama' }));

    expect(state.push).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
