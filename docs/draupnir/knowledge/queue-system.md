# 背景隊列系統 (Message Queue) 指南

Draupnir 採用基於 **Redis Streams** 的輕量級非同步任務隊列，旨在處理高併發下的長耗時任務，並確保任務處理的可靠性與可擴展性。

## 核心架構

系統遵循 **Port-Adapter** 模式，將業務邏輯與具體的隊列實現解耦：

- **Port (`IQueue`)**: 定義了生產者（`push`）與消費者（`process`）的標準介面。
- **Adapter (`RedisStreamQueueAdapter`)**: 利用 Redis Streams 實作分佈式隊列，支持 Consumer Group 與訊息確認 (ACK)。
- **Registrar (`IQueueRegistrar`)**: 允許各個模組自主註冊其專屬的任務處理程序 (Worker)。

## 如何新增一個背景任務

### 1. 定義任務名稱與 Payload 型別
建議在模組的 Application 層定義任務名稱。
```typescript
// 範例：Modules/MyModule/Application/Tasks.ts
export const MY_TASK_NAME = 'my_module.do_something';
export interface MyTaskPayload {
  id: string;
  action: string;
}
```

### 2. 實作任務處理器
在模組的 `ServiceProvider` 中實作 `IQueueRegistrar` 介面。

```typescript
export class MyServiceProvider extends ModuleServiceProvider implements IQueueRegistrar {
  
  // 實作 registerQueueHandlers 鉤子
  async registerQueueHandlers(queue: IQueue): Promise<void> {
    queue.process(MY_TASK_NAME, async (payload: MyTaskPayload) => {
      // 執行業務邏輯
      console.log(`Processing task ${payload.id}`);
      
      // 注意：處理器不需要手動 ACK，IQueue 實作會自動處理
      // 若拋出異常，訊息將保持在 Pending 狀態供後續重試
    });
  }
}
```

### 3. 發送任務 (生產者)
從容器中取得 `queue` 並推入訊息。

```typescript
const queue = container.make('queue') as IQueue;
await queue.push(MY_TASK_NAME, { id: '123', action: 'email' });
```

## 實作細節：Redis Streams

- **Consumer Group**: 預設群組名稱為 `draupnir_workers`，支援多實例並行消費且不重複。
- **訊息確認 (ACK)**: 任務處理成功後會自動呼叫 `XACK`。
- **優雅停機 (Graceful Shutdown)**: 系統關閉時會呼叫 `queue.close()`，停止讀取新訊息並等待當前任務完成。

## 監控與維護

可使用 Redis CLI 工具檢查隊列積壓情況：
```bash
# 查看隊列長度
XLEN draupnir:queue:webhook.dispatch

# 查看消費群組資訊
XINFO GROUPS draupnir:queue:webhook.dispatch
```

## 現有任務列表

| 任務名稱 | 描述 | 處理模組 |
| :--- | :--- | :--- |
| `webhook.dispatch` | 處理外發的 Webhook 請求（具備自動重試邏輯） | Foundation |
