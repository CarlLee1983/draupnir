import { describe, expect, it } from 'vitest'
import { WEBHOOK_EVENT_TYPES, WebhookEventType } from '../Domain/ValueObjects/WebhookEventType'

describe('WebhookEventType', () => {
  it('應建立 usage.threshold 事件', () => {
    const event = WebhookEventType.usageThreshold()
    expect(event.getValue()).toBe('usage.threshold')
  })

  it('應建立 key.expiring 事件', () => {
    const event = WebhookEventType.keyExpiring()
    expect(event.getValue()).toBe('key.expiring')
  })

  it('應建立 key.revoked 事件', () => {
    const event = WebhookEventType.keyRevoked()
    expect(event.getValue()).toBe('key.revoked')
  })

  it('應建立 credit.low 事件', () => {
    const event = WebhookEventType.creditLow()
    expect(event.getValue()).toBe('credit.low')
  })

  it('應從字串建立事件類型', () => {
    const event = WebhookEventType.from('key.revoked')
    expect(event.getValue()).toBe('key.revoked')
  })

  it('無效值應拋出錯誤', () => {
    expect(() => WebhookEventType.from('invalid.event')).toThrow('Invalid Webhook event type')
  })

  it('應匯出所有有效事件類型清單', () => {
    expect(WEBHOOK_EVENT_TYPES).toEqual([
      'usage.threshold',
      'key.expiring',
      'key.revoked',
      'credit.low',
    ])
  })
})
