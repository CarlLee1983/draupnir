import { describe, expect, it } from 'bun:test'
import { UserProfile } from '../Domain/Aggregates/UserProfile'
import { UserProfileMapper } from '../Infrastructure/Mappers/UserProfileMapper'

describe('UserProfile Aggregate', () => {
  it('應成功建立空白 Profile', () => {
    const profile = UserProfile.createDefault('user-123', 'user@example.com')
    expect(profile.id).toEqual(expect.any(String))
    expect(profile.displayName).toBe('user@example.com')
    expect(profile.timezone).toBe('Asia/Taipei')
    expect(profile.locale).toBe('zh-TW')
    expect(profile.avatarUrl).toBeNull()
    expect(profile.phone).toBeNull()
    expect(profile.bio).toBeNull()
  })

  it('updateProfile 應回傳新物件（immutable）', () => {
    const profile = UserProfile.createDefault('user-123', 'user@example.com')
    const updated = profile.updateProfile({
      displayName: '新名稱',
      bio: '個人簡介',
    })
    expect(updated.displayName).toBe('新名稱')
    expect(updated.bio).toBe('個人簡介')
    // 原始物件不變
    expect(profile.displayName).toBe('user@example.com')
    expect(profile.bio).toBeNull()
  })

  it('應可從資料庫重建', () => {
    const profile = UserProfileMapper.fromDatabase({
      id: 'user-123',
      display_name: '測試使用者',
      avatar_url: 'https://example.com/avatar.jpg',
      phone: '+886912345678',
      bio: 'Hello',
      timezone: 'Asia/Tokyo',
      locale: 'en',
      notification_preferences: JSON.stringify({ email: true }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    expect(profile.id).toBe('user-123')
    expect(profile.displayName).toBe('測試使用者')
    expect(profile.avatarUrl).toBe('https://example.com/avatar.jpg')
    expect(profile.phone).toBe('+886912345678')
    expect(profile.timezone).toBe('Asia/Tokyo')
    expect(profile.locale).toBe('en')
    expect(profile.notificationPreferences).toEqual({ email: true })
  })

  it('toDTO 應回傳完整資料', () => {
    const profile = UserProfile.createDefault('user-123', 'user@example.com')
    const dto = UserProfileMapper.toDTO(profile)
    expect(dto.id).toBe(profile.id)
    expect(dto.displayName).toBe('user@example.com')
    expect(dto.timezone).toBe('Asia/Taipei')
  })
})
