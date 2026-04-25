# 模組依賴圖

本頁依 `src/Modules/*` 的 `@/Modules/...` 引用與 `src/bootstrap.ts` 內各模組 `*ServiceProvider` 註冊順序整理，反映**目前程式碼**的模組邊界（非理想目標架構）。

## 15 模組全景圖

```
                          ┌─────────────────────────────┐
                          │  Shared (+ Foundation)      │
                          │  基礎設施、埠、共用中介層   │
                          └─────────────────────────────┘
                                       ↑
                                       │ 全模組共用
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
   ┌─────────┐    註冊與網域寫入      ┌─────────┐    Org 權限／成員    │
   │ Auth    │ ←──────────────────→  │ Profile │                      │
   │ 認證    │    (Presentation 層   │ 用戶    │                      │
   └─────────┘     互相注入型別)    └─────────┘                      │
        │                              │                              │
        │                              └──────────────┬───────────────┘
        │                                             │
        │                    ┌──────────────────────────┴──────────────────────────┐
        │                    │  Organization（組織、邀請、OrgAuthorizationHelper）│
        │                    └──────────────────────────┬──────────────────────────┘
        │                              │                │
        │              ┌───────────────┼───────────────┼───────────────┐
        │              │               │               │               │
        │         ┌─────────┐    ┌─────────┐    ┌───────────┐    ┌─────────┐
        │         │ ApiKey  │    │ Credit  │    │ Contract  │    │ AppModule│
        │         │ 用戶密鑰│    │ 額度    │    │ 合約      │    │ 應用目錄 │
        │         └────┬────┘    └────┬────┘    └─────┬─────┘    └────┬────┘
        │              │              │               │               │
        │              │              │               └───────┬───────┘
        │              │              │           ⚠ 模組層協調環（見下文）
        │              └──────┬───────┘                       │
        │                     │                               │
        │                ┌────┴────┐                     ┌─────┴─────┐
        │                │Dashboard│ ← IUsageRepository │  Alerts   │
        │                │讀模型   │ ────────────────────│ 閾值／Webhook│
        │                └─────────┘                     └───────────┘
        │
        ├── CliApi（裝置碼／CLI 代理，依賴 Auth token 服務）
        │
        └── 多數路由：Auth RoleMiddleware

┌─────────┐     ┌───────────┐     ┌──────────┐
│ Health  │     │ AppApiKey │ ←── │ DevPortal │（Organization + AppApiKey 服務）
│ 健康檢查│     │ 應用密鑰  │     │ 開發者入口│
└─────────┘     └─────┬─────┘     └──────────┘
                      │
                      ▼
               ┌──────────┐
               │  SdkApi  │（App API Key + Credit 餘額／用量閘道）
               └──────────┘

┌──────────┐
│ Reports  │  Shared／Foundation／排程；另：`OrganizationMiddleware`、
│          │  `Dashboard` 的 `IUsageRepository`（報表快照用量）
└──────────┘
```

## 詳細依賴矩陣

下表「依賴」列出**跨模組**的 `import`（不含僅 Shared／Foundation）。「被依賴」為其他模組引用該模組之情形（含 Presentation 中介層、Domain 埠）。

### 領域與平台（10）

| 模組 | 依賴 | 被依賴 | 性質 |
|------|------|--------|------|
| **Profile** | Shared, Auth | Auth | 用戶資料；Controller 注入 Auth 後台服務 |
| **Organization** | Shared, AppModule, Auth | ApiKey, Credit, Dashboard, Contract, AppApiKey, DevPortal, Alerts, Reports | 組織與成員；建立組織時呼叫 AppModule 預設開通 |
| **Auth** | Shared, Profile | Profile, Organization, ApiKey, Dashboard, Contract, AppModule, AppApiKey, Credit, DevPortal, CliApi 等（路由／服務） | 認證與 JWT |
| **ApiKey** | Shared, Organization, Auth | Credit, Dashboard, Alerts | 用戶 API Key；Org 權限校驗 |
| **Credit** | Shared, ApiKey, Organization, Auth | SdkApi | 額度帳戶；部分流程讀 ApiKey |
| **Contract** | Shared, Organization, Auth | AppModule | 合約；授權用 OrgAuthorizationHelper |
| **AppModule** | Shared, Contract, Auth | Organization | 模組訂閱與開通；CheckModuleAccess 讀 Contract |
| **AppApiKey** | Shared, Organization, Auth | SdkApi, DevPortal | 應用密鑰 |
| **Health** | Shared | — | 健康檢查 |
| **Dashboard** | Shared, ApiKey, Organization, Auth | Alerts, Reports | 儀表與用量埠（Alerts／Reports 依 `IUsageRepository`） |

### API 閘道與週邊（5）

| 模組 | 依賴 | 被依賴 | 性質 |
|------|------|--------|------|
| **CliApi** | Shared, Auth | — | CLI 裝置流／代理 |
| **SdkApi** | Shared, AppApiKey, Credit | — | `/sdk/v1` 閘道 |
| **DevPortal** | Shared, Organization, AppApiKey, Auth | — | 開發者入口 |
| **Alerts** | Shared, ApiKey, Auth, Dashboard（埠）, Organization | — | 告警與 Webhook |
| **Reports** | Shared／Foundation（排程、郵件）、Dashboard（`IUsageRepository`）、Organization（路由 `OrganizationMiddleware`） | — | 排程報表 PDF／寄信 |

## 依賴關係規則

### ✅ 允許的依賴

1. **垂直依賴**（層級下行）
   ```
   Presentation → Application → Domain
                                  ↓
                           Infrastructure
   ```

2. **橫向依賴**（同層模組間 — 宜縮小範圍）
   ```
   Auth ↔ Profile（目前 Presentation 互相使用型別／服務）
   ```

3. **上升到 Shared**（所有層）
   ```
   所有模組 → Shared（與 Foundation 埠）
   ```

4. **跨模組僅透過埠／應用服務**
   ```
   Alerts／Reports → Dashboard 的 IUsageRepository（埠）✅
   ```

### ❌ 禁止的依賴（目標）

1. **逆向層級**
   ```
   ❌ Domain → Application
   ❌ Application → Presentation
   ❌ Infrastructure → Domain
   ```

2. **模組間循環**（目標為無環；現況見下節）
   ```
   ❌ Module A → Module B → Module A
   ```

3. **跨模組直接耦合對方 Aggregate**
   ```
   ❌ 在模組 A 內 new 模組 B 的 Aggregate 做業務決策
   ✅ 經由 Repository 介面或 Application Service
   ```

## 模組依賴強度分析

### 低耦合

- **Health** — 不引用其他 `Modules`。
- **Reports** — 核心仍為排程／郵件；跨模組僅路由層 `OrganizationMiddleware` 與快照用的 Dashboard `IUsageRepository`。

### 中耦合

- **ApiKey / Credit** — 透過 Organization 做授權；Credit 部分流程讀 ApiKey。
- **CliApi / SdkApi** — 閘道型，依賴少而明確。
- **Dashboard** — 讀模型，向外暴露 `IUsageRepository` 供 Alerts、Reports 使用。

### 高耦合／協調熱點

- **Auth** — 全站路由與多服務的 token／使用者埠。
- **Organization** — `OrgAuthorizationHelper` 被多模組使用；並依賴 **AppModule** 完成開通流程。
- **AppModule ↔ Contract ↔ Organization** — 形成**模組層協調環**（見下）。
- **Alerts** — 聚合 ApiKey、Auth、Organization 與 Dashboard 用量埠。

### 讀取與閘道層

- **Dashboard** — 無獨立業務狀態，以查詢與同步為主。
- **CliApi / SdkApi** — 請求代理與金鑰閘道。

## 循環依賴檢查

### ⚠️ 現況：模組層協調環

下列**靜態 import** 形成有向環（啟動時靠 DI 註冊順序與延遲解析支撐）：

```
Organization → AppModule → Contract → Organization
```

- **Organization** 使用 `ProvisionOrganizationDefaultsService`（AppModule）。
- **AppModule** 使用 Contract 的儲存庫與 `ContractEnforcementService`。
- **Contract** 使用 `OrgAuthorizationHelper`（Organization Application）。

**目標**：長期可透過抽出共用埠（例如「組織開通」介面置於 Shared/Foundation）、或事件驅動開通，拆環。

### 其他路徑（無環）

- **SdkApi → AppApiKey →（僅 Organization／Auth）** — 未回到 SdkApi。
- **Credit → ApiKey → Organization** — 未回到 Credit。

## 模組邊界清晰度評分

| 維度 | 評分 | 說明 |
|------|------|------|
| **API 隔離** | 9/10 | 各模組具 `index.ts` 公開介面 |
| **無內部曝露** | 8/10 | 仍以埠型別為主；少數測試直接引用 Infrastructure |
| **依賴清晰度** | 7.5/10 | 主幹清楚；存在 Org–AppModule–Contract 環與 Auth↔Profile 雙向 |
| **可替換性** | 7.5/10 | DI 可替換實作；協調環增加替換成本 |

---

## 新增模組時的依賴檢查清單

當添加新模組時，確保：

- [ ] 只依賴 Shared／Foundation 與既有模組，且優先依賴**埠／介面**
- [ ] 不引入新的模組層循環；若必須協調，考慮事件或上移埠
- [ ] 提供清晰的公開 API（`index.ts`）
- [ ] 跨模組不直接暴露對方 Domain 實作細節
- [ ] 在對應 `*ServiceProvider` 與 `src/bootstrap.ts` 的 `modules` 陣列註冊（順序影響 DI／路由註冊）

---

## 參考

- [`layer-decision-rules.md`](../knowledge/layer-decision-rules.md) — 分層判斷
- [`ddd-layered-architecture.md`](./ddd-layered-architecture.md) — 四層架構
- [`module-boundaries.md`](../knowledge/module-boundaries.md) — 邊界約定
- `src/Modules/*/index.ts` — 各模組公開 API
- `src/bootstrap.ts` — 模組 `*ServiceProvider` 註冊順序與 `registerRoutes` 組裝
