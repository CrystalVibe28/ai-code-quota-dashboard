import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const dockMock = vi.hoisted(() => ({
  hide: vi.fn(),
  show: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  isVisible: vi.fn(() => false)
}))

vi.mock('electron', () => ({
  app: { dock: dockMock }
}))

import { hideDockIcon, showDockIcon } from '../dock'

const originalPlatform = process.platform

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { value: platform })
}

describe('dock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dockMock.isVisible.mockReturnValue(false)
  })

  afterEach(() => setPlatform(originalPlatform))

  it('hides and shows the dock icon on macOS', async () => {
    setPlatform('darwin')

    hideDockIcon()
    await showDockIcon()

    expect(dockMock.hide).toHaveBeenCalledTimes(1)
    expect(dockMock.show).toHaveBeenCalledTimes(1)
  })

  it('skips showing when the dock icon is already visible', async () => {
    setPlatform('darwin')
    dockMock.isVisible.mockReturnValue(true)

    await showDockIcon()

    expect(dockMock.show).not.toHaveBeenCalled()
  })

  it('does nothing on other platforms', async () => {
    setPlatform('win32')

    hideDockIcon()
    await showDockIcon()

    expect(dockMock.hide).not.toHaveBeenCalled()
    expect(dockMock.show).not.toHaveBeenCalled()
  })
})
