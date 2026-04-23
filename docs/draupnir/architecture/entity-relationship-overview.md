# Entity-Relationship 概覽

本頁以 **`database/migrations/`** 套用後的實際表結構為準，並以 **Drizzle schema**（[`schema.ts`](../../../src/Shared/Infrastructure/Database/schema.ts)）為程式碼側對照；兩者應保持一致。型別在 SQLite（開發）與 PostgreSQL（CI／部署）之間可能不同（例如時間戳、數值），欄位語意以 migration 為準。登入／JWT／撤銷流程見 [`auth-flow-diagrams.md`](./auth-flow-diagrams.md)。

**未持久化／缺口：**`module_subscriptions` 表尚未建立（無對應 migration，`schema.ts` 亦無），`ModuleSubscriptionRepository` 仍指向該表名—實作前勿視為已上線。可選用專案內 **dbcli**（`.dbcli/config.json`）對連線資料庫執行 `dbcli schema` 與本頁交叉驗證。

---

## 核心 Aggregate & Entity 圖

```
                            ┌──────────────────────┐
                            │   User (Aggregate)   │
                            ├──────────────────────┤
                            │ PK: id               │
                            │ - email (unique)     │
                            │ - password (雜湊)    │
                            │ - role               │
                            │ - status             │
                            │ - google_id (unique?)│
                            │ - createdAt, updatedAt│
                            └──────────┬───────────┘
                                       │ 1:1
                                       ↓
                            ┌──────────────────────┐
                            │ UserProfile          │
                            ├──────────────────────┤
                            │ PK: id               │
                            │ FK: userId           │
                            │ - displayName        │
                            │ - avatarUrl          │
                            │ - bio                │
                            │ - timezone           │
                            │ - phone (nullable)   │
                            │ - locale (預設 zh-TW)│
                            │ - notificationPrefs  │
                            │   (JSON 字串, 預設 {})│
                            │ - createdAt, updatedAt│
                            └──────────────────────┘


┌────────────────────────────────────────────────────────────────────────┐
│                   JWT 發行紀錄（撤銷／黑名單）                          │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  Auth token 紀錄（表: auth_tokens）                            │ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │ PK: id                                                           │ │
│  │ FK: userId                                                       │ │
│  │ - tokenHash (unique, SHA-256 指紋；非存完整 JWT)                 │ │
│  │ - type: 'access' | 'refresh'                                    │ │
│  │ - expiresAt                                                      │ │
│  │ - revokedAt (nullable)                                         │ │
│  │ - createdAt                                                      │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  登入時簽出的 JWT 字串本身不寫入 DB；僅存雜湊供 middleware 查撤銷。   │
│  執行時 JWT 內容對應 `TokenPayload`（userId, email, role,            │
│  permissions[], jti, iat, exp, type）。                               │
│                                                                        │
│  Domain 另有 `AuthToken` Value Object：包裝「原始 JWT + 過期 + 種類」。│
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘


┌────────────────────────────────────────────────────────────────────────┐
│     一次性連結（無 user FK，以 email 對應使用者流程）                     │
├────────────────────────────────────────────────────────────────────────┤
│  email_verification_tokens：id, email, expires_at, used (bool)         │
│  password_reset_tokens：    同上                                       │
│  （索引：email；見 migration 2026_04_14_*）                              │
└────────────────────────────────────────────────────────────────────────┘


┌────────────────────────────────────────────────────────────────────────┐
│                        Organization 聚合                               │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │              Organization (Aggregate Root)                       │ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │ PK: id                                                           │ │
│  │ - name, slug (unique), description                              │ │
│  │ - status: 'active' | 'suspended'                                 │ │
│  │ - createdAt, updatedAt                                          │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│           │ 1:N                           │ 1:N                        │
│           ↓                               ↓                            │
│  ┌──────────────────────────┐   ┌──────────────────────────┐          │
│  │   OrganizationMember     │   │   OrganizationInvitation │          │
│  │ (Entity)                 │   │ (Entity)                 │          │
│  ├──────────────────────────┤   ├──────────────────────────┤          │
│  │ PK: id                   │   │ PK: id                   │          │
│  │ FK: organizationId       │   │ FK: organizationId       │          │
│  │ FK: userId               │   │ - email                  │          │
│  │ - role (例: manager/     │   │ - tokenHash (unique)     │          │
│  │         member)          │   │ - role                   │          │
│  │ - joinedAt, createdAt    │   │ - invitedByUserId        │          │
│  │ ※ partial unique：        │   │ - status (例: pending) │          │
│  │   role='manager' 時      │   │ - expiresAt, createdAt  │          │
│  │   user_id 全表唯一        │   └──────────────────────────┘          │
│  │   (uniq_org_manager…)    │                                        │
│  └──────────────────────────┘                                         │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘


┌────────────────────────────────────────────────────────────────────────┐
│              Org API Key 聚合（Bifrost Virtual Key 對應）            │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │           ApiKey (Aggregate Root)                              │ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │ PK: id                                                           │ │
│  │ FK: orgId                                                        │ │
│  │ FK: createdByUserId                                              │ │
│  │ - label                                                          │ │
│  │ - keyHash (unique)                                               │ │
│  │ - bifrostVirtualKeyId (gateway 側 ID)                          │ │
│  │ - status: pending | active | revoked | suspended_no_credit       │ │
│  │ - scope (JSON)、expiresAt、revokedAt、suspension 相關欄位         │ │
│  │ - createdAt, updatedAt                                           │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘


┌────────────────────────────────────────────────────────────────────────┐
│     AppModule（全站模組目錄）+ 組織訂閱 + App API Key                   │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │          AppModule (Aggregate Root — 全域目錄)                   │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ PK: id                                                           │ │
│  │ - name (unique)、description                                    │ │
│  │ - type: free / …                                                │ │
│  │ - status: active | deprecated                                   │ │
│  │ - createdAt, updatedAt                                          │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│           │ 1:N (透過訂閱實體)                                        │
│           ↓                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │      ModuleSubscription (Entity)                                │ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │ PK: id                                                           │ │
│  │ FK: orgId, moduleId                                              │ │
│  │ - status: active | suspended | cancelled                        │ │
│  │ - subscribedAt, updatedAt                                       │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│  **缺口：**`module_subscriptions` 尚無 migration／未在 `schema.ts` 註冊；   │
│  `ModuleSubscriptionRepository` 仍使用該表名—補齊前訂閱持久化視為未實作。   │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │      AppApiKey (Aggregate Root)                                 │ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │ PK: id                                                           │ │
│  │ FK: orgId, issuedByUserId                                        │ │
│  │ - label, keyHash (unique), bifrostVirtualKeyId                   │ │
│  │ - status, scope, boundModules, rotation 與 grace 相關欄位        │ │
│  │ - expiresAt, revokedAt, createdAt, updatedAt                     │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘


┌────────────────────────────────────────────────────────────────────────┐
│   DevPortal：Application（OAuth 風格應用）+ WebhookConfig              │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │          Application (Aggregate Root)                            │ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │ PK: id                                                           │ │
│  │ FK: orgId, createdByUserId                                       │ │
│  │ - name, description, status                                      │ │
│  │ - webhookUrl, webhookSecret, redirectUris …                     │ │
│  │ - createdAt, updatedAt                                           │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│           │ 1:N                                                       │
│           ↓                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │      WebhookConfig (Entity)                                      │ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │ PK: id                                                           │ │
│  │ FK: applicationId                                                │ │
│  │ - eventType, enabled, timestamps                                 │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘


┌────────────────────────────────────────────────────────────────────────┐
│                   Credit 聚合 (額度系統)                               │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │        CreditAccount (Aggregate Root)                           │ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │ PK: id                                                           │ │
│  │ FK: orgId (unique)                                               │ │
│  │ - balance (ValueObject: Balance, bigint 語意)                  │ │
│  │ - lowBalanceThreshold                                            │ │
│  │ - status: active | frozen                                        │ │
│  │ - createdAt, updatedAt                                           │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│           │ 1:N                                                       │
│           ↓                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │       CreditTransaction (Entity)                                 │ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │ PK: id                                                           │ │
│  │ FK: creditAccountId                                              │ │
│  │ - type: topup | deduction | refund | expiry | adjustment        │ │
│  │ - amount, balanceAfter (Balance)                                 │ │
│  │ - referenceType, referenceId (nullable)                          │ │
│  │ - description (nullable)                                         │ │
│  │ - createdAt                                                      │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘


┌────────────────────────────────────────────────────────────────────────┐
│   Reports：ReportSchedule（組織級排程）                                 │
├────────────────────────────────────────────────────────────────────────┤
│  PK: id | FK: orgId | type (weekly/monthly) | day | time | timezone   │
│  | recipients (JSON) | enabled | createdAt, updatedAt                  │
└────────────────────────────────────────────────────────────────────────┘


┌────────────────────────────────────────────────────────────────────────┐
│   Alerts（預算告警）— 與 org 關聯                                       │
├────────────────────────────────────────────────────────────────────────┤
│  AlertConfig (1:1 org) → AlertEvent (1:N) → AlertDelivery (1:N)        │
│  AlertDelivery 冗餘欄位：org_id, month, tier（避免與 alert_events JOIN）  │
│  WebhookEndpoint (N: org)                                             │
└────────────────────────────────────────────────────────────────────────┘


┌────────────────────────────────────────────────────────────────────────┐
│   用量與計價（支援性實體，非單一 Aggregate 根）                          │
├────────────────────────────────────────────────────────────────────────┤
│  UsageRecord：bifrost_log_id (unique), api_key_id, org_id, model,      │
│  input_tokens, output_tokens, credit_cost (REAL／浮點額度成本),         │
│  provider, latency_ms, status, occurred_at, created_at；               │
│  複合索引 (org_id, occurred_at)。                                       │
│  PricingRule：model_pattern、價格欄位、priority、is_active              │
│  SyncCursor：cursor_type (unique)、last_synced_at、last_bifrost_log_id  │
│  QuarantinedLog：無法對應的 Bifrost log                                │
└────────────────────────────────────────────────────────────────────────┘
```

### Contract 模組

`src/Modules/Contract` 內有 **Contract** 等 Domain 模型，但目前 **沒有** 對應的 `database/migrations` 建表；故未畫入上方「已持久化」核心圖。待補 migration 後可再併入本頁。

---

## 關鍵關係說明

### User（認證聚合根）

```
User 1 ←─── 1 UserProfile     (顯示名稱、頭像等)
     │
     ├─→ N OrganizationMember (多組織成員)
     │
     ├─→ N auth_tokens 紀錄   (每次登入／刷新可寫入 access/refresh 雜湊)
     │
     ├─→ (流程) email_verification_tokens / password_reset_tokens（以 email 對應，無 user FK）
     │
     ├─→ N ApiKey             (僅在「建立者」語意上；金鑰隸屬 org)
     │
     └─ 可連結 google_id（OAuth）
```

### Organization（聚合根）

```
Organization 1 ←─── N OrganizationMember
              │      （每位使用者至多一筆 org-level manager：partial unique index）
              │
              ├─→ N OrganizationInvitation
              │
              ├─→ 1 CreditAccount（org 維度唯一）
              │
              ├─→ N ModuleSubscription → AppModule
              │
              ├─→ N ApiKey / AppApiKey
              │
              ├─→ N Application（DevPortal）
              │
              └─→ AlertConfig / AlertEvent / WebhookEndpoint / ReportSchedule …
```

### AppModule 與訂閱

```
AppModule 1 ←─── N ModuleSubscription（多組織訂閱同一模組）— 預期表 module_subscriptions

`app_modules` 表已存在（全站模組目錄）。`module_subscriptions` 尚無 migration，關係僅存在領域／Repository 設計中。

AppApiKey 為「應用／整合場景」用的 org 級金鑰，與 ApiKey（一般 API 金鑰）並列，
皆透過 org 關聯，而非 AppModule 的子集合表結構。
```

### CreditAccount 與 CreditTransaction

```
CreditAccount 1 ←─── N CreditTransaction

帳本為 append-only；referenceType / referenceId 可連到用量或其他業務鍵。
```

---

## ValueObjects 與其用途

| ValueObject | 用途 | 特點 |
|------------|------|------|
| **Email** | 郵件格式與不變式 | 認證模組驗證 |
| **Role** | 平台使用者角色 (`admin` / `manager` / `member`) | JWT 與授權 |
| **OrgSlug** | 組織 URL slug | 唯一性 |
| **OrgMemberRole** | 組織內角色 (`manager` / `member`) | 成員權限 |
| **Balance** | 額度 | BigInt／字串持久化，避免浮點誤差 |
| **TransactionType** | `topup`, `deduction`, `refund`, `expiry`, `adjustment` | 帳本分類 |
| **KeyStatus** | API 金鑰狀態 | pending, active, revoked, suspended_no_credit |
| **SubscriptionStatus** | 模組訂閱狀態 | active, suspended, cancelled |
| **TokenPayload** | JWT claims | userId, email, role, permissions, jti, iat, exp, type |
| **AuthToken** (VO) | 執行中的 JWT + 過期 + access/refresh | 簽章由 `JwtTokenService` 負責 |

---

## 持久化映射示例

### User → users 表

```typescript
User (Domain)              →  users (Database)
├─ id                      →  id
├─ email                   →  email (unique)
├─ password (hash)         →  password
├─ role                    →  role
├─ status                  →  status
├─ googleId                →  google_id (nullable, unique)
├─ createdAt               →  created_at
└─ updatedAt               →  updated_at
```

### UserProfile → user_profiles 表

```typescript
UserProfile (Domain)       →  user_profiles (Database)
├─ id                      →  id
├─ userId                  →  user_id (FK → users.id)
├─ displayName             →  display_name
├─ avatarUrl               →  avatar_url
├─ bio                     →  bio
├─ timezone                →  timezone
├─ phone                   →  phone (nullable)
├─ locale                  →  locale (default zh-TW)
├─ notificationPreferences →  notification_preferences (JSON 字串, default '{}')
├─ createdAt               →  created_at
└─ updatedAt               →  updated_at
```

### Token 紀錄 → auth_tokens 表

```typescript
TokenRecord / 登入流程     →  auth_tokens (Database)
├─ id                      →  id
├─ userId                  →  user_id (FK)
├─ tokenHash               →  token_hash (unique)
├─ type                    →  type ('access' | 'refresh')
├─ expiresAt               →  expires_at
├─ revokedAt               →  revoked_at (nullable)
└─ createdAt               →  created_at
```

### 信箱驗證／密碼重設（無 user FK）

```typescript
// email_verification_tokens、password_reset_tokens
├─ id         →  id
├─ email      →  email（對應 users.email 流程，非 FK）
├─ expiresAt  →  expires_at
└─ used       →  used (boolean)
```

### ApiKey → api_keys 表

```typescript
ApiKey (Domain)            →  api_keys (Database)
├─ id                      →  id
├─ orgId                   →  org_id
├─ createdByUserId         →  created_by_user_id
├─ label                   →  label
├─ keyHash                 →  key_hash (unique)
├─ gatewayKeyId            →  bifrost_virtual_key_id
├─ status, scope, …        →  對應欄位
└─ timestamps              →  created_at, updated_at
```

### CreditAccount → credit_accounts 表

```typescript
CreditAccount (Domain)     →  credit_accounts (Database)
├─ id                      →  id
├─ orgId                   →  org_id (unique)
├─ balance                 →  balance (VARCHAR 十進位字串)
├─ lowBalanceThreshold     →  low_balance_threshold
├─ status                  →  status
├─ createdAt               →  created_at
└─ updatedAt               →  updated_at
```

### CreditTransaction → credit_transactions 表

```typescript
CreditTransaction (Entity) →  credit_transactions (Database)
├─ id                      →  id
├─ creditAccountId         →  credit_account_id (FK)
├─ type                    →  type
├─ amount                  →  amount (VARCHAR)
├─ balanceAfter            →  balance_after (VARCHAR)
├─ referenceType           →  reference_type (nullable)
├─ referenceId             →  reference_id (nullable)
├─ description             →  description (nullable)
└─ createdAt               →  created_at
```

---

## 索引策略

以下與 schema／migration 中已宣告的索引一致（節錄；完整列表見 `schema.ts`）。

```sql
-- User / Profile
CREATE UNIQUE INDEX ... ON users(email);
CREATE INDEX ... ON user_profiles(user_id);  -- 由 FK 與查詢需求決定

-- auth_tokens
CREATE UNIQUE INDEX ... ON auth_tokens(token_hash);
CREATE INDEX idx_auth_tokens_user_id ON auth_tokens(user_id);

-- ApiKey
CREATE INDEX idx_api_keys_org_id ON api_keys(org_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);

-- Organization / Member / Invitation
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);

-- Credit
CREATE UNIQUE INDEX ... ON credit_accounts(org_id);
CREATE INDEX idx_credit_transactions_account_id ON credit_transactions(credit_account_id);

-- App API Keys
CREATE INDEX idx_app_api_keys_org_id ON app_api_keys(org_id);
CREATE INDEX idx_app_api_keys_key_hash ON app_api_keys(key_hash);

-- Report schedules
CREATE INDEX idx_report_schedules_org_id ON report_schedules(org_id);

-- Organization members（每位使用者至多一個 org-level manager）
CREATE UNIQUE INDEX uniq_org_manager_per_user ON organization_members (user_id) WHERE role = 'manager';

-- Usage records（儀表板區間查詢）
-- CREATE INDEX ... ON usage_records (org_id, occurred_at);

-- Alert deliveries（依 org／月／層級查詢，與 dedup 索引見 schema.ts）
-- idx_alert_deliveries_org_month_tier, idx_alert_deliveries_dedup, …

-- 信箱／重設連結
CREATE INDEX idx_email_verification_tokens_email ON email_verification_tokens(email);
CREATE INDEX idx_password_reset_tokens_email ON password_reset_tokens(email);
```

---

## 參考

- [`auth-flow-diagrams.md`](./auth-flow-diagrams.md) — 登入／JWT／撤銷
- [`ddd-layered-architecture.md`](./ddd-layered-architecture.md) — 四層架構
- `src/Shared/Infrastructure/Database/schema.ts` — 表結構單一來源
- `src/Modules/*/Domain/Aggregates/`、`Entities/` — 各模組模型
- `database/migrations/` — 遷移歷史
