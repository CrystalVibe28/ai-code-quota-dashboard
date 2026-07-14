import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('electron', () => ({
  BrowserWindow: class {},
  Notification: class {}
}))

import { NotificationService } from '../notification'

describe('NotificationService', () => {
  const service = NotificationService.getInstance()
  const settings = {
    notifications: true,
    notificationThresholds: [{ value: 25, enabled: true }],
    language: 'en'
  }
  const filters = { hideUnlimitedQuota: false, hiddenCardIds: new Set<string>() }

  beforeEach(() => service.resetState())

  it('removes state for cards absent from the latest quota data', () => {
    service.checkAndNotify(
      [{ accountId: 'removed', email: 'test@example.com', usage: [{ modelName: 'model', remainingFraction: 0.2 }] }] as never,
      [], [], [], [], settings, filters
    )

    service.checkAndNotify([], [], [], [], [], settings, filters)

    expect(service.getState()).toEqual(new Map())
  })
})
