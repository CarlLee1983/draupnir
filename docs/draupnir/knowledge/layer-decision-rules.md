# Layer Decision Rules

這份文件專門回答一個問題：某段邏輯應該放在 `Domain`、`Application`、還是 `Infrastructure`。

## 先講結論

- `Domain` 放不變式、狀態轉換、純領域規則。
- `Application` 放用例編排、授權檢查、交易邊界、跨物件協作。
- `Infrastructure` 放持久化、外部 API、事件接線、框架整合。
- 如果一段邏輯同時碰到規則與 I/O，先拆成兩段。

## 三層職責

### Domain

Domain 層回答的是「這個領域本身允不允許這件事」。

適合放：

- Value Object 驗證
- Aggregate 不變式
- Entity 狀態轉換
- 純領域計算
- Domain Event 定義與觸發

不適合放：

- HTTP request / response
- SQL / ORM
- 外部 API 呼叫
- 使用者輸入格式轉換
- 排程、job、middleware 細節

### Application

Application 層回答的是「這個使用情境要怎麼完成」。

適合放：

- 登入後要做什麼
- 建立資料前要查什麼
- 交易何時開始、何時結束
- 跨 Repository 協作
- 授權檢查
- 事件發送與後續整合協調

不適合放：

- 核心不變式本身
- 純值的合法性判斷
- 直接綁死某個 ORM 的查詢細節

### Infrastructure

Infrastructure 層回答的是「怎麼跟外部世界連接」。

適合放：

- Repository 實作
- DB mapping
- 第三方 API client
- queue / scheduler / webhook adapter
- DI provider 註冊

不適合放：

- 產品規則
- 角色權限邏輯
- 聚合狀態判斷
- 使用情境編排

## 判斷流程

當你遇到一段新邏輯時，依序問：

1. 這是值是否合法？如果是，放 `Value Object`。
2. 這是狀態轉換或不變式？如果是，放 `Aggregate` / `Entity`。
3. 這是某個使用情境的步驟？如果是，放 `Application Service`。
4. 這是純規則但不屬於單一物件？如果是，放 `Domain Service`。
5. 這是存取資料或外部系統？如果是，放 `Infrastructure`。

## 常見判斷規則

### 放 Domain 的訊號

- 不依賴 request context
- 不依賴 database
- 不依賴外部 client
- 可以用純單元測試驗證
- 一旦錯就代表領域規則被破壞

### 放 Application 的訊號

- 需要呼叫兩個以上 repository
- 需要做授權判斷
- 需要處理 transaction
- 需要根據用例決定呼叫順序
- 需要協調 domain event 後續副作用

### 放 Infrastructure 的訊號

- 需要知道表名、欄位名、ORM API
- 需要組裝外部 request
- 需要處理 response mapping
- 需要跟 Redis、Bifrost、scheduler、mailer 溝通

## Draupnir 的實例

### `CreditDeductionService`

這類邏輯若只做餘額計算與不變式判斷，適合 Domain。

但如果它自己負責：

- 讀寫 repository
- 開 transaction
- dispatch event

那就應該拆開：

- 純計算部分放 Domain
- I/O 與流程放 Application

### `TopUpCreditService`

這是 Application Service 的典型樣子，因為它做了：

- 驗證輸入
- 找或建 account
- 套用領域物件
- 寫 transaction
- 發送事件

### `CreditAccountRepository`

這是 Infrastructure，因為它只負責：

- map domain object ↔ database row
- 使用 `IDatabaseAccess`
- 支援 `withTransaction()`

## 拆分原則

如果一個類別看起來同時在做兩件事，通常表示放錯層。

### 應拆開的情況

- 一邊算規則，一邊寫 DB
- 一邊驗證資料，一邊呼叫外部 API
- 一邊處理 use case，一邊包裝 repository

### 可以先不拆的情況

- 同一層內的相鄰步驟，且邏輯很薄
- 只是單一 repository 的 mapping helper
- 只是單一 use case 的少量協調

## 反模式

- 在 Domain 裡呼叫 Repository
- 在 Entity 裡做 HTTP / JSON / DB mapping
- 在 Controller 裡寫商業規則
- 把 Application Service 寫成萬用工具類
- 把 Infrastructure 當成規則判斷層

## 快速自查

如果你無法用一句話說清楚某個類別的責任，那通常就是分層不乾淨。

- 能不能只用領域語言描述它？
- 能不能不看 DB 就理解它？
- 能不能不看 HTTP 就使用它？
- 能不能只靠單元測試驗證它？

如果四個答案都是否定的，通常該拆。

---

## 特殊情境：讀取層與代理層無需 Domain

有些模組天生沒有 Domain 層，這是合理的設計。

### Dashboard（讀取聚合）

Dashboard 是應用層的純讀取視圖，不應有 Domain 層，因為：

1. **無業務不變式** — Dashboard 只是多個 Repository 的數據聚合，沒有「允許或禁止什麼」的規則
2. **無狀態轉換** — 完全是讀操作，無 Aggregate Root、Entity、Value Object
3. **應用層職責** — 決定哪些數據聚合、如何格式化，這些都屬於 Use Case 編排
4. **CQRS 讀側** — 符合 CQRS 「讀側無 Domain」的設計思想

正確的結構：
```
Dashboard/
  Application/
    Services/GetDashboardSummaryService    ← 聚合邏輯
    DTOs/DashboardDTO
  Infrastructure/
    Services/UsageAggregator                ← 查詢邏輯
    Providers/DashboardServiceProvider
  Presentation/Controllers
```

### SdkApi（認證代理）

SdkApi 是 API 閘道層，負責應用級認證與請求代理，不應有 Domain 層，因為：

1. **無核心業務邏輯** — 只是驗證 AppApiKey、代理請求到 Bifrost
2. **中間件職責** — 屬於 Application Service 的授權檢查部分
3. **無持久化對象** — 沒有自己的 Aggregate 或 Entity
4. **認證代理** — 屬於 Infrastructure 與 Presentation 的交界點

正確的結構：
```
SdkApi/
  Application/
    UseCases/AuthenticateApp             ← 驗證邏輯（Application 層）
    UseCases/ProxyModelCall              ← 代理邏輯（Application 層）
  Infrastructure/
    Middleware/AppAuthMiddleware         ← 框架整合（Infrastructure）
    Providers/SdkApiServiceProvider
  Presentation/Controllers
```

### 判斷模組是否需要 Domain 層

問這三個問題：

1. **有沒有不變式？** — 有則需要 Domain（如 Credit.balance > 0）
2. **有沒有聚合根？** — 有則需要 Domain（如 Organization、User）
3. **有沒有規則會改變？** — 有則需要 Domain（如「額度不能超過配額」）

若全部答「沒有」，那就不需要 Domain 層。Dashboard 和 SdkApi 都符合這個模式。

