import type {
  AiStudioAccount,
  AiStudioLoginSession,
  AiStudioModelLimit,
  AiStudioProject,
  AiStudioTier,
  AiStudioTierSource,
  AiStudioUsage
} from '@shared/types'
import modelWhitelist from './ai-studio-model-whitelist.json'
import { fetchWithTimeout } from './fetchWithTimeout'
import { GoogleOAuthService } from './google-oauth'

const RESOURCE_MANAGER_URL = 'https://cloudresourcemanager.googleapis.com/v1/projects'
const CLOUD_QUOTAS_URL = 'https://cloudquotas.googleapis.com/v1'
const CLOUD_MONITORING_URL = 'https://monitoring.googleapis.com/v3'
const GENERATIVE_LANGUAGE_SERVICE = 'generativelanguage.googleapis.com'
const GENERATIVE_LANGUAGE_SCOPE = 'https://www.googleapis.com/auth/generative-language.retriever'
const MODELS_URL = `https://${GENERATIVE_LANGUAGE_SERVICE}/v1/models`
const MODEL_WHITELIST = new Set(modelWhitelist)

interface QuotaInfo {
  quotaId?: unknown
  metric?: unknown
  quotaDisplayName?: unknown
  metricDisplayName?: unknown
  metricUnit?: unknown
  refreshInterval?: unknown
  quotaIncreaseEligibility?: unknown
  dimensionsInfos?: unknown
  dimensionsInfo?: unknown
}

interface MonitoringMetricDescriptor {
  type?: string
  displayName?: string
  description?: string
}

interface MonitoringTimeSeries {
  metric?: { labels?: Record<string, unknown> }
  points?: Array<{
    interval?: { endTime?: string }
    value?: { int64Value?: unknown; doubleValue?: unknown }
  }>
}

interface MonitoringMetricResult {
  descriptor: MonitoringMetricDescriptor
  timeSeries: MonitoringTimeSeries[]
}

type LimitKind = 'rpm' | 'tpm' | 'rpd'

function normalizedText(info: QuotaInfo): string {
  return [
    info.quotaId,
    info.metric,
    info.quotaDisplayName,
    info.metricDisplayName,
    info.metricUnit,
    info.refreshInterval
  ].filter(value => typeof value === 'string').join(' ').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizedMonitoringText(descriptor: MonitoringMetricDescriptor): string {
  return [descriptor.type, descriptor.displayName, descriptor.description]
    .filter(value => typeof value === 'string')
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function getQuotaTier(text: string): AiStudioTier | null {
  if (text.includes('freetier')) return 'free'
  if (text.includes('paidtier3')) return 'tier3'
  if (text.includes('paidtier2')) return 'tier2'
  if (text.includes('paidtier1') || text.includes('paidtier')) return 'tier1'
  return null
}

function getMonitoringTier(text: string): { tier: AiStudioTier; detailed: boolean } | null {
  if (text.includes('freetier')) return { tier: 'free', detailed: true }
  if (text.includes('paidtier3')) return { tier: 'tier3', detailed: true }
  if (text.includes('paidtier2')) return { tier: 'tier2', detailed: true }
  if (text.includes('paidtier1')) return { tier: 'tier1', detailed: true }
  if (text.includes('paidtier')) return { tier: 'tier1', detailed: false }
  return null
}

function getLimitKind(text: string): LimitKind | null {
  const perMinute = text.includes('perminute') || text.includes('minute') || text.includes('60s')
  const perDay = text.includes('perday') || text.includes('daily') || text.includes('86400s')

  if (text.includes('token') && perMinute) return 'tpm'
  if (text.includes('request') && perDay) return 'rpd'
  if (text.includes('request') && perMinute) return 'rpm'
  return null
}

function getBillingEnabled(values: unknown[]): boolean | null {
  let missingBilling = false

  for (const value of values) {
    if (!value || typeof value !== 'object') continue
    const eligibility = (value as QuotaInfo).quotaIncreaseEligibility
    if (!eligibility || typeof eligibility !== 'object') continue
    const { isEligible, ineligibilityReason } = eligibility as Record<string, unknown>
    if (isEligible === true) return true
    if (ineligibilityReason === 'NO_VALID_BILLING_ACCOUNT') missingBilling = true
  }

  return missingBilling ? false : null
}

function getMonitoringKind(descriptor: MonitoringMetricDescriptor): LimitKind | null {
  const type = descriptor.type || ''
  if (!type.startsWith(`${GENERATIVE_LANGUAGE_SERVICE}/quota/`) || !/\/(limit|usage)$/.test(type)) return null
  if (type.includes('generate_content_batch') || type.includes('generate_content_search')) return null
  if (type.includes('generate_requests_per_model_per_day_internal')) return 'rpd'
  if (type.includes('_internal')) return null
  if (!type.includes('/generate_content_') && !type.includes('/generate_requests_per_model')) return null
  if (type.includes('input_token')) return 'tpm'
  if (type.includes('request')) return 'rpm'
  return null
}

function toNumber(value: unknown): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(number) && number >= 0 ? number : null
}

function toLimit(value: unknown): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(number) && (number === -1 || number >= 0) ? number : null
}

function normalizeModel(model: string): string {
  return model.trim().replace(/^models\//, '')
}

function humanizeModelId(model: string): string {
  return normalizeModel(model).replace(/[-_]+/g, ' ').replace(/\b[a-z]/g, letter => letter.toUpperCase())
}

function pointTime(point: NonNullable<MonitoringTimeSeries['points']>[number]): number {
  const timestamp = Date.parse(point.interval?.endTime || '')
  return Number.isFinite(timestamp) ? timestamp : 0
}

function pacificDayStart(now: number): number {
  const dateParts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(now).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)])
  )
  const target = Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day)
  const guess = target + 8 * 60 * 60 * 1000
  const guessParts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(guess).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)])
  )
  const represented = Date.UTC(
    guessParts.year,
    guessParts.month - 1,
    guessParts.day,
    guessParts.hour,
    guessParts.minute,
    guessParts.second
  )
  return guess + target - represented
}

export function parseAiStudioMonitoringMetrics(
  results: MonitoringMetricResult[],
  fallbackTier: AiStudioTier,
  now = Date.now(),
  paidFallbackTier = fallbackTier
): {
  tier: AiStudioTier
  detectedTier: AiStudioTier | null
  paidEvidence: boolean
  usage: Map<string, Pick<AiStudioModelLimit, 'rpmUsed' | 'tpmUsed' | 'rpdUsed'>>
} {
  const tierCandidates: Array<{ tier: AiStudioTier; detailed: boolean; time: number; priority: number }> = []

  for (const { descriptor, timeSeries } of results) {
    if (!getMonitoringKind(descriptor)) continue
    const evidence = getMonitoringTier(normalizedMonitoringText(descriptor))
    if (!evidence) continue
    const time = Math.max(0, ...timeSeries.flatMap(series => (series.points || []).map(pointTime)))
    if (time) tierCandidates.push({ ...evidence, time, priority: descriptor.type?.endsWith('/usage') ? 1 : 0 })
  }

  const tierRank: Record<AiStudioTier, number> = { free: 0, tier1: 1, tier2: 2, tier3: 3 }
  const detailedPaidCandidates = tierCandidates
    .filter(candidate => candidate.tier !== 'free' && candidate.detailed)
    .sort((left, right) => right.priority - left.priority || right.time - left.time || tierRank[right.tier] - tierRank[left.tier])
  const hasPaidEvidence = tierCandidates.some(candidate => candidate.tier !== 'free')
  const hasFreeEvidence = tierCandidates.some(candidate => candidate.tier === 'free')
  const detectedTier = detailedPaidCandidates[0]?.tier ?? (!hasPaidEvidence && hasFreeEvidence ? 'free' : null)
  const tier = detectedTier ?? (hasPaidEvidence ? (paidFallbackTier === 'free' ? 'tier1' : paidFallbackTier) : fallbackTier)
  const usage = new Map<string, Pick<AiStudioModelLimit, 'rpmUsed' | 'tpmUsed' | 'rpdUsed'>>()
  const recentBuckets = new Map<string, Map<number, number>>()
  const dayStart = pacificDayStart(now)

  for (const { descriptor, timeSeries } of results) {
    if (!descriptor.type?.endsWith('/usage')) continue
    const kind = getMonitoringKind(descriptor)
    if (!kind) continue
    const descriptorTier = getMonitoringTier(normalizedMonitoringText(descriptor))
    if (descriptorTier) {
      if ((descriptorTier.tier === 'free') !== (tier === 'free')) continue
      if (descriptorTier.detailed && descriptorTier.tier !== tier) continue
    } else if (kind !== 'rpd') {
      continue
    }

    for (const series of timeSeries) {
      const modelValue = series.metric?.labels?.model
      const model = typeof modelValue === 'string' ? normalizeModel(modelValue) : ''
      if (!model) continue

      const modelUsage = usage.get(model) || { rpmUsed: 0, tpmUsed: 0, rpdUsed: 0 }
      if (kind === 'rpd') {
        modelUsage.rpdUsed += (series.points || []).reduce((sum, point) => {
          if (pointTime(point) < dayStart) return sum
          return sum + (toNumber(point.value?.int64Value ?? point.value?.doubleValue) || 0)
        }, 0)
      } else {
        const key = `${model}:${kind}`
        const buckets = recentBuckets.get(key) || new Map<number, number>()
        for (const point of series.points || []) {
          const time = pointTime(point)
          if (!time) continue
          const bucket = Math.floor(time / 60000) * 60000
          buckets.set(bucket, (buckets.get(bucket) || 0) + (toNumber(point.value?.int64Value ?? point.value?.doubleValue) || 0))
        }
        recentBuckets.set(key, buckets)
      }
      usage.set(model, modelUsage)
    }
  }

  for (const [key, buckets] of recentBuckets) {
    const separator = key.lastIndexOf(':')
    const model = key.slice(0, separator)
    const kind = key.slice(separator + 1) as Exclude<LimitKind, 'rpd'>
    const latestBucket = Math.max(0, ...buckets.keys())
    const modelUsage = usage.get(model) || { rpmUsed: 0, tpmUsed: 0, rpdUsed: 0 }
    modelUsage[kind === 'rpm' ? 'rpmUsed' : 'tpmUsed'] = latestBucket >= now - 5 * 60 * 1000
      ? buckets.get(latestBucket) || 0
      : 0
    usage.set(model, modelUsage)
  }

  return { tier, detectedTier, paidEvidence: hasPaidEvidence, usage }
}

export function parseAiStudioQuotaInfos(values: unknown[], tier: AiStudioTier): AiStudioModelLimit[] {
  const limits = new Map<string, AiStudioModelLimit>()

  for (const value of values) {
    if (!value || typeof value !== 'object') continue
    const info = value as QuotaInfo
    const text = normalizedText(info)
    const kind = getLimitKind(text)
    const quotaTier = getQuotaTier(text) || (info.quotaId === 'GenerateRequestsPerDayPerProjectPerModel' ? 'tier1' : null)
    if (quotaTier !== tier || !kind) continue

    const dimensionsInfos = Array.isArray(info.dimensionsInfos)
      ? info.dimensionsInfos
      : Array.isArray(info.dimensionsInfo)
        ? info.dimensionsInfo
        : []

    for (const entryValue of dimensionsInfos) {
      if (!entryValue || typeof entryValue !== 'object') continue
      const entry = entryValue as { dimensions?: unknown; details?: unknown }
      const dimensions = entry.dimensions && typeof entry.dimensions === 'object'
        ? entry.dimensions as Record<string, unknown>
        : {}
      const modelValue = dimensions.model ?? dimensions.baseModel ?? dimensions.base_model
      const model = typeof modelValue === 'string' ? normalizeModel(modelValue) : ''
      const details = entry.details && typeof entry.details === 'object'
        ? entry.details as { value?: unknown; quotaValue?: unknown }
        : {}
      const quotaValue = toLimit(details.value ?? details.quotaValue)
      if (!model || quotaValue === null) continue

      const limit = limits.get(model) || {
        model,
        rpm: null,
        tpm: null,
        rpd: null,
        rpmUsed: 0,
        tpmUsed: 0,
        rpdUsed: 0
      }
      const current = limit[kind]
      limit[kind] = current === null || current === -1
        ? quotaValue
        : quotaValue === -1 ? current : Math.min(current, quotaValue)
      limits.set(model, limit)
    }
  }

  return Array.from(limits.values()).sort((left, right) => left.model.localeCompare(right.model, undefined, { numeric: true }))
}

export class AiStudioService {
  private readonly googleOAuth: GoogleOAuthService

  constructor(clientId = '', clientSecret = '') {
    this.googleOAuth = new GoogleOAuthService(clientId.trim(), clientSecret.trim(), [GENERATIVE_LANGUAGE_SCOPE])
  }

  cancelLogin(): boolean {
    return this.googleOAuth.cancelLogin()
  }

  async login(): Promise<{ success: boolean; account?: AiStudioLoginSession; error?: string }> {
    const result = await this.googleOAuth.login()
    if (!result.success || !result.account) return { success: false, error: result.error }

    try {
      const projects = await this.listProjects(result.account.accessToken)
      return { success: true, account: { ...result.account, projects } }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: number } | null> {
    return this.googleOAuth.refreshToken(refreshToken)
  }

  async fetchUsage(account: Pick<AiStudioAccount, 'accessToken' | 'projectId' | 'projectNumber' | 'tier' | 'manualTier' | 'tierSource'>): Promise<AiStudioUsage> {
    const now = Date.now()
    const [quotaInfos, descriptors, modelNames] = await Promise.all([
      this.listQuotaInfos(account.accessToken, account.projectNumber),
      this.listMonitoringDescriptors(account.accessToken, account.projectId),
      this.listModels(account.accessToken, account.projectId).catch(() => new Map<string, string>())
    ])
    const billingEnabled = getBillingEnabled(quotaInfos)
    const monitoringResults = await Promise.all(
      descriptors.filter(descriptor => {
        if (!getMonitoringKind(descriptor)) return false
        const tier = getMonitoringTier(normalizedMonitoringText(descriptor))?.tier
        return billingEnabled === null || (billingEnabled ? tier !== 'free' : tier === undefined || tier === 'free')
      }).map(async descriptor => {
        const kind = getMonitoringKind(descriptor)
        const start = kind === 'rpd' && descriptor.type?.endsWith('/usage')
          ? pacificDayStart(now)
          : now - 15 * 60 * 1000
        return {
          descriptor,
          timeSeries: await this.listTimeSeries(account.accessToken, account.projectId, descriptor.type!, start, now)
        }
      })
    )
    const paidFallbackTier: AiStudioTier = account.manualTier ?? (account.tier === 'free' ? 'tier1' : account.tier)
    const fallbackTier: AiStudioTier = billingEnabled === false
      ? 'free'
      : billingEnabled === true ? paidFallbackTier : account.tier
    const monitoring = parseAiStudioMonitoringMetrics(monitoringResults, fallbackTier, now, paidFallbackTier)
    const storedTierSource: AiStudioTierSource = account.tierSource ?? (account.tier === 'tier1' ? 'default' : 'system')
    let tierSource: AiStudioTierSource = monitoring.tier === account.tier ? storedTierSource : 'default'
    if (monitoring.detectedTier !== null || monitoring.tier === 'free') {
      tierSource = 'system'
    } else if ((billingEnabled === true || monitoring.paidEvidence) && monitoring.tier === account.manualTier) {
      tierSource = 'manual'
    }
    const limits = parseAiStudioQuotaInfos(quotaInfos, monitoring.tier)
    const limitsByModel = new Map(limits.map(limit => [limit.model, limit]))

    for (const [model, modelUsage] of monitoring.usage) {
      const limit = limitsByModel.get(model) || {
        model,
        rpm: null,
        tpm: null,
        rpd: null,
        rpmUsed: 0,
        tpmUsed: 0,
        rpdUsed: 0
      }
      Object.assign(limit, modelUsage)
      limitsByModel.set(model, limit)
    }

    for (const limit of limitsByModel.values()) {
      limit.displayName = modelNames.get(limit.model) ?? humanizeModelId(limit.model)
    }

    return {
      projectId: account.projectId,
      projectNumber: account.projectNumber,
      tier: monitoring.tier,
      tierSource,
      limits: Array.from(limitsByModel.values())
        .filter(limit => MODEL_WHITELIST.has(limit.model))
        .sort((left, right) => left.model.localeCompare(right.model, undefined, { numeric: true }))
    }
  }

  private async listModels(accessToken: string, projectId: string): Promise<Map<string, string>> {
    const modelNames = new Map<string, string>()
    let pageToken = ''

    do {
      const url = new URL(MODELS_URL)
      url.searchParams.set('pageSize', '1000')
      if (pageToken) url.searchParams.set('pageToken', pageToken)

      const response = await fetchWithTimeout(url.toString(), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-goog-user-project': projectId
        }
      })
      if (!response.ok) throw new Error(`Models API failed: ${response.status}`)

      const data = await response.json() as {
        models?: Array<{ name?: string; baseModelId?: string; displayName?: string }>
        nextPageToken?: string
      }
      for (const model of data.models || []) {
        if (!model.displayName) continue
        for (const id of [model.name, model.baseModelId]) {
          if (id) modelNames.set(normalizeModel(id), model.displayName)
        }
      }
      pageToken = typeof data.nextPageToken === 'string' ? data.nextPageToken : ''
    } while (pageToken)

    return modelNames
  }

  private async listQuotaInfos(accessToken: string, projectNumber: string): Promise<unknown[]> {
    const quotaInfos: unknown[] = []
    let pageToken = ''

    do {
      const url = new URL(`${CLOUD_QUOTAS_URL}/projects/${encodeURIComponent(projectNumber)}/locations/global/services/${GENERATIVE_LANGUAGE_SERVICE}/quotaInfos`)
      url.searchParams.set('pageSize', '100')
      if (pageToken) url.searchParams.set('pageToken', pageToken)
      const response = await fetchWithTimeout(url.toString(), {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: { message?: string } } | null
        throw new Error(body?.error?.message || `Cloud Quotas API failed: ${response.status}`)
      }

      const data = await response.json() as { quotaInfos?: unknown[]; nextPageToken?: string }
      quotaInfos.push(...(Array.isArray(data.quotaInfos) ? data.quotaInfos : []))
      pageToken = typeof data.nextPageToken === 'string' ? data.nextPageToken : ''
    } while (pageToken)

    return quotaInfos
  }

  private async listMonitoringDescriptors(accessToken: string, projectId: string): Promise<MonitoringMetricDescriptor[]> {
    const descriptors: MonitoringMetricDescriptor[] = []
    let pageToken = ''

    do {
      const url = new URL(`${CLOUD_MONITORING_URL}/projects/${encodeURIComponent(projectId)}/metricDescriptors`)
      url.searchParams.set('filter', `metric.type = starts_with("${GENERATIVE_LANGUAGE_SERVICE}/quota/")`)
      url.searchParams.set('activeOnly', 'true')
      url.searchParams.set('pageSize', '10000')
      if (pageToken) url.searchParams.set('pageToken', pageToken)
      const response = await fetchWithTimeout(url.toString(), {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: { message?: string } } | null
        throw new Error(body?.error?.message || `Cloud Monitoring API failed: ${response.status}`)
      }

      const data = await response.json() as { metricDescriptors?: MonitoringMetricDescriptor[]; nextPageToken?: string }
      descriptors.push(...(Array.isArray(data.metricDescriptors) ? data.metricDescriptors : []))
      pageToken = typeof data.nextPageToken === 'string' ? data.nextPageToken : ''
    } while (pageToken)

    return descriptors
  }

  private async listTimeSeries(
    accessToken: string,
    projectId: string,
    metricType: string,
    start: number,
    end: number
  ): Promise<MonitoringTimeSeries[]> {
    const timeSeries: MonitoringTimeSeries[] = []
    let pageToken = ''

    do {
      const url = new URL(`${CLOUD_MONITORING_URL}/projects/${encodeURIComponent(projectId)}/timeSeries`)
      url.searchParams.set('filter', `metric.type = "${metricType}"`)
      url.searchParams.set('interval.startTime', new Date(start).toISOString())
      url.searchParams.set('interval.endTime', new Date(end).toISOString())
      url.searchParams.set('view', 'FULL')
      url.searchParams.set('pageSize', '100000')
      if (pageToken) url.searchParams.set('pageToken', pageToken)
      const response = await fetchWithTimeout(url.toString(), {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: { message?: string } } | null
        throw new Error(body?.error?.message || `Cloud Monitoring API failed: ${response.status}`)
      }

      const data = await response.json() as { timeSeries?: MonitoringTimeSeries[]; nextPageToken?: string }
      timeSeries.push(...(Array.isArray(data.timeSeries) ? data.timeSeries : []))
      pageToken = typeof data.nextPageToken === 'string' ? data.nextPageToken : ''
    } while (pageToken)

    return timeSeries
  }

  private async listProjects(accessToken: string): Promise<AiStudioProject[]> {
    const projects: AiStudioProject[] = []
    let pageToken = ''

    do {
      const url = new URL(RESOURCE_MANAGER_URL)
      url.searchParams.set('pageSize', '100')
      url.searchParams.set('filter', 'lifecycleState:ACTIVE')
      if (pageToken) url.searchParams.set('pageToken', pageToken)
      const response = await fetchWithTimeout(url.toString(), {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: { message?: string } } | null
        throw new Error(body?.error?.message || `Failed to list Google Cloud projects: ${response.status}`)
      }

      const data = await response.json() as {
        projects?: Array<{ projectId?: string; projectNumber?: string; name?: string; lifecycleState?: string }>
        nextPageToken?: string
      }
      for (const project of data.projects || []) {
        if (!project.projectId || !project.projectNumber || project.lifecycleState !== 'ACTIVE') continue
        projects.push({
          projectId: project.projectId,
          projectNumber: String(project.projectNumber),
          name: project.name || project.projectId
        })
      }
      pageToken = typeof data.nextPageToken === 'string' ? data.nextPageToken : ''
    } while (pageToken)

    return projects.sort((left, right) => left.name.localeCompare(right.name))
  }
}
