# Repository / Infrastructure

Repository 的責任很窄：把 Domain 物件和資料存放層對接起來。

## Repository 的定位

- Repository 是 Domain 的介面，不是 Infrastructure 的細節。
- Domain 只知道介面，不知道 SQL、ORM、表名或查詢語法。
- 實作可以依照 ORM 切換，但介面要穩定。

本專案已經有 `IDatabaseAccess` 與 `withTransaction()` 這類抽象，Repository 應該依附這個抽象，而不是直接碰 ORM 套件。

## 介面設計原則

1. 介面方法要以使用情境為中心，不是為了 CRUD 而 CRUD。
2. 只暴露必要查詢，不要預先設計一堆未使用的方法。
3. 查詢條件應該盡量貼近領域語言。
4. 寫入方法應該接受完整的 Domain 物件，而不是鬆散的欄位集合。

例如：

- `findByOrgId()`
- `findById()`
- `save()`
- `update()`
- `withTransaction()`

這類設計比單純的通用 CRUD 更貼近本專案需求。

## Infrastructure 層責任

Infrastructure 可以做這些事：

- 實作 Repository
- 做 Domain 物件和資料列之間的 mapping
- 管理 transaction
- 整合外部 API
- 註冊 DI binding

Infrastructure 不應該做這些事：

- 寫領域規則
- 決定商業不變式
- 在 Repository 內偷偷做授權判斷

## Transaction 模式

本專案的 Repository 常見模式是：

1. Application Service 開啟交易。
2. Repository 透過 `withTransaction()` 切到交易 context。
3. 寫入 Domain 物件。
4. 交易成功後再處理事件或後續整合。

這樣做的好處是交易邊界清楚，也避免各 Repository 自己偷偷開交易。

## ServiceProvider / DI

每個模組的 `ServiceProvider` 應該負責：

- 註冊 Repository 實作
- 註冊 Application Service
- 在 `boot()` 階段掛接事件或背景處理

這樣控制反轉關係是集中且可追蹤的，不會散落在 controller 或 domain 內。

## 常見錯誤

- Repository 回傳 ORM row，而不是 Domain 物件。
- Domain 直接 import ORM 或 SQL builder。
- 一個 Repository 內塞進太多讀寫雜務，失去邊界。
- 為了通用化而抽一個超大 Repository 介面，最後沒有人敢改。

