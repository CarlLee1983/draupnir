---
phase: 260413-uzv-auth-ddd
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/Modules/Auth/Domain/Aggregates/User.ts
  - src/Modules/Auth/Application/Ports/IGoogleOAuthAdapter.ts
  - src/Modules/Auth/Application/Utils/sha256.ts
  - src/Modules/Auth/Application/Services/GoogleOAuthService.ts
  - src/Modules/Auth/Application/Services/ChangeUserStatusService.ts
  - src/Modules/Auth/Application/Services/LoginUserService.ts
  - src/Modules/Auth/Application/Services/LogoutUserService.ts
  - src/Modules/Auth/Application/Services/RefreshTokenService.ts
  - src/Modules/Auth/Application/Services/ResetPasswordService.ts
  - src/Modules/Auth/Domain/Repositories/IAuthRepository.ts
  - src/Modules/Auth/Infrastructure/Repositories/AuthRepository.ts
  - src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts
autonomous: true
requirements: [AUTH-DDD-P0, AUTH-DDD-P1, AUTH-DDD-P2, AUTH-DDD-P3]

must_haves:
  truths:
    - "User aggregate methods return new User instances (never mutate this.props)"
    - "GoogleOAuthService depends on IGoogleOAuthAdapter port, not the concrete adapter class"
    - "IAuthRepository has no updatePassword method; ResetPasswordService uses withPassword + save"
    - "sha256 utility is defined once in Application/Utils/sha256.ts and imported by all three services"
    - "Token record IDs use crypto.randomUUID() instead of date-string concatenation"
    - "UserStatus.INACTIVE is removed from the enum and the repository status mapper"
  artifacts:
    - path: "src/Modules/Auth/Application/Ports/IGoogleOAuthAdapter.ts"
      provides: "Port interface for Google OAuth adapter"
      exports: ["IGoogleOAuthAdapter"]
    - path: "src/Modules/Auth/Application/Utils/sha256.ts"
      provides: "Shared SHA-256 hash utility"
      exports: ["sha256"]
    - path: "src/Modules/Auth/Domain/Aggregates/User.ts"
      provides: "Immutable User aggregate"
      contains: "withStatus, withGoogleId"
    - path: "src/Modules/Auth/Domain/Repositories/IAuthRepository.ts"
      provides: "Auth persistence port without updatePassword"
  key_links:
    - from: "src/Modules/Auth/Application/Services/GoogleOAuthService.ts"
      to: "src/Modules/Auth/Application/Ports/IGoogleOAuthAdapter.ts"
      via: "constructor injection"
      pattern: "IGoogleOAuthAdapter"
    - from: "src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts"
      to: "src/Modules/Auth/Application/Ports/IGoogleOAuthAdapter.ts"
      via: "cast in googleOAuthService factory"
      pattern: "IGoogleOAuthAdapter"
---

<objective>
Fix eight DDD tactical design violations in the Auth module across four priority tiers (P0–P3), grouping them into three focused tasks.

Purpose: Bring the Auth module into line with the project's immutability rule, dependency-inversion principle, and clean aggregate boundaries. All changes are internal to the Auth module — no new modules, no new external dependencies.
Output: User aggregate with immutable state-transition methods; IGoogleOAuthAdapter port; sha256 utility extracted; token IDs use randomUUID; updatePassword removed from repo interface and implementation; INACTIVE status removed.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/Modules/Auth/Domain/Aggregates/User.ts
@src/Modules/Auth/Application/Services/LoginUserService.ts
@src/Modules/Auth/Application/Services/LogoutUserService.ts
@src/Modules/Auth/Application/Services/RefreshTokenService.ts
@src/Modules/Auth/Application/Services/ResetPasswordService.ts
@src/Modules/Auth/Application/Services/GoogleOAuthService.ts
@src/Modules/Auth/Application/Services/ChangeUserStatusService.ts
@src/Modules/Auth/Domain/Repositories/IAuthRepository.ts
@src/Modules/Auth/Infrastructure/Repositories/AuthRepository.ts
@src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts

<interfaces>
<!-- Key contracts the executor must preserve. -->

From src/Modules/Auth/Infrastructure/Services/GoogleOAuthAdapter.ts:
```typescript
export class GoogleOAuthAdapter {
  constructor(clientId: string, clientSecret: string, redirectUri: string)
  async exchangeCodeForToken(code: string): Promise<string>
  async getUserInfo(accessToken: string): Promise<{ id: string; email: string; name?: string; picture?: string }>
}
```

From src/Modules/Auth/Domain/Aggregates/User.ts — existing immutable example to mirror:
```typescript
withPassword(hashedPassword: string): User {
  return new User({ ...this.props, password: Password.fromHashed(hashedPassword), updatedAt: new Date() })
}
```

From src/Modules/Auth/Application/Services/ChangeUserStatusService.ts — callers to update:
```typescript
user.suspend()   // → const updated = user.withStatus(UserStatus.SUSPENDED)
user.activate()  // → const updated = user.withStatus(UserStatus.ACTIVE)
await this.authRepository.save(user)  // → save(updated)
```

From src/Modules/Auth/Application/Services/GoogleOAuthService.ts — caller to update:
```typescript
user.linkGoogleAccount(googleUserInfo.id)  // → const updated = user.withGoogleId(googleUserInfo.id)
await this.authRepository.save(user)       // → save(updated)
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: P0 — User Aggregate 不可變性 + IGoogleOAuthAdapter Port</name>
  <files>
    src/Modules/Auth/Domain/Aggregates/User.ts
    src/Modules/Auth/Application/Ports/IGoogleOAuthAdapter.ts
    src/Modules/Auth/Application/Services/ChangeUserStatusService.ts
    src/Modules/Auth/Application/Services/GoogleOAuthService.ts
    src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts
  </files>
  <action>
**1a. User Aggregate — replace mutating methods with immutable factories**

In `User.ts`:
- Remove `setStatus(status: UserStatus): void` (and its body).
- Remove `suspend(): void` and `activate(): void`.
- Remove `linkGoogleAccount(googleId: string): void`.
- Add three new methods that return `new User(...)` following the exact same pattern as `withPassword`:

```typescript
withStatus(status: UserStatus): User {
  return new User({ ...this.props, status, updatedAt: new Date() })
}

suspend(): User {
  return this.withStatus(UserStatus.SUSPENDED)
}

activate(): User {
  return this.withStatus(UserStatus.ACTIVE)
}

withGoogleId(googleId: string): User {
  return new User({ ...this.props, googleId, updatedAt: new Date() })
}
```

Note: `suspend()` and `activate()` are convenience wrappers — they now return `User` instead of `void`. This is a breaking change for callers; fix callers in the same task.

**1b. Fix ChangeUserStatusService to use new immutable API**

In `ChangeUserStatusService.ts`, replace:
```typescript
user.suspend()
// or
user.activate()
await this.authRepository.save(user)
```
With:
```typescript
const updated = request.status === 'suspended' ? user.suspend() : user.activate()
await this.authRepository.save(updated)
```
Update the response data block to read from `updated` (not `user`).

**1c. Create IGoogleOAuthAdapter Port**

Create `src/Modules/Auth/Application/Ports/IGoogleOAuthAdapter.ts`:
```typescript
/**
 * Port interface for Google OAuth operations.
 * Defined in Application layer; implemented by GoogleOAuthAdapter in Infrastructure.
 */
export interface IGoogleOAuthAdapter {
  exchangeCodeForToken(code: string): Promise<string>
  getUserInfo(accessToken: string): Promise<{
    id: string
    email: string
    name?: string
    picture?: string
  }>
}
```

**1d. Update GoogleOAuthService to depend on the port**

In `GoogleOAuthService.ts`:
- Change import: `import type { IGoogleOAuthAdapter } from '../Ports/IGoogleOAuthAdapter'`
- Remove: `import type { GoogleOAuthAdapter } from '../../Infrastructure/Services/GoogleOAuthAdapter'`
- Change constructor parameter type: `private readonly googleOAuthAdapter: IGoogleOAuthAdapter`
- Fix the mutating call: replace `user.linkGoogleAccount(googleUserInfo.id)` with `const linked = user.withGoogleId(googleUserInfo.id)` and pass `linked` to `save()` and `issueSuccess()`.

**1e. Update AuthServiceProvider**

In `AuthServiceProvider.ts`, in the `googleOAuthService` factory binding:
- Replace the cast `c.make('googleOAuthAdapter') as GoogleOAuthAdapter` with `c.make('googleOAuthAdapter') as IGoogleOAuthAdapter`
- Add import: `import type { IGoogleOAuthAdapter } from '../../Application/Ports/IGoogleOAuthAdapter'`
- The `googleOAuthAdapter` singleton factory can stay as-is (it already returns a `GoogleOAuthAdapter`, which satisfies the interface).
  </action>
  <verify>
    <automated>cd /Users/carl/Dev/CMG/Draupnir && npx tsc --noEmit 2>&1 | head -40</automated>
  </verify>
  <done>
    - `User.setStatus`, `User.suspend` (void), `User.activate` (void), `User.linkGoogleAccount` are gone.
    - `User.withStatus`, `User.suspend` (returns User), `User.activate` (returns User), `User.withGoogleId` exist and return new User instances.
    - `IGoogleOAuthAdapter.ts` exists in Application/Ports.
    - `GoogleOAuthService` imports from the port, not the concrete class.
    - `ChangeUserStatusService` uses `user.suspend()` / `user.activate()` and saves the returned value.
    - TypeScript reports zero errors.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: P1+P2 — Remove updatePassword, extract sha256, fix token IDs</name>
  <files>
    src/Modules/Auth/Domain/Repositories/IAuthRepository.ts
    src/Modules/Auth/Infrastructure/Repositories/AuthRepository.ts
    src/Modules/Auth/Application/Utils/sha256.ts
    src/Modules/Auth/Application/Services/LoginUserService.ts
    src/Modules/Auth/Application/Services/LogoutUserService.ts
    src/Modules/Auth/Application/Services/RefreshTokenService.ts
    src/Modules/Auth/Application/Services/ResetPasswordService.ts
  </files>
  <action>
**2a. Remove updatePassword from IAuthRepository**

In `IAuthRepository.ts`, delete the `updatePassword(id: string, hashedPassword: string): Promise<void>` method declaration.

**2b. Remove updatePassword from AuthRepository**

In `AuthRepository.ts`, delete the entire `updatePassword(id: string, hashedPassword: string): Promise<void>` method body.

**2c. Fix ResetPasswordService to use withPassword + save**

In `ResetPasswordService.ts`, locate the call to `authRepository.updatePassword(...)`.
Replace the pattern:
```typescript
await this.authRepository.updatePassword(user.id, hashedPassword)
```
With:
```typescript
const updated = user.withPassword(hashedPassword)
await this.authRepository.save(updated)
```

The `hashedPassword` variable should already be available from the password-hash step in the service. Verify the service still calls `this.authRepository.findById(...)` or `findByEmail(...)` first to obtain the User aggregate before calling `withPassword`.

**2d. Extract sha256 utility**

Create `src/Modules/Auth/Application/Utils/sha256.ts`:
```typescript
/**
 * Computes a SHA-256 hex digest of a UTF-8 string using the Web Crypto API.
 */
export async function sha256(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
```

**2e. Update LoginUserService**

- Delete the local `sha256` function declaration at the top of `LoginUserService.ts`.
- Add import: `import { sha256 } from '../Utils/sha256'`
- Fix token IDs on lines 119 and 130:
  - `id: \`${user.id}_access_${Date.now()}\`` → `id: crypto.randomUUID()`
  - `id: \`${user.id}_refresh_${Date.now()}\`` → `id: crypto.randomUUID()`

**2f. Update LogoutUserService**

- Delete the local `sha256` function declaration.
- Add import: `import { sha256 } from '../Utils/sha256'`
- The `private async hashToken(token: string)` method already delegates to `sha256`; no other changes needed.

**2g. Update RefreshTokenService**

- Delete the local `sha256` function declaration.
- Add import: `import { sha256 } from '../Utils/sha256'`
- Fix token ID in the `authTokenRepository.save(...)` call:
  - `id: \`${user.id}_access_refresh_${Date.now()}\`` → `id: crypto.randomUUID()`
  </action>
  <verify>
    <automated>cd /Users/carl/Dev/CMG/Draupnir && npx tsc --noEmit 2>&1 | head -40</automated>
  </verify>
  <done>
    - `IAuthRepository` has no `updatePassword` method.
    - `AuthRepository` has no `updatePassword` implementation.
    - `ResetPasswordService` calls `user.withPassword(hash)` then `repository.save(user)`.
    - `src/Modules/Auth/Application/Utils/sha256.ts` exists with a single exported `sha256` function.
    - `LoginUserService`, `LogoutUserService`, `RefreshTokenService` each import `sha256` from `../Utils/sha256` and contain no local `sha256` declarations.
    - All token record IDs in those three services use `crypto.randomUUID()`.
    - TypeScript reports zero errors.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: P3 — Remove UserStatus.INACTIVE</name>
  <files>
    src/Modules/Auth/Domain/Aggregates/User.ts
    src/Modules/Auth/Infrastructure/Repositories/AuthRepository.ts
  </files>
  <action>
**3a. Remove INACTIVE from the enum**

In `User.ts`, delete the enum member:
```typescript
/** User account has been created but is not yet active. */
INACTIVE = 'inactive',
```

The enum should only contain `ACTIVE` and `SUSPENDED` after this change.

**3b. Remove INACTIVE from the status mapper in AuthRepository**

In `AuthRepository.ts`, in the `mapStatus(status: unknown): UserStatus` method, delete the case:
```typescript
case UserStatus.INACTIVE:
  return UserStatus.INACTIVE
```

The switch should fall through to `default: return UserStatus.ACTIVE` for any unknown value, which is the correct behaviour.

**3c. Verify no callers reference INACTIVE**

Run a grep to confirm nothing else in the codebase references `UserStatus.INACTIVE` or the string literal `'inactive'` in a UserStatus context. If any callers are found, update them to use `ACTIVE` (new users) or `SUSPENDED` (blocked accounts) as appropriate.

Command to check: `grep -rn "INACTIVE\|'inactive'" src/Modules/Auth/ --include="*.ts"`

If results exist outside User.ts and AuthRepository.ts, update those files too (add them to `<files>` mentally and fix in place).
  </action>
  <verify>
    <automated>cd /Users/carl/Dev/CMG/Draupnir && grep -rn "INACTIVE\|UserStatus\.INACTIVE" src/Modules/Auth/ --include="*.ts" && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>
    - `UserStatus` enum contains only `ACTIVE` and `SUSPENDED`.
    - `AuthRepository.mapStatus` has no `INACTIVE` case.
    - `grep` for `INACTIVE` in the Auth module returns zero results.
    - TypeScript reports zero errors.
  </done>
</task>

</tasks>

<verification>
After all three tasks complete:

```
cd /Users/carl/Dev/CMG/Draupnir
npx tsc --noEmit
bun test src/Modules/Auth --reporter=verbose 2>&1 | tail -30
```

Both commands must exit cleanly. No new `console.log` introduced (PostToolUse hook will warn).
</verification>

<success_criteria>
1. `User.ts` — zero void-returning state-mutation methods; all state changes return new User instances.
2. `GoogleOAuthService.ts` — imports `IGoogleOAuthAdapter` from Application/Ports, never from Infrastructure.
3. `IAuthRepository.ts` — no `updatePassword` method.
4. `sha256.ts` — single source of truth; three services import from it.
5. Token record IDs — all use `crypto.randomUUID()`.
6. `UserStatus` — only `ACTIVE` and `SUSPENDED` remain.
7. `npx tsc --noEmit` exits 0.
8. Existing Auth test suite remains green.
</success_criteria>

<output>
After completion, create `.planning/quick/260413-uzv-auth-ddd/260413-uzv-SUMMARY.md` using the standard summary template.
</output>
