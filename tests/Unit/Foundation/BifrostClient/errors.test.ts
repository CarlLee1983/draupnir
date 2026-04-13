import { describe, expect, it } from 'bun:test'
import { BifrostApiError, isBifrostApiError } from '@draupnir/bifrost-sdk'

describe('BifrostApiError', () => {
  it('should create error with status, endpoint, and message', () => {
    const error = new BifrostApiError(
      404,
      '/api/governance/virtual-keys/vk-1',
      'Virtual key not found',
    )
    expect(error.message).toBe(
      'Bifrost API error 404 on /api/governance/virtual-keys/vk-1: Virtual key not found',
    )
    expect(error.status).toBe(404)
    expect(error.endpoint).toBe('/api/governance/virtual-keys/vk-1')
    expect(error.name).toBe('BifrostApiError')
  })

  it('should include optional response body', () => {
    const body = { error: 'not found' }
    const error = new BifrostApiError(404, '/api/test', 'Not found', body)
    expect(error.responseBody).toEqual(body)
  })

  it('should be instanceof Error', () => {
    const error = new BifrostApiError(500, '/api/test', 'Server error')
    expect(error instanceof Error).toBe(true)
  })

  it('should identify retryable errors', () => {
    const error429 = new BifrostApiError(429, '/api/test', 'Rate limited')
    expect(error429.isRetryable).toBe(true)

    const error500 = new BifrostApiError(500, '/api/test', 'Server error')
    expect(error500.isRetryable).toBe(true)

    const error502 = new BifrostApiError(502, '/api/test', 'Bad gateway')
    expect(error502.isRetryable).toBe(true)

    const error503 = new BifrostApiError(503, '/api/test', 'Unavailable')
    expect(error503.isRetryable).toBe(true)

    const error400 = new BifrostApiError(400, '/api/test', 'Bad request')
    expect(error400.isRetryable).toBe(false)

    const error404 = new BifrostApiError(404, '/api/test', 'Not found')
    expect(error404.isRetryable).toBe(false)
  })

  it('should be identifiable via type guard', () => {
    const bifrostError = new BifrostApiError(500, '/api/test', 'fail')
    const genericError = new Error('generic')
    expect(isBifrostApiError(bifrostError)).toBe(true)
    expect(isBifrostApiError(genericError)).toBe(false)
    expect(isBifrostApiError(null)).toBe(false)
  })
})
