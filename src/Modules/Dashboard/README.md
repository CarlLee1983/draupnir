# Dashboard Module

## 概述

Dashboard 模組提供儀表板聚合 API，展示用戶的使用狀況、額度消耗、API 調用統計等。

## 架構特性

### 為什麼無 Domain 層？

Dashboard 是**應用層讀取視圖**，不需要 Domain 層：

1. **無不變式** — 純讀操作，無「允許或禁止什麼」的業務規則
2. **無聚合根** — 不定義業務實體，只是多個資料源的聚合
3. **CQRS 讀側** — 符合 CQRS 架構的讀取側設計
4. **應用層職責** — 聚合邏輯屬於 Use Case 編排

詳見 [`docs/draupnir/knowledge/layer-decision-rules.md`](../../docs/draupnir/knowledge/layer-decision-rules.md#特殊情境讀取層與代理層無需-domain)

## 結構

```
src/Modules/Dashboard/
├── Application/
│   ├── Services/
│   │   ├── GetDashboardSummaryService.ts    # 聚合用戶儀表板數據
│   │   └── GetUsageChartService.ts          # 聚合使用圖表數據
│   └── DTOs/
│       └── DashboardDTO.ts                  # 回應格式定義
├── Infrastructure/
│   ├── Services/
│   │   └── UsageAggregator.ts               # 查詢邏輯（內部使用）
│   └── Providers/
│       └── DashboardServiceProvider.ts      # DI 註冊
├── Presentation/
│   ├── Controllers/
│   │   └── DashboardController.ts           # HTTP 端點
│   └── Routes/
│       └── dashboard.routes.ts              # 路由定義
└── index.ts                                  # 公開 API
```

## 主要 API

### GET /dashboard/summary

取得儀表板摘要（用戶資訊、額度、使用統計）

```typescript
GET /dashboard/summary
Authorization: Bearer {token}

Response:
{
  success: true,
  data: {
    user: { id, email, profile },
    credit: { balance, used, limit },
    usage: { calls, errors, avgLatency }
  }
}
```

### GET /dashboard/usage-chart

取得使用圖表數據

```typescript
GET /dashboard/usage-chart?period=7d
Authorization: Bearer {token}

Response:
{
  success: true,
  data: {
    labels: ["2026-04-02", ...],
    datasets: [{ label: "Calls", data: [...] }]
  }
}
```

## 聚合邏輯

Dashboard 聚合來自多個模組的數據：

- **Profile** — 用戶基本資訊
- **Credit** — 額度池與使用量
- **CliApi** — API 調用日誌與統計

聚合遵循 DTO 轉換，不暴露 Domain 層物件。

## 測試策略

- **Unit Tests** — Service 層聚合邏輯
- **Integration Tests** — 端點測試，驗證多模組聚合

詳見 `__tests__/` 目錄。
