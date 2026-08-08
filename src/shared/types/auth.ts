export type StorageUnlockResult =
  | { success: true }
  | {
      success: false
      reason: 'invalid-password' | 'password-not-skipped' | 'data-version-too-new'
    }
