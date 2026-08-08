import { describe, expect, it } from 'vitest'
import { getTrayPopoverPosition } from '../tray-position'

describe('getTrayPopoverPosition', () => {
  it('places the popover above a bottom taskbar and clamps it to the display', () => {
    expect(getTrayPopoverPosition(
      { x: 1910, y: 1040, width: 24, height: 24 },
      { x: 0, y: 0, width: 1920, height: 1040 },
      { width: 400, height: 560 }
    )).toEqual({ x: 1520, y: 472 })
  })

  it('places the popover below a top menu bar', () => {
    expect(getTrayPopoverPosition(
      { x: 900, y: 0, width: 24, height: 24 },
      { x: 0, y: 0, width: 1920, height: 1080 },
      { width: 400, height: 560 }
    )).toEqual({ x: 712, y: 32 })
  })

  it('supports displays with negative coordinates', () => {
    expect(getTrayPopoverPosition(
      { x: -1900, y: 1020, width: 24, height: 24 },
      { x: -1920, y: 0, width: 1920, height: 1040 },
      { width: 400, height: 560 }
    )).toEqual({ x: -1920, y: 452 })
  })
})
