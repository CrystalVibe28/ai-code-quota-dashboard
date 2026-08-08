import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const mocks = vi.hoisted(() => ({
  isPackaged: true,
  getLoginItemSettings: vi.fn(),
  setLoginItemSettings: vi.fn(),
  getPath: vi.fn(),
  getName: vi.fn()
}))

vi.mock('electron', () => ({
  app: {
    get isPackaged() { return mocks.isPackaged },
    getLoginItemSettings: mocks.getLoginItemSettings,
    setLoginItemSettings: mocks.setLoginItemSettings,
    getPath: mocks.getPath,
    getName: mocks.getName
  }
}))

import { getAutoLaunch, setAutoLaunch } from '../auto-launch'

describe('auto launch', () => {
  let appDataPath: string | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isPackaged = true
    mocks.getName.mockReturnValue('AI Code Quota Dashboard')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    if (appDataPath) rmSync(appDataPath, { recursive: true, force: true })
    appDataPath = undefined
  })

  it('uses the same hidden login item and reports the effective Windows state', () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('win32')
    mocks.getLoginItemSettings.mockReturnValue({
      openAtLogin: true,
      executableWillLaunchAtLogin: true,
      launchItems: [{
        path: process.execPath,
        args: ['--hidden'],
        enabled: true
      }]
    })

    expect(setAutoLaunch(true)).toBe(true)
    expect(mocks.setLoginItemSettings).toHaveBeenCalledWith({
      path: process.execPath,
      args: ['--hidden'],
      openAtLogin: true,
      enabled: true
    })
    expect(mocks.getLoginItemSettings).toHaveBeenCalledWith({
      path: process.execPath,
      args: ['--hidden']
    })

    mocks.getLoginItemSettings.mockReturnValue({
      openAtLogin: true,
      executableWillLaunchAtLogin: true,
      launchItems: [
        { path: process.execPath, args: ['--hidden'], enabled: false },
        { path: process.execPath, args: [], enabled: true }
      ]
    })
    expect(getAutoLaunch()).toBe(false)

    mocks.getLoginItemSettings.mockReturnValue({
      openAtLogin: false,
      executableWillLaunchAtLogin: false,
      launchItems: []
    })
    expect(setAutoLaunch(false)).toBe(true)
    expect(mocks.setLoginItemSettings).toHaveBeenLastCalledWith({
      path: process.execPath,
      args: ['--hidden'],
      openAtLogin: false
    })
  })

  it('creates and removes an effective XDG autostart entry on Linux', () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('linux')
    appDataPath = mkdtempSync(join(tmpdir(), 'ai-quota-autostart-'))
    mocks.getPath.mockReturnValue(appDataPath)
    vi.stubEnv('APPIMAGE', '/opt/AI $Quota%/dashboard.AppImage')

    expect(setAutoLaunch(true)).toBe(true)

    const desktopPath = join(appDataPath, 'autostart', 'ai-code-quota-dashboard.desktop')
    expect(readFileSync(desktopPath, 'utf8')).toContain(
      String.raw`Exec="/opt/AI \\$Quota%%/dashboard.AppImage" --hidden`
    )
    expect(getAutoLaunch()).toBe(true)

    vi.stubEnv('APPIMAGE', '/opt/a\\b"c`d$e%/dashboard.AppImage')
    expect(setAutoLaunch(true)).toBe(true)
    expect(readFileSync(desktopPath, 'utf8').split('\n').find(line => line.startsWith('Exec=')))
      .toBe([
        'Exec="/opt/a', '\\'.repeat(4), 'b', '\\'.repeat(2), '"c',
        '\\'.repeat(2), '`d', '\\'.repeat(2), '$e%%/dashboard.AppImage" --hidden'
      ].join(''))

    appendFileSync(desktopPath, 'Hidden=true\n')
    expect(getAutoLaunch()).toBe(false)

    vi.stubEnv('APPIMAGE', '')
    vi.spyOn(process, 'execPath', 'get').mockReturnValue('/usr/bin/ai quota dashboard')
    expect(setAutoLaunch(true)).toBe(true)
    expect(readFileSync(desktopPath, 'utf8')).toContain(
      'Exec="/usr/bin/ai quota dashboard" --hidden'
    )

    expect(setAutoLaunch(false)).toBe(true)
    expect(existsSync(desktopPath)).toBe(false)
  })

  it('does not register invalid Linux paths or modify login items in development', () => {
    const platform = vi.spyOn(process, 'platform', 'get').mockReturnValue('linux')
    appDataPath = mkdtempSync(join(tmpdir(), 'ai-quota-autostart-'))
    mocks.getPath.mockReturnValue(appDataPath)
    vi.stubEnv('APPIMAGE', '/opt/invalid=name.AppImage')

    expect(() => setAutoLaunch(true)).toThrow('Invalid auto-launch executable path')
    expect(existsSync(join(appDataPath, 'autostart'))).toBe(false)

    mocks.isPackaged = false
    platform.mockReturnValue('win32')
    expect(setAutoLaunch(false)).toBe(false)
    expect(mocks.setLoginItemSettings).not.toHaveBeenCalled()
  })
})
