---
phase: quick-260413-vzi
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/Modules/Profile/Domain/Aggregates/UserProfile.ts
  - src/Modules/Profile/Domain/Repositories/IUserProfileRepository.ts
  - src/Modules/Profile/Infrastructure/Repositories/UserProfileRepository.ts
  - src/Modules/Profile/Infrastructure/Mappers/UserProfileMapper.ts
  - src/Modules/Profile/Application/Services/UpdateProfileService.ts
  - src/Modules/Profile/Application/Services/GetProfileService.ts
  - src/Modules/Profile/Application/EventHandlers/UserRegisteredHandler.ts
  - src/Modules/Profile/Infrastructure/Providers/ProfileServiceProvider.ts
  - src/Modules/Profile/Presentation/Controllers/ProfileController.ts
  - src/Modules/Profile/__tests__/UserProfile.test.ts
  - src/Modules/Profile/__tests__/UpdateProfileService.test.ts
  - src/Modules/Profile/__tests__/UserRegisteredHandler.test.ts
  - src/Modules/Profile/index.ts
autonomous: true
requirements: []

must_haves:
  truths:
    - "UserProfile 聚合根的 props 使用 Phone | null、Timezone、Locale ValueObjects（不再是裸字串）"
    - "getter 對外回傳字串（phone: string | null, timezone: string, locale: string），外部介面不變"
    - "IUserProfileRepository.findByUserId 取代 findById，所有呼叫點更新"
    - "UserProfileFilters 只保留 keyword 欄位，role/status 移除"
    - "createDefault 使用 Timezone.default() 和 Locale.default()"
    - "UserProfile 定義 UserProfileCreated / UserProfileUpdated domain events 並在方法內設置"
    - "ProfileServiceProvider.boot() 不再有 console.log"
    - "UserRegisteredHandler 搬至 Application/EventHandlers/ 目錄"
    - "UserProfileRepository.findByUserId 查 WHERE user_id = ?（不是 WHERE id = ?）"
  artifacts:
    - path: "src/Modules/Profile/Domain/Aggregates/UserProfile.ts"
      provides: "含 VO 整合、domain events、immutable update"
    - path: "src/Modules/Profile/Domain/Repositories/IUserProfileRepository.ts"
      provides: "findByUserId 介面（無 role/status filter）"
    - path: "src/Modules/Profile/Application/EventHandlers/UserRegisteredHandler.ts"
      provides: "搬移後的事件處理器"
  key_links:
    - from: "GetProfileService / UpdateProfileService"
      to: "IUserProfileRepository.findByUserId"
      via: "this.profileRepository.findByUserId(userId)"
    - from: "UserProfile.props"
      to: "Phone | Timezone | Locale"
      via: "private readonly props: UserProfileProps（VO 型別）"
---

<objective>
修正 Profile 模組的 9 個 DDD 戰術設計問題，涵蓋 ValueObject 整合、Repository 命名修正、Domain Events、邊界清理和程式碼品質問題。

Purpose: 讓 Profile 模組符合 DDD 戰術設計最佳實踐，與 Auth 模組（260413-uzv）完成後的標準一致。
Output: 完整修正的 Profile 模組，測試全數通過。
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md

關鍵設計約束：
- Getter 對外介面不變（phone: string | null, timezone: string, locale: string）——DTO 和 Mapper 不需改動
- UserProfileRepository.findById 實際上查的是 WHERE id = ?（profile UUID），但所有 Service 傳入的是 userId（Auth userId）。重命名為 findByUserId 且改為 WHERE user_id = ? 才是正確行為
- ProfileController 使用 Auth 模組的 ListUsersService 和 ChangeUserStatusService 屬於已知的跨邊界設計決策，只加注釋說明，不破壞路由
- UserRegisteredHandler 測試目前使用 vitest，搬移後更新 import 路徑即可
- 不要修改 UserProfileDTO 的字串型別——DTO 只是傳輸物件，VO 只存在於 Domain 層
</context>

<tasks>

<task type="auto">
  <name>Task 1 (P1+P3): UserProfile 聚合根整合 VO + 修正 findByUserId</name>
  <files>
    src/Modules/Profile/Domain/Aggregates/UserProfile.ts
    src/Modules/Profile/Domain/Repositories/IUserProfileRepository.ts
    src/Modules/Profile/Infrastructure/Repositories/UserProfileRepository.ts
  </files>
  <action>
**A. UserProfile.ts — 整合 VO 至 props（P1）**

修改 `UserProfileProps` interface：
```typescript
import { Locale } from '../ValueObjects/Locale'
import { Phone } from '../ValueObjects/Phone'
import { Timezone } from '../ValueObjects/Timezone'

export interface UserProfileProps {
  id: string
  userId: string
  displayName: string
  avatarUrl: string | null
  phone: Phone | null        // 改為 VO
  bio: string | null
  timezone: Timezone         // 改為 VO
  locale: Locale             // 改為 VO
  notificationPreferences: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  domainEvents: DomainEvent[]  // 新增（P2 Domain Events）
}
```

定義 Domain Events interface（P2）：
```typescript
export interface DomainEvent {
  eventName: string
  occurredAt: Date
  payload: Record<string, unknown>
}

export interface UserProfileCreated extends DomainEvent {
  eventName: 'UserProfileCreated'
  payload: { profileId: string; userId: string; email: string }
}

export interface UserProfileUpdated extends DomainEvent {
  eventName: 'UserProfileUpdated'
  payload: { profileId: string; userId: string; fields: string[] }
}
```

修改 `createDefault`（P3 使用 default() + 設置 event）：
```typescript
static createDefault(userId: string, email: string): UserProfile {
  const event: UserProfileCreated = {
    eventName: 'UserProfileCreated',
    occurredAt: new Date(),
    payload: { profileId: id, userId, email },
  }
  return new UserProfile({
    id: crypto.randomUUID(),
    userId,
    displayName: email,
    avatarUrl: null,
    phone: null,
    bio: null,
    timezone: Timezone.default(),   // 使用 Timezone.default()
    locale: Locale.default(),       // 使用 Locale.default()
    notificationPreferences: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    domainEvents: [event],
  })
}
```

注意：需先宣告 id，再在 payload 中使用。

修改 `reconstitute`：接受字串並在內部轉換為 VO（Mapper 傳字串，此處包裝）：
```typescript
static reconstitute(props: {
  id: string; userId: string; displayName: string; avatarUrl: string | null
  phone: string | null; bio: string | null; timezone: string; locale: string
  notificationPreferences: Record<string, unknown>; createdAt: Date; updatedAt: Date
}): UserProfile {
  return new UserProfile({
    ...props,
    phone: props.phone ? Phone.fromNullable(props.phone) : null,
    timezone: new Timezone(props.timezone),
    locale: new Locale(props.locale),
    domainEvents: [],
  })
}
```

也匯出 `ReconstitutionProps` 型別供 Mapper 使用：
```typescript
export type ReconstitutionProps = Parameters<typeof UserProfile.reconstitute>[0]
```

修改 `updateProfile`（P1+P2）：接受字串欄位（UpdateProfileFields 保持字串），內部建立 VO：
```typescript
updateProfile(fields: UpdateProfileFields): UserProfile {
  const event: UserProfileUpdated = {
    eventName: 'UserProfileUpdated',
    occurredAt: new Date(),
    payload: {
      profileId: this.props.id,
      userId: this.props.userId,
      fields: Object.keys(fields).filter(k => fields[k as keyof UpdateProfileFields] !== undefined),
    },
  }
  return new UserProfile({
    ...this.props,
    ...(fields.displayName !== undefined && { displayName: fields.displayName }),
    ...(fields.avatarUrl !== undefined && { avatarUrl: fields.avatarUrl }),
    ...(fields.phone !== undefined && { phone: fields.phone !== null ? Phone.fromNullable(fields.phone) : null }),
    ...(fields.bio !== undefined && { bio: fields.bio }),
    ...(fields.timezone !== undefined && { timezone: new Timezone(fields.timezone) }),
    ...(fields.locale !== undefined && { locale: new Locale(fields.locale) }),
    ...(fields.notificationPreferences !== undefined && { notificationPreferences: fields.notificationPreferences }),
    updatedAt: new Date(),
    domainEvents: [event],
  })
}
```

修改 getter 使其回傳字串（外部介面不變）：
```typescript
get phone(): string | null {
  return this.props.phone ? this.props.phone.getValue() : null
}
get timezone(): string {
  return this.props.timezone.getValue()
}
get locale(): string {
  return this.props.locale.getValue()
}
```

新增 domainEvents getter：
```typescript
get domainEvents(): DomainEvent[] {
  return [...this.props.domainEvents]
}
clearDomainEvents(): UserProfile {
  return new UserProfile({ ...this.props, domainEvents: [] })
}
```

**B. IUserProfileRepository.ts — 重命名 + 移除 role/status（P1+P4）**

```typescript
export interface UserProfileFilters {
  keyword?: string   // 移除 role 和 status
}

export interface IUserProfileRepository {
  findByUserId(userId: string): Promise<UserProfile | null>  // 重命名（P3）
  save(profile: UserProfile): Promise<void>
  update(profile: UserProfile): Promise<void>
  findAll(filters?: UserProfileFilters, limit?: number, offset?: number): Promise<UserProfile[]>
  count(filters?: UserProfileFilters): Promise<number>
}
```

**C. UserProfileRepository.ts — 實作 findByUserId（改查 user_id）**

```typescript
async findByUserId(userId: string): Promise<UserProfile | null> {
  const row = await this.db.table('user_profiles').where('user_id', '=', userId).first()
  return row ? UserProfileMapper.fromDatabase(row as Record<string, unknown>) : null
}
```

移除 `findById` 方法（整個刪除）。`findAll` 和 `count` 中如有 `filters?.role` 或 `filters?.status` 的引用一併移除（目前已無，確認即可）。
  </action>
  <verify>
    <automated>cd /Users/carl/Dev/CMG/Draupnir && bun test src/Modules/Profile/__tests__/UserProfile.test.ts 2>&1 | tail -20</automated>
  </verify>
  <done>
    - UserProfileProps 中 phone/timezone/locale 為 VO 型別
    - Getter 回傳字串（外部介面不變）
    - createDefault 使用 Timezone.default() / Locale.default()
    - domainEvents 在 createDefault / updateProfile 中被設置
    - IUserProfileRepository 有 findByUserId（無 findById），UserProfileFilters 只有 keyword
    - UserProfileRepository.findByUserId 查 WHERE user_id = ?
    - UserProfile.test.ts 通過（timezone/locale getter 仍回傳字串，測試無需改動）
  </done>
</task>

<task type="auto">
  <name>Task 2 (P1+P3+P5+P8): 更新所有呼叫點 + 搬移 Handler + 清理</name>
  <files>
    src/Modules/Profile/Application/Services/GetProfileService.ts
    src/Modules/Profile/Application/Services/UpdateProfileService.ts
    src/Modules/Profile/Application/EventHandlers/UserRegisteredHandler.ts
    src/Modules/Profile/Infrastructure/Mappers/UserProfileMapper.ts
    src/Modules/Profile/Infrastructure/Providers/ProfileServiceProvider.ts
    src/Modules/Profile/Presentation/Controllers/ProfileController.ts
    src/Modules/Profile/index.ts
  </files>
  <action>
**A. GetProfileService.ts — findById → findByUserId**

```typescript
const profile = await this.profileRepository.findByUserId(userId)
```

**B. UpdateProfileService.ts — findById → findByUserId**

```typescript
const profile = await this.profileRepository.findByUserId(userId)
```

同時移除多餘的手動 VO 驗證（Phone/Timezone/Locale new 呼叫），因為 `updateProfile` 內部已自行建立 VO 並驗證。更新後的 execute：
```typescript
async execute(userId: string, request: UpdateUserProfileRequest): Promise<UserProfileResponse> {
  try {
    const profile = await this.profileRepository.findByUserId(userId)
    if (!profile) {
      return { success: false, message: 'Profile not found', error: 'PROFILE_NOT_FOUND' }
    }
    const updated = profile.updateProfile(request)
    await this.profileRepository.update(updated)
    return { success: true, message: 'Update successful', data: UserProfileMapper.toDTO(updated) }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Update failed',
      error: error.message,
    }
  }
}
```

移除 `import { Locale } from '...'`, `import { Phone } from '...'`, `import { Timezone } from '...'`（不再需要）。

**C. 建立 Application/EventHandlers/ 目錄並搬移 UserRegisteredHandler.ts（P9）**

建立新檔案 `src/Modules/Profile/Application/EventHandlers/UserRegisteredHandler.ts`，內容與原檔案相同（僅更新檔頭注釋路徑）：
```typescript
// src/Modules/Profile/Application/EventHandlers/UserRegisteredHandler.ts
import { UserProfile } from '../../Domain/Aggregates/UserProfile'
import type { IUserProfileRepository } from '../../Domain/Repositories/IUserProfileRepository'

export class UserRegisteredHandler {
  constructor(private readonly userProfileRepository: IUserProfileRepository) {}

  async execute(userId: string, email: string): Promise<void> {
    if (!userId || !email) {
      throw new Error('UserRegisteredHandler: userId and email are required')
    }
    const profile = UserProfile.createDefault(userId, email)
    await this.userProfileRepository.save(profile)
  }
}
```

刪除舊檔案 `src/Modules/Profile/Application/Services/UserRegisteredHandler.ts`。

**D. UserProfileMapper.ts — 更新 fromDatabase 簽名**

`reconstitute` 現在接受 `ReconstitutionProps`（字串欄位），確認 fromDatabase 傳遞字串（現有實作已是字串），無需改動。若 TypeScript 報型別錯誤，只需確保 `UserProfile.reconstitute` 接受字串型別的 props（Task 1 已處理）。

**E. ProfileServiceProvider.ts — 移除 console.log（P8）**

```typescript
override boot(_context: any): void {
  // Profile module loaded
}
```

**F. ProfileController.ts — 加跨邊界注釋（P5）**

在 class 文件注釋中加入：
```typescript
/**
 * Controller for Profile-related endpoints.
 *
 * Cross-boundary note: listUsers() and changeUserStatus() delegate to Auth module
 * services (ListUsersService, ChangeUserStatusService). This is an intentional
 * design decision — these admin operations are surfaced through the Profile routes
 * for unified user management UX, while the Auth module owns the business logic.
 * If boundaries need stricter enforcement in future, extract an AdminController.
 */
```

**G. index.ts — 更新 export 路徑**

將 `UserRegisteredHandler` export 從 Services 改為 EventHandlers：
```typescript
export { UserRegisteredHandler } from './Application/EventHandlers/UserRegisteredHandler'
```

確認目前 index.ts 是否有匯出 UserRegisteredHandler——若沒有則新增此行（通常 Handler 應該可以從模組外部 import）。
  </action>
  <verify>
    <automated>cd /Users/carl/Dev/CMG/Draupnir && bun test src/Modules/Profile/__tests__/UpdateProfileService.test.ts 2>&1 | tail -20</automated>
  </verify>
  <done>
    - GetProfileService 和 UpdateProfileService 呼叫 findByUserId（不是 findById）
    - UpdateProfileService 不再重複建立 VO（由 updateProfile 內部處理）
    - UserRegisteredHandler 在 Application/EventHandlers/ 目錄
    - 舊的 Application/Services/UserRegisteredHandler.ts 已刪除
    - ProfileServiceProvider.boot() 無 console.log
    - ProfileController 有跨邊界設計注釋
    - UpdateProfileService.test.ts 通過（現在透過 userId 查詢，與測試的 beforeEach 行為一致）
  </done>
</task>

<task type="auto">
  <name>Task 3: 更新測試 + 全部驗證</name>
  <files>
    src/Modules/Profile/__tests__/UserProfile.test.ts
    src/Modules/Profile/__tests__/UpdateProfileService.test.ts
    src/Modules/Profile/__tests__/UserRegisteredHandler.test.ts
  </files>
  <action>
**A. UserProfile.test.ts — 補充 VO 行為測試與 domain events 測試**

現有測試中 `timezone` / `locale` 仍期望字串，這應繼續通過（getter 回傳字串）。補充以下測試：

```typescript
it('createDefault 應設置 UserProfileCreated domain event', () => {
  const profile = UserProfile.createDefault('user-123', 'user@example.com')
  const events = profile.domainEvents
  expect(events).toHaveLength(1)
  expect(events[0].eventName).toBe('UserProfileCreated')
  expect(events[0].payload).toMatchObject({ userId: 'user-123', email: 'user@example.com' })
})

it('updateProfile 應設置 UserProfileUpdated domain event', () => {
  const profile = UserProfile.createDefault('user-123', 'user@example.com')
  const updated = profile.updateProfile({ displayName: '新名稱' })
  const events = updated.domainEvents
  expect(events).toHaveLength(1)
  expect(events[0].eventName).toBe('UserProfileUpdated')
  expect(events[0].payload.fields).toContain('displayName')
})

it('clearDomainEvents 應回傳無事件的新實例', () => {
  const profile = UserProfile.createDefault('user-123', 'user@example.com')
  const cleared = profile.clearDomainEvents()
  expect(cleared.domainEvents).toHaveLength(0)
  // 原始物件不變
  expect(profile.domainEvents).toHaveLength(1)
})
```

**B. UpdateProfileService.test.ts — 修正 userId 一致性**

現有測試 `beforeEach` 先 `save(profile)` 再用 `profileId`（profile UUID）執行 `execute(profileId, ...)`。這是一個隱藏 bug——Service 實際上應用 userId 查詢（userId = 'user-123'）。

修正測試，統一使用 userId：
```typescript
const userId = 'user-123'
// beforeEach:
const profile = UserProfile.createDefault(userId, 'user@example.com')
await repo.save(profile)

// 測試中全部用 userId（不是 profileId）：
const result = await updateService.execute(userId, { displayName: '新名稱' })

// getService.execute 也用 userId：
const profile = await getService.execute(userId)
```

移除 `profileId` 變數，改用 `userId`。`'不存在的 ID 應回傳錯誤'` 測試的參數 `'nonexistent'` 保持不變。

**C. UserRegisteredHandler.test.ts — 更新 import 路徑**

```typescript
import { UserRegisteredHandler } from '../Application/EventHandlers/UserRegisteredHandler'
```

同時將測試的 mock repository 中 `findById` 更名為 `findByUserId`：
```typescript
mockRepository = {
  save: vi.fn().mockResolvedValue(undefined),
  findByUserId: vi.fn(),  // 不是 findById
  update: vi.fn(),
  findAll: vi.fn(),
  count: vi.fn(),
}
```
  </action>
  <verify>
    <automated>cd /Users/carl/Dev/CMG/Draupnir && bun test src/Modules/Profile/ 2>&1 | tail -30</automated>
  </verify>
  <done>
    - UserProfile.test.ts 全部通過（包含新的 domain events 測試）
    - UpdateProfileService.test.ts 全部通過（userId 一致性已修正）
    - UserRegisteredHandler.test.ts 全部通過（新路徑、新 mock 鍵名）
    - Profile 模組所有測試無 TS 錯誤
  </done>
</task>

</tasks>

<verification>
```bash
cd /Users/carl/Dev/CMG/Draupnir
# 全部 Profile 模組測試
bun test src/Modules/Profile/

# TypeScript 編譯檢查（僅 Profile 相關）
bun tsc --noEmit 2>&1 | grep "Profile" | head -20
```

預期結果：
- 所有測試通過
- 無 TypeScript 錯誤
</verification>

<success_criteria>
- UserProfile.props 中 phone / timezone / locale 為 ValueObject 型別，getter 回傳字串（外部不變）
- IUserProfileRepository 有 findByUserId（移除 findById），UserProfileFilters 只有 keyword
- UserProfileRepository.findByUserId 查 WHERE user_id = ?
- UserProfile.createDefault 和 updateProfile 各自設置對應 domain event
- createDefault 使用 Timezone.default() 和 Locale.default()（P6）
- UserRegisteredHandler 在 Application/EventHandlers/ 目錄（P9）
- ProfileServiceProvider.boot() 無 console.log（P8）
- ProfileController 有跨邊界設計注釋（P5）
- bun test src/Modules/Profile/ 全部通過
</success_criteria>

<output>
完成後執行 git commit：
```
feat: [profile] 修正 9 個 DDD 戰術設計問題（VO 整合、findByUserId、Domain Events）
```
</output>
