import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { getMapPinCoordinates, getScratchLearningStage, getScratchMapTheme, PIXEL_MAP_VIEWBOX, SCRATCH_LEARNING_STAGES } from '@/features/quiz/scratchMapConfig';
import { ScratchPixelMapScene } from '@/features/quiz/components/ScratchPixelMapScene';

describe('Scratch map module, stage, and local topic mapping', () => {
  it('selects a biome from the selected Scratch module level only', () => {
    expect(getScratchMapTheme('Scratch Beginner', 'beginner')).toBe('beginner');
    expect(getScratchMapTheme('Scratch Intermediate', 'intermediate')).toBe('intermediate');
    expect(getScratchMapTheme('Scratch Advanced', 'advanced')).toBe('advanced');
    expect(getScratchMapTheme('Python Fundamentals', 'beginner')).toBeNull();
    expect(getScratchMapTheme('Scratch Advanced', 'advanced module')).toBeNull();
  });

  it('groups current topic sequence by source progression rather than an even split', () => {
    expect(SCRATCH_LEARNING_STAGES.map((stage) => [stage.fromTopic, stage.toTopic])).toEqual([[1, 4], [5, 7], [8, 12]]);
    expect(getScratchLearningStage(1).label).toBe('Pemula');
    expect(getScratchLearningStage(5).label).toBe('Paham');
    expect(getScratchLearningStage(8).label).toBe('Siap Menuju Modul Berikutnya');
    expect(getScratchLearningStage(10).label).toBe('Siap Menuju Modul Berikutnya');
  });

  it('uses a consistent winding coordinate system and local 1-12 ordinals', () => {
    const twelvePositions = Array.from({ length: 12 }, (_, index) => getMapPinCoordinates(index, 12));
    expect(twelvePositions).toHaveLength(12);
    expect(new Set(twelvePositions.map(({ x, y }) => `${x}:${y}`)).size).toBe(12);
    expect(twelvePositions[0]).toEqual({ x: 14, y: 80 });
    expect(twelvePositions[11]).toEqual({ x: 80, y: 26 });
    expect(PIXEL_MAP_VIEWBOX).toBe('0 0 1200 675');
  });

  it('renders three distinct crisp pixel biomes in the same 16:9 SVG frame', () => {
    const scenes = (['beginner', 'intermediate', 'advanced'] as const).map((theme) => {
      const { container, unmount } = render(<ScratchPixelMapScene theme={theme} />);
      const scene = container.querySelector('svg');
      const result = {
        theme: scene?.getAttribute('data-scratch-map-theme'),
        viewBox: scene?.getAttribute('viewBox'),
        preserve: scene?.getAttribute('preserveAspectRatio'),
        firstTerrainColor: scene?.querySelector('rect')?.getAttribute('fill'),
      };
      unmount();
      return result;
    });

    expect(scenes.map((scene) => scene.theme)).toEqual(['beginner', 'intermediate', 'advanced']);
    expect(scenes.map((scene) => scene.viewBox)).toEqual(Array(3).fill(PIXEL_MAP_VIEWBOX));
    expect(scenes.map((scene) => scene.preserve)).toEqual(Array(3).fill('none'));
    expect(new Set(scenes.map((scene) => scene.firstTerrainColor)).size).toBe(3);
  });
});
