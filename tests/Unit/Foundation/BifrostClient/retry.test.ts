import { describe, it, expect } from 'bun:test'
import { withRetry, BifrostApiError } from '@draupnir/bifrost-sdk'

describe('withRetry', () => {
  it('should return result on first success', async () => {
    let callCount = 0
    const result = await withRetry(async () => {
      callCount++
      return 'success'
    })
    expect(result).toBe('success')
    expect(callCount).toBe(1)
  })

  it('should retry on retryable BifrostApiError and succeed', async () => {
    let callCount = 0
    const result = await withRetry(
      async () => {
        callCount++
        if (callCount < 3) {
          throw new BifrostApiError(500, '/api/test', 'Server error')
        }
        return 'recovered'
      },
      { maxRetries: 3, baseDelayMs: 1 },
    )
    expect(result).toBe('recovered')
    expect(callCount).toBe(3)
  })

  it('should retry on 429', async () => {
    let callCount = 0
    const result = await withRetry(
      async () => {
        callCount++
        if (callCount < 2) {
          throw new BifrostApiError(429, '/api/test', 'Rate limited')
        }
        return 'ok'
      },
      { maxRetries: 3, baseDelayMs: 1 },
    )
    expect(result).toBe('ok')
    expect(callCount).toBe(2)
  })

  it('should NOT retry on non-retryable BifrostApiError', async () => {
    let callCount = 0
    try {
      await withRetry(
        async () => {
          callCount++
          throw new BifrostApiError(400, '/api/test', 'Bad request')
        },
        { maxRetries: 3, baseDelayMs: 1 },
      )
    } catch (error) {
      expect(callCount).toBe(1)
      expect(error instanceof BifrostApiError).toBe(true)
    }
  })

  it('should retry on network errors (non-BifrostApiError)', async () => {
    let callCount = 0
    const result = await withRetry(
      async () => {
        callCount++
        if (callCount < 2) {
          throw new TypeError('fetch failed')
        }
        return 'recovered'
      },
      { maxRetries: 3, baseDelayMs: 1 },
    )
    expect(result).toBe('recovered')
    expect(callCount).toBe(2)
  })

  it('should throw after exhausting retries', async () => {
    let callCount = 0
    try {
      await withRetry(
        async () => {
          callCount++
          throw new BifrostApiError(500, '/api/test', 'Server error')
        },
        { maxRetries: 3, baseDelayMs: 1 },
      )
      expect(true).toBe(false) // should not reach here
    } catch (error) {
      expect(callCount).toBe(4) // 1 initial + 3 retries
      expect(error instanceof BifrostApiError).toBe(true)
    }
  })
})
