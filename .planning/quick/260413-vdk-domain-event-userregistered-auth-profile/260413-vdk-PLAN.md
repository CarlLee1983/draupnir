---
phase: quick
plan: 260413-vdk
type: execute
wave: 1
depends_on: []
files_modified:
  - src/Modules/Auth/Domain/Events/UserRegistered.ts
  - src/Modules/Auth/Application/Services/RegisterUserService.ts
  - src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts
  - src/Modules/Profile/Application/Services/UserRegisteredHandler.ts
  - src/Modules/Auth/__tests__/RegisterUserService.test.ts
autonomous: true
requirements: []

must_haves:
  truths:
    - "RegisterUserService 不再直接 import UserProfile 或 IUserProfileRepository"
    - "使用者成功註冊後，DomainEventDispatcher 會發布 UserRegistered 事件"
    - "Profile 模組的 UserRegisteredHandler 接收事件並建立預設 UserProfile"
    - "現有 RegisterUserService 測試全部通過"
    - "Auth ↔ Profile 跨模組耦合只剩 event payload，不再有直接 import"
  artifacts:
    - path: "src/Modules/Auth/Domain/Events/UserRegistered.ts"
      provides: "UserRegistered domain event class"
      exports: ["UserRegistered"]
    - path: "src/Modules/Profile/Application/Services/UserRegisteredHandler.ts"
      provides: "處理 UserRegistered 事件並建立 UserProfile"
      exports: ["UserRegisteredHandler"]
  key_links:
    - from: "RegisterUserService"
      to: "DomainEventDispatcher"
      via: "dispatcher.dispatch(new UserRegistered(...))"
    - from: "AuthServiceProvider.boot()"
      to: "UserRegisteredHandler"
      via: "dispatcher.on('auth.user_registered', handler)"
---

<objective>
解耦 Auth ↔ Profile 跨模組直接依賴，改用 Domain Event（UserRegistered）進行非同步通訊。

Purpose: RegisterUserService 目前直接 import UserProfile aggregate 和 IUserProfileRepository，違反 bounded context 邊界。Auth 模組不應知道 Profile 模組的內部細節。
Output: UserRegistered domain event、UserRegisteredHandler、更新後的 RegisterUserService 和 AuthServiceProvider 綁定
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/Shared/Domain/DomainEvent.ts
@src/Shared/Domain/DomainEventDispatcher.ts
@src/Modules/Auth/Application/Services/RegisterUserService.ts
@src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts
@src/Modules/Profile/Infrastructure/Providers/ProfileServiceProvider.ts
@src/Modules/Profile/Domain/Repositories/IUserProfileRepository.ts
@src/Modules/Auth/__tests__/RegisterUserService.test.ts

<interfaces>
<!-- 現有 DomainEvent 基底類別 -->
```typescript
// src/Shared/Domain/DomainEvent.ts
export abstract class DomainEvent {
  readonly eventId: string = crypto.randomUUID()
  readonly aggregateId: string
  readonly eventType: string
  readonly occurredAt: Date
  readonly version: number
  readonly data: Record<string, unknown>

  constructor(aggregateId: string, eventType: string, data?: Record<string, unknown>, version?: number, occurredAt?: Date)
  abstract toJSON(): Record<string, unknown>
}
```

<!-- 現有 DomainEventDispatcher 用法（參考 Credit 模組） -->
```typescript
// 發布事件
const dispatcher = DomainEventDispatcher.getInstance()
await dispatcher.dispatch(new SomeEvent(aggregateId, payload))

// 訂閱事件（在 ServiceProvider.boot() 或 register() 中）
dispatcher.on('event.type_string', async (event) => {
  await handler.execute(event.data.someField as string)
})
```

<!-- 現有事件範例 -->
```typescript
// src/Modules/Credit/Domain/Events/BalanceDepleted.ts
export class BalanceDepleted extends DomainEvent {
  constructor(accountId: string, orgId: string) {
    super(accountId, 'credit.balance_depleted', { orgId })
  }
  get orgId(): string { return this.data.orgId as string }
  toJSON(): Record<string, unknown> { return { eventId: ..., aggregateId: ..., eventType: ..., occurredAt: ..., data: ... } }
}
```

<!-- IUserProfileRepository 介面 -->
```typescript
export interface IUserProfileRepository {
  save(profile: UserProfile): Promise<void>
  findById(id: string): Promise<UserProfile | null>
  update(profile: UserProfile): Promise<void>
  findAll(filters?: UserProfileFilters, limit?: number, offset?: number): Promise<UserProfile[]>
  count(filters?: UserProfileFilters): Promise<number>
}
```

<!-- UserProfile.createDefault() -->
```typescript
static createDefault(userId: string, email: string): UserProfile
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: 建立 UserRegistered domain event 並更新 RegisterUserService</name>
  <files>
    src/Modules/Auth/Domain/Events/UserRegistered.ts
    src/Modules/Auth/Application/Services/RegisterUserService.ts
    src/Modules/Auth/__tests__/RegisterUserService.test.ts
  </files>
  <behavior>
    - Test 1: 成功註冊後，DomainEventDispatcher 收到一個 'auth.user_registered' 事件，事件中 data.userId 和 data.email 正確
    - Test 2: 現有所有 RegisterUserService 測試仍通過（email 重複拒絕、密碼驗證等）
    - Test 3: RegisterUserService 不再接受 IUserProfileRepository 參數（constructor 只剩 authRepository + passwordHasher）
  </behavior>
  <action>
    1. 建立 `src/Modules/Auth/Domain/Events/UserRegistered.ts`：
       - 繼承 DomainEvent
       - eventType = `'auth.user_registered'`
       - data payload = `{ userId: string, email: string }`
       - 加入 `get userId()` 和 `get email()` 存取器
       - 實作 `toJSON()`，格式參照 BalanceDepleted

    2. 更新 `src/Modules/Auth/Application/Services/RegisterUserService.ts`：
       - 移除 `IUserProfileRepository` 的 import 和 constructor 參數（第 13 行的 UserProfile import、第 14 行的 IUserProfileRepository import）
       - constructor 改為只接受 `(authRepository: IAuthRepository, passwordHasher: IPasswordHasher)`
       - 在步驟 5「Save to database」成功後，加入：
         ```typescript
         const dispatcher = DomainEventDispatcher.getInstance()
         await dispatcher.dispatch(new UserRegistered(user.id, user.emailValue))
         ```
       - 移除原步驟 6 整個 try/catch profile 建立區塊
       - import 新增：`import { UserRegistered } from '../../Domain/Events/UserRegistered'` 和 `import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'`

    3. 更新 `src/Modules/Auth/__tests__/RegisterUserService.test.ts`：
       - 移除 `UserProfileRepository` 和 `MemoryDatabaseAccess` 的 import（Profile 相關）
       - `beforeEach` 中移除 `profileRepo`，改為：
         ```typescript
         service = new RegisterUserService(repository, new ScryptPasswordHasher())
         ```
       - 新增測試：「成功註冊後應發布 UserRegistered 事件」
         - beforeEach 呼叫 `DomainEventDispatcher.resetForTesting()`
         - 使用 `dispatcher.on('auth.user_registered', handler)` 捕獲事件
         - 斷言 handler 被呼叫且 event.data.email === 'newuser@example.com'
  </action>
  <verify>
    <automated>cd /Users/carl/Dev/CMG/Draupnir && bun test src/Modules/Auth/__tests__/RegisterUserService.test.ts --reporter=verbose 2>&1 | tail -30</automated>
  </verify>
  <done>
    - UserRegistered.ts 存在並正確繼承 DomainEvent
    - RegisterUserService constructor 只有 2 個參數（不含 profileRepo）
    - 所有 RegisterUserService 測試通過，包含新的事件發布測試
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: 建立 UserRegisteredHandler 並更新 AuthServiceProvider 綁定</name>
  <files>
    src/Modules/Profile/Application/Services/UserRegisteredHandler.ts
    src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts
  </files>
  <behavior>
    - Test 1: UserRegisteredHandler.execute({ userId, email }) 呼叫 userProfileRepository.save() 一次，傳入 UserProfile.createDefault(userId, email) 的結果
    - Test 2: 若 userId 或 email 為空字串，execute() 應拋出錯誤（或回傳 failure）
  </behavior>
  <action>
    1. 建立 `src/Modules/Profile/Application/Services/UserRegisteredHandler.ts`：
       ```typescript
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
       - import `UserProfile` from `'../../Domain/Aggregates/UserProfile'`
       - import `IUserProfileRepository` from `'../../Domain/Repositories/IUserProfileRepository'`

    2. 更新 `src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts`：
       - 在 `register()` 的 `registerUserService` bind 中：移除 `profileRepo` 參數，只傳 `repository` 和 `passwordHasher`
       - 在 `boot(_context)` 方法中，加入事件訂閱：
         ```typescript
         import type { IUserProfileRepository } from '@/Modules/Profile/Domain/Repositories/IUserProfileRepository'
         import { UserRegisteredHandler } from '@/Modules/Profile/Application/Services/UserRegisteredHandler'
         import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
         ```
         boot 方法：
         ```typescript
         override boot(context: any): void {
           const container: IContainer = context
           const profileRepo = container.make('profileRepository') as IUserProfileRepository
           const handler = new UserRegisteredHandler(profileRepo)
           const dispatcher = DomainEventDispatcher.getInstance()
           dispatcher.on('auth.user_registered', async (event) => {
             await handler.execute(
               event.data.userId as string,
               event.data.email as string,
             )
           })
           console.log('🔐 [Auth] Module loaded')
         }
         ```
         注意：boot() 參數在現有 AuthServiceProvider 是 `_context: any`，改為 `context: any`（移除底線前綴）。

    測試在 `src/Modules/Profile/__tests__/UserRegisteredHandler.test.ts` 新增：
       - import `UserRegisteredHandler`、`IUserProfileRepository`、`UserProfileRepository`、`MemoryDatabaseAccess`
       - 兩個 it 測試對應 behavior 中的 Test 1 和 Test 2
  </action>
  <verify>
    <automated>cd /Users/carl/Dev/CMG/Draupnir && bun test src/Modules/Profile/__tests__/UserRegisteredHandler.test.ts src/Modules/Auth/__tests__/RegisterUserService.test.ts --reporter=verbose 2>&1 | tail -40</automated>
  </verify>
  <done>
    - UserRegisteredHandler.ts 存在，execute() 呼叫 profileRepository.save()
    - AuthServiceProvider.boot() 訂閱 'auth.user_registered' 並呼叫 UserRegisteredHandler
    - AuthServiceProvider.register() 中 registerUserService 不再傳入 profileRepo
    - 兩個測試檔案全部通過
  </done>
</task>

<task type="auto">
  <name>Task 3: 全套測試驗證與型別檢查</name>
  <files></files>
  <action>
    執行以下驗證，確認沒有引入型別錯誤或測試迴歸：

    1. 執行 Auth 和 Profile 模組所有測試：
       `bun test src/Modules/Auth/ src/Modules/Profile/ --reporter=verbose`

    2. TypeScript 型別檢查：
       `bun run typecheck`

    若 typecheck 發現 Auth ↔ Profile 仍有殘餘 import（例如 AuthServiceProvider 仍 import IUserProfileRepository），
    這些 import 屬於「透過容器取得，但仍需型別標注」的合法依賴，可保留 type-only import。
    但 RegisterUserService.ts 不得有任何 Profile 模組的 import。

    若有型別錯誤，逐一修正後重跑 typecheck 直到通過。
  </action>
  <verify>
    <automated>cd /Users/carl/Dev/CMG/Draupnir && bun test src/Modules/Auth/ src/Modules/Profile/ 2>&1 | tail -20</automated>
  </verify>
  <done>
    - 所有 Auth 和 Profile 模組測試通過
    - `bun run typecheck` 無新增錯誤
    - `RegisterUserService.ts` 的 import 清單中不含任何 `@/Modules/Profile` 路徑
  </done>
</task>

</tasks>

<verification>
完成後確認：
1. `grep -n "Profile" src/Modules/Auth/Application/Services/RegisterUserService.ts` 應無任何輸出
2. `bun test src/Modules/Auth/ src/Modules/Profile/` 全部通過
3. `src/Modules/Auth/Domain/Events/UserRegistered.ts` 存在
4. `src/Modules/Profile/Application/Services/UserRegisteredHandler.ts` 存在
</verification>

<success_criteria>
- Auth 模組的 RegisterUserService 不再直接依賴 Profile 模組任何 class 或 interface
- UserRegistered 事件遵循現有 DomainEvent 模式（eventType = 'auth.user_registered'）
- Profile 建立邏輯透過 UserRegisteredHandler 接收事件觸發，行為與之前相同
- 所有測試通過，typecheck 無新錯誤
</success_criteria>

<output>
完成後建立 `.planning/quick/260413-vdk-domain-event-userregistered-auth-profile/260413-vdk-SUMMARY.md`
</output>
