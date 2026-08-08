interface RectangleLike {
  x: number
  y: number
  width: number
  height: number
}

interface Size {
  width: number
  height: number
}

const GAP = 8

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function getTrayPopoverPosition(
  trayBounds: RectangleLike,
  workArea: RectangleLike,
  windowSize: Size
): { x: number; y: number } {
  const maxX = workArea.x + workArea.width - windowSize.width
  const maxY = workArea.y + workArea.height - windowSize.height
  const centeredX = trayBounds.x + trayBounds.width / 2 - windowSize.width / 2
  const fitsAbove = trayBounds.y - GAP - windowSize.height >= workArea.y
  const preferredY = fitsAbove
    ? trayBounds.y - GAP - windowSize.height
    : trayBounds.y + trayBounds.height + GAP

  return {
    x: Math.round(clamp(centeredX, workArea.x, maxX)),
    y: Math.round(clamp(preferredY, workArea.y, maxY))
  }
}
