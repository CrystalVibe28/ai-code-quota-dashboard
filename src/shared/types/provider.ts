/**
 * Provider adapter interface for credential and usage management
 *
 * Defines the contract that all provider implementations must follow for handling
 * authentication, credential validation, token refresh, and usage fetching.
 *
 * @template TCredential - The credential type specific to each provider (can be an object, string, or custom type)
 * @template TUsage - The usage/quota response type specific to each provider
 *
 * @example
 * ```typescript
 * // GitHub Copilot: simple accessToken credential
 * type GithubCredential = string // accessToken
 * interface GithubUsage { quotas: Record<string, QuotaSnapshot> }
 *
 * const githubAdapter: ProviderAdapter<GithubCredential, GithubUsage> = {
 *   fetchUsage: async (accessToken) => { ... }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Antigravity: complex account credential
 * const antigravityAdapter: ProviderAdapter<AntigravityAccount, AntigravityUsage> = {
 *   fetchUsage: async (account) => { ... },
 *   refreshToken: async (refreshToken) => { ... }
 * }
 * ```
 */
export interface ProviderAdapter<TCredential, TUsage> {
  /**
   * Fetch current usage/quota information for the provider
   *
   * @param credential - Provider-specific credential (object, token string, API key, etc.)
   * @returns Promise resolving to the usage data
   * @throws Should return null on error rather than throwing
   */
  fetchUsage(credential: TCredential): Promise<TUsage>

  /**
   * Refresh the authentication token (optional)
   *
   * Not all providers support token refresh. Implement only if the provider
   * uses OAuth or similar token-based authentication.
   *
   * @param refreshToken - The refresh token or similar credential to use for refresh
   * @returns Object with new tokens, or null if refresh fails
   */
  refreshToken?(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null>

  /**
   * Authenticate with the provider (optional)
   *
   * Implement for providers that require interactive login (OAuth, web auth flows).
   * Not needed for providers using static API keys or similar.
   *
   * @returns Object with success status
   */
  login?(): Promise<{ success: boolean }>

  /**
   * Validate if the credential is still valid (optional)
   *
   * Useful for checking credential freshness before making API calls.
   * Default: assume credential is valid and attempt to use it.
   *
   * @param credential - Credential to validate
   * @returns Promise resolving to true if credential is valid, false otherwise
   */
  validateCredential?(credential: TCredential): Promise<boolean>
}
