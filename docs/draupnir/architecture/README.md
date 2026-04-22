# Draupnir 架構文件

本目錄包含 Draupnir 的完整架構文件和圖表。適合：
- 新成員快速上手
- 架構決策參考
- 設計評審與驗證

## 文件導航

### 🏛️ 架構概覽

| 檔案 | 內容 | 適合對象 |
|------|------|--------|
| [`ddd-layered-architecture.md`](./ddd-layered-architecture.md) | **DDD 四層架構圖** - 展現層→應用層→領域層→基礎層 | 全體 |
| [`module-dependency-map.md`](./module-dependency-map.md) | **模組依賴圖** - 15 個模組的依賴矩陣、強度分析、協調環與拆環目標 | 架構師、全棧 |
| [`entity-relationship-overview.md`](./entity-relationship-overview.md) | **ER 圖** - 以 Drizzle schema／migration 為準的 Aggregate、Entity、ValueObject 映射 | DB、後端 |
| [`auth-flow-diagrams.md`](./auth-flow-diagrams.md) | **認證流程圖** - JWT（API／Inertia Cookie）、撤銷、API Key、App Key、`/sdk/v1` 閘道 | 全體 |
| [`website-inertia-layer.md`](./website-inertia-layer.md) | **Website／Inertia 層** - `src/Website` 目錄、middleware 群組、`WebsiteServiceProvider`、與 Modules 邊界 | 全體 |
| [`data-flow-overview.md`](./data-flow-overview.md) | **資料流總覽** - Bifrost、Usage read model、Dashboard、Reports、Credit、Alerts 的單頁入口 | 新成員、全體 |
| [`bifrost-sync-data-flow.md`](./bifrost-sync-data-flow.md) | **Bifrost 用量同步資料流** - gateway → usage_records → Dashboard / Reports / Credit / Alerts | 後端、架構審閱者 |
| [`report-rendering-data-flow.md`](./report-rendering-data-flow.md) | **報表模板渲染資料流** - 釐清 token、schedule、usage read model 與 gateway 邊界 | 後端、前端、QA |
| [`http-middleware-stack.md`](./http-middleware-stack.md) | **HTTP middleware 堆疊** - Global／路由／Inertia 鏈、靜默 refresh、範例請求 | 全體 |

### 📊 UML 圖表（補全的完整設計圖集）

| 檔案 | 內容 | 優先級 | 適合對象 |
|------|------|-------|--------|
| [`uml/use-case-diagram.md`](./uml/use-case-diagram.md) | **使用案例圖** - Admin、Developer、End User 三大角色的 17 個核心用例、交互矩陣 | 🔴 高 | 產品、全體開發 |
| [`uml/sequence-diagrams.md`](./uml/sequence-diagrams.md) | **時序圖** - 6 大關鍵流程（API 計費、Bifrost 用量同步、告警評估、報表生成、邀請、合約續約）的時間序列與組件交互 | 🔴 高 | 全體開發、QA |
| [`uml/state-diagrams.md`](./uml/state-diagrams.md) | **狀態圖** - 6 大聚合根的生命週期與合法狀態轉移（User、Contract、CreditAccount、AlertConfig、Application、Organization） | 🟠 中 | 後端、Domain 設計 |
| [`uml/component-and-deployment-diagrams.md`](./uml/component-and-deployment-diagrams.md) | **元件 + 部署圖** - 系統元件細化依賴、本地／預發佈／生產三層部署拓撲、基礎設施決策 | 🟠 中 | DevOps、架構師 |
| [`uml/activity-diagrams.md`](./uml/activity-diagrams.md) | **活動圖** - 5 大複雜流程的決策分支、異常恢復、並行活動（API 請求、合約續約、邀請、告警、報表） | 🟡 低 | 流程梳理、優化 |

### 📚 知識與決策

完整的工程知識見 [`docs/draupnir/knowledge/`](../knowledge/)：

| 檔案 | 主題 |
|------|------|
| [`layer-decision-rules.md`](../knowledge/layer-decision-rules.md) | Domain/Application/Infrastructure 分層判斷規則 |
| [`domain-events.md`](../knowledge/domain-events.md) | Domain Events 實踐指南與使用方式 |
| [`ddd-aggregate-entity-value-object.md`](../knowledge/ddd-aggregate-entity-value-object.md) | Aggregate Root / Entity / Value Object |
| [`ddd-repository-infrastructure.md`](../knowledge/ddd-repository-infrastructure.md) | Repository 模式與基礎設施層設計 |

---

## 快速導覽

### 我想了解...

#### 🆕 **系統的整體結構**
👉 開始於 [`ddd-layered-architecture.md`](./ddd-layered-architecture.md)
- 四層架構圖
- 模組分層完整性與評分（**15** 個模組；與 `src/Modules/` 同步）
- 分層職責對應表

#### 🔗 **模組如何協作**
👉 開始於 [`module-dependency-map.md`](./module-dependency-map.md)
- 15 個模組的依賴全景圖與矩陣
- 依賴強度分析（低、中、高耦合度）
- **模組層協調環**（Organization → AppModule → Contract → Organization）與長期拆環方向

#### 🗄️ **資料模型**
👉 開始於 [`entity-relationship-overview.md`](./entity-relationship-overview.md)
- Aggregate Root 與 Entity（與持久化欄位以 schema／migration 為準）
- ValueObject 與驗證規則
- JWT／`auth_tokens` 撤銷模型與登入流程可對照 [`auth-flow-diagrams.md`](./auth-flow-diagrams.md)
- 索引策略

#### 🔐 **認證與授權**
👉 開始於 [`auth-flow-diagrams.md`](./auth-flow-diagrams.md)
- 用戶 JWT 認證（JSON API 與 Inertia Cookie）
- 撤銷／`auth_tokens` 雜湊追蹤
- API 密鑰認證
- 應用級密鑰與 `/sdk/v1`（SDK）
- 組織成員邀請
- 角色權限檢查

#### 📖 **如何判斷代碼應該放在哪一層**
👉 參考 [`layer-decision-rules.md`](../knowledge/layer-decision-rules.md)
- Domain 層該放什麼
- Application 層該放什麼
- Infrastructure 層該放什麼
- 判斷流程與常見反模式

#### 🎬 **如何使用 Domain Events**
👉 參考 [`domain-events.md`](../knowledge/domain-events.md)
- 事件定義
- 發佈與訂閱
- Credit 模組的事件例子
- 測試策略

#### 📊 **理解系統角色與流程**（UML 完整視角）
👉 開始於 [`uml/use-case-diagram.md`](./uml/use-case-diagram.md)
- Admin、Developer、End User 的 17 個核心用例
- 功能使用矩陣
- 系統內部流程（扣費、告警、報表）

#### ⏱️ **深入關鍵業務流程的時間序列**（時序圖）
👉 開始於 [`uml/sequence-diagrams.md`](./uml/sequence-diagrams.md)
- API 請求 → 驗證 → 轉發 → 非同步扣費（同步/非同步混合）
- Bifrost 用量同步與本地寫入
- 告警評估與多渠道通知（Email / Webhook）
- 報表生成與投遞
- 成員邀請與自動加入
- 合約續約與提醒

#### 🔄 **聚合根的生命週期與狀態轉移**（狀態圖）
👉 開始於 [`uml/state-diagrams.md`](./uml/state-diagrams.md)
- User：None → PendingEmail → Active → Deactivated → Deleted
- Contract：Draft → Active → Expiring → Expired → Renewed
- CreditAccount：Normal → LowBalance → Depleted → Locked → Suspended
- AlertConfig、Application、Organization 的狀態機

#### 🏗️ **系統部署與基礎設施決策**（元件 + 部署圖）
👉 開始於 [`uml/component-and-deployment-diagrams.md`](./uml/component-and-deployment-diagrams.md)
- 本地開發、Staging、Production 三層部署拓撲
- 元件級細化依賴（以 Credit 模組為例）
- 跨模組 Port 依賴
- 環境變數管理與部署清單

#### 🎬 **複雜業務流程的決策與並行活動**（活動圖）
👉 開始於 [`uml/activity-diagrams.md`](./uml/activity-diagrams.md)
- API 請求的驗證、轉發、非同步扣費（含異常分支）
- 合約續約的審批與選項
- 邀請流程的郵箱驗證與邊界情況
- 告警觸發的去重與並行通知
- 報表生成與並行投遞

#### 📄 **報表模板的資料來源與 gateway 邊界**
👉 開始於 [`report-rendering-data-flow.md`](./report-rendering-data-flow.md)
- token 驗證與 schedule live lookup
- usage read model 與 gateway 的分層
- 前端模板純 render 與 snapshot 生成邊界

#### 🔄 **Bifrost 用量同步如何落到本地 read model**
👉 開始於 [`bifrost-sync-data-flow.md`](./bifrost-sync-data-flow.md)
- cron 排程與 gateway 抓取
- `usage_records` / `quarantined_logs` / `sync_cursors`
- 同步完成事件如何銜接 Credit / Alerts / Reports

#### 🧭 **一頁式資料流總覽**
👉 開始於 [`data-flow-overview.md`](./data-flow-overview.md)
- 快速理解 gateway / sync / read model / report 的分工
- 適合 onboarding 與架構導覽第一站

---

## 核心設計決策

### ✅ DDD 四層分層

所有模組遵循嚴格的 DDD 分層：

```
Presentation (Controllers)
    ↓ 依賴
Application (Services)
    ↓ 依賴
Domain (Business Rules)
    ↓ 依賴
Infrastructure (Persistence)
```

**13/15 模組完整四層** — **Dashboard**、**SdkApi** 為讀模型／閘道，無獨立領域聚合；**Alerts**、**Reports** 具完整 Domain／Application／Infrastructure／Presentation

### ✅ Framework 無耦合

所有模組完全解耦 Gravito 框架：

```typescript
// ❌ 禁止
import { Controller } from '@gravito/core'

// ✅ 正確
import type { IHttpContext } from '@/Shared/Framework/IHttpContext'
```

ORM 可切換：`memory` (測試) / `drizzle` / `atlas`

### ✅ Repository 模式

Domain 層定義介面，Infrastructure 層實現：

```typescript
// Domain
export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>
  save(user: User): Promise<void>
}

// Infrastructure
export class UserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    // 使用 IDatabaseAccess，無直接 ORM 依賴
  }
}
```

### ✅ ValueObject 驗證

複雜型別使用 ValueObject，將驗證規則內化：

```typescript
// Balance ValueObject - 用 BigInt 避免浮點誤差
const balance = Balance.fromString('99.99')
balance.add('0.01')  // 返回新 Balance，不可變

// Email ValueObject - 驗證格式
const email = Email.create('user@example.com')
// 若格式不對，在建立時拋出例外
```

### ✅ 不可變性模式

Aggregate 狀態變更總是返回新實例：

```typescript
// 不好：mutation
account.balance = 100

// 好：不可變
const updated = account.applyDeduction('10')
return updated
```

### ✅ Domain Events

重要業務事件發佈至 EventBus，支援跨模組解耦：

```typescript
// 在 Service 中發佈
await DomainEventDispatcher.getInstance().dispatch(
  new CreditDeductedEvent(...)
)

// 在其他模組訂閱
dispatcher.on('CreditDeductedEvent', async (event) => {
  await auditLog.record(event)
})
```

---

## 15 個模組清單

分組與 [`module-dependency-map.md`](./module-dependency-map.md) 一致。**評分**欄為 2026-04-09 V1 架構評審（13 模組）；**Alerts**、**Reports** 為後續模組，分數欄標「—」。

### 領域與平台 (10)

| 模組 | 職責 | DDD 四層 | 評分 |
|------|------|----------|------|
| **Profile** | 用戶身份 & 個人資料 | ✅ | 9.2 |
| **Organization** | 組織 & 成員 & 邀請 | ✅ | 9.0 |
| **Auth** | JWT 認證 & 會話／撤銷 | ✅ | 8.5 |
| **ApiKey** | 用戶級 API 密鑰 | ✅ | 8.8 |
| **Credit** | 額度購買 & 使用 & 過期 | ✅ | 9.0 |
| **Contract** | 合約管理 | ✅ | 8.6 |
| **AppModule** | 應用程式／模組訂閱開通 | ✅ | 8.6 |
| **AppApiKey** | 應用級密鑰 | ✅ | 8.6 |
| **Health** | 健康檢查 & 依賴探針 | ✅ | 8.9 |
| **Dashboard** | 儀表讀模型；對外暴露 `IUsageRepository`（如 Alerts） | △ | 8.0 |

### API 閘道與週邊 (5)

| 模組 | 職責 | DDD 四層 | 評分 |
|------|------|----------|------|
| **CliApi** | CLI 裝置流／命令代理 | ✅ | 8.4 |
| **SdkApi** | `/sdk/v1` 閘道（App API Key + Credit） | ❌ | 7.6 |
| **DevPortal** | 開發者入口 | ✅ | 8.5 |
| **Alerts** | 閾值／Webhook／預算告警 | ✅ | — |
| **Reports** | 排程報表 PDF／寄信 | ✅ | — |

**V1 整體評分：8.2/10**（13 模組歷史盤點）| **四層目錄：14/15** — 僅 **SdkApi** 無 `Domain/`；**Dashboard** 為薄 Domain（`BifrostSyncCompletedEvent`）

---

## 架構驗證檢查清單

### ✅ 已驗證

- [x] **無 TypeScript 型別錯誤** — Strict mode
- [x] **無 Lint 錯誤** — Biome
- [x] **測試覆蓋率 ≥ 80%** — 99.3% 通過（歷史基線；以 CI 為準）
- [x] **依賴可文檔化** — 見 [`module-dependency-map.md`](./module-dependency-map.md)；主幹路徑無回到閘道模組的環
- [x] **框架無耦合** — IDatabaseAccess 隔離層
- [x] **層級隔離** — 無跨層級逆向依賴
- [x] **功能完整** — 100% 規劃功能已實現

### ⚠️ 需留意

- **模組層協調環** — `Organization → AppModule → Contract → Organization`（靜態 import）；啟動依 DI 順序／延遲解析；長期可上移埠或改事件驅動開通（見依賴圖）
- **SdkApi** 無 `Domain/` — 認證／用量閘道；**Dashboard** 以讀模型為主，Domain 僅同步完成事件（見 [`ddd-layered-architecture.md`](./ddd-layered-architecture.md)）
- Domain Events 架構 — 已實現，可根據需要補充

---

## 設計模式索引

| 模式 | 檔案 | 用途 |
|------|------|------|
| **Aggregate Root** | `ddd-layered-architecture.md` | 業務聚合邊界 |
| **Repository** | `entity-relationship-overview.md` | 持久化抽象 |
| **Value Object** | `entity-relationship-overview.md` | 領域值驗證 |
| **Domain Event** | [`domain-events.md`](../knowledge/domain-events.md) | 事件驅動、跨模組解耦 |
| **Service** | `layer-decision-rules.md` | 用例編排 |
| **DTO** | `ddd-layered-architecture.md` | 層級間轉換 |

---

## 常見問題

### Q: 我想新增一個模組，應該如何開始？

A: 參考 [`ddd-layered-architecture.md`](./ddd-layered-architecture.md)，確保：
1. 有明確的 Aggregate Root (若無，見 [`layer-decision-rules.md`](../knowledge/layer-decision-rules.md))
2. 依賴只向下游 (Domain → Infrastructure)
3. 提供 `index.ts` 公開 API
4. 在 `src/wiring/` 註冊 ServiceProvider

### Q: Domain Events 何時使用？

A: 見 [`domain-events.md`](../knowledge/domain-events.md)
- ✅ 當多個模組需要反應同一事件
- ✅ 當需要審計日誌或事件溯源
- ❌ 當只是單一模組內的邏輯轉移

### Q: Dashboard 的 Domain 層算完整嗎？

A: 見 [`ddd-layered-architecture.md`](./ddd-layered-architecture.md) 與 [`layer-decision-rules.md`](../knowledge/layer-decision-rules.md)
- 儀表以讀模型／彙總為主，**無**典型 Aggregate 與不變式
- 程式上已有極薄 `Domain/`（例如 `BifrostSyncCompletedEvent`），分層表以 **△** 標示
- 整體仍符合「讀側／CQRS」取向；與 **SdkApi**（完全無 `Domain/`）不同

### Q: 如何決定一段邏輯該放在哪一層？

A: 見 [`layer-decision-rules.md`](../knowledge/layer-decision-rules.md) 的「判斷流程」
- 值驗證？→ ValueObject (Domain)
- 狀態轉換？→ Aggregate (Domain)
- 用例編排？→ Service (Application)
- 持久化？→ Repository (Infrastructure)

---

## 相關文件

### 規劃與設計

- `docs/draupnir/specs/` — 功能規格
- [`Website 資料夾架構設計`](../specs/2026-04-14-website-folder-architecture-design.md) — `src/Pages` → `src/Website` 遷移對照；**現行實作**見 [`website-inertia-layer.md`](./website-inertia-layer.md)
- `docs/draupnir/plans/` — 實作計畫
- `docs/draupnir/knowledge/` — 工程知識

### 程式碼

- `src/Modules/` — 15 個模組實現
- `src/Shared/` — 跨模組共享程式碼
- `src/wiring/` — 模組註冊與 DI
- [`website-inertia-layer.md`](./website-inertia-layer.md) — `src/Website/` Inertia 呈現層

### 驗證與評審

- [`../specs/2026-04-09-v1-architecture-review.md`](../specs/2026-04-09-v1-architecture-review.md) — V1 架構評審
- [`../reviews/2026-04-09-v1-verification-checklist.md`](../reviews/2026-04-09-v1-verification-checklist.md) — 驗證清單（歷史版本）

---

**最後更新**：2026-04-13  
**評審狀態**：✅ V1 架構評審完成（8.2/10，13 模組）；本頁已同步 **15 模組** 與 [`module-dependency-map.md`](./module-dependency-map.md) 中的依賴現況
