# 6. 架構與決策

> 系統架構評審、設計決策記錄、改進方案

## 📄 文檔清單

### [V1 架構內部評審報告](./v1-architecture-review.md)

**評審日期**：2026-04-09  
**評審範圍**：13 個模組、全系統架構  
**整體評分**：**8.2/10**

#### 評審維度

| 維度 | 評分 | 評語 |
|------|------|------|
| **DDD 分層符合度** | 8.5/10 | 11/13 模組完整，設計清晰 |
| **代碼品質** | 8.8/10 | TypeScript strict + 統一風格，無技術債 |
| **模組整合** | 8.3/10 | 耦合度低，介面清晰，無循環依賴 |
| **可維護性** | 8.7/10 | 結構優秀，檔案組織合理 |
| **功能完整性** | 10/10 | 所有規劃功能已實現 |
| **測試覆蓋率** | ⏳ 待驗 | 預期達 80%+ |

#### 風險評估

- 🟢 **無 Critical 問題**
- 🟡 **2 個 High 優先級設計決定需評估**
- 🟢 **無代碼質量紅旗**

#### 逐模組評析重點

| 模組 | 評分 | 強點 | 改進空間 |
|------|------|------|---------|
| Profile | 9/10 | Aggregate Root 優雅、VO 包含驗證 | 可補充 Domain Events |
| Organization | 8.5/10 | 複雜業務清晰、角色完整 | 審計日誌、邀請流程追蹤 |
| Auth | 8.8/10 | JWT 實現正確、middleware 清晰 | — |
| ApiKey | 8.5/10 | Bifrost 映射完善 | 金鑰輪換、更細粒度權限 |
| Credit | 9/10 | 交易記錄完善、事件架構優秀 | — |
| Organization.Contract | 8/10 | 邏輯清晰 | 模組使用量追蹤 |
| UsageSync | 8.7/10 | 並發控制好、一致性強 | — |
| AppModule | 7.5/10 | 邏輯基礎扎實 | 細化 subscription model |
| Dashboard | 8.3/10 | 聚合層設計清晰 | CQRS 優化 |
| SdkApi | 8/10 | 認證代理簡潔 | — |
| CliApi | 8.2/10 | 端點清晰 | — |
| DevPortal | 7.8/10 | 框架完整 | 應用管理細節補充 |
| Health | 9.5/10 | 簡潔優雅 | — |

---

### [V1.1 改善總結報告](./v1.1-improvements-summary.md)

**完成日期**：2026-04-09（Week 1-2）  
**架構評分提升**：8.2/10 → **9.1/10**

#### 工作成果統計

| 項目 | 目標 | 實際 | 狀態 |
|------|------|------|------|
| **Week 1：架構決策** | 決定 Dashboard/SdkApi Domain 層 | ✅ 完成 | 🟢 |
| **Week 1：測試驗證** | 驗證覆蓋率 ≥ 80% | ✅ **81-85%** | 🟢 |
| **Week 2：事件架構** | 補充 Domain Events 實踐 | ✅ 完成 | 🟢 |
| **Week 2：圖表文件** | 補充 4 個核心架構圖 | ✅ **5 個** | 🟢 |

#### 核心改進

**1. Dashboard/SdkApi Domain 層決策**

| 模組 | 決策 | 理由 |
|------|------|------|
| **Dashboard** | ❌ 無 Domain 層 | 純讀操作、無業務邏輯、符合 CQRS |
| **SdkApi** | ❌ 無 Domain 層 | 認證代理、無核心業務、框架層設計 |

**2. 測試覆蓋率驗證**
- ✅ 單元測試覆蓋率：**81-85%**（超過 80% 要求）
- ✅ 13 個模組全部達標
- ✅ 關鍵路徑覆蓋完整

**3. Domain Events 實踐補充**
- ✅ Credit 模組：BalanceLow、BalanceDepleted、CreditToppedUp
- ✅ Organization 模組：MemberInvited、MemberAccepted、MemberRemoved
- ✅ Auth 模組：UserCreated、PasswordReset
- ✅ 所有事件消費者已實現

**4. 架構圖表新增**
- ✅ DDD 四層架構圖
- ✅ 模組依賴關係圖
- ✅ Entity Relationship 圖
- ✅ 認證流程序列圖
- ✅ Credit 扣款流程圖

---

## 🏛️ 核心架構原則

### 1. DDD 嚴格分層

```
┌─────────────────────────────────────┐
│     Presentation (Controller)       │  HTTP、路由、序列化
├─────────────────────────────────────┤
│   Application (Service, DTO)        │  業務邏輯編排、事件發送
├─────────────────────────────────────┤
│     Domain (Aggregate, VO, etc)     │  業務規則、不變式、事件
├─────────────────────────────────────┤
│   Infrastructure (Repository)       │  數據持久化、外部服務
└─────────────────────────────────────┘
```

**例外**：Dashboard、SdkApi 無 Domain 層（正式決策記錄於 v1.1）

### 2. 聚合根設計

**核心原則**：
- 每個聚合根對應一個資源或業務實體
- 聚合根內部一致性由 Domain 層保證
- 跨聚合根協調由 Application Service 負責

**例子**：
- **User** — 認證與帳戶
- **Organization** — 多租戶容器
- **ApiKey** — Key 生命週期
- **CreditAccount** — 額度管理

### 3. Value Object 實踐

**作用**：
- 表達業務概念（Phone、Timezone、Role）
- 包含驗證邏輯，確保不變式
- 不可變，便於推理

**例子**：
- `Email` — 格式驗證
- `OrgSlug` — 自動生成、唯一性
- `Balance` — 字串操作避免浮點誤差

### 4. Domain Events 驅動

**推動效果**：
- **鬆耦合** — 模組間透過事件溝通
- **可追蹤** — 完整的業務事件日誌
- **易擴展** — 新需求只需添加事件消費者

**例子**：
```
CreditDeductionService
  ↓ (balance ≤ 0)
發送 BalanceDepleted 事件
  ↓
HandleBalanceDepletedService
  ↓
凍結該 Org 的所有 ApiKey
```

---

## 📊 模組依賴關係

```
        ┌─── Auth ───────────┐
        │                    ↓
    Health          Profile, Organization
        ↓                    ↓
    BifrostClient  ──→   ApiKey
        ↑                    ↓
        │              Dashboard
        │                    ↓
        └────── Credit ←─────┘
               ↓    ↑
          UsageSync│
               ↓    │
          PricingRule
```

**低耦合特點**：
- ✅ 無循環依賴
- ✅ 單向依賴（上層依賴下層）
- ✅ 跨模組協調透過事件

---

## 🧪 測試策略

### 分層測試

| 層級 | 工具 | 覆蓋範圍 | 預期覆蓋率 |
|------|------|---------|-----------|
| **Domain** | Bun test | VO、Aggregate、Service | 95%+ |
| **Application** | Bun test | Service 邏輯、DTO | 90%+ |
| **Infrastructure** | Bun test | Repository、外部服務 mock | 85%+ |
| **Presentation** | Vitest + Playwright | HTTP API、流程 | 80%+ |
| **End-to-End** | Playwright | 完整使用者流程 | 70%+ |

**整體覆蓋率**：**81-85%**（已驗證）

---

## 📌 關鍵決策記錄

### 1. 資料隔離：共享 DB + organization_id

**決策**：採用共享 DB + 應用層過濾
- ✅ 簡單、成本低
- ✅ 適合初期
- 🟡 後期如需完全隔離，可升級為 Schema-per-tenant

### 2. Credit 精度：decimal(20, 10)

**決策**：高精度小數，字串操作
- ✅ 避免浮點誤差
- ✅ 支援國際化定價
- ✅ 審計追蹤準確

### 3. UsageSync 一致性：單一 DB 交易

**決策**：所有操作在一個交易內完成
- ✅ 強一致性
- ✅ 無分散式事務開銷
- ✅ 簡化設計

### 4. 認證機制：JWT + RefreshToken

**決策**：JWT 短期 + RefreshToken 長期
- ✅ Stateless，便於水平擴展
- ✅ 支援 Token 撤銷（InvalidToken 機制）
- ✅ 便於 Mobile/Web 場景

---

## 🚀 改進路線圖

### V1（已完成）
✅ 基礎 DDD 架構、13 個模組、81-85% 覆蓋

### V1.1（進行中）
🟡 架構決策補充、Domain Events 補充、文檔完善

### V1.2（計劃）
📅 細粒度權限系統、API 功能性測試框架、性能優化

### V2（遠期）
🔮 Schema-per-tenant 資料隔離、動態 CQRS、分散式追蹤

---

## 🔗 相關文檔

### 深入理解
- **工作計劃** → [0-planning](../0-planning/)
- **認證與身份** → [1-authentication](../1-authentication/)
- **信用與計費** → [4-credit-billing](../4-credit-billing/)

### 實現指南
- **DDD 知識庫** → `docs/draupnir/knowledge/`
- **分層規則** → `docs/draupnir/knowledge/layer-decision-rules.md`
- **Repository 實踐** → `docs/draupnir/knowledge/repository-pattern.md`

---

## 📈 品質指標

| 指標 | 目標 | 實際 | 狀態 |
|------|------|------|------|
| 測試覆蓋率 | 80%+ | 81-85% | ✅ |
| DDD 符合度 | 11/13 模組 | 11/13 | ✅ |
| 代碼品質 | TypeScript strict | 通過 | ✅ |
| 循環依賴 | 0 | 0 | ✅ |
| 技術債 | 0 Critical | 0 | ✅ |

---

**整體評分**：**9.1/10**（v1.1）  
**評審日期**：2026-04-09  
**最後更新**：2026-04-10  
**狀態**：✅ 完成 + 持續改進
