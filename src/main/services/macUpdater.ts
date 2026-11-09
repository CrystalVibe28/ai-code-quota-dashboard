import { app, net } from 'electron'
import { spawn, execFile } from 'child_process'
import { createHash } from 'crypto'
import { createWriteStream } from 'fs'
import { access, mkdir, readdir, rm, writeFile, constants } from 'fs/promises'
import { join, dirname, posix } from 'path'
import { Readable, Transform } from 'stream'
import { pipeline } from 'stream/promises'
import { promisify } from 'util'
import type { UpdateInfo as ElectronUpdateInfo, UpdateFileInfo } from 'electron-updater'

const execFileAsync = promisify(execFile)

/**
 * 未經 Apple Developer ID 簽名的 app 無法使用 Squirrel.Mac（簽名驗證必定失敗），
 * 因此 macOS 改為自行下載 zip、驗證 sha512，並在 app 結束後以腳本替換 .app。
 */
export function shouldUseMacSelfUpdater(platform: NodeJS.Platform = process.platform): boolean {
  return platform === 'darwin'
}

export function selectMacZipFile(
  files: UpdateFileInfo[],
  arch: string = process.arch
): UpdateFileInfo | null {
  const zips = files.filter(({ url }) => url.toLowerCase().endsWith('.zip'))
  return zips.find(({ url }) => url.includes(arch)) ?? zips[0] ?? null
}

export function buildReleaseAssetUrl(owner: string, repo: string, version: string, fileUrl: string): string {
  if (/^https?:\/\//.test(fileUrl)) return fileUrl
  return `https://github.com/${owner}/${repo}/releases/download/v${version}/${encodeURIComponent(fileUrl)}`
}

/**
 * Resolve the .app bundle that contains the running executable
 * (…/Foo.app/Contents/MacOS/Foo → …/Foo.app)
 */
export function getAppBundlePath(exePath: string = app.getPath('exe')): string | null {
  const bundlePath = posix.resolve(exePath, '../../..')
  return bundlePath.endsWith('.app') ? bundlePath : null
}

/**
 * Return a reason when the current bundle cannot be replaced in place
 */
export async function getSelfInstallBlocker(bundlePath: string | null): Promise<string | null> {
  if (!bundlePath) return 'Cannot locate the application bundle'
  if (bundlePath.includes('/AppTranslocation/')) {
    return 'The app is running from a translocated location. Move it to the Applications folder and try again'
  }
  if (bundlePath.startsWith('/Volumes/')) {
    return 'The app is running from a disk image. Move it to the Applications folder and try again'
  }
  const parentDir = posix.dirname(bundlePath)
  try {
    await access(parentDir, constants.W_OK)
  } catch {
    return `No write permission for ${parentDir}`
  }
  return null
}

interface DownloadOptions {
  owner: string
  repo: string
  updateInfo: ElectronUpdateInfo
  onProgress: (percent: number) => void
}

/**
 * Download, verify and extract the macOS zip. Returns the staged .app path.
 */
export async function downloadMacUpdate({ owner, repo, updateInfo, onProgress }: DownloadOptions): Promise<string> {
  const blocker = await getSelfInstallBlocker(getAppBundlePath())
  if (blocker) throw new Error(blocker)

  const file = selectMacZipFile(updateInfo.files)
  if (!file) throw new Error('No macOS zip found in the release metadata')

  const stagingDir = join(app.getPath('temp'), `${app.getName()}-update-${updateInfo.version}`)
  await rm(stagingDir, { recursive: true, force: true })
  await mkdir(stagingDir, { recursive: true })

  const zipPath = join(stagingDir, 'update.zip')
  const response = await net.fetch(buildReleaseAssetUrl(owner, repo, updateInfo.version, file.url))
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download update: HTTP ${response.status}`)
  }

  const total = Number(response.headers.get('content-length')) || file.size || 0
  const hash = createHash('sha512')
  let received = 0
  let lastPercent = -1
  const progress = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      hash.update(chunk)
      received += chunk.length
      if (total > 0) {
        const percent = Math.min(99, Math.floor((received / total) * 100))
        if (percent !== lastPercent) {
          lastPercent = percent
          onProgress(percent)
        }
      }
      callback(null, chunk)
    }
  })

  await pipeline(
    Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]),
    progress,
    createWriteStream(zipPath)
  )

  if (hash.digest('base64') !== file.sha512) {
    await rm(stagingDir, { recursive: true, force: true })
    throw new Error('Downloaded update failed checksum verification')
  }

  const extractDir = join(stagingDir, 'app')
  await execFileAsync('/usr/bin/ditto', ['-x', '-k', zipPath, extractDir])
  await rm(zipPath, { force: true })

  const appName = (await readdir(extractDir)).find((name) => name.endsWith('.app'))
  if (!appName) throw new Error('No application bundle found in the update archive')

  const stagedAppPath = join(extractDir, appName)
  await execFileAsync('/usr/bin/xattr', ['-dr', 'com.apple.quarantine', stagedAppPath]).catch(() => undefined)
  onProgress(100)
  return stagedAppPath
}

// $1=pid  $2=target .app  $3=staged .app  $4=staging dir  $5=fallback url
const INSTALL_SCRIPT = `#!/bin/sh
PID="$1"; TARGET="$2"; SOURCE="$3"; STAGING="$4"; FALLBACK_URL="$5"
while kill -0 "$PID" 2>/dev/null; do sleep 1; done
BACKUP="$TARGET.update-backup"
rm -rf "$BACKUP"
if mv "$TARGET" "$BACKUP"; then
  if /usr/bin/ditto "$SOURCE" "$TARGET"; then
    rm -rf "$BACKUP"
    /usr/bin/xattr -dr com.apple.quarantine "$TARGET" 2>/dev/null
  else
    rm -rf "$TARGET"
    mv "$BACKUP" "$TARGET"
    open "$FALLBACK_URL"
  fi
else
  open "$FALLBACK_URL"
fi
open "$TARGET"
rm -rf "$STAGING"
`

/**
 * Spawn a detached script that replaces the bundle once this process exits.
 * The caller must quit the app afterwards.
 */
export async function installMacUpdate(stagedAppPath: string, fallbackUrl: string): Promise<void> {
  const bundlePath = getAppBundlePath()
  const blocker = await getSelfInstallBlocker(bundlePath)
  if (blocker || !bundlePath) throw new Error(blocker ?? 'Cannot locate the application bundle')

  const stagingDir = dirname(dirname(stagedAppPath))
  const scriptPath = join(stagingDir, 'install.sh')
  await writeFile(scriptPath, INSTALL_SCRIPT, { mode: 0o755 })

  const child = spawn(
    '/bin/sh',
    [scriptPath, String(process.pid), bundlePath, stagedAppPath, stagingDir, fallbackUrl],
    { detached: true, stdio: 'ignore' }
  )
  child.unref()
}
