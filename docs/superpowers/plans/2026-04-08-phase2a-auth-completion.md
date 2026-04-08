# Phase 2A: Auth 補完 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 補完 Auth 模組 — 密碼重設（API-only）和 RBAC 三角色系統

**Architecture:** 擴展現有 Auth 模組，新增 PasswordResetToken VO 和 Repository，重構 Role/Permission 為 ADMIN/MANAGER/MEMBER 三角色，新增 RoleMiddleware 供後續模組使用。

**Tech Stack:** Bun, TypeScript, Vitest, Gravito DDD Framework

---

## File Structure

### 新建檔案
- `src/Modules/Auth/Domain/ValueObjects/PasswordResetToken.ts` — 密碼重設 Token VO
- `src/Modules/Auth/Domain/Repositories/IPasswordResetTokenRepository.ts` — Repository 介面
- `src/Modules/Auth/Infrastructure/Repositories/PasswordResetTokenRepository.ts` — Repository 實作
- `src/Modules/Auth/Application/DTOs/PasswordResetDTO.ts` — 密碼重設 DTO
- `src/Modules/Auth/Application/Services/RequestPasswordResetService.ts` — 請求重設服務
- `src/Modules/Auth/Application/Services/ExecutePasswordResetService.ts` — 執行重設服務
- `src/Modules/Auth/Presentation/Middleware/RoleMiddleware.ts` — 角色檢查中間件
- `src/Modules/Auth/__tests__/PasswordResetToken.test.ts` — PasswordResetToken VO 測試
- `src/Modules/Auth/__tests__/RequestPasswordResetService.test.ts` — 請求重設測試
- `src/Modules/Auth/__tests__/ExecutePasswordResetService.test.ts` — 執行重設測試
- `src/Modules/Auth/__tests__/Role.test.ts` — 重構後 Role 測試
- `src/Modules/Auth/__tests__/RoleMiddleware.test.ts` — 角色中間件測試

### 修改檔案
- `src/Modules/Auth/Domain/Aggregates/User.ts` — UserRole enum 改為三角色，新增 resetPassword 方法
- `src/Modules/Auth/Domain/ValueObjects/Role.ts` — 重構為 ADMIN/MANAGER/MEMBER
- `src/Modules/Auth/Domain/ValueObjects/Permission.ts` — 重構權限集合
- `src/Modules/Auth/Domain/Services/AuthorizationService.ts` — 補完 requirePermission
- `src/Modules/Auth/Application/Services/LoginUserService.ts` — 更新 permissions 注入
- `src/Modules/Auth/Application/Services/RegisterUserService.ts` — 預設角色改為 MEMBER
- `src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts` — 註冊新服務
- `src/Modules/Auth/Presentation/Controllers/AuthController.ts` — 新增密碼重設端點
- `src/Modules/Auth/Presentation/Routes/auth.routes.ts` — 新增路由
- `src/Modules/Auth/index.ts` — 導出新增的公開 API
- `src/Shared/Infrastructure/Middleware/AuthMiddleware.ts` — 新增 requireRole 靜態方法

---

### Task 1: 重構 Role 和 Permission — ADMIN/MANAGER/MEMBER 三角色

**Files:**
- Modify: `src/Modules/Auth/Domain/ValueObjects/Permission.ts`
- Modify: `src/Modules/Auth/Domain/ValueObjects/Role.ts`
- Modify: `src/Modules/Auth/Domain/Aggregates/User.ts`
- Test: `src/Modules/Auth/__tests__/Role.test.ts`

- [ ] **Step 1: 寫 Role 測試**

```typescript
// src/Modules/Auth/__tests__/Role.test.ts
import { describe, it, expect } from 'vitest'
import { Role, RoleType } from '../Domain/ValueObjects/Role'
import { PermissionType } from '../Domain/ValueObjects/Permission'

describe('Role Value Object', () => {
  it('ADMIN 應擁有所有權限', () => {
    const role = new Role(RoleType.ADMIN)
    expect(role.isAdmin()).toBe(true)
    expect(role.hasPermissionString(PermissionType.ADMIN_ACCESS)).toBe(true)
    expect(role.hasPermissionString(PermissionType.USER_MANAGE)).toBe(true)
    expect(role.hasPermissionString(PermissionType.ORG_MANAGE)).toBe(true)
  })

  it('MANAGER 應有組織管理權限但無系統管理權限', () => {
    const role = new Role(RoleType.MANAGER)
    expect(role.isManager()).toBe(true)
    expect(role.hasPermissionString(PermissionType.ORG_MEMBER_MANAGE)).toBe(true)
    expect(role.hasPermissionString(PermissionType.KEY_MANAGE)).toBe(true)
    expect(role.hasPermissionString(PermissionType.ADMIN_ACCESS)).toBe(false)
    expect(role.hasPermissionString(PermissionType.SYSTEM_MANAGE)).toBe(false)
  })

  it('MEMBER 應只有個人操作權限', () => {
    const role = new Role(RoleType.MEMBER)
    expect(role.isMember()).toBe(true)
    expect(role.hasPermissionString(PermissionType.PROFILE_READ)).toBe(true)
    expect(role.hasPermissionString(PermissionType.PROFILE_UPDATE)).toBe(true)
    expect(role.hasPermissionString(PermissionType.KEY_CREATE)).toBe(true)
    expect(role.hasPermissionString(PermissionType.ORG_MANAGE)).toBe(false)
  })

  it('應拒絕無效角色', () => {
    expect(() => new Role('superuser')).toThrow('無效的角色')
  })

  it('舊的 USER 值應自動映射為 MEMBER', () => {
    const role = new Role('user')
    expect(role.getValue()).toBe(RoleType.MEMBER)
    expect(role.isMember()).toBe(true)
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `bun test src/Modules/Auth/__tests__/Role.test.ts`
Expected: FAIL — `RoleType.MANAGER` 不存在，`isManager` 方法不存在

- [ ] **Step 3: 重構 Permission VO**

```typescript
// src/Modules/Auth/Domain/ValueObjects/Permission.ts
export enum PermissionType {
  // 系統管理
  SYSTEM_MANAGE = 'system:manage',
  ADMIN_ACCESS = 'admin:access',

  // 使用者管理（Admin 用）
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_LIST = 'user:list',
  USER_MANAGE = 'user:manage',

  // 個人 Profile
  PROFILE_READ = 'profile:read',
  PROFILE_UPDATE = 'profile:update',

  // 組織管理
  ORG_CREATE = 'org:create',
  ORG_READ = 'org:read',
  ORG_UPDATE = 'org:update',
  ORG_MANAGE = 'org:manage',
  ORG_MEMBER_MANAGE = 'org:member:manage',
  ORG_MEMBER_INVITE = 'org:member:invite',

  // API Key 管理
  KEY_CREATE = 'key:create',
  KEY_READ = 'key:read',
  KEY_UPDATE = 'key:update',
  KEY_DELETE = 'key:delete',
  KEY_MANAGE = 'key:manage',

  // 用量檢視
  USAGE_READ = 'usage:read',
}

export class Permission {
  private readonly value: PermissionType

  constructor(value: PermissionType | string) {
    if (!this.isValid(value)) {
      throw new Error(`無效的權限: ${value}`)
    }
    this.value = value as PermissionType
  }

  private isValid(value: string): boolean {
    return Object.values(PermissionType).includes(value as PermissionType)
  }

  getValue(): PermissionType {
    return this.value
  }

  getModule(): string {
    return this.value.split(':')[0]
  }

  getAction(): string {
    return this.value.split(':')[1]
  }

  equals(other: Permission): boolean {
    return this.value === other.value
  }

  isReadPermission(): boolean {
    return this.getAction() === 'read' || this.getAction() === 'list'
  }

  isWritePermission(): boolean {
    return ['create', 'update', 'delete'].includes(this.getAction())
  }

  isAdminPermission(): boolean {
    return this.value === PermissionType.ADMIN_ACCESS || this.value === PermissionType.SYSTEM_MANAGE
  }

  toString(): string {
    return this.value
  }
}
```

- [ ] **Step 4: 重構 Role VO**

```typescript
// src/Modules/Auth/Domain/ValueObjects/Role.ts
import { Permission, PermissionType } from './Permission'

export enum RoleType {
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
}

/** 向後相容映射：舊值 → 新值 */
const LEGACY_ROLE_MAP: Record<string, RoleType> = {
  user: RoleType.MEMBER,
  guest: RoleType.MEMBER,
}

export class Role {
  private readonly value: RoleType
  private readonly permissions: Set<PermissionType>

  constructor(value: RoleType | string) {
    const mapped = LEGACY_ROLE_MAP[value] ?? value
    if (!Object.values(RoleType).includes(mapped as RoleType)) {
      throw new Error(`無效的角色: ${value}`)
    }
    this.value = mapped as RoleType
    this.permissions = this.initializePermissions(this.value)
  }

  private initializePermissions(role: RoleType): Set<PermissionType> {
    const permissions: PermissionType[] = []

    switch (role) {
      case RoleType.ADMIN:
        permissions.push(...Object.values(PermissionType))
        break

      case RoleType.MANAGER:
        permissions.push(
          // 組織成員管理
          PermissionType.ORG_READ,
          PermissionType.ORG_MEMBER_MANAGE,
          PermissionType.ORG_MEMBER_INVITE,
          // API Key 管理
          PermissionType.KEY_CREATE,
          PermissionType.KEY_READ,
          PermissionType.KEY_UPDATE,
          PermissionType.KEY_DELETE,
          PermissionType.KEY_MANAGE,
          // 用量
          PermissionType.USAGE_READ,
          // 個人 Profile
          PermissionType.PROFILE_READ,
          PermissionType.PROFILE_UPDATE,
        )
        break

      case RoleType.MEMBER:
        permissions.push(
          // 個人 Profile
          PermissionType.PROFILE_READ,
          PermissionType.PROFILE_UPDATE,
          // 自己的 Key
          PermissionType.KEY_CREATE,
          PermissionType.KEY_READ,
          PermissionType.KEY_UPDATE,
          PermissionType.KEY_DELETE,
          // 自己的用量
          PermissionType.USAGE_READ,
        )
        break
    }

    return new Set(permissions)
  }

  getValue(): RoleType {
    return this.value
  }

  getPermissions(): Permission[] {
    return Array.from(this.permissions).map((perm) => new Permission(perm))
  }

  hasPermission(permission: Permission): boolean {
    return this.permissions.has(permission.getValue())
  }

  hasPermissionString(permission: PermissionType): boolean {
    return this.permissions.has(permission)
  }

  isAdmin(): boolean {
    return this.value === RoleType.ADMIN
  }

  isManager(): boolean {
    return this.value === RoleType.MANAGER
  }

  isMember(): boolean {
    return this.value === RoleType.MEMBER
  }

  equals(other: Role): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
```

- [ ] **Step 5: 更新 User aggregate 的 UserRole enum**

在 `src/Modules/Auth/Domain/Aggregates/User.ts` 中：

```typescript
// 替換舊的 enum
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
}
```

同時更新 `User.create()` 的預設值：

```typescript
static async create(
  id: string,
  email: Email,
  plainPassword: string,
  role: UserRole = UserRole.MEMBER  // 原本是 UserRole.USER
): Promise<User> {
```

新增 `isManager()` 方法：

```typescript
isManager(): boolean {
  return this.props.role === UserRole.MANAGER
}
```

- [ ] **Step 6: 執行測試確認通過**

Run: `bun test src/Modules/Auth/__tests__/Role.test.ts`
Expected: PASS

- [ ] **Step 7: 執行所有既有 Auth 測試確認無破壞**

Run: `bun test src/Modules/Auth/__tests__/`
Expected: 全部 PASS（既有測試應因向後相容映射而通過）

- [ ] **Step 8: Commit**

```bash
git add src/Modules/Auth/Domain/ValueObjects/Permission.ts src/Modules/Auth/Domain/ValueObjects/Role.ts src/Modules/Auth/Domain/Aggregates/User.ts src/Modules/Auth/__tests__/Role.test.ts
git commit -m "refactor: [auth] 重構 RBAC 為 ADMIN/MANAGER/MEMBER 三角色系統"
```

---

### Task 2: 補完 AuthorizationService 和 RoleMiddleware

**Files:**
- Modify: `src/Modules/Auth/Domain/Services/AuthorizationService.ts`
- Create: `src/Modules/Auth/Presentation/Middleware/RoleMiddleware.ts`
- Modify: `src/Shared/Infrastructure/Middleware/AuthMiddleware.ts`
- Test: `src/Modules/Auth/__tests__/RoleMiddleware.test.ts`

- [ ] **Step 1: 寫 RoleMiddleware 測試**

```typescript
// src/Modules/Auth/__tests__/RoleMiddleware.test.ts
import { describe, it, expect } from 'vitest'
import { createRoleMiddleware } from '../Presentation/Middleware/RoleMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { AuthContext } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

function createMockContext(auth?: AuthContext): IHttpContext {
  const store = new Map<string, unknown>()
  if (auth) store.set('auth', auth)
  return {
    getBodyText: async () => '',
    getJsonBody: async () => ({}),
    getBody: async () => ({}),
    getHeader: () => undefined,
    getParam: () => undefined,
    getQuery: () => undefined,
    params: {},
    query: {},
    headers: {},
    json: (data: any, status?: number) => new Response(JSON.stringify(data), { status: status ?? 200 }),
    text: (content: string, status?: number) => new Response(content, { status: status ?? 200 }),
    redirect: (url: string) => new Response(null, { status: 302, headers: { Location: url } }),
    get: <T>(key: string) => store.get(key) as T | undefined,
    set: (key: string, value: unknown) => { store.set(key, value) },
  }
}

describe('RoleMiddleware', () => {
  it('ADMIN 應通過 requireRole("admin") 檢查', async () => {
    const middleware = createRoleMiddleware('admin')
    const ctx = createMockContext({ userId: '1', email: 'a@b.com', role: 'admin', permissions: [], tokenType: 'access' })
    let nextCalled = false
    const next = async () => { nextCalled = true; return new Response('ok') }
    await middleware(ctx, next)
    expect(nextCalled).toBe(true)
  })

  it('MEMBER 應被 requireRole("admin") 拒絕', async () => {
    const middleware = createRoleMiddleware('admin')
    const ctx = createMockContext({ userId: '1', email: 'a@b.com', role: 'member', permissions: [], tokenType: 'access' })
    let nextCalled = false
    const next = async () => { nextCalled = true; return new Response('ok') }
    const response = await middleware(ctx, next)
    expect(nextCalled).toBe(false)
    expect(response.status).toBe(403)
  })

  it('未認證應回傳 401', async () => {
    const middleware = createRoleMiddleware('admin')
    const ctx = createMockContext()
    let nextCalled = false
    const next = async () => { nextCalled = true; return new Response('ok') }
    const response = await middleware(ctx, next)
    expect(nextCalled).toBe(false)
    expect(response.status).toBe(401)
  })

  it('ADMIN 應通過任何角色檢查', async () => {
    const middleware = createRoleMiddleware('manager')
    const ctx = createMockContext({ userId: '1', email: 'a@b.com', role: 'admin', permissions: [], tokenType: 'access' })
    let nextCalled = false
    const next = async () => { nextCalled = true; return new Response('ok') }
    await middleware(ctx, next)
    expect(nextCalled).toBe(true)
  })

  it('MANAGER 應通過 requireRole("manager") 檢查', async () => {
    const middleware = createRoleMiddleware('manager')
    const ctx = createMockContext({ userId: '1', email: 'a@b.com', role: 'manager', permissions: [], tokenType: 'access' })
    let nextCalled = false
    const next = async () => { nextCalled = true; return new Response('ok') }
    await middleware(ctx, next)
    expect(nextCalled).toBe(true)
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `bun test src/Modules/Auth/__tests__/RoleMiddleware.test.ts`
Expected: FAIL — `createRoleMiddleware` 不存在

- [ ] **Step 3: 更新 AuthorizationService**

```typescript
// src/Modules/Auth/Domain/Services/AuthorizationService.ts
import { AppException } from '@/Shared/Application/AppException'
import type { Permission } from '../ValueObjects/Permission'
import { Role, RoleType } from '../ValueObjects/Role'

export class AuthorizationService {
  hasPermission(role: Role, permission: Permission): boolean {
    return role.hasPermission(permission)
  }

  isAdmin(role: Role): boolean {
    return role.isAdmin()
  }

  hasAnyPermission(role: Role, permissions: Permission[]): boolean {
    return permissions.some((perm) => role.hasPermission(perm))
  }

  hasAllPermissions(role: Role, permissions: Permission[]): boolean {
    return permissions.every((perm) => role.hasPermission(perm))
  }

  requirePermission(role: Role, permission: Permission): void {
    if (!role.hasPermission(permission)) {
      throw AppException.forbidden(`缺少權限: ${permission.getValue()}`)
    }
  }

  getRoleLevel(role: Role): number {
    if (role.isAdmin()) return 3
    if (role.isManager()) return 2
    return 1
  }

  canManageUser(userRole: Role, targetUserRole: Role): boolean {
    return this.getRoleLevel(userRole) > this.getRoleLevel(targetUserRole)
  }

  meetsMinimumRole(userRoleStr: string, requiredRoleStr: string): boolean {
    const userRole = new Role(userRoleStr)
    const requiredRole = new Role(requiredRoleStr)
    return this.getRoleLevel(userRole) >= this.getRoleLevel(requiredRole)
  }
}
```

- [ ] **Step 4: 確認 AppException 支援 forbidden**

若 `src/Shared/Application/AppException.ts` 缺少 `forbidden` 靜態方法，需新增：

```typescript
static forbidden(message: string): AppException {
  return new AppException(message, 'FORBIDDEN', 403)
}
```

- [ ] **Step 5: 建立 RoleMiddleware**

```typescript
// src/Modules/Auth/Presentation/Middleware/RoleMiddleware.ts
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'
import type { AuthContext } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import { AuthorizationService } from '../../Domain/Services/AuthorizationService'

const authorizationService = new AuthorizationService()

export function createRoleMiddleware(...allowedRoles: string[]): Middleware {
  return async (ctx, next) => {
    const auth = ctx.get<AuthContext>('auth')
    if (!auth) {
      return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    }

    // ADMIN 通過所有檢查
    if (auth.role === 'admin') {
      return next()
    }

    // 檢查是否為允許的角色之一
    const hasRole = allowedRoles.some((requiredRole) =>
      authorizationService.meetsMinimumRole(auth.role, requiredRole)
    )

    if (!hasRole) {
      return ctx.json({ success: false, message: '權限不足', error: 'FORBIDDEN' }, 403)
    }

    return next()
  }
}

export function requireAuth(): Middleware {
  return async (ctx, next) => {
    const auth = ctx.get<AuthContext>('auth')
    if (!auth) {
      return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    }
    return next()
  }
}
```

- [ ] **Step 6: 執行測試確認通過**

Run: `bun test src/Modules/Auth/__tests__/RoleMiddleware.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/Modules/Auth/Domain/Services/AuthorizationService.ts src/Modules/Auth/Presentation/Middleware/RoleMiddleware.ts src/Modules/Auth/__tests__/RoleMiddleware.test.ts src/Shared/Application/AppException.ts
git commit -m "feat: [auth] 新增 RoleMiddleware 和補完 AuthorizationService"
```

---

### Task 3: PasswordResetToken Value Object

**Files:**
- Create: `src/Modules/Auth/Domain/ValueObjects/PasswordResetToken.ts`
- Test: `src/Modules/Auth/__tests__/PasswordResetToken.test.ts`

- [ ] **Step 1: 寫 PasswordResetToken 測試**

```typescript
// src/Modules/Auth/__tests__/PasswordResetToken.test.ts
import { describe, it, expect } from 'vitest'
import { PasswordResetToken } from '../Domain/ValueObjects/PasswordResetToken'

describe('PasswordResetToken Value Object', () => {
  it('應成功建立有效的重設 Token', () => {
    const token = PasswordResetToken.create('user-123')
    expect(token.getUserId()).toBe('user-123')
    expect(token.getToken()).toBeTruthy()
    expect(token.getToken().length).toBeGreaterThan(20)
    expect(token.isExpired()).toBe(false)
    expect(token.isUsed()).toBe(false)
  })

  it('Token 應在 1 小時後過期', () => {
    const token = PasswordResetToken.create('user-123')
    const expiresAt = token.getExpiresAt()
    const now = new Date()
    const diffMs = expiresAt.getTime() - now.getTime()
    // 容許 1 秒誤差
    expect(diffMs).toBeGreaterThan(59 * 60 * 1000)
    expect(diffMs).toBeLessThanOrEqual(60 * 60 * 1000 + 1000)
  })

  it('markAsUsed 應標記 Token 為已使用', () => {
    const token = PasswordResetToken.create('user-123')
    expect(token.isUsed()).toBe(false)
    const usedToken = token.markAsUsed()
    expect(usedToken.isUsed()).toBe(true)
    // 原始 token 不變（immutable）
    expect(token.isUsed()).toBe(false)
  })

  it('getTokenHash 應回傳 SHA-256 hash', () => {
    const token = PasswordResetToken.create('user-123')
    const hash = token.getTokenHash()
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('應可從資料庫記錄重建', () => {
    const original = PasswordResetToken.create('user-123')
    const restored = PasswordResetToken.fromDatabase({
      id: original.getId(),
      userId: 'user-123',
      tokenHash: original.getTokenHash(),
      used: false,
      expiresAt: original.getExpiresAt(),
      createdAt: original.getCreatedAt(),
    })
    expect(restored.getUserId()).toBe('user-123')
    expect(restored.getTokenHash()).toBe(original.getTokenHash())
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `bun test src/Modules/Auth/__tests__/PasswordResetToken.test.ts`
Expected: FAIL — `PasswordResetToken` 不存在

- [ ] **Step 3: 實作 PasswordResetToken**

```typescript
// src/Modules/Auth/Domain/ValueObjects/PasswordResetToken.ts
import { randomBytes, createHash } from 'crypto'
import { v4 as uuidv4 } from 'uuid'

const EXPIRY_HOURS = 1

interface PasswordResetTokenProps {
  id: string
  userId: string
  token: string
  tokenHash: string
  used: boolean
  expiresAt: Date
  createdAt: Date
}

export class PasswordResetToken {
  private readonly props: PasswordResetTokenProps

  private constructor(props: PasswordResetTokenProps) {
    this.props = props
  }

  static create(userId: string): PasswordResetToken {
    const token = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    return new PasswordResetToken({
      id: uuidv4(),
      userId,
      token,
      tokenHash,
      used: false,
      expiresAt: new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000),
      createdAt: new Date(),
    })
  }

  static fromDatabase(row: {
    id: string
    userId: string
    tokenHash: string
    used: boolean
    expiresAt: Date
    createdAt: Date
  }): PasswordResetToken {
    return new PasswordResetToken({
      id: row.id,
      userId: row.userId,
      token: '', // 從 DB 還原時不持有明文
      tokenHash: row.tokenHash,
      used: row.used,
      expiresAt: new Date(row.expiresAt),
      createdAt: new Date(row.createdAt),
    })
  }

  getId(): string { return this.props.id }
  getUserId(): string { return this.props.userId }
  getToken(): string { return this.props.token }
  getTokenHash(): string { return this.props.tokenHash }
  getExpiresAt(): Date { return this.props.expiresAt }
  getCreatedAt(): Date { return this.props.createdAt }

  isExpired(): boolean {
    return new Date() > this.props.expiresAt
  }

  isUsed(): boolean {
    return this.props.used
  }

  isValid(): boolean {
    return !this.isExpired() && !this.isUsed()
  }

  markAsUsed(): PasswordResetToken {
    return new PasswordResetToken({
      ...this.props,
      used: true,
    })
  }

  toDatabaseRow(): Record<string, unknown> {
    return {
      id: this.props.id,
      user_id: this.props.userId,
      token_hash: this.props.tokenHash,
      used: this.props.used ? 1 : 0,
      expires_at: this.props.expiresAt.toISOString(),
      created_at: this.props.createdAt.toISOString(),
    }
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `bun test src/Modules/Auth/__tests__/PasswordResetToken.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/Modules/Auth/Domain/ValueObjects/PasswordResetToken.ts src/Modules/Auth/__tests__/PasswordResetToken.test.ts
git commit -m "feat: [auth] 新增 PasswordResetToken Value Object"
```

---

### Task 4: 密碼重設 Repository 和 DTO

**Files:**
- Create: `src/Modules/Auth/Domain/Repositories/IPasswordResetTokenRepository.ts`
- Create: `src/Modules/Auth/Infrastructure/Repositories/PasswordResetTokenRepository.ts`
- Create: `src/Modules/Auth/Application/DTOs/PasswordResetDTO.ts`

- [ ] **Step 1: 建立 IPasswordResetTokenRepository**

```typescript
// src/Modules/Auth/Domain/Repositories/IPasswordResetTokenRepository.ts
import type { PasswordResetToken } from '../ValueObjects/PasswordResetToken'

export interface IPasswordResetTokenRepository {
  save(token: PasswordResetToken): Promise<void>
  findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null>
  markAsUsed(tokenHash: string): Promise<void>
  deleteExpiredByUserId(userId: string): Promise<void>
}
```

- [ ] **Step 2: 建立 PasswordResetTokenRepository**

```typescript
// src/Modules/Auth/Infrastructure/Repositories/PasswordResetTokenRepository.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IPasswordResetTokenRepository } from '../../Domain/Repositories/IPasswordResetTokenRepository'
import { PasswordResetToken } from '../../Domain/ValueObjects/PasswordResetToken'

export class PasswordResetTokenRepository implements IPasswordResetTokenRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async save(token: PasswordResetToken): Promise<void> {
    await this.db.table('password_reset_tokens').insert(token.toDatabaseRow())
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const row = await this.db
      .table('password_reset_tokens')
      .where('token_hash', '=', tokenHash)
      .first()

    if (!row) return null

    return PasswordResetToken.fromDatabase({
      id: row.id as string,
      userId: row.user_id as string,
      tokenHash: row.token_hash as string,
      used: (row.used as number) === 1,
      expiresAt: new Date(row.expires_at as string),
      createdAt: new Date(row.created_at as string),
    })
  }

  async markAsUsed(tokenHash: string): Promise<void> {
    await this.db
      .table('password_reset_tokens')
      .where('token_hash', '=', tokenHash)
      .update({ used: 1 })
  }

  async deleteExpiredByUserId(userId: string): Promise<void> {
    await this.db
      .table('password_reset_tokens')
      .where('user_id', '=', userId)
      .where('expires_at', '<', new Date().toISOString())
      .delete()
  }
}
```

- [ ] **Step 3: 建立 PasswordResetDTO**

```typescript
// src/Modules/Auth/Application/DTOs/PasswordResetDTO.ts
export interface RequestPasswordResetRequest {
  email: string
}

export interface RequestPasswordResetResponse {
  success: boolean
  message: string
  error?: string
  /** 僅非 production 環境回傳，供開發測試用 */
  _debugToken?: string
}

export interface ExecutePasswordResetRequest {
  token: string
  newPassword: string
  confirmPassword: string
}

export interface ExecutePasswordResetResponse {
  success: boolean
  message: string
  error?: string
}
```

- [ ] **Step 4: Commit**

```bash
git add src/Modules/Auth/Domain/Repositories/IPasswordResetTokenRepository.ts src/Modules/Auth/Infrastructure/Repositories/PasswordResetTokenRepository.ts src/Modules/Auth/Application/DTOs/PasswordResetDTO.ts
git commit -m "feat: [auth] 新增密碼重設 Repository 和 DTO"
```

---

### Task 5: RequestPasswordResetService

**Files:**
- Create: `src/Modules/Auth/Application/Services/RequestPasswordResetService.ts`
- Test: `src/Modules/Auth/__tests__/RequestPasswordResetService.test.ts`

- [ ] **Step 1: 寫測試**

```typescript
// src/Modules/Auth/__tests__/RequestPasswordResetService.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { RequestPasswordResetService } from '../Application/Services/RequestPasswordResetService'
import { RegisterUserService } from '../Application/Services/RegisterUserService'
import { AuthRepository } from '../Infrastructure/Repositories/AuthRepository'
import { PasswordResetTokenRepository } from '../Infrastructure/Repositories/PasswordResetTokenRepository'

describe('RequestPasswordResetService', () => {
  let service: RequestPasswordResetService
  let registerService: RegisterUserService
  let db: MemoryDatabaseAccess

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    const authRepo = new AuthRepository(db)
    const tokenRepo = new PasswordResetTokenRepository(db)
    registerService = new RegisterUserService(authRepo)
    service = new RequestPasswordResetService(authRepo, tokenRepo)

    await registerService.execute({
      email: 'user@example.com',
      password: 'StrongPass123',
    })
  })

  it('無論 email 是否存在都回傳泛型成功訊息（防止枚舉）', async () => {
    const result = await service.execute({ email: 'user@example.com' })
    expect(result.success).toBe(true)
    expect(result.message).toBe('若此電子郵件已註冊，將收到重設指示')
    // 公開 response 不應包含 token
    expect(result.data).toBeUndefined()
  })

  it('不存在的 email 也應回傳相同的泛型成功訊息', async () => {
    const result = await service.execute({ email: 'nobody@example.com' })
    expect(result.success).toBe(true)
    expect(result.message).toBe('若此電子郵件已註冊，將收到重設指示')
    expect(result.data).toBeUndefined()
  })

  it('內部應正確建立 Token（透過 _debugToken 僅開發模式可見）', async () => {
    const result = await service.execute({ email: 'user@example.com' })
    // _debugToken 僅在非 production 環境存在
    expect(result._debugToken).toBeTruthy()
  })

  it('空的 email 應回傳錯誤', async () => {
    const result = await service.execute({ email: '' })
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `bun test src/Modules/Auth/__tests__/RequestPasswordResetService.test.ts`
Expected: FAIL

- [ ] **Step 3: 實作 RequestPasswordResetService**

```typescript
// src/Modules/Auth/Application/Services/RequestPasswordResetService.ts
import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'
import type { IPasswordResetTokenRepository } from '../../Domain/Repositories/IPasswordResetTokenRepository'
import { Email } from '../../Domain/ValueObjects/Email'
import { PasswordResetToken } from '../../Domain/ValueObjects/PasswordResetToken'
import type { RequestPasswordResetRequest, RequestPasswordResetResponse } from '../DTOs/PasswordResetDTO'

export class RequestPasswordResetService {
  constructor(
    private authRepository: IAuthRepository,
    private tokenRepository: IPasswordResetTokenRepository,
  ) {}

  async execute(request: RequestPasswordResetRequest): Promise<RequestPasswordResetResponse> {
    try {
      if (!request.email || !request.email.trim()) {
        return { success: false, message: '電子郵件不能為空', error: 'EMAIL_REQUIRED' }
      }

      const GENERIC_MESSAGE = '若此電子郵件已註冊，將收到重設指示'
      const email = new Email(request.email)
      const user = await this.authRepository.findByEmail(email)

      if (!user) {
        // 不透露 email 是否存在 — 回傳泛型訊息
        return { success: true, message: GENERIC_MESSAGE }
      }

      // 清除該使用者過期的重設 Token
      await this.tokenRepository.deleteExpiredByUserId(user.id)

      // 建立新的重設 Token
      const resetToken = PasswordResetToken.create(user.id)
      await this.tokenRepository.save(resetToken)

      // 安全設計：公開 response 不包含 token
      // 僅在非 production 環境透過 _debugToken 回傳，供開發測試
      const isProduction = process.env.NODE_ENV === 'production'
      return {
        success: true,
        message: GENERIC_MESSAGE,
        ...(!isProduction && { _debugToken: resetToken.getToken() }),
      }
    } catch (error: any) {
      return { success: false, message: error.message || '請求失敗', error: error.message }
    }
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `bun test src/Modules/Auth/__tests__/RequestPasswordResetService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/Modules/Auth/Application/Services/RequestPasswordResetService.ts src/Modules/Auth/__tests__/RequestPasswordResetService.test.ts
git commit -m "feat: [auth] 新增 RequestPasswordResetService"
```

---

### Task 6: ExecutePasswordResetService

**Files:**
- Create: `src/Modules/Auth/Application/Services/ExecutePasswordResetService.ts`
- Test: `src/Modules/Auth/__tests__/ExecutePasswordResetService.test.ts`

- [ ] **Step 1: 寫測試**

```typescript
// src/Modules/Auth/__tests__/ExecutePasswordResetService.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { ExecutePasswordResetService } from '../Application/Services/ExecutePasswordResetService'
import { RequestPasswordResetService } from '../Application/Services/RequestPasswordResetService'
import { RegisterUserService } from '../Application/Services/RegisterUserService'
import { LoginUserService } from '../Application/Services/LoginUserService'
import { AuthRepository } from '../Infrastructure/Repositories/AuthRepository'
import { AuthTokenRepository } from '../Infrastructure/Repositories/AuthTokenRepository'
import { PasswordResetTokenRepository } from '../Infrastructure/Repositories/PasswordResetTokenRepository'
import { JwtTokenService } from '../Application/Services/JwtTokenService'

describe('ExecutePasswordResetService', () => {
  let executeService: ExecutePasswordResetService
  let requestService: RequestPasswordResetService
  let registerService: RegisterUserService
  let loginService: LoginUserService

  beforeEach(async () => {
    const db = new MemoryDatabaseAccess()
    const authRepo = new AuthRepository(db)
    const authTokenRepo = new AuthTokenRepository(db)
    const tokenRepo = new PasswordResetTokenRepository(db)
    const jwtService = new JwtTokenService()

    registerService = new RegisterUserService(authRepo)
    loginService = new LoginUserService(authRepo, authTokenRepo, jwtService)
    requestService = new RequestPasswordResetService(authRepo, tokenRepo)
    executeService = new ExecutePasswordResetService(authRepo, tokenRepo, authTokenRepo)

    await registerService.execute({
      email: 'user@example.com',
      password: 'OldPassword123',
    })
  })

  it('應成功重設密碼', async () => {
    const requestResult = await requestService.execute({ email: 'user@example.com' })
    const token = requestResult._debugToken!

    const result = await executeService.execute({
      token,
      newPassword: 'NewPassword456',
      confirmPassword: 'NewPassword456',
    })

    expect(result.success).toBe(true)

    // 用新密碼登入應成功
    const loginResult = await loginService.execute({
      email: 'user@example.com',
      password: 'NewPassword456',
    })
    expect(loginResult.success).toBe(true)
  })

  it('用舊密碼登入應失敗', async () => {
    const requestResult = await requestService.execute({ email: 'user@example.com' })
    await executeService.execute({
      token: requestResult._debugToken!,
      newPassword: 'NewPassword456',
      confirmPassword: 'NewPassword456',
    })

    const loginResult = await loginService.execute({
      email: 'user@example.com',
      password: 'OldPassword123',
    })
    expect(loginResult.success).toBe(false)
  })

  it('無效 Token 應回傳錯誤', async () => {
    const result = await executeService.execute({
      token: 'invalid-token',
      newPassword: 'NewPassword456',
      confirmPassword: 'NewPassword456',
    })
    expect(result.success).toBe(false)
  })

  it('密碼不匹配應回傳錯誤', async () => {
    const requestResult = await requestService.execute({ email: 'user@example.com' })
    const result = await executeService.execute({
      token: requestResult.data!.token,
      newPassword: 'NewPassword456',
      confirmPassword: 'DifferentPassword789',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('PASSWORD_MISMATCH')
  })

  it('Token 使用後不能重複使用', async () => {
    const requestResult = await requestService.execute({ email: 'user@example.com' })
    const token = requestResult._debugToken!

    // 第一次使用
    await executeService.execute({
      token,
      newPassword: 'NewPassword456',
      confirmPassword: 'NewPassword456',
    })

    // 第二次使用應失敗
    const result = await executeService.execute({
      token,
      newPassword: 'AnotherPassword789',
      confirmPassword: 'AnotherPassword789',
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `bun test src/Modules/Auth/__tests__/ExecutePasswordResetService.test.ts`
Expected: FAIL

- [ ] **Step 3: 實作 ExecutePasswordResetService**

```typescript
// src/Modules/Auth/Application/Services/ExecutePasswordResetService.ts
import { createHash } from 'crypto'
import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'
import type { IPasswordResetTokenRepository } from '../../Domain/Repositories/IPasswordResetTokenRepository'
import type { IAuthTokenRepository } from '../../Domain/Repositories/IAuthTokenRepository'
import type { ExecutePasswordResetRequest, ExecutePasswordResetResponse } from '../DTOs/PasswordResetDTO'

export class ExecutePasswordResetService {
  constructor(
    private authRepository: IAuthRepository,
    private tokenRepository: IPasswordResetTokenRepository,
    private authTokenRepository: IAuthTokenRepository,
  ) {}

  async execute(request: ExecutePasswordResetRequest): Promise<ExecutePasswordResetResponse> {
    try {
      // 1. 驗證輸入
      if (!request.token || !request.token.trim()) {
        return { success: false, message: 'Token 不能為空', error: 'TOKEN_REQUIRED' }
      }
      if (!request.newPassword || request.newPassword.length < 8) {
        return { success: false, message: '密碼至少需要 8 個字符', error: 'PASSWORD_TOO_SHORT' }
      }
      if (request.newPassword !== request.confirmPassword) {
        return { success: false, message: '密碼不匹配', error: 'PASSWORD_MISMATCH' }
      }

      // 2. 查找 Token
      const tokenHash = createHash('sha256').update(request.token).digest('hex')
      const resetToken = await this.tokenRepository.findByTokenHash(tokenHash)

      if (!resetToken || !resetToken.isValid()) {
        return { success: false, message: '無效或已過期的重設 Token', error: 'INVALID_TOKEN' }
      }

      // 3. 查找使用者
      const user = await this.authRepository.findById(resetToken.getUserId())
      if (!user) {
        return { success: false, message: '找不到使用者', error: 'USER_NOT_FOUND' }
      }

      // 4. 重設密碼
      await user.changePassword(request.newPassword)
      await this.authRepository.save(user)

      // 5. 標記 Token 已使用
      await this.tokenRepository.markAsUsed(tokenHash)

      // 6. 撤銷所有既有 Token
      await this.authTokenRepository.revokeAllByUserId(user.id)

      return { success: true, message: '密碼已重設成功' }
    } catch (error: any) {
      return { success: false, message: error.message || '重設失敗', error: error.message }
    }
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `bun test src/Modules/Auth/__tests__/ExecutePasswordResetService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/Modules/Auth/Application/Services/ExecutePasswordResetService.ts src/Modules/Auth/__tests__/ExecutePasswordResetService.test.ts
git commit -m "feat: [auth] 新增 ExecutePasswordResetService"
```

---

### Task 7: 整合 — 路由、Controller、ServiceProvider、Module Export

**Files:**
- Modify: `src/Modules/Auth/Presentation/Controllers/AuthController.ts`
- Modify: `src/Modules/Auth/Presentation/Routes/auth.routes.ts`
- Modify: `src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts`
- Modify: `src/Modules/Auth/index.ts`

- [ ] **Step 1: 更新 AuthController 新增密碼重設端點**

在 `AuthController` 建構子和類別中新增：

```typescript
// 在 constructor 新增參數
constructor(
  private registerUserService: RegisterUserService,
  private loginUserService: LoginUserService,
  private refreshTokenService: RefreshTokenService,
  private logoutUserService: LogoutUserService,
  private requestPasswordResetService: RequestPasswordResetService,
  private executePasswordResetService: ExecutePasswordResetService,
) {}

// 新增方法
async requestPasswordReset(ctx: IHttpContext): Promise<any> {
  try {
    const body = await ctx.getJsonBody() as { email: string }
    const result = await this.requestPasswordResetService.execute(body)
    // _debugToken 不進 JSON body，改用 response header（僅非 production）
    const { _debugToken, ...publicResult } = result
    // 注意：實際實作中可透過自訂 Response 加 header
    // 此處簡化為 JSON response，_debugToken 已從 body 移除
    return ctx.json(publicResult, result.success ? 200 : 400)
  } catch (error: any) {
    return ctx.json({ success: false, message: '請求失敗', error: error.message }, 400)
  }
}

async executePasswordReset(ctx: IHttpContext): Promise<any> {
  try {
    const body = await ctx.getJsonBody() as { token: string; newPassword: string; confirmPassword: string }
    const result = await this.executePasswordResetService.execute(body)
    return ctx.json(result, result.success ? 200 : 400)
  } catch (error: any) {
    return ctx.json({ success: false, message: '重設失敗', error: error.message }, 400)
  }
}
```

- [ ] **Step 2: 更新路由**

在 `auth.routes.ts` 的 `registerAuthRoutes` 中新增：

```typescript
// 密碼重設（公開端點）
router.post('/api/auth/password-reset/request', (ctx) => controller.requestPasswordReset(ctx))
router.post('/api/auth/password-reset/execute', (ctx) => controller.executePasswordReset(ctx))
```

- [ ] **Step 3: 更新 AuthServiceProvider**

在 `register()` 方法中新增：

```typescript
// 註冊 PasswordResetTokenRepository
container.singleton('passwordResetTokenRepository', () => {
  return new PasswordResetTokenRepository(db)
})

// 註冊密碼重設服務
container.bind('requestPasswordResetService', (c: IContainer) => {
  const authRepository = c.make('authRepository') as IAuthRepository
  const tokenRepository = c.make('passwordResetTokenRepository') as IPasswordResetTokenRepository
  return new RequestPasswordResetService(authRepository, tokenRepository)
})

container.bind('executePasswordResetService', (c: IContainer) => {
  const authRepository = c.make('authRepository') as IAuthRepository
  const tokenRepository = c.make('passwordResetTokenRepository') as IPasswordResetTokenRepository
  const authTokenRepository = c.make('authTokenRepository') as IAuthTokenRepository
  return new ExecutePasswordResetService(authRepository, tokenRepository, authTokenRepository)
})
```

記得在檔案頂部加入 import：

```typescript
import { PasswordResetTokenRepository } from '../Repositories/PasswordResetTokenRepository'
import type { IPasswordResetTokenRepository } from '../../Domain/Repositories/IPasswordResetTokenRepository'
import { RequestPasswordResetService } from '../../Application/Services/RequestPasswordResetService'
import { ExecutePasswordResetService } from '../../Application/Services/ExecutePasswordResetService'
```

- [ ] **Step 4: 更新 wiring/index.ts 的 registerAuth**

在 `src/wiring/index.ts` 的 `registerAuth` 中新增密碼重設服務的解析：

```typescript
export const registerAuth = (core: PlanetCore): void => {
  const router = createGravitoModuleRouter(core)
  const registerService = core.container.make('registerUserService') as any
  const loginService = core.container.make('loginUserService') as any
  const refreshTokenService = core.container.make('refreshTokenService') as any
  const logoutUserService = core.container.make('logoutUserService') as any
  const requestPasswordResetService = core.container.make('requestPasswordResetService') as any
  const executePasswordResetService = core.container.make('executePasswordResetService') as any
  const controller = new AuthController(
    registerService, loginService, refreshTokenService, logoutUserService,
    requestPasswordResetService, executePasswordResetService
  )
  registerAuthRoutes(router, controller)
}
```

- [ ] **Step 5: 更新 index.ts 模組導出**

在 `src/Modules/Auth/index.ts` 新增：

```typescript
// Domain - Password Reset
export { PasswordResetToken } from './Domain/ValueObjects/PasswordResetToken'
export type { IPasswordResetTokenRepository } from './Domain/Repositories/IPasswordResetTokenRepository'

// Application - Password Reset
export type { RequestPasswordResetRequest, RequestPasswordResetResponse, ExecutePasswordResetRequest, ExecutePasswordResetResponse } from './Application/DTOs/PasswordResetDTO'
export { RequestPasswordResetService } from './Application/Services/RequestPasswordResetService'
export { ExecutePasswordResetService } from './Application/Services/ExecutePasswordResetService'

// Presentation - Middleware
export { createRoleMiddleware, requireAuth } from './Presentation/Middleware/RoleMiddleware'

// Domain - Updated exports
export { Role, RoleType } from './Domain/ValueObjects/Role'
export { Permission, PermissionType } from './Domain/ValueObjects/Permission'
export { AuthorizationService } from './Domain/Services/AuthorizationService'
```

- [ ] **Step 6: 執行所有 Auth 測試**

Run: `bun test src/Modules/Auth/__tests__/`
Expected: 全部 PASS

- [ ] **Step 7: Commit**

```bash
git add src/Modules/Auth/ src/wiring/index.ts
git commit -m "feat: [auth] 整合密碼重設端點、ServiceProvider 和模組導出"
```

---

### Task 8: 更新 LoginUserService 注入完整 permissions

**Files:**
- Modify: `src/Modules/Auth/Application/Services/LoginUserService.ts`

- [ ] **Step 1: 更新 LoginUserService**

在 `LoginUserService.execute()` 中，目前 permissions 是空陣列。改為從 Role 取得：

```typescript
// 在 step 5 前加入
import { Role } from '../../Domain/ValueObjects/Role'

// 在 step 5 中替換
const role = new Role(user.role)
const permissions = role.getPermissions().map((p) => p.getValue())

const accessTokenObj = this.jwtTokenService.signAccessToken({
  userId: user.id,
  email: user.emailValue,
  role: user.role,
  permissions,
})

const refreshTokenObj = this.jwtTokenService.signRefreshToken({
  userId: user.id,
  email: user.emailValue,
  role: user.role,
  permissions,
})
```

- [ ] **Step 2: 執行登入測試確認通過**

Run: `bun test src/Modules/Auth/__tests__/LoginUserService.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/Modules/Auth/Application/Services/LoginUserService.ts
git commit -m "feat: [auth] LoginUserService 注入完整 Role permissions 至 JWT"
```

---

### Task 9: 全面驗證

- [ ] **Step 1: 執行所有測試**

Run: `bun test`
Expected: 全部 PASS

- [ ] **Step 2: TypeScript 類型檢查**

Run: `bun run typecheck`
Expected: 無錯誤

- [ ] **Step 3: Lint 檢查**

Run: `bun run lint`
Expected: 無錯誤（或僅 warning）
