# Domain Layer 設計指南

## 目錄
1. [Aggregate / Entity](#1-aggregate--entity)
2. [Value Object](#2-value-object)
3. [Repository Interface](#3-repository-interface)
4. [Domain Event](#4-domain-event)

---

## 1. Aggregate / Entity

### 設計模式
- **私有 props 物件**：所有狀態存於 `private props`，不直接暴露
- **Factory method**：`create()` 建立新物件，`reconstitute()` 從 DB 重建
- **狀態機語意**：`withStatus()`, `suspend()`, `activate()` 等方法回傳新實例
- **不可變**：所有變更方法 return `new Entity({...this.props, changed})`

```typescript
export class User {
  private constructor(private readonly props: UserProps) {}

  // Factory: 建立新 User（設定 id、createdAt 等）
  static create(id: string, email: Email, password: Password, role: Role): User {
    return new User({ id, email, password, role, status: UserStatus.ACTIVE,
                      googleId: null, createdAt: new Date(), updatedAt: new Date() })
  }

  // Factory: 從 DB 重建（不含業務邏輯）
  static reconstitute(props: UserProps): User {
    return new User(props)
  }

  // 狀態查詢
  isSuspended(): boolean { return this.props.status === UserStatus.SUSPENDED }
  isAdmin(): boolean { return this.props.role.isAdmin() }

  // 不可變狀態變更
  suspend(): User {
    return new User({ ...this.props, status: UserStatus.SUSPENDED, updatedAt: new Date() })
  }

  // Getter（暴露 read-only 值）
  get id(): string { return this.props.id }
  get emailValue(): string { return this.props.email.getValue() }
  get role(): Role { return this.props.role }
}
```

### 禁止事項
- **禁止** `toDatabaseRow()`、`toPersistence()`、`toDTO()` 等 DB/API 映射方法
- **禁止** 在 Entity 內 `import` 任何 Infrastructure 或 ORM
- **禁止** 直接修改 `this.props.xxx = ...`（必須 immutable）

---

## 2. Value Object

### 設計模式
- Constructor 立即驗證，失敗就 throw（fail-fast）
- 自動正規化（如 email toLowerCase）
- 提供 `equals()` 方法（值語意）
- 使用 `private readonly value` 封裝

```typescript
export class Email {
  private readonly value: string

  constructor(email: string) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error(`Invalid email: ${email}`)
    }
    if (email.length > 255) throw new Error('Email too long')
    this.value = email.toLowerCase()  // 正規化
  }

  getValue(): string { return this.value }
  equals(other: Email): boolean { return this.value === other.value }
}

// 使用靜態工廠方法封裝有限集合
export class Role {
  static admin(): Role { return new Role(RoleType.ADMIN) }
  static member(): Role { return new Role(RoleType.MEMBER) }
  isAdmin(): boolean { return this.type === RoleType.ADMIN }
}
```

### Value Object 對比 Entity

| 特性 | Value Object | Entity |
|------|-------------|--------|
| 識別方式 | 值相等 | id 相等 |
| 不可變 | 完全不可變 | 狀態可以變更（但 immutable 回傳） |
| 例子 | Email, Role, Money | User, Order |

---

## 3. Repository Interface

### 設計規則
- **定義在 Domain 層**：`Domain/Repositories/IXxxRepository.ts`
- **只接受 Domain 物件**：參數和回傳值都是 Entity / VO，不是 raw object
- **Filters 型別定義在同檔**：讓 Application 和 Infrastructure 都能 import

```typescript
// Domain/Repositories/IAuthRepository.ts

export interface UserListFilters {
  readonly role?: string      // 推至 SQL WHERE
  readonly status?: string    // 推至 SQL WHERE
  readonly limit?: number     // DB LIMIT
  readonly offset?: number    // DB OFFSET
}

export interface IAuthRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: Email): Promise<User | null>
  emailExists(email: Email): Promise<boolean>
  save(user: User): Promise<void>
  delete(id: string): Promise<void>

  // 分離 data + count（分頁需要）
  findAll(filters?: UserListFilters): Promise<User[]>
  countAll(filters?: UserListFilters): Promise<number>
}
```

### Filter 設計決策
- **在 Interface 中的 filter**：只放「DB 可索引、無需 JOIN 外部 Module」的欄位
- **keyword 搜尋**：不放在 Repository Interface，由 Application Service 處理
- **分頁**：`limit` + `offset` 放在 Filters 裡，由 Repository 推至 DB

---

## 4. Domain Event

### 設計規則
- Event name 使用 `模組名.事件名` 格式（如 `auth.user_registered`）
- Event 攜帶 **最小必要資料**（只帶 id 和必要欄位，不帶完整 Aggregate）
- 發布在 Application Service 的 use case 最後一步

```typescript
// Domain/Events/UserRegistered.ts
export class UserRegistered {
  readonly type = 'auth.user_registered'
  constructor(
    public readonly userId: string,
    public readonly email: string,
  ) {}
}
```

```typescript
// Application Service 中發布
const dispatcher = DomainEventDispatcher.getInstance()
await dispatcher.dispatch(new UserRegistered(user.id, user.emailValue))
```

### 訂閱（在 ServiceProvider.boot 中）
```typescript
override boot(context: any): void {
  const dispatcher = DomainEventDispatcher.getInstance()
  const handler = new UserRegisteredHandler(context.make('profileRepository'))
  dispatcher.on('auth.user_registered', async (event) => {
    await handler.execute(event.data.userId, event.data.email)
  })
}
```

---

### Domain Events 目錄結構

每個事件獨立一個檔案，放置於 `Domain/Events/` 目錄：

```
src/Modules/<ModuleName>/Domain/Events/
├── UserProfileCreated.ts    # 一個事件一個檔案
└── UserProfileUpdated.ts
```

**禁止**：在 Aggregate 檔案內定義 event interface（污染領域模型，難以單獨測試）。

### Aggregate 宣告事件 vs Application Service 直接 dispatch 的取捨

| 方式 | 適用場景 | 範例 |
|------|----------|------|
| **Aggregate 收集事件**（推薦） | 事件與業務狀態變更強耦合，需確保原子性 | `updateProfile()` 回傳含事件的新實例 |
| **Application Service 直接 dispatch** | 跨 Aggregate 協調，事件不代表 Aggregate 內部狀態 | `RegisterUserService` dispatch `UserRegistered` |

本專案採用 **Aggregate 收集、Application Service 派發** 的混合模式：
- Aggregate 的工廠/變更方法負責收集事件（`domainEvents: [event]`）
- Application Service 在 use case 完成後統一 dispatch 並 clear

### Application Service 派發模式

```typescript
// Application Service 末尾（在 repository save 之後）
const updated = aggregate.updateSomething(data)
await this.repository.save(updated)

// 派發並 clear
const dispatcher = DomainEventDispatcher.getInstance()
await dispatcher.dispatchAll(updated.domainEvents)
// 注意：clearDomainEvents() 回傳新實例（immutable），
// 已持久化的 aggregate 不需要再次儲存 cleared 版本
```

### Event Class 規範

繼承 `@/Shared/Domain/DomainEvent`（**不要**定義 local interface）：

```typescript
// Domain/Events/UserProfileCreated.ts
import { DomainEvent } from '@/Shared/Domain/DomainEvent'

export class UserProfileCreated extends DomainEvent {
  constructor(profileId: string, userId: string, email: string) {
    // super(aggregateId, eventType, data)
    super(profileId, 'profile.user_profile_created', { profileId, userId, email })
  }

  // Typed accessors（從 data 取得，避免 as unknown）
  get profileId(): string { return this.data.profileId as string }
  get userId(): string { return this.data.userId as string }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      aggregateId: this.aggregateId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      data: this.data,
    }
  }
}
```

**eventType 命名規範**：`<module>.<past_tense_event>` 格式（如 `profile.user_profile_created`）
