// src/Modules/AppModule/__tests__/AppModule.test.ts
import { describe, test, expect } from 'bun:test'
import { AppModule } from '../Domain/Aggregates/AppModule'
import { AppModuleMapper } from '../Infrastructure/Mappers/AppModuleMapper'
import { AppModulePresenter } from '../Application/DTOs/AppModuleDTO'

describe('AppModule', () => {
  test('建立模組', () => {
    const mod = AppModule.create({
      name: 'Chat',
      description: 'AI 聊天模組',
      type: 'paid',
    })
    expect(mod.name).toBe('chat')
    expect(mod.description).toBe('AI 聊天模組')
    expect(mod.type).toBe('paid')
    expect(mod.status).toBe('active')
  })

  test('名稱正規化為小寫', () => {
    const mod = AppModule.create({ name: 'IMAGE-GEN', type: 'paid' })
    expect(mod.name).toBe('image-gen')
  })

  test('空名稱拋出錯誤', () => {
    expect(() => AppModule.create({ name: '', type: 'free' })).toThrow('Module name cannot be empty')
  })

  test('deprecate 回傳新實例', () => {
    const mod = AppModule.create({ name: 'chat', type: 'paid' })
    const deprecated = mod.deprecate()
    expect(deprecated.status).toBe('deprecated')
    expect(deprecated.isActive()).toBe(false)
    expect(mod.status).toBe('active')
  })

  test('isFree / isPaid', () => {
    const free = AppModule.create({ name: 'basic', type: 'free' })
    const paid = AppModule.create({ name: 'pro', type: 'paid' })
    expect(free.isFree()).toBe(true)
    expect(free.isPaid()).toBe(false)
    expect(paid.isPaid()).toBe(true)
  })

  test('fromDatabase 與 AppModuleMapper 往返', () => {
    const original = AppModule.create({ name: 'embedding', type: 'paid', description: '向量嵌入' })
    const row = AppModuleMapper.toDatabaseRow(original)
    const restored = AppModule.fromDatabase(row)
    expect(restored.id).toBe(original.id)
    expect(restored.name).toBe('embedding')
    expect(restored.type).toBe('paid')
  })

  test('AppModulePresenter 輸出', () => {
    const mod = AppModule.create({ name: 'chat', type: 'free' })
    const dto = AppModulePresenter.fromEntity(mod)
    expect(dto.name).toBe('chat')
    expect(dto.type).toBe('free')
    expect(dto.status).toBe('active')
  })
})
