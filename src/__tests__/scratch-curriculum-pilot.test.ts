import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getInstructionalSlides } from '@/features/curriculum/lessonSlides';
import { curriculumJsonSchema } from '@/features/curriculum/validation';

describe('Scratch curriculum pilot', () => {
  it('validates the 10 authored instructional steps and preserves the existing topic quiz and challenge', () => {
    const file = readFileSync('public/curriculum/scratch-game-development.json', 'utf8');
    const parsedJson: unknown = JSON.parse(file);
    const modules = curriculumJsonSchema.parse(parsedJson);
    const pilot = modules[0].topics[0];

    expect(modules[0].topics).toHaveLength(10);
    expect(pilot.topic_title).toBe('Pengenalan Sprite & Sistem Koordinat X-Y');
    expect(pilot.nodes).toHaveLength(10);
    expect(new Set(pilot.nodes.map((node) => node.node_id)).size).toBe(10);
    expect(pilot.nodes.map((node) => node.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(getInstructionalSlides(pilot.nodes)).toHaveLength(10);
    expect(pilot.nodes.filter((node) => node.type === 'practice')).toHaveLength(4);
    expect(pilot.quiz).toHaveLength(5);
    expect(pilot.challenge).toMatchObject({
      title: 'Misi Navigasi Roket Antariksa',
      submission_type: 'link',
    });

    for (const node of pilot.nodes.filter((item) => item.type === 'practice')) {
      expect(node.options).toHaveLength(4);
      expect(node.options).toContain(node.correct_option);
    }
  });
});
