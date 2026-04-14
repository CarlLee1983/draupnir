# Draupnir v1 核心設計決策匯總

> 本文匯總關鍵的架構、技術與功能設計決策及其理由。  
> 詳細設計規格見 [`specs/`](./specs/)；架構全景與模組說明見 [`ARCHITECTURE_SUMMARY.md`](./ARCHITECTURE_SUMMARY.md)。

**文件版本**：v1.2  
**更新日期**：2026-04-13  
**涵蓋範圍**：Phase 1–7 主要模組的關鍵決策（含 Auth／Profile、Organization、ApiKey、Credit、Contract、Dashboard、SdkApi／CliApi、Alerts 等）

---

## 一、整體架構決策

### 1.1 技術棧選型

| 元件 | 選擇 | 理由 |
|------|------|------|
| **執行時** | Bun | 相較典型 Node.js 啟動與執行效能佳，原生 TypeScript，開發迴圈快 |
| **Web 框架** | Gravito DDD 2.0 | 內建 DDD 分層，與 gravito-impulse 等模組一致 |
| **ORM** | Drizzle | 型別安全、輕量，與 Bun 生態相容 |
| **資料庫** | PostgreSQL | ACID、JSON 支援，生產環境成熟度佳 |
| **快取** | Redis | 工作階段、用量快取、發佈／訂閱 |
| **認證** | JWT + HttpOnly Cookie | 安全與無狀態擴充性的平衡 |
| **前端** | Inertia.js + React | 後端驅動路由的 SPA 體驗，開發效率高 |

### 1.2 架構分層（DDD）

```
Presentation 層（HTTP Controller）
    ↓
Application 層（服務編排、DTO 轉換）
    ↓
Domain 層（業務邏輯、聚合、值物件、事件）
    ↓
Infrastructure 層（資料持久化、外部服務呼叫）
```

**分層規則**：

- Domain 層無向外依賴（純業務邏輯）
- Application 依賴 Domain（編排用例、呼叫 Domain／Application Service）
- Infrastructure 依賴 Domain（實作 Repository 等埠）
- Presentation 依賴 Application（呼叫 Service、對外 DTO／回應轉換）

### 1.3 多租戶隔離策略

| 決策 | 選擇 | 理由 |
|------|------|------|
| **資料隔離** | 列級隔離（Row-Level Security）+ `organization_id` 篩選 | 實作單純，適合現階段規模 |
| **使用者與組織** | 一個使用者對應一個組織 | 簡化權限模型、降低複雜度 |
| **跨租戶資料共用** | 不允許 | 降低外洩風險、強化隔離 |

---

## 二、身分與權限決策

### 2.1 RBAC 三角色模型

```
ADMIN       → 完整權限（系統管理、資料範圍內操作）
MANAGER     → 組織營運（成員管理、用量檢視、金鑰管理）
MEMBER      → 個人操作（個人檔案、個人金鑰等）
```

**理由**：符合 Draupnir 的使用者分級，避免過早引入過細的權限矩陣。

### 2.2 密碼重設流程

```
使用者請求密碼重設
  ↓
驗證信箱存在，產生 PasswordResetToken（例如 1 小時過期）
  ↓
非正式環境：可回傳 token（方便測試）
正式環境：僅回傳成功訊息（降低帳號枚舉風險）
  ↓
使用者驗證 token 並輸入新密碼
  ↓
撤銷該使用者既有 JWT（強制重新登入）
```

### 2.3 組織邀請機制

```
Admin／Manager 發起邀請
  ↓
產生含 token 的邀請連結
  ↓
未註冊使用者：走註冊流程 → 邀請連結自動關聯
已註冊使用者：點擊連結 → 直接加入組織
```

---

## 三、核心模組設計決策

### 3.1 Credit 系統（點數／餘額）

| 決策 | 選擇 | 理由 |
|------|------|------|
| **資料來源** | 自 Bifrost 同步用量 → 折算 Credit | 單一真實來源，避免重複記帳 |
| **更新頻率** | 非同步 + 排程同步 | 即時性與負載的平衡 |
| **餘額檢查** | 請求路徑上同步檢查，並輔以週期性後台驗證 | 抑制超用、降低即時查詢壓力 |
| **儲值／金流渠道** | 可階段性擴充（見 Phase 4 規格） | 先打通主流程，再擴充付費整合 |

### 3.2 API Key 模組

| 決策 | 選擇 | 理由 |
|------|------|------|
| **金鑰產生** | `crypto.randomUUID()` 等隨機來源，SHA-256 雜湊儲存 | 符合常見密鑰實務 |
| **權限粒度** | 綁定至 Bifrost Virtual Key 的 Models | 沿用 Bifrost 權限模型 |
| **撤銷方式** | 軟刪除／停用 + Bifrost 同步撤銷 | 稽核軌跡與實際失效並重 |

### 3.3 Dashboard 模組（讀聚合）

**設計決定**：不建立獨立 Domain 聚合層。

```
理由：
  ✅ 以讀取為主，無需承載複雜業務不變式
  ✅ 多資料來源聚合屬 Application／查詢職責
  ✅ 貼近 CQRS 讀側

分層：
  Application Service → 聚合邏輯（使用者／金鑰／用量等統計）
  Infrastructure Service → 資料庫查詢
  Presentation Controller → HTTP 對應
```

### 3.4 SdkApi 模組（SDK 閘道）

**設計決定**：不以獨立聚合根擴充 Domain；以用例、中介層與既有模組埠為主。

```
理由：
  ✅ 職責為驗證 AppApiKey、餘額預檢、請求轉發等閘道行為
  ✅ 核心規則仍歸屬 Credit、AppApiKey 等 bounded context
  ✅ 避免在閘道內複製領域不變式（見 module-boundaries）

分層：
  Middleware → 金鑰驗證、上下文建立
  Application／Service → 代理與編排
  Controller → HTTP 端點
```

---

## 四、Domain Events 事件驅動

### 4.1 核心事件（示例）

```typescript
// 認證相關
UserRegisteredEvent          // 使用者註冊完成
PasswordResetRequestedEvent  // 密碼重設請求
PasswordResetExecutedEvent   // 密碼重設完成

// 組織相關
OrganizationCreatedEvent     // 組織建立
MemberInvitedEvent           // 成員邀請
MemberAcceptedInviteEvent    // 成員接受邀請

// 點數相關
CreditPurchasedEvent         // 儲值／購點完成
CreditUsageDeductedEvent     // 用量扣費

// 金鑰相關
ApiKeyCreatedEvent           // 金鑰建立
ApiKeyRevokedEvent           // 金鑰撤銷
```

### 4.2 事件處理規則

```
Domain 層發佈事件（Aggregate Root）
    ↓
Application Service 訂閱／轉送（經由 Dispatcher／Handler）
    ↓
Domain／Application Event Handler：
  - 發送通知
  - 觸發外部系統呼叫
  - 更新其他聚合的關聯資料（仍經邊界與介面）
```

---

## 五、測試策略

### 5.1 最小覆蓋率目標（指引）

| 層級 | 目標覆蓋率 | 說明 |
|------|------------|------|
| Domain 層 | ≥ 85% | 不變式與規則需高覆蓋 |
| Application 層 | ≥ 80% | 編排與用例 |
| Infrastructure 層 | ≥ 75% | Repository、Adapter |
| Presentation 層 | ≥ 70% | Controller 與 HTTP 對應（依模組調整） |

實際門檻以 `bunfig.toml` 與 CI 為準。

### 5.2 測試類型

```
Unit Tests
  ├─ ValueObjects（驗證、不變式）
  ├─ Aggregates（規則、方法）
  ├─ Domain Services（跨聚合邏輯）
  └─ Utilities（Helper）

Integration Tests
  ├─ Repository（持久化）
  ├─ Application Service（流程編排）
  ├─ API Controller（端點整合）
  └─ 外部服務整合（Bifrost Client 等）

E2E Tests（Playwright）
  ├─ 註冊／登入流程
  ├─ 組織邀請流程
  ├─ API Key 建立與使用
  └─ 點數／用量相關路徑（依產品進度）
```

---

## 六、資料庫設計決策

### 6.1 表隔離原則

```
共用資料庫 + organization_id 列級隔離
  ↓
避免跨租戶任意 JOIN
  ↓
強制帶入租戶條件（例如 WHERE organization_id = $1）
```

### 6.2 關鍵表設計（概念）

**users**

```
id, email (unique), password_hash,
created_at, updated_at
```

**user_profiles**

```
id (fk users), display_name, avatar_url,
phone, bio, timezone, locale,
notification_preferences (JSON),
created_at, updated_at
```

**organizations**

```
id, name, created_by_id (fk users),
created_at, updated_at
```

**organization_members**

```
id, organization_id (fk), user_id (fk),
role (ADMIN/MANAGER/MEMBER),
joined_at, created_at, updated_at
```

**api_keys**

```
id, organization_id (fk), user_id (fk),
name, key_hash (SHA-256),
bifrost_virtual_key_id (fk Bifrost),
is_active, last_used_at,
created_at, updated_at
```

**credits**

```
id, organization_id (fk),
balance (decimal),
updated_at, synced_at
```

---

## 七、安全性決策

### 7.1 密碼儲存

```
使用 bcrypt（Gravito 慣例）
  ↓
成本因子（例如 10）平衡安全與效能
  ↓
禁止明文或可逆加密儲存
```

### 7.2 敏感資料處理

```
API Key 以雜湊儲存（SHA-256）
  ↓
密碼重設 Token 單次有效
  ↓
JWT 存取時效受控 + Refresh 機制（實際數值以實作與設定為準）
  ↓
HttpOnly Cookie（降低 XSS 竊取風險）
```

### 7.3 請求認證

```
受保護端點須具備有效 JWT（或對應閘道認證）
  ↓
權限檢查 + 租戶隔離驗證
  ↓
稽核／日誌記錄關鍵操作
```

---

## 八、效能優化決策

### 8.1 快取策略（指引）

```
使用者工作階段 → Redis（TTL 依設定）
API Key 有效性 → 記憶體／Redis 等短期快取
用量統計 → 快取 + 排程同步
組織成員列表 → Redis（TTL 依設定）
```

### 8.2 資料庫優化

```
索引：organization_id, user_id, created_at 等
分頁：預設筆數與上限依產品約定
查詢：避免 N+1；在單一租戶範圍內適度使用 JOIN
```

---

## 九、前端開發決策

### 9.1 路由策略

```
後端驅動路由（Inertia.js）
  ↓
Server-side Route Definition
  ↓
前端元件依路由組織
  ↓
無需獨立前端路由函式庫（如 react-router）作為主軸
```

### 9.2 資料流

```
Controller → Service 取得資料
  ↓
Inertia 回應（props）
  ↓
React 元件渲染
  ↓
表單提交 → POST／PUT 回傳新 props
```

---

## 十、部署與 CI／CD 決策

### 10.1 CI Pipeline（GitHub Actions，摘述）

於 `push`／`pull_request` 至 `main`、`develop` 時觸發，主要工作包括：

1. **typecheck**：`bun run typecheck`
2. **lint-format**：`bun run lint`、`bun run format:check`
3. **unit-coverage**：`bun test --coverage`（門檻見 `bunfig.toml`）
4. **migration-drift**：PostgreSQL 服務上執行 `migrate` 與 `migration:drift`
5. **routes-check**：短啟服務並跑路由不變性相關測試
6. **di-audit**：`bun run di:audit`
7. **e2e-smoke**：遷移後執行 `bun run test:e2e:smoke`（Playwright）
8. **commitlint**（僅 PR）：檢查提交訊息格式

細節以 [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) 為準。本機對應指令見 [`COMMANDS.md`](./COMMANDS.md)。

### 10.2 分支策略

```
main       → 正式／穩定分支（受保護，CI 須通過）
develop    → 開發整合分支
feature/*  → 功能分支
bugfix/*   → 修正分支
```

---

## 關鍵文件對照

| 決策類別 | 設計文件（`docs/draupnir/specs/`） |
|----------|-----------------------------------|
| Phase 2 認證 | [`1-authentication/identity-design.md`](./specs/1-authentication/identity-design.md) |
| Phase 4 點數／計費 | [`4-credit-billing/credit-system-design.md`](./specs/4-credit-billing/credit-system-design.md) |
| API 測試設計 | [`5-testing-validation/api-functional-testing.md`](./specs/5-testing-validation/api-functional-testing.md) |
| Impulse 驗證 | [`5-testing-validation/impulse-validation.md`](./specs/5-testing-validation/impulse-validation.md) |
| v1 架構審查 | [`6-architecture/v1-architecture-review.md`](./specs/6-architecture/v1-architecture-review.md) |
| v1.1 改善摘要 | [`6-architecture/v1.1-improvements-summary.md`](./specs/6-architecture/v1.1-improvements-summary.md) |

模組邊界與依賴矩陣：[`knowledge/module-boundaries.md`](./knowledge/module-boundaries.md)、[`knowledge/context-dependency-map.md`](./knowledge/context-dependency-map.md)。

---

**若需更細的規格或實作細節，請以對應 `specs/` 文件與程式碼為準。**
