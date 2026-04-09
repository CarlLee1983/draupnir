# 模組依賴圖

## 13 模組全景圖

```
                          ┌─────────────────────────────┐
                          │  Shared Layer               │
                          │  (基礎設施、異常、中間件) │
                          └─────────────────────────────┘
                                       ↑
                                       │ (所有模組依賴)
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
    ┌───────────┐                  ┌───────────┐                  ┌───────────┐
    │ Profile   │←──────────────────│ Auth      │                 │ ApiKey    │
    │ (用戶)    │ (JWT 驗證)        │ (認證)    │                 │ (用戶密鑰)│
    └───────────┘                  └───────────┘                 └───────────┘
         ↑                              ↑                              ↑
         │                              │                              │
         └──────────────┬───────────────┴──────────────┬───────────────┘
                        │                              │
                    ┌───────────┐                  ┌───────────┐
                    │ Health    │                  │ Credit    │
                    │ (健康檢查)│                  │ (額度)    │
                    └───────────┘                  └───────────┘
                        ↑                              ↑
                        │                              │
                        └──────────────┬───────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                ┌───────────┐      ┌────────────┐    ┌───────────┐
                │ CliApi    │      │ Dashboard  │    │ SdkApi    │
                │ (CLI API) │      │ (儀表板)   │    │ (SDK API) │
                └───────────┘      └────────────┘    └───────────┘
                    │                                    │
                    │ (代理)                             │ (代理)
                    │                                    │
                    └────────────────┬───────────────────┘
                                     │
                           ┌─────────────────┐
                           │ Organization    │
                           │ (組織管理)      │
                           └─────────────────┘
                                  ↓ (依賴)
                           ┌─────────────────┐
                           │ AppModule       │
                           │ (應用程式)      │
                           └─────────────────┘
                                  ↓ (依賴)
                           ┌─────────────────┐
                           │ AppApiKey       │
                           │ (應用密鑰)      │
                           └─────────────────┘
                                  ↓ (依賴)
                    ┌─────────────────────────────┐
                    │ DevPortal & Contract        │
                    │ (開發者入口、合約)          │
                    └─────────────────────────────┘
```

## 詳細依賴矩陣

### 核心模組 (7 個)

| 模組 | 依賴 | 被依賴 | 性質 |
|------|------|--------|------|
| **Profile** | Shared | Auth, ApiKey, Dashboard | 用戶身份 |
| **Organization** | Shared, Profile | AppModule, DevPortal, Contract | 組織管理 |
| **Auth** | Shared | Profile, CliApi, SdkApi, AppModule | 認證中樞 |
| **ApiKey** | Shared, Profile | Dashboard, CliApi | 用戶密鑰 |
| **Credit** | Shared | Dashboard, SdkApi | 額度系統 |
| **Health** | Shared | — | 健康檢查 |
| **Dashboard** | Shared, Profile, Credit, ApiKey | — | 讀取聚合 |

### 擴展模組 (6 個)

| 模組 | 依賴 | 被依賴 | 性質 |
|------|------|--------|------|
| **CliApi** | Shared, Auth, ApiKey | — | CLI 代理 |
| **SdkApi** | Shared, Auth, AppApiKey, Credit | — | SDK 代理 |
| **AppModule** | Shared, Organization, Auth | AppApiKey, DevPortal | 應用管理 |
| **AppApiKey** | Shared, AppModule | SdkApi, DevPortal | 應用密鑰 |
| **DevPortal** | Shared, Organization, AppModule | — | 開發入口 |
| **Contract** | Shared, Organization | — | 合約管理 |

## 依賴關係規則

### ✅ 允許的依賴

1. **垂直依賴**（層級下行）
   ```
   Presentation → Application → Domain
                                  ↓
                           Infrastructure
   ```

2. **橫向依賴**（同層模組間）
   ```
   Profile ←→ ApiKey (都在 Domain 層)
   ```

3. **上升到 Shared**（所有層）
   ```
   所有模組 → Shared
   ```

### ❌ 禁止的依賴

1. **逆向依賴**
   ```
   ❌ Domain → Application
   ❌ Application → Presentation
   ❌ Infrastructure → Domain
   ```

2. **循環依賴**
   ```
   ❌ Module A → Module B → Module A
   ```

3. **跨模組 Domain 暴露**
   ```
   ❌ Profile 直接使用 Credit 的 Aggregate
   ✅ 應通過 Application Service
   ```

## 模組依賴強度分析

### 低耦合度模組（可獨立）
- ✅ Health — 無依賴，純健康檢查
- ✅ Profile — 只依賴 Shared，被多個模組使用

### 中耦合度模組（合理依賴）
- ⭐ ApiKey — 依賴 Profile（用戶），被 Dashboard 聚合
- ⭐ Credit — 依賴 Profile（用戶），被 Dashboard 聚合
- ⭐ Auth — 中樞驗證，被多個模組依賴

### 高耦合度模組（領域協調）
- ⭐ Organization — 依賴 Profile，協調應用/密鑰
- ⭐ AppModule — 依賴 Organization，管理應用
- ⭐ DevPortal — 聚合入口，依賴多個模組

### 讀取聚合層（應用層）
- 📊 Dashboard — 讀聚合，無業務狀態
- 📊 CliApi — 請求代理，無業務狀態
- 📊 SdkApi — 認證代理，無業務狀態

## 循環依賴檢查

```
✅ 已驗證 — 無環形依賴

追蹤路徑示例：
  AppModule → Organization → (不回到 AppModule)
  Credit → Profile → (不回到 Credit)
  SdkApi → AppApiKey → AppModule → Organization → (不回到 SdkApi)
```

## 模組邊界清晰度評分

| 維度 | 評分 | 說明 |
|------|------|------|
| **API 隔離** | 9/10 | 所有模組有 index.ts 公開介面 |
| **無內部曝露** | 8.5/10 | 內部檔案隱藏，少見外洩 |
| **依賴清晰度** | 8.5/10 | 依賴流向明確，無隱藏耦合 |
| **可替換性** | 8/10 | 大多模組可通過 DI 替換 |

---

## 新增模組時的依賴檢查清單

當添加新模組時，確保：

- [ ] 只依賴 Shared 和其他已建立模組
- [ ] 不被任何模組反向依賴（除非故意）
- [ ] 提供清晰的公開 API（index.ts）
- [ ] 使用 Repository 介面，不暴露 Domain 層
- [ ] 在 ServiceProvider 中註冊 DI

---

## 參考

- [`layer-decision-rules.md`](../knowledge/layer-decision-rules.md) — 分層判斷
- [`ddd-layered-architecture.md`](./ddd-layered-architecture.md) — 四層架構
- `src/Modules/*/index.ts` — 各模組公開 API
- `src/wiring/index.ts` — 模組註冊點
