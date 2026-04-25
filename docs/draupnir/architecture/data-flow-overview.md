# Draupnir 資料流總覽

**適用對象**：新成員、後端、前端、測試、架構審閱者  
**目的**：用一頁快速理解 Bifrost、Usage Read Model、Dashboard、Reports、Credit、Alerts 的資料流關係。

---

## 一句話版

1. **Bifrost / LLM Gateway** 產生原始 usage logs。
2. **Scheduler (Croner)** 根據 `config/schedule.ts` 定時觸發任務，由 `BifrostSyncService` 抓取並落庫至 `usage_records`。
3. **Credit / Alerts** 透過 `BifrostSyncCompletedEvent` 接續處理，或透過 **Background Queue (Redis Stream)** 進行非同步解耦處理（如 Webhook）。
4. **Dashboard / Reports** 只讀本地 usage read model，不直接打 gateway。

---

## 兩條主要資料流

### A. 用量同步與落庫 (Scheduled Sync)

入口文件：
- [`bifrost-sync-data-flow.md`](./bifrost-sync-data-flow.md)
- [`uml/sequence-diagrams.md`](./uml/sequence-diagrams.md)

重點：
- **Scheduler 驅動**：由 `IScheduler` 管理，設定詳見 `config/schedule.ts`。
- **可靠性**：支援自動重試 (Retries) 與指數退避 (Backoff)。
- **同步路徑**：Gateway logs → `usage_records`。
- **狀態追蹤**：使用 `sync_cursors` 記錄同步水位。
- **事件擴散**：`BifrostSyncCompletedEvent` → 觸發 Credit 扣款 / Alerts 評估。

### B. 報表模板渲染

入口文件：
- [`report-rendering-data-flow.md`](./report-rendering-data-flow.md)
- [`uml/sequence-diagrams.md`](./uml/sequence-diagrams.md)

重點：
- **Token 驗證**：確保報表存取權限。
- **即時查找**：`scheduleId` 現場查詢。
- **本地查詢**：`IUsageRepository` 從本地 `usage_records` 讀取資料。
- **前端渲染**：模板純 render，支援 PDF 輸出。

---

## 角色與責任

| 元件 | 角色 |
|---|---|
| `ILLMGatewayClient` | 外部原始資料來源。 |
| `IScheduler` | **排程管理員**：負責定時任務執行、失敗重試（Croner 實現）。 |
| `IQueue` | **背景隊列**：負責非同步任務解耦（如 Webhook 發送，Redis Stream 實現）。 |
| `BifrostSyncService` | 同步核心：抓取、映射、落庫、發送領域事件。 |
| `AtlasUsageRepository` | 本地 usage read model 存取。 |
| `ApplyUsageChargesService` | 處理 `BifrostSyncCompletedEvent` 進行信用扣款。 |
| `EvaluateThresholdsService` | 處理 `BifrostSyncCompletedEvent` 進行告警評估。 |
| `AdminReportTemplatePage` | 報表資料組裝與 SSR 渲染。 |

---

## 你可能會先看哪個

- 想知道 **gateway 資料怎麼進 DB**  
  → [`bifrost-sync-data-flow.md`](./bifrost-sync-data-flow.md)

- 想知道 **報表為什麼不是直接打 gateway**  
  → [`report-rendering-data-flow.md`](./report-rendering-data-flow.md)

- 想看 **圖狀流程**  
  → [`uml/sequence-diagrams.md`](./uml/sequence-diagrams.md)

---

## 相關規格

- [`../specs/4-credit-billing/README.md`](../specs/4-credit-billing/README.md)
- [`../specs/4-credit-billing/credit-system-design.md`](../specs/4-credit-billing/credit-system-design.md)
- [`../specs/4-credit-billing/user-stories.md`](../specs/4-credit-billing/user-stories.md)

**最後更新**：2026-04-26

