# Auth DDD Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 `Auth` 模組收斂為只負責身份驗證、token 生命週期與系統角色，並把持久化 mapping、密碼雜湊、授權邏輯與 presentation coupling 拆回正確層級。

**Architecture:** 保留 `Auth` 作為系統身份上下文，但讓 Domain 只表達角色、憑證與狀態，不再持有資料列/DTO mapping。Application 層負責註冊、登入、刷新、登出等流程編排；Infrastructure 層負責 repository、hashing 與 middleware 所需的外部依賴；Presentation 只做 HTTP 與授權入口，不直接 new repository 或讀寫 DB。

**Tech Stack:** Bun + TypeScript, Vitest, MemoryDatabaseAccess, Gravito DDD framework, existing Auth/User module test helpers

---

## File Structure

### Domain
- `src/Modules/Auth/Domain/ValueObjects/Role.ts` - canonical system role VO
- `src/Modules/Auth/Domain/Aggregates/User.ts` - Auth user aggregate
- `src/Modules/Auth/Domain/ValueObjects/Password.ts` - hashed password value object only
- `src/Modules/Auth/Domain/Repositories/IAuthRepository.ts` - repository port
- `src/Modules/Auth/Domain/Repositories/IAuthTokenRepository.ts` - token repository port

### Application
- `src/Modules/Auth/Application/Services/RegisterUserService.ts` - register use case
- `src/Modules/Auth/Application/Services/LoginUserService.ts` - login use case
- `src/Modules/Auth/Application/Services/RefreshTokenService.ts` - refresh use case
- `src/Modules/Auth/Application/Services/LogoutUserService.ts` - logout use case
- `src/Modules/Auth/Application/Services/JwtTokenService.ts` - JWT signing/verification

### Infrastructure
- `src/Modules/Auth/Infrastructure/Repositories/AuthRepository.ts` - DB mapping and persistence
- `src/Modules/Auth/Infrastructure/Repositories/AuthTokenRepository.ts` - token persistence
- `src/Modules/Auth/Infrastructure/Services/PasswordHasher.ts` - scrypt hash/verify
- `src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts` - DI registration

### Presentation
- `src/Modules/Auth/Presentation/Middleware/RoleMiddleware.ts` - auth middleware factories
- `src/Modules/Auth/Presentation/Controllers/AuthController.ts` - HTTP handlers
- `src/Modules/Auth/Presentation/Routes/auth.routes.ts` - route wiring

### Tests
- `src/Modules/Auth/__tests__/Role.test.ts`
- `src/Modules/Auth/__tests__/AuthRepository.test.ts`
- `src/Modules/Auth/__tests__/PasswordHasher.test.ts`
- `src/Modules/Auth/__tests__/RegisterUserService.test.ts`
- `src/Modules/Auth/__tests__/LoginUserService.test.ts`
- `src/Modules/Auth/__tests__/AuthFlow.e2e.test.ts`

---

### Task 1: Canonicalize the Auth role model

**Files:**
- Modify: `src/Modules/Auth/Domain/ValueObjects/Role.ts`
- Modify: `src/Modules/Auth/Domain/Aggregates/User.ts`
- Modify: `src/Modules/Auth/Application/Services/RegisterUserService.ts`
- Modify: `src/Modules/Auth/Application/Services/LoginUserService.ts`
- Modify: `src/Modules/Auth/Application/Services/RefreshTokenService.ts`
- Modify: `src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts`
- Modify: `src/Modules/Auth/index.ts`
- Delete: `src/Modules/Auth/Domain/ValueObjects/Permission.ts`
- Delete: `src/Modules/Auth/Domain/Services/AuthorizationService.ts`
- Modify: `src/Modules/Auth/__tests__/RegisterUserService.test.ts`
- Modify: `src/Modules/Auth/__tests__/LoginUserService.test.ts`
- Modify: `src/Modules/Auth/__tests__/AuthFlow.e2e.test.ts`
- Create: `src/Modules/Auth/__tests__/Role.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/Modules/Auth/__tests__/Role.test.ts
import { describe, it, expect } from 'vitest'
import { Role, RoleType } from '../Domain/ValueObjects/Role'

describe('Role', () => {
  it('只允許 ADMIN / MANAGER / MEMBER', () => {
    expect(Object.values(RoleType)).toEqual(['admin', 'manager', 'member'])
    expect(() => new Role('user')).toThrow('無效的角色')
    expect(() => new Role('guest')).toThrow('無效的角色')
  })

  it('提供系統角色判斷', () => {
    const admin = new Role(RoleType.ADMIN)
    const member = new Role(RoleType.MEMBER)

    expect(admin.isAdmin()).toBe(true)
    expect(admin.isManager()).toBe(false)
    expect(admin.isMember()).toBe(false)
    expect(member.isMember()).toBe(true)
  })
})
```

```typescript
// src/Modules/Auth/__tests__/RegisterUserService.test.ts
it('應該預設建立 MEMBER 角色', async () => {
  const result = await service.execute({
    email: 'newuser@example.com',
    password: 'StrongPass123',
  })

  expect(result.success).toBe(true)
  expect(result.data?.role).toBe('member')
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run:
```bash
bun test src/Modules/Auth/__tests__/Role.test.ts src/Modules/Auth/__tests__/RegisterUserService.test.ts
```

Expected: FAIL because `member` is not yet the canonical role and legacy `user` / `guest` still exist.

- [ ] **Step 3: Implement the minimal role refactor**

Make `Role` the single canonical role type for Auth:

```typescript
export enum RoleType {
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
}

export class Role {
  constructor(value: RoleType | string) { /* validate + store */ }
  static admin(): Role { return new Role(RoleType.ADMIN) }
  static manager(): Role { return new Role(RoleType.MANAGER) }
  static member(): Role { return new Role(RoleType.MEMBER) }
  isAdmin(): boolean { /* ... */ }
  isManager(): boolean { /* ... */ }
  isMember(): boolean { /* ... */ }
  getValue(): RoleType { /* ... */ }
}
```

Update `User` to store `role: Role` instead of `UserRole`, and update `RegisterUserService` / `LoginUserService` / `RefreshTokenService` to serialize role as `user.role.getValue()`.

Remove `Permission` and `AuthorizationService` from Auth if they are no longer used after the role refactor, and drop their exports from `src/Modules/Auth/index.ts` and `AuthServiceProvider`.

- [ ] **Step 4: Run the Auth role regression tests**

Run:
```bash
bun test src/Modules/Auth/__tests__/Role.test.ts src/Modules/Auth/__tests__/RegisterUserService.test.ts src/Modules/Auth/__tests__/LoginUserService.test.ts src/Modules/Auth/__tests__/AuthFlow.e2e.test.ts
```

Expected: PASS, with API responses and JWT payloads using `member` for default registered users.

- [ ] **Step 5: Commit**

```bash
git add src/Modules/Auth/Domain/ValueObjects/Role.ts src/Modules/Auth/Domain/Aggregates/User.ts src/Modules/Auth/Application/Services/RegisterUserService.ts src/Modules/Auth/Application/Services/LoginUserService.ts src/Modules/Auth/Application/Services/RefreshTokenService.ts src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts src/Modules/Auth/index.ts src/Modules/Auth/__tests__/Role.test.ts src/Modules/Auth/__tests__/RegisterUserService.test.ts src/Modules/Auth/__tests__/LoginUserService.test.ts src/Modules/Auth/__tests__/AuthFlow.e2e.test.ts
git commit -m "refactor(auth): align role model with member terminology"
```

### Task 2: Move persistence mapping out of the User aggregate

**Files:**
- Modify: `src/Modules/Auth/Domain/Aggregates/User.ts`
- Modify: `src/Modules/Auth/Infrastructure/Repositories/AuthRepository.ts`
- Create: `src/Modules/Auth/__tests__/AuthRepository.test.ts`
- Modify: `src/Modules/Auth/Application/Services/RegisterUserService.ts`
- Modify: `src/Modules/Auth/Application/Services/LoginUserService.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/Modules/Auth/__tests__/AuthRepository.test.ts
import { describe, it, expect } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { AuthRepository } from '../Infrastructure/Repositories/AuthRepository'
import { Email } from '../Domain/ValueObjects/Email'
import { Role, RoleType } from '../Domain/ValueObjects/Role'
import { User } from '../Domain/Aggregates/User'

describe('AuthRepository', () => {
  it('負責 DB row 與 domain object 的 mapping，而不是由 User aggregate 提供', async () => {
    const db = new MemoryDatabaseAccess()
    const repo = new AuthRepository(db)
    const user = await User.create('u-1', new Email('user@example.com'), 'StrongPass123', new Role(RoleType.MEMBER))

    expect(Object.getOwnPropertyNames(Object.getPrototypeOf(user))).not.toContain('toDatabaseRow')
    expect(Object.getOwnPropertyNames(Object.getPrototypeOf(user))).not.toContain('toDTO')

    await repo.save(user)
    const restored = await repo.findById('u-1')

    expect(restored?.emailValue).toBe('user@example.com')
    expect(restored?.role.getValue()).toBe('member')
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run:
```bash
bun test src/Modules/Auth/__tests__/AuthRepository.test.ts
```

Expected: FAIL because `User` still exposes persistence helpers and `AuthRepository` still delegates mapping to `User.fromDatabase()` / `toDatabaseRow()`.

- [ ] **Step 3: Implement the minimal repository mapping**

Move all mapping logic into `AuthRepository`:

```typescript
private mapRowToUser(row: any): User {
  return User.reconstitute({
    id: row.id,
    email: new Email(row.email),
    password: Password.fromHashed(row.password),
    role: new Role(row.role),
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  })
}
```

Update `User` so it no longer exposes `toDatabaseRow()` or `toDTO()`. If a reconstitution factory is needed, keep it domain-level and input it with already-mapped domain values, not raw DB column names.

Update `RegisterUserService` and `LoginUserService` to serialize role and status from the domain object directly, not through a DTO method on `User`.

- [ ] **Step 4: Run the repository and service regression tests**

Run:
```bash
bun test src/Modules/Auth/__tests__/AuthRepository.test.ts src/Modules/Auth/__tests__/RegisterUserService.test.ts src/Modules/Auth/__tests__/LoginUserService.test.ts
```

Expected: PASS, with persistence mapping only in `AuthRepository`.

- [ ] **Step 5: Commit**

```bash
git add src/Modules/Auth/Domain/Aggregates/User.ts src/Modules/Auth/Infrastructure/Repositories/AuthRepository.ts src/Modules/Auth/__tests__/AuthRepository.test.ts src/Modules/Auth/Application/Services/RegisterUserService.ts src/Modules/Auth/Application/Services/LoginUserService.ts
git commit -m "refactor(auth): move persistence mapping into repository"
```

### Task 3: Extract password hashing from the domain value object

**Files:**
- Modify: `src/Modules/Auth/Domain/Aggregates/User.ts`
- Modify: `src/Modules/Auth/Domain/ValueObjects/Password.ts`
- Create: `src/Modules/Auth/Infrastructure/Services/PasswordHasher.ts`
- Modify: `src/Modules/Auth/Application/Services/RegisterUserService.ts`
- Modify: `src/Modules/Auth/Application/Services/LoginUserService.ts`
- Modify: `src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts`
- Create: `src/Modules/Auth/__tests__/PasswordHasher.test.ts`
- Modify: `src/Modules/Auth/__tests__/LoginUserService.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/Modules/Auth/__tests__/PasswordHasher.test.ts
import { describe, it, expect } from 'vitest'
import { Password } from '../Domain/ValueObjects/Password'
import { ScryptPasswordHasher } from '../Infrastructure/Services/PasswordHasher'

describe('ScryptPasswordHasher', () => {
  it('負責 hash / verify，Password 只保留 hashed value', async () => {
    const hasher = new ScryptPasswordHasher()
    const hash = await hasher.hash('StrongPass123')

    expect(hash).not.toBe('StrongPass123')
    expect(await hasher.verify(hash, 'StrongPass123')).toBe(true)
    expect(await hasher.verify(hash, 'WrongPass123')).toBe(false)

    const password = Password.fromHashed(hash)
    expect(password.getHashed()).toBe(hash)
    await expect(Password.create('StrongPass123')).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run:
```bash
bun test src/Modules/Auth/__tests__/PasswordHasher.test.ts
```

Expected: FAIL because `Password.create()` still performs hashing and `matches()` still owns verification logic.

- [ ] **Step 3: Implement the minimal password split**

Create a dedicated hasher service:

```typescript
export class ScryptPasswordHasher {
  async hash(plainPassword: string): Promise<string> { /* scrypt + salt */ }
  async verify(hashedPassword: string, plainPassword: string): Promise<boolean> { /* scrypt compare */ }
}
```

Update `Password.ts` so it only represents a hashed password value:

```typescript
export class Password {
  static fromHashed(hashedPassword: string): Password { /* store hash */ }
  getHashed(): string { /* return hash */ }
  toString(): string { /* return hash */ }
}
```

Update `RegisterUserService` to hash before creating the `User` aggregate, and update `LoginUserService` to verify against the stored hash through the hasher service rather than through the aggregate.

Update `User.ts` so it no longer owns password hashing or verification. If the aggregate still needs to keep a password field, it should accept a hashed `Password` value object or hashed string from the application layer and expose only identity/state methods.

- [ ] **Step 4: Run the password regression tests**

Run:
```bash
bun test src/Modules/Auth/__tests__/PasswordHasher.test.ts src/Modules/Auth/__tests__/RegisterUserService.test.ts src/Modules/Auth/__tests__/LoginUserService.test.ts
```

Expected: PASS, with password hashing no longer owned by the domain value object.

- [ ] **Step 5: Commit**

```bash
git add src/Modules/Auth/Domain/ValueObjects/Password.ts src/Modules/Auth/Infrastructure/Services/PasswordHasher.ts src/Modules/Auth/Application/Services/RegisterUserService.ts src/Modules/Auth/Application/Services/LoginUserService.ts src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts src/Modules/Auth/__tests__/PasswordHasher.test.ts src/Modules/Auth/__tests__/LoginUserService.test.ts
git commit -m "refactor(auth): extract password hashing into service"
```

### Task 4: Remove presentation coupling and rewire dependency injection

**Files:**
- Modify: `src/Modules/Auth/Presentation/Middleware/RoleMiddleware.ts`
- Modify: `src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts`
- Modify: `src/Modules/Auth/Presentation/Routes/auth.routes.ts`
- Modify: `src/Modules/Auth/Presentation/Controllers/AuthController.ts`
- Modify: `src/Modules/Auth/__tests__/AuthFlow.e2e.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/Modules/Auth/__tests__/AuthFlow.e2e.test.ts
it('middleware should still authenticate after provider wiring change', async () => {
  const response = await app.fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  expect(response.status).toBe(200)
})
```

This regression should stay green after moving middleware dependencies out of module-scope DB construction.

- [ ] **Step 2: Run the tests and confirm the wiring is still brittle**

Run:
```bash
bun test src/Modules/Auth/__tests__/AuthFlow.e2e.test.ts src/Modules/Auth/__tests__/LoginUserService.test.ts
```

Expected: the current code path still relies on `getCurrentDatabaseAccess()` inside `RoleMiddleware.ts`, so this task should expose the coupling before the wiring is rewritten.

- [ ] **Step 3: Rewire middleware through provider-managed dependencies**

Introduce a configuration entry point in `RoleMiddleware.ts` so the provider injects the token repository instead of the middleware constructing it itself.

```typescript
export function configureAuthMiddleware(tokenRepository: IAuthTokenRepository): void {
  jwtParser = new AuthMiddleware(tokenRepository)
}
```

Then update `AuthServiceProvider.register()` to resolve `authTokenRepository` once and pass it into the middleware configuration. The middleware module should no longer import `getCurrentDatabaseAccess()` or instantiate `AuthTokenRepository` directly.

Keep route definitions unchanged except for consuming the configured middleware factories.

- [ ] **Step 4: Run the full Auth regression suite**

Run:
```bash
bun test src/Modules/Auth/__tests__/Role.test.ts src/Modules/Auth/__tests__/AuthRepository.test.ts src/Modules/Auth/__tests__/PasswordHasher.test.ts src/Modules/Auth/__tests__/RegisterUserService.test.ts src/Modules/Auth/__tests__/LoginUserService.test.ts src/Modules/Auth/__tests__/AuthFlow.e2e.test.ts
```

Expected: PASS, with no direct repository construction inside Presentation and no behavior change in the public auth endpoints.

- [ ] **Step 5: Commit**

```bash
git add src/Modules/Auth/Presentation/Middleware/RoleMiddleware.ts src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts src/Modules/Auth/Presentation/Routes/auth.routes.ts src/Modules/Auth/Presentation/Controllers/AuthController.ts src/Modules/Auth/__tests__/AuthFlow.e2e.test.ts
git commit -m "refactor(auth): remove presentation layer coupling"
```

---

## Coverage Check

- Role model alignment: covered by Task 1
- Domain persistence cleanup: covered by Task 2
- Password hashing split: covered by Task 3
- Presentation coupling removal: covered by Task 4
- Regression safety: covered by the per-task and final suite commands

## Self-Review Notes

- No placeholder steps remain.
- Each task has exact file paths and a concrete verification command.
- The tasks are ordered by dependency: role model first, persistence second, password split third, wiring cleanup last.
- The plan keeps Auth focused on identity, token lifecycle, and system role checks, which matches the DDD tactical rules already documented in `docs/draupnir/knowledge/`.
