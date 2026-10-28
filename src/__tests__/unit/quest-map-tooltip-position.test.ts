import { describe, expect, it } from 'vitest';
import { getTooltipPosition } from '@/features/quiz/tooltipPosition';

describe('Quest Map hover tooltip positioning', () => {
  it('keeps the tooltip close to a cursor in open space', () => {
    expect(getTooltipPosition({ x: 400, y: 200 }, { width: 1000, height: 600 }))
      .toEqual({ x: 416, y: 216 });
  });

  it('flips left and above when the cursor is near the lower-right edge', () => {
    expect(getTooltipPosition({ x: 950, y: 560 }, { width: 1000, height: 600 }))
      .toEqual({ x: 664, y: 384 });
  });

  it('keeps a tooltip inside the map near the upper-left edge', () => {
    expect(getTooltipPosition({ x: 0, y: 0 }, { width: 1000, height: 600 }))
      .toEqual({ x: 16, y: 16 });
  });

  it('clamps tooltip coordinates on a small map canvas', () => {
    const position = getTooltipPosition({ x: 190, y: 110 }, { width: 200, height: 120 });
    expect(position).toEqual({ x: 16, y: 16 });
  });
});
