type Translate = (key: string, options?: Record<string, number | string>) => string

const MODEL_PREFIX = 'weeklyModel:'

export function getClaudeLimitLabel(type: string, t: Translate): string {
  return type.startsWith(MODEL_PREFIX)
    ? t('claude.quotaTypes.weeklyModel', { model: type.slice(MODEL_PREFIX.length) })
    : t(`claude.quotaTypes.${type}`)
}
