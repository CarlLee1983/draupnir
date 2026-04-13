---
phase: quick-260413-vsz
plan: 01
subsystem: Auth
tags: [performance, filter-pushdown, pagination, repository]
dependency_graph:
  requires: []
  provides: [UserListFilters, IAuthRepository.countAll, AuthRepository.findAll-with-WHERE]
  affects: [ListUsersService, IAuthRepository, AuthRepository]
tech_stack:
  added: []
  patterns: [filter-pushdown, DB-side-pagination, repository-pattern]
key_files:
  created: []
  modified:
    - src/Modules/Auth/Domain/Repositories/IAuthRepository.ts
    - src/Modules/Auth/Infrastructure/Repositories/AuthRepository.ts
    - src/Modules/Auth/Application/Services/ListUsersService.ts
decisions:
  - "keyword 篩選保留在 Service 層（需 profile join，無法純 SQL 下推）"
  - "offset=0 以 !== undefined 判斷，避免 falsy 跳過"
  - "有 keyword 時仍先以 role/status 在 DB 篩選，減少 in-memory 工作量"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-13"
  tasks_completed: 3
  files_modified: 3
---

# Quick 260413-vsz: ListUsersService / IAuthRepository findAll 篩選下推 Summary

**One-liner:** 將 role/status WHERE 條件與分頁 total count 從 Service 層 in-memory 下推至 SQL，透過 UserListFilters 介面統一傳遞篩選參數。

## Objective

將 `ListUsersService` 中的 role / status 篩選邏輯下推至 `IAuthRepository.findAll()`，
並讓分頁 total count 改由 `countAll()` 在 DB 層完成。

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | 更新 IAuthRepository 介面，新增 UserListFilters 與 countAll() | 7099178 | IAuthRepository.ts |
| 2 | 實作 AuthRepository.findAll() 與 countAll() 的 DB 篩選 | 9d0afeb | AuthRepository.ts |
| 3 | 重構 ListUsersService，移除 in-memory role/status 過濾與 JS sort | f042e2c | ListUsersService.ts |

## Changes Made

### IAuthRepository.ts
- 新增匯出介面 `UserListFilters { role?, status?, limit?, offset? }`
- `findAll(limit?, offset?)` 改為 `findAll(filters?: UserListFilters)`
- 新增 `countAll(filters?: UserListFilters): Promise<number>`

### AuthRepository.ts
- 引入 `UserListFilters` 型別
- `findAll(filters?)` 實作：`orderBy('created_at', 'DESC')` + role/status WHERE 下推 + `offset !== undefined` / `limit !== undefined` 邊界正確處理
- 新增 `countAll(filters?)` 使用 `.count()` 在 DB 端計算

### ListUsersService.ts
- 移除 `.sort((a,b) => b.createdAt...)` — DB 已排序
- 移除 `.filter()` by role / `.filter()` by status — 下推至 SQL WHERE
- **無 keyword 路徑**：`Promise.all([countAll(repoFilters), findAll({...repoFilters, limit, offset}), profileRepo.findAll()])` — 分頁完全在 DB 端
- **有 keyword 路徑**：`findAll(repoFilters)` 取符合 role/status 的全部使用者，再 in-memory keyword 過濾與 slice

## Verification Results

```
bun test src/Modules/Auth/__tests__/ListUsersService.test.ts
  4 pass, 0 fail

bun test src/Modules/Auth/__tests__/AuthRepository.test.ts
  2 pass, 0 fail

bunx tsc --noEmit
  (no output — zero errors)
```

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `src/Modules/Auth/Domain/Repositories/IAuthRepository.ts` — FOUND
- `src/Modules/Auth/Infrastructure/Repositories/AuthRepository.ts` — FOUND
- `src/Modules/Auth/Application/Services/ListUsersService.ts` — FOUND
- commit 7099178 — FOUND
- commit 9d0afeb — FOUND
- commit f042e2c — FOUND
