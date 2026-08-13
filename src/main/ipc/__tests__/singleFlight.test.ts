import { describe, expect, it, vi } from 'vitest'
import { singleFlight } from '../utils/singleFlight'

describe('singleFlight', () => {
  it('shares an in-flight operation and allows the next run after it settles', async () => {
    let resolve!: (value: number) => void
    const operation = vi.fn(() => new Promise<number>(done => {
      resolve = done
    }))
    const run = singleFlight(operation)

    const first = run()
    const second = run()
    await vi.waitFor(() => expect(operation).toHaveBeenCalledTimes(1))

    resolve(1)
    await expect(Promise.all([first, second])).resolves.toEqual([1, 1])

    const third = run()
    await vi.waitFor(() => expect(operation).toHaveBeenCalledTimes(2))
    resolve(2)
    await expect(third).resolves.toBe(2)
  })

  it('clears a rejected operation so a later run can retry', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce('recovered')
    const run = singleFlight(operation)

    await expect(run()).rejects.toThrow('temporary')
    await expect(run()).resolves.toBe('recovered')
    expect(operation).toHaveBeenCalledTimes(2)
  })
})
