# Web 框架維運可靠性：Observability Middleware 設計

**日期：** 2026-04-14  
**狀態：** 已確認，待實作  
**範圍：** `GlobalErrorMiddleware` + `RequestIdMiddleware` + `RequestLoggerMiddleware`

---

## 背景

完成 i18n 與 HttpKernel 集中式 middleware 架構後，web 框架仍缺少維運可靠性基礎：

- 未捕捉的 exception 會讓 server 回傳原始 error，可能暴露 stack trace
- 沒有 request logging，生產環境出問題時難以追蹤
- 沒有 request ID，無法將 log 行關聯到同一個請求

---

## 目標

在 `HttpKernel.global()` 最前端新增三個 middleware，讓每個請求都有：

1. **唯一 ID** — 可追蹤跨 log 行的同一請求
2. **結構化 log** — 依 LOG_LEVEL 輸出，生產環境接 Loki / Datadog
3. **安全的錯誤回應** — 不暴露 stack trace，依請求類型智能格式化

---

## 架構：Middleware 順序

```
HttpKernel.global():
  1. GlobalErrorMiddleware       ← 最外層捕捉所有未處理 exception
  2. RequestIdMiddleware         ← 注入 x-request-id
  3. RequestLoggerMiddleware     ← 結構化 log（讀取 request ID）
  4. SecurityHeadersMiddleware   ← 現有
  5. CorsMiddleware              ← 現有（有設定時）
```

**順序邏輯：**
- `GlobalErrorMiddleware` 最外層，捕捉所有內層拋出的錯誤
- `RequestIdMiddleware` 在 Logger 之前，讓 Logger 記錄時有 ID
- Logger 在 Security/CORS 之前，確保每個請求都被記錄

**新增檔案：**
```
src/Shared/Infrastructure/Middleware/
  GlobalErrorMiddleware.ts
  RequestIdMiddleware.ts
  RequestLoggerMiddleware.ts
  __tests__/
    GlobalErrorMiddleware.test.ts
    RequestIdMiddleware.test.ts
    RequestLoggerMiddleware.test.ts
```

---

## 各 Middleware 規格

### 1. RequestIdMiddleware

**職責：** 為每個請求產生或透傳唯一 ID。

**行為：**
- 優先讀取上游傳入的 `x-request-id` header（load balancer / Cloudflare 已注入時透傳）
- 若無則產生 `crypto.randomUUID()`
- 將 ID 存入 `ctx.set('requestId', id)`，供後續 middleware 讀取
- 在 response header 加上 `x-request-id`

---

### 2. RequestLoggerMiddleware

**職責：** 依 LOG_LEVEL 輸出結構化 request log。

#### Log Level 行為

| LOG_LEVEL | 記錄哪些請求 | 輸出格式 |
|---|---|---|
| `debug` | 全部（含 200） | colored text（人類可讀） |
| `info` | 3xx、4xx、5xx | JSON |
| `warn` | 4xx、5xx | JSON |
| `error` | 5xx only | JSON |

**預設值：** `NODE_ENV === 'production'` → `error`；其他 → `debug`

#### JSON log 欄位（info/warn/error 模式）

```json
{
  "timestamp": "2026-04-14T15:04:05.999Z",
  "level": "error",
  "env": "production",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "POST",
  "path": "/admin/users",
  "status": 500,
  "durationMs": 156,
  "ip": "1.2.3.4",
  "userAgent": "Mozilla/...",
  "msg": "Database connection timeout",
  "error": "ConnectionError"
}
```

- `timestamp`：ISO 8601 格式，方便 Loki / Datadog 時間索引
- `level`：與 LOG_LEVEL 對應，方便 log aggregator 篩選
- `env`：`NODE_ENV` 值，多環境 log 集中時可區分來源
- `msg` / `error`：僅在 5xx 時填入（從 GlobalErrorMiddleware 傳遞），正常請求留空或省略

**注意：** `userId` 無法在 global 層取得（`attachJwt` 在 group 層），留 TODO 供未來擴充。

#### debug 模式輸出範例（colored text）

```
→ POST /admin/users
← 422  42ms
```

---

### 3. GlobalErrorMiddleware

**職責：** 捕捉所有未處理 exception，依請求類型回傳安全的錯誤回應。

#### 判斷邏輯

```
try {
  return await next()
} catch (error) {
  if (error instanceof Response) return error  // pass-through 正常錯誤回應

  log error（含 requestId、stack trace）→ server-side only

  if (request has X-Inertia header)
    → Inertia 錯誤格式（前端渲染錯誤頁）
  else if (Accept includes application/json)
    → JSON { success: false, error: "INTERNAL_ERROR", message: "..." }
  else
    → 純文字 500 HTML
}
```

**安全規則：**
- Client 收到的回應不含 stack trace
- Server log 記錄完整 error（含 requestId）
- HTTP status 一律 500

---

## HttpKernel 變更

```typescript
// src/Website/Http/HttpKernel.ts

global: (): Middleware[] => {
  const corsOrigins = parseCorsAllowedOrigins()
  return [
    createGlobalErrorMiddleware(),      // 新增
    createRequestIdMiddleware(),         // 新增
    createRequestLoggerMiddleware(),     // 新增
    createSecurityHeadersMiddleware(),
    ...(corsOrigins.length > 0
      ? [createCorsMiddleware({ allowedOrigins: corsOrigins, allowCredentials: true })]
      : []),
  ]
}
```

---

## 測試策略

| Middleware | 關鍵測試案例 |
|---|---|
| `RequestIdMiddleware` | 透傳上游 ID / 產生新 ID / response header 有 ID |
| `RequestLoggerMiddleware` | LOG_LEVEL=debug 輸出 200 / LOG_LEVEL=error 不輸出 200 / JSON 格式可 parse / duration 為正數 |
| `GlobalErrorMiddleware` | Inertia 請求 → Inertia 格式 / JSON 請求 → JSON / 不暴露 stack trace / `instanceof Response` pass-through |

---

## 不在此次範圍

- `userId` 注入 logger（需 `attachJwt` 移至 global 層，架構變動留未來議）
- Log 持久化 / log rotation（由 infra 層處理）
- Distributed tracing / OpenTelemetry 整合
- 通用 API rate limiting（非 auth 端點）

---

## 未來擴充方向（預留介面）

實作時可預留以下擴充點，不需立即實作：

| 方向 | 說明 |
|---|---|
| **Correlation ID** | 區分 Request ID（單次請求）與 Correlation ID（跨服務追蹤），微服務架構時可透傳 `x-correlation-id` |
| **Sensitive Data Masking** | RequestLogger 若未來記錄 request body，應過濾 `password`、`token`、`credit_card` 等敏感欄位 |
| **Error Fingerprinting** | GlobalErrorMiddleware 記錄 log 時對 error message/stack 做 hash，方便 log 系統聚合相同錯誤 |
