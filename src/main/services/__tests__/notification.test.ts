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
  const filters = { hideUnlimitedQuota: false, cards: {}, providers: {} }

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

  it('uses account and mixed-state defaults for new cards', () => {
    service.checkAndNotify(
      [
        {
          accountId: 'hidden-account',
          email: 'hidden@example.com',
          usage: [{ modelName: 'new-hidden', remainingFraction: 0.2 }]
        },
        {
          accountId: 'mixed-account',
          email: 'mixed@example.com',
          usage: [
            { modelName: 'visible', remainingFraction: 0.2 },
            { modelName: 'hidden', remainingFraction: 0.2 },
            { modelName: 'new-visible', remainingFraction: 0.2 }
          ]
        }
      ] as never,
      [], [], [], [], settings,
      {
        hideUnlimitedQuota: false,
        cards: {
          'antigravity-mixed-account-visible': { visible: true },
          'antigravity-mixed-account-hidden': { visible: false }
        },
        providers: {
          antigravity: {
            accountCardVisibility: {
              'hidden-account': false,
              'mixed-account': false
            }
          }
        }
      }
    )

    expect([...service.getState().keys()]).toEqual([
      'antigravity-mixed-account-visible',
      'antigravity-mixed-account-new-visible'
    ])
  })
})
