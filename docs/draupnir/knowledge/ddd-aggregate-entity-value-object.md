# Aggregate / Entity / Value Object

這份文件說明 Draupnir 裡三種最常混淆的戰術元件，應該怎麼分工。

## Aggregate

Aggregate 是一致性邊界。

規則：

- Aggregate root 是唯一可被外部直接操作的入口。
- 所有會破壞不變式的狀態變更，都應該由 Aggregate 方法完成。
- 外部不能直接修改 Aggregate 內部成員。
- Aggregate 可以 raise domain events，但不應自己負責 I/O。
- Aggregate 的行為方法應該是「動詞」，不是純 setter。

在本專案裡，`src/Shared/Domain/AggregateRoot.ts` 已經提供事件回放與未提交事件管理，這表示聚合可以採事件驅動狀態模型，但仍要保留一般狀態更新的可讀性。

## Entity

Entity 有身份，且生命週期通常屬於某個 Aggregate。

規則：

- Entity 的相等性由 identity 決定，不是全部欄位。
- Entity 通常代表 Aggregate 內部的子物件，例如訂閱、交易、成員關係。
- 如果一個 Entity 需要獨立存取、獨立查詢、獨立交易邊界，通常表示它可能應該升級成新的 Aggregate。

本專案常見的 Entity 類型：

- `CreditTransaction`
- `OrganizationMember`
- `OrganizationInvitation`
- `WebhookConfig`

## Value Object

Value Object 沒有身份，只由值定義。

規則：

- 不可變。
- 驗證要在建立時完成。
- 相等性看值，不看 reference。
- 若值有合法轉換狀態，轉換規則應該直接封裝在 VO 裡。

在本專案裡，像 `SubscriptionStatus` 這種類型已經把狀態轉換規則包進物件本身，這是正確方向。

## 建構模式

推薦固定使用下面幾種入口：

- `create()`：新建領域物件
- `fromDatabase()`：從持久層還原
- `fromString()` 或同類工廠：從外部輸入建立 VO

如果物件需要更新，優先回傳新物件，而不是大量 mutate。

## 常見錯誤

- 把狀態驗證寫在 Controller，讓 Domain 只剩資料容器。
- 用 Entity 當 DTO。
- 讓 Aggregate 直接查 Repository。
- 把所有欄位都做成 public setter。
- 把可獨立生命週期的概念硬塞進既有 Aggregate，造成過大的聚合。

