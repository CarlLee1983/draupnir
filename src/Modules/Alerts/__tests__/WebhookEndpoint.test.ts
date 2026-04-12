import { describe, expect, it } from 'vitest'
import { WebhookEndpoint } from '../Domain/Aggregates/WebhookEndpoint'

describe('WebhookEndpoint', () => {
  it('creates immutable endpoints with secret and timestamps', () => {
    const endpoint = WebhookEndpoint.create('org-1', 'https://example.com/hook', 'Primary')

    expect(endpoint.id).toBeTruthy()
    expect(endpoint.orgId).toBe('org-1')
    expect(endpoint.url).toBe('https://example.com/hook')
    expect(endpoint.secret).toMatch(/^whsec_[a-f0-9]{64}$/)
    expect(endpoint.active).toBe(true)
    expect(endpoint.description).toBe('Primary')
    expect(endpoint.createdAt).toBeTruthy()
    expect(endpoint.lastSuccessAt).toBeNull()
    expect(endpoint.lastFailureAt).toBeNull()
  })

  it('returns new instances when toggled or updated', () => {
    const endpoint = WebhookEndpoint.create('org-1', 'https://example.com/hook', 'Primary')

    const deactivated = endpoint.deactivate()
    const renamed = endpoint.withDescription('Secondary')
    const reactivated = deactivated.activate()
    const rotated = endpoint.rotateSecret()
    const success = endpoint.recordSuccess('2026-04-12T00:00:00.000Z')
    const failure = endpoint.recordFailure('2026-04-12T01:00:00.000Z')

    expect(deactivated).not.toBe(endpoint)
    expect(deactivated.active).toBe(false)
    expect(endpoint.active).toBe(true)
    expect(renamed).not.toBe(endpoint)
    expect(renamed.description).toBe('Secondary')
    expect(endpoint.description).toBe('Primary')
    expect(reactivated.active).toBe(true)
    expect(rotated.secret).not.toBe(endpoint.secret)
    expect(success.lastSuccessAt).toBe('2026-04-12T00:00:00.000Z')
    expect(failure.lastFailureAt).toBe('2026-04-12T01:00:00.000Z')
  })

  it('rehydrates persisted values without mutation side effects', () => {
    const endpoint = WebhookEndpoint.rehydrate({
      id: 'endpoint-1',
      orgId: 'org-1',
      url: 'https://example.com/hook',
      secret: 'whsec_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      active: false,
      description: null,
      createdAt: '2026-04-12T00:00:00.000Z',
      lastSuccessAt: '2026-04-12T01:00:00.000Z',
      lastFailureAt: null,
    })

    expect(endpoint.active).toBe(false)
    expect(endpoint.lastSuccessAt).toBe('2026-04-12T01:00:00.000Z')
  })
})
