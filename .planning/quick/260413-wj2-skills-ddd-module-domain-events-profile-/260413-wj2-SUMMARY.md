---
phase: quick-260413-wj2
plan: 01
subsystem: profile-domain
tags: [ddd, domain-events, profile, refactor]
dependency_graph:
  requires: [quick-260413-vzi]
  provides: [profile.user_profile_created, profile.user_profile_updated]
  affects: [profile-module, ddd-module-skill]
tech_stack:
  added: []
  patterns: [domain-events, aggregate-collect-service-dispatch, application-dto-helper]
key_files:
  created:
    - src/Modules/Profile/Domain/Events/UserProfileCreated.ts
    - src/Modules/Profile/Domain/Events/UserProfileUpdated.ts
  modified:
    - src/Modules/Profile/Domain/Aggregates/UserProfile.ts
    - src/Modules/Profile/Application/DTOs/UserProfileDTO.ts
    - src/Modules/Profile/Application/Services/UpdateProfileService.ts
    - src/Modules/Profile/Application/Services/GetProfileService.ts
    - src/Modules/Profile/Application/EventHandlers/UserRegisteredHandler.ts
    - src/Modules/Profile/index.ts
    - src/Modules/Profile/__tests__/UserProfile.test.ts
    - skills/ddd-module/references/domain.md
    - skills/ddd-module/SKILL.md
decisions:
  - "profileToDTO() 放在 Application/DTOs 層（非 Infrastructure Mapper），讓 Service 零 Infrastructure 依賴"
  - "不呼叫 clearDomainEvents() 後再次 save，已持久化的 aggregate 不需存 cleared 版本"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-13"
  tasks_completed: 3
  files_changed: 9
---

# Quick 260413-wj2: Profile 模組 P3/P4 DDD 問題修正 Summary

**一句話總結**：Profile Domain Events 從 Aggregate 內 local interface 遷移至獨立 `Domain/Events/` class（繼承 Shared DomainEvent），Application Services 移除 Infrastructure Mapper 依賴並加入 `dispatcher.dispatchAll()`。

## 完成的任務

### Task 1：建立 Domain/Events/ 並重構 UserProfile events
- 新增 `Domain/Events/UserProfileCreated.ts` 和 `UserProfileUpdated.ts`，繼承 `@/Shared/Domain/DomainEvent`
- `UserProfile.ts` 移除 3 個 local event interface/class 定義（`DomainEvent`、`UserProfileCreated`、`UserProfileUpdated`）
- `reconstitute()` 移除冗餘 null 判斷：`phone: Phone.fromNullable(props.phone)` 直接處理
- 測試更新為使用 `eventType`/`data` 屬性（Shared DomainEvent API，替換舊的 `eventName`/`payload`）
- **Commit**: `80d7c5d`

### Task 2：Application 層 — 移動 toDTO、加入 event dispatch
- `UserProfileDTO.ts` 末尾新增 `profileToDTO()` helper 函數（純 aggregate→DTO 映射）
- `UpdateProfileService` 移除 `UserProfileMapper` import，改用 `profileToDTO()`，並在 update 後呼叫 `dispatcher.dispatchAll()`
- `GetProfileService` 移除 `UserProfileMapper` import，改用 `profileToDTO()`
- `UserRegisteredHandler` 新增 `DomainEventDispatcher` import 並在 save 後呼叫 `dispatcher.dispatchAll()`
- `index.ts` 新增 `UserProfileCreated` 和 `UserProfileUpdated` 匯出
- **Commit**: `a37909f`

### Task 3：補充 skill domain.md Domain Events 說明
- `skills/ddd-module/references/domain.md` 第 4 節新增完整 Domain Events 說明：目錄結構、Aggregate vs Service dispatch 取捨表格、Application Service 派發模式範例、Event Class 規範（含 eventType 命名規範）
- `skills/ddd-module/SKILL.md` 常見陷阱補充陷阱 6、7、8
- **Commit**: `0b5b697`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 更新測試使用舊的 local event API**
- **Found during**: Task 1
- **Issue**: `UserProfile.test.ts` 使用 `events[0].eventName` 和 `events[0].payload`，這是舊的 local interface 屬性，已改為 Shared DomainEvent 的 `eventType` 和 `data`
- **Fix**: 更新測試斷言使用 `eventType`（如 `'profile.user_profile_created'`）和 `data`（取代 `payload`）
- **Files modified**: `src/Modules/Profile/__tests__/UserProfile.test.ts`
- **Commit**: `80d7c5d`

## Known Stubs

None — 所有功能已完整實作。

## Self-Check: PASSED

- [x] `src/Modules/Profile/Domain/Events/UserProfileCreated.ts` — 存在
- [x] `src/Modules/Profile/Domain/Events/UserProfileUpdated.ts` — 存在
- [x] `UserProfile.ts` — 已移除 local event interface，改用 Shared DomainEvent
- [x] `reconstitute()` — 使用 `Phone.fromNullable(props.phone)` 無條件判斷
- [x] `profileToDTO()` — 存在於 `Application/DTOs/UserProfileDTO.ts`
- [x] `UpdateProfileService` 和 `GetProfileService` — 不 import `UserProfileMapper`
- [x] `UpdateProfileService.execute()` — 呼叫 `dispatcher.dispatchAll()`
- [x] `UserRegisteredHandler.execute()` — 呼叫 `dispatcher.dispatchAll()`
- [x] `index.ts` — 匯出 `UserProfileCreated` 和 `UserProfileUpdated`
- [x] `skills/ddd-module/references/domain.md` — 新增 Domain Events 完整說明
- [x] `skills/ddd-module/SKILL.md` — 新增陷阱 6-8
- [x] `npx tsc --noEmit` — 無錯誤
