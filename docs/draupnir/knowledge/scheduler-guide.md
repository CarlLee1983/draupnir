# 排程系統使用指南 (Scheduler Guide)

Draupnir 的排程系統是基於 `IScheduler` 介面與 `croner` 引擎實作的。為了達到「排程獨立設定」與「模組化註冊」的目標，系統採用了以下架構。

---

## 1. 設定機制

所有系統級的定時任務（Static Jobs）都應該在 `config/schedule.ts` 中進行定義。

### 設定檔案：`config/schedule.ts`
*   **validateCron**: 在系統啟動時會先驗證 Cron 字串是否合法，若寫錯會提前拋出錯誤，避免執行時崩潰。
*   **bifrostSync**: 定義了用量同步的時間與啟動行為。

```typescript
export default {
  bifrostSync: {
    cron: validateCron(process.env.BIFROST_SYNC_CRON ?? '*/5 * * * *', 'bifrostSync'),
    runOnInit: true,
  },
} as const
```

---

## 2. 註冊機制

Draupnir 使用 **Provider 自動註冊** 模式。

1.  **IJobRegistrar 介面**：任何 Provider 只要實作 `registerJobs` 方法，就會在 App 啟動時被自動偵測。
2.  **啟動鏈 (Bootstrap)**：`src/bootstrap.ts` 會從 DI Container 取出 `scheduler`，並呼叫各個 Provider 的 `registerJobs`。

---

## 3. 如何新增一個排程任務？

### 步驟 A：在設定檔中定義時間
在 `config/schedule.ts` 新增一個 Key：
```typescript
jobA: {
  cron: validateCron(process.env.JOB_A_CRON ?? '0 0 * * *', 'jobA'),
  runOnInit: false,
}
```

### 步驟 B：在 Provider 中註冊邏輯
在對應的 `ModuleServiceProvider` 中：
```typescript
import { schedule } from '@/../config/index'

registerJobs(scheduler: IScheduler): void {
  scheduler.schedule(
    {
      name: 'unique-job-name',
      cron: schedule.jobA.cron,
      runOnInit: schedule.jobA.runOnInit,
    },
    async () => {
      // 執行你的任務邏輯
    }
  );
}
```

---

## 4. 動態排程 (Dynamic Schedules)

若任務是由使用者在 UI 上設定的（如報表發送），則不會出現在 `config/schedule.ts` 中。

*   **儲存**：儲存在資料庫 `report_schedules` 表。
*   **加載**：`ReportsServiceProvider` 在 `registerJobs` 時會從資料庫讀取所有已啟用的排程並循環註冊。
*   **管理**：透過 `ScheduleReportService` 在執行期動態調用 `scheduler.schedule()` 與 `scheduler.unschedule()`。

---

## 5. 除錯與監控

*   **日誌**：所有排程任務執行時都應使用 `console.log` 或 Logger 標註任務名稱。
*   **手動觸發**：若是 `runOnInit: true` 的任務，可透過重啟應用程式來立即測試執行結果。
