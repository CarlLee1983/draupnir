---
phase: quick
plan: 260413-vdk
subsystem: auth, profile, shared
tags: [domain-events, decoupling, bounded-context, DDD]
dependency_graph:
  requires: []
  provides: [auth.user_registered domain event, UserRegisteredHandler]
  affects: [RegisterUserService, AuthServiceProvider, all tests using RegisterUserService]
tech_stack:
  added: []
  patterns: [domain-event dispatcher, event handler, bounded-context decoupling]
key_files:
  created:
    - src/Modules/Auth/Domain/Events/UserRegistered.ts
    - src/Modules/Profile/Application/Services/UserRegisteredHandler.ts
    - src/Modules/Profile/__tests__/UserRegisteredHandler.test.ts
  modified:
    - src/Modules/Auth/Application/Services/RegisterUserService.ts
    - src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts
    - src/Modules/Auth/__tests__/RegisterUserService.test.ts
    - src/Modules/Auth/__tests__/ChangeUserStatusService.test.ts
    - src/Modules/Auth/__tests__/LoginUserService.test.ts
    - src/Modules/Auth/__tests__/AuthFlow.e2e.test.ts
    - src/Modules/Auth/__tests__/ListUsersService.test.ts
    - src/Modules/Organization/__tests__/AcceptInvitationService.test.ts
    - src/Modules/Organization/__tests__/CreateOrganizationService.test.ts
    - src/Modules/Organization/__tests__/InviteMemberService.test.ts
    - src/Modules/Organization/__tests__/RemoveMemberService.test.ts
decisions:
  - "UserRegistered 事件 aggregateId 使用 userId（auth aggregate 的 ID）"
  - "UserProfile.id 與 userId 不同；測試中用 userId 查詢 profile"
  - "Organization module 測試不需要 profile，直接移除 profileRepo 參數即可"
metrics:
  duration: ~25 minutes
  completed_date: "2026-04-13"
  tasks_completed: 3
  files_modified: 11
  files_created: 3
---

# Quick Task 260413-vdk: Domain Event UserRegistered — Auth ↔ Profile 解耦

**One-liner:** 引入 `UserRegistered` domain event 取代 `RegisterUserService` 對 `UserProfile` 的直接依賴，透過 `DomainEventDispatcher` + `UserRegisteredHandler` 實現跨模組鬆耦合。

## Objective

解耦 Auth ↔ Profile 跨模組直接依賴，改用 Domain Event（`UserRegistered`）進行非同步通訊。

`RegisterUserService` 原本直接 import `UserProfile` aggregate 和 `IUserProfileRepository`，違反 bounded context 邊界（Auth 模組不應知道 Profile 模組內部細節）。

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | 建立 UserRegistered domain event 並更新 RegisterUserService | 868b6ea | Done |
| 2 | 建立 UserRegisteredHandler 並更新 AuthServiceProvider 綁定 | e4a8009 | Done |
| 3 | 全套測試驗證與型別檢查（含測試 bug 修正） | 157ee29 | Done |

## What Was Built

### UserRegistered Domain Event

`src/Modules/Auth/Domain/Events/UserRegistered.ts`:
- 繼承 `DomainEvent`，`eventType = 'auth.user_registered'`
- Payload: `{ userId: string, email: string }`
- 提供 `get userId()` 與 `get email()` 存取器
- 遵循現有 `BalanceDepleted` 事件模式

### RegisterUserService 更新

- Constructor 由 3 個參數縮減為 2 個（移除 `IUserProfileRepository`）
- 成功儲存 User 後，透過 `DomainEventDispatcher.getInstance().dispatch(new UserRegistered(...))` 發布事件
- 移除所有 `@/Modules/Profile` imports

### UserRegisteredHandler

`src/Modules/Profile/Application/Services/UserRegisteredHandler.ts`:
- `execute(userId, email)` 呼叫 `UserProfile.createDefault()` 並 `profileRepository.save()`
- 空值檢查：userId 或 email 為空時拋出明確錯誤

### AuthServiceProvider 更新

- `register()` 中的 `registerUserService` 綁定移除 `profileRepo` 參數
- `boot(context)` 訂閱 `auth.user_registered` 事件，使用容器解析 `profileRepository` 並委派 `UserRegisteredHandler`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 測試套件中其他測試檔案仍使用舊的 3 參數 RegisterUserService**

- **Found during:** Task 3（typecheck）
- **Issue:** `ChangeUserStatusService.test.ts`、`LoginUserService.test.ts`、`AuthFlow.e2e.test.ts`、`ListUsersService.test.ts`、以及 Organization 模組的 4 個測試檔案都仍傳遞 `profileRepo` 作為第 3 個參數
- **Fix:**
  - 所有測試改用 2 參數 constructor，並加入 `DomainEventDispatcher.resetForTesting()`
  - `ListUsersService.test.ts` 額外接入 `UserRegisteredHandler` 以透過事件建立 profile，並修正 profile 查詢條件由 `p.id` 改為 `p.userId`
  - Organization 測試僅需 userId，直接移除 profileRepo 即可
- **Files modified:** 8 個測試檔案
- **Commit:** 157ee29

## Verification Results

```
# Profile import check
grep -n "Profile" src/Modules/Auth/Application/Services/RegisterUserService.ts
# 結果：只有 comment 行，無 import

# Test results
bun test src/Modules/Auth/ src/Modules/Profile/
# 87 pass, 1 skip, 0 fail

# TypeScript
bun run typecheck
# 無錯誤
```

## Success Criteria Met

- [x] Auth 模組的 RegisterUserService 不再直接依賴 Profile 模組任何 class 或 interface
- [x] UserRegistered 事件遵循現有 DomainEvent 模式（eventType = 'auth.user_registered'）
- [x] Profile 建立邏輯透過 UserRegisteredHandler 接收事件觸發，行為與之前相同
- [x] 所有測試通過，typecheck 無新錯誤

## Known Stubs

None.

## Self-Check: PASSED
