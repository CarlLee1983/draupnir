# Gravito 編碼規範與最佳實踐

這份文件記錄了在 **Draupnir** 開發過程中提煉出的關鍵規範，特別是針對 Bun 運行時與 CI/CD 環境的優化。

## 1. 類型檢查與 CI 優化
- **避免 CI OOM**: 在 GitHub Actions 中執行 `tsc` 時，建議使用 `bun tsc` 並限制併發數 (concurrency: 2)，以防止內存溢出。
- **前端型別隔離**: 
    - 前端包 (如 Dashboard) **不應** 包含 `bun-types`，以免與 DOM 類型產生全局命名空間衝突。
    - 前端型別檢查指令應為：`tsc --noEmit --skipLibCheck`。
- **後端型別**: 核心服務與模組應在 `tsconfig.json` 中明確包含 `"types": ["bun-types"]`。

## 2. 依賴管理
- **Atlas 驅動**: 從 Atlas 1.1.0 開始，數據庫驅動（如 `mysql2`, `pg`）是可選的。在新應用中，請根據需要手動安裝對應驅動。
- **裝飾器元數據**: 如果使用領域實體裝飾器，請確保 `devDependencies` 中包含 `@swc/core`，以避免 `emitDecoratorMetadata` 警告。

## 3. 非同步處理 (Queue)
- **Redis Streams**: 建議使用基於 Redis Streams 的 `Plasma` 隊列。
- **任務註冊**: 所有的 Job Consumer 必須在模組的 `boot` 階段完成註冊，確保應用啟動後立即開始監聽。

## 4. 錯誤處理
- **Bifrost 模式**: 外部 API 調用應實作「指數退避 (Exponential Backoff)」重試機制。
- **領域異常**: 優先使用自定義的領域異常類（Domain Exceptions），而非通用的 `Error`，以便在表現層進行精確的錯誤轉換。
