# 3. API 金鑰管理

> 虛擬金鑰、應用層級金鑰、權限與配額

## 📋 概述

Draupnir 支援兩類 API Key：

1. **用戶個人 Key**（Phase 3）— 用戶於組織內建立與管理的 Key，與 Bifrost Virtual Key 同步（程式中常以 **gateway**／`gatewayKeyId` 表示）
2. **應用層級 Key**（Phase 6）— 供 SDK／CLI／第三方使用的 **App API Key**（格式如 `drp_app_…`），由組織管理者配發

---

## 🏗️ Phase 3：Key Management — 用戶個人 Key

### 規格來源

詳細設計位於 [0-planning 工作計劃中的 Phase 3 章節](../0-planning/draupnir-v1-workplan.md#phase-3key-management--api-key-管理)

### 核心功能

#### 3.1 ApiKey 模組

| 功能 | 說明 |
|------|------|
| **Key 建立** | 於 Bifrost 註冊 Virtual Key；本地存 `keyHash` 與 `gatewayKeyId`；建立時回傳可作 Bearer 的 gateway secret |
| **Key 列表** | 組織範圍列表（分頁與依指派成員篩選等，見 `IApiKeyRepository`） |
| **Key 撤銷** | `revoke` 並同步網關 |
| **Key 標籤** | 更新顯示名稱（`label`） |
| **權限設定** | 模型白名單、速率限制；可選 Bifrost budget／quota（見 `SetKeyPermissionsService` 等） |
| **成員指派** | 可將 Key 指派給組織成員（Member portal 可視度） |
| **使用統計** | 與 Dashboard／Bifrost 用量資料連動 |

#### 3.2 Dashboard 資料聚合

路由前綴為 **`/api/organizations/:orgId`**，並需具備 `dashboard` 模組權限（`ModuleAccessMiddleware`）。

| 方法與路徑 | 說明 |
|------------|------|
| `GET .../dashboard` | 儀表板摘要 |
| `GET .../dashboard/usage` | 用量圖表／時間序列 |
| `GET .../dashboard/kpi-summary` | KPI 摘要 |
| `GET .../dashboard/cost-trends` | 費用趨勢 |
| `GET .../dashboard/model-comparison` | 模型對比 |
| `GET .../dashboard/per-key-cost` | 依 Key 成本 |

管理員補同步：`POST /api/dashboard/bifrost-sync/backfill`（見 `dashboard.routes.ts`）。

> 舊版文件中的 `GET /api/org/{orgId}/...`、`usage-chart`／`cost-summary` 等路徑已廢棄；請以上表為準。

### 📊 核心資料模型（與實作對齊之摘要）

```
ApiKey Aggregate
├── id (UUID)
├── orgId (UUID)
├── createdByUserId (UUID)
├── label — 顯示名稱（KeyLabel）
├── keyHash — 本地驗證用（KeyHash）
├── gatewayKeyId — Bifrost Virtual Key 識別
├── gatewayKeyValue — 建立流程可暫存／可為 null
├── status — KeyStatus（active／suspended／revoked 等）
├── scope — KeyScope（模型、速率等）
├── quotaAllocated — 可選配額
├── assignedMemberId — 可選，指派成員
├── suspensionReason / preFreezeRateLimit / suspendedAt — 與信用凍結聯動
├── expiresAt / revokedAt
├── createdAt / updatedAt
```

### ✅ 實現狀態

- ✅ ApiKey 建立、列表、撤銷、標籤、權限（含 Bifrost 同步）
- ✅ 成員指派與組織維度查詢
- ✅ 餘額不足等情境之凍結／解凍聯動（Credit 模組）
- ✅ Dashboard 聚合 API（見上表）

### 驗收標準（Phase 3）

- [x] 用戶可建立 Key，並與 Bifrost Virtual Key 對應
- [x] Key 列表正確，支援組織範圍查詢
- [x] 可撤銷 Key 並更新權限／標籤
- [x] Key 使用量與 Dashboard 聚合可取得
- [x] 餘額不足時可自動凍結相關 Key

---

## 🎯 Phase 6.1：Application API Key — 應用層級 Key

### 規格來源

詳細設計位於 [0-planning 工作計劃中的 Phase 6.1 章節](../0-planning/draupnir-v1-workplan.md#61-application-api-key)

### 核心功能

| 功能 | 說明 |
|------|------|
| **Key 配發** | `IssueAppKeyService`；`POST /api/organizations/:orgId/app-keys` |
| **列表** | `GET /api/organizations/:orgId/app-keys` |
| **輪換** | `RotateAppKeyService`；`POST /api/app-keys/:keyId/rotate`（寬限期見領域欄位） |
| **撤銷** | `POST /api/app-keys/:keyId/revoke` |
| **Scope 與模組綁定** | `PUT /api/app-keys/:keyId/scope` — 更新 `AppKeyScope` 與 `BoundModules` |
| **用量查詢** | `GET /api/app-keys/:keyId/usage`（`GetAppKeyUsageService`） |
| **網關同步** | `AppKeyBifrostSync` |

### 📊 核心資料模型（與實作對齊之摘要）

```
AppApiKey Aggregate
├── id (UUID)
├── orgId (UUID)
├── issuedByUserId (UUID)
├── label (KeyLabel)
├── keyHash (KeyHash)
├── gatewayKeyId — Bifrost Virtual Key
├── status (KeyStatus)
├── scope (AppKeyScope) — READ / WRITE / ADMIN 等
├── rotationPolicy — 輪換策略
├── boundModules (BoundModules) — 綁定模組 ID
├── previousKeyHash / previousGatewayKeyId / gracePeriodEndsAt — 輪換寬限期
├── expiresAt / revokedAt
└── createdAt / updatedAt
```

### 📍 實現進度

| 項目 | 狀態 |
|------|------|
| AppApiKey 配發／列表／撤銷 | ✅ |
| 輪換（含寬限期欄位）與 `SetAppKeyScope` | ✅ |
| `BoundModules` 與 SdkApi 認證 | ✅ |
| `GetAppKeyUsage` | ✅ |
| **各類 Key／模組維度之用量獨立歸屬與計費隔離** | ⏳ 與 Phase 5「模組用量」同屬產品與資料模型待議（見工作計劃） |
| 測試覆蓋率門檻 | 持續對齊 `bunfig.toml` 與 CI |

---

## 🔗 相關文檔與模組

### 相關規格
- **Phase 3 完整設計** → [0-planning/Phase 3](../0-planning/draupnir-v1-workplan.md#phase-3key-management--api-key-管理)
- **Phase 6 完整設計** → [0-planning/Phase 6](../0-planning/draupnir-v1-workplan.md#phase-6application-distribution--應用分發與-sdk)
- **信用系統與餘額阻擋** → [4-credit-billing](../4-credit-billing/)

### 實現模組位置

```
src/Modules/
├── ApiKey/                          # Phase 3 組織／用戶 Key
│   ├── Domain/Aggregates/ApiKey
│   ├── Application/Services/
│   ├── Infrastructure/
│   ├── Presentation/
│   │   ├── Controllers/ApiKeyController
│   │   └── Routes/apikey.routes.ts
│   └── __tests__/
│
├── AppApiKey/                       # Phase 6 應用層級 Key
│   ├── Domain/Aggregates/AppApiKey
│   ├── Application/Services/
│   ├── Infrastructure/
│   ├── Presentation/
│   │   ├── Controllers/AppApiKeyController
│   │   └── Routes/appApiKey.routes.ts
│   └── __tests__/
│
├── SdkApi/                          # App API Key 認證與代理
├── Dashboard/                       # 儀表板聚合
│   └── Application/Services/…
```

---

## 🧪 驗收標準

### Phase 3（用戶個人 Key）— 已完成

- [x] 用戶可建立 Key
- [x] Key 成功映射到 Bifrost Virtual Key
- [x] 用戶可查看組織 Key 列表
- [x] 可撤銷 Key 並更新權限／標籤
- [x] Key 使用量與 Dashboard 聚合可用
- [x] 餘額不足時可自動凍結相關 Key

### Phase 6.1（應用層級 Key）— 後端核心已落地

- [x] 可配發與列表 App API Key
- [x] 可設定 Scope 與 `BoundModules`
- [x] 可輪換與撤銷（含領域寬限期欄位）
- [x] 可查詢 App Key 用量
- [ ] 與個人 Key 完全分離的 **用量歸屬／計費隔離**（見工作計劃 Phase 5／6 待辦）

---

## 📌 設計決策

### 為什麼分為兩類 Key？

| 類型 | 用途 | 管理方 | 計費 |
|------|------|--------|------|
| **用戶／組織 Key** | 開發者經閘道呼叫模型 | 組織與成員 | 依組織／合約／Credit |
| **應用層級 Key** | SDK／CLI／第三方呼叫 Draupnir 對外 API | 管理者配發 | 完整隔離仍待資料與產品定義 |

### 為什麼本地存 keyHash 而非明文？

- 可作 Bearer 的 secret 僅在建立／輪換時短暫回傳
- 持久化以雜湊比對，降低資料庫外洩風險

### 為什麼要記錄 suspensionReason？
- 區分凍結原因（信用不足 vs. 管理員手動）
- 支援自動恢復邏輯（充值時恢復信用相關凍結）
- 便於審計與故障排查

---

## 🚀 後續與擴展

### V1.1 計劃

- 組織 Key 與 App Key 的輪換／到期策略之 **產品化規則**（後端已有 App Key 輪換與到期欄位）
- 更細的模組與 IP／時間窗限制（若產品需要）

### V1.2+ 可能擴展

- IP 白名單
- 時間窗口限制
- 與 KMS 整合
- 異常偵測與進階分析儀表板

---

**狀態**：✅ Phase 3 完成｜✅ Phase 6.1 後端核心完成（用量／計費歸屬仍待）  
**最後更新**：2026-04-20
