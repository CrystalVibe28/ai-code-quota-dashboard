import { describe, expect, it } from 'vitest'
import {
  getGoogleApiEnableUrl,
  isGoogleOAuthReauthorizationRequired
} from '../googleApiError'

describe('getGoogleApiEnableUrl', () => {
  it('extracts only a Google API enable link', () => {
    const url = 'https://console.developers.google.com/apis/api/cloudresourcemanager.googleapis.com/overview?project=my-project'

    expect(getGoogleApiEnableUrl(`Enable it by visiting ${url} then retry.`)).toBe(url)
    expect(getGoogleApiEnableUrl('Visit https://example.com/apis/api/test')).toBeNull()
  })

  it('recognizes only Google OAuth errors that require a new login', () => {
    expect(isGoogleOAuthReauthorizationRequired('Token refresh failed: 400 (invalid_grant)')).toBe(true)
    expect(isGoogleOAuthReauthorizationRequired('invalid_rapt')).toBe(true)
    expect(isGoogleOAuthReauthorizationRequired('TypeError: fetch failed')).toBe(false)
  })
})
