# 測試策略與常見反模式

DDD 做得正不正確，測試最容易看出來。

## 測試分層

### 1. Value Object / Entity / Aggregate 單元測試

目標是驗證：

- 驗證規則
- 狀態轉換
- 不變式
- 邊界條件

這類測試應該完全不依賴 DB、HTTP 或外部服務。

### 2. Application Service 測試

目標是驗證：

- 使用者流程是否正確編排
- 授權是否正確
- 交易與保存是否按順序發生
- 事件是否有發出

這類測試可以 mock Repository 或外部 client。

### 3. Infrastructure 測試

目標是驗證：

- mapping 是否正確
- transaction 是否正確
- repository 行為是否一致

若有 memory 實作，可以作為快速回歸基礎。

## 測試原則

- 先測不變式，再測流程。
- 先測純邏輯，再測 I/O。
- 測試命名要描述商業結果，不只是方法名稱。
- 每個 bug 修正都要補回歸測試。

## 常見反模式

- 只測 Controller，不測 Domain。
- 把商業規則全部塞在 API 層，導致測試難以維護。
- 過度 mock，結果只是在測 mock。
- 直接斷言 private method。
- 用 integration test 取代 unit test，導致除錯成本過高。
- 把 Repository 測試寫成真正的 end-to-end，範圍太大。

## Draupnir 的建議測試重點

- Value Object：格式、合法值、狀態轉換
- Aggregate：不變式、事件產生、邊界條件
- Application Service：授權、交易、流程順序
- Repository：持久化與還原
- Event handler：事件觸發後的副作用

