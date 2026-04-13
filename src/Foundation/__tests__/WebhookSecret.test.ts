import { describe, expect, it } from 'vitest'
import { WebhookSecret } from '../Infrastructure/Services/Webhook/WebhookSecret'

describe('WebhookSecret', () => {
  it('應生成新的 webhook secret', () => {
    const secret = WebhookSecret.generate()
    expect(secret.getValue()).toBeTruthy()
    expect(secret.getValue()).toMatch(/^whsec_[a-f0-9]{64}$/)
  })

  it('應從既有值建立', () => {
    const secret = WebhookSecret.fromExisting('whsec_abc123')
    expect(secret.getValue()).toBe('whsec_abc123')
  })

  it('空值應拋出錯誤', () => {
    expect(() => WebhookSecret.fromExisting('')).toThrow('Webhook Secret cannot be empty')
  })

  it('應正確計算 HMAC-SHA256 簽名', () => {
    const secret = WebhookSecret.fromExisting('whsec_test_secret_key')
    const payload = '{"event":"key.revoked","data":{"keyId":"k-1"}}'
    const signature = secret.sign(payload)
    expect(signature).toBeTruthy()
    expect(typeof signature).toBe('string')
    const signature2 = secret.sign(payload)
    expect(signature).toBe(signature2)
  })

  it('不同 payload 應產生不同簽名', () => {
    const secret = WebhookSecret.fromExisting('whsec_test_secret_key')
    const sig1 = secret.sign('payload-1')
    const sig2 = secret.sign('payload-2')
    expect(sig1).not.toBe(sig2)
  })

  it('verify 應驗證簽名正確性', () => {
    const secret = WebhookSecret.fromExisting('whsec_test_secret_key')
    const payload = '{"event":"key.revoked"}'
    const signature = secret.sign(payload)
    expect(secret.verify(payload, signature)).toBe(true)
    expect(secret.verify(payload, 'wrong-signature')).toBe(false)
    expect(secret.verify('tampered-payload', signature)).toBe(false)
  })
})
