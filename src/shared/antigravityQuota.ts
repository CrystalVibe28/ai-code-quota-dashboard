export type AntigravityQuotaType =
  | 'geminiFiveHour'
  | 'geminiWeekly'
  | 'claudeGptFiveHour'
  | 'claudeGptWeekly'

const quotaTypesByModelName = new Map<string, AntigravityQuotaType>([
  ['Gemini 5-hour', 'geminiFiveHour'],
  ['Gemini weekly', 'geminiWeekly'],
  ['Claude/GPT 5-hour', 'claudeGptFiveHour'],
  ['Claude/GPT weekly', 'claudeGptWeekly']
])

export function getAntigravityQuotaType(modelName: string): AntigravityQuotaType | null {
  return quotaTypesByModelName.get(modelName) ?? null
}
