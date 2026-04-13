# Alerts Module — 跨模組依賴契約

## 背景

Alerts 負責預算門檻評估、警報事件與派送紀錄（email / webhook）。任何跨模組或 Foundation 依賴須在此記錄用途與理由，新增依賴時同步更新本檔。

## 使用的跨模組 Port

| Port | 擁有方 | 使用位置 | 用途 | 評估 |
|------|--------|----------|------|------|
| IAlertRecipientResolver →（內部組合）IOrganizationRepository | Organization | AlertRecipientResolverImpl | 查詢 org 名稱 | Domain repository；ALERTS-02 |
| IAlertRecipientResolver → IOrganizationMemberRepository | Organization | AlertRecipientResolverImpl | 查詢 manager 成員 | Domain repository |
| IAlertRecipientResolver → IAuthRepository | Auth | AlertRecipientResolverImpl | 由 user id 取得 email | Domain repository |
| IUsageRepository | Dashboard | EvaluateThresholdsService | 月度用量統計 | Application port（Phase 17） |
| IApiKeyRepository | ApiKey | EvaluateThresholdsService | Key breakdown | Domain repository |
| IMailer | Foundation | EmailAlertNotifier | 發送警報 email | Infrastructure adapter |
| IWebhookDispatcher | Foundation | WebhookAlertNotifier、TestWebhookEndpointService | 簽章派送 webhook | Infrastructure adapter |
| CurrentOrganizationContext（Middleware 型別） | Organization | AlertController、AlertHistoryController、WebhookEndpointController、alert.routes | HTTP 層 org 上下文 | Presentation 層；非 Domain 依賴 |

## 通知管道 Strategy（Phase 19）

- **IAlertNotifier**（Alerts Domain）：`EmailAlertNotifier` / `WebhookAlertNotifier` 實作；`SendAlertService` 持有 `readonly IAlertNotifier[]`，email 同步 `Promise.allSettled`，webhook 於 `queueMicrotask` 中非阻塞派送（保留原 fire-and-forget 語意）。
- **ResendDeliveryService** 使用 `Record<DeliveryChannel, IAlertNotifier>` 依 `delivery.channel` 路由；webhook 單點重送透過 `AlertPayload.resendWebhookEndpointId` 約束為單一 endpoint。

## 跨模組事件訂閱

- `bifrost.sync.completed`（DomainEventDispatcher）
  - 訂閱：`AlertsServiceProvider.boot()`
  - 行為：`EvaluateThresholdsService.evaluateOrgs`
  - **未**使用 Phase 18 `registerJobs`：此為事件驅動，非 cron；IScheduler 範圍不含此路徑（D-08）。

## 不依賴的項目（明確聲明）

- Application 服務不直接依賴 Organization/Auth 的具體實作類別（僅經由 port / resolver）。
- Domain 層不依賴 HTTP 或 Foundation 實作細節。

## 審查規則

- 新增跨模組依賴須更新本表。
- 優先評估是否應抽象為 Alerts-owned port（如 `IAlertRecipientResolver`）再拉取上游 port。
