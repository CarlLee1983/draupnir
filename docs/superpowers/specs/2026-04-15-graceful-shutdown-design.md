# Graceful Shutdown — SIGTERM 優雅關閉設計文件

**日期：** 2026-04-15
**狀態：** 已核准
**目標：** 支援 Kubernetes rolling update 與 PM2/Systemd 重啟的零停機優雅關閉

---

## 背景與目標

### 驅動場景

- **Kubernetes / Docker rolling update**：`SIGTERM` → 等 in-flight 請求排乾 → `process.exit(0)`
- **一般 process manager（PM2、Systemd）重啟**：同上機制

### 現狀問題

`src/index.ts` 呼叫 `Bun.serve()` 後未保留 `server` 參考，亦無任何 SIGTERM/SIGINT 處理。收到信號時 process 直接退出，in-flight 請求被截斷。

---

## 設計方案

採用 **方案 B — `GracefulShutdown` 類別**，封裝信號處理與有序 hook 清理，不修改 Gravito 框架層。

---

## 架構

### 檔案結構

```
src/Foundation/Infrastructure/Shutdown/
  IShutdownHook.ts
  GracefulShutdown.ts
  hooks/
    BunServerShutdownHook.ts
    DatabaseShutdownHook.ts
    RedisShutdownHook.ts
    SchedulerShutdownHook.ts
    MessageQueueShutdownHook.ts
    WebhookShutdownHook.ts
```

### 關閉順序

依 `register()` 呼叫順序執行（sequential）：

1. **BunServer** — 停止新連線，等 in-flight 請求排乾（`server.stop()`）
2. **MessageQueue** — 停止消費新訊息，等處理中訊息完成（drain 策略）
3. **Scheduler** — 停止新 job 觸發
4. **WebhookClient** — 直接關閉長連線（close 策略）
5. **Redis** — 關閉連線
6. **Database** — 關閉連線池

---

## 核心介面

### `IShutdownHook`

```ts
export interface IShutdownHook {
  /** 顯示在 log 中的資源名稱 */
  readonly name: string
  /**
   * 執行清理。
   * - 應在 drainTimeout 內完成；超時由 GracefulShutdown 強制終止
   * - 丟出的 error 會被 catch 並 log，不影響其他 hook 執行
   */
  shutdown(): Promise<void>
}
```

### `GracefulShutdown`

```ts
class GracefulShutdown {
  constructor(private readonly drainTimeoutMs: number) {}

  register(...hooks: IShutdownHook[]): this
  listen(signals?: NodeJS.Signals[]): void  // 預設 ['SIGTERM', 'SIGINT']
  async execute(signal: string): Promise<never>
}
```

---

## 整合點

### `src/index.ts`

```ts
const drainTimeoutMs = Number(process.env.DRAIN_TIMEOUT_MS ?? 25_000)

const shutdown = new GracefulShutdown(drainTimeoutMs)
  .register(
    new BunServerShutdownHook(server),
    new MessageQueueShutdownHook(core.container.make('messageQueue')),
    new SchedulerShutdownHook(core.container.make('scheduler')),
    new WebhookShutdownHook(core.container.make('webhookClient')),
    new RedisShutdownHook(core.container.make('redis')),
    new DatabaseShutdownHook(core.container.make('database')),
  )
shutdown.listen()
```

---

## 環境變數

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `DRAIN_TIMEOUT_MS` | `25000` | in-flight 請求最長等待時間（ms） |

### Kubernetes 配套設定

```yaml
spec:
  terminationGracePeriodSeconds: 30   # ≥ DRAIN_TIMEOUT_MS / 1000 + buffer
  containers:
    - lifecycle:
        preStop:
          exec:
            command: ["/bin/sh", "-c", "sleep 2"]  # 讓 LB 摘除 pod 後再送 SIGTERM
```

---

## 錯誤處理與可觀測性

### Hook 執行策略

每個 hook 包在獨立的 `Promise.race([hook.shutdown(), timeout])` 內：

- **成功** → `log.info: "[shutdown] <name> closed (Xms)"`
- **超時** → `log.warn: "[shutdown] <name> timed out after Xms, forcing"`
- **錯誤** → `log.error: "[shutdown] <name> failed: <message>"`，繼續下一個 hook

**單一 hook 失敗不中斷整體 shutdown。**

### Log 範例

```
[shutdown] SIGTERM received — drainTimeout=25000ms
[shutdown] BunServer closing...
[shutdown] BunServer closed (847ms)
[shutdown] MessageQueue draining...
[shutdown] MessageQueue drained (1203ms)
[shutdown] Scheduler stopped (12ms)
[shutdown] WebhookClient closed (3ms)
[shutdown] Redis closed (8ms)
[shutdown] Database closed (15ms)
[shutdown] All hooks completed — exiting with code 0
```

---

## 各 Hook 策略

| Hook | 策略 | 說明 |
|------|------|------|
| `BunServerShutdownHook` | drain | `server.stop()` 等既有連線完成，外層 timeout 升級為強制 |
| `MessageQueueShutdownHook` | drain | 停止消費，等處理中訊息完成 |
| `SchedulerShutdownHook` | close | 停止新 job 觸發，不等執行中 job |
| `WebhookShutdownHook` | close | 直接關閉長連線 |
| `RedisShutdownHook` | close | 呼叫 `redis.quit()` |
| `DatabaseShutdownHook` | close | 關閉連線池 |

---

## 測試策略

| 測試層 | 內容 |
|--------|------|
| Unit | `GracefulShutdown` — mock hooks，驗證超時行為、hook 失敗不中斷 |
| Unit | 各 `*ShutdownHook` — mock 底層資源，驗證呼叫正確的 close API |
| Integration | 啟動真實 Bun server，送 SIGTERM，驗證 in-flight 請求正常完成 |

---

## 範圍外（Out of Scope）

- 熱重載（hot reload）/ zero-downtime code update — 屬另一議題
- Health check endpoint 在 shutdown 期間回傳 503 — 後續可加強
