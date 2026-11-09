import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: vi.fn(), getName: vi.fn() },
  net: { fetch: vi.fn() }
}))

import {
  buildReleaseAssetUrl,
  getAppBundlePath,
  getSelfInstallBlocker,
  selectMacZipFile,
  shouldUseMacSelfUpdater
} from '../macUpdater'

describe('macUpdater', () => {
  it('only uses the self updater on macOS', () => {
    expect(shouldUseMacSelfUpdater('darwin')).toBe(true)
    expect(shouldUseMacSelfUpdater('win32')).toBe(false)
    expect(shouldUseMacSelfUpdater('linux')).toBe(false)
  })

  it('selects the zip matching the current arch', () => {
    const files = [
      { url: 'app-1.0.0-arm64.dmg', sha512: 'a' },
      { url: 'app-1.0.0-x64.zip', sha512: 'b' },
      { url: 'app-1.0.0-arm64.zip', sha512: 'c' }
    ]
    expect(selectMacZipFile(files, 'arm64')?.sha512).toBe('c')
    expect(selectMacZipFile(files, 'x64')?.sha512).toBe('b')
    expect(selectMacZipFile([{ url: 'app.dmg', sha512: 'a' }], 'arm64')).toBeNull()
  })

  it('builds the GitHub release asset url', () => {
    expect(buildReleaseAssetUrl('owner', 'repo', '1.2.3', 'my app-1.2.3-arm64.zip')).toBe(
      'https://github.com/owner/repo/releases/download/v1.2.3/my%20app-1.2.3-arm64.zip'
    )
    expect(buildReleaseAssetUrl('owner', 'repo', '1.2.3', 'https://example.com/a.zip')).toBe(
      'https://example.com/a.zip'
    )
  })

  it('resolves the .app bundle from the executable path', () => {
    expect(getAppBundlePath('/Applications/My App.app/Contents/MacOS/My App')).toBe('/Applications/My App.app')
    expect(getAppBundlePath('/usr/local/bin/my-app')).toBeNull()
  })

  it('blocks self install from read-only or translocated locations', async () => {
    expect(await getSelfInstallBlocker(null)).toMatch(/locate/)
    expect(await getSelfInstallBlocker('/private/var/folders/x/AppTranslocation/abc/d/My.app')).toMatch(/translocated/)
    expect(await getSelfInstallBlocker('/Volumes/My App/My.app')).toMatch(/disk image/)
  })
})
