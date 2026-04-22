# Draupnir 資料流總覽

**適用對象**：新成員、後端、前端、測試、架構審閱者  
**目的**：用一頁快速理解 Bifrost、Usage Read Model、Dashboard、Reports、Credit、Alerts 的資料流關係。

---

## 一句話版

1. **Bifrost / LLM Gateway** 產生原始 usage logs
2. **Dashboard 的 `BifrostSyncService`** 定時抓取並寫入 `usage_records`
3. **Credit / Alerts** 透過 `BifrostSyncCompletedEvent` 接續處理
4. **Dashboard / Reports** 只讀本地 usage read model，不直接打 gateway

---

## 兩條主要資料流

### A. 用量同步與落庫

入口文件：
- [`bifrost-sync-data-flow.md`](./bifrost-sync-data-flow.md)
- [`uml/sequence-diagrams.md`](./uml/sequence-diagrams.md)

重點：
- cron 觸發 `BifrostSyncService.sync()`
- gateway logs → `usage_records`
- `quarantined_logs` / `sync_cursors`
- `BifrostSyncCompletedEvent` → Credit / Alerts

### B. 報表模板渲染

入口文件：
- [`report-rendering-data-flow.md`](./report-rendering-data-flow.md)
- [`uml/sequence-diagrams.md`](./uml/sequence-diagrams.md)

重點：
- token 驗證
- `scheduleId` live lookup
- `IUsageRepository` 本地查詢
- 前端模板純 render

---

## 角色與責任

| 元件 | 角色 |
|---|---|
| `ILLMGatewayClient` | 外部原始資料來源 |
| `BifrostSyncService` | 同步、映射、落庫、發事件 |
| `DrizzleUsageRepository` | 本地 usage read model |
| `ApplyUsageChargesService` | 同步完成後扣款 |
| `EvaluateThresholdsService` | 同步完成後評估告警 |
| `AdminReportTemplatePage` | 報表資料組裝與 render |
| `Template.tsx` | 純 UI / PDF 模板畫面 |

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

**最後更新**：2026-04-22
