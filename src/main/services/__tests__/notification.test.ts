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

  it('tracks Zai 5-hour and weekly quotas separately', () => {
    service.checkAndNotify(
      [], [], [{
        accountId: 'zai-account',
        name: 'Zai User',
        usage: {
          limits: [
            { type: 'TOKENS_LIMIT', unit: 3, number: 5, percentage: 80 },
            { type: 'TOKENS_LIMIT', unit: 6, number: 1, percentage: 80 }
          ]
        }
      }], [], [], settings, filters
    )

    expect([...service.getState().keys()]).toEqual([
      'zaiCoding-zai-account-TOKENS_LIMIT-3-5',
      'zaiCoding-zai-account-TOKENS_LIMIT-6-1'
    ])
  })
})
