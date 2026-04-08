# Phase 2B: User 模組 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 User Profile 模組 — Profile CRUD、使用者列表（Admin）、帳戶啟停管理

**Architecture:** 獨立的 User 模組，與 Auth 模組分離（Auth 負責身份驗證，User 負責 Profile 資料）。Profile 在使用者註冊時自動建立。依賴 Auth 模組的 Repository 和 RoleMiddleware。

**Tech Stack:** Bun, TypeScript, Vitest, Gravito DDD Framework

**前置條件：** Phase 2A（Auth 補完）已完成

---

## File Structure

### 新建檔案
- `src/Modules/User/Domain/Aggregates/UserProfile.ts` — UserProfile Aggregate
- `src/Modules/User/Domain/ValueObjects/Phone.ts` — Phone VO
- `src/Modules/User/Domain/ValueObjects/Timezone.ts` — Timezone VO
- `src/Modules/User/Domain/ValueObjects/Locale.ts` — Locale VO
- `src/Modules/User/Domain/Repositories/IUserProfileRepository.ts` — Repository 介面
- `src/Modules/User/Application/DTOs/UserProfileDTO.ts` — DTO
- `src/Modules/User/Application/Services/GetUserProfileService.ts`
- `src/Modules/User/Application/Services/UpdateUserProfileService.ts`
- `src/Modules/User/Application/Services/ListUsersService.ts`
- `src/Modules/User/Application/Services/ChangeUserStatusService.ts`
- `src/Modules/User/Infrastructure/Repositories/UserProfileRepository.ts`
- `src/Modules/User/Infrastructure/Providers/UserServiceProvider.ts`
- `src/Modules/User/Presentation/Controllers/UserController.ts`
- `src/Modules/User/Presentation/Routes/user.routes.ts`
- `src/Modules/User/index.ts`
- `src/Modules/User/__tests__/UserProfile.test.ts`
- `src/Modules/User/__tests__/Phone.test.ts`
- `src/Modules/User/__tests__/GetUserProfileService.test.ts`
- `src/Modules/User/__tests__/UpdateUserProfileService.test.ts`
- `src/Modules/User/__tests__/ListUsersService.test.ts`
- `src/Modules/User/__tests__/ChangeUserStatusService.test.ts`

### 修改檔案
- `src/Modules/Auth/Application/Services/RegisterUserService.ts` — 註冊後自動建立 Profile
- `src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts` — 注入 Profile Repository
- `src/bootstrap.ts` — 註冊 UserServiceProvider
- `src/routes.ts` — 註冊 User 路由
- `src/wiring/index.ts` — 新增 registerUser

---

### Task 1: UserProfile Domain — Value Objects

**Files:**
- Create: `src/Modules/User/Domain/ValueObjects/Phone.ts`
- Create: `src/Modules/User/Domain/ValueObjects/Timezone.ts`
- Create: `src/Modules/User/Domain/ValueObjects/Locale.ts`
- Test: `src/Modules/User/__tests__/Phone.test.ts`

- [ ] **Step 1: 寫 Phone 測試**

```typescript
// src/Modules/User/__tests__/Phone.test.ts
import { describe, it, expect } from 'vitest'
import { Phone } from '../Domain/ValueObjects/Phone'

describe('Phone Value Object', () => {
  it('應接受有效的電話號碼', () => {
    const phone = new Phone('+886912345678')
    expect(phone.getValue()).toBe('+886912345678')
  })

  it('應接受含空格和橫線的號碼', () => {
    const phone = new Phone('+886-912-345-678')
    expect(phone.getValue()).toBe('+886912345678')
  })

  it('應接受空值（選填欄位）', () => {
    const phone = Phone.fromNullable(null)
    expect(phone).toBeNull()
  })

  it('應接受空字串（選填欄位）', () => {
    const phone = Phone.fromNullable('')
    expect(phone).toBeNull()
  })

  it('應拒絕太短的號碼', () => {
    expect(() => new Phone('123')).toThrow()
  })

  it('應拒絕太長的號碼', () => {
    expect(() => new Phone('+8869999999999999999')).toThrow()
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `bun test src/Modules/User/__tests__/Phone.test.ts`
Expected: FAIL

- [ ] **Step 3: 實作 Phone VO**

```typescript
// src/Modules/User/Domain/ValueObjects/Phone.ts
export class Phone {
  private readonly value: string

  constructor(phone: string) {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '')
    if (!this.isValid(cleaned)) {
      throw new Error(`無效的電話號碼格式: ${phone}`)
    }
    this.value = cleaned
  }

  static fromNullable(phone: string | null | undefined): Phone | null {
    if (!phone || phone.trim() === '') return null
    return new Phone(phone)
  }

  private isValid(phone: string): boolean {
    const phoneRegex = /^\+?[0-9]{7,15}$/
    return phoneRegex.test(phone)
  }

  getValue(): string {
    return this.value
  }

  equals(other: Phone): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
```

- [ ] **Step 4: 實作 Timezone VO**

```typescript
// src/Modules/User/Domain/ValueObjects/Timezone.ts
const VALID_TIMEZONES = Intl.supportedValuesOf('timeZone')

export class Timezone {
  private readonly value: string

  constructor(timezone: string) {
    if (!VALID_TIMEZONES.includes(timezone)) {
      throw new Error(`無效的時區: ${timezone}`)
    }
    this.value = timezone
  }

  static default(): Timezone {
    return new Timezone('Asia/Taipei')
  }

  getValue(): string {
    return this.value
  }

  equals(other: Timezone): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
```

- [ ] **Step 5: 實作 Locale VO**

```typescript
// src/Modules/User/Domain/ValueObjects/Locale.ts
const SUPPORTED_LOCALES = ['zh-TW', 'en', 'ja', 'ko'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

export class Locale {
  private readonly value: SupportedLocale

  constructor(locale: string) {
    if (!SUPPORTED_LOCALES.includes(locale as SupportedLocale)) {
      throw new Error(`不支援的語系: ${locale}，支援: ${SUPPORTED_LOCALES.join(', ')}`)
    }
    this.value = locale as SupportedLocale
  }

  static default(): Locale {
    return new Locale('zh-TW')
  }

  getValue(): SupportedLocale {
    return this.value
  }

  equals(other: Locale): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
```

- [ ] **Step 6: 執行測試確認通過**

Run: `bun test src/Modules/User/__tests__/Phone.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/Modules/User/Domain/ValueObjects/
git commit -m "feat: [user] 新增 Phone、Timezone、Locale Value Objects"
```

---

### Task 2: UserProfile Aggregate

**Files:**
- Create: `src/Modules/User/Domain/Aggregates/UserProfile.ts`
- Test: `src/Modules/User/__tests__/UserProfile.test.ts`

- [ ] **Step 1: 寫 UserProfile 測試**

```typescript
// src/Modules/User/__tests__/UserProfile.test.ts
import { describe, it, expect } from 'vitest'
import { UserProfile } from '../Domain/Aggregates/UserProfile'

describe('UserProfile Aggregate', () => {
  it('應成功建立空白 Profile', () => {
    const profile = UserProfile.createDefault('user-123', 'user@example.com')
    expect(profile.id).toBe('user-123')
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
    const profile = UserProfile.fromDatabase({
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
    const dto = profile.toDTO()
    expect(dto.id).toBe('user-123')
    expect(dto.displayName).toBe('user@example.com')
    expect(dto.timezone).toBe('Asia/Taipei')
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `bun test src/Modules/User/__tests__/UserProfile.test.ts`
Expected: FAIL

- [ ] **Step 3: 實作 UserProfile Aggregate**

```typescript
// src/Modules/User/Domain/Aggregates/UserProfile.ts
interface UserProfileProps {
  id: string
  displayName: string
  avatarUrl: string | null
  phone: string | null
  bio: string | null
  timezone: string
  locale: string
  notificationPreferences: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface UpdateProfileFields {
  displayName?: string
  avatarUrl?: string | null
  phone?: string | null
  bio?: string | null
  timezone?: string
  locale?: string
  notificationPreferences?: Record<string, unknown>
}

export class UserProfile {
  private readonly props: UserProfileProps

  private constructor(props: UserProfileProps) {
    this.props = props
  }

  static createDefault(userId: string, email: string): UserProfile {
    return new UserProfile({
      id: userId,
      displayName: email,
      avatarUrl: null,
      phone: null,
      bio: null,
      timezone: 'Asia/Taipei',
      locale: 'zh-TW',
      notificationPreferences: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static fromDatabase(row: Record<string, unknown>): UserProfile {
    const prefs = row.notification_preferences
    let parsedPrefs: Record<string, unknown> = {}
    if (typeof prefs === 'string') {
      try { parsedPrefs = JSON.parse(prefs) } catch { parsedPrefs = {} }
    } else if (typeof prefs === 'object' && prefs !== null) {
      parsedPrefs = prefs as Record<string, unknown>
    }

    return new UserProfile({
      id: row.id as string,
      displayName: (row.display_name as string) || '',
      avatarUrl: (row.avatar_url as string) || null,
      phone: (row.phone as string) || null,
      bio: (row.bio as string) || null,
      timezone: (row.timezone as string) || 'Asia/Taipei',
      locale: (row.locale as string) || 'zh-TW',
      notificationPreferences: parsedPrefs,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    })
  }

  updateProfile(fields: UpdateProfileFields): UserProfile {
    return new UserProfile({
      ...this.props,
      ...(fields.displayName !== undefined && { displayName: fields.displayName }),
      ...(fields.avatarUrl !== undefined && { avatarUrl: fields.avatarUrl }),
      ...(fields.phone !== undefined && { phone: fields.phone }),
      ...(fields.bio !== undefined && { bio: fields.bio }),
      ...(fields.timezone !== undefined && { timezone: fields.timezone }),
      ...(fields.locale !== undefined && { locale: fields.locale }),
      ...(fields.notificationPreferences !== undefined && { notificationPreferences: fields.notificationPreferences }),
      updatedAt: new Date(),
    })
  }

  // Getters
  get id(): string { return this.props.id }
  get displayName(): string { return this.props.displayName }
  get avatarUrl(): string | null { return this.props.avatarUrl }
  get phone(): string | null { return this.props.phone }
  get bio(): string | null { return this.props.bio }
  get timezone(): string { return this.props.timezone }
  get locale(): string { return this.props.locale }
  get notificationPreferences(): Record<string, unknown> { return this.props.notificationPreferences }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  toDatabaseRow(): Record<string, unknown> {
    return {
      id: this.props.id,
      display_name: this.props.displayName,
      avatar_url: this.props.avatarUrl,
      phone: this.props.phone,
      bio: this.props.bio,
      timezone: this.props.timezone,
      locale: this.props.locale,
      notification_preferences: JSON.stringify(this.props.notificationPreferences),
      created_at: this.props.createdAt.toISOString(),
      updated_at: this.props.updatedAt.toISOString(),
    }
  }

  toDTO(): Record<string, unknown> {
    return {
      id: this.props.id,
      displayName: this.props.displayName,
      avatarUrl: this.props.avatarUrl,
      phone: this.props.phone,
      bio: this.props.bio,
      timezone: this.props.timezone,
      locale: this.props.locale,
      notificationPreferences: this.props.notificationPreferences,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    }
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `bun test src/Modules/User/__tests__/UserProfile.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/Modules/User/Domain/Aggregates/UserProfile.ts src/Modules/User/__tests__/UserProfile.test.ts
git commit -m "feat: [user] 新增 UserProfile Aggregate"
```

---

### Task 3: UserProfile Repository

**Files:**
- Create: `src/Modules/User/Domain/Repositories/IUserProfileRepository.ts`
- Create: `src/Modules/User/Infrastructure/Repositories/UserProfileRepository.ts`
- Create: `src/Modules/User/Application/DTOs/UserProfileDTO.ts`

- [ ] **Step 1: 建立 IUserProfileRepository**

```typescript
// src/Modules/User/Domain/Repositories/IUserProfileRepository.ts
import type { UserProfile } from '../Aggregates/UserProfile'

export interface UserProfileFilters {
  role?: string
  status?: string
  keyword?: string
}

export interface IUserProfileRepository {
  findById(id: string): Promise<UserProfile | null>
  save(profile: UserProfile): Promise<void>
  update(profile: UserProfile): Promise<void>
  findAll(filters?: UserProfileFilters, limit?: number, offset?: number): Promise<UserProfile[]>
  count(filters?: UserProfileFilters): Promise<number>
}
```

- [ ] **Step 2: 建立 UserProfileRepository**

```typescript
// src/Modules/User/Infrastructure/Repositories/UserProfileRepository.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IUserProfileRepository, UserProfileFilters } from '../../Domain/Repositories/IUserProfileRepository'
import { UserProfile } from '../../Domain/Aggregates/UserProfile'

export class UserProfileRepository implements IUserProfileRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async findById(id: string): Promise<UserProfile | null> {
    const row = await this.db.table('user_profiles').where('id', '=', id).first()
    return row ? UserProfile.fromDatabase(row) : null
  }

  async save(profile: UserProfile): Promise<void> {
    await this.db.table('user_profiles').insert(profile.toDatabaseRow())
  }

  async update(profile: UserProfile): Promise<void> {
    await this.db
      .table('user_profiles')
      .where('id', '=', profile.id)
      .update(profile.toDatabaseRow())
  }

  async findAll(filters?: UserProfileFilters, limit?: number, offset?: number): Promise<UserProfile[]> {
    let query = this.db.table('user_profiles')

    // 注意：role 和 status 在 users 表，keyword 可搜尋 display_name
    // 簡化實作：僅搜尋 user_profiles 表，跨表查詢在 Service 層處理
    if (filters?.keyword) {
      query = query.where('display_name', 'LIKE', `%${filters.keyword}%`)
    }

    if (offset) query = query.offset(offset)
    if (limit) query = query.limit(limit)
    query = query.orderBy('created_at', 'DESC')

    const rows = await query.select()
    return rows.map((row) => UserProfile.fromDatabase(row))
  }

  async count(filters?: UserProfileFilters): Promise<number> {
    let query = this.db.table('user_profiles')
    if (filters?.keyword) {
      query = query.where('display_name', 'LIKE', `%${filters.keyword}%`)
    }
    return query.count()
  }
}
```

- [ ] **Step 3: 建立 UserProfileDTO**

```typescript
// src/Modules/User/Application/DTOs/UserProfileDTO.ts
export interface UpdateUserProfileRequest {
  displayName?: string
  avatarUrl?: string | null
  phone?: string | null
  bio?: string | null
  timezone?: string
  locale?: string
  notificationPreferences?: Record<string, unknown>
}

export interface UserProfileResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>
  error?: string
}

export interface ListUsersRequest {
  role?: string
  status?: string
  keyword?: string
  page?: number
  limit?: number
}

export interface ListUsersResponse {
  success: boolean
  message: string
  data?: {
    users: Record<string, unknown>[]
    meta: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }
  error?: string
}

export interface ChangeUserStatusRequest {
  status: 'active' | 'suspended'
}
```

- [ ] **Step 4: Commit**

```bash
git add src/Modules/User/Domain/Repositories/ src/Modules/User/Infrastructure/Repositories/ src/Modules/User/Application/DTOs/
git commit -m "feat: [user] 新增 UserProfile Repository、DTO"
```

---

### Task 4: GetUserProfileService 和 UpdateUserProfileService

**Files:**
- Create: `src/Modules/User/Application/Services/GetUserProfileService.ts`
- Create: `src/Modules/User/Application/Services/UpdateUserProfileService.ts`
- Test: `src/Modules/User/__tests__/GetUserProfileService.test.ts`
- Test: `src/Modules/User/__tests__/UpdateUserProfileService.test.ts`

- [ ] **Step 1: 寫 GetUserProfileService 測試**

```typescript
// src/Modules/User/__tests__/GetUserProfileService.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { GetUserProfileService } from '../Application/Services/GetUserProfileService'
import { UserProfileRepository } from '../Infrastructure/Repositories/UserProfileRepository'
import { UserProfile } from '../Domain/Aggregates/UserProfile'

describe('GetUserProfileService', () => {
  let service: GetUserProfileService
  let repo: UserProfileRepository

  beforeEach(async () => {
    const db = new MemoryDatabaseAccess()
    repo = new UserProfileRepository(db)
    service = new GetUserProfileService(repo)

    const profile = UserProfile.createDefault('user-123', 'user@example.com')
    await repo.save(profile)
  })

  it('應成功取得 Profile', async () => {
    const result = await service.execute('user-123')
    expect(result.success).toBe(true)
    expect(result.data?.id).toBe('user-123')
    expect(result.data?.displayName).toBe('user@example.com')
  })

  it('不存在的 ID 應回傳錯誤', async () => {
    const result = await service.execute('nonexistent')
    expect(result.success).toBe(false)
    expect(result.error).toBe('PROFILE_NOT_FOUND')
  })
})
```

- [ ] **Step 2: 寫 UpdateUserProfileService 測試**

```typescript
// src/Modules/User/__tests__/UpdateUserProfileService.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { UpdateUserProfileService } from '../Application/Services/UpdateUserProfileService'
import { GetUserProfileService } from '../Application/Services/GetUserProfileService'
import { UserProfileRepository } from '../Infrastructure/Repositories/UserProfileRepository'
import { UserProfile } from '../Domain/Aggregates/UserProfile'

describe('UpdateUserProfileService', () => {
  let updateService: UpdateUserProfileService
  let getService: GetUserProfileService
  let repo: UserProfileRepository

  beforeEach(async () => {
    const db = new MemoryDatabaseAccess()
    repo = new UserProfileRepository(db)
    updateService = new UpdateUserProfileService(repo)
    getService = new GetUserProfileService(repo)

    const profile = UserProfile.createDefault('user-123', 'user@example.com')
    await repo.save(profile)
  })

  it('應成功更新 displayName', async () => {
    const result = await updateService.execute('user-123', { displayName: '新名稱' })
    expect(result.success).toBe(true)

    const profile = await getService.execute('user-123')
    expect(profile.data?.displayName).toBe('新名稱')
  })

  it('應成功部分更新', async () => {
    await updateService.execute('user-123', { bio: '個人簡介', timezone: 'Asia/Tokyo' })
    const profile = await getService.execute('user-123')
    expect(profile.data?.bio).toBe('個人簡介')
    expect(profile.data?.timezone).toBe('Asia/Tokyo')
    expect(profile.data?.displayName).toBe('user@example.com') // 未更新的欄位保持原值
  })

  it('不存在的 ID 應回傳錯誤', async () => {
    const result = await updateService.execute('nonexistent', { displayName: 'test' })
    expect(result.success).toBe(false)
  })

  it('無效的電話號碼應回傳錯誤', async () => {
    const result = await updateService.execute('user-123', { phone: '123' })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 3: 執行測試確認失敗**

Run: `bun test src/Modules/User/__tests__/GetUserProfileService.test.ts src/Modules/User/__tests__/UpdateUserProfileService.test.ts`
Expected: FAIL

- [ ] **Step 4: 實作 GetUserProfileService**

```typescript
// src/Modules/User/Application/Services/GetUserProfileService.ts
import type { IUserProfileRepository } from '../../Domain/Repositories/IUserProfileRepository'
import type { UserProfileResponse } from '../DTOs/UserProfileDTO'

export class GetUserProfileService {
  constructor(private profileRepository: IUserProfileRepository) {}

  async execute(userId: string): Promise<UserProfileResponse> {
    try {
      const profile = await this.profileRepository.findById(userId)
      if (!profile) {
        return { success: false, message: '找不到 Profile', error: 'PROFILE_NOT_FOUND' }
      }
      return { success: true, message: '取得成功', data: profile.toDTO() }
    } catch (error: any) {
      return { success: false, message: error.message || '取得失敗', error: error.message }
    }
  }
}
```

- [ ] **Step 5: 實作 UpdateUserProfileService**

```typescript
// src/Modules/User/Application/Services/UpdateUserProfileService.ts
import type { IUserProfileRepository } from '../../Domain/Repositories/IUserProfileRepository'
import type { UpdateUserProfileRequest, UserProfileResponse } from '../DTOs/UserProfileDTO'
import { Phone } from '../../Domain/ValueObjects/Phone'
import { Timezone } from '../../Domain/ValueObjects/Timezone'
import { Locale } from '../../Domain/ValueObjects/Locale'

export class UpdateUserProfileService {
  constructor(private profileRepository: IUserProfileRepository) {}

  async execute(userId: string, request: UpdateUserProfileRequest): Promise<UserProfileResponse> {
    try {
      const profile = await this.profileRepository.findById(userId)
      if (!profile) {
        return { success: false, message: '找不到 Profile', error: 'PROFILE_NOT_FOUND' }
      }

      // 驗證選填欄位
      if (request.phone !== undefined && request.phone !== null) {
        new Phone(request.phone) // 驗證格式，無效會拋出例外
      }
      if (request.timezone !== undefined) {
        new Timezone(request.timezone)
      }
      if (request.locale !== undefined) {
        new Locale(request.locale)
      }

      const updated = profile.updateProfile(request)
      await this.profileRepository.update(updated)

      return { success: true, message: '更新成功', data: updated.toDTO() }
    } catch (error: any) {
      return { success: false, message: error.message || '更新失敗', error: error.message }
    }
  }
}
```

- [ ] **Step 6: 執行測試確認通過**

Run: `bun test src/Modules/User/__tests__/GetUserProfileService.test.ts src/Modules/User/__tests__/UpdateUserProfileService.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/Modules/User/Application/Services/GetUserProfileService.ts src/Modules/User/Application/Services/UpdateUserProfileService.ts src/Modules/User/__tests__/GetUserProfileService.test.ts src/Modules/User/__tests__/UpdateUserProfileService.test.ts
git commit -m "feat: [user] 新增 GetUserProfile 和 UpdateUserProfile 服務"
```

---

### Task 5: ListUsersService 和 ChangeUserStatusService

**Files:**
- Create: `src/Modules/User/Application/Services/ListUsersService.ts`
- Create: `src/Modules/User/Application/Services/ChangeUserStatusService.ts`
- Test: `src/Modules/User/__tests__/ListUsersService.test.ts`
- Test: `src/Modules/User/__tests__/ChangeUserStatusService.test.ts`

- [ ] **Step 1: 寫 ListUsersService 測試**

```typescript
// src/Modules/User/__tests__/ListUsersService.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { ListUsersService } from '../Application/Services/ListUsersService'
import { UserProfileRepository } from '../Infrastructure/Repositories/UserProfileRepository'
import { UserProfile } from '../Domain/Aggregates/UserProfile'

describe('ListUsersService', () => {
  let service: ListUsersService
  let repo: UserProfileRepository

  beforeEach(async () => {
    const db = new MemoryDatabaseAccess()
    repo = new UserProfileRepository(db)
    service = new ListUsersService(repo)

    // 建立 3 個 Profile
    await repo.save(UserProfile.createDefault('user-1', 'alice@example.com'))
    await repo.save(UserProfile.createDefault('user-2', 'bob@example.com'))
    await repo.save(UserProfile.createDefault('user-3', 'charlie@example.com'))
  })

  it('應回傳所有使用者（分頁）', async () => {
    const result = await service.execute({})
    expect(result.success).toBe(true)
    expect(result.data?.users.length).toBe(3)
    expect(result.data?.meta.total).toBe(3)
  })

  it('應支援分頁', async () => {
    const result = await service.execute({ page: 1, limit: 2 })
    expect(result.success).toBe(true)
    expect(result.data?.users.length).toBe(2)
    expect(result.data?.meta.totalPages).toBe(2)
  })

  it('應支援關鍵字搜尋', async () => {
    const result = await service.execute({ keyword: 'alice' })
    expect(result.success).toBe(true)
    expect(result.data?.users.length).toBe(1)
  })
})
```

- [ ] **Step 2: 寫 ChangeUserStatusService 測試**

```typescript
// src/Modules/User/__tests__/ChangeUserStatusService.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { ChangeUserStatusService } from '../Application/Services/ChangeUserStatusService'
import { AuthRepository } from '@/Modules/Auth/Infrastructure/Repositories/AuthRepository'
import { AuthTokenRepository } from '@/Modules/Auth/Infrastructure/Repositories/AuthTokenRepository'
import { RegisterUserService } from '@/Modules/Auth/Application/Services/RegisterUserService'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'

describe('ChangeUserStatusService', () => {
  let service: ChangeUserStatusService
  let authRepo: IAuthRepository
  let authTokenRepo: IAuthTokenRepository

  beforeEach(async () => {
    const db = new MemoryDatabaseAccess()
    authRepo = new AuthRepository(db)
    authTokenRepo = new AuthTokenRepository(db)
    service = new ChangeUserStatusService(authRepo, authTokenRepo)

    const registerService = new RegisterUserService(authRepo)
    await registerService.execute({ email: 'user@example.com', password: 'StrongPass123' })
  })

  it('應成功停用帳戶', async () => {
    const users = await authRepo.findAll()
    const userId = users[0].id

    const result = await service.execute(userId, { status: 'suspended' })
    expect(result.success).toBe(true)

    const user = await authRepo.findById(userId)
    expect(user?.isSuspended()).toBe(true)
  })

  it('應成功啟用帳戶', async () => {
    const users = await authRepo.findAll()
    const userId = users[0].id

    // 先停用
    await service.execute(userId, { status: 'suspended' })
    // 再啟用
    const result = await service.execute(userId, { status: 'active' })
    expect(result.success).toBe(true)

    const user = await authRepo.findById(userId)
    expect(user?.isSuspended()).toBe(false)
  })

  it('不存在的使用者應回傳錯誤', async () => {
    const result = await service.execute('nonexistent', { status: 'suspended' })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 3: 執行測試確認失敗**

Run: `bun test src/Modules/User/__tests__/ListUsersService.test.ts src/Modules/User/__tests__/ChangeUserStatusService.test.ts`
Expected: FAIL

- [ ] **Step 4: 實作 ListUsersService**

```typescript
// src/Modules/User/Application/Services/ListUsersService.ts
import type { IUserProfileRepository } from '../../Domain/Repositories/IUserProfileRepository'
import type { ListUsersRequest, ListUsersResponse } from '../DTOs/UserProfileDTO'

export class ListUsersService {
  constructor(private profileRepository: IUserProfileRepository) {}

  async execute(request: ListUsersRequest): Promise<ListUsersResponse> {
    try {
      const page = request.page ?? 1
      const limit = request.limit ?? 20
      const offset = (page - 1) * limit

      const filters = {
        role: request.role,
        status: request.status,
        keyword: request.keyword,
      }

      const [users, total] = await Promise.all([
        this.profileRepository.findAll(filters, limit, offset),
        this.profileRepository.count(filters),
      ])

      return {
        success: true,
        message: '取得使用者列表成功',
        data: {
          users: users.map((u) => u.toDTO()),
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      }
    } catch (error: any) {
      return { success: false, message: error.message || '取得失敗', error: error.message }
    }
  }
}
```

- [ ] **Step 5: 實作 ChangeUserStatusService**

```typescript
// src/Modules/User/Application/Services/ChangeUserStatusService.ts
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'
import { UserStatus } from '@/Modules/Auth/Domain/Aggregates/User'
import type { ChangeUserStatusRequest, UserProfileResponse } from '../DTOs/UserProfileDTO'

export class ChangeUserStatusService {
  constructor(
    private authRepository: IAuthRepository,
    private authTokenRepository: IAuthTokenRepository,
  ) {}

  async execute(userId: string, request: ChangeUserStatusRequest): Promise<UserProfileResponse> {
    try {
      const user = await this.authRepository.findById(userId)
      if (!user) {
        return { success: false, message: '找不到使用者', error: 'USER_NOT_FOUND' }
      }

      if (request.status === 'suspended') {
        user.suspend()
        // 停用時撤銷所有 Token
        await this.authTokenRepository.revokeAllByUserId(userId)
      } else {
        user.activate()
      }

      await this.authRepository.save(user)

      return {
        success: true,
        message: `帳戶已${request.status === 'suspended' ? '停用' : '啟用'}`,
        data: user.toDTO(),
      }
    } catch (error: any) {
      return { success: false, message: error.message || '操作失敗', error: error.message }
    }
  }
}
```

- [ ] **Step 6: 執行測試確認通過**

Run: `bun test src/Modules/User/__tests__/ListUsersService.test.ts src/Modules/User/__tests__/ChangeUserStatusService.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/Modules/User/Application/Services/ListUsersService.ts src/Modules/User/Application/Services/ChangeUserStatusService.ts src/Modules/User/__tests__/ListUsersService.test.ts src/Modules/User/__tests__/ChangeUserStatusService.test.ts
git commit -m "feat: [user] 新增 ListUsers 和 ChangeUserStatus 服務"
```

---

### Task 6: Controller、Routes、ServiceProvider、Wiring

**Files:**
- Create: `src/Modules/User/Presentation/Controllers/UserController.ts`
- Create: `src/Modules/User/Presentation/Routes/user.routes.ts`
- Create: `src/Modules/User/Infrastructure/Providers/UserServiceProvider.ts`
- Create: `src/Modules/User/index.ts`
- Modify: `src/bootstrap.ts`
- Modify: `src/routes.ts`
- Modify: `src/wiring/index.ts`

- [ ] **Step 1: 建立 UserController**

```typescript
// src/Modules/User/Presentation/Controllers/UserController.ts
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { GetUserProfileService } from '../../Application/Services/GetUserProfileService'
import type { UpdateUserProfileService } from '../../Application/Services/UpdateUserProfileService'
import type { ListUsersService } from '../../Application/Services/ListUsersService'
import type { ChangeUserStatusService } from '../../Application/Services/ChangeUserStatusService'

export class UserController {
  constructor(
    private getUserProfileService: GetUserProfileService,
    private updateUserProfileService: UpdateUserProfileService,
    private listUsersService: ListUsersService,
    private changeUserStatusService: ChangeUserStatusService,
  ) {}

  async getMe(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) {
      return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    }
    const result = await this.getUserProfileService.execute(auth.userId)
    return ctx.json(result, result.success ? 200 : 404)
  }

  async updateMe(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) {
      return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    }
    const body = await ctx.getJsonBody<Record<string, unknown>>()
    const result = await this.updateUserProfileService.execute(auth.userId, body)
    return ctx.json(result, result.success ? 200 : 400)
  }

  async listUsers(ctx: IHttpContext): Promise<Response> {
    const request = {
      role: ctx.getQuery('role'),
      status: ctx.getQuery('status'),
      keyword: ctx.getQuery('keyword'),
      page: ctx.getQuery('page') ? Number(ctx.getQuery('page')) : undefined,
      limit: ctx.getQuery('limit') ? Number(ctx.getQuery('limit')) : undefined,
    }
    const result = await this.listUsersService.execute(request)
    return ctx.json(result, result.success ? 200 : 400)
  }

  async getUser(ctx: IHttpContext): Promise<Response> {
    const userId = ctx.getParam('id')
    if (!userId) {
      return ctx.json({ success: false, message: '缺少使用者 ID', error: 'MISSING_ID' }, 400)
    }
    const result = await this.getUserProfileService.execute(userId)
    return ctx.json(result, result.success ? 200 : 404)
  }

  async changeUserStatus(ctx: IHttpContext): Promise<Response> {
    const userId = ctx.getParam('id')
    if (!userId) {
      return ctx.json({ success: false, message: '缺少使用者 ID', error: 'MISSING_ID' }, 400)
    }
    const body = await ctx.getJsonBody<{ status: 'active' | 'suspended' }>()
    const result = await this.changeUserStatusService.execute(userId, body)
    return ctx.json(result, result.success ? 200 : 400)
  }
}
```

- [ ] **Step 2: 建立 user.routes.ts**

```typescript
// src/Modules/User/Presentation/Routes/user.routes.ts
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { UserController } from '../Controllers/UserController'
import { requireAuth, createRoleMiddleware } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'

export async function registerUserRoutes(
  router: IModuleRouter,
  controller: UserController,
): Promise<void> {
  // 已認證使用者 — 自己的 Profile
  router.get('/api/users/me', [requireAuth()], (ctx) => controller.getMe(ctx))
  router.put('/api/users/me', [requireAuth()], (ctx) => controller.updateMe(ctx))

  // Admin 專用
  router.get('/api/users', [createRoleMiddleware('admin')], (ctx) => controller.listUsers(ctx))
  router.get('/api/users/:id', [createRoleMiddleware('admin')], (ctx) => controller.getUser(ctx))
  router.patch('/api/users/:id/status', [createRoleMiddleware('admin')], (ctx) => controller.changeUserStatus(ctx))
}
```

- [ ] **Step 3: 建立 UserServiceProvider**

```typescript
// src/Modules/User/Infrastructure/Providers/UserServiceProvider.ts
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import type { IUserProfileRepository } from '../../Domain/Repositories/IUserProfileRepository'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'
import { UserProfileRepository } from '../Repositories/UserProfileRepository'
import { GetUserProfileService } from '../../Application/Services/GetUserProfileService'
import { UpdateUserProfileService } from '../../Application/Services/UpdateUserProfileService'
import { ListUsersService } from '../../Application/Services/ListUsersService'
import { ChangeUserStatusService } from '../../Application/Services/ChangeUserStatusService'

export class UserServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    const db = getCurrentDatabaseAccess()

    container.singleton('userProfileRepository', () => {
      return new UserProfileRepository(db)
    })

    container.bind('getUserProfileService', (c: IContainer) => {
      const repo = c.make('userProfileRepository') as IUserProfileRepository
      return new GetUserProfileService(repo)
    })

    container.bind('updateUserProfileService', (c: IContainer) => {
      const repo = c.make('userProfileRepository') as IUserProfileRepository
      return new UpdateUserProfileService(repo)
    })

    container.bind('listUsersService', (c: IContainer) => {
      const repo = c.make('userProfileRepository') as IUserProfileRepository
      return new ListUsersService(repo)
    })

    container.bind('changeUserStatusService', (c: IContainer) => {
      const authRepo = c.make('authRepository') as IAuthRepository
      const authTokenRepo = c.make('authTokenRepository') as IAuthTokenRepository
      return new ChangeUserStatusService(authRepo, authTokenRepo)
    })
  }

  override boot(_context: any): void {
    console.log('👤 [User] Module loaded')
  }
}
```

- [ ] **Step 4: 建立 User module index.ts**

```typescript
// src/Modules/User/index.ts
// Domain
export { UserProfile } from './Domain/Aggregates/UserProfile'
export type { UpdateProfileFields } from './Domain/Aggregates/UserProfile'
export { Phone } from './Domain/ValueObjects/Phone'
export { Timezone } from './Domain/ValueObjects/Timezone'
export { Locale } from './Domain/ValueObjects/Locale'
export type { IUserProfileRepository, UserProfileFilters } from './Domain/Repositories/IUserProfileRepository'

// Application
export type { UpdateUserProfileRequest, UserProfileResponse, ListUsersRequest, ListUsersResponse, ChangeUserStatusRequest } from './Application/DTOs/UserProfileDTO'
export { GetUserProfileService } from './Application/Services/GetUserProfileService'
export { UpdateUserProfileService } from './Application/Services/UpdateUserProfileService'
export { ListUsersService } from './Application/Services/ListUsersService'
export { ChangeUserStatusService } from './Application/Services/ChangeUserStatusService'

// Infrastructure
export { UserProfileRepository } from './Infrastructure/Repositories/UserProfileRepository'
export { UserServiceProvider } from './Infrastructure/Providers/UserServiceProvider'

// Presentation
export { UserController } from './Presentation/Controllers/UserController'
export { registerUserRoutes } from './Presentation/Routes/user.routes'
```

- [ ] **Step 5: 更新 wiring/index.ts — 新增 registerUser**

在 `src/wiring/index.ts` 底部新增：

```typescript
import { UserController, registerUserRoutes } from '@/Modules/User'

export const registerUser = (core: PlanetCore): void => {
  const router = createGravitoModuleRouter(core)
  const getUserProfileService = core.container.make('getUserProfileService') as any
  const updateUserProfileService = core.container.make('updateUserProfileService') as any
  const listUsersService = core.container.make('listUsersService') as any
  const changeUserStatusService = core.container.make('changeUserStatusService') as any
  const controller = new UserController(
    getUserProfileService, updateUserProfileService,
    listUsersService, changeUserStatusService
  )
  registerUserRoutes(router, controller)
}
```

- [ ] **Step 6: 更新 bootstrap.ts — 註冊 UserServiceProvider**

在 `src/bootstrap.ts` 中加入：

```typescript
import { UserServiceProvider } from './Modules/User/Infrastructure/Providers/UserServiceProvider'

// 在 core.register(...AuthServiceProvider...) 之後加入：
core.register(createGravitoServiceProvider(new UserServiceProvider()))
```

- [ ] **Step 7: 更新 routes.ts — 註冊 User 路由**

在 `src/routes.ts` 中加入：

```typescript
import { registerUser } from './wiring'

// 在 registerAuth(core) 之後加入：
registerUser(core)
```

- [ ] **Step 8: 執行所有測試**

Run: `bun test`
Expected: 全部 PASS

- [ ] **Step 9: Commit**

```bash
git add src/Modules/User/ src/wiring/index.ts src/bootstrap.ts src/routes.ts
git commit -m "feat: [user] 完成 User 模組 — Controller、Routes、ServiceProvider、Wiring"
```

---

### Task 7: 註冊時自動建立 Profile

**Files:**
- Modify: `src/Modules/Auth/Application/Services/RegisterUserService.ts`
- Modify: `src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts`

- [ ] **Step 1: 更新 RegisterUserService**

新增 `IUserProfileRepository` 依賴，註冊後自動建立 Profile：

```typescript
// src/Modules/Auth/Application/Services/RegisterUserService.ts
import type { IUserProfileRepository } from '@/Modules/User/Domain/Repositories/IUserProfileRepository'
import { UserProfile } from '@/Modules/User/Domain/Aggregates/UserProfile'

export class RegisterUserService {
  constructor(
    private authRepository: IAuthRepository,
    private userProfileRepository?: IUserProfileRepository,  // 選填，向後相容
  ) {}

  async execute(request: RegisterUserRequest): Promise<RegisterUserResponse> {
    // ... 既有邏輯不變 ...
    // 在 step 5（保存到資料庫）之後加入：

    // 6. 自動建立 User Profile
    if (this.userProfileRepository) {
      const profile = UserProfile.createDefault(user.id, request.email)
      await this.userProfileRepository.save(profile)
    }

    // 7. 返回成功回應
    // ... 原本的 return ...
  }
}
```

- [ ] **Step 2: 更新 AuthServiceProvider — 注入 Profile Repository**

在 `registerUserService` 的工廠函式中：

```typescript
container.bind('registerUserService', (c: IContainer) => {
  const repository = c.make('authRepository') as IAuthRepository
  // 嘗試取得 userProfileRepository（可能尚未註冊）
  let profileRepo: IUserProfileRepository | undefined
  try {
    profileRepo = c.make('userProfileRepository') as IUserProfileRepository
  } catch {
    // User 模組尚未載入時忽略
  }
  return new RegisterUserService(repository, profileRepo)
})
```

- [ ] **Step 3: 執行所有 Auth 測試確認無破壞**

Run: `bun test src/Modules/Auth/__tests__/`
Expected: PASS（profileRepo 為 undefined 時既有行為不變）

- [ ] **Step 4: Commit**

```bash
git add src/Modules/Auth/Application/Services/RegisterUserService.ts src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts
git commit -m "feat: [auth] 註冊時自動建立 User Profile"
```

---

### Task 8: 全面驗證

- [ ] **Step 1: 執行所有測試**

Run: `bun test`
Expected: 全部 PASS

- [ ] **Step 2: TypeScript 類型檢查**

Run: `bun run typecheck`
Expected: 無錯誤

- [ ] **Step 3: Lint 檢查**

Run: `bun run lint`
Expected: 無錯誤
