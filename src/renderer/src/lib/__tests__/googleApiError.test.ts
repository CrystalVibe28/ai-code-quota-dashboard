import { describe, expect, it } from 'vitest'
import { getGoogleApiEnableUrl } from '../googleApiError'

describe('getGoogleApiEnableUrl', () => {
  it('extracts only a Google API enable link', () => {
    const url = 'https://console.developers.google.com/apis/api/cloudresourcemanager.googleapis.com/overview?project=my-project'

    expect(getGoogleApiEnableUrl(`Enable it by visiting ${url} then retry.`)).toBe(url)
    expect(getGoogleApiEnableUrl('Visit https://example.com/apis/api/test')).toBeNull()
  })
})
