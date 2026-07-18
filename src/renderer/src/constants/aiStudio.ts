const REPOSITORY_URL = 'https://github.com/CrystalVibe28/ai-code-quota-dashboard'

const DOC_FILES = {
  en: 'google-ai-studio-oauth.md',
  'zh-TW': 'google-ai-studio-oauth.zh-tw.md',
  'zh-CN': 'google-ai-studio-oauth.zh-cn.md'
} as const

export function getAiStudioOAuthDocsUrl(language: string, anchor = ''): string {
  const normalized = language.toLowerCase()
  const locale = normalized.startsWith('zh-tw') || normalized.startsWith('zh-hant')
    ? 'zh-TW'
    : normalized.startsWith('zh')
      ? 'zh-CN'
      : 'en'

  return `${REPOSITORY_URL}/blob/main/docs/${DOC_FILES[locale]}${anchor ? `#${anchor}` : ''}`
}
