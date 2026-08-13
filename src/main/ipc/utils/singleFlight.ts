export function singleFlight<T>(operation: () => Promise<T>): () => Promise<T> {
  let inFlight: Promise<T> | null = null

  return () => {
    if (inFlight) return inFlight

    let current!: Promise<T>
    current = Promise.resolve()
      .then(operation)
      .finally(() => {
        if (inFlight === current) inFlight = null
      })
    inFlight = current
    return current
  }
}
