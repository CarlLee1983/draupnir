# 3. API 金鑰管理

> 虛擬金鑰、應用層級金鑰、權限與配額

## 📋 概述

Draupnir 支援兩類 API Key：

1. **用戶個人 Key**（Phase 3）— 用戶建立和管理的個人 Key，映射到 Bifrost Virtual Key
2. **應用層級 Key**（Phase 6）— 應用級別的專屬 Key，用於第三方應用整合

---

## 🏗️ Phase 3：Key Management — 用戶個人 Key

### 規格來源

詳細設計位於 [0-planning 工作計劃中的 Phase 3 章節](../0-planning/draupnir-v1-workplan.md#phase-3key-management--api-key-管理)

### 核心功能

#### 3.1 ApiKey 模組

| 功能 | 說明 |
|------|------|
| **Key 建立** | 映射至 Bifrost Virtual Key，記錄 maskedKey 用於顯示 |
| **Key 列表** | 支援分頁、篩選（状態、建立時間） |
| **Key 停用** | 暫時禁用 Key，不刪除記錄 |
| **Key 刪除** | 從 Bifrost 刪除虛擬 Key |
| **Key 標籤** | 為 Key 添加標籤便於管理 |
| **權限設定** | 可用模型、速率限制（RPM、TPM） |
| **使用統計** | 從 Bifrost Logs API 拉取，展示 Key 的用量 |

#### 3.2 Dashboard 資料聚合

| API | 說明 |
|-----|------|
| `GET /api/org/{orgId}/dashboard` | Key 總覽、近期用量、費用摘要 |
| `GET /api/org/{orgId}/usage-chart` | 用量圖表資料（依時間、模型、Provider 分組） |
| `GET /api/org/{orgId}/cost-summary` | 費用摘要 |

### 📊 核心資料模型

```
ApiKey Aggregate
├── id (UUID)
├── orgId (UUID) — FK to Organization
├── name (string)
├── maskedKey (string) — 展示時遮蔽部分內容
├── virtualKeyId (string) — Bifrost Virtual Key ID
├── status (enum: ACTIVE | SUSPENDED | DELETED)
├── permissions (JSON) — 可用模型、速率限制
│   ├── allowedModels (string[])
│   ├── rateLimit { rpm: number, tpm: number }
│   └── scope (read | write | admin)
├── suspensionReason (string | null) — 凍結原因（CREDIT_DEPLETED | ADMIN_MANUAL）
├── lastUsedAt (timestamp | null)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

### ✅ 實現狀態

- ✅ ApiKey CRUD（建立、列表、更新、刪除）
- ✅ Bifrost Virtual Key 映射
- ✅ Key 權限與速率限制設定
- ✅ Key 使用量查詢
- ✅ Dashboard 聚合 API
- ✅ 餘額不足時自動凍結 Key（Credit 模組聯動）

### 驗收標準
- [ ] 用戶可建立 Key ✅
- [ ] Key 列表顯示正確，支援分頁 ✅
- [ ] 可停用/刪除 Key ✅
- [ ] 可設定 Key 權限與速率限制 ✅
- [ ] Key 使用量統計準確 ✅
- [ ] Dashboard API 返回正確資訊 ✅

---

## 🎯 Phase 6.1：Application API Key — 應用層級 Key

### 規格來源

詳細設計位於 [0-planning 工作計劃中的 Phase 6.1 章節](../0-planning/draupnir-v1-workplan.md#61-application-api-key應用層級-key)

### 核心功能

| 功能 | 說明 |
|------|------|
| **Key 配發** | 為註冊應用分配專屬 API Key |
| **Key 與 Module 綁定** | 該 Key 只能存取特定模組功能 |
| **Scope 定義** | read / write / admin 三個等級 |
| **用量獨立追蹤** | 區別於用戶個人 Key 的使用量 |
| **計費隔離** | 應用 Key 使用費用單獨計算 |
| **生命週期管理** | 到期、輪換、撤銷 |

### 📊 核心資料模型

```
AppApiKey Aggregate
├── id (UUID)
├── appId (UUID) — FK to Application（DevPortal 中的應用）
├── name (string)
├── key (string) — 加密儲存
├── maskedKey (string) — 展示時遮蔽
├── moduleBindings (AppModuleBinding[])
│   ├── moduleId (UUID)
│   ├── scope (read | write | admin)
│   └── accessLevel (FULL | LIMITED)
├── status (enum: ACTIVE | EXPIRED | REVOKED)
├── expiresAt (timestamp)
├── createdAt (timestamp)
└── revokedAt (timestamp | null)
```

### 📍 實現進度

- ✅ AppApiKey CRUD（基礎實現）
- ⏳ Module binding 詳細設計
- ⏳ Scope 驗證邏輯
- ⏳ 用量獨立追蹤
- ⏳ 生命週期管理（到期、輪換）

---

## 🔗 相關文檔與模組

### 相關規格
- **Phase 3 完整設計** → [0-planning/Phase 3](../0-planning/draupnir-v1-workplan.md#phase-3key-management--api-key-管理)
- **Phase 6 完整設計** → [0-planning/Phase 6](../0-planning/draupnir-v1-workplan.md#phase-6application-distribution--應用分發與-sdk)
- **信用系統與餘額阻擋** → [4-credit-billing](../4-credit-billing/)

### 實現模組位置

```
src/Modules/
├── ApiKey/                          # Phase 3 用戶個人 Key
│   ├── Domain/
│   │   ├── Aggregates/ApiKey
│   │   ├── ValueObjects/KeyStatus, KeyPermissions
│   │   └── Repositories/IApiKeyRepository
│   ├── Application/
│   │   └── Services/CreateKeyService, UpdatePermissionsService, etc.
│   ├── Infrastructure/
│   │   ├── Repositories/ApiKeyRepository
│   │   └── Services/BifrostKeyBlocker (Credit 聯動)
│   ├── Presentation/
│   │   ├── Controllers/ApiKeyController
│   │   └── Routes/apiKeyRoutes
│   └── __tests__/
│
├── AppApiKey/                       # Phase 6 應用層級 Key
│   ├── Domain/
│   │   ├── Aggregates/AppApiKey
│   │   ├── Entities/AppModuleBinding
│   │   ├── ValueObjects/KeyScope, BindingStatus
│   │   └── Repositories/IAppApiKeyRepository
│   ├── Application/
│   │   └── Services/IssueAppKeyService, RevokeKeyService, etc.
│   ├── Infrastructure/
│   │   └── Repositories/AppApiKeyRepository
│   ├── Presentation/
│   │   ├── Controllers/AppApiKeyController
│   │   └── Routes/appApiKeyRoutes
│   └── __tests__/
│
├── Dashboard/                       # 資料聚合（Phase 3）
│   └── Application/
│       └── Services/DashboardAggregationService
```

---

## 🧪 驗收標準

### Phase 3 （用戶個人 Key）✅ 完成

- [x] 用戶可建立 Key
- [x] Key 成功映射到 Bifrost Virtual Key
- [x] 用戶可查看自己的 Key 列表
- [x] 用戶可停用/刪除 Key
- [x] 可設定 Key 的權限與速率限制
- [x] Key 使用量正確計算
- [x] Dashboard 聚合 API 有效
- [x] 餘額不足時自動凍結相關 Key

### Phase 6.1 （應用層級 Key）🟡 進行中

- [ ] 應用可配發專屬 Key
- [ ] Key 正確綁定至特定 Module
- [ ] Scope 驗證生效
- [ ] 用量獨立追蹤
- [ ] 計費隔離
- [ ] Key 到期與輪換機制

---

## 📌 設計決策

### 為什麼分為兩類 Key？

| 類型 | 用途 | 管理方 | 計費 |
|------|------|--------|------|
| **用戶個人 Key** | 開發者直接呼叫 LLM 服務 | 開發者自管 | 按開發者帳戶計費 |
| **應用層級 Key** | 第三方應用呼叫 Draupnir 服務 | 應用開發者配發 | 按應用計費 |

### 為什麼使用 maskedKey？
- 增強安全性：完整 Key 只在建立時顯示一次
- 用戶界面顯示時遮蔽大部分內容，便於識別
- 防止意外洩露

### 為什麼要記錄 suspensionReason？
- 區分凍結原因（信用不足 vs. 管理員手動）
- 支援自動恢復邏輯（充值時恢復信用相關凍結）
- 便於審計與故障排查

---

## 🚀 後續與擴展

### V1.1 計劃
- Key 輪換機制（安全最佳實踐）
- 更細粒度的 Module Binding

### V1.2+ 可能擴展
- IP 白名單（Key 只允許特定 IP 呼叫）
- 時間窗口限制（Key 在特定時間段內有效）
- 加密 Key 存儲（使用 KMS）
- Key 分析儀表板（使用模式、異常檢測）

---

**狀態**：✅ Phase 3 完成 / 🟡 Phase 6.1 進行中  
**最後更新**：2026-04-10
