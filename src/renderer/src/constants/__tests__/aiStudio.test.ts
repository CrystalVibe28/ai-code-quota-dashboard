import { describe, expect, it } from 'vitest'
import { getAiStudioOAuthDocsUrl } from '../aiStudio'

describe('getAiStudioOAuthDocsUrl', () => {
  it('links each supported language to its guide', () => {
    expect(getAiStudioOAuthDocsUrl('en')).toMatch(/google-ai-studio-oauth\.md$/)
    expect(getAiStudioOAuthDocsUrl('zh-TW')).toMatch(/google-ai-studio-oauth\.zh-tw\.md$/)
    expect(getAiStudioOAuthDocsUrl('zh-CN', 'test-users'))
      .toMatch(/google-ai-studio-oauth\.zh-cn\.md#test-users$/)
  })
})
