# 組織與成員使用者故事（Organization）

> 本文件對標代碼日期：2026-04-18（commit `fbf1007`）。
> 若你看到的代碼與此文件明顯不一致，請提 issue 或直接 PR 修正。

## 範圍

- 本檔覆蓋：**Organization 模組**——組織建立、邀請 / 接受 / 拒絕、成員列出 / 移除、角色變更、Admin 管理 orgs
- 身份相關前置動作（登入、註冊）見 [1-authentication/user-stories.md](../1-authentication/user-stories.md)
- 組織的合約與額度屬 Contract 模組，見 [4-credit-billing/user-stories.md](../4-credit-billing/user-stories.md)

## 相關 personas

閱讀前請先看 [../personas.md](../personas.md)：
- **Cloud Admin** — 管 org 層級的動作（啟停、調整角色）
- **Org Manager** — 組織建立者、邀請 / 移除成員
- **Org Member** — 接受邀請後的一般使用者

---

### US-ORG-001 | 使用者建立組織（並自動升級為 Manager）

**As** an authenticated user (not yet in any org, or allowed to create another)
**I want to** create a new organization by giving it a name
**so that** I become its first Manager and can start inviting teammates and issuing API keys.

**Related**
- Module: `src/Modules/Organization`
- Entry: `CreateOrganizationService.execute()` → `src/Modules/Organization/Application/Services/CreateOrganizationService.ts`
- Controller: `OrganizationController.create()` → `src/Modules/Organization/Presentation/Controllers/OrganizationController.ts`
- Route: `POST /api/organizations`
- 跨模組協作：`ProvisionOrganizationDefaultsService`（AppModule）自動配置 Bifrost Team 與預設資源

**Key rules**
- 建立者不能是 `admin` 系統角色（admin 不屬於任何 org）；其他 authenticated user 都可以
- 建立流程是單一 DB transaction：org 建立、首位 manager member 寫入、預設資源 provisioning 全部成功才 commit
- 建立成功後會 **rotate access JWT**（舊 token 帶舊 role，必須簽新 token 並寫 httpOnly cookie），response 會回 `redirectTo` 讓前端導向 Manager dashboard
- 見 [US-AUTH-003](../1-authentication/user-stories.md#us-auth-003-使用者換發-access-tokenrefresh) 了解 token rotate 的互動

---

### US-ORG-002 | Manager 查看 / 修改組織基本資料

**As** an Org Manager
**I want to** view my organization's detail page and update fields like name or description
**so that** the org info stays accurate and reflects current branding.

**Related**
- Module: `src/Modules/Organization`
- Entries:
  - `GetOrganizationService.execute()` → `src/Modules/Organization/Application/Services/GetOrganizationService.ts`
  - `UpdateOrganizationService.execute()` → `src/Modules/Organization/Application/Services/UpdateOrganizationService.ts`
- Controller: `OrganizationController.get()` / `update()`
- Routes：
  - REST：`GET /api/organizations/:id`（member 以上可讀）、`PUT /api/organizations/:id`（**admin only**）
  - Manager Portal：`GET /manager/organization`（Inertia）、`POST /manager/organization`（Inertia 送出）

**Key rules**
- REST `PUT /api/organizations/:id` 現階段受 `createRoleMiddleware('admin')` 保護，**只有 Cloud Admin** 可透過 REST 改 org；Manager 改 org 基本資料走的是 Inertia Manager Portal 路徑
- 讀取需要 `requireOrganizationContext`——呼叫者需是該 org 的 member 或 admin
- 名稱必須 trim 後非空；其他欄位空字串視為「不改」

---

### US-ORG-003 | Manager 邀請成員加入組織

**As** an Org Manager
**I want to** send an email invitation to a prospective member
**so that** they can accept and join my organization.

**Related**
- Module: `src/Modules/Organization`
- Entry: `InviteMemberService.execute()` → `src/Modules/Organization/Application/Services/InviteMemberService.ts`
- Controller: `OrganizationController.invite()`
- Routes：
  - REST：`POST /api/organizations/:id/invitations`（requireOrganizationContext + Manager role enforced in service）
  - Manager Portal：`POST /manager/members/invite`

**Key rules**
- 只有該 org 的 Manager（或 admin）能發邀請；service 端以 `OrgAuthorizationHelper.requireOrgManager` 驗證
- Email 必填且 trim 後非空；service 不在此檢查是否為已註冊使用者——流程允許邀請尚未註冊的 email，註冊後憑 token 接受
- 邀請建立後存入 `organization_invitations`，token 以 hash 存庫（明文 token 只在 email 連結裡）

---

### US-ORG-004 | 受邀者接受或拒絕邀請

**As** an invitee (authenticated user)
**I want to** view my pending invitations and accept or decline them
**so that** I can join (or refuse) an organization.

**Related**
- Module: `src/Modules/Organization`
- Entries：
  - `AcceptInvitationService.execute()`（憑 token 接受）→ `src/Modules/Organization/Application/Services/AcceptInvitationService.ts`
  - `AcceptInvitationByIdService.execute()`（登入後在 UI 直接接受自己收到的邀請）→ 同目錄
  - `DeclineInvitationService.execute()` → 同目錄
  - `GetPendingInvitationsService.execute()`（使用者查自己收到哪些邀請）→ 同目錄
- Controller: `OrganizationController.acceptInvitation()` / `acceptInvitationById()` / `declineInvitation()`
- Routes：
  - `POST /api/invitations/:token/accept`（從 email 連結進來）
  - `POST /api/invitations/:id/accept-by-id`（登入 UI 中直接接受）
  - `POST /api/invitations/:id/decline`

**Key rules**
- Token-based accept 走 SHA-256 比對：DB 只存 token hash、email 連結帶明文 token
- Accept 過程在單一 transaction 內把 `OrganizationMember` 建立 + 邀請狀態標 `accepted`
- 邀請過期、已接受、已撤銷的邀請都無法再次接受（service 回 `INVALID_INVITATION`）
- Decline 不會透露 org 的詳細資訊，只改邀請狀態

---

### US-ORG-005 | Manager 管理待處理邀請（列出 / 撤銷）

**As** an Org Manager
**I want to** see all pending invitations my org has sent and cancel any that shouldn't proceed
**so that** I keep the invite list tidy and can retract invitations sent by mistake.

**Related**
- Module: `src/Modules/Organization`
- Entries：
  - `ListInvitationsService.execute()` → `src/Modules/Organization/Application/Services/ListInvitationsService.ts`
  - `CancelInvitationService.execute()` → 同目錄
- Controller: `OrganizationController.listInvitations()` / `cancelInvitation()`
- Routes：
  - `GET /api/organizations/:id/invitations`
  - `DELETE /api/organizations/:id/invitations/:invId`

**Key rules**
- List 僅回該 org 的邀請，需 `requireOrganizationContext`
- 取消邀請僅 Manager / Admin 可做；已接受 / 已過期的邀請無需取消（status 已固化）
- 取消後受邀者用該 token 點連結進來會被拒絕

---

### US-ORG-006 | Manager 列出 / 移除組織成員

**As** an Org Manager
**I want to** see my org's member list and remove members who have left the team
**so that** access to our keys and usage stays limited to current teammates.

**Related**
- Module: `src/Modules/Organization`
- Entries：
  - `ListMembersService.execute()` → `src/Modules/Organization/Application/Services/ListMembersService.ts`
  - `RemoveMemberService.execute()` → 同目錄
- Controller: `OrganizationController.listMembers()` / `removeMember()`
- Routes：
  - REST：`GET /api/organizations/:id/members`、`DELETE /api/organizations/:id/members/:userId`
  - Manager Portal：`GET /manager/members`、`POST /manager/members/:userId/remove`（Inertia）

**Key rules**
- List 與 remove 都受 `requireOrganizationContext` 限制；remove 額外需 Manager / Admin
- 不可移除組織最後一位 Manager（`OrgMembershipRules.assertNotLastManager`）
- 被移除的 member 之後存取 org 資源（key、dashboard）會被各 module 的 org-scope middleware 擋下

---

### US-ORG-007 | Cloud Admin 調整組織成員角色

**As** a Cloud Admin
**I want to** promote a member to Manager or demote a Manager back to member
**so that** I can help customers re-structure their team without deleting and recreating members.

**Related**
- Module: `src/Modules/Organization`
- Entry: `ChangeOrgMemberRoleService.execute()` → `src/Modules/Organization/Application/Services/ChangeOrgMemberRoleService.ts`
- Controller: `OrganizationController.changeMemberRole()`
- Route: `PATCH /api/organizations/:id/members/:userId/role`（`createRoleMiddleware('admin')` + `requireOrganizationContext`）

**Key rules**
- 僅 Cloud Admin 可變更成員角色（REST 路由強制 admin middleware）
- 降級最後一位 Manager 會被拒絕（`OrgMembershipRules.assertNotLastManager`）
- 若被降級的 member 已不屬於任何 org 的 manager，會連帶把他的 system role 從 `manager` 降為 `member`（保持兩層 role 一致）

---

### US-ORG-008 | Cloud Admin 列出 / 啟停組織

**As** a Cloud Admin
**I want to** see every organization and suspend or reactivate any of them
**so that** I can respond to compliance actions, payment failures, or customer requests.

**Related**
- Module: `src/Modules/Organization`
- Entries：
  - `ListOrganizationsService.execute()` → `src/Modules/Organization/Application/Services/ListOrganizationsService.ts`
  - `ChangeOrgStatusService.execute()` → 同目錄
- Controller: `OrganizationController.list()` / `changeStatus()`
- Routes：
  - REST：`GET /api/organizations`、`PATCH /api/organizations/:id/status`（皆 `createRoleMiddleware('admin')`）
  - Admin Portal：`GET /admin/organizations`、`GET /admin/organizations/:id`

**Key rules**
- 列出所有 org 與啟停都只給 Cloud Admin
- 停用 org 會影響**之後**進入 org-scope API 的請求（例如列 key、查 dashboard）；對在途 request 不會強制中斷
- 啟停是 reversible 的 status 變更，並非刪除（v1 無 hard-delete）

---

## Coverage map

### Organization 模組 Application Services

| Service method | Story ID | 備註 |
|---|---|---|
| `CreateOrganizationService.execute` | US-ORG-001 | 建立 + 預設 provisioning |
| `GetOrganizationService.execute` | US-ORG-002 | 讀取 org 詳細 |
| `UpdateOrganizationService.execute` | US-ORG-002 | 修改 org |
| `InviteMemberService.execute` | US-ORG-003 | 發邀請 |
| `ListInvitationsService.execute` | US-ORG-005 | Manager 看 org 的待處理邀請 |
| `CancelInvitationService.execute` | US-ORG-005 | Manager 撤銷邀請 |
| `GetPendingInvitationsService.execute` | US-ORG-004 | 使用者看自己收到哪些邀請 |
| `AcceptInvitationService.execute` | US-ORG-004 | Token-based accept |
| `AcceptInvitationByIdService.execute` | US-ORG-004 | UI 直接 accept |
| `DeclineInvitationService.execute` | US-ORG-004 | 拒絕邀請 |
| `ListMembersService.execute` | US-ORG-006 | Manager 列出成員 |
| `RemoveMemberService.execute` | US-ORG-006 | Manager 移除成員 |
| `ChangeOrgMemberRoleService.execute` | US-ORG-007 | Admin 調整角色 |
| `ListOrganizationsService.execute` | US-ORG-008 | Admin 跨 org 列表 |
| `ChangeOrgStatusService.execute` | US-ORG-008 | Admin 啟停 org |
| `GetUserMembershipService.execute` | — | 內部 helper：各 Website Portal 用來解析「當前使用者屬於哪個 org」。被 Manager/Member/Admin Portal 多處呼叫，無獨立 user 旅程 |
| `OrgAuthorizationHelper.requireOrgManager` / `requireOrgMembership` | — | 授權輔助，被其他 service 內部呼叫 |

### Presentation 入口

| Entry | Story ID | 備註 |
|---|---|---|
| `OrganizationController.create` | US-ORG-001 | REST |
| `OrganizationController.list` | US-ORG-008 | REST（admin）|
| `OrganizationController.get` | US-ORG-002 | REST |
| `OrganizationController.update` | US-ORG-002 | REST（admin only in REST 路由；Manager Portal 另走 Inertia）|
| `OrganizationController.changeStatus` | US-ORG-008 | REST（admin）|
| `OrganizationController.listMembers` | US-ORG-006 | REST |
| `OrganizationController.invite` | US-ORG-003 | REST |
| `OrganizationController.listInvitations` | US-ORG-005 | REST |
| `OrganizationController.cancelInvitation` | US-ORG-005 | REST |
| `OrganizationController.acceptInvitation` | US-ORG-004 | REST（token）|
| `OrganizationController.acceptInvitationById` | US-ORG-004 | REST（UI）|
| `OrganizationController.declineInvitation` | US-ORG-004 | REST |
| `OrganizationController.removeMember` | US-ORG-006 | REST |
| `OrganizationController.changeMemberRole` | US-ORG-007 | REST（admin）|
| Manager Portal：`/manager/organization`（GET/POST） | US-ORG-002 | Inertia |
| Manager Portal：`/manager/members`（GET） | US-ORG-006 | Inertia |
| Manager Portal：`/manager/members/invite`（POST） | US-ORG-003 | Inertia |
| Manager Portal：`/manager/members/:userId/remove`（POST） | US-ORG-006 | Inertia |
| Admin Portal：`/admin/organizations`（GET） | US-ORG-008 | Inertia |
| Admin Portal：`/admin/organizations/:id`（GET） | US-ORG-008 | Inertia |

### 已知覆蓋缺口

- **Member 自行離開 org**：v1 未提供「離開 org」的 self-service API，需經由 Manager 執行 remove（US-ORG-006）。若後續補上 self-leave service，新增獨立 story
- **多 org 同屬 1 使用者**：一位使用者可屬多個 org（`GetUserMembershipService` 目前回傳的僅為首個 active membership），多 org 切換 UX 尚未有完整 story
- **邀請 email 已是 org 成員**：邀請重複的 email 目前 service 會接受建立邀請，接受時才發現已在 org——行為尚待收斂，暫不獨立 story
