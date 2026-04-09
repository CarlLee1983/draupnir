# SdkApi Module

## 概述

SdkApi 模組提供 SDK 級別的 API 端點，用於應用程式（App）直接呼叫 Draupnir。與用戶級 API 不同，SdkApi 使用應用級金鑰（AppApiKey）進行認證。

## 架構特性

### 為什麼無 Domain 層？

SdkApi 是**認證代理層**，不需要 Domain 層：

1. **無業務邏輯** — 只負責驗證金鑰、代理請求，無核心業務規則
2. **無聚合根** — 不定義或管理 Aggregate Root，純認證 + 轉發
3. **中間件職責** — 屬於 Application Service 的授權部分
4. **框架層** — 本質上是 API 閘道的認證層

詳見 [`docs/draupnir/knowledge/layer-decision-rules.md`](../../docs/draupnir/knowledge/layer-decision-rules.md#特殊情境讀取層與代理層無需-domain)

## 結構

```
src/Modules/SdkApi/
├── Application/
│   ├── UseCases/
│   │   ├── AuthenticateApp.ts               # 驗證 AppApiKey
│   │   ├── ProxyModelCall.ts                # 轉發模型調用至 Bifrost
│   │   ├── QueryUsage.ts                    # 查詢使用量
│   │   └── QueryBalance.ts                  # 查詢額度餘額
│   └── DTOs/
│       └── SdkApiDTO.ts                     # 請求/回應格式
├── Infrastructure/
│   ├── Middleware/
│   │   └── AppAuthMiddleware.ts             # AppApiKey 驗證
│   └── Providers/
│       └── SdkApiServiceProvider.ts         # DI 註冊
├── Presentation/
│   ├── Controllers/
│   │   └── SdkApiController.ts              # HTTP 端點
│   └── Routes/
│       └── sdkApi.routes.ts                 # 路由定義
└── index.ts                                  # 公開 API
```

## 主要 API

### POST /sdk/model/call

通過 SDK 金鑰呼叫模型

```typescript
POST /sdk/model/call
Authorization: Bearer {appApiKey}
Content-Type: application/json

{
  "model": "gpt-4",
  "prompt": "...",
  "temperature": 0.7
}

Response:
{
  success: true,
  data: {
    result: "...",
    usage: { input_tokens: 100, output_tokens: 50 }
  }
}
```

### GET /sdk/usage

查詢應用的使用統計

```typescript
GET /sdk/usage?period=7d
Authorization: Bearer {appApiKey}

Response:
{
  success: true,
  data: {
    totalCalls: 1000,
    totalTokens: 50000,
    costEstimate: 15.50
  }
}
```

### GET /sdk/balance

查詢應用的額度餘額

```typescript
GET /sdk/balance
Authorization: Bearer {appApiKey}

Response:
{
  success: true,
  data: {
    balance: 1000,
    limit: 5000,
    resetDate: "2026-05-09"
  }
}
```

## 認證流程

1. **驗證 AppApiKey** — 通過 AppAuthMiddleware
2. **查詢應用** — 找到 AppModule
3. **檢查配額** — 確保額度充足
4. **代理請求** — 轉發至 Bifrost
5. **扣除額度** — 根據使用量扣減 Credit

## 與 Profile API 的區別

| 特性 | Profile API | SdkApi |
|------|------------|--------|
| 認證 | 用戶 JWT | 應用金鑰 |
| 用途 | 用戶管理 | 應用使用 |
| Domain 層 | ✅ 有 | ❌ 無 |
| 聚合根 | User, Profile | ❌ 無 |

## 測試策略

- **Unit Tests** — 驗證邏輯、AppAuthMiddleware
- **Integration Tests** — 端點測試、代理流程

詳見 `__tests__/` 目錄。
