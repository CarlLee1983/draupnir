---
phase: quick-260413-wo3
plan: 01
subsystem: Organization
tags: [ddd, domain-cleanup, value-objects, infrastructure-mapping, authorization, testing]
dependency_graph:
  requires: []
  provides:
    - Organization Domain Entities 無 fromDatabase() 污染
    - OrganizationMember/OrganizationInvitation 使用 VO 型別
    - 三個 Mapper 各具 toEntity() 方法
    - OrgInvitationRules Domain Service
    - DTO barrel 拆分（Request/Response/Presenter 獨立檔案）
    - UpdateOrganizationService/ChangeOrgStatusService 授權檢查
    - 8 個新測試檔案（VO + Domain Service + Application Service）
  affects:
    - src/Modules/Organization/
    - src/Modules/ApiKey/__tests__/
    - src/Modules/AppApiKey/__tests__/
    - src/Modules/Dashboard/__tests__/
    - src/Modules/DevPortal/__tests__/
tech_stack:
  added: []
  patterns:
    - reconstitute() factory 取代 fromDatabase()
    - Mapper.toEntity() 封裝 DB row → Entity 映射
    - Domain Service 封裝業務規則（OrgInvitationRules）
    - vi.fn() mock 用於 Application Service 單元測試
key_files:
  created:
    - src/Modules/Organization/Application/DTOs/OrganizationRequestDTO.ts
    - src/Modules/Organization/Application/DTOs/OrganizationResponseDTO.ts
    - src/Modules/Organization/Application/DTOs/OrganizationPresenterDTO.ts
    - src/Modules/Organization/Domain/Services/OrgInvitationRules.ts
    - src/Modules/Organization/__tests__/OrgMemberRole.test.ts
    - src/Modules/Organization/__tests__/InvitationStatus.test.ts
    - src/Modules/Organization/__tests__/OrgStatus.test.ts
    - src/Modules/Organization/__tests__/OrgMembershipRules.test.ts
    - src/Modules/Organization/__tests__/ChangeOrgMemberRoleService.test.ts
    - src/Modules/Organization/__tests__/ChangeOrgStatusService.test.ts
    - src/Modules/Organization/__tests__/UpdateOrganizationService.test.ts
    - src/Modules/Organization/__tests__/CancelInvitationService.test.ts
  modified:
    - src/Modules/Organization/Domain/Aggregates/Organization.ts
    - src/Modules/Organization/Domain/Entities/OrganizationMember.ts
    - src/Modules/Organization/Domain/Entities/OrganizationInvitation.ts
    - src/Modules/Organization/Domain/Repositories/IOrganizationInvitationRepository.ts
    - src/Modules/Organization/Infrastructure/Mappers/OrganizationMapper.ts
    - src/Modules/Organization/Infrastructure/Mappers/OrganizationMemberMapper.ts
    - src/Modules/Organization/Infrastructure/Mappers/OrganizationInvitationMapper.ts
    - src/Modules/Organization/Infrastructure/Repositories/OrganizationRepository.ts
    - src/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository.ts
    - src/Modules/Organization/Infrastructure/Repositories/OrganizationInvitationRepository.ts
    - src/Modules/Organization/Application/DTOs/OrganizationDTO.ts
    - src/Modules/Organization/Application/Services/AcceptInvitationService.ts
    - src/Modules/Organization/Application/Services/CancelInvitationService.ts
    - src/Modules/Organization/Application/Services/UpdateOrganizationService.ts
    - src/Modules/Organization/Application/Services/ChangeOrgStatusService.ts
    - src/Modules/Organization/Application/Services/InviteMemberService.ts
    - src/Modules/Organization/Application/Services/CreateOrganizationService.ts
    - src/Modules/Organization/Application/Services/ChangeOrgMemberRoleService.ts
    - src/Modules/Organization/Application/Services/OrgAuthorizationHelper.ts
    - src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts
    - src/Modules/Organization/Presentation/Controllers/OrganizationController.ts
    - src/Modules/Organization/__tests__/Organization.test.ts
decisions:
  - "使用 try/catch 包裹 OrgInvitationRules 呼叫，根據 error.message 回傳對應 error code"
  - "OrgInvitationRules 使用靜態方法（static）以保持無狀態，不需要 DI"
  - "UpdateOrganizationService/ChangeOrgStatusService 授權檢查在業務邏輯前執行"
  - "跨模組測試（ApiKey/AppApiKey/Dashboard/DevPortal）同步修正 OrganizationMember.create() 呼叫點"
metrics:
  duration: "~30 minutes"
  completed_date: "2026-04-13"
  tasks: 3
  files_modified: 32
  files_created: 12
---

# Quick Task 260413-wo3: Organization 模組 9 個 DDD 問題修正 Summary

**一句話總結：** 修正 Organization Domain 實體的 DB 知識洩漏、VO 型別不一致、Repository 業務邏輯、DTO 未拆分、缺少授權檢查、測試覆蓋不足等 9 個 DDD 架構問題。

## 完成的 Priority 修正

### Priority 1（架構邊界）

**P1-1: 移除 Domain fromDatabase()**
- Organization、OrganizationMember、OrganizationInvitation 三個 Entity 均刪除 `fromDatabase()` 方法
- 改為 `static reconstitute(props)` 從 props 物件重建，不含 DB column 知識
- 三個 Infrastructure Mapper 各新增 `static toEntity(row)` 方法承接 DB → Entity 映射邏輯

**P1-2: Entity 換用 VO 型別**
- `OrganizationMember.role` props 改為 `OrgMemberRole`（VO），getter 回傳 `OrgMemberRole`
- `OrganizationInvitation.role` 改為 `OrgMemberRole`，`.status` 改為 `InvitationStatus`（VO）
- `create()` factory 和 `markAsAccepted()`/`cancel()` 方法內部改用 VO 建立

**P1-3: Repository 移除業務邏輯（markAsAccepted/cancel）**
- `IOrganizationInvitationRepository` 移除 `markAsAccepted(invitationId)` 和 `cancel(invitationId)`
- 新增 `update(invitation: OrganizationInvitation): Promise<void>`（generic update）
- `AcceptInvitationService`：改為呼叫 `invitation.markAsAccepted()` 後 `txInvitationRepo.update(accepted)`
- `CancelInvitationService`：改為先 `findById` 取得 invitation，呼叫 `.cancel()` 後 `repo.update(cancelled)`

**P1-4: DTO 按功能拆分**
- `OrganizationDTO.ts` 改為 barrel re-export
- 新建 `OrganizationRequestDTO.ts`：六個 Request interface
- 新建 `OrganizationResponseDTO.ts`：OrganizationResponse、ListOrganizationsResponse
- 新建 `OrganizationPresenterDTO.ts`：三個 Presenter class，VO getter 改用 `.getValue()`

### Priority 2（Domain 完整性）

**P2-5: 提取邀請業務規則至 Domain Service**
- 新建 `OrgInvitationRules.ts`：
  - `assertEmailMatches(invitation, userEmail)` — email 比對，throw `EMAIL_MISMATCH`
  - `assertNotAlreadyMember(existingMembership)` — 重複成員檢查，throw `USER_ALREADY_IN_ORG`
- `AcceptInvitationService` 的 inline 比對邏輯改為呼叫 Domain Service

**P2-6: 補授權檢查**
- `UpdateOrganizationService.execute()` 新增 `callerUserId, callerSystemRole` 參數
- `ChangeOrgStatusService.execute()` 新增 `callerUserId, callerSystemRole` 參數
- 兩者均在執行業務邏輯前呼叫 `this.orgAuth.requireOrgManager()` 授權檢查
- `OrganizationServiceProvider` 更新注入，`OrganizationController` 更新呼叫點

### Priority 3（測試覆蓋）

**8 個新測試檔案，39 個測試全部通過：**
- `OrgMemberRole.test.ts`（7 個測試）：有效/無效、isManager()、equals()、toString()
- `InvitationStatus.test.ts`（5 個測試）：四種有效狀態、isPending/isAccepted、equals
- `OrgStatus.test.ts`（7 個測試）：from/active/suspended 工廠、isActive/isSuspended、equals
- `OrgMembershipRules.test.ts`（3 個測試）：最後/多位/非 manager 情境
- `ChangeOrgMemberRoleService.test.ts`（4 個測試）：升級、MEMBER_NOT_FOUND、最後 manager、無效 role
- `ChangeOrgStatusService.test.ts`（5 個測試）：暫停/啟用、INVALID_STATUS、ORG_NOT_FOUND、未授權
- `UpdateOrganizationService.test.ts`（3 個測試）：更新、ORG_NOT_FOUND、未授權
- `CancelInvitationService.test.ts`（5 個測試）：取消、不存在、不同組織、未授權

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 跨模組測試 OrganizationMember.create() 字串 role 參數**
- **Found during:** Task 1
- **Issue:** 14 個跨模組測試（ApiKey/AppApiKey/Dashboard/DevPortal）傳遞 `'manager'` 字串至 `OrganizationMember.create()`，TypeScript 型別錯誤
- **Fix:** 自動為這些測試檔案新增 `OrgMemberRole` import，並包裹 `new OrgMemberRole('manager')`
- **Files modified:** 14 個 test 檔案
- **Commit:** b2a3f74

**2. [Rule 1 - Bug] Organization.test.ts 舊 invitation.status/role 字串比較**
- **Found during:** Task 1
- **Issue:** 既有 Organization.test.ts 中 `invitation.status.toBe('pending')` 和 `'member'` 字串 role 傳遞，TypeScript 型別不相容
- **Fix:** 更新測試使用 `.getValue()` 和 `new OrgMemberRole('member')`
- **Files modified:** `Organization.test.ts`
- **Commit:** b2a3f74

**3. [Rule 2 - Missing] OrgAuthorizationHelper membership.role 型別修正**
- **Found during:** Task 1
- **Issue:** `OrgAuthorizationHelper` 回傳 `membership.role`（現為 `OrgMemberRole`），但 `OrgAuthResult.membership.role: string`
- **Fix:** 改為 `membership.role.getValue()` 保持字串型別
- **Files modified:** `OrgAuthorizationHelper.ts`
- **Commit:** b2a3f74

**4. [Rule 2 - Missing] OrganizationController.update/changeStatus 缺少 auth 取得**
- **Found during:** Task 2
- **Issue:** 更新後的 `UpdateOrganizationService` 和 `ChangeOrgStatusService` 需要 `callerUserId/callerSystemRole`，但 Controller 方法未取得 auth context
- **Fix:** 在 Controller `update()` 和 `changeStatus()` 方法中加入 `AuthMiddleware.getAuthContext(ctx)` 取得後傳入 Service
- **Files modified:** `OrganizationController.ts`
- **Commit:** e461e1f

## Pre-existing Issues (Not Fixed)

以下問題為本次修改前已存在，超出本任務範圍：
- 4 個整合測試（CreateOrganizationService, AcceptInvitationService, InviteMemberService, RemoveMemberService）因 `RegisterUserService.execute()` 的 `data.id` 取得問題而失敗
- Pages/__tests__ 和 Auth/__tests__ 中 `IHttpContext.getMethod` TypeScript 型別不相容

這些問題已記錄於 `deferred-items.md`。

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | b2a3f74 | feat(quick-260413-wo3-01): 移除 Domain fromDatabase()，搬至 Mapper，Entity 換用 VO 型別 |
| Task 2 | e461e1f | feat(quick-260413-wo3-02): 拆分 DTOs、提取 OrgInvitationRules Domain Service、補授權檢查 |
| Task 3 | 50b8d53 | test(quick-260413-wo3-03): 補 VO、Domain Service 和 Application Service 測試套件 |

## Self-Check: PASSED

- Organization Domain 無 `fromDatabase`：確認（grep 零結果）
- IOrganizationInvitationRepository 無 `markAsAccepted/cancel`：確認
- 8 個新測試檔案存在且全部通過（39 tests passed）
- TypeScript 編譯（Organization 模組範圍）零錯誤
