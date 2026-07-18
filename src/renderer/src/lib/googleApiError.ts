export function getGoogleApiEnableUrl(error: string): string | null {
  const match = error.match(/https:\/\/console(?:\.developers)?\.google\.com\/apis\/[^\s"<>]+/i)
  if (!match) return null

  try {
    const url = new URL(match[0].replace(/[),.;]+$/, ''))
    return ['console.google.com', 'console.developers.google.com'].includes(url.hostname)
      ? url.toString()
      : null
  } catch {
    return null
  }
}
