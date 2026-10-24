export function isOllamaCloudSessionExpired(error: string): boolean {
  return /session expired/i.test(error)
}
