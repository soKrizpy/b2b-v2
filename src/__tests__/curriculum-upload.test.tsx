import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ModuleBuilderClient } from '@/app/admin/curriculum/[moduleId]/ModuleBuilderClient';
import type { ModuleWithTopics } from '@/features/curriculum/queries';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('@/features/curriculum/actions', () => ({
  exportCurriculumJson: vi.fn(),
  importCurriculumJsonForModule: vi.fn(),
  deleteTopic: vi.fn(),
  updateTopicAction: vi.fn(),
}));

vi.mock('@/features/ai/components/AiCurriculumGenerator', () => ({
  AiCurriculumGenerator: () => null,
}));

describe('module curriculum file upload', () => {
  it('opens the file picker from the module import dialog', () => {
    const moduleData = {
      id: 7,
      title: 'Scratch',
      topics: [],
    } as ModuleWithTopics;

    render(<ModuleBuilderClient module={moduleData} />);
    fireEvent.click(screen.getByRole('button', { name: 'Import JSON Materi' }));

    const fileInput = document.getElementById('builder-file-input') as HTMLInputElement;
    const clickFileInput = vi.spyOn(fileInput, 'click');

    fireEvent.click(screen.getByRole('button', { name: /Pilih File \.json/ }));

    expect(clickFileInput).toHaveBeenCalledOnce();
  });
});
