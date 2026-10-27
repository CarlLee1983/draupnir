# Gravito 框架運作機制與生命週期

這份文件解釋了底層框架如何驅動四層架構模組，並管理其依賴、運行時行為以及非同步處理流。

## 1. 核心機制：IoC 容器 (Container)
Gravito 使用控制反轉 (IoC) 容器來管理對象的生命週期與依賴注入。

- **Singleton (單例)**: `container.singleton('key', factory)`。在整個應用生命週期中只會實例化一次。用於 Repository 或核心 Service。
- **Bind (綁定)**: `container.bind('key', factory)`。每次請求 `make` 時都會創建一個新實例。
- **Make (解析)**: `container.make('key')`。從容器中獲取對象。

## 2. 模組生命週期 (Module Lifecycle)
每個模組透過 `ModuleServiceProvider` 接入框架，並遵循嚴格的初始化與銷毀順序：

### 第一階段：Register (註冊)
在應用啟動時，框架遍歷所有模組執行註冊邏輯。此階段**禁止實例化對象**，僅進行工廠函數綁定。
1. `registerRepositories`: 綁定數據存取實作。
2. `registerApplicationServices`: 綁定業務邏輯服務。
3. `registerControllers`: 綁定 HTTP 控制器。

### 第二階段：Route Registration (路由註冊)
如果模組實作了 `IRouteRegistrar`：
1. 框架傳入 `IRouteContext`（包含 Router 與 Container）。
2. 控制器從 Container 中被 `make` 出來，並與路由綁定。

### 第三階段：Boot (啟動)
當所有模組註冊完成後，框架執行 `boot()` 方法。
- 用於執行初始化副作用（如註冊事件監聽器、初始化全局鉤子）。

### 第四階段：Shutdown (停機)
應用接收到結束信號 (SIGTERM/SIGINT) 時執行。
- `MessageQueueShutdownHook`: 停止隊列消費並等待當前任務完成。
- `DatabaseCleanup`: 關閉 Atlas 連接池。

## 3. 請求管道與中間件 (Request Pipeline)
當 HTTP 請求進入 `Photon` 層後的流轉過程：

1. **入口解析**: `RadixRouter` 根據路徑尋找對應的控制器。
2. **中間件鏈 (Middleware)**: 執行 `Sentinel` 認證、`RateLimit` 限流與 `AppSubscription` 檢查。
3. **數據驗證 (Impulse)**: 執行 Zod Schema 驗證。若失敗，自動攔截並返回 422 錯誤。
4. **DI 解析**: 容器自動解析 Controller 所需的 Service，Service 解析所需的 Repository。
5. **執行與響應**: 業務邏輯執行完畢，透過 `Inertia` 或 `JSON` 返回結果。

## 4. 事件驅動架構 (Event System)
框架透過 `DomainEventDispatcher` 實現模組間的解耦。

- **同步分發**: 事件發出後，所有 `handle()` 方法在同一進程內立即執行。
- **解耦通訊**: 模組 A 發出 `UserRegistered` 事件，模組 B 監聽並自動創建對應資源，模組 A 內容無需知曉模組 B 的存在。

## 5. 非同步與背景任務 (Background Processing)
針對長耗時或高併發任務，框架提供兩大機制：

### 5.1 消息隊列 (IQueue)
基於 **Redis Streams**。
- **生產者**: `queue.push(new GenerateReportTask(id))`。
- **消費者**: 獨立的 Worker 進程持續監聽，支持 ACK 機制與重試。

### 5.2 定時調度 (IScheduler)
- 用於掃描到期合約、清理過期數據或發送每日報表。
- 支援分佈式鎖，確保多實例運行時同一任務不會重複執行。

## 6. 全局異常處理 (Error Handling)
框架內建全局 Exception Filter：
- **DomainException**: 轉化為 400/403 錯誤與用戶友好的消息。
- **ValidationException**: 轉化為 422 錯誤。
- **SystemError**: 自動記錄日誌並返回脫敏後的 500 錯誤。

## 7. CLI 運行時 (Pulse CLI)
當通過終端執行 `bun pulse <command>` 時：
1. **Bootstrap**: 啟動與 HTTP 模式相同的 IoC 容器與 ServiceProvider。
2. **Command Discovery**: 掃描各模組註冊的 CLI 命令。
3. **Execution**: 注入 Service 並執行，結束後自動觸發 Shutdown 週期。

## 8. 跨模組依賴規範
模組之間應儘量透過 **Port (介面)** 進行通訊。
- **推薦做法**: 模組 A 在 Application 層定義 Port，並在 Infrastructure 層注入模組 B 的實現。這樣模組 A 的單元測試可以輕鬆 Mock 掉外部依賴。
