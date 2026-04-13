// src/Modules/AppModule/__tests__/ModuleSubscription.test.ts
import { describe, expect, test } from 'bun:test'
import { ModuleSubscriptionPresenter } from '../Application/DTOs/AppModuleDTO'
import { ModuleSubscription } from '../Domain/Entities/ModuleSubscription'
import { ModuleSubscriptionMapper } from '../Infrastructure/Mappers/ModuleSubscriptionMapper'

describe('ModuleSubscription', () => {
  test('建立訂閱', () => {
    const sub = ModuleSubscription.create('org-1', 'mod-1')
    expect(sub.orgId).toBe('org-1')
    expect(sub.moduleId).toBe('mod-1')
    expect(sub.status).toBe('active')
    expect(sub.isActive()).toBe(true)
  })

  test('suspend 暫停訂閱', () => {
    const sub = ModuleSubscription.create('org-1', 'mod-1')
    const suspended = sub.suspend()
    expect(suspended.status).toBe('suspended')
    expect(sub.status).toBe('active') // immutable
  })

  test('reactivate 重新啟用', () => {
    const sub = ModuleSubscription.create('org-1', 'mod-1').suspend()
    const reactivated = sub.reactivate()
    expect(reactivated.status).toBe('active')
  })

  test('cancel 取消訂閱', () => {
    const sub = ModuleSubscription.create('org-1', 'mod-1')
    const cancelled = sub.cancel()
    expect(cancelled.status).toBe('cancelled')
  })

  test('cancelled 不可重新啟用', () => {
    const cancelled = ModuleSubscription.create('org-1', 'mod-1').cancel()
    expect(() => cancelled.reactivate()).toThrow()
  })

  test('fromDatabase 與 toDatabaseRow 往返', () => {
    const original = ModuleSubscription.create('org-1', 'mod-1')
    const row = ModuleSubscriptionMapper.toDatabaseRow(original)
    const restored = ModuleSubscription.fromDatabase(row)
    expect(restored.id).toBe(original.id)
    expect(restored.orgId).toBe('org-1')
    expect(restored.moduleId).toBe('mod-1')
    expect(restored.status).toBe('active')
  })

  test('ModuleSubscriptionPresenter 輸出', () => {
    const sub = ModuleSubscription.create('org-1', 'mod-1')
    const dto = ModuleSubscriptionPresenter.fromEntity(sub)
    expect(dto.orgId).toBe('org-1')
    expect(dto.moduleId).toBe('mod-1')
    expect(dto.status).toBe('active')
  })
})
