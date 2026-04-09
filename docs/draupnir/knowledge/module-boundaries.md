# Module Boundaries

這份文件專注在 Draupnir 的 bounded context 怎麼切，以及模組之間什麼依賴是合理的。

## 先講結論

- 一個模組不等於一個資料表集合，也不等於一個功能頁面。
- 一個 bounded context 應該圍繞一組一致的領域語言、規則與所有權來切。
- 當兩個模組的資料生命週期、授權模型、寫入責任明顯不同，就應該分開。
- 當一個模組需要被另一個模組當作「穩定的上游能力」來使用，就應該維持明確的介面，而不是直接共享內部實作。

## Draupnir 的主要 bounded context

### 1. Foundation

職責：

- 封裝外部整合
- 提供 BifrostClient 等基礎服務

邊界：

- 這不是商業領域模組。
- 只提供基礎能力，不擁有業務不變式。

### 2. Auth

職責：

- 使用者身份驗證
- 密碼與 token 生命週期
- 系統角色與登入態

邊界：

- 管理的是「誰能登入系統」
- 不負責 profile、組織歸屬、API Key 業務細節

### 3. User

職責：

- 使用者 profile
- 個人設定
- 使用者狀態管理的業務視圖

邊界：

- 管理的是「這個人是誰、偏好是什麼」
- 不負責登入憑證

### 4. Organization

職責：

- 租戶與組織歸屬
- 成員關係
- 組織內角色與邀請

邊界：

- 管理的是「這個帳號屬於哪個租戶」
- 是多租戶隔離的核心 context

### 5. ApiKey

職責：

- 使用者或組織的 API Key 生命週期
- 與 Bifrost Virtual Key 的映射
- Key 狀態、限制、撤銷

邊界：

- 管理的是「這把 key 能不能用、能用多少」
- 不負責 credit 計費本身

### 6. Dashboard

職責：

- 匯總查詢
- 讀模型組裝
- 指標視圖

邊界：

- 這是 read-focused context
- 不應成為主要寫入來源

### 7. Credit

職責：

- 餘額
- 扣款 / 充值 / 退款
- 餘額不足時的凍結與恢復

邊界：

- 管理的是「付多少、何時扣、何時停用」
- 是金流與額度的權威來源

### 8. Contract

職責：

- 合約條款
- 授權期限
- 可用模組與配額

邊界：

- 管理的是「某個租戶目前被允許使用什麼」
- 是授權政策來源，不是執行者

### 9. AppModule

職責：

- 管理可被訂閱的應用模組
- 模組啟用 / 停用
- 組織訂閱關係

邊界：

- 管理的是「平台上有哪些可販售 / 可訂閱的功能包」
- 與 Contract 相關，但不等於 Contract

### 10. AppApiKey

職責：

- 應用層級 key
- scope、綁定模組、輪換、撤銷

邊界：

- 是應用分發 context
- 不是使用者個人 API Key 的延伸版

## 切分準則

當你在考慮要不要切出新模組時，先看這幾個訊號。

### 應該切開的訊號

- 生命週期不同
- 使用者角色不同
- 寫入責任不同
- 領域語言不同
- 交易邊界不同
- 查詢模型不同
- 不變式互相衝突

### 不必切開的訊號

- 只是少數欄位不同
- 只是同一流程中的不同步驟
- 只是共用一組 DTO
- 只是 CRUD 還沒長大

## Draupnir 的實際切法

### 可以共用的東西

- 身份資訊：`userId`
- 組織資訊：`orgId`
- 系統角色：`admin / manager / member`
- 共用的 framework abstraction
- 事件 payload 中的穩定識別子

### 不該共用的東西

- Repository 內部實作
- ORM entity
- 不穩定的 domain 內部狀態
- 各模組專屬的不變式

## 依賴方向

建議遵守以下方向：

- `Presentation` → `Application`
- `Application` → `Domain`
- `Infrastructure` → `Domain`
- `Modules` → `Shared`
- 上游 context 不應反向依賴下游 context 的內部細節

在實務上，Draupnir 允許少數跨模組查詢與授權依賴，但要維持單向介面，不要互相鑽進對方內部。

## 本專案可接受的跨模組關係

- `Auth` → `User`：註冊時建立 profile
- `Organization` → `Auth`：確認 user 存在
- `ApiKey` → `BifrostClient`：同步 virtual key
- `Credit` → `ApiKey`：餘額不足時凍結 key
- `Dashboard` → `ApiKey` / `Credit`：讀取匯總資料
- `Contract` → `Organization` / `AppModule`：套用授權政策
- `AppApiKey` → `ApiKey` / `AppModule`：管理應用 key 的生命週期

這些依賴是「業務上必要」的，不代表可以互相偷看對方的內部實作。

## 常見錯誤

- 把 bounded context 當成資料表區塊。
- 看到相關就合併，最後變成大模組。
- 讓 Dashboard 反向成為寫入核心。
- 把 Contract 和 AppModule 混成同一個 context，導致政策與資產混在一起。
- 把 Credit、ApiKey、Organization 三者的責任混掉，最後找不到單一權威來源。
- 在模組間直接共享 ORM model 或 repository class。

## 判斷問題清單

新增功能前，先問：

1. 這個能力的領域語言屬於哪個模組？
2. 這個模組是否已經擁有該不變式的所有權？
3. 這個流程是不是在跨越兩個不同的責任邊界？
4. 如果要拆出去，哪些介面必須保留穩定？
5. 這個依賴是讀取、授權、還是寫入？

如果答案開始模糊，通常就是 context 切太大了。

