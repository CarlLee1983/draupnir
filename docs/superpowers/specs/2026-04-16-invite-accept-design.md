# 設計規格：Member 接受／拒絕組織邀請

**日期：** 2026-04-16  
**狀態：** 已確認

---

## 背景

Manager 可透過 `/manager/members` 頁面邀請 email 加入組織。受邀者登入後若尚未加入任何組織，目前只看到「建立我的組織」卡片，無法得知有待處理的邀請。本功能讓 member 在 Dashboard 無組織狀態下直接查看並接受或拒絕邀請。

---

## 範圍與限制

- 只在 `hasOrganization === false` 時顯示邀請
- 不包含 email 通知（邀請透過 Manager dashboard 產生後，由 Manager 另行告知被邀請者）
- 不支援多組織情境（接受後立即進入該組織 Dashboard）

---

## 方案選擇

採用**方案一**：Inertia props server-side 帶入邀請列表 ＋ 新增 decline endpoint。

理由：
- 符合現有 Inertia page handler 模式（同 balance、membership 的載入方式）
- 載入零額外 round-trip
- 只需新增一個 API endpoint（decline），修改範圍最小

---

## 後端變更

### 1. Repository Port 新增方法

**檔案：** `src/Modules/Organization/Domain/Repositories/IOrganizationInvitationRepository.ts`

新增：
```typescript
findPendingByEmail(email: string): Promise<OrganizationInvitation[]>
```

**檔案：** `src/Modules/Organization/Infrastructure/Repositories/OrganizationInvitationRepository.ts`

實作：查詢 `status = 'pending'` 且 `expires_at > NOW()` 且 `email = email` 的邀請列表。

---

### 2. 新增 `DeclineInvitationService`

**檔案：** `src/Modules/Organization/Application/Services/DeclineInvitationService.ts`

```typescript
async execute(userId: string, token: string): Promise<OrganizationResponse>
```

流程：
1. `sha256(token)` → 查詢邀請
2. 驗證 `invitation.isPending()`
3. 驗證 `invitation.email === user.email`（`OrgInvitationRules.assertEmailMatches`）
4. 呼叫 `invitation.cancel()` 並 `invitationRepository.update()`
5. 回傳 `{ success: true, message: 'Invitation declined' }`

錯誤碼：`TOKEN_REQUIRED`、`INVALID_INVITATION`、`USER_NOT_FOUND`、`EMAIL_MISMATCH`

---

### 3. 新增路由與 Controller 方法

**路由：** `POST /api/invitations/:token/decline`  
**Middleware：** `requireAuth()`  
**Request schema：** `{ token: string }` （與 `AcceptInvitationRequest` 相同）

`OrganizationController` 新增：
```typescript
async declineInvitation(ctx: IHttpContext): Promise<Response>
```

---

### 4. `MemberDashboardPage` 擴充

**檔案：** `src/Website/Member/Pages/MemberDashboardPage.ts`

當 `!membership` 時：
1. 以 `authRepository.findById(userId)` 取得 email
2. 呼叫 `invitationRepository.findPendingByEmail(email)`
3. 將結果 map 為 `PendingInvitationDTO[]` 傳入 props

若查詢失敗，catch 後傳入空陣列，不影響頁面渲染。

新增注入：`IOrganizationInvitationRepository`（或包裝為 Application Service）

---

## 前端變更

### Props 型別擴充

**檔案：** `resources/js/Pages/Member/Dashboard/Index.tsx`

```typescript
interface PendingInvitation {
  id: string
  token: string
  organizationId: string
  organizationName: string
  role: string
  invitedByEmail: string
  expiresAt: string
}

interface Props {
  orgId?: string | null
  balance: Balance | null
  hasOrganization: boolean
  pendingInvitations: PendingInvitation[]  // 新增
  error: I18nMessage | null
}
```

---

### UI 結構（無組織狀態）

```
hasOrganization === false
  ├── [有邀請] InvitationCard × N（顯示於「建立組織」卡片上方）
  │     ├── 組織名稱、角色、邀請人、到期時間
  │     └── 按鈕：[接受] [拒絕]
  └── 「建立我的組織」Card（原有，若無邀請或邀請全部被拒絕後顯示）
```

邀請卡片建議抽成獨立元件：`components/InvitationCard.tsx`

---

### 操作行為

**接受：**
```
POST /api/invitations/:token/accept
body: { token }
成功 → router.visit('/member/dashboard', { replace: true })
失敗 → 卡片內顯示錯誤訊息
```

**拒絕：**
```
POST /api/invitations/:token/decline
body: { token }
成功 → 樂觀移除該邀請（local state filter）
       全部拒絕後 → 顯示「建立我的組織」卡片
失敗 → 卡片內顯示錯誤訊息（保留卡片）
```

---

## 資料流

```
GET /member/dashboard
  └── MemberDashboardPage.handle()
        ├── membershipService.execute(userId)         → null（無組織）
        ├── authRepository.findById(userId)            → user（取 email）
        ├── invitationRepo.findPendingByEmail(email)   → PendingInvitation[]
        └── inertia.render('Member/Dashboard/Index', {
              hasOrganization: false,
              pendingInvitations: [...],
              orgId: null,
              balance: null,
              error: null
            })
```

---

## 錯誤處理

| 情境 | 處理方式 |
|------|---------|
| 接受時 token 已過期/無效 | 前端顯示錯誤訊息於卡片內，不跳轉 |
| 接受時 email 不符 | 顯示 `EMAIL_MISMATCH` 錯誤於卡片內 |
| 拒絕失敗（網路錯誤） | 顯示錯誤，邀請卡片保留（不移除） |
| `findPendingByEmail` 查詢失敗 | server-side catch，傳空陣列，不影響渲染 |

---

## 測試範圍

| 測試 | 類型 | 描述 |
|------|------|------|
| `DeclineInvitationService` | 單元 | token 無效、email 不符、正常拒絕 |
| `findPendingByEmail` | 整合 | 只回傳 pending 且未過期的邀請 |
| `MemberDashboardPage` | 單元 | 有邀請 / 無邀請 / 查詢失敗三種情境 |

---

## 修改檔案清單

**新增：**
- `src/Modules/Organization/Application/Services/DeclineInvitationService.ts`
- `src/Modules/Organization/__tests__/DeclineInvitationService.test.ts`
- `resources/js/Pages/Member/Dashboard/components/InvitationCard.tsx`

**修改：**
- `src/Modules/Organization/Domain/Repositories/IOrganizationInvitationRepository.ts` — 新增 `findPendingByEmail`
- `src/Modules/Organization/Infrastructure/Repositories/OrganizationInvitationRepository.ts` — 實作 `findPendingByEmail`
- `src/Modules/Organization/Presentation/Controllers/OrganizationController.ts` — 新增 `declineInvitation`
- `src/Modules/Organization/Presentation/Routes/organization.routes.ts` — 新增 decline 路由
- `src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts` — 註冊 `DeclineInvitationService`
- `src/Website/Member/Pages/MemberDashboardPage.ts` — 新增邀請查詢
- `src/Website/Member/bindings/registerMemberBindings.ts` — 注入新依賴
- `resources/js/Pages/Member/Dashboard/Index.tsx` — 新增 props 與邀請 UI
