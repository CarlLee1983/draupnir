# Entity-Relationship 概覽

## 核心 Aggregate & Entity 圖

```
                            ┌──────────────────────┐
                            │      User            │
                            ├──────────────────────┤
                            │ PK: id               │
                            │ - email (unique)     │
                            │ - hashedPassword     │
                            │ - profile            │
                            │ - status             │
                            │ - createdAt          │
                            └──────────┬───────────┘
                                       │ 1:1
                                       ↓
                            ┌──────────────────────┐
                            │      Profile         │
                            ├──────────────────────┤
                            │ PK: id               │
                            │ FK: userId           │
                            │ - name               │
                            │ - avatar             │
                            │ - bio                │
                            │ - preferences        │
                            │ - updatedAt          │
                            └──────────────────────┘


┌────────────────────────────────────────────────────────────────────────┐
│                        Organization 聚合                               │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │              Organization (Aggregate Root)                       │ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │ PK: id                                                           │ │
│  │ - name, slug (unique), description                              │ │
│  │ - ownerId (FK → User)                                           │ │
│  │ - status: 'active' | 'suspended' | 'deleted'                    │ │
│  │ - createdAt, updatedAt                                          │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│           │ 1:N                           │ 1:N                        │
│           ↓                               ↓                            │
│  ┌──────────────────────────┐   ┌──────────────────────────┐          │
│  │   OrgMember              │   │   OrgInvitation          │          │
│  │ (Entity - 子實體)        │   │ (Entity - 子實體)        │          │
│  ├──────────────────────────┤   ├──────────────────────────┤          │
│  │ PK: id                   │   │ PK: id                   │          │
│  │ FK: orgId                │   │ FK: orgId                │          │
│  │ FK: userId               │   │ - inviteeEmail (unique)  │          │
│  │ - role: 'OWNER'/'ADMIN'/ │   │ - token (unique)         │          │
│  │         'MEMBER'         │   │ - status: 'PENDING'/     │          │
│  │ - status: 'ACTIVE'/      │   │           'ACCEPTED'/    │          │
│  │           'SUSPENDED'    │   │           'EXPIRED'      │          │
│  │ - joinedAt               │   │ - expiresAt              │          │
│  └──────────────────────────┘   └──────────────────────────┘          │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘


┌────────────────────────────────────────────────────────────────────────┐
│                      Auth & Session 聚合                               │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │           AuthSession (Aggregate Root)                          │ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │ PK: id                                                           │ │
│  │ FK: userId                                                       │ │
│  │ - jwtToken (加密)                                                │ │
│  │ - refreshToken (加密)                                            │ │
│  │ - expiresAt                                                      │ │
│  │ - isRevoked: boolean                                             │ │
│  │ - createdAt, lastActivityAt                                      │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  (TokenClaims ValueObject 用於解析 JWT 內容)                          │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘


┌────────────────────────────────────────────────────────────────────────┐
│                     API Key 聚合 (用戶級)                              │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │           ApiKey (Aggregate Root)                               │ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │ PK: id                                                           │ │
│  │ FK: userId                                                       │ │
│  │ - keyString (unique, hash)                                       │ │
│  │ - status: 'ACTIVE' | 'REVOKED'                                   │ │
│  │ - lastUsedAt (nullable)                                          │ │
│  │ - expiresAt (nullable)                                           │ │
│  │ - createdAt                                                      │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  (KeySecret ValueObject 加密存儲 key 內容)                            │
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
│  │ FK: orgId                                                        │ │
│  │ - balance (ValueObject: Balance, 用 bigint 表示)               │ │
│  │ - lowBalanceThreshold (ValueObject: Balance)                     │ │
│  │ - status: 'active' | 'frozen'                                    │ │
│  │ - createdAt, updatedAt                                           │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│           │ 1:N                                                       │
│           ↓                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │       CreditTransaction (Entity - 子實體)                       │ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │ PK: id                                                           │ │
│  │ FK: creditAccountId                                              │ │
│  │ - type: 'TOPUP' | 'DEDUCTION'                                    │ │
│  │ - amount (ValueObject: Balance)                                  │ │
│  │ - balanceAfter (ValueObject: Balance)                            │ │
│  │ - referenceType (nullable): 'API_CALL', 'MANUAL', ...           │ │
│  │ - referenceId (nullable)                                         │ │
│  │ - createdAt                                                      │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  (Balance ValueObject 用 bigint * 10^10 避免浮點誤差)               │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘


┌────────────────────────────────────────────────────────────────────────┐
│              App Module 聚合 (應用程式管理)                            │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │          AppModule (Aggregate Root)                             │ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │ PK: id                                                           │ │
│  │ FK: orgId                                                        │ │
│  │ - name, description                                              │ │
│  │ - slug (unique within org)                                       │ │
│  │ - status: 'active' | 'suspended'                                 │ │
│  │ - createdAt, updatedAt                                           │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│           │ 1:N                                                       │
│           ↓                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │      AppApiKey (Aggregate Root - 與 AppModule 聚合)              │ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │ PK: id                                                           │ │
│  │ FK: appModuleId                                                  │ │
│  │ - keyString (unique, hash)                                       │ │
│  │ - status: 'ACTIVE' | 'REVOKED'                                   │ │
│  │ - lastUsedAt (nullable)                                          │ │
│  │ - createdAt                                                      │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘


┌────────────────────────────────────────────────────────────────────────┐
│                  Contract 聚合 (合約管理)                              │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │           Contract (Aggregate Root)                             │ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │ PK: id                                                           │ │
│  │ FK: orgId                                                        │ │
│  │ - contractNumber (unique)                                        │ │
│  │ - type: 'SERVICE' | 'SUPPORT' | 'SLA'                           │ │
│  │ - status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'         │ │
│  │ - startDate, endDate                                             │ │
│  │ - terms (JSON - 合約條款)                                        │ │
│  │ - totalValue                                                     │ │
│  │ - createdAt, updatedAt                                           │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 關鍵關係說明

### User (核心)

```
User 1 ←─── 1 Profile        (用戶資料)
     │
     ├─→ N OrgMember          (可以是多個組織的成員)
     │
     ├─→ N AuthSession        (多設備會話)
     │
     └─→ N ApiKey             (多個 API 密鑰)
```

### Organization (聚合根)

```
Organization 1 ←─── N OrgMember        (組織成員)
              │
              ├─→ N OrgInvitation      (待確認邀請)
              │
              ├─→ N AppModule          (組織下的應用)
              │
              ├─→ N CreditAccount      (組織的額度)
              │
              └─→ N Contract           (組織的合約)
```

### CreditAccount 與 CreditTransaction

```
CreditAccount 1 ←─── N CreditTransaction

每次扣除或充值都產生 Transaction 記錄。
CreditTransaction.referenceId 可連結到 API 呼叫日誌。
```

### AppModule 與 AppApiKey

```
AppModule 1 ←─── N AppApiKey

應用程式可有多個密鑰（便於輪轉）。
AppApiKey 用於 SDK 認證，不同於用戶 ApiKey。
```

---

## ValueObjects 與其用途

| ValueObject | 用途 | 特點 |
|------------|------|------|
| **Email** | 驗證郵件格式與唯一性 | 不可變、驗證規則內化 |
| **UserRole** | 用戶角色列舉 (USER, ADMIN) | 類型安全、常數化 |
| **OrgRole** | 組織角色列舉 (OWNER, ADMIN, MEMBER) | 權限基礎 |
| **OrgSlug** | 組織 URL slug | 自動生成、唯一性保證 |
| **Balance** | 額度數字 (避免浮點誤差) | 用 BigInt 表示、整數運算 |
| **TransactionType** | 交易類型列舉 | TOPUP, DEDUCTION, ... |
| **KeyStatus** | API 密鑰狀態列舉 | ACTIVE, REVOKED |
| **MemberStatus** | 成員狀態列舉 | PENDING, ACTIVE, SUSPENDED |
| **TokenClaims** | JWT 聲明內容 | 序列化/反序列化 |
| **JwtToken** | JWT 令牌 | 簽名驗證、過期檢查 |

---

## 持久化映射示例

### User → users 表

```typescript
User (Domain)              →  users (Database)
├─ id                      →  id
├─ email                   →  email (unique)
├─ hashedPassword          →  hashed_password
├─ profile                 →  (1:1 → profiles.user_id)
├─ status                  →  status
└─ createdAt              →  created_at
```

### CreditAccount → credit_accounts 表

```typescript
CreditAccount (Domain)     →  credit_accounts (Database)
├─ id                      →  id
├─ orgId                   →  org_id (FK)
├─ balance (BigInt)        →  balance (VARCHAR, 十進位字串)
├─ lowBalanceThreshold     →  low_balance_threshold (VARCHAR)
├─ status                  →  status
├─ createdAt              →  created_at
└─ updatedAt              →  updated_at
```

### CreditTransaction → credit_transactions 表

```typescript
CreditTransaction (Entity) →  credit_transactions (Database)
├─ id                      →  id
├─ creditAccountId         →  credit_account_id (FK)
├─ type (ValueObject)      →  type (enum: 'topup', 'deduction')
├─ amount (BigInt)         →  amount (VARCHAR)
├─ balanceAfter (BigInt)   →  balance_after (VARCHAR)
├─ referenceType           →  reference_type (nullable)
├─ referenceId             →  reference_id (nullable)
└─ createdAt              →  created_at
```

---

## 索引策略

```sql
-- User
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- OrgMember
CREATE INDEX idx_org_members_org_id ON org_members(org_id);
CREATE INDEX idx_org_members_user_id ON org_members(user_id);
CREATE UNIQUE INDEX idx_org_members_unique ON org_members(org_id, user_id);

-- ApiKey
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_status ON api_keys(status);

-- CreditAccount
CREATE UNIQUE INDEX idx_credit_accounts_org_id ON credit_accounts(org_id);

-- CreditTransaction
CREATE INDEX idx_credit_txns_account_id ON credit_transactions(credit_account_id);
CREATE INDEX idx_credit_txns_created_at ON credit_transactions(created_at);

-- AppModule
CREATE UNIQUE INDEX idx_app_modules_slug ON app_modules(org_id, slug);

-- Contract
CREATE UNIQUE INDEX idx_contracts_number ON contracts(contract_number);
CREATE INDEX idx_contracts_org_id ON contracts(org_id);
```

---

## 參考

- [`ddd-layered-architecture.md`](./ddd-layered-architecture.md) — 四層架構
- `src/Modules/*/Domain/Aggregates/` — 各模組 Aggregate 實現
- `src/Modules/*/Domain/ValueObjects/` — ValueObject 實現
- 遷移檔案 (`migrations/`) — 資料庫結構定義
