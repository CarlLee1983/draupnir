# Manager / Member 雙 Portal 功能設計

> **日期**：2026-04-16  
> **狀態**：設計確認，待實作  
> **範圍**：Manager 與 Member 兩種身份登入後的 Portal 功能邊界、路由架構、API Key 指派機制

---

## 1. 背景與設計目標

Draupnir 採用三角色 RBAC：`ADMIN`（系統管理員）、`MANAGER`（組織管理者）、`MEMBER`（一般用戶）。

目前：
- Admin portal 已獨立存在（`src/Website/Admin/`、`/admin/*`）
- Member portal 已存在（`src/Website/Member/`、`/member/*`），但 Member 與 Manager 功能邊界未明確分離
- Manager portal 不存在

本設計確立：
1. Member 的功能集限縮為「被動查看被指派的 key」
2. Manager 取得獨立 portal，負責組織管理與 key 配發
3. 新增 API Key 指派機制（可視度指派，非所有權移轉）

---

## 2. 用戶狀態與身份流程

> **v1 假設**：一位使用者同一時間最多屬於一個組織（無多組織切換）。若未來支援多組織，API Key 的指派與 Member 端查詢皆必須改為「目前組織上下文 + `organization_id`」範圍化，不可僅依 `assigned_member_id`。

> **Member／建立組織**：使用者若以 `MEMBER` 身分**已加入**任一組織（具有效 membership、有 `organization_id`），在仍屬於該組織期間**不得**建立新組織；UI 不顯示「建立組織」、建立組織 API **必須拒絕**（例如 409 Conflict 或專用錯誤碼）。「建立組織」**僅**對「尚未加入任何組織」的帳號開放。若未來支援退出組織，退出後是否恢復「建立組織」依 [組織與成員](../../draupnir/specs/2-user-organization/README.md) 另定；本檔僅鎖定**在籍期間禁止**。

```
註冊
  └─ 新用戶（role = MEMBER，無組織）
        ├─ 建立組織（僅限尚未加入任何組織）→ role 升為 MANAGER → 進入 Manager portal
        └─ 接受邀請 → role 保持 MEMBER → 加入組織 → 進入 Member portal
                                          └─ 在籍期間不可再建立組織（見上欄規則）
```

**登入後導向規則：**

| 角色 | 狀態 | 導向 |
|------|------|------|
| MEMBER | 無組織 | `/member/dashboard`（引導空白頁） |
| MEMBER | 有組織（含尚無被指派 key） | `/member/dashboard` |
| MANAGER | 具備有效組織上下文 | `/manager/dashboard` |
| ADMIN | — | `/admin/dashboard` |

**登入後異常狀態（資料或流程邊界，須定義行為）：**

| 狀態 | 行為 |
|------|------|
| `role = MANAGER` 但 session 無有效 `organization_id`（資料不一致或尚未完成建立組織） | **不**進入 `/manager/*`；導向「建立組織」或錯誤／支援提示頁（避免 Manager UI 在無 org 上下文時讀取失敗） |
| 組織停用、合約失效等 | 依 [合約額度與 API Key 配發](../../draupnir/specs/2026-04-16-contract-quota-allocation-spec.md)；Portal 顯示唯讀或阻擋操作，與該規格一致 |

---

## 3. Portal 架構

### 3.1 兩個獨立 Portal

| Portal | 路由前綴 | Website slice | Middleware |
|--------|---------|--------------|-----------|
| Member | `/member/*` | `src/Website/Member/`（現有） | `requireMember`（現有） |
| Manager | `/manager/*` | `src/Website/Manager/`（新增） | `requireManager`（新增） |

**原則：**
- Manager 登入後**只進入 `/manager/*`**，不使用 `/member/*`
- `requireManager` middleware：驗證 `role = MANAGER` 且具備有效 `organization_id`（與 session／membership 一致）。若不滿足：
  - `ADMIN` → redirect `/admin/dashboard`
  - `MEMBER` → redirect `/member/dashboard`
  - 未登入 → redirect 登入頁（與既有 `requireAuth` 等行為一致）
  - `MANAGER` 但無有效組織上下文 → 依 §2「異常狀態」處理，**不**放行 `/manager/*`
- 兩個 portal 功能集不重疊，各自獨立維護

### 3.2 Website slice 結構（Manager，新增）

```
src/Website/Manager/
├── bindings/
│   └── registerManagerBindings.ts
├── middleware/
│   └── requireManager.ts
├── Pages/
│   ├── ManagerDashboardPage.ts
│   ├── ManagerOrganizationPage.ts
│   ├── ManagerMembersPage.ts
│   ├── ManagerApiKeysPage.ts
│   ├── ManagerApiKeyCreatePage.ts
│   └── ManagerSettingsPage.ts
├── routes/
│   └── registerManagerRoutes.ts
└── keys.ts
```

---

## 4. Member Portal 調整

### 4.1 無組織引導頁（空白狀態）

- **僅在**使用者尚無組織（無 membership）時，Dashboard 顯示引導卡片，兩個選項：
  1. **建立組織**（升為 Manager）
  2. **等待邀請**（說明邀請連結會由 Manager 發送）
- 使用者**已加入組織**後：Dashboard **不**再顯示「建立組織」卡片或入口（與 §2「在籍期間不得建立組織」一致）；可改為一般 dashboard 或僅保留「等待更多資源／key 指派」類說明（產品文案另定）
- Sidebar 其餘導航項目保留（**不含** Alerts，見 §4.3）；無組織時進入後顯示「請先加入組織」提示

### 4.2 API Keys 頁面限縮

| 功能 | 調整前 | 調整後 |
|------|--------|--------|
| 顯示的 key | 自己建立的 | 被 Manager 指派的 |
| 建立 key 入口 | ✅ | ❌ 移除 |
| 撤銷 key | ✅ | ❌ 移除 |
| 複製 key 值 | ✅ | ✅ |
| 查看用量 | ✅ | ✅ |
| 調整配額/budget | ✅ | ❌ 移除 |

### 4.3 其他頁面

| 頁面 | 調整 |
|------|------|
| Usage | 無變動，但資料範圍限縮為「被指派 key」的用量 |
| Cost Breakdown | 無變動，資料範圍同上 |
| Contracts | 保留唯讀，顯示所屬組織的合約資訊 |
| Settings | 無變動 |
| Alerts | **不顯示**於側欄導航；功能保留在產品範圍外（見 §9），待之後版本再實作並屆時再加回導航 |

---

## 5. Manager Portal 設計

### 5.1 導航結構

```
Dashboard        /manager/dashboard
─────────────────────────────────
組織
  組織設定       /manager/organization
  成員管理       /manager/members
─────────────────────────────────
API Keys         /manager/api-keys
─────────────────────────────────
個人設定         /manager/settings
```

### 5.2 各頁面功能

#### Dashboard（`/manager/dashboard`）

- 組織整體用量總覽（所有 key 合計）
- 合約配額使用狀況：已配發 / 未分配池 / 合約上限
- 各 key 用量排行（簡表）

#### 組織設定（`/manager/organization`）

- 編輯：組織名稱、描述
- 唯讀顯示：合約資訊（上限、有效期、模組）— 由 Admin 設定，Manager 無法修改

#### 成員管理（`/manager/members`）

- 列出現有成員（姓名、email、加入日期、被指派的 key 名稱）
- 產生邀請連結（含 token，7 天有效）
- 移除成員（不能移除自己；不能移除最後一個 Manager）
- **不提供**角色升降功能（v1 範圍外）

#### API Keys（`/manager/api-keys`）

列表欄位：key 名稱 | 配額 | 已用量 | 重置週期 | 指派對象

操作：
- 建立 key（含指派對象選填）
- 在列表行內更換指派對象（下拉選單：組織成員列表 + 「未指派」）
- 設定配額（受合約上限約束，詳見合約配額規格）
- 撤銷 key

#### 個人設定（`/manager/settings`）

- 與 Member portal 相同的個人設定頁（顯示名稱、時區、語系等）

---

## 6. API Key 指派機制

### 6.1 設計原則

- **指派 = 可視度**，不是所有權移轉
- Member 只能看到被指派給自己的 key（key 值可複製、用量可查看）
- Member 無法修改 key 的任何設定
- 一把 key **只能指派給一個 member**（或保持未指派）
- Manager 可隨時更換指派對象或取消指派

### 6.2 資料模型異動

```sql
-- api_keys 表新增欄位
ALTER TABLE api_keys
  ADD COLUMN assigned_member_id TEXT REFERENCES users(id) ON DELETE SET NULL;
```

| 欄位 | 說明 |
|------|------|
| `assigned_member_id` | 被指派的 Member user_id；NULL 代表未指派 |

**指派合法性（寫入 API 與 migration 後資料皆須滿足）：**

- 若 `assigned_member_id` 非 NULL，該 user **必須**為該 key 之 `organization_id` 底下的有效成員（以組織成員／membership 表查核；不可僅依 `users` 存在）。
- **v1**：指派對象僅限 `role = MEMBER` 的成員（Manager 後台下拉僅列 MEMBER）。若未來允許指派給 MANAGER，需另開規格修訂。
- 實作可選：資料庫層以 composite FK／trigger／check 與應用層驗證並行，避免跨組織指派殘留。

### 6.3 查詢規則

- **Manager 查詢**：`WHERE organization_id = ?`（看到組織所有 key）
- **Member 列表查詢**：`WHERE organization_id = ? AND assigned_member_id = ?`（第一個參數為該 Member 所屬組織，與 v1 單一組織假設一致；避免僅依 `assigned_member_id` 造成跨 org 洩漏）
- **Member 依 key ID 讀取**：除 `assigned_member_id = current_user` 外，仍須驗證該 key 之 `organization_id` 與使用者所屬組織一致，否則 **403**（呼應 §7 不變式）

### 6.4 指派操作 UX

**在 API Keys 列表：**
```
[key 列表]
  每列末端有「指派對象」欄位
  → 下拉選單（組織成員 + 「未指派」）
  → 選取後即時儲存（不需要額外確認步驟）
```

**建立 key 表單：**
```
key 名稱        [_________]
配額上限        [_________]
重置週期        [7天 / 30天]
指派給成員      [下拉：成員列表，選填]
              [建立]
```

### 6.5 指派變更的影響

| 情境 | 行為 |
|------|------|
| Manager 指派 key 給 member A | key 立即出現在 member A 的 `/member/api-keys` |
| Manager 將指派從 A 改為 B | 從 A 的列表消失，出現在 B 的列表 |
| Manager 取消指派 | key 從所有 member 列表消失 |
| Manager 撤銷 key | key 從 member 列表消失，key 失效 |

---

## 7. 不變式與邊界條件

1. Member 無法看到未指派給自己的 key，即使猜到 key ID 也應回傳 403
2. Manager 設定的配額總和不得超過合約上限（詳見合約配額規格）
3. 移除 member 時，該 member 被指派的 key 之 `assigned_member_id` 設為 NULL（key 本身不刪除）
4. 組織停用時，所有 key 行為依合約配額規格處理
5. `assigned_member_id` 若非 NULL，該 user 必須屬於該 key 的 `organization_id`；建立／更新指派與 Member 讀取 API 皆須驗證，禁止跨組織指派與讀取
6. 使用者由 MEMBER 升為 MANAGER（建立組織）時，既有 API Key／配額資料之遷移或歸屬，依 [合約額度與 API Key 配發](../../draupnir/specs/2026-04-16-contract-quota-allocation-spec.md) 與實作 migration 決策執行；本設計不另定演算法細節
7. `MEMBER` 已具有效組織 membership 者，建立組織之 HTTP／應用層操作一律拒絕；禁止僅依前端隱藏而後端未驗證

---

## 8. 關聯規格

- [合約額度與 API Key 配發](../../draupnir/specs/2026-04-16-contract-quota-allocation-spec.md) — 配額上限、未分配池、調降規則
- [Identity 設計](../../draupnir/specs/1-authentication/identity-design.md) — RBAC 三角色定義
- [組織與成員](../../draupnir/specs/2-user-organization/README.md) — 邀請機制、成員角色

---

## 9. 範圍外（本設計不涵蓋）

- Manager 角色升降 member（v1 範圍外）
- Alerts 功能實作（側欄不列項目；之後設計並實作後再加導航）
- 合約配額的具體演算法（見合約配額規格）
- 報表與 PDF 匯出

---

**最後更新**：2026-04-16
