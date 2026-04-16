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

```
註冊
  └─ 新用戶（role = MEMBER，無組織）
        ├─ 建立組織 → role 升為 MANAGER → 進入 Manager portal
        └─ 接受邀請 → role 保持 MEMBER → 加入組織 → 進入 Member portal
```

**登入後導向規則：**

| 角色 | 狀態 | 導向 |
|------|------|------|
| MEMBER | 無組織 | `/member/dashboard`（引導空白頁） |
| MEMBER | 有組織，有被指派 key | `/member/dashboard` |
| MANAGER | — | `/manager/dashboard` |
| ADMIN | — | `/admin/dashboard` |

---

## 3. Portal 架構

### 3.1 兩個獨立 Portal

| Portal | 路由前綴 | Website slice | Middleware |
|--------|---------|--------------|-----------|
| Member | `/member/*` | `src/Website/Member/`（現有） | `requireMember`（現有） |
| Manager | `/manager/*` | `src/Website/Manager/`（新增） | `requireManager`（新增） |

**原則：**
- Manager 登入後**只進入 `/manager/*`**，不使用 `/member/*`
- `requireManager` middleware：驗證 `role = MANAGER`，否則 redirect 到 `/member/dashboard`
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

- Dashboard 顯示引導卡片，兩個選項：
  1. **建立組織**（升為 Manager）
  2. **等待邀請**（說明邀請連結會由 Manager 發送）
- Sidebar 其他導航項目保留，但進入後顯示「請先加入組織」提示

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
| Alerts | 保留導航項目，顯示「即將推出」badge，暫不開放功能 |

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

### 6.3 查詢規則

- **Manager 查詢**：`WHERE organization_id = ?`（看到組織所有 key）
- **Member 查詢**：`WHERE assigned_member_id = ?`（只看到被指派的 key）

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

---

## 8. 關聯規格

- [合約額度與 API Key 配發](../../draupnir/specs/2026-04-16-contract-quota-allocation-spec.md) — 配額上限、未分配池、調降規則
- [Identity 設計](../../draupnir/specs/1-authentication/identity-design.md) — RBAC 三角色定義
- [組織與成員](../../draupnir/specs/2-user-organization/README.md) — 邀請機制、成員角色

---

## 9. 範圍外（本設計不涵蓋）

- Manager 角色升降 member（v1 範圍外）
- Alerts 功能實作（保留入口，之後設計）
- 合約配額的具體演算法（見合約配額規格）
- 報表與 PDF 匯出

---

**最後更新**：2026-04-16
