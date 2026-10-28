export interface TooltipPoint {
  x: number;
  y: number;
}

export interface TooltipBounds {
  width: number;
  height: number;
}

export interface TooltipSize {
  width: number;
  height: number;
}

/** Positions a hover tooltip near its cursor while keeping it inside its containing map. */
export function getTooltipPosition(
  cursor: TooltipPoint,
  bounds: TooltipBounds,
  tooltip: TooltipSize = { width: 270, height: 160 },
  gap = 16,
  padding = 16,
): TooltipPoint {
  const width = Math.min(tooltip.width, Math.max(0, bounds.width - padding * 2));
  const height = Math.min(tooltip.height, Math.max(0, bounds.height - padding * 2));

  let x = cursor.x + gap;
  if (x + width > bounds.width - padding) x = cursor.x - width - gap;
  x = Math.max(padding, Math.min(x, bounds.width - width - padding));

  let y = cursor.y + gap;
  if (y + height > bounds.height - padding) y = cursor.y - height - gap;
  y = Math.max(padding, Math.min(y, bounds.height - height - padding));

  return { x, y };
}
