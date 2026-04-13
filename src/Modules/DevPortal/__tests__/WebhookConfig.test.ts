import { describe, expect, it } from 'vitest'
import { WebhookConfig } from '../Domain/Entities/WebhookConfig'
import { WebhookConfigMapper } from '../Infrastructure/Mappers/WebhookConfigMapper'

describe('WebhookConfig', () => {
  it('應建立新的 WebhookConfig（預設啟用）', () => {
    const config = WebhookConfig.create({
      id: 'wh-1',
      applicationId: 'app-1',
      eventType: 'usage.threshold',
    })
    expect(config.id).toBe('wh-1')
    expect(config.applicationId).toBe('app-1')
    expect(config.eventType).toBe('usage.threshold')
    expect(config.enabled).toBe(true)
  })

  it('無效事件類型應拋出錯誤', () => {
    expect(() =>
      WebhookConfig.create({
        id: 'wh-2',
        applicationId: 'app-1',
        eventType: 'invalid.event',
      }),
    ).toThrow('Invalid Webhook event type')
  })

  it('應啟用/停用 webhook', () => {
    const config = WebhookConfig.create({
      id: 'wh-3',
      applicationId: 'app-1',
      eventType: 'key.revoked',
    })
    const disabled = config.disable()
    expect(disabled.enabled).toBe(false)
    const enabled = disabled.enable()
    expect(enabled.enabled).toBe(true)
  })

  it('WebhookConfigMapper.toDatabaseRow 應正確轉換', () => {
    const config = WebhookConfig.create({
      id: 'wh-4',
      applicationId: 'app-1',
      eventType: 'credit.low',
    })
    const row = WebhookConfigMapper.toDatabaseRow(config)
    expect(row.id).toBe('wh-4')
    expect(row.application_id).toBe('app-1')
    expect(row.event_type).toBe('credit.low')
    expect(row.enabled).toBe(true)
    expect(row.created_at).toBeTruthy()
    expect(row.updated_at).toBeTruthy()
  })

  it('fromDatabase 應正確重建', () => {
    const config = WebhookConfig.create({
      id: 'wh-5',
      applicationId: 'app-1',
      eventType: 'key.expiring',
    })
    const row = WebhookConfigMapper.toDatabaseRow(config)
    const rebuilt = WebhookConfig.fromDatabase(row)
    expect(rebuilt.id).toBe('wh-5')
    expect(rebuilt.applicationId).toBe('app-1')
    expect(rebuilt.eventType).toBe('key.expiring')
    expect(rebuilt.enabled).toBe(true)
  })
})
