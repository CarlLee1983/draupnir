# 組織與成員規格（Organization Spec）

> **狀態**：草案已對齊現行實作（2026-04-25）  
> **範圍**：Organization bounded context 的 API、授權、成員、邀請、狀態與 middleware 規則  
> **關聯**：Auth 的系統角色與 JWT 管線、ApiKey 的組織上下文、AppModule / Reports / Alerts 對組織狀態的依賴

本文件是 **Organization 模組的機械可驗收規格**。它描述「系統必須做什麼」，不描述 UI 排版或內部重構細節。

---

## 1. 目的

Organization 是 Draupnir 的多租戶與組織內協作邊界。它負責：

- 建立組織與初始管理者
- 管理組織狀態
- 管理成員、邀請與角色
- 提供其他模組可依賴的組織上下文

此規格的目標是把以下行為鎖定為可測、可驗收、可回歸的契約：

1. 誰可以建立組織、誰可以讀寫組織資料
2. 成員與邀請的生命週期
3. 組織角色變更與最後一位管理者保護
4. 組織上下文 middleware 的授權與修復行為

---

## 2. 範圍與非目標

### 2.1 本規格涵蓋

- `POST /api/organizations`
- `GET /api/organizations`
- `GET /api/organizations/:id`
- `PUT /api/organizations/:id`
- `PATCH /api/organizations/:id/status`
- `GET /api/organizations/:id/members`
- `POST /api/organizations/:id/invitations`
- `GET /api/organizations/:id/invitations`
- `DELETE /api/organizations/:id/invitations/:invId`
- `POST /api/invitations/:token/accept`
- `POST /api/invitations/:id/accept-by-id`
- `POST /api/invitations/:id/decline`
- `DELETE /api/organizations/:id/members/:userId`
- `PATCH /api/organizations/:id/members/:userId/role`
- `requireOrganizationContext()` 與 `requireOrganizationManager()` 的核心行為

### 2.2 本規格不涵蓋

- Profile 個人資料 CRUD
- ApiKey / AppApiKey 的金鑰發行與配額
- Credit / Contract / Billing
- 任何 Website/Inertia 頁面的視覺行為
- 組織樹、子組織、跨組織聚合分析

### 2.3 現行文件差異說明

現行實作對「一個使用者能否加入多個組織」仍有歷史文件差異：

- `identity-design.md` 與部分總覽文件描述較寬鬆的多組織成員模型
- 但 `CreateOrganizationService` 仍保留 **v1 建組門檻**：使用者若已存在任何 membership，則不能再建立新組織

本規格**先鎖定現行程式行為**，未來若放寬為真正的多組織建立，需同步修訂此文件與對應驗收。

---

## 3. 角色與授權

### 3.1 系統角色

| 角色 | 權限範圍 |
|------|----------|
| `admin` | 可繞過組織成員檢查；可列出、更新、停用/啟用組織；可變更成員角色 |
| `manager` | 組織內管理者；可管理成員、邀請、角色與組織資料 |
| `member` | 組織一般成員；可讀取其所屬組織資料與成員/邀請清單（若路由允許） |

### 3.2 組織內角色

只有兩級：

- `manager`
- `member`

不使用 `owner` / `admin` / `member` 三階舊命名作為組織內角色。

### 3.3 授權原則

1. 系統 `admin` 可視為組織授權中的超級角色，能通過多數組織檢查。
2. 非 `admin` 使用者必須是目標組織成員，才能讀取或操作該組織。
3. `manager` 才能進行邀請與刪除成員等管理操作；**成員角色變更目前為 admin-only**。

---

## 4. 核心不變式

以下規則在穩定狀態下必須成立：

1. **組織狀態只允許兩種值**：`active`、`suspended`
2. **邀請狀態只允許四種值**：`pending`、`accepted`、`expired`、`cancelled`
3. **最後一位 manager 不能被刪除或降級**
4. **建立組織時，已持有 membership 的使用者不得再建立新組織**（現行 v1 約束）
5. **邀請接受者 email 必須與邀請時目標 email 匹配**
6. **同一組織中，對同一 email 的 pending 邀請應視為可被新邀請取代**
7. **移除成員時，該成員在該組織下的 key 指派必須先被清除**
8. **組織上下文 middleware 不能在缺少授權或缺少 org id 時默默放行**

---

## 5. API 與流程規格

### 5.1 建立組織

**路由**：`POST /api/organizations`

**前置條件**
- 請求者必須已登入
- 請求者不能是系統 `admin`
- 請求者目前不能已加入任何組織

**成功結果**
- 建立 `Organization`
- 建立對應的 `OrganizationMember`，角色為 `manager`
- 將該使用者的系統角色提升為 `manager`
- 重新簽發 access token，讓 downstream middleware 立即看到新角色
- 回傳 201

**失敗條件**
- 未登入 → 401
- 系統 `admin` 嘗試建立 → 400 / 業務失敗
- 名稱缺失 → 400
- slug 重複 → 400
- 已有 membership → 400

### 5.2 組織查詢與維護

**路由**
- `GET /api/organizations`：admin only
- `GET /api/organizations/:id`：組織成員或 admin
- `PUT /api/organizations/:id`：admin only
- `PATCH /api/organizations/:id/status`：admin only

**規則**
- 組織狀態只能在 `active` / `suspended` 間切換
- `GET /api/organizations/:id` 必須驗證 membership
- 更新組織資料與調整狀態都必須在授權通過後才執行

### 5.3 成員列表與邀請列表

**路由**
- `GET /api/organizations/:id/members`
- `GET /api/organizations/:id/invitations`

**規則**
- 非成員不得讀取
- admin 可繞過 membership 限制
- 返回的 member 列表需包含成員角色與可識別資訊（例如 email）
- 邀請列表只顯示該組織底下的邀請

### 5.4 邀請成員

**路由**：`POST /api/organizations/:id/invitations`

**授權**
- `manager` 或 `admin`

**業務規則**
- email 必須存在且可解析
- email 正規化為小寫後儲存
- 若同一 email 在同一組織已有 pending 邀請，舊邀請應被取消，再建立新邀請
- 邀請預設成員角色為 `member`，除非請求明確指定其他允許值

**成功結果**
- 建立 pending invitation
- 返回 token 與到期時間供後續寄送或追蹤

### 5.5 接受 / 拒絕邀請

**路由**
- `POST /api/invitations/:token/accept`
- `POST /api/invitations/:id/accept-by-id`
- `POST /api/invitations/:id/decline`

**共同規則**
- 請求者必須已登入
- invitation 必須是 pending 且未過期
- invitation 指向的 email 必須與目前登入使用者的 email 一致
- 已是該組織成員者不得重複加入

**接受成功**
- 建立 membership
- 將 invitation 標記為 accepted

**拒絕成功**
- 將 invitation 標記為 cancelled

### 5.6 刪除成員與變更角色

**路由**
- `DELETE /api/organizations/:id/members/:userId`
- `PATCH /api/organizations/:id/members/:userId/role`

**授權**
- `DELETE`：`manager` 或 `admin`
- `PATCH role`：`admin` only

**刪除成員規則**
- 不能刪除自己
- 不能刪除最後一位 manager
- 刪除前必須先清除該成員在此組織底下的 API key 指派
- 若被刪除者不再是任何組織的 manager，應同步降回系統 `member`

**變更角色規則**
- 只能在 `manager` / `member` 間切換
- 不能把最後一位 manager 降成 member
- 若降級後該人不再擔任任何組織 manager，應同步降回系統 `member`
- 現行 API 為 admin-only；若未來開放 manager 調整角色，需先更新路由與驗收

### 5.7 組織上下文 middleware

**middleware**：`requireOrganizationContext()`

**輸入來源**
- `X-Organization-Id`
- `x-organization-id`
- `organization-id`
- route params: `:orgId` / `:id`
- 若請求者是 manager，且未提供 org id，middleware 可自動解析其所屬組織

**授權結果**
- 未登入 → 401
- 缺少 org id 且無法自動解析 → 400
- 非成員 → 403
- 組織缺少必要 provisioning 資料且無法自動修復 → 503

**修復行為**
- 若組織缺少 gateway team 資料，middleware 可嘗試透過 provisioning 補建
- 補建失敗時必須阻擋後續操作，避免發生未綁定上下文的後續寫入

---

## 6. 驗收標準

以下條件滿足時，Organization 規格視為完成：

- [ ] 已登入且符合條件的使用者可建立組織，並自動成為 manager
- [ ] 建立組織後，舊 token 不再反映舊角色，新 token / cookie 已完成 rotation
- [ ] 已有 membership 的使用者不能再建立新組織
- [ ] admin 可列出、更新、停用/啟用組織；非 admin 被拒
- [ ] 組織成員可讀組織詳細資料與 member list；非成員被拒
- [ ] manager / admin 可建立、列出、取消邀請
- [ ] 變更成員角色為 admin-only，且最後一位 manager 不能被降級
- [ ] invitation accept / decline 會正確處理 pending、email match、重複成員與過期情況
- [ ] 刪除成員時會先清除該成員在該組織底下的 API key 指派
- [ ] 不能刪除自己、不能刪除最後一位 manager、不能降級最後一位 manager
- [ ] `requireOrganizationContext()` 對缺少 org id、非成員、無法修復的 provisioning 失敗回傳對應狀態碼

---

## 7. 後續演進

以下項目先不納入本規格，但若將來擴充，必須回頭更新本文件：

1. 真正放寬成員可屬於多個組織，並重新定義建立組織的 membership gate
2. 組織樹、子組織、巢狀 tenant
3. 更細粒度的組織內權限矩陣
4. 邀請 email 通知與審計日誌強化

---

## 8. 參考

- [`README.md`](./README.md)
- [`user-stories.md`](./user-stories.md)
- [`../1-authentication/identity-design.md`](../1-authentication/identity-design.md)
- [`../../architecture/auth-flow-diagrams.md`](../../architecture/auth-flow-diagrams.md)
- `src/Modules/Organization/Presentation/Routes/organization.routes.ts`
- `src/Modules/Organization/Presentation/Middleware/OrganizationMiddleware.ts`
