// Matches the main-process errors that ask for a new Claude sign-in (missing, rejected, or under-scoped tokens).
export function isClaudeSignInRequired(error: string): boolean {
  return /claude sign-in/i.test(error)
}
