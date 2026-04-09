# Auth DDD Refactor Lessons

這篇記錄一次 Auth 模組 DDD 重構後，最值得重複使用的經驗。

核心結論很簡單：

- Domain 只能表達語意，不要順手做 mapping。
- 密碼 hash / verify 屬於 infrastructure，不是 domain。
- Role 的 canonical 命名要先定義，不要讓歷史字眼污染新模型。
- Repository 才該知道資料表長什麼樣子。
- JWT 只看 payload 不夠，還要考慮每次簽發是否唯一。
- Middleware 不要自己偷偷 new 基礎設施依賴。

## 1. Domain 不要同時做規則、映射和 I/O

重構前，`User` 同時做了這些事：

- 持有身份與狀態
- 驗證與更改密碼
- 轉成 DB row
- 轉成 DTO

這種寫法短期很方便，長期會讓 domain 失去邊界。只要 schema 或 API 改動，整個 aggregate 就會一起跟著變。

修正後的做法是：

- `User` 只保留身份、角色、狀態與不變式
- `AuthRepository` 負責 row 與 domain 的 mapping
- `RegisterUserService` 與 `LoginUserService` 負責流程編排

這樣一來，角色語意、持久化格式、API 回應就可以分開演進。

## 2. 密碼不是 domain value object 該處理的事

原本 `Password` 同時負責：

- 密碼強度驗證
- hash
- verify
- 保存 hashed value

這會讓 value object 變成工具箱，而不是概念模型。

後來的切法比較乾淨：

- `Password` 只保存 hashed value
- `ScryptPasswordHasher` 處理 hash / verify
- `RegisterUserService` 在建立 `User` 前先 hash
- `LoginUserService` 用 hasher 驗證明文與 hash

這樣做的好處是，未來要換演算法時，只需要改 infrastructure service，不用碰 domain。

## 3. 先定義 canonical role，再處理相容性

這次最容易出錯的地方是角色命名。

舊模型有：

- `admin`
- `manager`
- `user`
- `guest`

新模型真正需要的是：

- `admin`
- `manager`
- `member`

如果沒有先把 canonical role 定義清楚，JWT payload、API response、middleware 授權、資料庫欄位就會開始語意不一致。

這次的做法是：

- `RoleType` 收斂成 `admin / manager / member`
- `AuthRepository` 對舊資料做相容映射
- application 層輸出新角色名稱
- JWT 也一律使用新角色名稱

原則是：

- 新邏輯只認新模型
- 舊資料只在 repository 層做過渡

## 4. Repository 才知道資料表長什麼樣子

`User.fromDatabase()` 和 `User.toDatabaseRow()` 看起來方便，但它把資料表細節塞進 domain。

更合理的責任劃分是：

- domain 只接受已經是 domain 語意的值
- repository 負責 row / object mapping
- service 不應該知道 `created_at`、`updated_at` 這些欄位名

這樣做可以避免：

- domain 被 schema 綁死
- 換 ORM 時大面積改動
- service 依賴資料表欄位命名

## 5. JWT 需要唯一性，不只是正確性

這次出現一個很典型但容易忽略的 bug：

- login 產生 access token
- refresh 又在同秒產生另一個 access token
- 兩者 payload 一樣，簽出來的 token 也一樣
- logout 後把 refresh 產生的新 token 一起判成 revoked

問題不是 revoke 邏輯，而是 token 本身不夠唯一。

修法是：

- 在 payload 裡加 `jti`
- 每次簽發都帶不同識別碼

這個教訓很重要，因為很多 token 測試只會驗證「能不能用」，不會自然覆蓋「同秒重複簽發是否撞 token」。

## 6. Middleware 不要自己創依賴

原本 middleware 會在 module scope 自己 new repository，再去抓 current database access。

這樣的問題是：

- 初始化路徑不透明
- 測試與 production 行為容易不同
- middleware 變成半個 composition root

修正後改成：

- provider 建立 `authTokenRepository`
- provider 透過 `configureAuthMiddleware()` 注入 middleware
- middleware 只負責使用，不負責創建依賴

這比較符合分層原則，也比較容易測試。

## 7. 重構時，先補邊界測試

這次真正有幫助的不是先大改，而是先把幾個關鍵邊界用測試鎖住：

- role model test
- repository mapping test
- password hasher test
- register / login regression test
- auth flow e2e test

這些測試不是在證明「程式很完整」，而是在保護「責任邊界」。

## 8. 一個簡單判準

遇到類似設計時，可以先問三件事：

1. 這段邏輯屬於 domain、application，還是 infrastructure？
2. 這個 mapping 應該誰負責？
3. 這個物件是不是開始替別的層做事了？

如果一個物件同時在做兩層以上的事，通常代表邊界已經開始模糊。

## 可以直接複用的規則

- Domain 不處理 raw DB row
- Domain 不處理 HTTP DTO
- Password hashing 不放在 value object
- Repository 只做持久化映射
- JWT 每次簽發都要有唯一識別
- Middleware 的依賴由 provider 統一配置

