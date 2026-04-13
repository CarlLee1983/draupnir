import { describe, expect, it } from 'vitest'
import { KeyHashingService } from '@/Shared/Infrastructure/Services/KeyHashingService'
import { KeyHash } from '../Domain/ValueObjects/KeyHash'

describe('KeyHash', () => {
  it('應從已有 hash 重建', () => {
    const hash = 'a'.repeat(64)
    const kh = KeyHash.fromExisting(hash)
    expect(kh.getValue()).toBe(hash)
  })

  it('hash 不可為空', () => {
    expect(() => KeyHash.fromExisting('')).toThrow('Key hash cannot be empty')
  })

  it('equals 應正確比對', () => {
    const hash = 'b'.repeat(64)
    const kh1 = KeyHash.fromExisting(hash)
    const kh2 = KeyHash.fromExisting(hash)
    expect(kh1.equals(kh2)).toBe(true)
  })

  it('不同 hash 應不相等', () => {
    const kh1 = KeyHash.fromExisting('a'.repeat(64))
    const kh2 = KeyHash.fromExisting('b'.repeat(64))
    expect(kh1.equals(kh2)).toBe(false)
  })

  it('toString 應回傳 hash 值', () => {
    const hash = 'c'.repeat(64)
    const kh = KeyHash.fromExisting(hash)
    expect(kh.toString()).toBe(hash)
  })
})

describe('KeyHashingService', () => {
  const service = new KeyHashingService()

  it('應從原始 key 產生 SHA-256 hash', async () => {
    const result = await service.hash('drp_sk_test123')
    expect(result).toMatch(/^[a-f0-9]{64}$/)
  })

  it('相同 key 應產生相同 hash', async () => {
    const h1 = await service.hash('drp_sk_abc')
    const h2 = await service.hash('drp_sk_abc')
    expect(h1).toBe(h2)
  })

  it('不同 key 應產生不同 hash', async () => {
    const h1 = await service.hash('drp_sk_abc')
    const h2 = await service.hash('drp_sk_xyz')
    expect(h1).not.toBe(h2)
  })
})
