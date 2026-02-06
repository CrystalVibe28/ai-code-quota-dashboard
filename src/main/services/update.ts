import { app } from 'electron'
import type { UpdateInfo, UpdateCheckResult, UpdateSettings } from '@shared/types/update'

const GITHUB_OWNER = 'CrystalVibe28'
const GITHUB_REPO = 'ai-code-quota-dashboard'
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`

interface GitHubRelease {
  tag_name: string
  html_url: string
  body?: string
  published_at?: string
}

/**
 * Compare two semver version strings
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
  // Remove 'v' prefix if present
  const normalize = (v: string) => v.replace(/^v/, '')
  const parts1 = normalize(v1).split('.').map(Number)
  const parts2 = normalize(v2).split('.').map(Number)

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0
    const p2 = parts2[i] || 0
    if (p1 > p2) return 1
    if (p1 < p2) return -1
  }
  return 0
}

export class UpdateService {
  private static instance: UpdateService
  private updateSettings: UpdateSettings = {}
  private lastUpdateInfo: UpdateInfo | null = null

  static getInstance(): UpdateService {
    if (!UpdateService.instance) {
      UpdateService.instance = new UpdateService()
    }
    return UpdateService.instance
  }

  /**
   * Get current app version from package.json
   */
  getCurrentVersion(): string {
    return app.getVersion()
  }

  /**
   * Get the skipped version (user chose "don't remind for this version")
   */
  getSkippedVersion(): string | undefined {
    return this.updateSettings.skippedVersion
  }

  /**
   * Set a version to skip notifications for
   */
  setSkippedVersion(version: string): void {
    this.updateSettings.skippedVersion = version
  }

  /**
   * Clear the skipped version
   */
  clearSkippedVersion(): void {
    this.updateSettings.skippedVersion = undefined
  }

  /**
   * Get last checked timestamp
   */
  getLastChecked(): string | undefined {
    return this.updateSettings.lastChecked
  }

  /**
   * Get last update info from previous check
   */
  getLastUpdateInfo(): UpdateInfo | null {
    return this.lastUpdateInfo
  }

  /**
   * Check for updates from GitHub Releases
   */
  async checkForUpdate(): Promise<UpdateCheckResult> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

      const response = await fetch(GITHUB_API_URL, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': `${GITHUB_REPO}/${this.getCurrentVersion()}`
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 404) {
          // No releases yet
          return {
            success: true,
            data: {
              currentVersion: this.getCurrentVersion(),
              latestVersion: this.getCurrentVersion(),
              hasUpdate: false,
              releaseUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`
            }
          }
        }
        throw new Error(`GitHub API error: ${response.status}`)
      }

      const release: GitHubRelease = await response.json()
      const currentVersion = this.getCurrentVersion()
      const latestVersion = release.tag_name.replace(/^v/, '')
      const hasUpdate = compareVersions(latestVersion, currentVersion) > 0

      // Update last checked time
      this.updateSettings.lastChecked = new Date().toISOString()

      const updateInfo: UpdateInfo = {
        currentVersion,
        latestVersion,
        hasUpdate,
        releaseUrl: release.html_url,
        releaseNotes: release.body,
        publishedAt: release.published_at
      }

      // Save last check result
      this.lastUpdateInfo = updateInfo

      console.log(
        `[UpdateService] Check complete: current=${currentVersion}, latest=${latestVersion}, hasUpdate=${hasUpdate}`
      )

      return { success: true, data: updateInfo }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('[UpdateService] Failed to check for updates:', errorMessage)

      // Return current version info on error
      return {
        success: false,
        error: errorMessage,
        data: {
          currentVersion: this.getCurrentVersion(),
          latestVersion: this.getCurrentVersion(),
          hasUpdate: false,
          releaseUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`
        }
      }
    }
  }

  /**
   * Check if we should show notification for this version
   */
  shouldNotifyForVersion(version: string): boolean {
    const skipped = this.updateSettings.skippedVersion
    if (!skipped) return true
    return compareVersions(version, skipped) > 0
  }

  /**
   * Get the release page URL
   */
  getReleaseUrl(): string {
    return `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`
  }
}
