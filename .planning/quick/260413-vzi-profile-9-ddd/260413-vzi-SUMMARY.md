---
phase: quick-260413-vzi
plan: 01
subsystem: Profile
tags: [ddd, value-objects, domain-events, repository, refactoring]
dependency_graph:
  requires: []
  provides:
    - Profile module DDD-compliant aggregate with VO integration
    - findByUserId repository contract
    - Domain events (UserProfileCreated / UserProfileUpdated)
  affects:
    - src/Modules/Auth (AuthServiceProvider, ListUsersService.test.ts)
tech_stack:
  added: []
  patterns:
    - Domain Events on aggregate methods
    - ReconstitutionProps type for Mapper/aggregate boundary
    - VO-internal aggregate props with string-returning getters
key_files:
  created:
    - src/Modules/Profile/Application/EventHandlers/UserRegisteredHandler.ts
  modified:
    - src/Modules/Profile/Domain/Aggregates/UserProfile.ts
    - src/Modules/Profile/Domain/Repositories/IUserProfileRepository.ts
    - src/Modules/Profile/Infrastructure/Repositories/UserProfileRepository.ts
    - src/Modules/Profile/Infrastructure/Mappers/UserProfileMapper.ts
    - src/Modules/Profile/Application/Services/GetProfileService.ts
    - src/Modules/Profile/Application/Services/UpdateProfileService.ts
    - src/Modules/Profile/Infrastructure/Providers/ProfileServiceProvider.ts
    - src/Modules/Profile/Presentation/Controllers/ProfileController.ts
    - src/Modules/Profile/index.ts
    - src/Modules/Profile/__tests__/UserProfile.test.ts
    - src/Modules/Profile/__tests__/UpdateProfileService.test.ts
    - src/Modules/Profile/__tests__/GetProfileService.test.ts
    - src/Modules/Profile/__tests__/UserRegisteredHandler.test.ts
    - src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts
    - src/Modules/Auth/__tests__/ListUsersService.test.ts
  deleted:
    - src/Modules/Profile/Application/Services/UserRegisteredHandler.ts
decisions:
  - "UserProfile props 使用 VO 型別（Phone | Timezone | Locale），getter 回傳字串確保外部介面不變"
  - "reconstitute() 接受 ReconstitutionProps（字串）在內部包裝為 VO，讓 Mapper 保持字串型別"
  - "findByUserId 查 WHERE user_id = ?（非 WHERE id = ?），正確對應 Auth userId 語意"
  - "ProfileController 跨邊界使用 Auth 服務屬已知設計決策，加注釋不拆分路由"
metrics:
  duration: ~15 minutes
  completed_date: "2026-04-13"
  tasks_completed: 3
  files_changed: 15
---

# Quick Task 260413-vzi: Profile 模組 9 個 DDD 戰術設計修正摘要

**一句話摘要：** UserProfile 聚合根整合 Phone/Timezone/Locale VO、新增 Domain Events、Repository 重命名為 findByUserId（WHERE user_id = ?）、Handler 搬至 EventHandlers 目錄。

## Objective

修正 Profile 模組 9 個 DDD 戰術設計問題，使其與 Auth 模組（260413-uzv）完成後的標準一致：
- P1: UserProfile props 改用 VO 型別
- P2: 新增 UserProfileCreated / UserProfileUpdated domain events
- P3: createDefault 使用 Timezone.default() / Locale.default()
- P4: IUserProfileRepository 移除 role/status filter
- P5: ProfileController 加跨邊界設計注釋
- P6: findByUserId 取代 findById（語意修正）
- P8: ProfileServiceProvider.boot() 移除 console.log
- P9: UserRegisteredHandler 搬至 Application/EventHandlers/ 目錄

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | UserProfile VO 整合、findByUserId | fd1a380 | UserProfile.ts, IUserProfileRepository.ts, UserProfileRepository.ts, UserProfileMapper.ts |
| 2 | 更新呼叫點、搬移 Handler、清理 | 9d2ccb4 | GetProfileService.ts, UpdateProfileService.ts, EventHandlers/UserRegisteredHandler.ts, ProfileServiceProvider.ts, ProfileController.ts, index.ts |
| 3 | 更新測試全部通過 | 8e27b44 | All __tests__ files, AuthServiceProvider.ts |

## Key Design Decisions

1. **ReconstitutionProps 分離：** `reconstitute()` 改接受含字串欄位的 `ReconstitutionProps` 型別，Mapper 傳字串，aggregate 內部包裝成 VO。這保持 Mapper 與 DB 直接對接的清潔性，同時讓 Domain Layer 擁有型別安全。

2. **Getter 字串外露原則：** `phone: string | null`、`timezone: string`、`locale: string` 對外 getter 保持字串型別，確保 DTO / Controller / Mapper 無需改動。

3. **Domain Events 設計：** `createDefault` 設置 `UserProfileCreated`，`updateProfile` 設置 `UserProfileUpdated`，`clearDomainEvents()` 回傳新實例（immutable 原則）。

4. **findByUserId 語意：** 原 `findById` 查 `WHERE id = ?`（profile UUID），但所有 Service 傳入的是 Auth userId，導致查詢永遠不到資料。重命名並改為 `WHERE user_id = ?` 修正此隱藏 bug。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 修正 GetProfileService.test.ts 使用 profileId 查詢**
- **Found during:** Task 3
- **Issue:** GetProfileService.test.ts 同樣使用 `profileId`（profile UUID）呼叫 service，但 service 現在用 `findByUserId`
- **Fix:** 改用 `userId = 'user-123'` 統一查詢，測試語意正確
- **Files modified:** `src/Modules/Profile/__tests__/GetProfileService.test.ts`
- **Commit:** 8e27b44

**2. [Rule 3 - Blocking] 修正 AuthServiceProvider 和 ListUsersService.test.ts 的舊 import 路徑**
- **Found during:** Task 3（TypeScript 型別檢查）
- **Issue:** Auth 模組兩個檔案仍從 `Application/Services/UserRegisteredHandler` import，Handler 已搬移
- **Fix:** 更新 import 路徑至 `Application/EventHandlers/UserRegisteredHandler`
- **Files modified:** `src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts`, `src/Modules/Auth/__tests__/ListUsersService.test.ts`
- **Commit:** 8e27b44

## Verification Results

```
bun test src/Modules/Profile/
22 pass, 0 fail
Ran 22 tests across 5 files.

bun tsc --noEmit (Profile-related): 0 errors
```

## Known Stubs

None. All implementation is fully wired.

## Self-Check: PASSED

- UserProfile.ts exists: FOUND
- IUserProfileRepository.ts has findByUserId: FOUND
- UserProfileRepository.ts has findByUserId (WHERE user_id): FOUND
- Application/EventHandlers/UserRegisteredHandler.ts: FOUND
- Application/Services/UserRegisteredHandler.ts (deleted): CONFIRMED REMOVED
- Commit fd1a380: FOUND
- Commit 9d2ccb4: FOUND
- Commit 8e27b44: FOUND
- All 22 tests pass: CONFIRMED
