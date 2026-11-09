import { describe, it, expect, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getLocale: () => 'en-US', getPath: () => '' }
}))

vi.mock('../storage', () => ({
  StorageService: class {
    isUnlocked() { return false }
  }
}))

import { renderOAuthCallbackPage } from '../oauthCallbackPage'

describe('renderOAuthCallbackPage', () => {
  it('should render success page in Traditional Chinese', () => {
    const html = renderOAuthCallbackPage('success', 'zh-TW')
    expect(html).toContain('<html lang="zh-TW">')
    expect(html).toContain('登入成功')
    expect(html).toContain('<meta charset="utf-8">')
  })

  it('should render error page in Simplified Chinese', () => {
    const html = renderOAuthCallbackPage('stateMismatch', 'zh-CN')
    expect(html).toContain('登录失败')
    expect(html).toContain('安全验证未通过')
  })

  it('should fall back to English for unsupported languages', () => {
    const html = renderOAuthCallbackPage('denied', 'ja')
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('Sign-in cancelled')
  })
})
