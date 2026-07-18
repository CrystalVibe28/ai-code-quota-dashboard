import type { ModelQuota } from '@shared/types'
import { fetchWithTimeout } from './fetchWithTimeout'
import { GoogleOAuthService } from './google-oauth'

const CLIENT_ID = '1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com'
const CLIENT_SECRET = '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'
const API_BASE = 'https://cloudcode-pa.googleapis.com'
const QUOTA_API_BASE = 'https://daily-cloudcode-pa.googleapis.com'
const QUOTA_OS = process.platform === 'win32' ? 'windows' : process.platform
const QUOTA_ARCH = process.arch === 'x64' ? 'amd64' : process.arch
const QUOTA_USER_AGENT = `antigravity/cli/1.0.11 ${QUOTA_OS}/${QUOTA_ARCH}`

const QUOTA_BUCKETS = [
  { id: 'gemini-5h', label: 'Gemini 5-hour' },
  { id: 'gemini-weekly', label: 'Gemini weekly' },
  { id: '3p-5h', label: 'Claude/GPT 5-hour' },
  { id: '3p-weekly', label: 'Claude/GPT weekly' }
] as const

const QUOTA_BUCKET_LABELS = new Map<string, string>(QUOTA_BUCKETS.map(({ id, label }) => [id, label]))
const QUOTA_BUCKET_ORDER = new Map<string, number>(QUOTA_BUCKETS.map(({ id }, index) => [id, index]))

interface LoginResult {
  success: boolean
  account?: any
  error?: string
}

function parseQuotaSummary(data: unknown): ModelQuota[] {
  if (!data || typeof data !== 'object') return []

  const root = data as { response?: unknown; summary?: unknown; groups?: unknown }
  const payload = root.response && typeof root.response === 'object'
    ? root.response
    : root.summary && typeof root.summary === 'object'
      ? root.summary
      : root
  const groups = (payload as { groups?: unknown }).groups
  if (!Array.isArray(groups)) return []

  const quotas = new Map<string, ModelQuota>()

  for (const groupValue of groups) {
    if (!groupValue || typeof groupValue !== 'object') continue

    const group = groupValue as { displayName?: unknown; buckets?: unknown }
    if (!Array.isArray(group.buckets)) continue

    for (const bucketValue of group.buckets) {
      if (!bucketValue || typeof bucketValue !== 'object') continue

      const bucket = bucketValue as {
        bucketId?: unknown
        displayName?: unknown
        disabled?: unknown
        remainingFraction?: unknown
        remaining?: unknown
        resetTime?: unknown
      }
      const bucketId = typeof bucket.bucketId === 'string' ? bucket.bucketId.trim() : ''
      const remaining = bucket.remaining && typeof bucket.remaining === 'object'
        ? bucket.remaining as { remainingFraction?: unknown; case?: unknown; value?: unknown }
        : null
      const remainingFraction = bucket.remainingFraction
        ?? remaining?.remainingFraction
        ?? (remaining?.case === 'remainingFraction' ? remaining.value : undefined)

      if (bucket.disabled === true
        || !bucketId
        || typeof remainingFraction !== 'number'
        || !Number.isFinite(remainingFraction)) {
        continue
      }

      const groupName = typeof group.displayName === 'string' ? group.displayName.trim() : ''
      const bucketName = typeof bucket.displayName === 'string' ? bucket.displayName.trim() : ''
      const modelName = QUOTA_BUCKET_LABELS.get(bucketId)
        || [groupName, bucketName].filter(Boolean).join(' · ')
        || bucketId
      const quota: ModelQuota = {
        modelName,
        remainingFraction: Math.max(0, Math.min(1, remainingFraction)),
        resetTime: typeof bucket.resetTime === 'string' && bucket.resetTime.trim()
          ? bucket.resetTime
          : undefined
      }
      const existing = quotas.get(bucketId)

      if (!existing || quota.remainingFraction < existing.remainingFraction) {
        quotas.set(bucketId, quota)
      }
    }
  }

  return Array.from(quotas.entries())
    .sort(([leftId], [rightId]) => {
      const leftOrder = QUOTA_BUCKET_ORDER.get(leftId) ?? Number.MAX_SAFE_INTEGER
      const rightOrder = QUOTA_BUCKET_ORDER.get(rightId) ?? Number.MAX_SAFE_INTEGER
      return leftOrder - rightOrder || leftId.localeCompare(rightId)
    })
    .map(([, quota]) => quota)
}

export class AntigravityService {
  private readonly googleOAuth = new GoogleOAuthService(CLIENT_ID, CLIENT_SECRET)

  cancelLogin(): boolean {
    return this.googleOAuth.cancelLogin()
  }

  async login(): Promise<LoginResult> {
    const result = await this.googleOAuth.login()
    if (!result.success || !result.account) return result

    try {
      const oauth = result.account
      return {
        success: true,
        account: {
          id: oauth.userId,
          email: oauth.email,
          name: oauth.name,
          picture: oauth.picture,
          accessToken: oauth.accessToken,
          refreshToken: oauth.refreshToken,
          expiresAt: oauth.expiresAt,
          projectId: await this.getProjectId(oauth.accessToken),
          showInOverview: true,
          selectedModels: []
        }
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: number } | null> {
    return this.googleOAuth.refreshToken(refreshToken)
  }

  private async getProjectId(accessToken: string): Promise<string> {
    const response = await fetch(`${API_BASE}/v1internal:loadCodeAssist`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Antigravity/1.11'
      },
      body: JSON.stringify({ metadata: { ideType: 'ANTIGRAVITY' } })
    })

    if (!response.ok) {
      throw new Error(`Failed to load code assist: ${response.status}`)
    }

    const data = await response.json()
    return data.cloudaicompanionProject || ''
  }

  async fetchUsage(account: { accessToken: string; projectId: string }): Promise<ModelQuota[]> {
    const body = JSON.stringify(account.projectId ? { project: account.projectId } : {})
    const summaryRequest: RequestInit = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': QUOTA_USER_AGENT
      },
      body
    }

    for (const baseUrl of [QUOTA_API_BASE, API_BASE]) {
      try {
        const response = await fetchWithTimeout(`${baseUrl}/v1internal:retrieveUserQuotaSummary`, summaryRequest)
        if (!response.ok) continue

        const quotas = parseQuotaSummary(await response.json())
        if (quotas.length > 0) return quotas
      } catch {
        // Fall back to the legacy per-model quota response below.
      }
    }

    return this.fetchLegacyUsage(account, body)
  }

  private async fetchLegacyUsage(
    account: { accessToken: string; projectId: string },
    body: string
  ): Promise<ModelQuota[]> {
    const response = await fetchWithTimeout(`${API_BASE}/v1internal:fetchAvailableModels`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Antigravity/1.11'
      },
      body
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`)
    }

    const data = await response.json()
    const dedupMap = new Map<string, ModelQuota>()

    if (data.models && typeof data.models === 'object') {
      for (const [modelName, modelData] of Object.entries(data.models)) {
        const lowerName = modelName.toLowerCase()

        if (lowerName.includes('gemini') || lowerName.includes('claude') || lowerName.includes('gpt')) {
          const model = modelData as any
          const quotaInfo = model.quotaInfo || {}
          const displayName = model.displayName || modelName
          const remainingFraction = quotaInfo.remainingFraction

          if (typeof remainingFraction !== 'number' || !Number.isFinite(remainingFraction)) {
            continue
          }

          const existing = dedupMap.get(displayName)
          if (!existing || remainingFraction < existing.remainingFraction) {
            dedupMap.set(displayName, {
              modelName: displayName,
              remainingFraction: Math.max(0, Math.min(1, remainingFraction)),
              resetTime: quotaInfo.resetTime
            })
          }
        }
      }
    }

    const models = Array.from(dedupMap.values())

    // Sort models by name to ensure consistent ordering across refreshes
    models.sort((a, b) => a.modelName.localeCompare(b.modelName))

    return models
  }
}
