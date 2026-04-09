# Context Dependency Map

這份文件把 Draupnir 的 bounded context 依賴關係整理成一張文字版矩陣，方便快速判斷：

- 哪個模組是上游
- 哪個模組是下游
- 哪些依賴是合理的
- 哪些依賴應該避免

## 讀圖方式

- `→` 表示主動依賴或使用
- `✓` 表示合理且已預期的依賴
- `△` 表示可以接受，但要維持接口穩定
- `✗` 表示不建議

## 依賴矩陣

| From \ To | Foundation | Auth | User | Organization | ApiKey | Dashboard | Credit | Contract | AppModule | AppApiKey |
|---|---|---|---|---|---|---|---|---|---|---|
| Foundation | - | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Auth | △ | - | ✓ | △ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| User | ✗ | △ | - | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Organization | ✗ | ✓ | △ | - | ✗ | △ | △ | △ | △ | △ |
| ApiKey | ✓ | △ | △ | ✓ | - | △ | ✓ | △ | △ | ✓ |
| Dashboard | ✓ | △ | △ | ✓ | ✓ | - | ✓ | △ | △ | △ |
| Credit | ✓ | △ | ✗ | ✓ | ✓ | △ | - | △ | ✗ | ✗ |
| Contract | △ | △ | △ | ✓ | △ | △ | △ | - | ✓ | △ |
| AppModule | △ | ✗ | ✗ | ✓ | ✗ | △ | ✗ | ✓ | - | △ |
| AppApiKey | ✓ | △ | △ | ✓ | ✓ | △ | △ | △ | ✓ | - |

## 依賴解讀

### Foundation

Foundation 是外部能力入口，不應該反向依賴任何商業模組。

### Auth

- 可以依賴 `User` 做註冊後 profile 建立
- 可以在授權層引用 `Organization` 的 membership 結果，但不要把組織規則搬進 Auth

### Organization

- 可以查 `Auth` 來確認 user 存在
- 可以與 `Dashboard`、`Credit`、`Contract`、`AppModule`、`AppApiKey` 互通識別資訊，但不直接操作其內部狀態

### ApiKey

- 依賴 `Organization` 才知道 key 屬於哪個租戶
- 依賴 `Credit` 進行凍結/恢復聯動
- 依賴 `AppApiKey` 時，只能透過穩定識別與事件，不共享內部 model

### Dashboard

Dashboard 是典型讀模型上下游匯總層，允許讀 `ApiKey`、`Credit`、`Organization` 的結果，但不應成為寫入中心。

### Credit

- 依賴 `ApiKey` 做凍結與恢復
- 依賴 `Organization` 作為帳戶歸屬
- 不應直接依賴 `User` 的內部狀態

### Contract

- 以 `Organization` 為授權對象
- 以 `AppModule` 為可用功能集合
- 不應混入 `Credit` 的扣款規則或 `ApiKey` 的生命週期

### AppModule

- 依賴 `Organization` 管理訂閱關係
- 依賴 `Contract` 作為政策來源
- 不應取代 `Credit`、`ApiKey` 或 `Auth`

### AppApiKey

- 依賴 `ApiKey` 取得基礎 key 生命週期能力
- 依賴 `AppModule` 取得模組綁定與 scope 語意
- 依賴 `Organization` 追蹤租戶歸屬

## 反向依賴禁區

以下情況通常代表 context 切錯了：

- `Dashboard` 回頭修改 `ApiKey` 或 `Credit`
- `User` 直接碰 `Auth` 的 token 或 password 資料
- `Contract` 直接實作 `AppModule` 的訂閱流程
- `Credit` 直接讀寫 `ApiKey` 的 ORM model
- `AppModule` 直接知道 `BifrostClient` 的細節

## 判斷規則

如果一條依賴是：

- 穩定識別子傳遞
- 查詢型讀取
- 授權判斷
- 事件驅動副作用

通常可以接受。

如果一條依賴是：

- 直接操作對方內部狀態
- 共用 ORM model
- 共用 repository class
- 共享不穩定的 domain 物件

通常不應接受。

