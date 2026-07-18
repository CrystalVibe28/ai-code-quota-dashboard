import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAiStudioStore } from '../useAiStudioStore'
import { mockWindowApi } from '../../../../test/mocks/window-api'

describe('useAiStudioStore', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses the Google user and project as the account identity', async () => {
    const project = { projectId: 'my-project-123', projectNumber: '123456789', name: 'My Project' }
    const session = {
      userId: 'google-user-1',
      email: 'user@example.com',
      name: 'User',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: Date.now() + 3600000,
      projects: [project]
    }

    await useAiStudioStore.getState().addAccount(session, project, 'My AI Studio')

    expect(mockWindowApi.storage.saveAccount).toHaveBeenCalledWith(
      'aiStudio',
      expect.objectContaining({
        id: 'google-user-1:my-project-123',
        userId: 'google-user-1',
        projectId: 'my-project-123',
        tier: 'free'
      })
    )
  })
})
