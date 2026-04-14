# Request Body Size Limit 設計文件

**日期：** 2026-04-15
**狀態：** 已核准，待實作
**範疇：** 生產就緒 — 多 instance 部署防護

---

## 背景與目標

Draupnir 部署於多個 instance 環境。目前 HTTP 層對請求 body 大小無任何限制，攻擊者可送出超大 payload 耗盡記憶體，導致服務崩潰。

**目標：**
- 全域預設限制 512 KB，覆蓋所有路由
- 提供 named middleware `bodyLimit(n)` 供未來檔案上傳路由覆寫
- 不改動現有任何 middleware

---

## 架構概覽

```
Request
  └── [Global] BodySizeLimitMiddleware(512KB)   ← 新增，位於 global 最前
        ↓ 超限 → 413 Payload Too Large（JSON）
        ↓ 正常 → 繼續
  └── [Global] GlobalErrorMiddleware（現有）
  └── [Global] RequestId, RequestLogger, ...（現有）
  └── [Groups] web / admin / member（現有）
  └── [Named]  bodyLimit(10MB)                  ← 未來上傳路由使用
```

**GlobalError 捕捉保留**：BodySizeLimit 放在 GlobalErrorMiddleware 之前，讓 GlobalError 仍能捕捉任何非預期錯誤。

---

## 錯誤回應格式

對齊現有 `AuthRateLimitMiddleware` 格式：

```json
{
  "success": false,
  "message": "Request too large",
  "error": "PAYLOAD_TOO_LARGE"
}
```

HTTP status: `413 Payload Too Large`

---

## 新增檔案

### `src/Shared/Infrastructure/Middleware/BodySizeLimitMiddleware.ts`

Factory function `createBodySizeLimitMiddleware(maxBytes: number): Middleware`

**邏輯：**
1. 讀取 `Content-Length` header
2. 若 `Content-Length` 存在且超限 → 立即回 413，不讀 body
3. 若 `Content-Length` 不存在（chunked transfer）→ 讀取 body stream，累計超限即截斷 → 413
4. 正常 → `next()`

**為何需要處理 chunked transfer：**
HTTP/1.1 chunked encoding 可省略 `Content-Length`，純 header 檢查可被繞過。

---

## 修改現有檔案

### `src/Website/Http/HttpKernel.ts`

在 `global()` 最前加一行：

```ts
global: (): Middleware[] => [
  createBodySizeLimitMiddleware(512 * 1024),  // 512 KB 預設
  createGlobalErrorMiddleware(),
  createRequestIdMiddleware(),
  createRequestLoggerMiddleware(),
  createSecurityHeadersMiddleware(),
  ...(corsOrigins.length > 0 ? [...] : []),
]
```

### `src/Website/Http/Middleware/index.ts`

新增 named middleware export：

```ts
export const bodyLimit = (maxBytes: number) =>
  createBodySizeLimitMiddleware(maxBytes)
```

未來上傳路由使用方式：
```ts
router.post('/upload', bodyLimit(10 * 1024 * 1024), uploadHandler)
```

---

## 測試覆蓋

新增 `src/Shared/Infrastructure/Middleware/__tests__/BodySizeLimitMiddleware.test.ts`：

| 情境 | 預期結果 |
|------|----------|
| Content-Length 超限 | 413，不讀 body |
| 無 Content-Length，chunked 超限 | 413 |
| 正常請求（小於限制） | 200，`next()` 執行 |
| named `bodyLimit(10MB)` 覆寫 | 10MB 以內通過 |
| Content-Length 等於限制邊界值 | 通過 |

---

## 不在此次範疇

- Redis Rate Limiting（獨立計畫）
- Graceful Shutdown（獨立計畫）
- Response Compression
- 檔案上傳功能本身

---

## 決策紀錄

| 決策 | 理由 |
|------|------|
| 預設 512 KB | JSON API 夠用，避免對現有請求造成影響 |
| Global 最前 | 在 GlobalError 之前，讓錯誤捕捉仍生效 |
| Named middleware 而非 route-level 設定 | 符合現有 HttpKernel 三層設計模式 |
| chunked 也要防 | 純 Content-Length 檢查可被繞過 |
