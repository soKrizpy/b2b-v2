export type ScratchMapTheme = 'beginner' | 'intermediate' | 'advanced';

export const PIXEL_MAP_VIEWBOX = '0 0 1200 675';
export const MAP_GUIDE_PATH = [
  { x: 14, y: 80 }, { x: 19, y: 85 }, { x: 25, y: 74 }, { x: 22, y: 60 },
  { x: 24, y: 48 }, { x: 27, y: 38 }, { x: 20, y: 32 }, { x: 15, y: 34 },
  { x: 24, y: 22 }, { x: 32, y: 24 }, { x: 38, y: 24 }, { x: 41, y: 32 },
  { x: 46, y: 35 }, { x: 53, y: 44 }, { x: 55, y: 48 }, { x: 60, y: 37 },
  { x: 48, y: 56 }, { x: 62, y: 53 }, { x: 58, y: 63 }, { x: 48, y: 64 },
  { x: 68, y: 67 }, { x: 72, y: 74 }, { x: 66, y: 82 }, { x: 75, y: 84 },
  { x: 80, y: 78 }, { x: 85, y: 68 }, { x: 88, y: 76 }, { x: 76, y: 42 },
  { x: 74, y: 32 }, { x: 80, y: 26 },
] as const;

export function getMapPinCoordinates(index: number, total: number) {
  if (total <= 1) return MAP_GUIDE_PATH[0];

  const t = Math.min(1, Math.max(0, index / Math.max(1, total - 1)));
  const numSegments = MAP_GUIDE_PATH.length - 1;
  const rawIdx = t * numSegments;
  const segIdx = Math.min(numSegments - 1, Math.floor(rawIdx));
  const segT = rawIdx - segIdx;
  const p0 = MAP_GUIDE_PATH[segIdx];
  const p1 = MAP_GUIDE_PATH[segIdx + 1];

  return {
    x: Math.round((p0.x + (p1.x - p0.x) * segT) * 10) / 10,
    y: Math.round((p0.y + (p1.y - p0.y) * segT) * 10) / 10,
  };
}

export interface ScratchLearningStage {
  label: 'Pemula' | 'Paham' | 'Siap Menuju Modul Berikutnya';
  fromTopic: number;
  toTopic: number;
}

/**
 * The repository currently has one Scratch module, marked beginner. Keep the
 * other biome variants available for matching Scratch modules as they are
 * authored; never classify unrelated beginner modules as Scratch.
 */
export function getScratchMapTheme(moduleTitle: string, moduleLevel?: string | null): ScratchMapTheme | null {
  if (!/^scratch\b/i.test(moduleTitle.trim()) || !moduleLevel) return null;
  const level = moduleLevel.trim().toLowerCase();
  return level === 'beginner' || level === 'intermediate' || level === 'advanced'
    ? level
    : null;
}

/**
 * Proposed sequence grouping from the authored Scratch topic order:
 * topics 1-4 introduce sprite control/flow, 5-7 combine variables/events,
 * and 8-12 build and polish the integrated game. This is a progress label,
 * not a claim that the source currently declares difficulty levels.
 */
export const SCRATCH_LEARNING_STAGES: readonly ScratchLearningStage[] = [
  { label: 'Pemula', fromTopic: 1, toTopic: 4 },
  { label: 'Paham', fromTopic: 5, toTopic: 7 },
  { label: 'Siap Menuju Modul Berikutnya', fromTopic: 8, toTopic: 12 },
];

export function getScratchLearningStage(topicNumber: number): ScratchLearningStage {
  return SCRATCH_LEARNING_STAGES.find((stage) => topicNumber <= stage.toTopic)
    ?? SCRATCH_LEARNING_STAGES[SCRATCH_LEARNING_STAGES.length - 1];
}
