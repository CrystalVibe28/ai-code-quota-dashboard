/**
 * Update information returned from GitHub Releases API
 */
export interface UpdateInfo {
  /** Current app version e.g. "1.2.0" */
  currentVersion: string
  /** Latest version from GitHub e.g. "1.3.0" */
  latestVersion: string
  /** Whether a newer version is available */
  hasUpdate: boolean
  /** GitHub Release page URL for downloading */
  releaseUrl: string
  /** Release notes / changelog */
  releaseNotes?: string
  /** Release publish date ISO string */
  publishedAt?: string
}

/**
 * Result of update check operation
 */
export interface UpdateCheckResult {
  success: boolean
  data?: UpdateInfo
  error?: string
}

/**
 * Update settings stored in user preferences
 */
export interface UpdateSettings {
  /** Version to skip notifications for (e.g. "1.3.0") */
  skippedVersion?: string
  /** Last time update was checked (ISO string) */
  lastChecked?: string
}
