import { describe, expect, it } from 'vitest'
import { toCreatedDTO, toListDTO } from '../Application/DTOs/WebhookEndpointDTO'
import { WebhookEndpoint } from '../Domain/Aggregates/WebhookEndpoint'

describe('WebhookEndpointDTO', () => {
  it('omits plaintext secrets from the list DTO', () => {
    const endpoint = WebhookEndpoint.create('org-1', 'https://example.com/hook', 'Primary')
    const dto = toListDTO(endpoint)

    expect(Object.keys(dto)).not.toContain('secret')
    expect('secret' in dto).toBe(false)
    expect(dto.secretMask).toBe(`whsec_****${endpoint.secret.slice(-4)}`)
  })

  it('exposes the plaintext secret exactly once in the created DTO', () => {
    const endpoint = WebhookEndpoint.create('org-1', 'https://example.com/hook', 'Primary')
    const plaintextSecret = 'whsec_testsecret'
    const dto = toCreatedDTO(endpoint, plaintextSecret)

    expect(dto.secret).toBe(plaintextSecret)
    expect(Object.keys(dto)).toContain('secret')
    expect(Object.keys(dto)).not.toContain('secretMask')
  })
})
