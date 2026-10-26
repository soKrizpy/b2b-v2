import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LessonNodeWalker } from '@/features/curriculum/components/LessonNodeWalker';

describe('LessonNodeWalker navigation and progress', () => {
  it('restores lesson XP and position for the same student and topic after remount', () => {
    const nodes = [
      { id: 'node-a', type: 'lesson', title: 'Langkah pertama', explanation: 'Konsep pertama', xp: 10 },
      { id: 'node-b', type: 'lesson', title: 'Langkah kedua', explanation: 'Konsep kedua', xp: 20 },
    ];
    const key = 'b2b:lesson-progress:v1:student-a:12';
    window.localStorage.setItem(key, JSON.stringify({
      signature: JSON.stringify(nodes),
      completedNodeKeys: ['node-a'],
      currentNodeKey: 'node-b',
      done: false,
    }));

    const firstMount = render(<LessonNodeWalker studentId="student-a" topicId={12} nodes={nodes} />);
    expect(screen.getByRole('heading', { name: 'Langkah kedua' })).toBeInTheDocument();
    expect(screen.getByText('⭐ 10/30 XP')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '← Kembali ke langkah sebelumnya' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut →' }));
    expect(screen.getByText('⭐ 10/30 XP')).toBeInTheDocument();
    firstMount.unmount();

    render(<LessonNodeWalker studentId="student-a" topicId={12} nodes={nodes} />);
    expect(screen.getByRole('heading', { name: 'Langkah kedua' })).toBeInTheDocument();
    expect(screen.getByText('⭐ 10/30 XP')).toBeInTheDocument();
  });

  it('does not restore another student topic progress or erase XP when restarting a review', () => {
    const nodes = [
      { id: 'node-a', type: 'lesson', title: 'Langkah pertama', explanation: 'Konsep pertama', xp: 10 },
      { id: 'node-b', type: 'lesson', title: 'Langkah kedua', explanation: 'Konsep kedua', xp: 20 },
    ];
    window.localStorage.setItem('b2b:lesson-progress:v1:student-a:12', JSON.stringify({
      signature: JSON.stringify(nodes), completedNodeKeys: ['node-a'], currentNodeKey: 'node-b', done: false,
    }));

    render(<LessonNodeWalker studentId="student-b" topicId={12} nodes={nodes} />);
    expect(screen.getByRole('heading', { name: 'Langkah pertama' })).toBeInTheDocument();
    expect(screen.getByText('⭐ 0/30 XP')).toBeInTheDocument();
    cleanup();

    render(<LessonNodeWalker studentId="student-c" topicId={12} nodes={nodes} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut →' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut →' }));
    expect(screen.getByText('⭐ 30/30 XP')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ulangi materi dari awal' }));
    expect(screen.getByRole('heading', { name: 'Langkah pertama' })).toBeInTheDocument();
    expect(screen.getByText('⭐ 30/30 XP')).toBeInTheDocument();
  });

  it('supports backward navigation without awarding the same node XP twice', () => {
    render(
      <LessonNodeWalker
        topicId={12}
        nodes={[
          { type: 'lesson', title: 'Langkah pertama', explanation: 'Konsep pertama', xp: 10 },
          { type: 'lesson', title: 'Langkah kedua', explanation: 'Konsep kedua', xp: 20 },
        ]}
      />
    );

    expect(screen.getByRole('progressbar', { name: 'Progress materi' })).toHaveAttribute('aria-valuenow', '50');
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut →' }));
    expect(screen.getByRole('heading', { name: 'Langkah kedua' })).toBeInTheDocument();
    expect(screen.getByText('⭐ 10/30 XP')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '← Kembali ke langkah sebelumnya' }));
    expect(screen.getByRole('heading', { name: 'Langkah pertama' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut →' }));
    expect(screen.getByText('⭐ 10/30 XP')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Lanjut →' }));
    expect(screen.getByText('Materi Selesai!')).toBeInTheDocument();
    expect(screen.getByText('⭐ 30/30 XP')).toBeInTheDocument();
  });
});
