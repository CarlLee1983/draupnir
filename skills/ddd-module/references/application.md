# Application Layer 設計指南

## 目錄
1. [Application Service](#1-application-service)
2. [DTO 設計](#2-dto-設計)
3. [Port Interface](#3-port-interface)
4. [Filter 與分頁策略](#4-filter-與分頁策略)

---

## 1. Application Service

### 設計規則
- **Use Case 導向**：一個 Service = 一個用例（`RegisterUserService`、`ListUsersService`）
- **協調者角色**：Service 協調 Repository + Domain Object + Port，業務邏輯在 Entity/VO
- **回傳 DTO**：Service 輸出都是 DTO，不暴露 Domain Object 給外層

```typescript
export class RegisterUserService {
  constructor(
    private authRepository: IAuthRepository,
    private passwordHasher: IPasswordHasher,  // Port（Application/Ports/）
  ) {}

  async execute(request: RegisterUserRequest): Promise<RegisterUserResponse> {
    // 1. 建立 VO（觸發驗證）
    const email = new Email(request.email)

    // 2. 業務規則檢查
    if (await this.authRepository.emailExists(email)) {
      return { success: false, error: 'EMAIL_ALREADY_EXISTS' }
    }

    // 3. 委託 Infrastructure 做技術操作（hash）
    const hashedPassword = await this.passwordHasher.hash(request.password)

    // 4. 建立 Aggregate（Domain Factory）
    const user = User.create(crypto.randomUUID(), email,
                             Password.fromHashed(hashedPassword), Role.member())

    // 5. 持久化
    await this.authRepository.save(user)

    // 6. 發布 Domain Event（解耦其他 Module）
    await DomainEventDispatcher.getInstance()
      .dispatch(new UserRegistered(user.id, user.emailValue))

    return { success: true, data: { id: user.id, email: user.emailValue } }
  }
}
```

### Application Service 不應該做的事
- **禁止**：在 Service 內直接 `new Email('...')` 後再手動驗證格式（讓 VO 自己驗證）
- **禁止**：在 Service 內做 in-memory role/status filter（應推至 Repository WHERE）
- **禁止**：在 Service 內 `import` 任何 ORM、DB 連線

---

## 2. DTO 設計

### Query DTO（請求端）
- 所有欄位 optional（讓 Service 設定 default）
- 篩選欄位使用 string 型別（不用 enum，避免 Domain 與 HTTP 層耦合）

```typescript
// Application/DTOs/UserListDTO.ts
export interface ListUsersQuery {
  role?: string    // 篩選（推至 DB WHERE）
  status?: string  // 篩選（推至 DB WHERE）
  keyword?: string // 搜尋（Application 記憶體）
  page?: number    // 分頁
  limit?: number   // 分頁
}
```

### Response DTO
- 扁平化：避免深層巢狀
- 日期欄位使用 ISO string（非 Date 物件）
- 跨 Module 的資料（如 displayName 來自 Profile）也包含在同一 DTO

```typescript
export interface UserListItemDTO {
  id: string
  email: string
  role: string
  status: string
  displayName: string   // 來自 Profile module
  avatarUrl: string | null
  createdAt: string     // ISO string
}

export interface ListUsersResponse {
  success: boolean
  data?: {
    users: UserListItemDTO[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }
  error?: string
}
```

---

## 3. Port Interface

外部技術依賴（Email、JWT、OAuth）定義在 `Application/Ports/`，實作在 Infrastructure：

```typescript
// Application/Ports/IPasswordHasher.ts
export interface IPasswordHasher {
  hash(password: string): Promise<string>
  verify(hashed: string, plain: string): Promise<boolean>
}

// Application/Ports/IJwtTokenService.ts
export interface IJwtTokenService {
  signAccessToken(payload: TokenSignPayload): AuthToken
  signRefreshToken(payload: TokenSignPayload): AuthToken
  verify(token: string): TokenPayload
}
```

---

## 4. Filter 與分頁策略

### 無 keyword 情境（最優）

```typescript
// role/status → DB WHERE；limit/offset → DB LIMIT/OFFSET
const [count, users] = await Promise.all([
  this.authRepository.countAll({ role, status }),
  this.authRepository.findAll({ role, status, limit, offset }),
])
```

### 有 keyword 情境（需跨 Module join）

```typescript
// keyword 需要 join profile → 先撈全部（套用 role/status），再記憶體篩選
const [users, profiles] = await Promise.all([
  this.authRepository.findAll({ role, status }),  // 無 limit/offset
  this.profileRepository.findAll(),
])
const profileById = new Map(profiles.map(p => [p.id, p]))

const filtered = users
  .map(u => buildDTO(u, profileById))
  .filter(dto =>
    dto.email.toLowerCase().includes(keyword) ||
    dto.displayName.toLowerCase().includes(keyword)
  )

total = filtered.length
pageItems = filtered.slice(offset, offset + limit)
```

### 選擇依據
- 有 keyword → 記憶體分頁（資料量小時可接受，大量資料需考慮 FTS 方案）
- 無 keyword → DB 分頁（高效，任意資料量）
