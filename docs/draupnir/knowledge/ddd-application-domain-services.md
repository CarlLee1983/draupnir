# Application Service / Domain Service

這份文件定義兩種最容易混在一起的服務。

## Application Service

Application Service 是用例編排層。

它負責：

- 驗證使用者意圖與授權
- 讀取與保存資料
- 建立交易邊界
- 呼叫 Aggregate / Entity / Domain Service
- 觸發事件或後續整合

它不應該：

- 藏核心領域規則
- 變成巨型 controller
- 直接把資料庫 row 當作領域狀態操作

本專案現有的 `TopUpCreditService` 這類寫法，屬於典型的 Application Service：它讀帳戶、套用領域物件、保存交易、再送出事件。

## Domain Service

Domain Service 放的是「不適合放在單一 Entity / Aggregate 裡，但仍屬於純領域規則」的邏輯。

適合放在 Domain Service 的條件：

- 是純計算
- 不需要 HTTP
- 不需要 ORM
- 不需要外部 API
- 不適合塞進單一 Entity

不適合放在 Domain Service 的條件：

- 需要直接存取 Repository
- 需要呼叫 Bifrost 或其他外部服務
- 需要處理 transaction

如果一個 service 既有領域規則，又有 I/O，建議拆成：

- 純 Domain Service：只負責規則
- Application Service：負責 I/O 和流程

## Draupnir 的實務判準

當你不知道某段邏輯該放哪裡時，先問：

1. 這段邏輯能不能被單元測試完全不靠 DB 跑完？如果不能，通常不是純 Domain Service。
2. 這段邏輯是不是在描述一個使用情境？如果是，通常是 Application Service。
3. 這段邏輯是不是只是在算結果、做判斷、維持不變式？如果是，才考慮 Domain Service。

## 建議的職責切分

- Controller：只做 HTTP 轉換
- Application Service：做流程編排
- Aggregate / Entity / VO：做狀態與不變式
- Domain Service：做純領域規則
- Repository：做持久化
- Infrastructure service：做外部系統整合

## 常見錯誤

- 在 Application Service 裡寫滿業務規則，最後沒有 Domain。
- 把 Domain Service 寫成只是一個資料查詢 helper。
- 把外部 API 呼叫塞進 Domain Service。
- 讓 Controller 直接碰 Repository。

